import type { ReviewItem, Transaction } from "@/types";

/**
 * 從「需要確認」的交易中建立 Review Inbox。
 * 只有模型信心不足、且可能影響飲食分析時才會進 inbox。
 */
export function buildReviewItems(transactions: Transaction[]): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const t of transactions) {
    if (!t.food.isFood) continue;
    const inf = t.inference;
    if (!inf || !inf.needsReview) continue;
    items.push({
      id: t.id,
      date: t.date,
      merchant: t.merchant,
      itemName: t.itemName,
      purchasedQty: t.purchasedQty,
      modelEstimate: inf.estimatedSelfConsumed,
      confidence: inf.confidence,
      reasoning: inf.reasoning,
      typicalUnit: t.food.typicalUnit,
      confirmed: undefined,
      source: inf.source,
    });
  }
  // 依日期由新到舊；同一天要回傳 0（見 utils/processing.ts 的同一個修正說明），
  // 否則比較器對相等值也回傳 -1，不是合法的排序關係。
  items.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
  return items;
}

/** 將已存在的使用者確認（含「不確定」）套回 review items（避免重整後遺失） */
export function mergeConfirmations(
  reviews: ReviewItem[],
  confirmations: Record<string, number>,
  unsureIds: string[] = []
): ReviewItem[] {
  const unsureSet = new Set(unsureIds);
  return reviews.map((r) =>
    confirmations[r.id] != null
      ? { ...r, confirmed: confirmations[r.id], unsure: unsureSet.has(r.id) }
      : r
  );
}
