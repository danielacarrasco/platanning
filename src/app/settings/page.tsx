import { Accounts, IncomeSources, Paydays, RecurringExpenses, Debts } from "@/lib/db/repo";
import { getPlanningDefaults, getPlanningStyle } from "@/lib/planning";
import { formatCurrency, formatDate } from "@/lib/format";
import { Panel, Pill } from "@/components/ui";
import { CATEGORIES } from "@/lib/types";
import {
  createAccount,
  deleteAccount,
  updateAccount,
  createIncomeSource,
  deleteIncomeSource,
  createPayday,
  deletePayday,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  createDebt,
  updateDebt,
  deleteDebt,
  updatePlanningStyle,
  updatePlanningDefaults,
} from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const labelCls = "text-xs text-muted block mb-1";
const btnCls =
  "rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90";

export default function SettingsPage() {
  const accounts = Accounts.all();
  const incomeSources = IncomeSources.all();
  const paydays = Paydays.all();
  const recurring = RecurringExpenses.all();
  const debts = Debts.all();
  const style = getPlanningStyle();
  const defaults = getPlanningDefaults();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings &amp; assumptions</h1>
        <p className="text-sm text-muted mt-1">
          Everything here started as an editable example. Change anything to match reality — the
          rest of the app recalculates automatically.
        </p>
      </div>

      <Panel title="Planning style">
        <form action={updatePlanningStyle} className="flex flex-wrap items-end gap-3">
          <div>
            <label className={labelCls}>Style</label>
            <select name="planningStyle" defaultValue={style} className={inputCls}>
              <option value="gentle">Gentle — preserve quality of life</option>
              <option value="balanced">Balanced — moderate debt payoff</option>
              <option value="aggressive">Aggressive — temporary austerity</option>
            </select>
          </div>
          <button className={btnCls} type="submit">Save</button>
        </form>
      </Panel>

      <Panel title="Gentle-plan targets" subtitle="These are the defaults the fortnight planner tries to protect, before any style multiplier.">
        <form action={updatePlanningDefaults} className="grid sm:grid-cols-3 gap-3">
          <Field label="Fun money target ($/week)" name="funMoneyWeekly" defaultValue={defaults.funMoneyWeekly} />
          <Field label="Hobby target ($/fortnight)" name="hobbyFortnightly" defaultValue={defaults.hobbyFortnightly} />
          <Field label="Holiday target ($/month)" name="holidayMonthly" defaultValue={defaults.holidayMonthly} />
          <Field label="Buffer phase 1 target ($)" name="bufferPhase1" defaultValue={defaults.bufferPhase1} />
          <Field label="Buffer phase 2 target ($)" name="bufferPhase2" defaultValue={defaults.bufferPhase2} />
          <Field label="Hard floor never spent below ($)" name="hardFloorBuffer" defaultValue={defaults.hardFloorBuffer} />
          <div className="sm:col-span-3">
            <button className={btnCls} type="submit">Save targets</button>
          </div>
        </form>
      </Panel>

      <Panel title="Accounts">
        <div className="space-y-2 mb-4">
          {accounts.map((a) => (
            <details key={a.id} className="rounded-lg border border-border p-3">
              <summary className="flex items-center justify-between cursor-pointer text-sm">
                <span>
                  {a.name} <Pill>{a.type.replace("_", " ")}</Pill>
                </span>
                <span className="font-medium tabular-nums">{formatCurrency(a.currentBalance)}</span>
              </summary>
              <div className="mt-3 space-y-3">
                <form action={updateAccount} className="grid sm:grid-cols-3 gap-3">
                  <input type="hidden" name="id" value={a.id} />
                  <Field label="Name" name="name" defaultValue={a.name} type="text" />
                  <div>
                    <label className={labelCls}>Type</label>
                    <select name="type" defaultValue={a.type} className={inputCls}>
                      <option value="everyday">Everyday</option>
                      <option value="savings">Savings</option>
                      <option value="offset">Offset</option>
                      <option value="credit_card">Credit card</option>
                      <option value="mortgage">Mortgage</option>
                      <option value="personal_loan">Personal loan</option>
                    </select>
                  </div>
                  <Field label="Current balance" name="currentBalance" defaultValue={a.currentBalance} />
                  <Field label="Interest rate (%)" name="interestRate" defaultValue={a.interestRate ?? ""} />
                  <Field label="Institution" name="institution" defaultValue={a.institution ?? ""} type="text" />
                  <Field label="Notes" name="notes" defaultValue={a.notes ?? ""} type="text" />
                  <div className="sm:col-span-3 flex gap-2">
                    <button className={btnCls} type="submit">Save</button>
                  </div>
                </form>
                <form action={deleteAccount}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="text-xs text-status-red-fg underline" type="submit">
                    Remove account
                  </button>
                </form>
              </div>
            </details>
          ))}
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-primary">+ Add account</summary>
          <form action={createAccount} className="grid sm:grid-cols-3 gap-3 mt-3">
            <Field label="Name" name="name" type="text" required />
            <div>
              <label className={labelCls}>Type</label>
              <select name="type" className={inputCls} required>
                <option value="everyday">Everyday</option>
                <option value="savings">Savings</option>
                <option value="offset">Offset</option>
                <option value="credit_card">Credit card</option>
                <option value="mortgage">Mortgage</option>
                <option value="personal_loan">Personal loan</option>
              </select>
            </div>
            <Field label="Current balance" name="currentBalance" />
            <Field label="Interest rate (%)" name="interestRate" />
            <Field label="Institution" name="institution" type="text" />
            <Field label="Notes" name="notes" type="text" />
            <div className="sm:col-span-3">
              <button className={btnCls} type="submit">Add account</button>
            </div>
          </form>
        </details>
      </Panel>

      <Panel title="Income sources" subtitle="Room rent and any other non-payday income.">
        <ul className="divide-y divide-border mb-3">
          {incomeSources.map((i) => (
            <li key={i.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {i.name} — {formatCurrency(i.amount)} / {i.frequency}
                {i.nextDate ? ` · next ${formatDate(i.nextDate)}` : ""}
              </span>
              <form action={deleteIncomeSource}>
                <input type="hidden" name="id" value={i.id} />
                <button className="text-xs text-status-red-fg underline" type="submit">Remove</button>
              </form>
            </li>
          ))}
        </ul>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-primary">+ Add income source</summary>
          <form action={createIncomeSource} className="grid sm:grid-cols-3 gap-3 mt-3">
            <Field label="Name" name="name" type="text" required />
            <Field label="Amount" name="amount" required />
            <div>
              <label className={labelCls}>Frequency</label>
              <select name="frequency" className={inputCls}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <Field label="Next date" name="nextDate" type="date" />
            <div className="sm:col-span-3">
              <button className={btnCls} type="submit">Add income source</button>
            </div>
          </form>
        </details>
      </Panel>

      <Panel title="Paydays" subtitle="Concrete payday dates drive the fortnight planner's windows.">
        <ul className="divide-y divide-border mb-3">
          {paydays.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2 text-sm">
              <span>{formatDate(p.date)} — {p.source}</span>
              <div className="flex items-center gap-3">
                <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span>
                <form action={deletePayday}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="text-xs text-status-red-fg underline" type="submit">Remove</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-primary">+ Add payday</summary>
          <form action={createPayday} className="grid sm:grid-cols-3 gap-3 mt-3">
            <Field label="Date" name="date" type="date" required />
            <Field label="Amount" name="amount" required />
            <Field label="Source" name="source" type="text" defaultValue="Main + additional income" />
            <div className="sm:col-span-3">
              <button className={btnCls} type="submit">Add payday</button>
            </div>
          </form>
        </details>
      </Panel>

      <Panel title="Recurring expenses" subtitle="Bills, subscriptions, family support — anything on a cycle.">
        <div className="space-y-2 mb-4">
          {recurring.map((r) => (
            <details key={r.id} className="rounded-lg border border-border p-3">
              <summary className="flex items-center justify-between cursor-pointer text-sm">
                <span>
                  {r.name} <Pill>{r.category}</Pill>
                </span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(r.amount)} / {r.frequency}
                </span>
              </summary>
              <div className="mt-3 space-y-3">
                <form action={updateRecurringExpense} className="grid sm:grid-cols-3 gap-3">
                  <input type="hidden" name="id" value={r.id} />
                  <Field label="Name" name="name" defaultValue={r.name} type="text" />
                  <Field label="Amount" name="amount" defaultValue={r.amount} />
                  <div>
                    <label className={labelCls}>Frequency</label>
                    <select name="frequency" defaultValue={r.frequency} className={inputCls}>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                  <Field label="Next due date" name="nextDueDate" defaultValue={r.nextDueDate} type="date" />
                  <div>
                    <label className={labelCls}>Category</label>
                    <select name="category" defaultValue={r.category} className={inputCls}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Importance</label>
                    <select name="importance" defaultValue={r.importance} className={inputCls}>
                      <option value="essential">Essential</option>
                      <option value="important">Important</option>
                      <option value="discretionary">Discretionary</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Amount type</label>
                    <select name="amountType" defaultValue={r.amountType} className={inputCls}>
                      <option value="fixed">Fixed</option>
                      <option value="variable">Variable</option>
                      <option value="estimated">Estimated</option>
                    </select>
                  </div>
                  <Field label="Payment method" name="paymentMethod" defaultValue={r.paymentMethod ?? ""} type="text" />
                  <label className="flex items-center gap-2 text-sm mt-5">
                    <input type="checkbox" name="isEssential" defaultChecked={r.isEssential} /> Essential
                  </label>
                  <label className="flex items-center gap-2 text-sm mt-5">
                    <input type="checkbox" name="canPause" defaultChecked={r.canPause} /> Can pause in a red fortnight
                  </label>
                  <div className="sm:col-span-3">
                    <button className={btnCls} type="submit">Save</button>
                  </div>
                </form>
                <form action={deleteRecurringExpense}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs text-status-red-fg underline" type="submit">Remove</button>
                </form>
              </div>
            </details>
          ))}
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-primary">+ Add recurring expense</summary>
          <form action={createRecurringExpense} className="grid sm:grid-cols-3 gap-3 mt-3">
            <Field label="Name" name="name" type="text" required />
            <Field label="Amount" name="amount" required />
            <div>
              <label className={labelCls}>Frequency</label>
              <select name="frequency" className={inputCls}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <Field label="Next due date" name="nextDueDate" type="date" required />
            <div>
              <label className={labelCls}>Category</label>
              <select name="category" className={inputCls}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Importance</label>
              <select name="importance" className={inputCls} defaultValue="essential">
                <option value="essential">Essential</option>
                <option value="important">Important</option>
                <option value="discretionary">Discretionary</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Amount type</label>
              <select name="amountType" className={inputCls} defaultValue="fixed">
                <option value="fixed">Fixed</option>
                <option value="variable">Variable</option>
                <option value="estimated">Estimated</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm mt-5">
              <input type="checkbox" name="isEssential" defaultChecked /> Essential
            </label>
            <label className="flex items-center gap-2 text-sm mt-5">
              <input type="checkbox" name="canPause" /> Can pause in a red fortnight
            </label>
            <div className="sm:col-span-3">
              <button className={btnCls} type="submit">Add expense</button>
            </div>
          </form>
        </details>
      </Panel>

      <Panel title="Debts" subtitle="Balances, rates and minimums used by Debt Strategy.">
        <div className="space-y-2 mb-4">
          {debts.map((d) => (
            <details key={d.id} className="rounded-lg border border-border p-3">
              <summary className="flex items-center justify-between cursor-pointer text-sm">
                <span>{d.name} <Pill>{d.interestRate.toFixed(2)}%</Pill></span>
                <span className="font-medium tabular-nums">{formatCurrency(d.balance)}</span>
              </summary>
              <div className="mt-3 space-y-3">
                <form action={updateDebt} className="grid sm:grid-cols-3 gap-3">
                  <input type="hidden" name="id" value={d.id} />
                  <Field label="Name" name="name" defaultValue={d.name} type="text" />
                  <Field label="Balance" name="balance" defaultValue={d.balance} />
                  <Field label="Interest rate (%)" name="interestRate" defaultValue={d.interestRate} />
                  <Field label="Minimum payment" name="minimumPayment" defaultValue={d.minimumPayment} />
                  <div>
                    <label className={labelCls}>Payment frequency</label>
                    <select name="paymentFrequency" defaultValue={d.paymentFrequency} className={inputCls}>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <Field label="Next payment date" name="nextPaymentDate" defaultValue={d.nextPaymentDate ?? ""} type="date" />
                  <label className="flex items-center gap-2 text-sm mt-5">
                    <input type="checkbox" name="isPromotional" defaultChecked={d.isPromotional} /> 0% promotional
                  </label>
                  <div className="sm:col-span-3">
                    <button className={btnCls} type="submit">Save</button>
                  </div>
                </form>
                <form action={deleteDebt}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="text-xs text-status-red-fg underline" type="submit">Remove</button>
                </form>
              </div>
            </details>
          ))}
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-primary">+ Add debt</summary>
          <form action={createDebt} className="grid sm:grid-cols-3 gap-3 mt-3">
            <Field label="Name" name="name" type="text" required />
            <Field label="Balance" name="balance" required />
            <Field label="Interest rate (%)" name="interestRate" required />
            <Field label="Minimum payment" name="minimumPayment" required />
            <div>
              <label className={labelCls}>Payment frequency</label>
              <select name="paymentFrequency" className={inputCls}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Debt type</label>
              <select name="debtType" className={inputCls}>
                <option value="credit_card_purchase">Credit card purchase</option>
                <option value="credit_card_instalment">Credit card instalment</option>
                <option value="personal_loan">Personal loan</option>
                <option value="mortgage">Mortgage</option>
              </select>
            </div>
            <Field label="Next payment date" name="nextPaymentDate" type="date" />
            <label className="flex items-center gap-2 text-sm mt-5">
              <input type="checkbox" name="isPromotional" /> 0% promotional
            </label>
            <div className="sm:col-span-3">
              <button className={btnCls} type="submit">Add debt</button>
            </div>
          </form>
        </details>
      </Panel>
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
