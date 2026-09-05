import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { PROVIDER_PRESETS, applyPreset } from "@/lib/modelConfig";
import type { UserProfile } from "@/types";

type Option<V = unknown> = { label: string; value: V; sub?: string };

interface StepConfig {
  title: string;
  question: string;
  options: Option[];
  apply: (profile: UserProfile, value: unknown) => Partial<UserProfile>;
}

const STEPS: StepConfig[] = [
  {
    title: "Living situation",
    question: "你目前通常與幾人一起生活？",
    options: [
      { label: "自己住", value: 1 },
      { label: "2 人", value: 2 },
      { label: "3–4 人", value: 3 },
      { label: "5 人以上", value: 5 },
    ],
    apply: (p, v) => ({ householdSize: v as number }),
  },
  {
    title: "Shopping behavior",
    question: "你平常會幫其他人購買餐點或飲料嗎？",
    options: [
      { label: "幾乎不會", value: "almost_never" },
      { label: "偶爾", value: "occasionally" },
      { label: "經常", value: "often" },
    ],
    apply: (p, v) => ({ buysForOthers: v as UserProfile["buysForOthers"] }),
  },
  {
    title: "Meal serving",
    question: "一般情況下，一餐你通常會吃幾份主餐？",
    options: [{ label: "1", value: 1 }, { label: "2", value: 2 }, { label: "3+", value: 3 }],
    apply: (p, v) => ({ typicalMealServings: v as number }),
  },
  {
    title: "Drink serving",
    question: "一般情況下，一次通常會喝幾杯飲料？",
    options: [{ label: "1", value: 1 }, { label: "2", value: 2 }, { label: "3+", value: 3 }],
    apply: (p, v) => ({ typicalDrinkServings: v as number }),
  },
  {
    title: "Bulk buying",
    question: "你平常是否會一次購買多天份食品？（每個項目選擇頻率）",
    options: [
      { label: "很少", value: "rarely" },
      { label: "偶爾", value: "sometimes" },
      { label: "經常", value: "often" },
    ],
    apply: (p, v) => ({
      bulkPurchasing: { ...p.bulkPurchasing, [currentBulkKey]: v },
    }),
  },
];

const BULK_KEYS: { key: keyof UserProfile["bulkPurchasing"]; label: string }[] = [
  { key: "beverage", label: "飲料" },
  { key: "frozen", label: "冷凍食品" },
  { key: "snacks", label: "零食" },
  { key: "bakery", label: "麵包" },
  { key: "readyMeal", label: "即食餐點" },
];

let currentBulkKey: keyof UserProfile["bulkPurchasing"] = "beverage";

