import type { RawInvoiceRow } from "@/types";

/**
 * 解析財政部電子發票整合平台匯出的 CSV。
 * 已完成該平台的實際匯出實驗：檔首有 BOM、14 個欄位、
 * 數量欄可能為 0 / 空 / 小數（超值組合的處理），
 * 明細中可能夾雜折扣列（金額為負）與非食品。
 */

/** 標準 CSV parser（支援引號包夾、欄位內逗號與換行） */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // ignore, handled on \n
      } else {
        field += c;
      }
    }
  }
  // last field / row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** 欄位對照：檔頭順序必須符合統一發票平台的標準匯出格式 */
const COLUMNS = [
  "carrier",
  "date",
  "invoiceNo",
  "invoiceAmount",
  "invoiceStatus",
  "allowance",
  "sellerId",
  "sellerName",
  "sellerAddress",
  "buyerId",
  "qty",
  "unitPrice",
  "amount",
  "itemName",
] as const;

function toNum(s: string | undefined): number {
  if (s == null) return 0;
  const n = parseFloat(s.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * 把 CSV 文字轉成 RawInvoiceRow[]。
 * @returns 解析結果；若無法辨識表頭，throw 錯誤。
 */
export function parseEInvoiceCSV(text: string): RawInvoiceRow[] {
  const raw = parseCsv(text.trimStart().replace(/^\uFEFF/, ""));
  if (raw.length < 2) {
    throw new Error("檔案內容為空或不完整。");
  }
  const rows = raw.slice(1); // 跳過表頭
  const out: RawInvoiceRow[] = [];
  for (const r of rows) {
    if (r.length === 0 || (r.length === 1 && r[0].trim() === "")) continue;
    // 盡量依對應欄位取值；若長度不足，補空字串
    const get = (i: number) => r[i] ?? "";
    const itemName = get(13).trim();
    const invoiceNo = get(2).trim();
    if (!itemName && !invoiceNo) continue;
    out.push({
      carrier: get(0),
      date: get(1).trim(),
      invoiceNo,
      invoiceAmount: get(3),
      invoiceStatus: get(4),
      allowance: get(5),
      sellerId: get(6),
      sellerName: get(7).trim(),
      sellerAddress: get(8),
      buyerId: get(9),
      qty: get(10),
      unitPrice: get(11),
      amount: get(12),
      itemName,
    });
  }
  return out;
}

export { toNum };

/** 驗證是否為統一發票 CSV（檢查表頭是否含關鍵欄位） */
export function looksLikeInvoiceCsv(text: string): boolean {
  const head = text.slice(0, 600).replace(/^\uFEFF/, "");
  return (
    head.includes("消費明細") || head.includes("發票號碼") || head.includes("賣方名稱")
  );
}
