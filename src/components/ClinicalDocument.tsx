import { FileText, Sparkles } from "lucide-react";
import type { ClinicalSummary, DietaryAnalysis } from "@/types";
import { CATEGORY_COLORS, categoryLabel } from "@/lib/colors";
import { t } from "@/lib/i18n";
import { FoodCategoryChart } from "@/components/FoodCategoryChart";
import { WeeklyTrendChart } from "@/components/WeeklyTrendChart";

/**
 * 「Personal Dietary History Summary」文件卡片——原本是獨立的 Clinical
 * Summary 頁面，現在改成 Overview 頁面「下載」按鈕匯出 PDF 時渲染的來源
 * （見 pages/Dashboard.tsx），所以拆成獨立元件讓兩邊共用同一份排版。
 *
 * 版面比一般卡片緊湊（小字級、小間距）——這是給 pages/Dashboard.tsx 那個
 * 固定 A4 比例、overflow:hidden 的隱藏容器截圖用的來源，內容必須完整塞進
 * 單一 A4 頁（使用者明確要求「濃縮在單頁 A4 中，不要超過」）。但字級不能
 * 壓得比這裡再小：html2canvas 截圖出來的文字在字級太小、或用
 * `line-clamp`（底層是 `-webkit-line-clamp` + `display:-webkit-box`）
 * 這種多行截斷手法時，曾經整段文字直接消失／截圖不出來——這是
 * html2canvas 對這個 CSS 排版模型支援不完整的已知限制，不是螢幕上看起來
 * 那樣（螢幕本身是瀏覽器原生渲染，不會重現這個問題，必須實際跑一次
 * html2canvas 才看得出來）。所以這裡完全不用 line-clamp。
 *
 * 另一個 html2canvas 的坑：`truncate` 會帶 `overflow:hidden`，行高一緊就會
 * 把整行文字（連沒有下緣的字母也一起）截掉半截、甚至整段截不出來。所以
 * Meta 那格的值改成不截斷、`leading-normal` 自然換行（2 欄夠寬），字級用
 * `text-2xs`（跟同一格的 label 一樣，實測 11px 在 html2canvas 下正常）。
 */
export function ClinicalDocument({
  summary,
  analysis,
}: {
  summary: ClinicalSummary;
  analysis: DietaryAnalysis;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="border-b border-border/70 px-7 py-5">
        <div className="flex items-center gap-2 text-tealink">
          <FileText className="h-4 w-4" />
          <span className="text-xs font-medium tracking-[0.16em]">
            {t("個人飲食歷史摘要")}
          </span>
        </div>
        <h2 className="font-display mt-1.5 text-lg font-semibold leading-normal text-foreground">
          {summary.patient}
        </h2>
      </div>

      {/* Meta grid：2 欄而不是 4 欄，讓較長的說明文字有足夠寬度，不用截斷。 */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-border/70 px-7 py-3">
        <Meta k={t("對象")} v={summary.patient} />
        <Meta k={t("觀察期間")} v={summary.period} />
        <Meta k={t("資料來源")} v={t("電子發票紀錄")} />
        <Meta k={t("推估方法")} v={t("購買推估攝取量")} />
      </div>

      <div className="space-y-5 px-7 py-4">
        {/* Weekly frequency */}
        <Section title={t("飲食型態摘要")}>
          <div className="space-y-1.5">
            {summary.weeklyFrequency.map((w) => (
              <div key={w.category} className="flex items-center gap-3 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: CATEGORY_COLORS[w.category] ?? "#9aa7a2" }}
                />
                <span className="w-40 text-muted-foreground">{categoryLabel(w.category)}</span>
                <div className="h-px flex-1 bg-border" />
                <span className="font-medium text-foreground">
                  {w.timesPerWeek} <span className="text-muted-foreground">{t("次 / 週")}</span>
                </span>
              </div>
            ))}
            {summary.weeklyFrequency.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("本期間無食品紀錄。")}</p>
            )}
          </div>
        </Section>

        {/* Category breakdown + weekly trend — 原本 Longitudinal Trend 的位置，
            改放 Overview 頁面同一份資料算出的圓餅圖跟趨勢圖。 */}
        <Section title={t("分類佔比與每週趨勢")}>
          <div className="space-y-3">
            <FoodCategoryChart data={analysis.categories} compact />
            <WeeklyTrendChart data={analysis.weekly} height={135} animate={false} />
          </div>
        </Section>

        {/* AI Dietary Insights — 原本 Observed Patterns 的位置，改放
            Overview 頁面「AI Dietary Insights」卡片的同一份內容，排版改成
            2 欄節省空間，但文字完全不截斷——自然換行，讓多少字就顯示多少
            字（見上面元件開頭對 line-clamp 的說明）。 */}
        <Section title={t("AI 飲食洞察")}>
          {analysis.insights.length ? (
            <div className="grid grid-cols-2 gap-2">
              {analysis.insights.map((ins, i) => (
                <div
                  key={i}
                  className={
                    "rounded-lg border p-2 " +
                    (ins.tone === "watch"
                      ? "border-warning/25 bg-warning/5"
                      : "border-border/60 bg-muted/30")
                  }
                >
                  <p className="text-xs font-medium text-foreground">{ins.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {ins.body}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("此區間無足夠資料產生洞察。")}</p>
          )}
        </Section>
      </div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{k}</p>
      <p className="mt-0.5 text-2xs font-medium leading-normal text-foreground">{v}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
        {title === t("AI 飲食洞察") && <Sparkles className="h-3.5 w-3.5 text-tealink" />}
        {title}
      </h3>
      {children}
    </section>
  );
}
