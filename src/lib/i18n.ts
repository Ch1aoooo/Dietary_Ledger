import { EN } from "@/lib/messages";

/**
 * 極簡雙語層：介面預設是中文（原始字串直接寫在程式裡），英文則透過
 * lib/messages.ts 的 EN 對照表查表得到。
 *
 * 關鍵設計：**切換語言會整頁 reload**（見 setLang），所以這裡完全不需要
 * React context / 狀態 / 重新渲染——語言只在模組載入時從 localStorage 讀
 * 一次，之後整個 session 都是常數。元件直接呼叫 t() 即可，不用 hook。
 */
export type Lang = "zh" | "en";

const LS_KEY = "dl.lang.v1";

function readLang(): Lang {
  try {
    return localStorage.getItem(LS_KEY) === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

/** 目前語言（整個 session 固定，切換時會 reload）。 */
export const LANG: Lang = readLang();

/** 切換語言：寫進 localStorage 後整頁重新整理，讓所有字串以新語言重繪。 */
export function setLang(lang: Lang) {
  try {
    localStorage.setItem(LS_KEY, lang);
  } catch {
    /* ignore quota */
  }
  window.location.reload();
}

/**
 * 翻譯一段介面文字。key 就是中文原文：
 *   - 中文模式：直接回傳 key（必要時做 {參數} 代入）。
 *   - 英文模式：查 EN[key]，查不到就退回中文 key（不會壞、只是那句沒翻到）。
 *
 * 需要動態代入時，key 跟英文翻譯都用 {name} 佔位，呼叫端傳 params：
 *   t("尚有 {n} 筆待確認", { n: 3 })
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let out = LANG === "en" ? EN[key] ?? key : key;
  if (params) {
    for (const p of Object.keys(params)) {
      out = out.split(`{${p}}`).join(String(params[p]));
    }
  }
  return out;
}
