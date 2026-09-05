import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useApp } from "@/lib/store";
import { PROVIDER_PRESETS, applyPreset } from "@/lib/modelConfig";
import { QUESTIONS, type OptionValue } from "@/lib/onboardingQuestions";
import type { UserProfile } from "@/types";

export function Onboarding() {
  const { updateProfile, completeOnboarding, modelConfig, setModelConfig } = useApp();
  const [answers, setAnswers] = useState<Record<number, OptionValue>>({});
  const [done, setDone] = useState(false);

  const allAnswered = QUESTIONS.every((_, i) => answers[i] != null);

  function pick(questionIdx: number, value: OptionValue) {
    setAnswers((a) => ({ ...a, [questionIdx]: value }));
  }

  function submit() {
    let profile: UserProfile = {
      heightCm: 170,
      weightKg: 65,
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
    QUESTIONS.forEach((q, i) => {
      if (answers[i] != null) profile = { ...profile, ...q.apply(profile, answers[i]) };
    });
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
        <div className="fixed right-4 top-4 z-10">
          <LanguageToggle />
        </div>
        <div className="w-full max-w-md text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="font-display mt-6 text-2xl font-semibold text-foreground">
            {t("個人消費檔案已建立")}
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            {t("我們會利用這些資訊，降低「購買量 ≠ 實際攝取量」造成的誤判——例如幫別人代買的餐點、 囤積的飲料，都不會被直接當成你實際吃掉的量。")}
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link to="/" onClick={completeOnboarding}>
                {t("開始建立每月飲食分析")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-10">
      <div className="fixed right-4 top-4 z-10">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-lg">
        {/* 分析引擎選擇（第一頁就能設定） */}
        <div className="mb-6 rounded-2xl border border-border/70 bg-card p-5 soft-shadow">
          <p className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            <Cpu className="h-3.5 w-3.5" /> {t("分析引擎")}
          </p>
          <h2 className="font-display mt-1 text-base font-semibold text-foreground">
            {t("用哪個引擎推估「實際食用量」？")}
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
                    <span className="block font-medium">{t(p.label)}</span>
                    <span
                      className={cn(
                        "mt-0.5 block text-xs",
                        active ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {t(p.description)}
                    </span>
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("模型：")}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{modelConfig.model}</code>
            <span className="px-1">·</span>
            <span className="font-mono text-[11px]">{modelConfig.baseUrl}</span>
          </p>
        </div>

        <div className="space-y-4">
          {QUESTIONS.map((q, i) => (
            <div key={i} className="rounded-2xl border border-border/70 bg-card p-8 soft-shadow">
              <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                {q.title}
              </p>
              <h2 className="font-display mt-3 text-xl font-semibold leading-snug text-foreground">
                {q.question}
              </h2>

              {q.type === "number" ? (
                <div className="mt-6 flex items-center gap-2">
                  <Input
                    type="number"
                    min={q.numberMeta?.min}
                    max={q.numberMeta?.max}
                    placeholder={q.numberMeta?.placeholder}
                    value={answers[i] != null ? String(answers[i]) : ""}
                    onChange={(e) => {
                      const n = e.target.valueAsNumber;
                      if (Number.isFinite(n)) pick(i, n);
                      else
                        setAnswers((a) => {
                          const next = { ...a };
                          delete next[i];
                          return next;
                        });
                    }}
                    className="h-11 text-base"
                  />
                  {q.numberMeta?.unit && (
                    <span className="text-sm text-muted-foreground">{q.numberMeta.unit}</span>
                  )}
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-2.5">
                  {q.options?.map((opt) => {
                    const selected = answers[i] === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        onClick={() => pick(i, opt.value)}
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
              )}
            </div>
          ))}
        </div>

        <div className="mt-6">
          <Button size="lg" className="w-full" onClick={submit} disabled={!allAnswered}>
            {t("送出")}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("這些資料只用來校正「購買與實際攝取」的落差，不會用於疾病判斷。")}
        </p>
      </div>
    </div>
  );
}
