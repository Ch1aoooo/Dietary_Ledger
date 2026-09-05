import { RotateCcw, Info, Cpu, Loader2, Check, TriangleAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { PROVIDER_PRESETS, applyPreset } from "@/lib/modelConfig";

export function Settings() {
  const { resetAll, modelConfig, setModelConfig, modelStatus, retryAnalysis } = useApp();
  // 沒有離線規則引擎當備援，只剩「進行中／完成／失敗」三種狀態。
  const engineStatus =
    modelStatus === "loading"
      ? { label: "正在呼叫模型…", cls: "border-warning/30 bg-warning/10 text-[#9a5b00]", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> }
      : modelStatus === "error"
        ? { label: "AI 分析失敗，部分或全部紀錄未完成分析", cls: "border-destructive/30 bg-destructive/10 text-destructive", icon: <TriangleAlert className="h-3.5 w-3.5" /> }
        : { label: "已用 AI 引擎完成分析", cls: "border-tealink/25 bg-tealink/10 text-tealink", icon: <Check className="h-3.5 w-3.5" /> };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理你的資料與個人 Profile。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-tealink" /> Analysis engine
          </CardTitle>
          <CardDescription>
            選擇用來推估「實際食用量」的模型引擎。改動後會重新分析並更新 Dashboard。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-2">
            <span
              className={"flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium " + engineStatus.cls}
            >
              {engineStatus.icon} {engineStatus.label}
            </span>
            {modelStatus === "error" && (
              <Button variant="outline" size="sm" onClick={retryAnalysis}>
                重試分析
              </Button>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {PROVIDER_PRESETS.map((p) => {
              const active = modelConfig.provider === p.provider;
              return (
                <button
                  key={p.provider}
                  onClick={() => setModelConfig(applyPreset(modelConfig, p))}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-accent"
                  )}
                >
                  <span className="block font-medium">{p.label}</span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xs",
                      active ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {p.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="baseUrl">Base URL（OpenAI 相容）</Label>
              <Input
                id="baseUrl"
                value={modelConfig.baseUrl}
                placeholder="http://10.113.43.4:9000/v1"
                onChange={(e) => setModelConfig({ baseUrl: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">模型名稱</Label>
              <Input
                id="model"
                value={modelConfig.model}
                placeholder="dsv4-flash"
                onChange={(e) => setModelConfig({ model: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apiKey">API Key{modelConfig.provider === "local" ? "（本地可留空）" : ""}</Label>
              <Input
                id="apiKey"
                type="password"
                value={modelConfig.apiKey}
                placeholder={modelConfig.provider === "local" ? "無需 key" : "sk-..."}
                onChange={(e) => setModelConfig({ apiKey: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4 text-tealink" /> About this demo
          </CardTitle>
          <CardDescription>
            食溯 Dietary Ledger · Personalized Consumption Attribution Engine
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          <p>
            這是一個黑客松 Demo。前端負責 CSV 解析與渲染；{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">backend/</code>{" "}
            是一個薄 FastAPI 代理，負責把「選定模型的請求」轉發到本地/內網
            DeepSeek 或 OpenAI，解決瀏覽器跨域與 API key 外洩問題。食品分類與
            攝取量推估完全由 AI 完成，沒有離線規則引擎當備援——呼叫失敗時該筆會
            標記為「分析失敗」，可以在上方按「重試分析」，或確認這裡的模型設定
            後再試一次。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-warning" /> Data
          </CardTitle>
          <CardDescription>清除所有上傳資料與個人 Profile，回到初始狀態。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              onClick={() => {
                resetAll();
                window.location.reload();
              }}
            >
              <RotateCcw className="h-4 w-4" /> 重設所有資料
            </Button>
            <span className="text-xs text-muted-foreground">
              會清除你上傳的 CSV 與所有確認紀錄
            </span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <p className="text-center text-xs text-muted-foreground">
        此產品不提供醫療診斷。所有飲食資訊皆為補充性參考。
      </p>
    </div>
  );
}
