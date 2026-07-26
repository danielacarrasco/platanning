import type { ReactNode } from "react";
import type { CardStatus, FortnightStatus } from "@/lib/types";
import { CARD_STATUS_COPY, type SpendingPace } from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";

export function Panel({
  children,
  className = "",
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-surface p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            {title && <h2 className="font-semibold text-base">{title}</h2>}
            {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS_STYLES: Record<FortnightStatus, string> = {
  green: "bg-status-green-bg text-status-green-fg border-status-green-border",
  yellow: "bg-status-yellow-bg text-status-yellow-fg border-status-yellow-border",
  red: "bg-status-red-bg text-status-red-fg border-status-red-border",
};

const STATUS_LABELS: Record<FortnightStatus, string> = {
  green: "Green fortnight — low bill pressure",
  yellow: "Yellow fortnight — normal pressure",
  red: "Red fortnight — heavy bills or card due dates",
};

export function FortnightStatusBadge({ status, compact = false }: { status: FortnightStatus; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${STATUS_STYLES[status]}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {compact ? status[0].toUpperCase() + status.slice(1) : STATUS_LABELS[status]}
    </span>
  );
}

const CARD_STATUS_STYLES: Record<CardStatus, string> = {
  clean: "bg-status-green-bg text-status-green-fg border-status-green-border",
  watch: "bg-status-yellow-bg text-status-yellow-fg border-status-yellow-border",
  risk: "bg-status-yellow-bg text-status-yellow-fg border-status-yellow-border",
  problem: "bg-status-red-bg text-status-red-fg border-status-red-border",
};

export function CardStatusBadge({ status }: { status: CardStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${CARD_STATUS_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {CARD_STATUS_COPY[status].label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "primary" | "muted";
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p
        className={`mt-1.5 text-2xl font-semibold tabular-nums ${
          tone === "primary" ? "text-primary" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "primary" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        tone === "primary" ? "bg-primary-soft text-primary" : "bg-surface-muted text-muted"
      }`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-muted rounded-xl border border-dashed border-border p-4 text-center">
      {children}
    </p>
  );
}

export function ProgressBar({ value, max, tone = "primary" }: { value: number; max: number; tone?: "primary" | "accent" }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
      <div
        className={`h-full rounded-full ${tone === "primary" ? "bg-primary" : "bg-accent"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const PACE_COPY: Record<SpendingPace["status"], { label: string; barClass: string; textClass: string }> = {
  on_track: { label: "On track", barClass: "bg-primary", textClass: "text-muted" },
  ahead: { label: "Spending faster than the fortnight's pace", barClass: "bg-status-yellow-fg", textClass: "text-status-yellow-fg" },
  over: { label: "Past the planned amount", barClass: "bg-status-red-fg", textClass: "text-status-red-fg" },
};

/** Live view of actual spending against a planned bucket for the current fortnight. */
export function SpendingPaceBar({ label, pace }: { label: string; pace: SpendingPace }) {
  const copy = PACE_COPY[pace.status];
  const pct = pace.planned > 0 ? Math.min(100, (pace.actual / pace.planned) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-muted tabular-nums">
          {formatCurrency(pace.actual)} of {formatCurrency(pace.planned)}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
        <div className={`h-full rounded-full ${copy.barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-xs mt-1 ${copy.textClass}`}>
        {pace.status === "over"
          ? `${copy.label} by ${formatCurrency(Math.abs(pace.remaining))} — worth a look, not a problem.`
          : pace.remaining >= 0
            ? `${copy.label}. ${formatCurrency(pace.remaining)} left for the rest of the fortnight.`
            : copy.label}
      </p>
    </div>
  );
}
