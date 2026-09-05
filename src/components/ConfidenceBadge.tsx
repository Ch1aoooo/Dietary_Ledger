import { cn } from "@/lib/utils";

export function ConfidenceBadge({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  // 上游（尤其是 LLM 後端回傳的 confidence）沒有做範圍驗證，這裡再夾一次
  // 避免像 137 或 -5 這種畸形值被原樣顯示成「137%」「-5%」。
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  const tone =
    clamped >= 80
      ? "text-confirmed border-confirmed/25 bg-confirmed/10"
      : clamped >= 60
        ? "text-inferred border-inferred/25 bg-inferred/10"
        : "text-[#9a5b00] border-warning/30 bg-warning/15";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tone,
        className
      )}
    >
      {clamped}%
    </span>
  );
}

/** 低信心徽章（orange warning） */
export function LowConfidenceBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-[#9a5b00]">
      <span className="h-1.5 w-1.5 rounded-full bg-warning" />
      Low confidence
    </span>
  );
}
