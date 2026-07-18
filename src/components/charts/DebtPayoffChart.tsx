"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { PayoffSimPoint } from "@/lib/calculations";
import { formatCurrency, formatDateShort } from "@/lib/format";

const COLORS = ["#3f6e64", "#8a6d5c", "#9c4a3c"];

export function DebtPayoffChart({
  scenarios,
}: {
  scenarios: { label: string; points: PayoffSimPoint[] }[];
}) {
  const maxLen = Math.max(...scenarios.map((s) => s.points.length), 0);
  const data = Array.from({ length: maxLen }).map((_, i) => {
    const row: Record<string, number | string> = {
      date: scenarios[0]?.points[i]?.date ?? scenarios[0]?.points.at(-1)?.date ?? "",
    };
    for (const s of scenarios) {
      row[s.label] = s.points[i]?.totalBalance ?? 0;
    }
    return row;
  });

  // Sample down to keep the chart readable (roughly monthly points).
  const sampled = data.filter((_, i) => i % 2 === 0 || i === data.length - 1);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sampled} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => formatDateShort(v)}
            tick={{ fontSize: 11 }}
            minTickGap={30}
          />
          <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={70} />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            labelFormatter={(v) => formatDateShort(String(v))}
          />
          <Legend />
          {scenarios.map((s, i) => (
            <Line key={s.label} type="monotone" dataKey={s.label} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
