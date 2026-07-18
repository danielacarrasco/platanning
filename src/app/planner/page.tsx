import Link from "next/link";
import {
  buildFortnightSnapshot,
  getPlanningDefaults,
  getPlanningStyle,
  listWindows,
} from "@/lib/planning";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/format";
import { FortnightStatusBadge, Panel, EmptyState } from "@/components/ui";
import type { PlanningStyle } from "@/lib/types";
import { updatePlanningStyle } from "../settings/actions";

export const dynamic = "force-dynamic";

const STYLES: PlanningStyle[] = ["gentle", "balanced", "aggressive"];

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const offset = Math.max(0, Math.min(5, Number(params.offset ?? 0) || 0));
  const style = getPlanningStyle();
  const defaults = getPlanningDefaults();
  const windows = listWindows(6);
  const window = windows[offset];
  const snapshot = buildFortnightSnapshot(window, style, defaults);

  const comparisons = STYLES.map((s) => ({
    style: s,
    snapshot: buildFortnightSnapshot(window, s, defaults),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Fortnight Planner</h1>
        <p className="text-sm text-muted mt-1">
          Income due, bills timed against it, and what&apos;s genuinely safe to spend — split into
          deliberate buckets, not a single number.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {windows.map((w, i) => {
          const s = buildFortnightSnapshot(w, style, defaults);
          return (
            <Link
              key={w.startDate}
              href={`/planner?offset=${i}`}
              className={`rounded-xl border px-3 py-2 text-sm ${
                i === offset ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-muted"
              }`}
            >
              <div className="font-medium">{formatDateShort(w.startDate)} – {formatDateShort(w.endDate)}</div>
              <div className="mt-1"><FortnightStatusBadge status={s.status} compact /></div>
            </Link>
          );
        })}
      </div>

      <Panel title="Planning style for this plan">
        <form action={updatePlanningStyle} className="flex flex-wrap items-center gap-2">
          {STYLES.map((s) => (
            <label
              key={s}
              className={`rounded-lg border px-3 py-2 text-sm cursor-pointer capitalize ${
                s === style ? "border-primary bg-primary-soft font-medium" : "border-border"
              }`}
            >
              <input type="radio" name="planningStyle" value={s} defaultChecked={s === style} className="mr-2" />
              {s}
            </label>
          ))}
          <button type="submit" className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium">
            Use this style
          </button>
        </form>
        <p className="text-xs text-muted mt-2">
          Gentle preserves quality of life with slower debt payoff. Balanced trims discretionary
          spending moderately. Aggressive is temporary austerity to maximise debt payoff — not the
          default, and never required.
        </p>
      </Panel>

      <div className="grid lg:grid-cols-[1.3fr,1fr] gap-4">
        <Panel
          title={`${formatDate(window.startDate)} – ${formatDate(window.endDate)}`}
          action={<FortnightStatusBadge status={snapshot.status} />}
        >
          <div className="space-y-1 text-sm">
            <Row label="Starting cash" amount={snapshot.startingCash} />
            <Row label="+ Income due this fortnight" amount={snapshot.income} />
            <Row label="− Bills due before next payday" amount={-snapshot.billsDue} />
            <Row label="− Required debt payments" amount={-(snapshot.requiredDebtPayments + snapshot.cardPayments)} />
            <Row label="− Sinking fund set-asides" amount={-snapshot.requiredSetAsides} />
            <Row label="− Minimum buffer protection" amount={-snapshot.hardFloorBuffer} />
            <div className="h-px bg-border my-2" />
            <Row label="= Remaining flexible cash" amount={snapshot.trueAvailable} bold />
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium mb-2">Suggested buckets</p>
            <div className="space-y-1 text-sm">
              <Row label="Fun money (coffees, eating out, movies)" amount={snapshot.buckets.funMoney} indent />
              <Row label="Sewing / hobbies" amount={snapshot.buckets.hobbyMoney} indent />
              <Row label="Holiday fund" amount={snapshot.buckets.holidayContribution} indent />
              <Row label="Emergency buffer" amount={snapshot.buckets.bufferContribution} indent />
              <Row label="Card cleanup / extra debt payment" amount={snapshot.buckets.cardCleanup} indent />
              {snapshot.buckets.leftoverUnallocated > 0 && (
                <Row label="Unallocated — your call" amount={snapshot.buckets.leftoverUnallocated} indent />
              )}
            </div>
            {snapshot.worstCardStatus === "risk" || snapshot.worstCardStatus === "problem" ? (
              <p className="text-xs text-status-red-fg mt-3">
                Holiday saving is paused this fortnight because a card is at risk of interest —
                cards get stabilised first, then the holiday fund resumes.
              </p>
            ) : null}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Bills & payments due">
            {[...snapshot.billItems, ...snapshot.debtItems, ...snapshot.cardItems].length === 0 ? (
              <EmptyState>Nothing due in this window.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {[...snapshot.billItems, ...snapshot.debtItems, ...snapshot.cardItems]
                  .sort((a, b) => (a.date < b.date ? -1 : 1))
                  .map((item, i) => (
                    <li key={i} className="flex items-center justify-between py-1.5 text-sm">
                      <span>{item.name} <span className="text-muted">· {formatDateShort(item.date)}</span></span>
                      <span className="tabular-nums font-medium">{formatCurrency(item.amount)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </Panel>
          <Panel title="Set-asides this fortnight">
            <ul className="divide-y divide-border">
              {snapshot.setAsideItems.filter((i) => i.amount > 0).map((item, i) => (
                <li key={i} className="flex items-center justify-between py-1.5 text-sm">
                  <span>{item.name}</span>
                  <span className="tabular-nums font-medium">{formatCurrency(item.amount)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel title="Compare planning styles for this fortnight" subtitle="Same bills, same income — different trade-offs.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-2 pr-4 font-normal">Style</th>
                <th className="py-2 pr-4 font-normal">Fun money</th>
                <th className="py-2 pr-4 font-normal">Hobbies</th>
                <th className="py-2 pr-4 font-normal">Holiday</th>
                <th className="py-2 pr-4 font-normal">Buffer</th>
                <th className="py-2 pr-4 font-normal">Card cleanup</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c) => (
                <tr key={c.style} className={`border-t border-border ${c.style === style ? "bg-primary-soft/40" : ""}`}>
                  <td className="py-2 pr-4 capitalize font-medium">{c.style}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatCurrency(c.snapshot.buckets.funMoney)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatCurrency(c.snapshot.buckets.hobbyMoney)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatCurrency(c.snapshot.buckets.holidayContribution)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatCurrency(c.snapshot.buckets.bufferContribution)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatCurrency(c.snapshot.buckets.cardCleanup)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Row({
  label,
  amount,
  bold = false,
  indent = false,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  indent?: boolean;
}) {
  const negative = amount < 0;
  return (
    <div className={`flex items-center justify-between ${indent ? "pl-3 text-muted" : ""}`}>
      <span className={bold ? "font-semibold text-foreground" : ""}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-semibold text-foreground" : ""} ${negative ? "text-status-red-fg" : ""}`}>
        {negative ? "−" : ""}
        {formatCurrency(Math.abs(amount))}
      </span>
    </div>
  );
}
