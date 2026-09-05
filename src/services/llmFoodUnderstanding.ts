import type { ModelConfig, ModelItemAnalysis, UserProfile } from "@/types";
import { LANG } from "@/lib/i18n";

/**
 * 批次呼叫後端薄代理 /api/understand/batch。
 * 一次請求含多列商品，模型一次回整包 JSON，以 idx 對回原商品。
 * 失敗（連不上、超時、模型回傳錯誤）時拋錯，由呼叫端（utils/modelPipeline.ts）
 * 把還沒分析到的列標成 analysisStatus:"failed"——沒有離線規則引擎可以
 * fallback。
 *
 * @param items      要判斷的商品列（排除折扣/出清列與數量異常的列；是否為
 *                   食品完全交給這次呼叫判斷，不會事先篩過）
 * @returns          Record<idx, ModelItemAnalysis>
 */
export async function batchUnderstand(
  modelConfig: ModelConfig,
  profile: UserProfile,
  items: { itemName: string; qty: number; amount: number }[],
  signal?: AbortSignal
): Promise<Record<number, ModelItemAnalysis>> {
  if (!items.length) return {};

  let res: Response;
  try {
    res = await fetch("/api/understand/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        items,
        profile,
        lang: LANG,
        // 整個轉發 modelConfig，不要手動列舉欄位（同樣的原因見
        // services/dietCoach.ts 的說明）。
        modelConfig: {
          ...modelConfig,
          apiKey: modelConfig.apiKey || undefined,
        },
      }),
    });
  } catch (err) {
    throw new Error(
      `無法連到分析代理 (${err instanceof Error ? err.message : String(err)})`
    );
  }

  if (!res.ok) {
    throw new Error(`分析代理回傳 ${res.status}`);
  }

  const payload = (await res.json()) as {
    results?: Record<string, ModelItemAnalysis>;
    error?: string;
    meta?: { chunks: number; items: number };
  };

  // 後端某一個 chunk 失敗時，仍會把「前面已經成功的 chunk」的 results 一起
  // 回來（見 backend/main.py understand_batch 的失敗分支）。只要看到 error
  // 就整包 throw 掉，會把已經成功、只是恰好其中一批較慢/失敗的結果也一起
  // 丟棄，讓這批全部被標成分析失敗——只有完全沒有任何可用結果時，才值得
  // 整批當作失敗處理。
  if (payload.error && !Object.keys(payload.results ?? {}).length) {
    throw new Error(payload.error);
  }

  const out: Record<number, ModelItemAnalysis> = {};
  for (const [k, v] of Object.entries(payload.results ?? {})) {
    const idx = Number(k);
    if (!Number.isNaN(idx) && v && typeof v === "object") out[idx] = v;
  }
  return out;
}
