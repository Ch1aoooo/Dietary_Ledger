import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CategoryStat } from "@/types";
import { CATEGORY_COLORS } from "@/lib/colors";

export function FoodCategoryChart({ data }: { data: CategoryStat[] }) {
  const chart = data.map((d) => ({
    name: d.category,
    value: d.estimated,
  }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chart}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={88}
              paddingAngle={2}
              strokeWidth={0}
            >
              {chart.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={CATEGORY_COLORS[entry.name] ?? "#9aa7a2"}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, name: string) => [
                `${v} servings`,
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
      <ul className="grid min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {data.map((d) => (
          <li key={d.category} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: CATEGORY_COLORS[d.category] ?? "#9aa7a2" }}
              />
              {d.category}
            </span>
            <span className="font-medium text-foreground">
              {d.estimated}
              <span className="ml-0.5 text-2xs text-muted-foreground">sv</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
