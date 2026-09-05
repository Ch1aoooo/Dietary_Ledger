import { useEffect } from "react";
import { X, Sparkles, Loader2, TriangleAlert } from "lucide-react";
import type { Transaction } from "@/types";
import { SourceBadge } from "@/components/SourceBadge";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Badge } from "@/components/ui/badge";
import { categoryLabel } from "@/lib/colors";
import { fmtNum } from "@/lib/utils";
import { t, LANG } from "@/lib/i18n";
import { formatShortDate } from "@/lib/dateRange";

const SHELF_LIFE_LABELS: Record<string, string> = {
  "very short": t("很短"),
  short: t("短"),
  medium: t("中等"),
  long: t("長"),
};

function Label({ children }: { children: string }) {
  return (
    <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function Row({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={strong ? "font-medium text-foreground" : "text-foreground"}>
        {v}
      </span>
    </div>
  );
}

export function TransactionDetailPanel({
  tx,
  onClose,
}: {
  tx: Transaction;
  onClose: () => void;
}) {
  const inf = tx.inference;
  const d = formatShortDate(tx.date);

  // 這是手刻的 slide-over，不是 Radix Dialog，沒有內建的 Escape-to-close——
  // 原本唯一的關閉方式是滑鼠點 X 或點背景遮罩。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card soft-shadow">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border/70 bg-card px-6 py-5">
          <div>
            <p className="text-xs text-muted-foreground">
              {d} · {tx.invoiceNo}
            </p>
            <h2 className="font-display mt-1 text-lg font-semibold leading-tight text-foreground">
              {tx.itemName}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{tx.merchant}</p>
          </div>
          <button
            onClick={onClose}
            aria-label={t("關閉")}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* 購買 vs 推估 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted/60 p-3">
              <Label>{t("購買量")}</Label>
              <p className="mt-1 text-2xl font-semibold">{fmtNum(tx.purchasedQty)}</p>
            </div>
            <div className="rounded-xl bg-accent/70 p-3">
              <Label>{t("推估攝取")}</Label>
              <p className="mt-1 text-2xl font-semibold text-tealink">
                {fmtNum(inf?.estimatedSelfConsumed ?? 0)}
              </p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <Label>{t("來源")}</Label>
              <div className="mt-1.5">
                <SourceBadge source={inf?.source ?? "observed"} />
              </div>
            </div>
          </div>

          {inf && (
            <div>
              <Label>{t("信心")}</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <ConfidenceBadge value={inf.confidence} />
                <span className="text-xs text-muted-foreground">
                  {inf.confidence >= 80
                    ? t("高信心")
                    : inf.confidence >= 60
                      ? t("中等信心")
                      : t("低信心")}
                </span>
              </div>
            </div>
          )}

          {/* 原始交易資料 */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">{t("原始交易")}</h3>
            <div className="rounded-xl border border-border/70 p-4">
              <Row k={t("購買數量")} v={`${fmtNum(tx.purchasedQty)}`} strong />
              <Row k={t("單價")} v={`NT$ ${tx.unitPrice}`} />
              <Row k={t("小計金額")} v={`NT$ ${tx.amount}`} />
            </div>
          </section>

          {/*
            食品分類完全交給 AI、而且是非同步的——沒有離線規則引擎當備援。
            analysisStatus 還是 pending/failed 時，tx.food 只是 processing.ts
            給的中性佔位值，不是真的分類結果，不能照樣顯示成
            「Category: Non-food / Shelf life: short」，那會被誤讀成
            系統已經判斷過了。
          */}
          {tx.analysisStatus === "pending" && (
            <p className="flex items-center gap-2 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              {t("AI 尚未分析這一列，稍後重新整理即可看到食品分類與攝取推估。")}
            </p>
          )}
          {tx.analysisStatus === "failed" && (
            <p className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {t("AI 分析這一列時失敗了（連不上模型、逾時，或回應不完整）。可以到 「設定」確認模型設定後按「重試分析」。")}
            </p>
          )}

          {tx.analysisStatus === "ready" && (
            <>
              {/* 食物理解 */}
              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  {t("食品理解")}
                </h3>
                <div className="rounded-xl border border-border/70 p-4">
                  <Row k={t("分類")} v={<Badge variant="muted">{categoryLabel(tx.food.category)}</Badge>} />
                  <Row
                    k={t("可囤貨")}
                    v={tx.food.stockable ? t("是") : t("否")}
                    strong={tx.food.stockable}
                  />
                  <Row k={t("保存期限")} v={SHELF_LIFE_LABELS[tx.food.shelfLife] ?? tx.food.shelfLife} />
                  {LANG !== "en" && <Row k={t("常見單位")} v={tx.food.typicalUnit} />}
                </div>
              </section>

              {/* 推估結果 */}
              {inf ? (
                <section>
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-tealink" />
                    {t("推論")}
                  </h3>
                  <div className="rounded-xl border border-border/70 p-4">
                    <Row
                      k={t("推估個人食用量")}
                      v={`${fmtNum(inf.estimatedSelfConsumed)}`}
                      strong
                    />
                    {inf.distributionDays && (
                      <Row k={t("分配天數")} v={t("{n} 天", { n: inf.distributionDays })} />
                    )}
                    <Row k={t("信心")} v={`${inf.confidence}%`} />
                  </div>
                  <ul className="mt-3 space-y-2">
                    {inf.reasoning.map((line, i) => (
                      <li
                        key={i}
                        className="flex gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[13px] leading-snug text-foreground"
                      >
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-tealink" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                  {t("此列判定為非食品或折扣調整，不納入飲食分析。")}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
