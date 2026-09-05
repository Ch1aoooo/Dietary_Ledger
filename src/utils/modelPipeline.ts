import type {
  FoodProperties,
  Inference,
  ModelConfig,
  ModelItemAnalysis,
  NutritionEstimate,
  Source,
  Transaction,
  UserProfile,
} from "@/types";
import { batchUnderstand } from "@/services/llmFoodUnderstanding";
import { t } from "@/lib/i18n";

const NON_FOOD_PLACEHOLDER: FoodProperties = {
  isFood: false,
  category: "Non-food",
  stockable: false,
  shelfLife: "short",
  typicalUnit: "—",
};

function toInference(analysis: ModelItemAnalysis): Inference {
  return {
    estimatedSelfConsumed:
      typeof analysis.estimatedSelfConsumed === "number" ? analysis.estimatedSelfConsumed : 0,
    distributionDays:
      typeof analysis.distributionDays === "number" ? analysis.distributionDays : undefined,
    source: (analysis.source as Source) || "inferred",
    confidence:
      typeof analysis.confidence === "number"
        ? Math.min(100, Math.max(0, analysis.confidence))
        : 60,
    reasoning:
      Array.isArray(analysis.reasoning) && analysis.reasoning.length
        ? analysis.reasoning
        : [t("AI 已分析此列，但未提供詳細推論說明。")],
    needsReview: typeof analysis.needsReview === "boolean" ? analysis.needsReview : false,
  };
}

function toNutrition(analysis: ModelItemAnalysis): NutritionEstimate {
  return {
    estimatedCalories:
      typeof analysis.estimatedCalories === "number" ? analysis.estimatedCalories : 0,
    isRefinedCarb: analysis.isRefinedCarb ?? false,
    isWholeFood: analysis.isWholeFood ?? false,
    giLevel: analysis.giLevel || "low",
    isFried: analysis.isFried ?? false,
  };
}

/**
 * 食品分類 + 攝取量推估——完全交給 AI，沒有離線規則引擎當備援
 * （使用者要求「全用AI，不需要傳統方式濾掉」：不再用關鍵字/正則表達式
 * 篩選「這是不是食品」，也不再有 offline provider 可以切換回去）。
 *
 * 呼叫失敗、逾時、或模型漏回某幾筆時，那幾筆會被標記
 * `analysisStatus: "failed"`——不會偽造任何分類或攝取量，UI 會誠實顯示
 * 「分析失敗」而不是安靜地當成 0 份或非食品。
 *
 * @returns 更新後的 transactions（原陣列的淺拷貝；沒有待分析列時原封不動
 *          回傳同一個參考，呼叫端可用參考是否相同判斷這次有沒有真的呼叫）
 */
/** 把 AI 對「單一列」的分析結果套進 transaction。analysis 為 undefined
 *  代表這一列漏在回應之外（例如所在 chunk 失敗）——標成 failed。 */
function applyAnalysis(tx: Transaction, analysis: ModelItemAnalysis | undefined): Transaction {
  if (!analysis) return { ...tx, analysisStatus: "failed" };

  // 手動記錄：使用者已經直接告訴我們「吃了多少、什麼單位」，AI 在這裡
  // 只負責分類（category/stockable/shelfLife），不管 AI 判斷 isFood 是
  // true 還是 false 都不採用——使用者既然手動記錄了這一筆，就代表他確定
  // 吃過，不需要 AI 再判斷一次「這是不是食品」。
  if (tx.manualConsumed) {
    const food: FoodProperties = {
      isFood: true,
      category: analysis.category || "Prepared meals",
      stockable: analysis.stockable ?? false,
      shelfLife: analysis.shelfLife || "short",
      typicalUnit: tx.manualConsumed.unit,
    };
    return {
      ...tx,
      analysisStatus: "ready",
      food,
      category: food.category,
      inference: {
        estimatedSelfConsumed: tx.manualConsumed.amount,
        source: "observed",
        confidence: 100,
        reasoning: [t("使用者手動輸入的實際食用量，非 AI 推估。")],
        needsReview: false,
      },
      nutrition: toNutrition(analysis),
    };
  }

  if (!analysis.isFood) {
    return {
      ...tx,
      analysisStatus: "ready",
      food: { ...NON_FOOD_PLACEHOLDER },
      category: NON_FOOD_PLACEHOLDER.category,
      inference: undefined,
    };
  }

  const food: FoodProperties = {
    isFood: true,
    category: analysis.category || "Prepared meals",
    stockable: analysis.stockable ?? false,
    shelfLife: analysis.shelfLife || "short",
    typicalUnit: analysis.typicalUnit || t("份"),
  };
  return {
    ...tx,
    analysisStatus: "ready",
    food,
    category: food.category,
    inference: toInference(analysis),
    nutrition: toNutrition(analysis),
  };
}

const CHUNK_SIZE = 20; // 需跟 backend/main.py 的 CHUNK_SIZE 保持一致

export async function runModelPass(
  baseTransactions: Transaction[],
  profile: UserProfile,
  modelConfig: ModelConfig,
  signal?: AbortSignal,
  /**
   * 每處理完一個 chunk 就回報一次「目前為止的完整陣列」。store 拿它把已
   * 分析好的列即時寫進（會被持久化的）快取——這樣使用者在分析途中切換
   * 語言／使用者（會觸發整頁 reload／元件重掛）時，已經跑完的 chunk 不會
   * 被丟掉重跑，只有還沒送出的那幾個 chunk 需要重來。
   */
  onProgress?: (partial: Transaction[]) => void
): Promise<Transaction[]> {
  // 記住每個待分析列在原陣列的位置，逐 chunk 呼叫、逐 chunk 合併。
  const pendingPositions: number[] = [];
  baseTransactions.forEach((t, i) => {
    if (t.analysisStatus === "pending") pendingPositions.push(i);
  });
  if (!pendingPositions.length) return baseTransactions;

  let working = baseTransactions;

  for (let c = 0; c < pendingPositions.length; c += CHUNK_SIZE) {
    if (signal?.aborted) break;
    const positions = pendingPositions.slice(c, c + CHUNK_SIZE);
    const toSend = positions.map((p) => ({
      itemName: working[p].itemName,
      qty: working[p].purchasedQty,
      amount: working[p].amount,
    }));

    let results: Record<number, ModelItemAnalysis> | null = null;
    try {
      results = await batchUnderstand(modelConfig, profile, toSend, signal);
    } catch {
      results = null; // 這個 chunk 掛掉——標成 failed，其餘 chunk 繼續試
    }

    const next = working.slice();
    positions.forEach((p, localIdx) => {
      next[p] = results
        ? applyAnalysis(working[p], results[localIdx])
        : { ...working[p], analysisStatus: "failed" };
    });
    working = next;
    onProgress?.(working);
  }

  return working;
}
