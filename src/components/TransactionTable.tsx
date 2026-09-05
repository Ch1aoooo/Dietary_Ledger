import { Loader2, TriangleAlert } from "lucide-react";
import type { Transaction } from "@/types";
import { SourceBadge } from "@/components/SourceBadge";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Badge } from "@/components/ui/badge";
import { fmtNum } from "@/lib/utils";

function fmtDate(iso: string): string {
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}`;
}

/**
 * 食品分類完全交給 AI、而且是非同步的——沒有離線規則引擎當備援，所以
 * 「還沒分析完」「分析失敗」是每次上傳後都會先經過的正常狀態，不是邊角
 * case。這裡不能直接沿用「沒有 inference 就顯示 Non-food」的舊邏輯，
 * 不然使用者會把「AI 還沒處理到」誤讀成「系統判斷這不是食品」。
 */
function AnalysisStatusBadge({ tx }: { tx: Transaction }) {
  if (tx.analysisStatus === "pending") {
    return (
      <Badge variant="muted" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> 分析中
      </Badge>
    );
  }
  if (tx.analysisStatus === "failed") {
    return (
      <Badge variant="muted" className="gap-1 border-destructive/30 text-destructive">
        <TriangleAlert className="h-3 w-3" /> 分析失敗
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
        <span className="text-2xs text-muted-foreground"> · {inf.distributionDays}d</span>
      </span>
    );
  }
  return <span>{fmtNum(inf.estimatedSelfConsumed)}</span>;
}

export function TransactionTable({
  transactions,
  onSelect,
}: {
  transactions: Transaction[];
  onSelect: (tx: Transaction) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/70 text-left text-2xs uppercase tracking-wide text-muted-foreground">
            <th className="py-3 pr-4 font-medium">Date</th>
            <th className="py-3 pr-4 font-medium">Merchant</th>
            <th className="py-3 pr-4 font-medium">Item</th>
            <th className="py-3 pr-4 text-right font-medium">Purchased</th>
            <th className="py-3 pr-4 text-right font-medium">Est. intake</th>
            <th className="py-3 pr-4 text-center font-medium">Confidence</th>
            <th className="py-3 pr-4 font-medium">Source</th>
            <th className="py-3 font-medium">Category</th>
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
              aria-label={`查看「${tx.itemName}」的詳細資料`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(tx);
                }
              }}
              className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                {fmtDate(tx.date)}
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
                  <AnalysisStatusBadge tx={tx} />
                ) : tx.inference ? (
                  <SourceBadge source={tx.inference.source} />
                ) : (
                  <Badge variant="muted">Non-food</Badge>
                )}
              </td>
              <td className="py-3">
                {tx.analysisStatus !== "ready" ? (
                  <AnalysisStatusBadge tx={tx} />
                ) : (
                  <Badge variant="muted" className="max-w-[150px] truncate">
                    {tx.category}
                  </Badge>
                )}
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
