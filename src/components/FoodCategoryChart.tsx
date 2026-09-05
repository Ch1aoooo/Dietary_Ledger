import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CategoryStat } from "@/types";
import { CATEGORY_COLORS, categoryLabel } from "@/lib/colors";

export function FoodCategoryChart({
  data,
  compact = false,
}: {
  data: CategoryStat[];
  /** 給 PDF 匯出（components/ClinicalDocument.tsx）用的縮小版：圓餅圖跟
   *  圖例都改用固定尺寸，不依賴 `sm:` 這種看瀏覽器視窗寬度決定的
   *  responsive class——PDF 那個隱藏節點即使欄位窄，視窗本身還是寬的，
   *  `sm:flex-row` 一樣會生效，導致圖例被硬擠在窄欄位裡換行變形。 */
  compact?: boolean;
}) {
  const total = data.reduce((sum, d) => sum + d.estimated, 0);
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);
  const chart = data.map((d) => ({
    name: categoryLabel(d.category),
    category: d.category,
    value: d.estimated,
  }));

  return (
    <div
      className={
        compact
          ? "flex flex-row items-center gap-3"
          : "flex flex-col items-center gap-4 sm:flex-row"
      }
    >
      <div className={compact ? "h-28 w-28 shrink-0" : "h-52 w-52 shrink-0"}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chart}
              dataKey="value"
              nameKey="name"
              innerRadius={compact ? 32 : 54}
              outerRadius={compact ? 50 : 88}
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive={!compact}
            >
              {chart.map((entry) => (
                <Cell
                  key={entry.category}
                  fill={CATEGORY_COLORS[entry.category] ?? "#9aa7a2"}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, name: string) => [
                `${pct(v).toFixed(1)}%`,
                name,
              ]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid hsl(200 10% 88%)",
                boxShadow: "0 8px 24px -12px rgba(20,40,40,.25)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul
        className={
          compact
            ? "grid min-w-0 flex-1 grid-cols-1 gap-x-3 gap-y-1"
            : "grid min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2"
        }
      >
        {data.map((d) => (
          <li
            key={d.category}
            className={
              compact
                ? "flex items-center justify-between gap-2 text-xs"
                : "flex items-center justify-between gap-2 text-sm"
            }
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className={compact ? "h-2 w-2 shrink-0 rounded-full" : "h-2.5 w-2.5 rounded-full"}
                style={{ background: CATEGORY_COLORS[d.category] ?? "#9aa7a2" }}
              />
              {categoryLabel(d.category)}
            </span>
            <span className="font-medium text-foreground">
              {pct(d.estimated).toFixed(1)}
              <span className="ml-0.5 text-2xs text-muted-foreground">%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
