"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { CashFlowPoint } from "@/lib/longterm";
import { formatCurrency, formatDateShort } from "@/lib/format";

export function CashFlowChart({ points }: { points: CashFlowPoint[] }) {
  const zeroCrossing = points.find((p) => p.cash < 0);
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tickFormatter={(v) => formatDateShort(String(v))} tick={{ fontSize: 11 }} minTickGap={30} />
          <YAxis tickFormatter={(v) => formatCurrency(Number(v))} tick={{ fontSize: 11 }} width={70} />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            labelFormatter={(v) => formatDateShort(String(v))}
          />
          <ReferenceLine y={0} stroke="var(--status-red-fg)" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="cash" stroke="var(--primary)" fill="url(#cashFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
      {zeroCrossing && (
        <p className="text-xs text-status-red-fg mt-2">
          Projected cash dips below zero around {formatDateShort(zeroCrossing.date)} if every
          planned bucket is spent in full — worth revisiting that fortnight&apos;s plan.
        </p>
      )}
    </div>
  );
}
