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
import { CATEGORY_COLORS, categoryLabel } from "@/lib/colors";

// 要跟 lib/analytics.ts 的 computeWeekly() 算的類別一致（該處的 `focus`
// 陣列），否則這裡漏掉的類別即使 WeeklyPoint 裡有資料也永遠畫不出來。
const SERIES = ["Coffee", "Sugary beverages", "Prepared meals", "Bakery"];

export function WeeklyTrendChart({
  data,
  height = 256,
  animate = true,
}: {
  data: WeeklyPoint[];
  /** 給 PDF 匯出（components/ClinicalDocument.tsx）用來壓縮圖表高度——
   *  預設值等於原本寫死的 h-64，Dashboard 既有用法不用傳、行為不變。 */
  height?: number;
  /** PDF 匯出時務必傳 false：html2canvas 是「當下截一張圖」，如果折線
   *  還在 recharts 的進場動畫（從 0 長度畫出來）過程中被截到，線會是
   *  斷的/缺一截，跟畫面上動畫播完後看到的完整折線不一樣。 */
  animate?: boolean;
}) {
  const compact = height < 150;
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(200 10% 90%)" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: compact ? 10 : 12 }}
            axisLine={false}
            tickLine={false}
            // 週數會依資料範圍縮放（4～9+ 週，見 lib/analytics.ts 的
            // weekSpan）——標籤多的時候讓 recharts 自動間隔，但頭尾兩週
            // 一定要顯示。
            interval="preserveStartEnd"
            minTickGap={compact ? 12 : 20}
          />
          <YAxis
            tick={{ fontSize: compact ? 10 : 12 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(200 10% 88%)",
              boxShadow: "0 8px 24px -12px rgba(20,40,40,.25)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: compact ? 10 : 12 }} />
          {SERIES.map((s) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              name={categoryLabel(s)}
              stroke={CATEGORY_COLORS[s]}
              strokeWidth={2.4}
              dot={{ r: compact ? 2 : 3.5, strokeWidth: 0, fill: CATEGORY_COLORS[s] }}
              activeDot={{ r: 5 }}
              isAnimationActive={animate}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
