import type {
  CategoryStat,
  ClinicalSummary,
  DietaryAnalysis,
  Insight,
  ReviewItem,
  Source,
  Transaction,
  UserProfile,
  WeeklyPoint,
} from "@/types";

/** 使用者確認覆寫後的實際食用量解析 */
export function resolveEstimate(tx: Transaction): number {
  return tx.inference?.estimatedSelfConsumed ?? 0;
}

export function resolveSource(tx: Transaction): Source {
  return tx.inference?.source ?? "observed";
}

export function applyReviews(
  transactions: Transaction[],
  reviews: ReviewItem[]
): Transaction[] {
  const map = new Map(reviews.map((r) => [r.id, r]));
  return transactions.map((tx) => {
    const rv = map.get(tx.id);
    if (rv?.confirmed != null && tx.inference) {
      if (rv.unsure) {
        // 使用者選的是「不確定」，不是給出一個明確數字——保留原本的
        // estimatedSelfConsumed/confidence/source，只把 needsReview 關掉。
        // 如果跟一般確認一樣蓋成 confidence:100/user_confirmed，就是把
        // 「我不知道」偽造成一筆精確資料，KPI 的 high-confidence 統計、
        // Clinical Summary 的 confidence breakdown 都會失真。
        return { ...tx, inference: { ...tx.inference, needsReview: false } };
      }
      return {
        ...tx,
        inference: {
          ...tx.inference,
          estimatedSelfConsumed: rv.confirmed,
          source: "user_confirmed",
          confidence: 100,
          needsReview: false,
        },
      };
    }
    return tx;
  });
}

function foodTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter((t) => t.food.isFood);
}

const WEEK_BUCKETS: { label: string; from: number; to: number }[] = [
  { label: "Week 1", from: 1, to: 7 },
  { label: "Week 2", from: 8, to: 14 },
  { label: "Week 3", from: 15, to: 21 },
  { label: "Week 4", from: 22, to: 31 },
];

function dayOf(tx: Transaction): number {
  return parseInt(tx.date.slice(8, 10), 10) || 0;
}

export function computeKpis(
  transactions: Transaction[],
  reviews: ReviewItem[]
) {
  const all = applyReviews(transactions, reviews);
  const foods = foodTransactions(all);
  const needReview = reviews.filter((r) => r.confirmed == null).length;
  let estimated = 0;
  let high = 0;
  for (const t of foods) {
    estimated += resolveEstimate(t);
    if (t.inference && t.inference.confidence >= 80) high++;
  }
  const highConfidencePct = foods.length ? Math.round((high / foods.length) * 100) : 0;
  return {
    foodPurchases: foods.length,
    estimatedServings: Math.round(estimated * 10) / 10,
    highConfidencePct,
    needReview,
  };
}

export function computeCategories(
  transactions: Transaction[],
  reviews: ReviewItem[]
): CategoryStat[] {
  const all = applyReviews(transactions, reviews);
  const map = new Map<string, CategoryStat>();
  for (const t of all) {
    if (!t.food.isFood) continue;
    const key = t.food.category;
    const cur = map.get(key) ?? { category: key, purchased: 0, estimated: 0 };
    cur.purchased += t.purchasedQty;
    cur.estimated += resolveEstimate(t);
    map.set(key, cur);
  }
  const arr = Array.from(map.values());
  arr.forEach((c) => {
    c.estimated = Math.round(c.estimated * 10) / 10;
  });
  arr.sort((a, b) => b.purchased - a.purchased);
  return arr;
}

export function computeWeekly(
  transactions: Transaction[],
  reviews: ReviewItem[]
): WeeklyPoint[] {
  const all = applyReviews(transactions, reviews);
  const approx = (n: number) => Math.round(n * 10) / 10;
  const focus = ["Coffee", "Sugary beverages", "Prepared meals", "Bakery"];
  return WEEK_BUCKETS.map((b) => {
    const point: WeeklyPoint = { week: b.label };
    for (const cat of focus) {
      let sum = 0;
      for (const t of all) {
        if (!t.food.isFood || t.food.category !== cat) continue;
        const d = dayOf(t);
        if (d >= b.from && d <= b.to) sum += resolveEstimate(t);
      }
      point[cat] = approx(sum);
    }
    return point;
  });
}

