import { CalendarDays, CircleDot, Cpu, Loader2, TriangleAlert } from "lucide-react";
import { useApp } from "@/lib/store";

const PERIOD_LABEL = "August 2026";

export function Header() {
  const { hasUploaded, period, modelStatus, modelConfig } = useApp();
  // 沒有離線規則引擎當備援——只剩「進行中／完成／失敗」三種狀態。
  const engine = (() => {
    if (modelStatus === "loading") {
      return { label: "AI 分析中…", cls: "border-warning/30 bg-warning/10 text-[#9a5b00]", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> };
    }
    if (modelStatus === "error") {
      return { label: "AI 分析失敗", cls: "border-destructive/30 bg-destructive/10 text-destructive", icon: <TriangleAlert className="h-3.5 w-3.5" /> };
    }
    return { label: `AI 引擎 · ${modelConfig.model}`, cls: "border-tealink/25 bg-tealink/10 text-tealink", icon: <Cpu className="h-3.5 w-3.5" /> };
  })();
  const engineTip =
    modelStatus === "error"
      ? "有紀錄分析失敗（連不上模型、逾時，或回應不完整）。去 Settings 確認模型設定後可以重試。"
      : modelConfig.baseUrl;

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-5 md:px-10">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        <span className="hidden sm:inline">Current period:</span>
        <span className="font-medium text-foreground">{PERIOD_LABEL}</span>
        <span className="text-muted-foreground/50">·</span>
        <span className="font-mono text-xs text-muted-foreground">{period}</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          title={engineTip}
          className={"flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium " + engine.cls}
        >
          {engine.icon}
          {engine.label}
        </span>
        <span className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <CircleDot className="h-3.5 w-3.5" />
          {hasUploaded ? "Data · Uploaded" : "Data · 尚未上傳"}
        </span>
      </div>
    </header>
  );
}
