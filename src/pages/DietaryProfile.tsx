import { useMemo, useState } from "react";
import { Pencil, Sparkles, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/store";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import type { UserProfile } from "@/types";

const FREQ_LABEL = { rarely: "很少", sometimes: "偶爾", often: "經常" } as const;
const BUY_FREQ_LABEL = { almost_never: "幾乎不會", occasionally: "偶爾", often: "經常" } as const;

export function DietaryProfile() {
  const { transactions, profile, updateProfile } = useApp();
  const [editOpen, setEditOpen] = useState(false);

  const patterns = useMemo(() => computePatterns(transactions), [transactions]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Personal Dietary Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            這是「系統逐漸了解你」的頁面——不是健康統計，而是系統對你飲食行為的理解。
          </p>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit profile
        </Button>
      </div>

      {/* Consumption Habits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-tealink" /> Consumption Habits
          </CardTitle>
          <CardDescription>你建立的個人基礎設定</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Habit label="Typical meal serving" value={profile.typicalMealServings} unit="serving" />
            <Habit label="Typical drink serving" value={profile.typicalDrinkServings} unit="cup" />
            <Habit
              label="Bulk beverage purchase"
              value={FREQ_LABEL[profile.bulkPurchasing.beverage]}
            />
            <Habit label="Buy for others" value={BUY_FREQ_LABEL[profile.buysForOthers]} />
            <Habit label="Household size" value={profile.householdSize} unit={profile.householdSize > 1 ? "people" : "person"} />
            <Habit label="Bulk buying" value="見下方" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(Object.keys(profile.bulkPurchasing) as (keyof typeof profile.bulkPurchasing)[]).map((k) => (
              <div key={k} className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">{BULK_LABEL[k]}</p>
                <Badge variant="muted" className="mt-2">
                  {FREQ_LABEL[profile.bulkPurchasing[k]]}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Learned patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-tealink" /> Learned Personal Patterns
          </CardTitle>
          <CardDescription>從你的消費紀錄中學到的行為模式（可解釋推論）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {patterns.map((p, i) => (
            <div key={i} className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
              <p className="text-[15px] leading-snug text-foreground">
                <span className="mr-1.5 text-muted-foreground">•</span>
                {p.text}
              </p>
              <ConfidenceBadge value={p.confidence} className="shrink-0" />
            </div>
          ))}
          {patterns.length === 0 && (
            <p className="text-sm text-muted-foreground">目前資料不足，尚無法歸納個人模式。</p>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯個人資料</DialogTitle>
            <DialogDescription>這些資料用於校正購買與實際攝取的落差。</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto py-2">
            <Field label="通常與幾人一起生活">
              <Select
                value={String(profile.householdSize)}
                onValueChange={(v) => updateProfile({ householdSize: Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">自己住</SelectItem>
                  <SelectItem value="2">2 人</SelectItem>
                  <SelectItem value="3">3–4 人</SelectItem>
                  <SelectItem value="5">5 人以上</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="會幫其他人購買餐點或飲料嗎">
              <Select
                value={profile.buysForOthers}
                onValueChange={(v) => updateProfile({ buysForOthers: v as typeof profile.buysForOthers })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="almost_never">幾乎不會</SelectItem>
                  <SelectItem value="occasionally">偶爾</SelectItem>
                  <SelectItem value="often">經常</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="一餐通常吃幾份主餐">
              <Select value={String(profile.typicalMealServings)} onValueChange={(v) => updateProfile({ typicalMealServings: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3+</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="一次通常喝幾杯飲料">
              <Select value={String(profile.typicalDrinkServings)} onValueChange={(v) => updateProfile({ typicalDrinkServings: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3+</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {/*
              上面「Consumption Habits」那格 Bulk buying 寫著「見下方」，
              頁面下方也真的顯示了這 5 個類別各自的頻率——但編輯這些值
              的唯一入口，原本只有 Onboarding 流程；一旦 onboarding 完成，
              使用者除了 Settings 的「重設所有資料」（會清空全部資料）
              以外，完全沒有地方能單獨修正某一類的購買頻率。這裡補上跟
              Onboarding 一樣的 5 個選項，讓它們真的「可以在下方編輯」。
            */}
            {(Object.keys(profile.bulkPurchasing) as (keyof typeof profile.bulkPurchasing)[]).map(
              (k) => (
                <Field key={k} label={`是否常一次買多天份「${BULK_LABEL[k]}」`}>
                  <Select
                    value={profile.bulkPurchasing[k]}
                    onValueChange={(v) =>
                      updateProfile({
                        bulkPurchasing: {
                          ...profile.bulkPurchasing,
                          [k]: v as UserProfile["bulkPurchasing"][typeof k],
                        },
                      })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rarely">{FREQ_LABEL.rarely}</SelectItem>
                      <SelectItem value="sometimes">{FREQ_LABEL.sometimes}</SelectItem>
                      <SelectItem value="often">{FREQ_LABEL.often}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const BULK_LABEL: Record<string, string> = {
  beverage: "飲料",
  frozen: "冷凍食品",
  snacks: "零食",
  bakery: "麵包",
  readyMeal: "即食餐點",
};

function Habit({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
      <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold text-foreground">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

interface LearnedPattern {
  text: string;
  confidence: number;
}

function computePatterns(transactions: ReturnType<typeof useApp>["transactions"]): LearnedPattern[] {
  const foods = transactions.filter((t) => t.food.isFood);
  const patterns: LearnedPattern[] = [];
  if (!foods.length) return patterns;

  // 多人共享：大量現做飲料（鮮食）購買中，推估少於購買量的比例
  const bulkFreshDrinks = foods.filter(
    (t) =>
      (t.food.category === "Sugary beverages" || t.food.category === "Coffee") &&
      t.food.shelfLife === "very short" &&
      t.purchasedQty >= 3
  );
  if (bulkFreshDrinks.length >= 2) {
    const shared = bulkFreshDrinks.filter((t) => (t.inference?.estimatedSelfConsumed ?? 0) < t.purchasedQty).length;
    patterns.push({
      text: `當你一次購買 3 杯以上現做飲料時，過去 ${Math.round((shared / bulkFreshDrinks.length) * 100)}% 的紀錄被判斷為多人共享。`,
      confidence: Math.round((shared / bulkFreshDrinks.length) * 100),
    });
  }

  // 自己囤貨：可久放罐裝飲料大量購買時，幾乎都視為本人分批食用
  const stocked = foods.filter(
    (t) => t.food.category === "Sugary beverages" && t.food.stockable && t.purchasedQty > 1
  );
  if (stocked.length >= 2) {
    const self = stocked.filter((t) => (t.inference?.estimatedSelfConsumed ?? 0) >= t.purchasedQty).length;
    patterns.push({
      text: "大量購買罐裝飲料時，通常被判定為自己囤貨、分批飲用，而非多人分食。",
      confidence: Math.round((self / stocked.length) * 100),
    });
  }

  // 即食主餐大量購買
  const readyBulk = foods.filter((t) => t.food.category === "Prepared meals" && t.purchasedQty > 2);
  if (readyBulk.length >= 2) {
    const low = readyBulk.filter((t) => (t.inference?.estimatedSelfConsumed ?? 0) <= 2).length;
    patterns.push({
      text: "即食主餐大量購買時，通常只有 1–2 份被判斷屬於本人，其餘可能屬代購或共享。",
      confidence: Math.round((low / readyBulk.length) * 100),
    });
  }

  return patterns;
}
