import { Clock, Loader2, Trash2, TriangleAlert } from "lucide-react";
import type { Transaction } from "@/types";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Badge } from "@/components/ui/badge";
import { categoryLabel } from "@/lib/colors";
import { fmtNum } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { formatShortDate } from "@/lib/dateRange";

/**
 * 食品分類完全交給 AI、而且是非同步的——沒有離線規則引擎當備援，所以
 * 「還沒分析完」「分析失敗」是每次上傳後都會先經過的正常狀態，不是邊角
 * case。這裡不能直接沿用「沒有 inference 就顯示 Non-food」的舊邏輯，
 * 不然使用者會把「AI 還沒處理到」誤讀成「系統判斷這不是食品」。
 *
 * pending 現在分兩種情境：真的正在等模型回應（isAnalyzing），或只是
 * 使用者剛新增/還沒按「重新分析」、根本還沒送出去（見 lib/store.tsx——
 * 手動新增/刪除不會自動觸發 AI）。兩者不該用同一個會轉圈圈的「分析中」
 * 字樣，不然使用者會以為系統正在處理，其實只是在等他自己按按鈕。
 */
function AnalysisStatusBadge({ tx, isAnalyzing }: { tx: Transaction; isAnalyzing: boolean }) {
  if (tx.analysisStatus === "pending") {
    return isAnalyzing ? (
      <Badge variant="muted" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> {t("分析中")}
      </Badge>
    ) : (
      <Badge variant="muted" className="gap-1">
        <Clock className="h-3 w-3" /> {t("待分析")}
      </Badge>
    );
  }
  if (tx.analysisStatus === "failed") {
    return (
      <Badge variant="muted" className="gap-1 border-destructive/30 text-destructive">
        <TriangleAlert className="h-3 w-3" /> {t("分析失敗")}
      </Badge>
    );
  }
  return null;
}

function EstimateCell({ tx }: { tx: Transaction }) {
  const inf = tx.inference;
  if (!inf) return <span className="text-muted-foreground">—</span>;
  // TransactionDetailPanel 用 fmtNum() 把同一個欄位四捨五入到 1 位小數，
  // 這裡原本是直接印原始值——線上模型回傳的 estimatedSelfConsumed 常是
  // 沒四捨五入過的浮點數，同一筆資料在表格跟 detail panel 顯示的數字
  // 會不一致（例如表格顯示 1.6666666666666667，detail panel 顯示 1.7）。
  if (inf.distributionDays) {
    return (
      <span>
        {fmtNum(inf.estimatedSelfConsumed)}
        <span className="text-2xs text-muted-foreground"> · {t("{n} 天", { n: inf.distributionDays })}</span>
      </span>
    );
  }
  return <span>{fmtNum(inf.estimatedSelfConsumed)}</span>;
}

export function TransactionTable({
  transactions,
  isAnalyzing,
  onSelect,
  onDelete,
}: {
  transactions: Transaction[];
  isAnalyzing: boolean;
  onSelect: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/70 text-left text-2xs uppercase tracking-wide text-muted-foreground">
            <th className="py-3 pr-4 font-medium">{t("日期")}</th>
            <th className="py-3 pr-4 font-medium">{t("商店")}</th>
            <th className="py-3 pr-4 font-medium">{t("品項")}</th>
            <th className="py-3 pr-4 text-right font-medium">{t("購買量")}</th>
            <th className="py-3 pr-4 text-right font-medium">{t("推估攝取")}</th>
            <th className="py-3 pr-4 text-center font-medium">{t("信心")}</th>
            <th className="py-3 pr-4 font-medium">{t("分類")}</th>
            <th className="py-3 pr-4 font-medium text-right">
              <span className="sr-only">{t("刪除")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              onClick={() => onSelect(tx)}
              // 原本只有 onClick，<tr> 本身不是原生可聚焦元素，鍵盤/螢幕
              // 閱讀器使用者完全無法不用滑鼠就打開這筆的 detail panel。
              tabIndex={0}
              role="button"
              aria-label={t("查看「{item}」的詳細資料", { item: tx.itemName })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(tx);
                }
              }}
              className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                {formatShortDate(tx.date)}
              </td>
              <td className="py-3 pr-4 text-muted-foreground">{shortenM(tx.merchant)}</td>
              <td className="max-w-[220px] py-3 pr-4">
                <div className="truncate font-medium text-foreground">{tx.itemName}</div>
              </td>
              <td className="py-3 pr-4 text-right text-muted-foreground">
                {fmtNum(tx.purchasedQty)}
              </td>
              <td className="py-3 pr-4 text-right font-medium text-foreground">
                <EstimateCell tx={tx} />
              </td>
              <td className="py-3 pr-4 text-center">
                {tx.inference ? (
                  <ConfidenceBadge value={tx.inference.confidence} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-3 pr-4">
                {tx.analysisStatus !== "ready" ? (
                  <AnalysisStatusBadge tx={tx} isAnalyzing={isAnalyzing} />
                ) : (
                  <Badge variant="muted" className="max-w-[150px] truncate">
                    {categoryLabel(tx.category)}
                  </Badge>
                )}
              </td>
              <td className="py-3 pl-4 text-right">
                <button
                  onClick={(e) => {
                    // 刪除鍵在 <tr> 裡面，<tr> 本身有 onClick 會開 detail
                    // panel——沒有這個就會「刪除」跟「打開詳細資料」同時
                    // 觸發。
                    e.stopPropagation();
                    onDelete(tx.id);
                  }}
                  title={t("刪除這筆紀錄")}
                  aria-label={t("刪除「{item}」", { item: tx.itemName })}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function shortenM(name: string): string {
  if (!name) return "—";
  const clean = name.replace(/股份有限公司/g, "").replace(/分公司/g, "");
  return clean.length > 18 ? clean.slice(0, 18) + "…" : clean;
}
