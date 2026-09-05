import type { ModelConfig, Transaction, UserProfile } from "@/types";

/** AI 飲食顧問的歷史訊息 */
export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CoachReply {
  answer?: string;
  error?: string;
}

const SESSION_KEY = "dl.coachSession.v1";

/**
 * 後端把所有分頁的資料都存進同一個 SQLite（見 backend/main.py），開兩個
 * 分頁（或兩個不同期間/不同上傳的資料）各自呼叫 /api/ask/load 時會互相
 * DELETE + 覆寫對方剛載入的資料。用 sessionStorage（分頁各自獨立，不像
 * localStorage 會跨分頁共用）給每個分頁一個穩定的 id，讓後端可以把資料
 * 分開存放，互不干擾。
 */
function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, "")
          : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "default";
  }
}

/** 把目前交易資料整批載入後端 SQLite（每次開啟聊天時呼叫一次，確保是最新資料） */
export async function loadCoachData(
  transactions: Transaction[]
): Promise<void> {
  const res = await fetch("/api/ask/load", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions, session_id: getSessionId() }),
  });
  if (!res.ok) throw new Error(`無法載入資料 (${res.status})`);
}

/** 送一輪對話給 AI 飲食顧問（Text-to-SQL） */
export async function askCoach(
  modelConfig: ModelConfig,
  profile: UserProfile,
  period: string,
  messages: CoachMessage[],
  signal?: AbortSignal
): Promise<CoachReply> {
  let res: Response;
  try {
    res = await fetch("/api/ask/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        messages,
        profile,
        period,
        session_id: getSessionId(),
        // 整個轉發 modelConfig，不要手動列舉欄位——列舉法之前就出過一次
        // 問題：ModelConfig 加新欄位時，這裡沒跟著加，新欄位就被悄悄漏送
        // 到後端。
        modelConfig: {
          ...modelConfig,
          apiKey: modelConfig.apiKey || undefined,
        },
      }),
    });
  } catch (err) {
    throw new Error(
      `無法連到 AI 顧問 (${err instanceof Error ? err.message : String(err)})`
    );
  }
  if (!res.ok) throw new Error(`AI 顧問回傳 ${res.status}`);
  return (await res.json()) as CoachReply;
}