export function buildInsights(
  transactions: Transaction[],
  reviews: ReviewItem[]
): Insight[] {
  const all = applyReviews(transactions, reviews);
  const foods = foodTransactions(all);
  const insights: Insight[] = [];

  // 咖啡週頻率
  const coffee = foods.filter((t) => t.food.category === "Coffee");
  const coffeeSum = coffee.reduce((s, t) => s + resolveEstimate(t), 0);
  insights.push({
    title: "咖啡攝取頻率",
    body: `本月咖啡相關攝取估計約每週 ${(coffeeSum / 4).toFixed(1)} 次。`,
    tone: "neutral",
  });

  // 含糖飲料週趨勢
  // WEEK_BUCKETS 的天數並不平均（7/7/7/10），直接比較前兩週 vs 後兩週的
  // 「加總」會系統性偏向後半（後半天數本來就比較多），導致就算每天攝取量
  // 完全沒變，也會被誤判成「上升」。改成比較「平均每天」才公平。
  const sug = computeWeekly(transactions, reviews);
  const sweet = sug.map((w) => Number(w["Sugary beverages"] ?? 0));
  if (sweet.length >= 2) {
    const bucketDays = WEEK_BUCKETS.map((b) => b.to - b.from + 1);
    const firstDays = bucketDays[0] + bucketDays[1];
    const lastDays = bucketDays[2] + bucketDays[3];
    const firstAvg = firstDays ? (sweet[0] + sweet[1]) / firstDays : 0;
    const lastAvg = lastDays ? (sweet[2] + sweet[3]) / lastDays : 0;
    const dir = lastAvg > firstAvg ? "上升" : lastAvg < firstAvg ? "下降" : "持平";
    insights.push({
      title: "含糖飲料週趨勢",
      body: `含糖飲料推估攝取量在月中後半${dir}（前半平均每天約 ${firstAvg.toFixed(1)} 次，後半平均每天約 ${lastAvg.toFixed(1)} 次）。`,
      tone: lastAvg > firstAvg ? "watch" : "neutral",
    });
  }

  // 大量購買調整
  const bulk = foods.filter((t) => t.inference && t.purchasedQty - resolveEstimate(t) >= 2);
  if (bulk.length) {
    insights.push({
      title: "大量購買已做個人化調整",
      body: `${bulk.length} 筆購買量明顯大於個人典型份量的紀錄，經模型判斷可能屬多人共享／囤貨，已納入個人化消費歸因。`,
      tone: "neutral",
    });
  }

  // 集中於特定日期
  const byDay = new Map<string, number>();
  for (const t of foods) byDay.set(t.date, (byDay.get(t.date) ?? 0) + 1);
  const max = Math.max(...Array.from(byDay.values()));
  if (max >= 3) {
    const day = Array.from(byDay.entries()).find(([, v]) => v === max)![0];
    insights.push({
      title: "購買集中度",
      body: `食品購買集中於特定日期（如 ${day.slice(5)} 當日 ${max} 筆），而非平均分布在各天。`,
      tone: "neutral",
    });
  }

  return insights;
}

export function buildAnalysis(
  transactions: Transaction[],
  reviews: ReviewItem[],
  period: string
): DietaryAnalysis {
  return {
    period,
    kpis: computeKpis(transactions, reviews),
    categories: computeCategories(transactions, reviews),
    weekly: computeWeekly(transactions, reviews),
    insights: buildInsights(transactions, reviews),
  };
}

export function buildClinicalSummary(
  transactions: Transaction[],
  reviews: ReviewItem[],
  period: string,
  patient: string = "Demo User"
): ClinicalSummary {
  const all = applyReviews(transactions, reviews);
  const foods = foodTransactions(all);

  const weeks = 4;
  const catFreq: Record<string, number> = {};
  for (const t of foods) {
    catFreq[t.food.category] = (catFreq[t.food.category] ?? 0) + resolveEstimate(t);
  }
  const weeklyFrequency = Object.entries(catFreq)
    .map(([category, v]) => ({
      category: category as ClinicalSummary["weeklyFrequency"][number]["category"],
      timesPerWeek: Math.round((v / weeks) * 10) / 10,
    }))
    .sort((a, b) => b.timesPerWeek - a.timesPerWeek);

  let high = 0,
    confirmed = 0;
  for (const t of foods) {
    const src = resolveSource(t);
    const conf = t.inference?.confidence ?? 0;
    if (src === "user_confirmed") confirmed++;
    else if (conf >= 80) high++;
  }
  // high/confirmed/inferred 三個桶分別各自 round 會導致總和不一定是 100%
  // （例如 95% + 2% + 2% = 99%）。這裡讓最後一個桶用「剩餘量」推得，
  // 確保三條 Data Confidence 進度條加總永遠是 100%。
  const total = Math.max(1, foods.length);
  const pctHigh = Math.round((high / total) * 100);
  const pctConfirmed = Math.round((confirmed / total) * 100);
  const pctInferred = Math.max(0, 100 - pctHigh - pctConfirmed);

  const observedPatterns: string[] = [];
  if (catFreq["Coffee"]) observedPatterns.push("Recurrent coffee purchases");
  if (catFreq["Prepared meals"]) observedPatterns.push("Frequent prepared-food purchases");
  if (catFreq["Sugary beverages"]) observedPatterns.push("Several sweetened beverage records");
  const bulk = foods.filter((t) => t.inference && t.purchasedQty - resolveEstimate(t) >= 2);
  if (bulk.length)
    observedPatterns.push(
      "Multiple bulk purchases were adjusted using personalized consumption attribution"
    );

  return {
    patient,
    period,
    weeklyFrequency,
    observedPatterns,
    confidenceBreakdown: {
      highConfidence: pctHigh,
      userConfirmed: pctConfirmed,
      modelInferred: pctInferred,
    },
    hasLongitudinal: false,
    limitations: [
      "Purchase does not necessarily equal actual intake.",
      "Shared purchases may not always be identifiable.",
      "Food waste cannot be directly observed.",
      "The current electronic invoice dataset does not contain exact meal time.",
      "Dietary estimates should be treated as supplementary information, not clinical diagnosis.",
    ],
  };
}
