import { Download, FileText, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { buildClinicalSummary } from "@/lib/analytics";
import { CATEGORY_COLORS } from "@/lib/colors";

export function ClinicalSummary() {
  const { transactions, reviews, period, profile } = useApp();
  const summary = buildClinicalSummary(transactions, reviews, period, "Demo User");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Clinical View
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            供醫療人員參考的飲食暴露摘要——非診斷文件。
          </p>
        </div>
        <Button variant="outline" onClick={() => alert("Download summary (PDF) — demo placeholder")}>
          <Download className="h-4 w-4" /> Download Summary
        </Button>
      </div>

      {/* Document */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card soft-shadow">
        <div className="border-b border-border/70 px-8 py-7">
          <div className="flex items-center gap-2 text-tealink">
            <FileText className="h-4 w-4" />
            <span className="text-2xs font-medium uppercase tracking-[0.16em]">
              Personal Dietary History Summary
            </span>
          </div>
          <h2 className="font-display mt-2 text-xl font-semibold text-foreground">
            {summary.patient}
          </h2>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-border/70 px-8 py-6 sm:grid-cols-4">
          <Meta k="Patient" v={summary.patient} />
          <Meta k="Observation period" v={summary.period.replace("-", " ").toUpperCase()} />
          <Meta k="Data source" v="Electronic Invoice Purchase Records" />
          <Meta k="Method" v="Purchase-derived dietary exposure estimation" />
        </div>

        <div className="space-y-8 px-8 py-8">
          {/* Weekly frequency */}
          <Section title="Dietary Pattern Summary">
            <div className="space-y-2.5">
              {summary.weeklyFrequency.map((w) => (
                <div key={w.category} className="flex items-center gap-3 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: CATEGORY_COLORS[w.category] ?? "#9aa7a2" }}
                  />
                  <span className="w-44 text-muted-foreground">{w.category}</span>
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-medium text-foreground">
                    {w.timesPerWeek} <span className="text-2xs text-muted-foreground">times / week</span>
                  </span>
                </div>
              ))}
              {summary.weeklyFrequency.length === 0 && (
                <p className="text-sm text-muted-foreground">本期間無食品紀錄。</p>
              )}
            </div>
          </Section>

          {/* Longitudinal */}
          <Section title="Longitudinal Trend">
            {summary.hasLongitudinal ? (
              <p className="text-sm text-muted-foreground">趨勢圖表將在此呈現。</p>
            ) : (
              <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3.5">
                <p className="text-sm font-medium text-muted-foreground">Insufficient longitudinal data</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Longitudinal trend analysis will become available after additional monthly records are
                  uploaded.
                </p>
              </div>
            )}
          </Section>

          {/* Observed patterns */}
          <Section title="Observed Patterns">
            {summary.observedPatterns.length ? (
              <ul className="space-y-1.5">
                {summary.observedPatterns.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-tealink" />
                    {p}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No observed patterns this period.</p>
            )}
          </Section>

          {/* Confidence */}
          <Section title="Data Confidence">
            <div className="space-y-3">
              <ConfBar label="High confidence" value={summary.confidenceBreakdown.highConfidence} cls="bg-[#2f7d72]" />
              <ConfBar label="User confirmed" value={summary.confidenceBreakdown.userConfirmed} cls="bg-confirmed" />
              <ConfBar label="Model inferred" value={summary.confidenceBreakdown.modelInferred} cls="bg-inferred" />
            </div>
          </Section>

          {/* Limitations */}
          <Section title="Important Data Limitations">
            <ul className="space-y-2 rounded-xl border border-warning/25 bg-warning/5 px-4 py-4">
              {summary.limitations.map((l, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b06a00]" />
                  {l}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        此摘要由電子發票購買紀錄推估，僅供參考。Methods: personalized consumption attribution engine.
        {!!profile && !profile.onboarded ? "" : ""}
      </p>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{k}</p>
      <p className="mt-1 text-[13px] font-medium leading-snug text-foreground">{v}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function ConfBar({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-36 text-muted-foreground">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${cls}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right font-medium text-foreground">{value}%</span>
    </div>
  );
}