export function Onboarding() {
  const { updateProfile, completeOnboarding, modelConfig, setModelConfig } = useApp();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [bulkIndex, setBulkIndex] = useState(0);
  const [done, setDone] = useState(false);

  const isBulk = step === STEPS.length - 1;
  const effectiveStep = isBulk ? step + bulkIndex : step;
  currentBulkKey = isBulk ? BULK_KEYS[bulkIndex].key : "beverage";
  const totalVisualSteps = STEPS.length - 1 + BULK_KEYS.length;

  function pick(stepIdx: number, value: unknown) {
    setAnswers((a) => ({ ...a, [stepIdx]: value }));
  }

  function next() {
    if (isBulk) {
      if (bulkIndex < BULK_KEYS.length - 1) {
        setBulkIndex(bulkIndex + 1);
        return;
      }
      finish();
      return;
    }
    setStep(step + 1);
  }

  function back() {
    if (isBulk) {
      if (bulkIndex > 0) {
        setBulkIndex(bulkIndex - 1);
        return;
      }
    }
    setStep(step - 1 >= 0 ? step - 1 : 0);
  }

  function finish() {
    let profile: UserProfile = {
      householdSize: 1,
      buysForOthers: "occasionally",
      typicalMealServings: 1,
      typicalDrinkServings: 1,
      bulkPurchasing: {
        beverage: "rarely",
        frozen: "rarely",
        snacks: "rarely",
        bakery: "rarely",
        readyMeal: "rarely",
      },
      onboarded: false,
    };
    for (let i = 0; i < STEPS.length - 1; i++) {
      if (answers[i] != null) profile = { ...profile, ...STEPS[i].apply(profile, answers[i]) };
    }
    // bulk answers keyed by effective step (last-1 ..)
    for (let b = 0; b < BULK_KEYS.length; b++) {
      currentBulkKey = BULK_KEYS[b].key;
      const v = answers[STEPS.length - 1 + b];
      if (v != null) profile = { ...profile, ...STEPS[STEPS.length - 1].apply(profile, v) };
    }
    updateProfile(profile);
    // 注意：這裡故意先不呼叫 completeOnboarding()。App.tsx 的 "/onboarding"
    // 路由是 `profile.onboarded ? <Navigate to="/" /> : <Onboarding />`——
    // 如果在這裡就把 onboarded 設成 true，會跟下面 setDone(true) 落在同一次
    // React batch 裡，路由那個三元運算會直接把 <Onboarding/> 換成
    // <Navigate/>，元件被整個卸載，剛設好的 done=true 根本沒機會渲染，
    // 「完成」畫面永遠看不到。改成使用者在完成畫面按下按鈕、真的要離開
    // /onboarding 時才切換 onboarded。
    setDone(true);
  }

  if (done) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="font-display mt-6 text-2xl font-semibold text-foreground">
            Personal Consumption Profile 已建立
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            我們會利用這些資訊，降低「購買量 ≠ 實際攝取量」造成的誤判——例如幫別人代買的餐點、
            囤積的飲料，都不會被直接當成你實際吃掉的量。
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link to="/" onClick={completeOnboarding}>
                開始建立每月飲食分析 <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const cfg = isBulk ? { ...STEPS[step], question: BULK_KEYS[bulkIndex].label } : STEPS[step];
  const answerKey = isBulk ? STEPS.length - 1 + bulkIndex : step;

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-10">
      <div className="w-full max-w-lg">
        {/* 分析引擎選擇（第一頁就能設定） */}
        <div className="mb-6 rounded-2xl border border-border/70 bg-card p-5 soft-shadow">
          <p className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            <Cpu className="h-3.5 w-3.5" /> Analysis engine
          </p>
          <h2 className="font-display mt-1 text-base font-semibold text-foreground">
            用哪個引擎推估「實際食用量」？
          </h2>
          <div className="mt-3 grid gap-2">
            {PROVIDER_PRESETS.map((p) => {
              const active = modelConfig.provider === p.provider;
              return (
                <button
                  key={p.provider}
                  onClick={() => setModelConfig(applyPreset(modelConfig, p))}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-accent"
                  )}
                >
                  <span>
                    <span className="block font-medium">{p.label}</span>
                    <span
                      className={cn(
                        "mt-0.5 block text-xs",
                        active ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {p.description}
                    </span>
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            模型：
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{modelConfig.model}</code>
            <span className="px-1">·</span>
            <span className="font-mono text-[11px]">{modelConfig.baseUrl}</span>
          </p>
        </div>

        <div className="mb-8 flex items-center gap-1.5">
          {Array.from({ length: totalVisualSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i < effectiveStep ? "bg-primary" : i === effectiveStep ? "bg-tealink" : "bg-border"
              )}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-8 soft-shadow">
          <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            {isBulk ? `Bulk buying · ${bulkIndex + 1}/${BULK_KEYS.length}` : cfg.title}
          </p>
          <h2 className="font-display mt-3 min-h-[3.5rem] text-xl font-semibold leading-snug text-foreground">
            {isBulk ? `是否常一次購買多天份「${cfg.question}」？` : cfg.question}
          </h2>

          <div className={cn("mt-6 grid gap-2.5", !isBulk && "grid-cols-1")}>
            {cfg.options.map((opt) => {
              const selected = answers[answerKey] === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  onClick={() => pick(answerKey, opt.value)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-accent"
                  )}
                >
                  {opt.label}
                  {selected && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={back} disabled={effectiveStep === 0}>
              <ArrowLeft className="h-4 w-4" /> 上一步
            </Button>
            <Button onClick={next} disabled={answers[answerKey] == null}>
              下一步 <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          這些資料只用來校正「購買與實際攝取」的落差，不會用於疾病判斷。
        </p>
      </div>
    </div>
  );
}
