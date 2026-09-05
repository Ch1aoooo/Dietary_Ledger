import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { QUESTIONS } from "@/lib/onboardingQuestions";

/**
 * 這一頁跟 Onboarding 共用同一份 QUESTIONS（見 lib/onboardingQuestions.ts）
 * ——不是另外寫一份「編輯個人資料」的欄位/選項，不然兩邊遲早會兜不起來。
 * Onboarding 是一次性問卷（答案先存在本地 state，送出時才整包套用），這裡
 * 是隨時可編輯的表單：每個欄位目前的值直接從 q.getValue(profile) 讀，
 * 改動立刻用 q.apply() 呼叫 updateProfile()，不需要「編輯 / 儲存」兩階段。
 */
export function DietaryProfile() {
  const { profile, updateProfile } = useApp();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          {t("個人飲食檔案")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("這些設定用來校正「購買量 ≠ 實際攝取量」的落差，隨時可以調整，AI 分析時會參考這裡的內容。")}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          {QUESTIONS.map((q) => {
            const current = q.getValue(profile);
            return (
              <div key={q.id} className="space-y-1.5">
                <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                  {q.title}
                </p>
                <Label>{q.question}</Label>
                {q.type === "number" ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={q.numberMeta?.min}
                      max={q.numberMeta?.max}
                      value={String(current)}
                      onChange={(e) => {
                        const n = e.target.valueAsNumber;
                        if (Number.isFinite(n)) updateProfile(q.apply(profile, n));
                      }}
                    />
                    {q.numberMeta?.unit && (
                      <span className="text-sm text-muted-foreground">{q.numberMeta.unit}</span>
                    )}
                  </div>
                ) : (
                  <Select
                    value={String(current)}
                    onValueChange={(v) => {
                      const opt = q.options?.find((o) => String(o.value) === v);
                      if (opt) updateProfile(q.apply(profile, opt.value));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {q.options?.map((opt) => (
                        <SelectItem key={String(opt.value)} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
