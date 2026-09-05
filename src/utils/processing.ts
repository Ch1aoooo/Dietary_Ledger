import type { FoodProperties, RawInvoiceRow, Transaction } from "@/types";
import { toNum } from "@/utils/einvoiceParser";
import { t } from "@/lib/i18n";

export const PERIOD = "2026-08"; // 此 demo 的分析月份

function normalizeDate(ymd: string): string {
  if (!ymd) return "";
  const s = ymd.trim();
  if (s.length === 8 && /^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return s;
}

/**
 * 折扣 / 出清 / 服務費等「調整列」判定。這純粹是發票行項本身的性質
 * （金額是否 <=0、品名是否帶折扣字樣），跟「這是不是食品」是兩件不同的
 * 事——不需要也不該交給 AI 判斷，這裡繼續用結構化規則處理。
 */
export function detectAdjustment(itemName: string, amount: number): boolean {
  if (amount <= 0) return true;
  return /出清|折扣|折讓|贈品|紅利|優惠|組合\s*\d|超值組合/i.test(itemName);
}

/** 尚未分析（或確定不需要分析）時的中性預設值，不代表任何真的判斷。 */
const PLACEHOLDER_FOOD: FoodProperties = {
  isFood: false,
  category: "Non-food",
  stockable: false,
  shelfLife: "short",
  typicalUnit: "—",
};

/**
 * 把電子發票原始列 → 正規化交易紀錄的「結構」（日期、金額、品名、是否為
 * 調整列…）。
 *
 * 注意：這裡完全不做食品分類或攝取量推估——那兩件事現在整個交給 AI
 * （見 utils/modelPipeline.ts），這裡只負責把 CSV 原始列整形成
 * Transaction 的形狀，並把每一筆標成 analysisStatus:"pending"（調整列 /
 * 數量異常的列本來就不需要送 AI，直接標成 "ready" 並維持非食品）。
 */
export function buildTransactions(rows: RawInvoiceRow[]): Transaction[] {
  let seq = 0;
  const out: Transaction[] = [];

  for (const r of rows) {
    const amount = toNum(r.amount);
    const qty = toNum(r.qty);
    const itemName = r.itemName.trim();
    if (!itemName) continue;

    const date = normalizeDate(r.date);
    // 排除無有效日期的列
    if (!date) continue;

    const isAdjustment = detectAdjustment(itemName, amount);
    // 調整列、或數量異常（<=0.9，通常是組合餐拆出的 $0 子項目）不需要送
    // AI 判斷——這兩種本來就確定不是「一筆待分類的食品購買」。
    const skipsAnalysis = isAdjustment || qty <= 0.9;

    const id = `${r.invoiceNo || "inv"}-${seq++}`;
    const tx: Transaction = {
      id,
      date,
      invoiceNo: r.invoiceNo,
      merchant: r.sellerName,
      itemName,
      purchasedQty: qty,
      unitPrice: toNum(r.unitPrice),
      amount,
      isAdjustment,
      food: { ...PLACEHOLDER_FOOD },
      category: PLACEHOLDER_FOOD.category,
      inference: undefined,
      analysisStatus: skipsAnalysis ? "ready" : "pending",
    };
    out.push(tx);
  }

  // 依日期排序（新到舊）。同一天（同張發票的多個品項最常見）要回傳 0，
  // 否則比較器對「相等」也回傳 -1，不是合法的排序關係，會讓同一天的品項
  // 在不同瀏覽器/V8 版本下被任意打亂或整批反轉順序。
  out.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
  return out;
}

/** 使用者透過「手動記錄」對話框輸入的原始資料（見 lib/store.tsx）。 */
export interface ManualEntryInput {
  id: string;
  date: string; // YYYY-MM-DD
  itemName: string;
  amount: number;
  unit: string;
}

/**
 * 把手動記錄轉成 Transaction。跟 CSV 來源一樣先給中性佔位的 food/category、
 * analysisStatus:"pending"，交給同一套 AI pipeline 判斷分類——manualConsumed
 * 會讓 pipeline 保留使用者自己輸入的食用量，不被 AI 的估計蓋掉（見
 * utils/modelPipeline.ts）。
 */
export function buildManualTransaction(entry: ManualEntryInput): Transaction {
  return {
    id: entry.id,
    date: entry.date,
    invoiceNo: "",
    merchant: t("手動輸入"),
    itemName: entry.itemName,
    purchasedQty: entry.amount,
    unitPrice: 0,
    amount: 0,
    isAdjustment: false,
    food: { ...PLACEHOLDER_FOOD },
    category: PLACEHOLDER_FOOD.category,
    inference: undefined,
    analysisStatus: "pending",
    manualConsumed: { amount: entry.amount, unit: entry.unit },
  };
}

/** 合併多個交易列表並依日期重新排序（新到舊），規則同 buildTransactions()。 */
export function mergeAndSortTransactions(...lists: Transaction[][]): Transaction[] {
  const merged = lists.flat();
  merged.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
  return merged;
}
