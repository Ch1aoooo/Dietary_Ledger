import { useState } from "react";
import { CalendarRange, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateRangeCalendar } from "@/components/ui/date-range-calendar";
import { formatRangeLabel, type DateRange } from "@/lib/dateRange";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

/**
 * 日期範圍選取器：按鈕顯示目前範圍，點下去開一個對話框讓使用者用日曆點
 * 「開始日期」再點「結束日期」。刻意用 Dialog（跟 AddManualEntryDialog
 * 同一套）而不是浮動 popover——這個專案還沒有 Popover 元件，Dialog 已經
 * 有現成的遮罩/焦點/Esc 處理，不用另外加套件或自己刻定位邏輯。
 *
 * 這個元件本身不管「範圍要怎麼用」或「存在哪裡」——value/onChange 完全由
 * 呼叫端決定，所以 Overview / Transactions 兩個頁面即使都用同一顆元件，
 * 選取的範圍也完全獨立、不會互相影響（各頁面自己的範圍狀態實際存在
 * lib/store.tsx 的 dateRanges，見那裡的說明）。
 *
 * 旁邊的「全部」按鈕：isAllSelected/onSelectAll 是選用的——不是每個用到
 * 這顆元件的地方都需要「回到全部資料」這個快捷方式，沒傳就不顯示。
 */
export function DateRangePicker({
  value,
  onChange,
  isAllSelected,
  onSelectAll,
  className,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  isAllSelected?: boolean;
  onSelectAll?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<string | null>(value.start);
  const [draftEnd, setDraftEnd] = useState<string | null>(value.end);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // 每次重新打開都用目前已套用的範圍當起點，不要延續上次沒選完就
      // 關掉視窗留下的殘值。
      setDraftStart(value.start);
      setDraftEnd(value.end);
    }
  }

  function pickDay(iso: string) {
    // 還沒選、或上次已經選完一組範圍——這次點擊代表「重新開始選」。
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(iso);
      setDraftEnd(null);
      return;
    }
    // 已經有 start，這次點的當作 end；點的日期比 start 早就自動對調，
    // 使用者不用在意先點開頭還是結尾。
    const start = iso < draftStart ? iso : draftStart;
    const end = iso < draftStart ? draftStart : iso;
    setDraftStart(start);
    setDraftEnd(end);
    onChange({ start, end });
    setOpen(false);
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <button
          onClick={() => handleOpenChange(true)}
          className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-4 py-2 text-sm font-medium text-foreground soft-shadow transition-colors hover:bg-accent"
        >
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          {formatRangeLabel(value)}
        </button>

        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("選擇日期範圍")}</DialogTitle>
            <DialogDescription>
              {draftStart && draftEnd
                ? t("點選任一天可以重新選取範圍。")
                : draftStart
                  ? t("已選開始日期 {d}，請點選結束日期。", { d: draftStart })
                  : t("先點選開始日期，再點選結束日期。")}
            </DialogDescription>
          </DialogHeader>
          <DateRangeCalendar
            rangeStart={draftStart}
            rangeEnd={draftEnd}
            onPick={pickDay}
            initialMonth={draftStart ?? value.start}
          />
        </DialogContent>
      </Dialog>

      {onSelectAll && (
        <Button
          variant={isAllSelected ? "soft" : "outline"}
          size="sm"
          onClick={onSelectAll}
          title={t("涵蓋所有資料的日期範圍")}
          className="gap-1.5"
        >
          <Layers className="h-3.5 w-3.5" />
          {t("全部")}
        </Button>
      )}
    </div>
  );
}
