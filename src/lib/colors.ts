import type { FoodCategory } from "@/types";
import { t } from "@/lib/i18n";

/** 各飲食類別的標示色（低飽和、和諧的醫療科技感） */
export const CATEGORY_COLORS: Record<string, string> = {
  "Prepared meals": "#3a7d6b",
  Coffee: "#7a6a4f",
  "Sugary beverages": "#c07f3a",
  Bakery: "#c9a34f",
  Desserts: "#b0656b",
  Dairy: "#6b8aa8",
  Protein: "#7a6aa0",
  Snacks: "#a87a4f",
};

export const ESTIMATED_LIGHT = "#5fb0a3";

/** 食品分類的中文顯示名稱。分類值本身（見 types/index.ts 的 FoodCategory）
 *  維持英文——那是 AI 後端回傳、也是各處當 key 用的內部識別字，只有「顯示
 *  給使用者看」時才透過這裡轉成中文。 */
export const CATEGORY_LABELS: Record<string, string> = {
  "Prepared meals": "調理食品",
  Coffee: "咖啡",
  "Sugary beverages": "含糖飲料",
  Bakery: "烘焙麵包",
  Desserts: "甜點",
  Dairy: "乳製品",
  Protein: "蛋白質",
  Snacks: "零食",
  "Non-food": "非食品",
};

export function categoryLabel(category: string): string {
  return t(CATEGORY_LABELS[category] ?? category);
}
