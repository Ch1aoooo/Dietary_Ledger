import { useRef, useState } from "react";
import {
  ShoppingBag,
  UtensilsCrossed,
  ShieldCheck,
  ListChecks,
  Sparkles,
  CircleAlert,
  ArrowRight,
  UploadCloud,
  Loader2,
  TriangleAlert,
  CalendarRange,
  Download,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/MetricCard";
import { FoodCategoryChart } from "@/components/FoodCategoryChart";
import { WeeklyTrendChart } from "@/components/WeeklyTrendChart";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ClinicalDocument } from "@/components/ClinicalDocument";
import { useApp } from "@/lib/store";
import { useUsers } from "@/lib/users";
import { buildAnalysis, buildClinicalSummary } from "@/lib/analytics";
import { fmtNum } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { exportNodeToSinglePageA4Pdf } from "@/lib/pdfExport";
import {
  DEFAULT_RANGE,
  computeFullDataRange,
  filterByDateRange,
  formatRangeLabel,
  resolvePageRange,
  type DateRange,
} from "@/lib/dateRange";

export function Dashboard() {
  const { transactions, reviews, profile, retryAnalysis, dateRanges, setPageRange } = useApp();
  const { activeUser } = useUsers();
  const documentRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  // 這個頁面自己的日期範圍狀態存在 lib/store.tsx 的 dateRanges.overview，
  // 不是本地 useState——切到別的頁面再切回來、甚至重新整理整頁都不會被
  // 重置（見 store.tsx 對 DateRangesState 的說明）。auto 模式（預設、或按
  // 「全部」之後）永遠跟著目前所有資料的實際範圍走。
  const rangeState = dateRanges.overview;
  const fullDataRange = computeFullDataRange(transactions) ?? DEFAULT_RANGE;
  const range = resolvePageRange(rangeState, fullDataRange);

  function handleRangeChange(next: DateRange) {
    setPageRange("overview", { mode: "custom", custom: next });
  }
  function handleSelectAll() {
    setPageRange("overview", { ...rangeState, mode: "auto" });
  }

  const rangedTransactions = filterByDateRange(transactions, range);
  const rangedReviews = filterByDateRange(reviews, range);
  const analysis = buildAnalysis(rangedTransactions, rangedReviews, formatRangeLabel(range));
  const { kpis } = analysis;
  const needReview = rangedReviews.filter((r) => r.confirmed == null).length;
  // 食品分類完全交給 AI、沒有離線規則引擎當備援——KPI/圖表都只算
  // analysisStatus:"ready" 的列，「還沒分析完」「分析失敗」的筆數不會反映
  // 在任何統計數字裡，這裡另外顯眼地提示，使用者才不會誤以為總數字對不上
  // 是 bug，或完全沒注意到有一批資料還沒分析/分析失敗。
  const pendingCount = rangedTransactions.filter((tx) => tx.analysisStatus === "pending").length;
  const failedCount = rangedTransactions.filter((tx) => tx.analysisStatus === "failed").length;

  const summary = buildClinicalSummary(
    rangedTransactions,
    rangedReviews,
    formatRangeLabel(range),
    t(activeUser.name)
  );

  async function handleDownload() {
    if (!documentRef.current || downloading) return;
    setDownloading(true);
    try {
      await exportNodeToSinglePageA4Pdf(
        documentRef.current,
        `dietary-summary-${range.start}_${range.end}.pdf`
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Title + date range picker */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            {!profile.onboarded ? t("歡迎") : t("每月")}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="font-display mt-1 text-2xl font-semibold text-foreground md:text-3xl">
              {t("{range} 飲食總覽", { range: formatRangeLabel(range) })}
            </h1>
            {transactions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {t("下載")}
              </Button>
            )}
          </div>
        </div>
        <DateRangePicker
          value={range}
          onChange={handleRangeChange}
          isAllSelected={rangeState.mode === "auto"}
          onSelectAll={handleSelectAll}
          className="self-start"
        />
      </div>

      {/* html2canvas 截圖來源——用「移到畫面外」讓使用者看不到，不能用
          display:none / opacity:0 / visibility:hidden，那些會讓 html2canvas
          量不到尺寸或截出空白圖。內容是原本 Clinical Summary 頁面那張
          「白色卡片」的濃縮版（見 ClinicalDocument.tsx 開頭說明），資料改用
          Overview 頁面自己的日期範圍（頁面已經刪除，不需要再維護一份獨立的
          clinical 日期範圍狀態）。外層固定成 A4 直向比例（794×1123px，
          96dpi 下的 A4 尺寸）並 overflow-hidden——這是「輸出必須濃縮在單一
          A4 頁」這個需求的硬邊界，配合 lib/pdfExport.ts 匯出時的等比縮放
          置中，兩層一起保證輸出永遠只有一頁、四周留白。 */}
      <div className="pointer-events-none fixed left-[-10000px] top-0" aria-hidden>
        <div
          ref={documentRef}
          className="overflow-hidden bg-background p-6"
          style={{ width: 794, height: 1123 }}
        >
          <ClinicalDocument summary={summary} analysis={analysis} />
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
              {t("尚未上傳任何資料")}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("上傳你的財政部電子發票 CSV（載具匯出格式），我們會解析並開始 推估「實際食用量」。上傳後即可看到分析結果。")}
            </p>
            <Button size="lg" className="mt-7" asChild>
              <Link to="/upload">
                {t("上傳 CSV")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      ) : rangedTransactions.length === 0 ? (
        // 資料本身是有的（不然就走上面那個「尚未上傳」空狀態），只是剛好
        // 都不落在目前選的日期範圍裡——跟「完全沒上傳過」是不同狀態，訊息
        // 不能一樣，不然使用者會誤以為資料不見了、跑去重新上傳。
        <Card className="soft-shadow border-border/70">
          <div className="mx-auto max-w-md py-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <CalendarRange className="h-7 w-7" />
            </div>
            <h2 className="font-display mt-6 text-xl font-semibold text-foreground">
              {t("這個日期範圍內沒有紀錄")}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("目前選取的是 {range}，試著調整右上角的日期範圍看看。", { range: formatRangeLabel(range) })}
            </p>
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
              {pendingCount > 0 && t("{n} 筆尚未完成 AI 分析", { n: pendingCount })}
              {pendingCount > 0 && failedCount > 0 && t("，")}
              {failedCount > 0 && t("{n} 筆分析失敗", { n: failedCount })}
              {t("——下面的統計數字還不含這些紀錄。")}
            </span>
          </div>
          {failedCount > 0 && (
            <Button variant="outline" size="sm" onClick={retryAnalysis}>
              {t("重試分析")}
            </Button>
          )}
        </Card>
      )}
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label={t("食品相關消費")}
          value={kpis.foodPurchases}
          hint={t("筆食品紀錄")}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <MetricCard
          label={t("推估個人份量")}
          value={fmtNum(kpis.estimatedServings)}
          hint={t("推估本人實際食用份量")}
          icon={<UtensilsCrossed className="h-4 w-4" />}
        />
        <MetricCard
          label={t("高信心紀錄")}
          value={`${kpis.highConfidencePct}%`}
          hint={t("信心 ≥ 80%")}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <MetricCard
          label={t("待確認")}
          value={needReview}
          hint={t("等待你協助確認")}
          icon={<ListChecks className="h-4 w-4" />}
          accent
        />
      </div>

      {/* Category breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>{t("此區間主要飲食類別")}</CardTitle>
          <CardDescription>{t("推估個人食用份量分布（%）")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FoodCategoryChart data={analysis.categories} />
        </CardContent>
      </Card>

      {/* Weekly trend */}
      <Card>
        <CardHeader>
          <CardTitle>{t("每週飲食趨勢")}</CardTitle>
          <CardDescription>{t("推估個人食用量逐週變化（份量 / 週）")}</CardDescription>
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
              <Sparkles className="h-4 w-4 text-tealink" /> {t("AI 飲食洞察")}
            </CardTitle>
            <CardDescription>{t("此區間分析 · 僅供參考，不作疾病判斷")}</CardDescription>
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
                <span className="text-sm font-semibold">{t("需要你協助確認")}</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {t("{n} 筆紀錄因信心不足、且可能影響飲食分析，建議你快速確認。", { n: needReview })}
              </p>
              <Link
                to="/review"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {t("前往待確認")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
