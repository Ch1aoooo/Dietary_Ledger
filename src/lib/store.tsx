import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ModelConfig,
  ModelStatus,
  ReviewItem,
  Transaction,
  UserProfile,
} from "@/types";
import { parseEInvoiceCSV } from "@/utils/einvoiceParser";
import { buildTransactions, PERIOD } from "@/utils/processing";
import { buildReviewItems, mergeConfirmations } from "@/lib/reviews";
import { modelConfigStore } from "@/lib/modelConfig";
import { runModelPass } from "@/utils/modelPipeline";

const DEFAULT_PROFILE: UserProfile = {
  householdSize: 1,
  buysForOthers: "occasionally",
  typicalMealServings: 1,
  typicalDrinkServings: 1,
  bulkPurchasing: {
    beverage: "sometimes",
    frozen: "rarely",
    snacks: "rarely",
    bakery: "sometimes",
    readyMeal: "rarely",
  },
  onboarded: false,
};

const LS_PROFILE = "dl.profile.v1";
const LS_CONFIRM = "dl.confirm.v1";
const LS_UPLOAD = "dl.upload.v1";
const LS_UNSURE = "dl.unsure.v1"; // 選了「不確定」的 review id 清單

// backend/main.py 把送去模型的商品依 CHUNK_SIZE 分批、逐批「循序」呼叫，
// 每批自己有 TIMEOUT_SEC=120s 的上限，所以批數一多，全部跑完所需的時間
// 是會疊加的（3 批就可能要接近 360s）。前端原本用一個固定的
// MODEL_TIMEOUT_MS，資料量大時常常在後端其實還在成功處理、只是還沒跑完
// 的狀況下就先中止掉，白白丟棄已經呼叫成功、只是比較慢的模型結果。
const MODEL_TIMEOUT_BASE_MS = 160_000;
const MODEL_TIMEOUT_PER_CHUNK_MS = 130_000; // 略高於後端單批 120s 上限，留一點餘裕
const MODEL_CHUNK_SIZE = 20; // 需跟 backend/main.py 的 CHUNK_SIZE 保持一致

