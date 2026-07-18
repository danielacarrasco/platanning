import { Debts } from "@/lib/db/repo";
import {
  buildCashFlowForecast,
  buildNetWorthProjection,
  buildSpendingByValues,
  getFixedCostPressure,
  getNetWorthAssumptions,
} from "@/lib/longterm";
import { computeDebtPriority, simulatePayoff, conversions, type PayoffSimDebt } from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";
import { Panel, ProgressBar } from "@/components/ui";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { NetWorthChart } from "@/components/charts/NetWorthChart";
import { ValueGroupChart } from "@/components/charts/ValueGroupChart";
import { DebtPayoffChart } from "@/components/charts/DebtPayoffChart";
import { updateNetWorthAssumptions } from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const labelCls = "text-xs text-muted block mb-1";
const btnCls = "rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90";

export default function VisualsPage() {
  const cashFlow = buildCashFlowForecast(13);
  const netWorth = buildNetWorthProjection(12);
  const values = buildSpendingByValues();
  const pressure = getFixedCostPressure();
  const assumptions = getNetWorthAssumptions();

  const debts = Debts.all().filter((d) => d.balance > 0);
  const priority = computeDebtPriority(debts, "avalanche").filter((p) => p.group !== "mortgage");
  const simDebts: PayoffSimDebt[] = priority.map((p) => ({
    id: p.debt.id,
    name: p.debt.name,
    balance: p.debt.balance,
    interestRatePct: p.debt.interestRate,
    minimumPaymentFortnightly:
      p.debt.paymentFrequency === "weekly"
        ? conversions.weeklyToFortnightly(p.debt.minimumPayment)
        : p.debt.paymentFrequency === "monthly"
          ? conversions.monthlyToFortnightly(p.debt.minimumPayment)
          : p.debt.minimumPayment,
  }));
  const payoffScenarios = [
    { label: "Minimum only", extra: 0 },
    { label: "+$100/month extra", extra: conversions.monthlyToFortnightly(100) },
    { label: "+$300/month extra", extra: conversions.monthlyToFortnightly(300) },
  ].map((s) => ({ label: s.label, points: simDebts.length ? simulatePayoff(simDebts, s.extra, new Date()).points : [] }));

  const milestones = cashFlow.filter((p) => p.label);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Long-Term Visuals</h1>
        <p className="text-sm text-muted mt-1">
          What today&apos;s decisions look like stretched out over the next few months and years.
        </p>
      </div>

      <Panel title="Cash-flow forecast" subtitle="Everyday account balance if every planned bucket is spent in full.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {milestones.map((m) => (
            <div key={m.label} className="rounded-lg bg-surface-muted p-3">
              <p className="text-xs text-muted">{m.label}</p>
              <p className="font-semibold tabular-nums">{formatCurrency(m.cash)}</p>
            </div>
          ))}
        </div>
        <CashFlowChart points={cashFlow} />
      </Panel>

      {simDebts.length > 0 && (
        <Panel title="Debt payoff timeline" subtitle="Non-mortgage debt. See the Debt Strategy page for the full breakdown and priority order.">
          <DebtPayoffChart scenarios={payoffScenarios} />
        </Panel>
      )}

      <Panel title="Net worth" subtitle="Assets minus liabilities, projected 12 months forward.">
        <form action={updateNetWorthAssumptions} className="grid sm:grid-cols-3 gap-3 mb-4">
          <Field label="Property estimate" name="propertyEstimate" defaultValue={assumptions.propertyEstimate} />
          <Field label="Super balance" name="superBalance" defaultValue={assumptions.superBalance} />
          <Field label="Investments" name="investments" defaultValue={assumptions.investments} />
          <div className="sm:col-span-3">
            <button className={btnCls} type="submit">Update assumptions</button>
          </div>
        </form>
        <NetWorthChart points={netWorth} />
      </Panel>

      <Panel title="Fixed-cost pressure" subtitle="Share of monthly income committed before any discretionary spending.">
        <div className="flex items-center gap-4">
          <p className="text-3xl font-semibold tabular-nums">{pressure.pct.toFixed(0)}%</p>
          <div className="flex-1">
            <ProgressBar value={pressure.monthlyFixed} max={pressure.monthlyIncome} />
            <p className="text-xs text-muted mt-1">
              {formatCurrency(pressure.monthlyFixed)} committed of {formatCurrency(pressure.monthlyIncome)} monthly income
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Spending by values" subtitle="What committed money says about priorities right now — not a moral judgement, just a mirror.">
        <ValueGroupChart totals={values} />
      </Panel>
    </div>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue?: number }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input className={inputCls} name={name} type="number" step="0.01" defaultValue={defaultValue} />
    </div>
  );
}
