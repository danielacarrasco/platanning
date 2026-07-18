"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { NetWorthPoint } from "@/lib/longterm";
import { formatCurrency, formatDateShort } from "@/lib/format";

export function NetWorthChart({ points }: { points: NetWorthPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tickFormatter={(v) => formatDateShort(String(v))} tick={{ fontSize: 11 }} minTickGap={30} />
          <YAxis tickFormatter={(v) => formatCurrency(Number(v))} tick={{ fontSize: 11 }} width={80} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={(v) => formatDateShort(String(v))} />
          <Legend />
          <Line type="monotone" dataKey="assets" name="Assets" stroke="#3f6e64" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="liabilities" name="Liabilities" stroke="#9c4a3c" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="netWorth" name="Net worth" stroke="#8a6d5c" dot={false} strokeWidth={2} strokeDasharray="5 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
