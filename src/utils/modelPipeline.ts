import type {
  FoodProperties,
  Inference,
  ModelConfig,
  ModelItemAnalysis,
  Source,
  Transaction,
  UserProfile,
} from "@/types";
import { batchUnderstand } from "@/services/llmFoodUnderstanding";

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
        : ["AI 已分析此列，但未提供詳細推論說明。"],
    needsReview: typeof analysis.needsReview === "boolean" ? analysis.needsReview : false,
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
export async function runModelPass(
  baseTransactions: Transaction[],
  profile: UserProfile,
  modelConfig: ModelConfig,
  signal?: AbortSignal
): Promise<Transaction[]> {
  const pending = baseTransactions.filter((t) => t.analysisStatus === "pending");
  if (!pending.length) return baseTransactions;

  const toSend = pending.map((t) => ({
    itemName: t.itemName,
    qty: t.purchasedQty,
    amount: t.amount,
  }));

  let results: Record<number, ModelItemAnalysis>;
  try {
    results = await batchUnderstand(modelConfig, profile, toSend, signal);
  } catch {
    // 整批呼叫失敗（連不上代理、逾時…）：全部待分析列標成失敗，
    // 不偽造任何分類/推估結果讓使用者誤以為分析過。
    return baseTransactions.map((t) =>
      t.analysisStatus === "pending" ? { ...t, analysisStatus: "failed" } : t
    );
  }

  let idx = 0;
  return baseTransactions.map((tx) => {
    if (tx.analysisStatus !== "pending") return tx;
    const analysis = results[idx];
    idx += 1;

    // 這一筆漏在回應之外（例如所在的 chunk 失敗，但其他 chunk 成功）。
    if (!analysis) return { ...tx, analysisStatus: "failed" };

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
      typicalUnit: analysis.typicalUnit || "份",
    };

    return {
      ...tx,
      analysisStatus: "ready",
      food,
      category: food.category,
      inference: toInference(analysis),
    };
  });
}
