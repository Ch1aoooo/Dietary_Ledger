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
 * 單月網格日曆，點格子直接選日期（不是文字輸入 + 彈出視窗）。目前只有
 * 「手動記錄食物」用到，需求就是要讓使用者用點的選日期，特別是回頭補記
 * 前幾天吃的東西。
 */
export function Calendar({
  value,
  onChange,
  maxDate,
}: {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  /** 超過這天的格子會被 disable（YYYY-MM-DD，含當天）。 */
  maxDate?: string;
}) {
  const selectedDate = value ? parseISODate(value) : new Date();
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth()); // 0-based

  const today = toISODate(new Date());
  const max = maxDate ?? today;

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = firstOfMonth.getDay(); // 0=Sun
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

      <div className="grid grid-cols-7 gap-1 text-center text-2xs text-muted-foreground">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day == null) return <div key={`empty-${i}`} />;
          const iso = toISODate(new Date(viewYear, viewMonth, day));
          const selected = iso === value;
          const isToday = iso === today;
          const disabled = iso > max;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              className={cn(
                "grid h-9 place-items-center rounded-lg text-sm transition-colors",
                selected
                  ? "bg-primary text-primary-foreground font-medium"
                  : isToday
                    ? "border border-primary/50 text-foreground"
                    : "text-foreground hover:bg-accent",
                disabled && "cursor-not-allowed text-muted-foreground/40 hover:bg-transparent"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
