import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { WeeklyPoint } from "@/types";
import { CATEGORY_COLORS } from "@/lib/colors";

// 要跟 lib/analytics.ts 的 computeWeekly() 算的類別一致（該處的 `focus`
// 陣列），否則這裡漏掉的類別即使 WeeklyPoint 裡有資料也永遠畫不出來。
const SERIES = ["Coffee", "Sugary beverages", "Prepared meals", "Bakery"];

export function WeeklyTrendChart({ data }: { data: WeeklyPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(200 10% 90%)" />
          <XAxis dataKey="week" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(200 10% 88%)",
              boxShadow: "0 8px 24px -12px rgba(20,40,40,.25)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {SERIES.map((s) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              stroke={CATEGORY_COLORS[s]}
              strokeWidth={2.4}
              dot={{ r: 3.5, strokeWidth: 0, fill: CATEGORY_COLORS[s] }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
