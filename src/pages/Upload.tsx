import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  FileSpreadsheet,
  Check,
  ArrowRight,
  ShieldCheck,
  CalendarDays,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { parseEInvoiceCSV, looksLikeInvoiceCsv } from "@/utils/einvoiceParser";
import { detectAdjustment } from "@/utils/processing";

type Phase = "drop" | "preview" | "processing" | "done";

const PROCESSING_STEPS = [
  "解析電子發票",
  "清理商品紀錄",
  "送交 AI 理解食品內容",
  "推估個人實際攝取",
  "計算信心分數",
  "更新飲食 Profile",
];

interface Preview {
  invoices: number;
  records: number;
  /** 會送去給 AI 判斷的列數（排除折扣/出清/異常數量列——這些不需要 AI 判斷）。 */
  toAnalyze: number;
  /** 折扣/出清/異常數量列數，這些會直接跳過分析。 */
  skipped: number;
}

export function Upload() {
  const { applyUploadText, period, reviews } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("drop");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [step, setStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);

  function handleText(text: string) {
    setError(null);
    if (!looksLikeInvoiceCsv(text)) {
      setError("無法辨識為電子發票 CSV 格式，請確認是從財政部載具平台匯出的檔案。");
      setPhase("drop");
      return;
    }
    const rows = parseEInvoiceCSV(text);
    const invoices = new Set(rows.map((r) => r.invoiceNo).filter(Boolean)).size;
    // 這裡還不知道哪些是食品——那要交給 AI 判斷，上傳前只能先看有多少列
    // 「會被送去分析」（排除折扣/出清列跟數量異常的列，這兩種不需要 AI）。
    let toAnalyze = 0,
      skipped = 0;
    for (const r of rows) {
      const amount = parseFloat(r.amount) || 0;
      const qty = parseFloat(r.qty) || 0;
      if (detectAdjustment(r.itemName, amount) || qty <= 0.9) skipped++;
      else toAnalyze++;
    }
    setPreview({ invoices, records: rows.length, toAnalyze, skipped });
    setPendingText(text);
    setPhase("preview");
  }

  function onFile(file: File) {
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      setError("目前 demo 支援 CSV 格式；XLSX 轉檔支援即將開放。請匯出為 CSV 後再上傳。");
      setPhase("drop");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => handleText(String(reader.result ?? ""));
    reader.readAsText(file, "utf-8");
  }

  function startAnalysis() {
    if (pendingText) applyUploadText(pendingText);
    setPhase("processing");
    setStep(0);
  }

  useEffect(() => {
    if (phase !== "processing") return;
    if (step >= PROCESSING_STEPS.length) {
      setPhase("done");
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 600 : 430);
    return () => clearTimeout(t);
  }, [phase, step]);

  const periodLabel = "August 2026";
  const needReviewCount = reviews.filter((r) => r.confirmed == null).length;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Hero */}
      <div className="py-6 text-center md:py-10">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
          讓你的消費紀錄，成為長期健康資料的一部分
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          上傳電子發票載具紀錄，將日常食品消費轉換為個人化飲食 Profile，
          協助你與醫療人員更完整地了解長期飲食行為。
        </p>
      </div>

      {phase === "drop" && (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card px-6 py-16 text-center transition-colors soft-shadow",
              dragOver ? "border-primary bg-accent/60" : "border-border hover:border-primary/50"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white">
              <UploadCloud className="h-7 w-7" />
            </div>
            <h2 className="font-display mt-5 text-lg font-semibold text-foreground">
              上傳電子發票 CSV / Excel
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              拖曳檔案到此處，或點擊選擇檔案
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5" /> 支援 CSV / XLSX
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> 資料僅在本機分析
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> 每月新增一次
              </span>
              <span className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> 購買 ≠ 實際攝取
              </span>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-[#9a5b00]">
              {error}
            </p>
          )}

          <div className="mt-5 text-center">
            <Button variant="ghost" onClick={() => handleText(sampleText())}>
              沒有檔案？載入範例資料試試
            </Button>
          </div>
        </>
      )}

      {phase === "preview" && preview && (
        <Card className="p-7">
          <h3 className="font-display text-lg font-semibold text-foreground">本月讀取</h3>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat v={preview.invoices} l="張發票" />
            <Stat v={preview.records} l="筆商品紀錄" />
            <Stat v={preview.toAnalyze} l="將送交 AI 分析" accent />
            <Stat v={preview.skipped} l="折扣/異常列（略過）" />
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setPhase("drop")}>
              重新上傳
            </Button>
            <Button size="lg" onClick={startAnalysis} className="gap-2">
              <Sparkles className="h-4 w-4" /> 開始分析
            </Button>
          </div>
        </Card>
      )}

      {phase === "processing" && (
        <Card className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">正在分析</h3>
              <p className="text-sm text-muted-foreground">AI 正在理解你的消費紀錄</p>
            </div>
            <Sparkles className="h-5 w-5 animate-pulse text-tealink" />
          </div>
          <Progress value={(step / PROCESSING_STEPS.length) * 100} className="h-2.5" />
          <ul className="mt-6 space-y-2.5">
            {PROCESSING_STEPS.map((s, i) => (
              <li
                key={s}
                className={cn(
                  "flex items-center gap-3 text-sm transition-opacity",
                  i >= step && "opacity-30"
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full text-xs",
                    i < step
                      ? "bg-confirmed/15 text-confirmed"
                      : i === step
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {phase === "done" && preview && (
        <Card className="p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-confirmed/15 text-confirmed">
            <Check className="h-7 w-7" />
          </div>
          <h3 className="font-display mt-5 text-2xl font-semibold text-foreground">
            {periodLabel} 分析完成
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            AI 正在背景為這些紀錄做食品分類與個人化消費歸因，完成後即可在本月分析看到結果。
          </p>
          {/*
            這幾個數字原本是寫死的「- 3」「3 筆」，且沿用上傳前用離線規則
            引擎算出的「食品紀錄」數。現在食品分類完全交給 AI、而且是非同步
            的，這個畫面出現時 AI 通常還在跑，沒辦法誠實地在這裡宣稱
            「已完成」或報出食品筆數——只顯示上傳當下就確定的結構性數字
            （總筆數／會送去分析／略過的折扣列），真正的分析結果與低信心
            清單留給 reviews 狀態自己更新。
          */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat v={preview.records} l="商品紀錄" />
            <Stat v={preview.toAnalyze} l="送交 AI 分析" accent />
            <Stat v={preview.skipped} l="折扣/異常列（略過）" />
          </div>
          {needReviewCount > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              目前已有 <span className="font-semibold text-warning">{needReviewCount} 筆</span> 低信心紀錄建議你確認
            </p>
          )}
          <div className="mt-7">
            <Button size="lg" asChild className="gap-2">
              <Link to="/">
                查看本月分析 <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

/** demo 用：直接吃內建的範例 CSV（192 筆真實格式） */
function sampleText(): string {
  return sampleCsvRaw as string;
}

import sampleCsv from "@/data/sampleInvoice.csv?raw";
const sampleCsvRaw = sampleCsv as string;

function Stat({ v, l, accent }: { v: number; l: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/60 p-4 text-center">
      <p className={cn("font-display text-2xl font-semibold", accent ? "text-tealink" : "text-foreground")}>
        {v}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{l}</p>
    </div>
  );
}
