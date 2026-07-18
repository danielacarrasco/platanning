import { SinkingFunds } from "@/lib/db/repo";
import { formatCurrency, formatDate } from "@/lib/format";
import { Panel, ProgressBar, Pill } from "@/components/ui";
import { ExportLinks } from "@/components/ExportLinks";
import { createSinkingFund, updateSinkingFund, contributeToSinkingFund, deleteSinkingFund } from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const labelCls = "text-xs text-muted block mb-1";
const btnCls = "rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90";

export default function GoalsPage() {
  const funds = SinkingFunds.all();
  const joyFunds = funds.filter((f) => f.name.includes("Sewing") || f.name.includes("Holiday"));
  const leakFunds = funds.filter((f) => !joyFunds.includes(f));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Goals &amp; Sinking Funds</h1>
        <p className="text-sm text-muted mt-1">
          Money set aside on purpose isn&apos;t a leak — it&apos;s a plan. Joy spending gets its
          own line so it stays deliberate instead of accidental.
        </p>
      </div>

      <Panel title="Deliberate joy" subtitle="Preserved on purpose, not shamed.">
        <div className="grid sm:grid-cols-2 gap-4">
          {joyFunds.map((f) => (
            <FundCard key={f.id} fund={f} />
          ))}
        </div>
      </Panel>

      <Panel title="Everything else" subtitle="Buffers, bills, and irregular expenses.">
        <div className="grid sm:grid-cols-2 gap-4">
          {leakFunds.map((f) => (
            <FundCard key={f.id} fund={f} />
          ))}
        </div>
      </Panel>

      <Panel title="Add a sinking fund">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-primary">+ New fund</summary>
          <form action={createSinkingFund} className="grid sm:grid-cols-3 gap-3 mt-3">
            <Field label="Name" name="name" type="text" required />
            <Field label="Target amount" name="targetAmount" required />
            <Field label="Current amount" name="currentAmount" />
            <Field label="Fortnightly contribution" name="fortnightlyContribution" />
            <Field label="Target date" name="targetDate" type="date" />
            <Field label="Priority (1 = highest)" name="priority" defaultValue={5} />
            <label className="flex items-center gap-2 text-sm mt-5">
              <input type="checkbox" name="canPauseInRedFortnight" defaultChecked /> Can pause in a red fortnight
            </label>
            <div className="sm:col-span-3">
              <Field label="Notes" name="notes" type="text" />
            </div>
            <div className="sm:col-span-3">
              <button className={btnCls} type="submit">Add fund</button>
            </div>
          </form>
        </details>
      </Panel>

      <Panel title="Export">
        <ExportLinks tables={["sinking-funds"]} />
      </Panel>
    </div>
  );
}

function FundCard({ fund }: { fund: ReturnType<typeof SinkingFunds.all>[number] }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="font-medium">{fund.name}</p>
        {fund.canPauseInRedFortnight ? <Pill>can pause</Pill> : <Pill tone="primary">protected</Pill>}
      </div>
      <p className="text-sm text-muted mb-2">
        {formatCurrency(fund.currentAmount)} / {formatCurrency(fund.targetAmount)}
        {fund.targetDate && ` · by ${formatDate(fund.targetDate)}`}
      </p>
      <ProgressBar value={fund.currentAmount} max={fund.targetAmount} />
      {fund.notes && <p className="text-xs text-muted mt-2">{fund.notes}</p>}
      <div className="flex items-center gap-3 mt-3">
        <form action={contributeToSinkingFund} className="flex items-center gap-2">
          <input type="hidden" name="id" value={fund.id} />
          <input name="amount" type="number" step="0.01" placeholder="Add $" className={`${inputCls} w-24`} />
          <button className="text-xs rounded-lg border border-border px-2.5 py-1.5 hover:bg-surface-muted" type="submit">
            Add
          </button>
        </form>
        <details className="ml-auto">
          <summary className="cursor-pointer text-xs text-muted">Edit</summary>
          <form action={updateSinkingFund} className="grid grid-cols-2 gap-2 mt-2">
            <input type="hidden" name="id" value={fund.id} />
            <Field label="Target" name="targetAmount" defaultValue={fund.targetAmount} />
            <Field label="Fortnightly" name="fortnightlyContribution" defaultValue={fund.fortnightlyContribution} />
            <Field label="Target date" name="targetDate" defaultValue={fund.targetDate ?? ""} type="date" />
            <Field label="Priority" name="priority" defaultValue={fund.priority} />
            <label className="flex items-center gap-2 text-xs col-span-2">
              <input type="checkbox" name="canPauseInRedFortnight" defaultChecked={fund.canPauseInRedFortnight} /> Can pause in red fortnight
            </label>
            <div className="col-span-2">
              <button className={btnCls} type="submit">Save</button>
            </div>
          </form>
          <form action={deleteSinkingFund} className="mt-2">
            <input type="hidden" name="id" value={fund.id} />
            <button className="text-xs text-status-red-fg underline" type="submit">Remove fund</button>
          </form>
        </details>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "number",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        className={inputCls}
        name={name}
        type={type}
        defaultValue={defaultValue}
        step={type === "number" ? "0.01" : undefined}
        required={required}
      />
    </div>
  );
}
