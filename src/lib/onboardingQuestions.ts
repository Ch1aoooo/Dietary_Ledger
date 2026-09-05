import type { UserProfile } from "@/types";
import { t as tr } from "@/lib/i18n";

export type OptionValue = string | number;

export interface Option {
  label: string;
  value: OptionValue;
}

export interface QuestionConfig {
  /** 穩定 id（不是陣列 index），Dietary Profile 頁面拿來當 React key。 */
  id: string;
  title: string;
  question: string;
  type: "choice" | "number";
  /** type === "choice" 時使用。 */
  options?: Option[];
  /** type === "number" 時使用：input 的 placeholder 跟單位顯示。 */
  numberMeta?: { placeholder: string; unit: string; min?: number; max?: number };
  /** 從目前的 profile 讀出這一題對應的值——Dietary Profile 頁面編輯時拿來
   *  當表單控制項的目前值。 */
  getValue: (profile: UserProfile) => OptionValue;
  apply: (profile: UserProfile, value: OptionValue) => Partial<UserProfile>;
}

const BULK_KEYS: { key: keyof UserProfile["bulkPurchasing"]; label: string }[] = [
  { key: "beverage", label: tr("飲料") },
  { key: "frozen", label: tr("冷凍食品") },
  { key: "snacks", label: tr("零食") },
  { key: "bakery", label: tr("麵包") },
  { key: "readyMeal", label: tr("即食餐點") },
];

const BULK_OPTIONS: Option[] = [
  { label: tr("很少"), value: "rarely" },
  { label: tr("偶爾"), value: "sometimes" },
  { label: tr("經常"), value: "often" },
];

/**
 * Onboarding 問卷跟 Dietary Profile 編輯頁共用同一份問題定義——兩邊各自
 * 維護一份「問題文字 + 選項」遲早會兜不起來（改了一邊忘記改另一邊）。
 * 這裡是唯一的真相來源：pages/Onboarding.tsx 用它跑一次性問卷（一次性
 * 全部顯示、送出時套用），pages/DietaryProfile.tsx 用它畫成隨時可編輯
 * 的表單（每一題目前的值從 getValue() 讀，改動直接呼叫 apply() 套用）。
 */
export const QUESTIONS: QuestionConfig[] = [
  {
    id: "height",
    title: tr("身體數值"),
    question: tr("您的身高（公分）"),
    type: "number",
    numberMeta: { placeholder: tr("例如 170"), unit: tr("公分"), min: 100, max: 250 },
    getValue: (p) => p.heightCm,
    apply: (p, v) => ({ heightCm: v as number }),
  },
  {
    id: "weight",
    title: tr("身體數值"),
    question: tr("您的體重（公斤）"),
    type: "number",
    numberMeta: { placeholder: tr("例如 65"), unit: tr("公斤"), min: 20, max: 300 },
    getValue: (p) => p.weightKg,
    apply: (p, v) => ({ weightKg: v as number }),
  },
  {
    id: "household",
    title: tr("居住狀況"),
    question: tr("目前同住人數（包含您自己）"),
    type: "choice",
    options: [
      { label: tr("1 人"), value: 1 },
      { label: tr("2 人"), value: 2 },
      { label: tr("3–4 人"), value: 3 },
      { label: tr("5 人以上"), value: 5 },
    ],
    getValue: (p) => p.householdSize,
    apply: (p, v) => ({ householdSize: v as number }),
  },
  {
    id: "buysForOthers",
    title: tr("購物習慣"),
    question: tr("您購買的餐點或飲料，通常會包含其他人的份嗎？"),
    type: "choice",
    options: [
      { label: tr("幾乎都是自己食用"), value: "almost_never" },
      { label: tr("偶爾"), value: "occasionally" },
      { label: tr("經常"), value: "often" },
    ],
    getValue: (p) => p.buysForOthers,
    apply: (p, v) => ({ buysForOthers: v as UserProfile["buysForOthers"] }),
  },
  {
    id: "mealServing",
    title: tr("主餐份量"),
    question: tr("一般情況下，一餐通常會食用幾份主餐？"),
    type: "choice",
    options: [
      { label: tr("1 份"), value: 1 },
      { label: tr("2 份"), value: 2 },
      { label: tr("3 份以上"), value: 3 },
    ],
    getValue: (p) => p.typicalMealServings,
    apply: (p, v) => ({ typicalMealServings: v as number }),
  },
  {
    id: "drinkServing",
    title: tr("飲料份量"),
    question: tr("一般情況下，一次通常會飲用幾杯飲料？"),
    type: "choice",
    options: [
      { label: tr("1 杯"), value: 1 },
      { label: tr("2 杯"), value: 2 },
      { label: tr("3 杯以上"), value: 3 },
    ],
    getValue: (p) => p.typicalDrinkServings,
    apply: (p, v) => ({ typicalDrinkServings: v as number }),
  },
  ...BULK_KEYS.map(
    ({ key, label }): QuestionConfig => ({
      id: `bulk-${key}`,
      title: tr("大量採購 · {label}", { label }),
      question: tr("您是否會一次購買多天份的「{label}」，待不同時間、日期食用？", { label }),
      type: "choice",
      options: BULK_OPTIONS,
      getValue: (p) => p.bulkPurchasing[key],
      apply: (p, v) => ({
        bulkPurchasing: {
          ...p.bulkPurchasing,
          [key]: v as UserProfile["bulkPurchasing"][typeof key],
        },
      }),
    })
  ),
];
