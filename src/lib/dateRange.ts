/** 日期範圍（YYYY-MM-DD，含頭尾）。Overview / Transactions 兩個頁面各自在
 *  lib/store.tsx 的 `dateRanges` 裡存一份，彼此不連動、也不會因為切頁面
 *  而重置（見 store.tsx 的說明）。 */
import { t } from "@/lib/i18n";

export interface DateRange {
  start: string;
  end: string;
}

/** 完全沒有任何資料時的保底範圍（不會真的顯示任何紀錄，純粹避免
 *  start/end 是空字串）。一旦有資料，各頁面預設會直接用
 *  computeFullDataRange() 算出的實際範圍，不會用到這個常數。 */
export const DEFAULT_RANGE: DateRange = { start: "2026-08-01", end: "2026-08-31" };

/** 單一頁面的日期範圍選取狀態。
 *  - "auto"：跟著目前所有資料的日期範圍走（新增/刪除資料時自動更新）——
 *    這是預設狀態，也是使用者按「全部」之後會回到的狀態。
 *  - "custom"：使用者自己用日曆選過一個範圍，之後即使資料變動、切換頁面
 *    再切回來，都維持這個選擇，不會被悄悄改掉或重置回預設。 */
export interface PageRangeState {
  mode: "auto" | "custom";
  custom: DateRange;
}

export const DEFAULT_PAGE_RANGE_STATE: PageRangeState = { mode: "auto", custom: DEFAULT_RANGE };

/** 目前這個頁面實際要用來篩選的範圍：auto 模式看全部資料的實際範圍，
 *  custom 模式用使用者自己選的。 */
export function resolvePageRange(state: PageRangeState, fullDataRange: DateRange): DateRange {
  return state.mode === "auto" ? fullDataRange : state.custom;
}

/** 篩選出日期落在範圍內（含頭尾）的項目，字串格式 YYYY-MM-DD 可以直接
 *  字典序比較，不需要真的 parse 成 Date。 */
export function filterByDateRange<T extends { date: string }>(
  items: T[],
  range: DateRange
): T[] {
  return items.filter((t) => t.date >= range.start && t.date <= range.end);
}

/** 掃過所有資料算出實際涵蓋的日期範圍（最早～最晚），給「全部」按鈕跟
 *  auto 模式用。沒有任何資料時回傳 null，呼叫端自己決定要不要 fallback
 *  成 DEFAULT_RANGE。 */
export function computeFullDataRange<T extends { date: string }>(items: T[]): DateRange | null {
  if (!items.length) return null;
  let min = items[0].date;
  let max = items[0].date;
  for (const it of items) {
    if (it.date < min) min = it.date;
    if (it.date > max) max = it.date;
  }
  return { start: min, end: max };
}

/** 單一日期的顯示字串——中文「2026年8月1日」、英文「2026/8/1」。年份一律
 *  完整顯示、不省略（兩端都要），格式在英文下也要無歧義。 */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return t("{y}年{m}月{d}日", { y: String(y), m: String(m || 1), d: String(d || 1) });
}

/** 給日期範圍選取器的按鈕跟頁面標題用的顯示字串，例如
 *  "2026年8月1日 – 2026年8月31日"（單日則只印一次）。 */
export function formatRangeLabel(range: DateRange): string {
  if (range.start === range.end) return formatShortDate(range.start);
  return `${formatShortDate(range.start)} – ${formatShortDate(range.end)}`;
}
