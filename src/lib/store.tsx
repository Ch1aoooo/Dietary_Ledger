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
import { mergeAndDedupeRows } from "@/utils/einvoiceParser";
import {
  buildManualTransaction,
  buildTransactions,
  mergeAndSortTransactions,
  PERIOD,
  type ManualEntryInput,
} from "@/utils/processing";
import { buildReviewItems, mergeConfirmations } from "@/lib/reviews";
import { DEFAULT_MODEL_CONFIG } from "@/lib/modelConfig";
import { runModelPass } from "@/utils/modelPipeline";
import { DEFAULT_PAGE_RANGE_STATE, type PageRangeState } from "@/lib/dateRange";
import { DEFAULT_USER_ID, useUsers } from "@/lib/users";

const DEFAULT_PROFILE: UserProfile = {
  heightCm: 170,
  weightKg: 65,
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

// 這幾個是「基底」key 名稱——實際存取時會依目前使用中的使用者再包一層
// namespace（見下面的 storageKey()、AppProvider 開頭的 LS_* 區域變數）。
// 不要在元件外直接拿 BASE_LS_* 去 localStorage.getItem/setItem，一定要透過
// AppProvider 裡已經 namespace 過的同名區域變數。
const BASE_LS_PROFILE = "dl.profile.v1";
const BASE_LS_CONFIRM = "dl.confirm.v1";
const BASE_LS_UPLOAD = "dl.upload.v1";
const BASE_LS_UNSURE = "dl.unsure.v1"; // 選了「不確定」的 review id 清單
const BASE_LS_MANUAL = "dl.manual.v1"; // 使用者手動記錄的食物清單
const BASE_LS_DELETED = "dl.deleted.v1"; // 使用者在 Transactions 頁手動刪除的交易 id
const BASE_LS_DATE_RANGES = "dl.dateRanges.v1"; // Overview/Transactions 各自的日期範圍選取狀態
// AI 分析結果（以交易 id 為 key）。持久化的用途：切換語言（整頁 reload）或
// 切換使用者（AppProvider 依 key remount）時，已經分析完的列直接從這裡讀
// 回來，不會白白重跑一次 AI。id 由 utils/processing.ts 的 buildTransactions
// 依「發票號碼 + 列序」決定，同一份上傳每次都一樣，所以 reload 後對得回去。
const BASE_LS_RESULTS = "dl.results.v1";
// 跟 lib/modelConfig.ts 的 LS_MODEL 同一個字串，維持 DEFAULT_USER_ID 相容；
// 之前這裡沒有依使用者 namespace，全部使用者共用同一組 provider/apiKey，
// 導致其中一人把 API 額度用完（例如 Google 免費層 429）會連帶讓其他人的
// AI 分析一起壞掉——因此比照其他 BASE_LS_* key 一起納入 storageKey()。
const BASE_LS_MODEL_CONFIG = "dl.model.v2";

/**
 * 多使用者資料隔離：每個使用者的 profile/upload/manual/... 都要完全獨立，
 * 不能共用同一組 localStorage key。DEFAULT_USER_ID 這個使用者維持用原本
 * 「不加前綴」的 key（見 lib/users.ts 的說明）——這樣改版前就存在的單一
 * 使用者資料，接上多使用者後還是讀得到，不用另外寫遷移邏輯；之後新增的
 * 使用者才會用 "<base>::<userId>" 這種帶前綴的 key。
 */
function storageKey(base: string, userId: string): string {
  return userId === DEFAULT_USER_ID ? base : `${base}::${userId}`;
}

/** Overview / Transactions 各自的日期範圍選取狀態（見 lib/dateRange.ts 的
 *  PageRangeState 說明）。放在 AppProvider 而不是各頁面自己的 useState，
 *  是因為頁面元件會隨路由切換整個卸載/重新掛載——用頁面自己的 state 存，
 *  切到別的分頁再切回來就會回到初始值，等於「選了也沒用」。AppProvider
 *  在 Router 外層，不會被路由切換卸載，狀態才留得住；另外也存進
 *  localStorage，重新整理整頁也不會遺失。 */
interface DateRangesState {
  overview: PageRangeState;
  transactions: PageRangeState;
}
type DateRangePage = keyof DateRangesState;
const DEFAULT_DATE_RANGES: DateRangesState = {
  overview: DEFAULT_PAGE_RANGE_STATE,
  transactions: DEFAULT_PAGE_RANGE_STATE,
};

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
  addManualEntry: (entry: Omit<ManualEntryInput, "id">) => void;
  /** 從 Transactions 頁手動刪掉一筆（不管來源是發票還是手動記錄）。 */
  deleteTransaction: (id: string) => void;
  /** Overview/Transactions 各自的日期範圍狀態，見上面 DateRangesState
   *  的說明。 */
  dateRanges: DateRangesState;
  setPageRange: (page: DateRangePage, state: PageRangeState) => void;
  resetAll: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // AppProvider 掛載在 main.tsx 的 <AppProvider key={activeUserId}>
  // 底下——切換使用者時 key 改變，整棵子樹會整個卸載重掛載，所以這裡的
  // activeUserId 在同一次掛載的生命週期內保證不會變（要變就是直接換一個
  // 全新的 AppProvider 實例），下面這些 LS_* 區域變數用一般 const 算、
  // 不用 useMemo 也不用擔心 useCallback 依賴陣列漏放它們。
  const { activeUserId } = useUsers();
  const LS_PROFILE = storageKey(BASE_LS_PROFILE, activeUserId);
  const LS_CONFIRM = storageKey(BASE_LS_CONFIRM, activeUserId);
  const LS_UPLOAD = storageKey(BASE_LS_UPLOAD, activeUserId);
  const LS_UNSURE = storageKey(BASE_LS_UNSURE, activeUserId);
  const LS_MANUAL = storageKey(BASE_LS_MANUAL, activeUserId);
  const LS_DELETED = storageKey(BASE_LS_DELETED, activeUserId);
  const LS_DATE_RANGES = storageKey(BASE_LS_DATE_RANGES, activeUserId);
  const LS_MODEL_CONFIG = storageKey(BASE_LS_MODEL_CONFIG, activeUserId);
  const LS_RESULTS = storageKey(BASE_LS_RESULTS, activeUserId);

  const [profile, setProfile] = useState<UserProfile>(() => ({
    ...DEFAULT_PROFILE,
    ...load(LS_PROFILE, {}),
  }));
  const [confirmations, setConfirmations] = useState<Record<string, number>>(() =>
    load(LS_CONFIRM, {})
  );
  const [unsureIds, setUnsureIds] = useState<string[]>(() => load(LS_UNSURE, []));
  // 使用者可能分好幾次上傳 CSV（見 applyUploadText），每份原始文字都留著
  // ——rows 會把所有批次取聯集（見下面的 mergeAndDedupeRows），不是只用
  // 最後一次上傳的取代掉之前的。舊版本這個 key 存的是單一字串，這裡相容
  // 讀取：讀到字串就包成單一元素的陣列。
  const [uploadedBatches, setUploadedBatches] = useState<string[]>(() => {
    const raw = load<unknown>(LS_UPLOAD, []);
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === "string" && raw) return [raw];
    return [];
  });
  const [manualEntries, setManualEntries] = useState<ManualEntryInput[]>(() =>
    load(LS_MANUAL, [])
  );
  const [deletedIds, setDeletedIds] = useState<string[]>(() => load(LS_DELETED, []));
  const [dateRanges, setDateRangesState] = useState<DateRangesState>(() =>
    load(LS_DATE_RANGES, DEFAULT_DATE_RANGES)
  );
  const [period] = useState(PERIOD);

  /* ---------- 模型引擎設定 ---------- */
  const [modelConfig, setModelConfigState] = useState<ModelConfig>(() => ({
    ...DEFAULT_MODEL_CONFIG,
    ...load(LS_MODEL_CONFIG, {}),
  }));
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");

  const setModelConfig = useCallback(
    (patch: Partial<ModelConfig>) => {
      setModelConfigState((c) => {
        const next = { ...c, ...patch };
        save(LS_MODEL_CONFIG, next);
        return next;
      });
    },
    [LS_MODEL_CONFIG]
  );

  const rows = useMemo(() => mergeAndDedupeRows(uploadedBatches), [uploadedBatches]);

  const manualTransactions = useMemo(
    () => manualEntries.map(buildManualTransaction),
    [manualEntries]
  );

  const deletedSet = useMemo(() => new Set(deletedIds), [deletedIds]);

  // 純結構解析：日期/金額/品名等，不含任何食品分類或攝取推估——那兩件事
  // 完全交給下面的 AI 分析（見 utils/processing.ts 開頭的說明）。發票來源
  // 跟手動記錄合併成同一份列表，一起走同一套 pending → AI 分析 → ready
  // 的流程（見 utils/modelPipeline.ts 對 manualConsumed 的處理），使用者
  // 刪除過的列（不管原本是發票還是手動記錄）在這裡就先濾掉。
  const baseTransactions = useMemo(
    () =>
      mergeAndSortTransactions(buildTransactions(rows), manualTransactions).filter(
        (t) => !deletedSet.has(t.id)
      ),
    [rows, manualTransactions, deletedSet]
  );

  // AI 分析結果的 cache，用交易 id 索引，存「已經有結果」的列（ready 或
  // failed）——沒有結果的（pending）不快取，讓它們在下面的 transactions
  // 派生值裡直接沿用 baseTransactions 給的中性佔位值。failed 會被快取、
  // 誠實顯示「分析失敗」，但下面 effect 每次真的觸發分析時都會把
  // failed 重置回 pending 再送出去，所以還是會被重試，不會卡住。
  //
  // 這裡改成「cache + 從 baseTransactions 派生 transactions」而不是像原本
  // 那樣把 transactions 存成獨立 state，是為了解決「手動新增/刪除單筆
  // 記錄後不小心浪費 token 重新分析全部資料」的問題：baseTransactions 一
  // 變動，來源不明的舊資料（已經 cache 住的 ready 結果）不會被沖掉，
  // 使用者可以先編輯完所有列，最後只按一次「重新分析」，那次呼叫也只會
  // 送出還沒 cache 到、或上次失敗的列，不會整批重送。
  //
  // cache 會持久化到 localStorage（見下面的 save effect）：切換語言會整頁
  // reload、切換使用者會讓 AppProvider 依 key remount，兩者都會重新跑
  // useState 的 initializer——把結果存起來，reload/remount 後直接讀回，
  // hasPending 就是 false，不會再打一次 AI。
  type ResultsCache = Record<
    string,
    Pick<Transaction, "food" | "category" | "inference" | "nutrition" | "analysisStatus">
  >;
  const [resultsCache, setResultsCache] = useState<ResultsCache>(() =>
    load(LS_RESULTS, {})
  );

  // 每次 cache 變動就寫回 localStorage——這樣切換語言（整頁 reload）或切換
  // 使用者（remount）時，已分析好的列會被 useState 的 initializer 讀回來，
  // hasPending 直接是 false、不會再觸發下面的分析 effect。
  useEffect(() => {
    save(LS_RESULTS, resultsCache);
  }, [LS_RESULTS, resultsCache]);

  // 把「已經有結果（非 pending）的列」寫進 cache，pending 的不寫——留給
  // baseTransactions 給的中性佔位值。分析途中每跑完一個 chunk 就呼叫一次。
  const cacheAnalyzed = useCallback((list: Transaction[]) => {
    setResultsCache((cache) => {
      const next = { ...cache };
      for (const tx of list) {
        if (tx.analysisStatus !== "pending") {
          next[tx.id] = {
            food: tx.food,
            category: tx.category,
            inference: tx.inference,
            nutrition: tx.nutrition,
            analysisStatus: tx.analysisStatus,
          };
        }
      }
      return next;
    });
  }, []);

  // 重新上傳別份 CSV、或刪掉某些列之後，cache 裡會留下對不到任何現存交易
  // 的孤兒 key。以前 cache 不持久化、reload 就沒了；現在會存進 localStorage
  // ——掃掉孤兒，避免長期累積。
  useEffect(() => {
    const ids = new Set(baseTransactions.map((t) => t.id));
    setResultsCache((cache) => {
      let changed = false;
      const next: ResultsCache = {};
      for (const [id, v] of Object.entries(cache)) {
        if (ids.has(id)) next[id] = v;
        else changed = true;
      }
      return changed ? next : cache;
    });
  }, [baseTransactions]);

  const transactions = useMemo(
    () =>
      baseTransactions.map((bt) => {
        const cached = resultsCache[bt.id];
        return cached ? { ...bt, ...cached } : bt;
      }),
    [baseTransactions, resultsCache]
  );

  // 讓使用者可以在整批失敗後手動重試、或編輯完手動記錄後主動觸發分析，
  // 不用重新整理整個頁面。
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    // 這個 effect 刻意不把 baseTransactions/transactions 整個放進
    // dependency array——只在「發票資料變動（rows）」「Profile 改變」
    // 「模型設定改變」或使用者主動按重新分析/重試分析（retryToken）時才
    // 觸發 AI 呼叫。手動新增或刪除單筆記錄只會改變 baseTransactions，不會
    // 觸發這裡；effect 執行當下讀到的 transactions 仍然是最新的（同一次
    // render 算出來的），只是「什麼時候要不要跑」不能被它牽動，不然每次
    // 編輯單筆資料都會把所有還沒 cache 住的舊資料重新送一次 AI。
    const input = transactions.map((t) =>
      t.analysisStatus === "failed" ? { ...t, analysisStatus: "pending" as const } : t
    );
    const hasPending = input.some((t) => t.analysisStatus === "pending");

    if (!hasPending) {
      setModelStatus(input.some((t) => t.analysisStatus === "failed") ? "error" : "ai");
      return;
    }

    const timer = setTimeout(() => controller.abort(), estimateModelTimeoutMs(input));
    setModelStatus("loading");
    runModelPass(input, profile, modelConfig, controller.signal, (partial) => {
      // 每個 chunk 一跑完就即時寫進（會被持久化的）cache——分析途中切語言／
      // 使用者時，已完成的 chunk 不會被丟掉重跑。
      if (!cancelled) cacheAnalyzed(partial);
    })
      .then((analyzed) => {
        if (cancelled) return;
        cacheAnalyzed(analyzed);
        const anyFailed = analyzed.some((t) => t.analysisStatus === "failed");
        setModelStatus(anyFailed ? "error" : "ai");
      })
      .catch(() => {
        if (cancelled) return;
        // 保底：把還在送出中的 pending 列標成失敗，不偽造任何分類/推估
        // 結果。
        setResultsCache((cache) => {
          const next = { ...cache };
          for (const t of input) {
            if (t.analysisStatus === "pending" && !next[t.id]) {
              next[t.id] = {
                food: t.food,
                category: t.category,
                inference: undefined,
                nutrition: undefined,
                analysisStatus: "failed",
              };
            }
          }
          return next;
        });
        setModelStatus("error");
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, profile, modelConfig, retryToken]);

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

  // 新增一批上傳（不是取代）——使用者可能分好幾次上傳 CSV，每一批都要
  // 留著，交給 rows 的 mergeAndDedupeRows 統一取聯集、去重複。
  const applyUploadText = useCallback((text: string) => {
    setUploadedBatches((batches) => {
      const next = [...batches, text];
      save(LS_UPLOAD, next);
      return next;
    });
  }, []);

  // 使用者手動記錄一筆食物（見 components/AddManualEntryDialog.tsx）：
  // 只存原始輸入，實際的分類跟 Transaction 建構都留給 baseTransactions 的
  // useMemo/buildManualTransaction 處理，這裡不重複那份邏輯。
  const addManualEntry = useCallback((entry: Omit<ManualEntryInput, "id">) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? `manual-${crypto.randomUUID()}`
        : `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setManualEntries((list) => {
      const next = [...list, { id, ...entry }];
      save(LS_MANUAL, next);
      return next;
    });
  }, []);

  // 刪除一筆交易（見 components/TransactionTable.tsx 的刪除按鈕）：用
  // deletedIds 擋掉，發票來源的列沒有個別能拿掉的「原始清單」，只能靠這個
  // id 黑名單過濾；如果刪的剛好是手動記錄，順便把它從 manualEntries 拿掉，
  // 不然 localStorage 會一直留著一筆永遠用不到、又被 deletedIds 擋住的
  // 資料。
  const deleteTransaction = useCallback((id: string) => {
    setDeletedIds((ids) => {
      if (ids.includes(id)) return ids;
      const next = [...ids, id];
      save(LS_DELETED, next);
      return next;
    });
    setManualEntries((list) => {
      if (!list.some((m) => m.id === id)) return list;
      const next = list.filter((m) => m.id !== id);
      save(LS_MANUAL, next);
      return next;
    });
  }, []);

  const setPageRange = useCallback((page: DateRangePage, state: PageRangeState) => {
    setDateRangesState((prev) => {
      const next = { ...prev, [page]: state };
      save(LS_DATE_RANGES, next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    localStorage.removeItem(LS_PROFILE);
    localStorage.removeItem(LS_CONFIRM);
    localStorage.removeItem(LS_UPLOAD);
    localStorage.removeItem(LS_UNSURE);
    localStorage.removeItem(LS_MANUAL);
    localStorage.removeItem(LS_DELETED);
    localStorage.removeItem(LS_DATE_RANGES);
    localStorage.removeItem(LS_RESULTS);
    setProfile(DEFAULT_PROFILE);
    setConfirmations({});
    setUnsureIds([]);
    setUploadedBatches([]);
    setManualEntries([]);
    setDeletedIds([]);
    setDateRangesState(DEFAULT_DATE_RANGES);
    setResultsCache({});
  }, []);

  const value: AppState = {
    profile,
    transactions,
    reviews,
    confirmations,
    hasUploaded: uploadedBatches.length > 0,
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
    addManualEntry,
    deleteTransaction,
    dateRanges,
    setPageRange,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
