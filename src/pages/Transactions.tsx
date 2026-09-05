import { useMemo, useState } from "react";
import { Search, Inbox, RefreshCw, Loader2 } from "lucide-react";
import { TransactionTable } from "@/components/TransactionTable";
import { TransactionDetailPanel } from "@/components/TransactionDetailPanel";
import { AddManualEntryDialog } from "@/components/AddManualEntryDialog";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { applyReviews } from "@/lib/analytics";
import {
  DEFAULT_RANGE,
  computeFullDataRange,
  filterByDateRange,
  resolvePageRange,
  type DateRange,
} from "@/lib/dateRange";
import type { Transaction } from "@/types";

export function Transactions() {
  const {
    transactions,
    reviews,
    modelStatus,
    retryAnalysis,
    deleteTransaction,
    dateRanges,
    setPageRange,
  } = useApp();
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [view, setView] = useState<string>("food");
  const [q, setQ] = useState("");
  // 這個頁面自己的日期範圍狀態存在 lib/store.tsx 的 dateRanges.transactions
  // ——見 Dashboard.tsx 開頭那段對「為什麼不用本地 useState」的說明，這裡
  // 原理相同。
  const rangeState = dateRanges.transactions;
  const fullDataRange = computeFullDataRange(transactions) ?? DEFAULT_RANGE;
  const range = resolvePageRange(rangeState, fullDataRange);

  function handleRangeChange(next: DateRange) {
    setPageRange("transactions", { mode: "custom", custom: next });
  }
  function handleSelectAll() {
    setPageRange("transactions", { ...rangeState, mode: "auto" });
  }

  const isAnalyzing = modelStatus === "loading";

  const rangedTransactions = useMemo(
    () => filterByDateRange(transactions, range),
    [transactions, range]
  );
  // 新增/上傳完但還沒分析的紀錄，food.isFood 還是中性佔位值 false，「Food」
  // 分頁會過濾掉、只有「All records」看得到——不提醒的話，使用者剛新增
  // 完一筆，切回預設的 Food 分頁會覺得「東西不見了」。這顆提醒點只要還有
  // 任何一筆 pending 就顯示，分析完（變成 ready/failed）就自動消失。只看
  // 目前選取範圍內的紀錄，跟下面的表格內容保持一致。
  const hasUnanalyzedRecords = rangedTransactions.some((t) => t.analysisStatus === "pending");

  function handleDelete(id: string) {
    deleteTransaction(id);
    setSelected((cur) => (cur?.id === id ? null : cur));
  }

  // Dashboard/ClinicalSummary 都是透過 buildAnalysis/buildClinicalSummary
  // 內部呼叫 applyReviews() 才看到「使用者已確認」的最新 inference；這裡原本
  // 直接讀 store 的原始 transactions，確認 Review 之後這裡（含 Low
  // confidence 分頁跟點開的 detail panel）會永遠停留在確認前的舊推估。
  const merged = useMemo(
    () => applyReviews(rangedTransactions, reviews),
    [rangedTransactions, reviews]
  );

  const filtered = useMemo(() => {
    let list = merged;
    if (view === "food") list = list.filter((t) => t.food.isFood);
    if (view === "review") list = list.filter((t) => t.inference?.needsReview);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.itemName.toLowerCase().includes(s) ||
          t.merchant.toLowerCase().includes(s) ||
          t.category.toLowerCase().includes(s)
      );
    }
    return list;
  }, [merged, view, q]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              {t("交易明細")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("每一筆都能展開查看「原始 → 食物理解 → 推估」的完整邏輯。")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DateRangePicker
              value={range}
              onChange={handleRangeChange}
              isAllSelected={rangeState.mode === "auto"}
              onSelectAll={handleSelectAll}
            />
            <Tabs value={view} onValueChange={setView} className="w-fit">
              <TabsList>
                <TabsTrigger value="food">{t("食品")}</TabsTrigger>
                <TabsTrigger value="all" className="relative">
                  {t("全部紀錄")}
                  {hasUnanalyzedRecords && (
                    <span
                      aria-label={t("有尚未分析的新紀錄")}
                      title={t("有尚未分析的新紀錄")}
                      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-warning ring-2 ring-muted"
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="review">{t("低信心")}</TabsTrigger>
              </TabsList>
            </Tabs>
            {/*
              手動新增/刪除單筆記錄不會自動觸發 AI 分析（見 lib/store.tsx
              對分析 effect 的說明）——編輯完想要的所有筆數之後，按這顆才會
              一次送出所有還沒分析過（或上次失敗）的列，不會每加一筆就浪費
              一次 token。
            */}
            <Button
              variant="outline"
              size="sm"
              onClick={retryAnalysis}
              disabled={isAnalyzing}
              className="gap-1.5"
            >
              {isAnalyzing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {isAnalyzing ? t("分析中…") : t("重新分析")}
            </Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("搜尋品名、商店或類別…")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <Card className="p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Inbox className="h-8 w-8" />
              <p className="text-sm">{t("沒有符合條件的交易")}</p>
            </div>
          ) : (
            <TransactionTable
              transactions={filtered}
              isAnalyzing={isAnalyzing}
              onSelect={setSelected}
              onDelete={handleDelete}
            />
          )}
        </Card>
      </div>

      {/*
        TransactionDetailPanel 是 `fixed inset-0` 的全螢幕浮層，故意放在
        上面那個 `space-y-6` 容器外面。Tailwind 的 space-y-6 是靠
        `> :not([hidden]) ~ :not([hidden])` 這種「不是第一個子元素就加
        margin-top」的選擇器實作，這個浮層原本是容器的第 4 個子元素，會被
        硬塞一個 margin-top:24px，導致整個遮罩＋面板往下位移 24px、頂部露出
        一條沒被遮罩蓋到的背景——就是點開交易列時「上面一條白線」的成因。
      */}
      {selected && (
        <TransactionDetailPanel tx={selected} onClose={() => setSelected(null)} />
      )}

      <AddManualEntryDialog />
    </>
  );
}
