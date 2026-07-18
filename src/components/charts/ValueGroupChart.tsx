"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ValueGroupTotal } from "@/lib/longterm";
import { formatCurrency } from "@/lib/format";

const COLORS: Record<string, string> = {
  "home/security": "#3f6e64",
  "family support": "#8a6d5c",
  "health/recovery": "#6d8a6d",
  "debt cleanup": "#9c4a3c",
  "joy/identity": "#c2a05c",
  convenience: "#7a8a9c",
  "future self": "#5c7a8a",
};

export function ValueGroupChart({ totals }: { totals: ValueGroupTotal[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={totals} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis type="number" tickFormatter={(v) => formatCurrency(Number(v))} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="group" tick={{ fontSize: 12 }} width={110} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Bar dataKey="monthlyAmount" radius={[0, 6, 6, 0]}>
            {totals.map((t) => (
              <Cell key={t.group} fill={COLORS[t.group] ?? "#3f6e64"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
