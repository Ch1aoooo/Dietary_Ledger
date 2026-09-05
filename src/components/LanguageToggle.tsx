import { LANG, setLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * 中 / EN 語言切換膠囊。切換會寫進 localStorage 並整頁 reload（見
 * lib/i18n.ts 的 setLang）——所以這裡不需要任何狀態，直接讀模組常數 LANG
 * 決定哪一邊是 active。
 */
export function LanguageToggle() {
  const isZh = LANG === "zh";
  return (
    <div
      role="group"
      aria-label={isZh ? "切換語言" : "Switch language"}
      className="flex items-center rounded-full border border-border/60 bg-muted/40 p-0.5 text-xs font-medium"
    >
      <button
        type="button"
        onClick={() => !isZh && setLang("zh")}
        aria-pressed={isZh}
        className={cn(
          "rounded-full px-2.5 py-1 transition-colors",
          isZh ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        中文
      </button>
      <button
        type="button"
        onClick={() => isZh && setLang("en")}
        aria-pressed={!isZh}
        className={cn(
          "rounded-full px-2.5 py-1 transition-colors",
          !isZh ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </button>
    </div>
  );
}
