import Link from "next/link";
import { Debts } from "@/lib/db/repo";
import { computeDebtPriority, simulatePayoff, conversions, type PayoffSimDebt, type PayoffMethod } from "@/lib/calculations";
import { formatCurrency, formatDate } from "@/lib/format";
import { Panel, Pill, EmptyState } from "@/components/ui";
import { ExportLinks } from "@/components/ExportLinks";
import { DebtPayoffChart } from "@/components/charts/DebtPayoffChart";

export const dynamic = "force-dynamic";

export default async function DebtStrategyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const method = (params.method === "cashflow_relief" ? "cashflow_relief" : "avalanche") as PayoffMethod;

  const debts = Debts.all().filter((d) => d.balance > 0);
  const priority = computeDebtPriority(debts, method);
  const nonMortgage = priority.filter((p) => p.group !== "mortgage");

  const simDebts: PayoffSimDebt[] = nonMortgage.map((p) => ({
    id: p.debt.id,
    name: p.debt.name,
    balance: p.debt.balance,
    interestRatePct: p.debt.interestRate,
    minimumPaymentFortnightly: toFortnightlyPayment(p.debt.minimumPayment, p.debt.paymentFrequency),
  }));

  const startDate = new Date();
  const scenarios = [
    { key: "minimum", label: "Minimum only", extra: 0 },
    { key: "extra100", label: "+$100/month extra", extra: conversions.monthlyToFortnightly(100) },
    { key: "extra300", label: "+$300/month extra", extra: conversions.monthlyToFortnightly(300) },
  ].map((s) => ({
    ...s,
    result: simDebts.length > 0 ? simulatePayoff(simDebts, s.extra, startDate) : null,
  }));

  const mortgage = priority.find((p) => p.group === "mortgage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Debt Strategy</h1>
        <p className="text-sm text-muted mt-1">
          Stabilise the cards first, then attack the highest-interest personal loan. The mortgage
          stays on its normal repayment until the more expensive debt is under control.
        </p>
      </div>

      <Panel title="Priority order" subtitle="Highest-priority debt is where extra cash should go once bills and buffer are covered.">
        <div className="flex gap-2 mb-4">
          <Link
            href="/debt?method=avalanche"
            className={`rounded-lg border px-3 py-1.5 text-sm ${method === "avalanche" ? "border-primary bg-primary-soft font-medium" : "border-border"}`}
          >
            Avalanche — highest interest first
          </Link>
          <Link
            href="/debt?method=cashflow_relief"
            className={`rounded-lg border px-3 py-1.5 text-sm ${method === "cashflow_relief" ? "border-primary bg-primary-soft font-medium" : "border-border"}`}
          >
            Cash-flow relief — free up payments sooner
          </Link>
        </div>
        {priority.length === 0 ? (
          <EmptyState>No active debts — nice breathing room.</EmptyState>
        ) : (
          <ol className="space-y-2">
            {priority.map((p) => (
              <li key={p.debt.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {p.rank}. {p.debt.name} <Pill>{p.debt.interestRate.toFixed(2)}%</Pill>
                    {p.group === "mortgage" && <Pill>mortgage</Pill>}
                    {p.group === "promotional_zero_percent" && <Pill>0% promo</Pill>}
                  </span>
                  <span className="tabular-nums font-medium">{formatCurrency(p.debt.balance)}</span>
                </div>
                <p className="text-sm text-muted mt-1">{p.reason}</p>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {simDebts.length > 0 && (
        <>
          <Panel title="Payoff timeline" subtitle="Non-mortgage debt only. Extra payments and freed-up minimums snowball onto the top-priority debt automatically.">
            <DebtPayoffChart
              scenarios={scenarios
                .filter((s) => s.result)
                .map((s) => ({ label: s.label, points: s.result!.points }))}
            />
          </Panel>

          <div className="grid sm:grid-cols-3 gap-4">
            {scenarios.map((s) =>
              s.result ? (
                <Panel key={s.key} title={s.label}>
                  <div className="space-y-1.5 text-sm">
                    <p>
                      <span className="text-muted">Debt-free date: </span>
                      <span className="font-medium">
                        {allCleared(s.result.payoffDates) ? formatDate(latestPayoff(s.result.payoffDates)!) : "Beyond 10 years"}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted">Breathing room date: </span>
                      <span className="font-medium">{s.result.breathingRoomDate ? formatDate(s.result.breathingRoomDate) : "—"}</span>
                    </p>
                    <p>
                      <span className="text-muted">Total interest paid: </span>
                      <span className="font-medium">{formatCurrency(s.result.totalInterestPaid)}</span>
                    </p>
                  </div>
                </Panel>
              ) : null
            )}
          </div>
        </>
      )}

      {mortgage && (
        <Panel title="Mortgage">
          <p className="text-sm">
            {mortgage.debt.name} is charging {mortgage.debt.interestRate.toFixed(2)}% —{" "}
            {nonMortgage.length > 0
              ? "lower than every other active debt, so it stays on its normal repayment for now. No extra repayments are recommended while higher-interest debt exists."
              : "the lowest-rate remaining debt now that everything else is cleared — extra repayments here start to make sense."}
          </p>
        </Panel>
      )}

      <Panel title="Export">
        <ExportLinks tables={["debts"]} />
      </Panel>
    </div>
  );
}

function toFortnightlyPayment(amount: number, frequency: "weekly" | "fortnightly" | "monthly"): number {
  if (frequency === "weekly") return conversions.weeklyToFortnightly(amount);
  if (frequency === "monthly") return conversions.monthlyToFortnightly(amount);
  return amount;
}

function allCleared(payoffDates: Record<number, string | null>): boolean {
  return Object.values(payoffDates).every((d) => d !== null);
}
function latestPayoff(payoffDates: Record<number, string | null>): string | null {
  const dates = Object.values(payoffDates).filter((d): d is string => d !== null);
  return dates.sort().at(-1) ?? null;
}
