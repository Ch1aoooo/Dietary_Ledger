import { useCallback, useEffect, useRef, useState } from "react";
import { SendHorizontal, Sparkles, RotateCcw, Loader2, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/store";
import { askCoach, loadCoachData, type CoachMessage } from "@/services/dietCoach";
import { Markdown } from "@/components/Markdown";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const WELCOME: CoachMessage = {
  role: "assistant",
  content: t(
    "嗨！我是你的 AI 飲食顧問 👋 我可以直接查你今天上傳的發票資料，回答像是\n「我這個月含糖飲料喝得多嗎？」「我最常在哪家買吃的？」「咖啡攝取有沒有變多？」\n需要我幫你分析看看嗎？"
  ),
};

export function DietCoach() {
  const { transactions, profile, modelConfig, period } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CoachMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // dataReady 代表「後端 SQLite 裡那份資料，跟目前這份 transactions 是同一份」。
  // 只有在這個為 true 時才能送出問題——原本沒有這層防護：loadCoachData()
  // 是 fire-and-forget，使用者上傳新 CSV 後如果動作夠快（或這次上傳的資料
  // 量比較大、load 比較慢），可以在新資料還沒寫進後端之前就先送出問題，
  // 兩個請求互相 race，問到的還是舊資料——這正是使用者回報的「AI 讀到的
  // CSV 是舊的」。用一個明確的 dataReady 擋住輸入框/送出鍵，使用者送出時
  // 保證後端已經同步完成。
  const [dataReady, setDataReady] = useState(false);
  const loadingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // transactions 換了（重新上傳、模型升級完成…）就代表後端 SQLite 裡那份
  // 已經過期，要重新 loadCoachData()。
  useEffect(() => {
    setDataReady(false);
  }, [transactions]);

  // 開啟時（或 transactions 換新之後）把最新資料寫進後端 SQLite。
  // loadingRef 純粹防止同一份資料被重複送出（例如 effect 因為其他原因
  // 重跑），跟「資料到底同不同步」的 dataReady 分開，狀態語意才不會混在
  // 一起。
  useEffect(() => {
    if (!open || dataReady || loadingRef.current) return;
    let cancelled = false;
    loadingRef.current = true;
    loadCoachData(transactions)
      .catch(() => {})
      .finally(() => {
        loadingRef.current = false;
        if (!cancelled) setDataReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, dataReady, transactions]);

  // 每次有新訊息就捲到底部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [messages, busy]);

  // 這是浮窗、不是 Modal：沒有遮罩鎖定背景捲動，所以用 Esc 提供鍵盤關閉方式
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    // dataReady 防呆：理論上輸入框/送出鍵在資料同步完成前就已經 disabled，
    // 這裡再擋一次，避免任何殘留的 Enter 事件繞過 UI 狀態直接送出。
    if (!text || busy || !dataReady) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const reply = await askCoach(modelConfig, profile, period, next);
      if (reply.error) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `⚠️ ${reply.error}` },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: reply.answer ?? "" },
        ]);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `⚠️ ${t("AI 顧問暫時連不上：{msg}。請確認後端與模型已啟動。", {
            msg: err instanceof Error ? err.message : String(err),
          })}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }, [input, busy, dataReady, messages, modelConfig, profile, period]);

  return (
    <>
      {/* 右下角浮動按鈕 */}
      <button
        onClick={() => setOpen((o) => !o)}
        title={t("AI 飲食顧問")}
        aria-expanded={open}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105",
          open && "scale-90"
        )}
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/*
        浮窗，不是彈窗：刻意不用 Dialog/遮罩，背景頁面維持可捲動、可互動，
        使用者可以邊看資料邊問 AI。用透明度＋位移做開關動畫，關閉時仍留在
        DOM 中播放退場動畫，並用 pointer-events-none / aria-hidden 避免
        擋到或誤觸背後內容。
      */}
      <div
        role="dialog"
        aria-label={t("AI 飲食顧問")}
        aria-hidden={!open}
        className={cn(
          "fixed bottom-24 right-6 z-40 flex h-[min(70vh,600px)] w-[min(92vw,400px)] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl transition-all duration-200 ease-out",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        )}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border/70 px-5 py-4">
          <div>
            <p className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-tealink" /> {t("AI 飲食顧問")}
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {dataReady ? (
                  t("直接問，我會查你的發票資料回答")
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" /> {t("同步最新發票資料中…")}
                  </>
                )}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => setMessages([WELCOME])}
                disabled={busy || messages.length <= 1}
              >
                <RotateCcw className="h-3.5 w-3.5" /> {t("清除對話")}
              </Button>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            title={t("關閉")}
            aria-label={t("關閉")}
            className="rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:bg-accent hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 訊息區 */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border/70 bg-muted/40 text-foreground"
                )}
              >
                {m.role === "user" ? (
                  <span className="whitespace-pre-line">{m.content}</span>
                ) : (
                  <Markdown content={m.content} />
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("顧問思考中…")}
              </div>
            </div>
          )}
        </div>

        {/* 輸入區 */}
        <div className="flex items-center gap-2 border-t border-border/70 p-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // 中文（注音/拼音等）輸入法選字時按 Enter 是「確認候選字」，
              // 這個按鍵事件在瀏覽器裡還是會有 key==="Enter"，如果沒有排除
              // composing 狀態，選字的那次 Enter 會被這裡誤判成「送出」：
              // send() 當下讀到的是選字還沒真正寫進輸入框前的舊值、清空
              // input 後，輸入法緊接著才把剛選好的字補進框裡，畫面上就變成
              // 「送出後文字還留在框裡」。用 isComposing 擋掉輸入法選字
              // 過程中的 Enter，只有真的送出意圖（選字已完成）才觸發。
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={dataReady ? t("問我你的飲食…") : t("同步資料中，稍等一下…")}
            className="h-10"
            disabled={!open || !dataReady}
            tabIndex={open ? 0 : -1}
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={send}
            disabled={busy || !input.trim() || !open || !dataReady}
            tabIndex={open ? 0 : -1}
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
