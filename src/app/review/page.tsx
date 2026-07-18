import { MonthlyReviews } from "@/lib/db/repo";
import { generateMonthlyReview } from "@/lib/review";
import { formatCurrency } from "@/lib/format";
import { Panel, Pill } from "@/components/ui";
import { ExportLinks } from "@/components/ExportLinks";
import { saveMonthlyReview } from "./actions";

export const dynamic = "force-dynamic";

const btnCls = "rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90";

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const months = lastMonths(12);
  const month = typeof params.month === "string" ? params.month : months[0];
  const review = generateMonthlyReview(month);
  const saved = MonthlyReviews.all();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Monthly Review</h1>
        <p className="text-sm text-muted mt-1">
          A plain-language look back — what happened, what improved, and one useful next step.
        </p>
      </div>

      <Panel title="Choose a month">
        <form className="flex items-end gap-3" method="GET">
          <div>
            <label className="text-xs text-muted block mb-1">Month</label>
            <select
              name="month"
              defaultValue={month}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
            >
              {months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <button type="submit" className={btnCls}>View</button>
        </form>
      </Panel>

      <Panel title={`Review — ${month}`}>
        <p className="text-sm leading-relaxed mb-4">{review.narrative}</p>
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <Stat label="Total income" value={formatCurrency(review.totalIncome)} />
          <Stat label="Essential bills" value={formatCurrency(review.totalFixed)} />
          <Stat label="Discretionary spending" value={formatCurrency(review.totalDiscretionary)} />
          <Stat label="Card spending" value={formatCurrency(review.totalCardSpending)} />
          <Stat label="Card interest paid" value={formatCurrency(review.cardInterestPaid)} tone={review.cardInterestPaid > 0 ? "warn" : undefined} />
          <Stat label="Estimated debt movement" value={formatCurrency(review.debtBalanceChange)} />
        </div>
        <div className="space-y-2 text-sm">
          {review.biggestOverspendCategory && (
            <p><span className="text-muted">Biggest overspend: </span><Pill>{review.biggestOverspendCategory}</Pill></p>
          )}
          {review.bestValueCategory && (
            <p><span className="text-muted">Best-value spending: </span><Pill tone="primary">{review.bestValueCategory}</Pill></p>
          )}
          <p className="pt-2 rounded-lg bg-primary-soft text-primary px-3 py-2">{review.recommendedAction}</p>
        </div>
        <form action={saveMonthlyReview} className="mt-4">
          <input type="hidden" name="month" value={month} />
          <button className={btnCls} type="submit">Save this review</button>
        </form>
      </Panel>

      {saved.length > 0 && (
        <Panel title="Saved reviews">
          <ul className="divide-y divide-border">
            {saved.map((r) => (
              <li key={r.id} className="py-2 text-sm flex items-center justify-between">
                <a href={`/review?month=${r.month}`} className="hover:underline">{r.month}</a>
                <span className="text-muted">{formatCurrency(r.totalDiscretionary)} discretionary</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Export">
        <ExportLinks tables={["monthly-reviews"]} />
      </Panel>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className={`rounded-lg p-3 ${tone === "warn" ? "bg-status-yellow-bg" : "bg-surface-muted"}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
