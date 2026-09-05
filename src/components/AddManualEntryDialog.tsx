import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * 載具發票只涵蓋「有開發票的購買」，涵蓋不到自己煮的、朋友請的、公司提供
 * 的這些沒有發票的食物——右下角這個「+」讓使用者補記這些漏掉的食物。
 * 刻意只留三個欄位（日期／品名／實際吃了多少+單位）：使用者是直接回報
 * 「吃了多少」，不像發票那樣有「購買量 vs 食用量」的落差要推估，所以
 * 不需要 Onboarding 那些購買習慣問題；分類（category）仍交給 AI，跟
 * 發票來源共用同一套 pipeline（見 utils/modelPipeline.ts）。
 */
export function AddManualEntryDialog() {
  const { addManualEntry } = useApp();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today());
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("");

  function reset() {
    setDate(today());
    setItemName("");
    setAmount("");
    setUnit("");
  }

  const amountNum = parseFloat(amount);
  const canSubmit =
    date.trim() !== "" &&
    itemName.trim() !== "" &&
    unit.trim() !== "" &&
    Number.isFinite(amountNum) &&
    amountNum > 0;

  function submit() {
    if (!canSubmit) return;
    addManualEntry({
      date,
      itemName: itemName.trim(),
      amount: amountNum,
      unit: unit.trim(),
    });
    reset();
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <button
        onClick={() => setOpen(true)}
        title={t("手動記錄食物")}
        aria-label={t("手動記錄食物")}
        className="fixed bottom-6 right-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <Plus className="h-6 w-6" />
      </button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("手動記錄食物")}</DialogTitle>
          <DialogDescription>
            {t("發票涵蓋不到的食物（自己煮的、別人請的…）可以在這裡補記，一樣會納入飲食分析。")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("日期")}</Label>
            <Calendar value={date} onChange={setDate} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manual-item">{t("食物品項")}</Label>
            <Input
              id="manual-item"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder={t("例如：滷肉飯")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-amount">{t("實際食用份量")}</Label>
              <Input
                id="manual-amount"
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t("例如：1")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-unit">{t("單位")}</Label>
              <Input
                id="manual-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={t("例如：碗 / 份 / 杯")}
              />
            </div>
          </div>
        </div>

        <Button size="lg" className="w-full" onClick={submit} disabled={!canSubmit}>
          {t("送出")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
