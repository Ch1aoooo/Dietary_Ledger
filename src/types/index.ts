/** 資料來源：系統如何得到這筆推估 */
export type Source = "observed" | "inferred" | "user_confirmed";

/** 食品分類 */
export type FoodCategory =
  | "Prepared meals"
  | "Coffee"
  | "Sugary beverages"
  | "Bakery"
  | "Desserts"
  | "Dairy"
  | "Protein"
  | "Snacks"
  | "Non-food";

export interface FoodProperties {
  isFood: boolean;
  category: FoodCategory;
  /** 是否可長期保存（囤貨） */
  stockable: boolean;
  /** 保存性長短 */
  shelfLife: "very short" | "short" | "medium" | "long";
  /** 食用單位描述（ex: 1 bottle / 1 serving / 250ml） */
  typicalUnit: string;
}

/**
 * 一筆交易的 AI 分析進度。食品分類與攝取推估完全交給 AI（見
 * utils/modelPipeline.ts）——沒有離線規則引擎當備援，所以需要一個明確的
 * 「還沒分析 / 已完成 / 失敗」狀態，UI 才能誠實呈現，而不是在分析完成
 * 前就用一個預設值冒充成真的分類結果。
 *   - pending：剛從發票解析出來，還沒送出或還在等 AI 回應。
 *   - ready：AI 已經回傳這一筆的判斷（isFood/category/inference 都是真的）。
 *   - failed：送出了但沒拿到結果（呼叫失敗、逾時、或該筆漏在回應之外）。
 */
export type AnalysisStatus = "pending" | "ready" | "failed";

/**
 * 單筆食品的粗估營養屬性——AI 依品名/店家/常見作法推估，不是查營養資料庫
 * 得來的精確值（見 backend/main.py 的 SYSTEM_PROMPT）。只有 food.isFood
 * 為 true 的列才有意義；non-food 列這裡固定是中性預設值。
 */
export interface NutritionEstimate {
  /** 「本人實際食用量」對應的粗估熱量（大卡），不是購買量的熱量。 */
  estimatedCalories: number;
  /** 是否含精緻澱粉（白飯、白麵包、含糖甜點等精製碳水）。 */
  isRefinedCarb: boolean;
  /** 是否為原型食物（未經高度加工）。 */
  isWholeFood: boolean;
  /** 升糖指數等級。 */
  giLevel: "high" | "medium" | "low";
  /** 是否為油炸類。 */
  isFried: boolean;
}

export interface Inference {
  /** 推估本人實際食用的份量 */
  estimatedSelfConsumed: number;
  /** 若視為庫存，分配到未來 N 天 */
  distributionDays?: number;
  source: Source;
  confidence: number; // 0-100
  /** 可解釋的推論步驟（人話） */
  reasoning: string[];
  /** 是否因信心不足，需要使用者確認 */
  needsReview: boolean;
}

/** 電子發票 CSV 的原始一列 */
export interface RawInvoiceRow {
  carrier: string;
  date: string; // YYYYMMDD
  invoiceNo: string;
  invoiceAmount: string;
  invoiceStatus: string;
  allowance: string;
  sellerId: string;
  sellerName: string;
  sellerAddress: string;
  buyerId: string;
  qty: string;
  unitPrice: string;
  amount: string;
  itemName: string;
}

/** 一筆正規化後的交易紀錄（一列 = 一個商品明細） */
export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  invoiceNo: string;
  merchant: string;
  itemName: string;
  purchasedQty: number;
  unitPrice: number;
  amount: number;
  /** 折扣 / 出清列（金額<=0 或系統標記） */
  isAdjustment: boolean;
  food: FoodProperties;
  inference?: Inference;
  /** 粗估營養屬性，見 NutritionEstimate 說明；跟 food/inference 一樣，
   *  AI 分析完成（analysisStatus:"ready"）前不存在。 */
  nutrition?: NutritionEstimate;
  category: FoodCategory;
  analysisStatus: AnalysisStatus;
  /**
   * 使用者透過「手動記錄」（見 components/AddManualEntryDialog.tsx）直接
   * 輸入的實際食用量與單位——不是來自發票。這筆存在時，AI 分析只用來
   * 判斷 category/stockable 這些分類屬性，estimatedSelfConsumed 一律採用
   * 這裡的值，不會被 AI 自己的推估蓋掉（見 utils/modelPipeline.ts）：
   * 使用者直接回報「吃了多少」，比 AI 用購買量去猜更準確。
   */
  manualConsumed?: { amount: number; unit: string };
}

