import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CategoryStat } from "@/types";
import { PURCHASED_COLOR, ESTIMATED_COLOR } from "@/lib/colors";

export function ConsumptionComparisonChart({ data }: { data: CategoryStat[] }) {
  const chart = data.map((d) => ({
    name: d.category,
    Purchased: d.purchased,
    "Estimated intake": d.estimated,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart} barGap={4} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(200 10% 90%)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "hsl(200 6% 45%)" }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={56}
          />
          <YAxis tick={{ fontSize: 12, fill: "hsl(200 6% 45%)" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "hsl(170 30% 94%)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(200 10% 88%)",
              boxShadow: "0 8px 24px -12px rgba(20,40,40,.25)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Purchased" fill={PURCHASED_COLOR} radius={[6, 6, 0, 0]} maxBarSize={26} />
          <Bar dataKey="Estimated intake" fill={ESTIMATED_COLOR} radius={[6, 6, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
