import { useState } from "react";
import { Check, HelpCircle, RefreshCw } from "lucide-react";
import type { ReviewItem } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { SourceBadge } from "@/components/SourceBadge";
import { cn, fmtNum } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { formatShortDate } from "@/lib/dateRange";

export function ReviewCard({
  item,
  onConfirm,
  onMarkUnsure,
}: {
  item: ReviewItem;
  onConfirm: (id: string, value: number) => void;
  onMarkUnsure: (id: string, fallbackValue: number) => void;
}) {
  // "unsure" 是跟任何實際數字都不會撞在一起的獨立狀態，不能再用 setPicked(0)
  // 表示「不確定」——0 是一個完全合法、使用者真的可能給出的答案，兩者用
  // 同一個值代表，會讓「不確定」被永久記成「100% 信心確認吃了 0 份」。
  const [picked, setPicked] = useState<number | "unsure" | null>(null);
  const confirmed = item.confirmed != null;
  const d = formatShortDate(item.date);
  // 快速選項的範圍原本固定是 1–4，買一整箱/一手飲料（購買量遠大於 4）時
  // 完全選不到接近實際食用量的數字。改成依購買量微幅放大範圍。
  const maxQuick = Math.max(4, Math.min(12, Math.ceil(item.purchasedQty)));
  const quickOptions = Array.from({ length: maxQuick }, (_, i) => i + 1);

  if (confirmed) {
    const c = item.confirmed as number;

    if (item.unsure) {
      return (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-muted-foreground">{d}</p>
              <p className="mt-1 text-sm font-medium text-foreground">{item.itemName}</p>
              <p className="text-xs text-muted-foreground">{item.merchant}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              {t("你選了「不確定」")}
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {t("我們保留原本的推估——{est} {unit} （信心 {conf}%），不會覆寫成一個假的確認值。", {
                est: fmtNum(item.modelEstimate),
                unit: item.typicalUnit,
                conf: Math.round(item.confidence),
              })}
            </p>
          </div>
        </Card>
      );
    }

    return (
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{d}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{item.itemName}</p>
            <p className="text-xs text-muted-foreground">{item.merchant}</p>
          </div>
          <SourceBadge source="user_confirmed" />
        </div>

        <div className="mt-4 rounded-xl border border-confirmed/25 bg-confirmed/5 p-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-confirmed">
            <Check className="h-4 w-4" />
            {t("已更新你的個人模型")}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-2xs text-muted-foreground">{t("確認前（推估）")}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{fmtNum(item.modelEstimate)}</p>
              <ConfidenceBadge value={item.confidence} className="mt-1" />
            </div>
            <div className="col-span-2">
              <p className="text-2xs text-muted-foreground">{t("確認後（已確認）")}</p>
              <p className="mt-1 text-lg font-semibold text-confirmed">
                {t("本人食用 {n} {unit}", { n: fmtNum(c), unit: item.typicalUnit })}
              </p>
              <p className="mt-1 text-2xs text-muted-foreground">{t("來源：使用者確認")}</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            {t("{d} · 需要你的協助", { d })}
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">{item.itemName}</p>
          <p className="text-sm text-muted-foreground">{item.merchant}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <ConfidenceBadge value={item.confidence} />
          <span className="text-2xs text-muted-foreground">{t("信心")}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-6 rounded-xl bg-muted/50 px-4 py-3">
        <div>
          <p className="text-2xs text-muted-foreground">{t("購買量")}</p>
          <p className="text-2xl font-semibold text-foreground">{fmtNum(item.purchasedQty)}</p>
        </div>
        <div className="h-9 w-px bg-border" />
        <div>
          <p className="text-2xs text-muted-foreground">{t("模型推估值")}</p>
          <p className="text-2xl font-semibold text-tealink">
            {fmtNum(item.modelEstimate)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {t("{unit}（本人）", { unit: item.typicalUnit })}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          <HelpCircle className="h-3.5 w-3.5" /> {t("推論依據")}
        </p>
        <ul className="space-y-1.5">
          {item.reasoning.map((line, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-snug text-muted-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-sm font-medium text-foreground">
        {t("這次購買大概有多少份是你自己吃的？")}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {quickOptions.map((n) => (
          <button
            key={n}
            onClick={() => setPicked(n)}
            className={cn(
              "h-10 w-12 rounded-xl border text-sm font-medium transition-colors",
              picked === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-accent"
            )}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setPicked("unsure")}
          className={cn(
            "h-10 rounded-xl border px-3 text-sm transition-colors",
            picked === "unsure"
              ? "border-warning bg-warning/15 text-[#9a5b00]"
              : "border-border bg-card text-muted-foreground hover:bg-accent"
          )}
        >
          {t("不確定")}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          size="sm"
          disabled={picked == null}
          onClick={() => {
            if (picked === "unsure") onMarkUnsure(item.id, item.modelEstimate);
            else if (picked != null) onConfirm(item.id, picked);
          }}
        >
          <Check className="h-4 w-4" /> {t("確認")}
        </Button>
        {picked != null && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            {picked === "unsure"
              ? t("選取後此紀錄將標記為「不確定」，保留原本推估")
              : t("選取後此紀錄將視為「本人食用 {n} {unit}」", { n: picked, unit: item.typicalUnit })}
          </span>
        )}
      </div>
    </Card>
  );
}