export interface ReviewItem {
  id: string;
  date: string;
  merchant: string;
  itemName: string;
  purchasedQty: number;
  /** 模型原始推估 */
  modelEstimate: number;
  confidence: number;
  reasoning: string[];
  /** 食用單位（罐/份/杯…），來自 food.typicalUnit——ReviewCard 顯示份量時
   *  用這個，不要在元件裡另外寫死一個單位字。 */
  typicalUnit: string;
  /** 使用者確認後的份量（null = 尚未確認） */
  confirmed?: number;
  /**
   * 使用者在確認時選的是「不確定」而不是給出明確數字。此時 confirmed
   * 只是拿 modelEstimate 暫存，讓這筆能從「待確認」移到「已處理」分頁，
   * 實際套用時（見 lib/analytics.ts 的 applyReviews）不會被當成真的
   * user_confirmed 數字。
   */
  unsure?: boolean;
  source: Source;
}

export interface UserProfile {
  /** 身高（公分）——AI 推估份量大小時的參考依據，見 backend/main.py。 */
  heightCm: number;
  /** 體重（公斤）——同上。 */
  weightKg: number;
  householdSize: number;
  buysForOthers: "almost_never" | "occasionally" | "often";
  typicalMealServings: number;
  typicalDrinkServings: number;
  bulkPurchasing: {
    beverage: "rarely" | "sometimes" | "often";
    frozen: "rarely" | "sometimes" | "often";
    snacks: "rarely" | "sometimes" | "often";
    bakery: "rarely" | "sometimes" | "often";
    readyMeal: "rarely" | "sometimes" | "often";
  };
  onboarded: boolean;
}

export interface CategoryStat {
  category: FoodCategory;
  purchased: number;
  estimated: number;
}

export interface WeeklyPoint {
  week: string;
  [category: string]: number | string;
}

export interface Insight {
  title: string;
  body: string;
  tone: "neutral" | "positive" | "watch";
}

export interface DietaryAnalysis {
  period: string;
  kpis: {
    foodPurchases: number;
    estimatedServings: number;
    highConfidencePct: number;
    needReview: number;
  };
  categories: CategoryStat[];
  weekly: WeeklyPoint[];
  insights: Insight[];
}

export interface ClinicalSummary {
  patient: string;
  period: string;
  weeklyFrequency: { category: FoodCategory; timesPerWeek: number }[];
  observedPatterns: string[];
  confidenceBreakdown: {
    highConfidence: number;
    userConfirmed: number;
    modelInferred: number;
  };
  hasLongitudinal: boolean;
  limitations: string[];
}

/* ------------------------------------------------------------------ */
/*  模型選擇（前端設定，存於 localStorage，接著後端薄代理）            */
/* ------------------------------------------------------------------ */

/**
 * 分析引擎提供者。已移除 "offline"——食品分類與攝取推估現在完全交給 AI
 * （使用者要求「全用AI，不需要傳統方式濾掉」），沒有離線規則引擎可以
 * 切換回去，所以這裡只剩「要打哪個 AI 端點」的選擇，不再有「要不要用
 * AI」的選項。
 *
 * 曾經短暫支援過 "azure"（Azure OpenAI Service），但使用者實測覺得
 * 回答不準、決定不用，已整個移除（型別、preset、Settings 欄位、後端的
 * URL/認證邏輯都拔掉了），不要再加回來。
 */
export type ModelProvider = "local" | "openai" | "google";

/** 使用者可設定的模型設定 */
export interface ModelConfig {
  provider: ModelProvider;
  /** OpenAI 相容 base url，例如 http://10.113.43.4:9000/v1 */
  baseUrl: string;
  /** 模型名稱，例如 dsv4-flash / gpt-4o-mini */
  model: string;
  /** API key（local 可留空） */
  apiKey: string;
}

/**
 * 目前這一批分析的運行狀態（沒有離線規則引擎可以 fallback，見
 * ModelProvider 的說明）：
 *   - loading：正在呼叫模型
 *   - ai：至少有分析完成，且沒有任何一筆失敗
 *   - error：呼叫失敗、逾時，或有任何一筆漏在回應之外
 */
export type ModelStatus = "loading" | "ai" | "error";

/** 後端 batch 回傳的單一商品分析（以 idx 對回原交易列） */
export interface ModelItemAnalysis {
  idx: number;
  itemName: string;
  isFood: boolean;
  category: FoodCategory;
  stockable: boolean;
  shelfLife: FoodProperties["shelfLife"];
  typicalUnit: string | null;
  estimatedCalories: number | null;
  isRefinedCarb: boolean;
  isWholeFood: boolean;
  giLevel: NutritionEstimate["giLevel"];
  isFried: boolean;
  estimatedSelfConsumed: number | null;
  distributionDays: number | null;
  confidence: number;
  source: Source;
  needsReview: boolean;
  reasoning: string[];
}
