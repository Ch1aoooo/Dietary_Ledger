import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANG, t } from "@/lib/i18n";

const WEEKDAYS =
  LANG === "en"
    ? ["S", "M", "T", "W", "T", "F", "S"]
    : ["日", "一", "二", "三", "四", "五", "六"];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * 單月網格日曆，支援「範圍」選取（跟 components/ui/calendar.tsx 那個單日
 * 版本分開寫，因為範圍要處理頭尾 + 中間淺色連接的視覺，跟單日選取的邏輯
 * 差夠多，硬塞成同一個元件反而會有一堆 if range-mode 的分支）。
 */
export function DateRangeCalendar({
  rangeStart,
  rangeEnd,
  onPick,
  initialMonth,
}: {
  rangeStart: string | null;
  rangeEnd: string | null;
  onPick: (iso: string) => void;
  /** 一開始要顯示哪個月（YYYY-MM-DD），預設今天所在的月份。 */
  initialMonth?: string;
}) {
  const anchor = initialMonth ? parseISODate(initialMonth) : new Date();
  const [viewYear, setViewYear] = useState(anchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(anchor.getMonth());

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function goMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  return (
    <div className="rounded-xl border border-border/70 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          aria-label={t("上個月")}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium text-foreground">
          {t("{y} 年 {m} 月", { y: viewYear, m: viewMonth + 1 })}
        </p>
        <button
          type="button"
          onClick={() => goMonth(1)}
          aria-label={t("下個月")}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-2xs text-muted-foreground">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day == null) return <div key={`empty-${i}`} />;
          const iso = toISODate(new Date(viewYear, viewMonth, day));
          const isStart = iso === rangeStart;
          const isEnd = iso === rangeEnd;
          const inBetween =
            rangeStart != null && rangeEnd != null && iso > rangeStart && iso < rangeEnd;

          return (
            <div
              key={iso}
              className={cn(
                "flex",
                // 中間的淺色背景要跟頭尾接在一起，不能有格子間的縫隙；只有
                // 頭尾兩顆按鈕本身需要圓角，中間用外層 div 的背景色連成一條。
                inBetween && "bg-primary/15",
                isStart && rangeEnd && "rounded-l-lg bg-primary/15",
                isEnd && rangeStart && "rounded-r-lg bg-primary/15"
              )}
            >
              <button
                type="button"
                onClick={() => onPick(iso)}
                className={cn(
                  "grid h-9 flex-1 place-items-center rounded-lg text-sm transition-colors",
                  isStart || isEnd
                    ? "bg-primary font-medium text-primary-foreground"
                    : inBetween
                      ? "text-foreground hover:bg-primary/25"
                      : "text-foreground hover:bg-accent"
                )}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
