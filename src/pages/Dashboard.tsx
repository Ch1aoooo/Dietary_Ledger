import {
  ShoppingBag,
  UtensilsCrossed,
  ShieldCheck,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CircleAlert,
  ArrowRight,
  UploadCloud,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/MetricCard";
import { FoodCategoryChart } from "@/components/FoodCategoryChart";
import { ConsumptionComparisonChart } from "@/components/ConsumptionComparisonChart";
import { WeeklyTrendChart } from "@/components/WeeklyTrendChart";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/store";
import { buildAnalysis } from "@/lib/analytics";
import { fmtNum } from "@/lib/utils";

export function Dashboard() {
  const { transactions, reviews, profile, retryAnalysis } = useApp();
  const analysis = buildAnalysis(transactions, reviews, "2026-08");
  const { kpis } = analysis;
  const needReview = reviews.filter((r) => r.confirmed == null).length;
  // 食品分類完全交給 AI、沒有離線規則引擎當備援——KPI/圖表都只算
  // analysisStatus:"ready" 的列，「還沒分析完」「分析失敗」的筆數不會反映
  // 在任何統計數字裡，這裡另外顯眼地提示，使用者才不會誤以為總數字對不上
  // 是 bug，或完全沒注意到有一批資料還沒分析/分析失敗。
  const pendingCount = transactions.filter((t) => t.analysisStatus === "pending").length;
  const failedCount = transactions.filter((t) => t.analysisStatus === "failed").length;

  return (
    <div className="space-y-8">
      {/* Title + month selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            {!profile.onboarded ? "Welcome" : "Monthly"}
          </p>
          <h1 className="font-display mt-1 text-2xl font-semibold text-foreground md:text-3xl">
            August 2026 Dietary Overview
          </h1>
        </div>
        {/*
          這個 demo 目前只有 2026-08 一個月的資料，buildAnalysis() 也是寫死
          查 "2026-08"。原本這裡的月份切換是可以點的，但點了之後除了小標籤
          文字換成「September 2026」以外，底下所有 KPI/圖表/insight 完全不
          會變——看起來像功能，其實整個是裝飾。與其留著一個點了沒反應的假
          按鈕，不如誠實地把箭頭都關掉、註明目前只有這個月的資料。
        */}
        <div
          className="flex items-center gap-1 self-start rounded-xl border border-border/70 bg-card p-1 soft-shadow"
          title="Demo 目前僅收錄 2026 年 8 月資料"
        >
          <button
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground opacity-30"
            disabled
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="relative px-4">
            <span className="text-sm font-medium text-foreground">August 2026</span>
          </div>
          <button
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground opacity-30"
            disabled
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 尚未上傳資料時的空狀態 */}
      {transactions.length === 0 ? (
        <Card className="soft-shadow border-border/70">
          <div className="mx-auto max-w-md py-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <UploadCloud className="h-7 w-7" />
            </div>
            <h2 className="font-display mt-6 text-xl font-semibold text-foreground">
              尚未上傳任何資料
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              上傳你的財政部電子發票 CSV（載具匯出格式），我們會解析並開始
              推估「實際食用量」。上傳後即可看到分析結果。
            </p>
            <Button size="lg" className="mt-7" asChild>
              <Link to="/upload">
                上傳 CSV <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <>
      {(pendingCount > 0 || failedCount > 0) && (
        <Card
          className={
            failedCount > 0
              ? "flex flex-wrap items-center justify-between gap-3 border-destructive/30 bg-destructive/5 p-4"
              : "flex flex-wrap items-center justify-between gap-3 border-warning/30 bg-warning/5 p-4"
          }
        >
          <div className="flex items-center gap-2 text-sm">
            {failedCount > 0 ? (
              <TriangleAlert className="h-4 w-4 shrink-0 text-destructive" />
            ) : (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#9a5b00]" />
            )}
            <span className="text-foreground">
              {pendingCount > 0 && `${pendingCount} 筆尚未完成 AI 分析`}
              {pendingCount > 0 && failedCount > 0 && "，"}
              {failedCount > 0 && `${failedCount} 筆分析失敗`}
              ——下面的統計數字還不含這些紀錄。
            </span>
          </div>
          {failedCount > 0 && (
            <Button variant="outline" size="sm" onClick={retryAnalysis}>
              重試分析
            </Button>
          )}
        </Card>
      )}
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Food-related purchases"
          value={kpis.foodPurchases}
          hint="筆食品紀錄"
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <MetricCard
          label="Estimated personal servings"
          value={fmtNum(kpis.estimatedServings)}
          hint="推估本人實際食用份量"
          icon={<UtensilsCrossed className="h-4 w-4" />}
        />
        <MetricCard
          label="High-confidence records"
          value={`${kpis.highConfidencePct}%`}
          hint="confidence ≥ 80%"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <MetricCard
          label="Need review"
          value={needReview}
          hint="等待你協助確認"
          icon={<ListChecks className="h-4 w-4" />}
          accent
        />
      </div>

      {/* Category + comparison */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>本月主要飲食類別</CardTitle>
            <CardDescription>推估個人食用份量分布（servings）</CardDescription>
          </CardHeader>
          <CardContent>
            <FoodCategoryChart data={analysis.categories} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase vs Estimated Intake</CardTitle>
            <CardDescription>
              我們沒有直接把所有購買量當成食用量。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConsumptionComparisonChart data={analysis.categories} />
          </CardContent>
        </Card>
      </div>

      {/* Weekly trend */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly dietary trend</CardTitle>
          <CardDescription>推估個人食用量逐週變化（servings / week）</CardDescription>
        </CardHeader>
        <CardContent>
          <WeeklyTrendChart data={analysis.weekly} />
        </CardContent>
      </Card>

      {/* Insights + review nudge */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-tealink" /> AI Dietary Insights
            </CardTitle>
            <CardDescription>本月分析 · 僅供參考，不作疾病判斷</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.insights.map((ins, i) => (
              <div key={i} className="flex gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                <div
                  className={
                    "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold " +
                    (ins.tone === "watch"
                      ? "bg-warning/15 text-[#9a5b00]"
                      : "bg-tealink/12 text-tealink")
                  }
                >
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{ins.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{ins.body}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {needReview > 0 && (
            <Card className="border-warning/30 bg-warning/5 p-5">
              <div className="flex items-center gap-2 text-[#9a5b00]">
                <CircleAlert className="h-4 w-4" />
                <span className="text-sm font-semibold">需要你協助確認</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {needReview} 筆紀錄因信心不足、且可能影響飲食分析，建議你快速確認。
              </p>
              <Link
                to="/review"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                前往 Review <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          )}
          <Card className="bg-primary text-primary-foreground p-5">
            <p className="text-sm font-semibold">資料來源說明</p>
            <div className="mt-3 space-y-2 text-[13px]">
              <BadgeTag c="inferred" t="Inferred · 模型推估" />
              <BadgeTag c="confirmed" t="User Confirmed · 你修正過" />
              <BadgeTag c="observed" t="Observed · 發票直接紀錄" />
              <BadgeTag c="warning" t="Low confidence · 需確認" />
            </div>
          </Card>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

function BadgeTag({ c, t }: { c: string; t: string }) {
  const styles: Record<string, string> = {
    inferred: "bg-inferred/25 text-[#cfe3ff]",
    confirmed: "bg-confirmed/30 text-[#c9f0dc]",
    observed: "bg-observed/40 text-white/85",
    warning: "bg-warning/25 text-[#ffe3b3]",
  };
  return (
    <Badge className={styles[c]}>{t}</Badge>
  );
}
