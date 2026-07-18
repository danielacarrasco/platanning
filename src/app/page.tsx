import Link from "next/link";
import { Accounts, Debts, SinkingFunds } from "@/lib/db/repo";
import { buildFortnightSnapshot, getFortnightWindow, getPlanningStyle, getPlanningDefaults, assessCardRisk } from "@/lib/planning";
import { computeDebtPriority } from "@/lib/calculations";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/format";
import { FortnightStatusBadge, Panel, ProgressBar, StatCard, CardStatusBadge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const style = getPlanningStyle();
  const window = getFortnightWindow();
  const defaults = getPlanningDefaults();
  const snapshot = buildFortnightSnapshot(window, style, defaults);
  const cardRisk = assessCardRisk();
  const debts = Debts.all();
  const priority = computeDebtPriority(debts, "avalanche");
  const topPriority = priority.find((p) => p.group !== "promotional_zero_percent");
  const funds = SinkingFunds.all();
  const holidayFund = funds.find((f) => f.name === "Holiday fund");
  const bufferFund = funds.find((f) => f.name === "Emergency buffer");

  const trueDiscretionary = snapshot.buckets.funMoney + snapshot.buckets.hobbyMoney;
  const cardAccounts = Accounts.all().filter((a) => a.type === "credit_card");
  const totalCardDebt = cardAccounts.reduce((s, a) => s + a.currentBalance, 0);
  const plannedSavings = snapshot.buckets.holidayContribution + snapshot.buckets.bufferContribution;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">This fortnight</h1>
          <p className="text-sm text-muted">
            {formatDate(window.startDate)} – {formatDate(window.endDate)} · Planning style:{" "}
            <span className="capitalize font-medium text-foreground">{style}</span>
          </p>
        </div>
        <FortnightStatusBadge status={snapshot.status} />
      </div>

      {snapshot.status === "red" && (
        <Panel className="border-status-red-border bg-status-red-bg/40">
          <p className="text-sm">
            This is a high-pressure fortnight — bills and card due dates are landing close
            together. That&apos;s timing, not a failure. Fun money and hobby spending have been
            trimmed below their usual target to protect bill cover; check the{" "}
            <Link href="/planner" className="underline font-medium">
              Fortnight Planner
            </Link>{" "}
            for the full breakdown.
          </p>
        </Panel>
      )}

      {/* Top summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Cash available today"
          value={formatCurrency(snapshot.startingCash)}
          hint="Everyday accounts only"
        />
        <StatCard
          label="Safe to spend this fortnight"
          value={formatCurrency(snapshot.buckets.funMoney)}
          hint="Discretionary life — after bills, debt & set-asides"
          tone="primary"
        />
        <StatCard
          label="Bills due before next payday"
          value={formatCurrency(snapshot.billsDue + snapshot.requiredDebtPayments + snapshot.cardPayments)}
          hint={`${snapshot.billItems.length + snapshot.debtItems.length + snapshot.cardItems.length} items`}
        />
        <StatCard
          label="Credit card risk"
          value={<CardStatusBadge status={cardRisk.worst} />}
          hint={cardAccounts.length === 0 ? "No cards on file" : `${cardAccounts.length} card(s) tracked`}
        />
        <StatCard
          label="Debt priority"
          value={topPriority ? topPriority.debt.name : "No active debt"}
          hint={topPriority ? `${topPriority.debt.interestRate.toFixed(2)}% interest` : undefined}
        />
        <StatCard
          label="Holiday fund progress"
          value={holidayFund ? `${formatCurrency(holidayFund.currentAmount)} / ${formatCurrency(holidayFund.targetAmount)}` : "—"}
        />
        <StatCard
          label="Emergency buffer"
          value={bufferFund ? `${formatCurrency(bufferFund.currentAmount)} / ${formatCurrency(bufferFund.targetAmount)}` : "—"}
        />
        <StatCard
          label="Ending cash forecast"
          value={formatCurrency(snapshot.endingCashForecast)}
          hint="If every planned bucket is spent in full"
        />
      </div>

      {/* Cash breakdown — never conflate total cash with spendable cash */}
      <Panel title="Where your cash actually is" subtitle="Cash in the bank is not the same as money you're free to spend.">
        <div className="space-y-3">
          <BreakdownRow label="Cash in everyday accounts" amount={snapshot.startingCash} />
          <BreakdownRow label="Already allocated to bills & required debt payments" amount={-(snapshot.billsDue + snapshot.requiredDebtPayments + snapshot.cardPayments)} negative />
          <BreakdownRow label="Set aside for sinking funds (irregular bills, goals)" amount={-snapshot.requiredSetAsides} negative />
          <BreakdownRow label="Protected safety floor" amount={-snapshot.hardFloorBuffer} negative />
          <div className="h-px bg-border my-1" />
          <BreakdownRow label="True available this fortnight" amount={snapshot.trueAvailable} bold />
          <div className="h-px bg-border my-1" />
          <BreakdownRow label="→ Fun money (coffees, eating out, treats)" amount={snapshot.buckets.funMoney} indent />
          <BreakdownRow label="→ Sewing / hobbies" amount={snapshot.buckets.hobbyMoney} indent />
          <BreakdownRow label="→ Holiday fund" amount={snapshot.buckets.holidayContribution} indent />
          <BreakdownRow label="→ Buffer contribution" amount={snapshot.buckets.bufferContribution} indent />
          <BreakdownRow label="→ Card cleanup / extra debt payment" amount={snapshot.buckets.cardCleanup} indent />
          {snapshot.buckets.leftoverUnallocated > 0 && (
            <BreakdownRow label="→ Left unallocated (your call)" amount={snapshot.buckets.leftoverUnallocated} indent />
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-surface-muted p-3">
            <p className="text-muted text-xs">Total credit card debt</p>
            <p className="font-semibold">{formatCurrency(totalCardDebt)}</p>
          </div>
          <div className="rounded-lg bg-surface-muted p-3">
            <p className="text-muted text-xs">Planned savings this fortnight</p>
            <p className="font-semibold">{formatCurrency(plannedSavings)}</p>
          </div>
          <div className="rounded-lg bg-surface-muted p-3">
            <p className="text-muted text-xs">Discretionary this fortnight</p>
            <p className="font-semibold">{formatCurrency(trueDiscretionary)}</p>
          </div>
        </div>
      </Panel>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Bills before next payday" action={<Link href="/bills" className="text-sm text-primary font-medium">Full calendar →</Link>}>
          {snapshot.billItems.length + snapshot.debtItems.length + snapshot.cardItems.length === 0 ? (
            <EmptyState>Nothing due before your next payday.</EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {[...snapshot.billItems, ...snapshot.debtItems, ...snapshot.cardItems]
                .sort((a, b) => (a.date < b.date ? -1 : 1))
                .slice(0, 6)
                .map((item, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {item.name} <span className="text-muted">· {formatDateShort(item.date)}</span>
                    </span>
                    <span className="font-medium tabular-nums">{formatCurrency(item.amount)}</span>
                  </li>
                ))}
            </ul>
          )}
        </Panel>

        <Panel title="Goals in motion" action={<Link href="/goals" className="text-sm text-primary font-medium">All goals →</Link>}>
          <div className="space-y-4">
            {[bufferFund, holidayFund].filter(Boolean).map((f) => (
              <div key={f!.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{f!.name}</span>
                  <span className="text-muted">
                    {formatCurrency(f!.currentAmount)} / {formatCurrency(f!.targetAmount)}
                  </span>
                </div>
                <ProgressBar value={f!.currentAmount} max={f!.targetAmount} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Next useful step">
        <p className="text-sm">
          {topPriority
            ? `Priority debt right now is ${topPriority.debt.name} at ${topPriority.debt.interestRate.toFixed(2)}%. ${topPriority.reason}`
            : "No active debts to prioritise — nice breathing room."}{" "}
          <Link href="/debt" className="underline font-medium">
            See the full debt strategy →
          </Link>
        </p>
      </Panel>
    </div>
  );
}

function BreakdownRow({
  label,
  amount,
  negative = false,
  bold = false,
  indent = false,
}: {
  label: string;
  amount: number;
  negative?: boolean;
  bold?: boolean;
  indent?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between text-sm ${indent ? "pl-3 text-muted" : ""}`}>
      <span className={bold ? "font-semibold text-foreground" : ""}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-semibold text-foreground" : ""} ${negative ? "text-status-red-fg" : ""}`}>
        {negative ? "−" : ""}
        {formatCurrency(Math.abs(amount))}
      </span>
    </div>
  );
}
