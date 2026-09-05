import { useState } from "react";
import { CheckCircle2, Filter } from "lucide-react";
import { ReviewCard } from "@/components/ReviewCard";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";

export function Review() {
  const { reviews, confirmReview, markUnsure } = useApp();
  const [tab, setTab] = useState("pending");

  const pending = reviews.filter((r) => r.confirmed == null);
  const done = reviews.filter((r) => r.confirmed != null);
  const show = tab === "pending" ? pending : done;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center md:text-left">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          {t("需要你的協助確認")}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground md:mx-0">
          {t("大部分紀錄已由模型自動處理。只有在推估不確定、且可能影響飲食分析時才會詢問你。")}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-full bg-warning/15 px-3 py-1 text-[#9a5b00]">
            {t("{n} 筆待確認", { n: pending.length })}
          </span>
          {done.length > 0 && (
            <span className="rounded-full bg-confirmed/10 px-3 py-1 text-confirmed">
              {t("已確認 {n} 筆", { n: done.length })}
            </span>
          )}
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" /> {t("待處理")} ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="done" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> {t("已確認")} ({done.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {show.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <CheckCircle2 className="h-8 w-8 text-confirmed" />
          <p className="text-sm font-medium text-foreground">{t("沒有待確認的紀錄")}</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            {tab === "pending"
              ? t("本月大部分推估信心足夠，已自動處理。")
              : t("你尚未確認任何紀錄。")}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {show.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              onConfirm={confirmReview}
              onMarkUnsure={markUnsure}
            />
          ))}
        </div>
      )}
    </div>
  );
}
