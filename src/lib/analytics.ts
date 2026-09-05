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
import { t as tr } from "@/lib/i18n";

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

const DAY_MS = 86_400_000;

/**
 * 資料實際涵蓋的週數與起算點。以「最早一筆食品紀錄的日期」為第 1 週的
 * 第一天，之後每 7 天算一週，總週數用「涵蓋天數 / 7 四捨五入」——所以
 * 單一月份 ≈ 4 週、橫跨兩個月 ≈ 8 週，趨勢圖 x 軸會跟著資料範圍縮放，
 * 不再永遠固定 4 週（見 computeWeekly）。結尾不滿一週的幾天併入最後一週。
 * 沒有任何食品紀錄時回傳 0 週。
 */
function weekSpan(foods: Transaction[]): { start: number; weeks: number } {
  if (!foods.length) return { start: 0, weeks: 0 };
  let min = foods[0].date;
  let max = foods[0].date;
  for (const t of foods) {
    if (t.date < min) min = t.date;
    if (t.date > max) max = t.date;
  }
  const start = Date.parse(`${min}T00:00:00`);
  const end = Date.parse(`${max}T00:00:00`);
  const weeks = Math.max(1, Math.round((end - start) / DAY_MS / 7));
  return { start, weeks };
}

/** 把某一天分進第幾週（0-based），結尾多出來的幾天併進最後一週。 */
function weekIndexOf(dateIso: string, start: number, weeks: number): number {
  const wi = Math.floor((Date.parse(`${dateIso}T00:00:00`) - start) / DAY_MS / 7);
  return Math.min(weeks - 1, Math.max(0, wi));
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
  const foods = foodTransactions(all);
  const { start, weeks } = weekSpan(foods);
  if (!weeks) return [];

  const approx = (n: number) => Math.round(n * 10) / 10;
  const focus = ["Coffee", "Sugary beverages", "Prepared meals", "Bakery"];

  const points: WeeklyPoint[] = Array.from({ length: weeks }, (_, i) => {
    const p: WeeklyPoint = { week: tr("第 {n} 週", { n: i + 1 }) };
    for (const cat of focus) p[cat] = 0;
    return p;
  });
  for (const t of foods) {
    const cat = t.food.category;
    if (!focus.includes(cat)) continue;
    const wi = weekIndexOf(t.date, start, weeks);
    points[wi][cat] = (Number(points[wi][cat]) || 0) + resolveEstimate(t);
  }
  for (const p of points) {
    for (const cat of focus) p[cat] = approx(Number(p[cat]));
  }
  return points;
}

