import { useMemo, useState } from "react";
import { Search, Inbox } from "lucide-react";
import { TransactionTable } from "@/components/TransactionTable";
import { TransactionDetailPanel } from "@/components/TransactionDetailPanel";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/store";
import { applyReviews } from "@/lib/analytics";
import type { Transaction } from "@/types";

export function Transactions() {
  const { transactions, reviews } = useApp();
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [view, setView] = useState<string>("food");
  const [q, setQ] = useState("");

  // Dashboard/ClinicalSummary 都是透過 buildAnalysis/buildClinicalSummary
  // 內部呼叫 applyReviews() 才看到「使用者已確認」的最新 inference；這裡原本
  // 直接讀 store 的原始 transactions，確認 Review 之後這裡（含 Low
  // confidence 分頁跟點開的 detail panel）會永遠停留在確認前的舊推估。
  const merged = useMemo(
    () => applyReviews(transactions, reviews),
    [transactions, reviews]
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
              Transactions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              每一筆都能展開查看「原始 → 食物理解 → 推估」的完整邏輯。
            </p>
          </div>
          <Tabs value={view} onValueChange={setView} className="w-fit">
            <TabsList>
              <TabsTrigger value="food">Food</TabsTrigger>
              <TabsTrigger value="all">All records</TabsTrigger>
              <TabsTrigger value="review">Low confidence</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜尋品名、商店或類別…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <Card className="p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Inbox className="h-8 w-8" />
              <p className="text-sm">沒有符合條件的交易</p>
            </div>
          ) : (
            <TransactionTable transactions={filtered} onSelect={setSelected} />
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
    </>
  );
}