function estimateModelTimeoutMs(baseTransactions: Transaction[]): number {
  const qualifying = baseTransactions.filter((t) => t.analysisStatus === "pending").length;
  const chunks = Math.max(1, Math.ceil(qualifying / MODEL_CHUNK_SIZE));
  return Math.max(MODEL_TIMEOUT_BASE_MS, chunks * MODEL_TIMEOUT_PER_CHUNK_MS);
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

interface AppState {
  profile: UserProfile;
  transactions: Transaction[];
  reviews: ReviewItem[];
  confirmations: Record<string, number>;
  hasUploaded: boolean;
  period: string;
  modelConfig: ModelConfig;
  setModelConfig: (cfg: Partial<ModelConfig>) => void;
  modelStatus: ModelStatus;
  /** 沒有離線 fallback，整批分析失敗時讓使用者手動重試，不用重新整理頁面。 */
  retryAnalysis: () => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  confirmReview: (id: string, value: number) => void;
  /** 使用者選「不確定」：不假裝給出一個確認值，只把這筆標成「已看過」。 */
  markUnsure: (id: string, fallbackValue: number) => void;
  applyUploadText: (text: string) => void;
  resetAll: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => ({
    ...DEFAULT_PROFILE,
    ...load(LS_PROFILE, {}),
  }));
  const [confirmations, setConfirmations] = useState<Record<string, number>>(() =>
    load(LS_CONFIRM, {})
  );
  const [unsureIds, setUnsureIds] = useState<string[]>(() => load(LS_UNSURE, []));
  const [uploadText, setUploadText] = useState<string | null>(() =>
    load<string | null>(LS_UPLOAD, null)
  );
  const [period] = useState(PERIOD);

  /* ---------- 模型引擎設定 ---------- */
  const [modelConfig, setModelConfigState] = useState<ModelConfig>(() =>
    modelConfigStore.load()
  );
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");

  const setModelConfig = useCallback((patch: Partial<ModelConfig>) => {
    setModelConfigState((c) => {
      const next = { ...c, ...patch };
      modelConfigStore.save(next);
      return next;
    });
  }, []);

  const rows = useMemo(
    () => (uploadText ? parseEInvoiceCSV(uploadText) : []),
    [uploadText]
  );

  // 純結構解析：日期/金額/品名等，不含任何食品分類或攝取推估——那兩件事
  // 完全交給下面的 AI 分析（見 utils/processing.ts 開頭的說明）。
  const baseTransactions = useMemo(() => buildTransactions(rows), [rows]);

  // AI 分析後的交易資料（非同步；分析完成前，各筆維持 processing.ts 給的
  // pending 佔位資料，不會被誤當成任何真的分類結果）。
  const [transactions, setTransactions] = useState<Transaction[]>(baseTransactions);
  // 讓使用者可以在整批失敗後手動重試，不用重新整理整個頁面。
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      estimateModelTimeoutMs(baseTransactions)
    );

    const hasPending = baseTransactions.some((t) => t.analysisStatus === "pending");
    if (!hasPending) {
      // 沒有任何列需要送 AI（例如整張發票都是調整列）——沒有東西可失敗，
      // 直接視為完成，不用進 loading 狀態。
      setTransactions(baseTransactions);
      setModelStatus("ai");
      clearTimeout(timer);
      return;
    }

    setModelStatus("loading");
    runModelPass(baseTransactions, profile, modelConfig, controller.signal)
      .then((analyzed) => {
        if (cancelled) return;
        setTransactions(analyzed);
        const anyFailed = analyzed.some((t) => t.analysisStatus === "failed");
        setModelStatus(anyFailed ? "error" : "ai");
      })
      .catch(() => {
        if (cancelled) return;
        // 保底：把還在 pending 的列標成失敗，不偽造任何分類/推估結果。
        setTransactions(
          baseTransactions.map((t) =>
            t.analysisStatus === "pending" ? { ...t, analysisStatus: "failed" } : t
          )
        );
        setModelStatus("error");
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [baseTransactions, profile, modelConfig, retryToken]);

  const retryAnalysis = useCallback(() => setRetryToken((t) => t + 1), []);

  const reviews: ReviewItem[] = useMemo(
    () => mergeConfirmations(buildReviewItems(transactions), confirmations, unsureIds),
    [transactions, confirmations, unsureIds]
  );

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfile((p) => {
      const next = { ...p, ...patch };
      save(LS_PROFILE, next);
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    setProfile((p) => {
      const next = { ...p, onboarded: true };
      save(LS_PROFILE, next);
      return next;
    });
  }, []);

  const confirmReview = useCallback((id: string, value: number) => {
    setConfirmations((c) => {
      const next = { ...c, [id]: value };
      save(LS_CONFIRM, next);
      return next;
    });
    // 給出明確數字就不再是「不確定」（目前 UI 沒有回頭改答案的流程，
    // 這裡只是防呆，避免同一筆同時是「已確認 N 份」又是「不確定」）。
    setUnsureIds((ids) => {
      if (!ids.includes(id)) return ids;
      const next = ids.filter((x) => x !== id);
      save(LS_UNSURE, next);
      return next;
    });
  }, []);

  const markUnsure = useCallback((id: string, fallbackValue: number) => {
    // 借用 confirmations 存 fallbackValue（modelEstimate），只是為了讓
    // ReviewItem.confirmed 非 null、能從「待確認」分頁移到「已處理」——
    // lib/analytics.ts 的 applyReviews() 看到 unsure=true 就不會把這個
    // 值當成使用者真的給出的確認數字來套用。
    setConfirmations((c) => {
      const next = { ...c, [id]: fallbackValue };
      save(LS_CONFIRM, next);
      return next;
    });
    setUnsureIds((ids) => {
      if (ids.includes(id)) return ids;
      const next = [...ids, id];
      save(LS_UNSURE, next);
      return next;
    });
  }, []);

  const applyUploadText = useCallback((text: string) => {
    setUploadText(text);
    save(LS_UPLOAD, text);
  }, []);

  const resetAll = useCallback(() => {
    localStorage.removeItem(LS_PROFILE);
    localStorage.removeItem(LS_CONFIRM);
    localStorage.removeItem(LS_UPLOAD);
    localStorage.removeItem(LS_UNSURE);
    setProfile(DEFAULT_PROFILE);
    setConfirmations({});
    setUnsureIds([]);
    setUploadText(null);
  }, []);

  const value: AppState = {
    profile,
    transactions,
    reviews,
    confirmations,
    hasUploaded: !!uploadText,
    period,
    modelConfig,
    setModelConfig,
    modelStatus,
    retryAnalysis,
    updateProfile,
    completeOnboarding,
    confirmReview,
    markUnsure,
    applyUploadText,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