export function buildInsights(
  transactions: Transaction[],
  reviews: ReviewItem[]
): Insight[] {
  const all = applyReviews(transactions, reviews);
  const foods = foodTransactions(all);
  const insights: Insight[] = [];

  const { weeks } = weekSpan(foods);

  // 咖啡週頻率
  const coffee = foods.filter((t) => t.food.category === "Coffee");
  const coffeeSum = coffee.reduce((s, t) => s + resolveEstimate(t), 0);
  insights.push({
    title: tr("咖啡攝取頻率"),
    body: tr("咖啡相關攝取估計約每週 {n} 次。", {
      n: (weeks ? coffeeSum / weeks : 0).toFixed(1),
    }),
    tone: "neutral",
  });

  // 含糖飲料趨勢：把整個資料期間切成前半 / 後半，比較「平均每天」的攝取量
  // （直接比加總會偏向天數較多的那半）。週數不固定（見 weekSpan），所以
  // 用週數 * 7 當分母換算成每天。
  const sug = computeWeekly(transactions, reviews);
  const sweet = sug.map((w) => Number(w["Sugary beverages"] ?? 0));
  if (sweet.length >= 2) {
    const mid = Math.floor(sweet.length / 2);
    const firstHalf = sweet.slice(0, mid);
    const lastHalf = sweet.slice(mid);
    const dayAvg = (arr: number[]) =>
      arr.length ? arr.reduce((s, n) => s + n, 0) / (arr.length * 7) : 0;
    const firstAvg = dayAvg(firstHalf);
    const lastAvg = dayAvg(lastHalf);
    const dir =
      lastAvg > firstAvg ? tr("上升") : lastAvg < firstAvg ? tr("下降") : tr("持平");
    insights.push({
      title: tr("含糖飲料週趨勢"),
      body: tr(
        "含糖飲料推估攝取量在後半段{dir}（前半平均每天約 {a} 次，後半平均每天約 {b} 次）。",
        { dir, a: firstAvg.toFixed(1), b: lastAvg.toFixed(1) }
      ),
      tone: lastAvg > firstAvg ? "watch" : "neutral",
    });
  }

  // 以下四項是 AI 對食物本身營養屬性的粗估（見 backend/main.py 的
  // estimatedCalories/isRefinedCarb/isWholeFood/giLevel/isFried——
  // estimatedCalories 目前沒有對應的 insight，欄位留著給未來用），不是
  // 查營養資料庫得來的精確值，只在有食品紀錄時才顯示。
  if (foods.length) {
    // 精緻澱粉
    const refinedCount = foods.filter((t) => t.nutrition?.isRefinedCarb).length;
    const refinedPct = Math.round((refinedCount / foods.length) * 100);
    insights.push({
      title: tr("精緻澱粉比例"),
      body: tr(
        "{n} 筆紀錄（約 {pct}%）屬於精緻澱粉（白飯、白麵包、含糖甜點等精製碳水）。{tail}",
        {
          n: refinedCount,
          pct: refinedPct,
          tail:
            refinedPct >= 50
              ? tr("比例偏高，建議適度替換成糙米、全麥等全穀雜糧。")
              : tr("比例在合理範圍內。"),
        }
      ),
      tone: refinedPct >= 50 ? "watch" : "neutral",
    });

    // 原型食物
    const wholeCount = foods.filter((t) => t.nutrition?.isWholeFood).length;
    const wholePct = Math.round((wholeCount / foods.length) * 100);
    insights.push({
      title: tr("原型食物比例"),
      body: tr(
        "{n} 筆紀錄（約 {pct}%）屬於原型食物（未經高度加工，如新鮮蔬果、原型肉類）。{tail}",
        {
          n: wholeCount,
          pct: wholePct,
          tail:
            wholePct < 30
              ? tr("比例偏低，建議增加新鮮蔬果、原型蛋白質的攝取。")
              : tr("整體攝取型態尚可。"),
        }
      ),
      tone: wholePct < 30 ? "watch" : "neutral",
    });

    // 升糖指數
    const highGiCount = foods.filter((t) => t.nutrition?.giLevel === "high").length;
    const highGiPct = Math.round((highGiCount / foods.length) * 100);
    insights.push({
      title: tr("高 GI 食物比例"),
      body: tr("{n} 筆紀錄（約 {pct}%）屬於高升糖指數食物。{tail}", {
        n: highGiCount,
        pct: highGiPct,
        tail:
          highGiPct >= 40
            ? tr("比例偏高，建議搭配蛋白質或蔬菜一起食用，有助平緩血糖波動。")
            : tr("比例在合理範圍內。"),
      }),
      tone: highGiPct >= 40 ? "watch" : "neutral",
    });

    // 油炸類
    const friedCount = foods.filter((t) => t.nutrition?.isFried).length;
    insights.push({
      title: tr("油炸類攝取"),
      body:
        friedCount === 0
          ? tr("本區間沒有偵測到油炸類食物紀錄。")
          : tr("本區間共 {n} 筆紀錄屬於油炸類食物。{tail}", {
              n: friedCount,
              tail:
                friedCount >= 4
                  ? tr("頻率偏高，建議減少油炸、改以蒸煮或烘烤方式為主。")
                  : tr("頻率在合理範圍內。"),
            }),
      tone: friedCount >= 4 ? "watch" : "neutral",
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
  patient: string = tr("示範使用者")
): ClinicalSummary {
  const all = applyReviews(transactions, reviews);
  const foods = foodTransactions(all);

  const weeks = Math.max(1, weekSpan(foods).weeks);
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
  if (catFreq["Coffee"]) observedPatterns.push(tr("經常購買咖啡"));
  if (catFreq["Prepared meals"]) observedPatterns.push(tr("經常購買調理食品"));
  if (catFreq["Sugary beverages"]) observedPatterns.push(tr("多筆含糖飲料紀錄"));
  const bulk = foods.filter((t) => t.inference && t.purchasedQty - resolveEstimate(t) >= 2);
  if (bulk.length)
    observedPatterns.push(tr("多筆大量採購已依個人消費歸屬調整"));

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
      tr("購買不等於實際攝取。"),
      tr("共同購買不一定能被辨識。"),
      tr("食物浪費無法直接觀察。"),
      tr("目前的電子發票資料不含確切用餐時間。"),
      tr("飲食推估僅供輔助參考，不作為臨床診斷。"),
    ],
  };
}
