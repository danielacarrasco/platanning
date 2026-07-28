import Link from "next/link";
import {
  buildChainedFortnightSnapshots,
  getPlanningDefaults,
  getPlanningStyle,
  listWindows,
} from "@/lib/planning";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/format";
import { FortnightStatusBadge, Panel, Pill, EmptyState, SpendingPaceBar } from "@/components/ui";
import { PLANNING_STYLE_LABELS } from "@/lib/calculations";
import { AdjustableAmount } from "@/components/AdjustableAmount";
import type { PlanningStyle } from "@/lib/types";
import { updatePlanningStyle } from "../settings/actions";
import { setFortnightOverrides, clearFortnightOverrides } from "./actions";

export const dynamic = "force-dynamic";

const STYLES: PlanningStyle[] = ["gentle", "balanced", "aggressive", "no_extra_savings"];

/** Generous slider range around a current value — 0 to roughly 3x (or +$1000, whichever is more
 * headroom), rounded to a friendly step. The number input isn't hard-capped to this range. */
function sliderBounds(value: number): { min: number; max: number; step: number } {
  const base = Math.max(Math.abs(value), 50);
  const max = Math.ceil(Math.max(base * 3, base + 1000) / 50) * 50;
  return { min: 0, max, step: max > 5000 ? 50 : 10 };
}

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
  // Each window's starting cash chains from the previous window's ending forecast, rather than
  // repeating today's live balance for every future fortnight — see buildChainedFortnightSnapshots.
  const chainedSnapshots = buildChainedFortnightSnapshots(windows, style, defaults);
  const snapshot = chainedSnapshots[offset];

  const comparisons = STYLES.map((s) => ({
    style: s,
    snapshot: buildChainedFortnightSnapshots(windows, s, defaults)[offset],
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
        {chainedSnapshots.map((s, i) => (
          <Link
            key={s.window.startDate}
            href={`/planner?offset=${i}`}
            className={`rounded-xl border px-3 py-2 text-sm ${
              i === offset ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-muted"
            }`}
          >
            <div className="font-medium">{formatDateShort(s.window.startDate)} – {formatDateShort(s.window.endDate)}</div>
            <div className="mt-1"><FortnightStatusBadge status={s.status} compact /></div>
          </Link>
        ))}
      </div>

      <Panel title="Planning style for this plan">
        <form action={updatePlanningStyle} className="flex flex-wrap items-center gap-2">
          {STYLES.map((s) => (
            <label
              key={s}
              className={`rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                s === style ? "border-primary bg-primary-soft font-medium" : "border-border"
              }`}
            >
              <input type="radio" name="planningStyle" value={s} defaultChecked={s === style} className="mr-2" />
              {PLANNING_STYLE_LABELS[s].short}
            </label>
          ))}
          <button type="submit" className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium">
            Use this style
          </button>
        </form>
        <p className="text-xs text-muted mt-2">
          Gentle preserves quality of life with slower debt payoff. Balanced trims discretionary
          spending moderately. Aggressive is temporary austerity to maximise debt payoff. No extra
          savings keeps fun money and hobbies at the normal target but sends nothing extra to the
          holiday fund, buffer, or debt cleanup — whatever&apos;s left just stays as flexible cash.
          None of these are the default, and none are ever required.
        </p>
      </Panel>

      <div className="grid lg:grid-cols-[1.3fr,1fr] gap-4">
        <Panel
          title={`${formatDate(window.startDate)} – ${formatDate(window.endDate)}`}
          action={<FortnightStatusBadge status={snapshot.status} />}
        >
          <div className="space-y-1 text-sm">
            <Row label="Starting cash" amount={snapshot.startingCash} adjusted={snapshot.overriddenFields.includes("startingCash")} />
            <Row label="+ Income due this fortnight" amount={snapshot.income} adjusted={snapshot.overriddenFields.includes("income")} />
            <Row label="− Bills due before next payday" amount={-snapshot.billsDue} adjusted={snapshot.overriddenFields.includes("billsDue")} />
            <Row label="− Required debt payments" amount={-snapshot.debtAndCardPayments} adjusted={snapshot.overriddenFields.includes("debtAndCardPayments")} />
            <Row label="− Sinking fund set-asides" amount={-snapshot.requiredSetAsides} adjusted={snapshot.overriddenFields.includes("requiredSetAsides")} />
            <Row label="− Minimum buffer protection" amount={-snapshot.hardFloorBuffer} adjusted={snapshot.overriddenFields.includes("hardFloorBuffer")} />
            <div className="h-px bg-border my-2" />
            <Row label="= Remaining flexible cash" amount={snapshot.trueAvailable} bold />
          </div>

          <details className="mt-4" open={snapshot.overriddenFields.length > 0}>
            <summary className="cursor-pointer text-sm font-medium text-primary">
              Adjust this fortnight&apos;s numbers
            </summary>
            <p className="text-xs text-muted mt-2 mb-3">
              Override any of these just for {formatDateShort(window.startDate)} – {formatDateShort(window.endDate)}{" "}
              — doesn&apos;t touch your underlying accounts, income, or bills, and every other
              fortnight is unaffected.
            </p>
            <form key={window.startDate} action={setFortnightOverrides} className="space-y-4">
              <input type="hidden" name="windowStart" value={window.startDate} />
              <AdjustableAmount
                key={`startingCash-${window.startDate}-${snapshot.startingCash}`}
                name="startingCash"
                label="Starting cash"
                defaultValue={snapshot.startingCash}
                {...sliderBounds(snapshot.startingCash)}
              />
              <AdjustableAmount
                key={`income-${window.startDate}-${snapshot.income}`}
                name="income"
                label="Income due this fortnight"
                defaultValue={snapshot.income}
                {...sliderBounds(snapshot.income)}
              />
              <AdjustableAmount
                key={`billsDue-${window.startDate}-${snapshot.billsDue}`}
                name="billsDue"
                label="Bills due before next payday"
                defaultValue={snapshot.billsDue}
                {...sliderBounds(snapshot.billsDue)}
              />
              <AdjustableAmount
                key={`debtAndCardPayments-${window.startDate}-${snapshot.debtAndCardPayments}`}
                name="debtAndCardPayments"
                label="Required debt payments"
                defaultValue={snapshot.debtAndCardPayments}
                {...sliderBounds(snapshot.debtAndCardPayments)}
              />
              <AdjustableAmount
                key={`requiredSetAsides-${window.startDate}-${snapshot.requiredSetAsides}`}
                name="requiredSetAsides"
                label="Sinking fund set-asides"
                defaultValue={snapshot.requiredSetAsides}
                {...sliderBounds(snapshot.requiredSetAsides)}
              />
              <AdjustableAmount
                key={`hardFloorBuffer-${window.startDate}-${snapshot.hardFloorBuffer}`}
                name="hardFloorBuffer"
                label="Minimum buffer protection"
                defaultValue={snapshot.hardFloorBuffer}
                {...sliderBounds(snapshot.hardFloorBuffer)}
              />
              <div className="flex items-center gap-3">
                <button className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90" type="submit">
                  Apply for this fortnight
                </button>
                {snapshot.overriddenFields.length > 0 && (
                  <button formAction={clearFortnightOverrides} className="text-xs text-muted underline">
                    Reset all to calculated values
                  </button>
                )}
              </div>
            </form>
          </details>

          {offset === 0 && (
            <div className="mt-4">
              <SpendingPaceBar label="Money movement (card payments, debt, transfers)" pace={snapshot.moneyMovementPace} />
            </div>
          )}

          <div className="mt-5">
            <p className="text-sm font-medium mb-2">
              {offset === 0 ? "Suggested buckets — live against actual spending" : "Suggested buckets"}
            </p>
            <div className="space-y-4">
              <SpendingPaceBar label="Fun money (coffees, eating out, movies)" pace={snapshot.funMoneyPace} />
              <SpendingPaceBar label="Sewing / hobbies" pace={snapshot.hobbyMoneyPace} />
            </div>
            <div className="space-y-1 text-sm mt-4">
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
                <th className="py-2 pr-4 font-normal">Unallocated</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c) => (
                <tr key={c.style} className={`border-t border-border ${c.style === style ? "bg-primary-soft/40" : ""}`}>
                  <td className="py-2 pr-4 font-medium">{PLANNING_STYLE_LABELS[c.style].short}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatCurrency(c.snapshot.buckets.funMoney)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatCurrency(c.snapshot.buckets.hobbyMoney)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatCurrency(c.snapshot.buckets.holidayContribution)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatCurrency(c.snapshot.buckets.bufferContribution)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatCurrency(c.snapshot.buckets.cardCleanup)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatCurrency(c.snapshot.buckets.leftoverUnallocated)}</td>
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
  adjusted = false,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  indent?: boolean;
  adjusted?: boolean;
}) {
  const negative = amount < 0;
  return (
    <div className={`flex items-center justify-between ${indent ? "pl-3 text-muted" : ""}`}>
      <span className={bold ? "font-semibold text-foreground" : ""}>
        {label} {adjusted && <Pill tone="primary">adjusted</Pill>}
      </span>
      <span className={`tabular-nums ${bold ? "font-semibold text-foreground" : ""} ${negative ? "text-status-red-fg" : ""}`}>
        {negative ? "−" : ""}
        {formatCurrency(Math.abs(amount))}
      </span>
    </div>
  );
}
