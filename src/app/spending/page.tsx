import { Transactions } from "@/lib/db/transactions";
import { Accounts } from "@/lib/db/repo";
import { formatCurrency, formatDate } from "@/lib/format";
import { Panel, Pill, EmptyState } from "@/components/ui";
import { CATEGORIES } from "@/lib/types";
import { createTransaction, deleteTransaction, updateTransaction, importTransactionsCsv } from "./actions";
import { ExportLinks } from "@/components/ExportLinks";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const labelCls = "text-xs text-muted block mb-1";
const btnCls = "rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90";

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const categoryFilter = typeof params.category === "string" ? params.category : undefined;

  const allTransactions = Transactions.list();
  const transactions = categoryFilter ? allTransactions.filter((t) => t.category === categoryFilter) : allTransactions;
  const accounts = Accounts.all();

  // Category breakdown for the current calendar month, excluding money movements
  // that aren't "real" spending (transfers, card payments, debt principal).
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = allTransactions.filter((t) => t.date.startsWith(monthPrefix));
  const realSpend = thisMonth.filter(
    (t) => !t.isTransfer && !t.isCreditCardPayment && !t.isDebtPayment && t.amount < 0
  );
  const byCategory = new Map<string, number>();
  for (const t of realSpend) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + Math.abs(t.amount));
  }
  const totalRealSpend = [...byCategory.values()].reduce((s, v) => s + v, 0);
  const totalMoneyMovement = thisMonth
    .filter((t) => t.isTransfer || t.isCreditCardPayment || t.isDebtPayment)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Spending Tracker</h1>
        <p className="text-sm text-muted mt-1">
          Real spending, credit card payments, and transfers between your own accounts are kept
          separate so nothing gets counted twice.
        </p>
      </div>

      <Panel title="This month at a glance">
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg bg-surface-muted p-3">
            <p className="text-xs text-muted">Real spending (excl. transfers &amp; debt payments)</p>
            <p className="text-lg font-semibold">{formatCurrency(totalRealSpend)}</p>
          </div>
          <div className="rounded-lg bg-surface-muted p-3">
            <p className="text-xs text-muted">Money movement (card payments, debt, transfers)</p>
            <p className="text-lg font-semibold">{formatCurrency(totalMoneyMovement)}</p>
          </div>
        </div>
        <div className="mb-4">
          <ExportLinks tables={["transactions", "monthly-summary"]} />
        </div>
        {byCategory.size > 0 && (
          <ul className="space-y-1.5">
            {[...byCategory.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amount]) => (
                <li key={cat} className="flex items-center justify-between text-sm">
                  <a href={`/spending?category=${encodeURIComponent(cat)}`} className="hover:underline">
                    {cat}
                  </a>
                  <span className="tabular-nums font-medium">{formatCurrency(amount)}</span>
                </li>
              ))}
          </ul>
        )}
      </Panel>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Add a transaction">
          <form action={createTransaction} className="grid grid-cols-2 gap-3">
            <Field label="Date" name="date" type="date" required />
            <Field label="Amount (− for spending)" name="amount" required />
            <div className="col-span-2">
              <Field label="Description" name="description" type="text" required />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select name="category" className={inputCls} defaultValue="Discretionary life">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Account</label>
              <select name="accountId" className={inputCls} defaultValue="">
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDiscretionary" /> Discretionary</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFamilySupport" /> Family support</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isTransfer" /> Transfer between own accounts</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isCreditCardPayment" /> Credit card payment</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDebtPayment" /> Debt principal payment</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isInterest" /> Interest charged</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFee" /> Fee</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPlanned" /> Planned purchase</label>
            <div className="col-span-2">
              <button className={btnCls} type="submit">Add transaction</button>
            </div>
          </form>
        </Panel>

        <Panel title="Import from CSV" subtitle="Columns: date, description, amount (or debit/credit). Category is guessed and can be corrected below.">
          <ImportForm />
        </Panel>
      </div>

      <Panel
        title="Transactions"
        subtitle={categoryFilter ? `Filtered: ${categoryFilter}` : undefined}
        action={categoryFilter ? <a href="/spending" className="text-sm text-primary">Clear filter</a> : undefined}
      >
        {transactions.length === 0 ? (
          <EmptyState>No transactions yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {transactions.slice(0, 100).map((t) => (
              <li key={t.id} className="py-2">
                <details>
                  <summary className="flex items-center justify-between text-sm cursor-pointer gap-2">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {t.description} <span className="text-muted">· {formatDate(t.date)}</span>
                      <Pill>{t.category}</Pill>
                      {t.isTransfer && <Pill>transfer</Pill>}
                      {t.isCreditCardPayment && <Pill>card payment</Pill>}
                      {t.isDebtPayment && <Pill>debt payment</Pill>}
                      {t.isInterest && <Pill>interest</Pill>}
                      {t.isFamilySupport && <Pill tone="primary">family support</Pill>}
                    </span>
                    <span className={`tabular-nums font-medium ${t.amount < 0 ? "text-status-red-fg" : ""}`}>
                      {formatCurrency(t.amount)}
                    </span>
                  </summary>
                  <form action={updateTransaction} className="grid grid-cols-2 gap-2 mt-3 text-sm">
                    <input type="hidden" name="id" value={t.id} />
                    <Field label="Date" name="date" type="date" defaultValue={t.date} />
                    <Field label="Amount" name="amount" defaultValue={t.amount} />
                    <div className="col-span-2">
                      <Field label="Description" name="description" type="text" defaultValue={t.description} />
                    </div>
                    <div>
                      <label className={labelCls}>Category</label>
                      <select name="category" defaultValue={t.category} className={inputCls}>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2"><input type="checkbox" name="isDiscretionary" defaultChecked={t.isDiscretionary} /> Discretionary</label>
                    <label className="flex items-center gap-2"><input type="checkbox" name="isFamilySupport" defaultChecked={t.isFamilySupport} /> Family support</label>
                    <label className="flex items-center gap-2"><input type="checkbox" name="isTransfer" defaultChecked={t.isTransfer} /> Transfer</label>
                    <label className="flex items-center gap-2"><input type="checkbox" name="isCreditCardPayment" defaultChecked={t.isCreditCardPayment} /> Card payment</label>
                    <label className="flex items-center gap-2"><input type="checkbox" name="isDebtPayment" defaultChecked={t.isDebtPayment} /> Debt payment</label>
                    <label className="flex items-center gap-2"><input type="checkbox" name="isInterest" defaultChecked={t.isInterest} /> Interest</label>
                    <label className="flex items-center gap-2"><input type="checkbox" name="isFee" defaultChecked={t.isFee} /> Fee</label>
                    <label className="flex items-center gap-2"><input type="checkbox" name="isPlanned" defaultChecked={t.isPlanned} /> Planned</label>
                    <div className="col-span-2 flex gap-2">
                      <button className={btnCls} type="submit">Save</button>
                    </div>
                  </form>
                  <form action={deleteTransaction} className="mt-2">
                    <input type="hidden" name="id" value={t.id} />
                    <button className="text-xs text-status-red-fg underline" type="submit">Delete</button>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function ImportForm() {
  async function action(fd: FormData) {
    "use server";
    await importTransactionsCsv(fd);
  }
  return (
    <form action={action} className="space-y-3">
      <input
        type="file"
        name="file"
        accept=".csv,text/csv"
        required
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-1.5"
      />
      <button className={btnCls} type="submit">Import CSV</button>
      <p className="text-xs text-muted">
        Imported rows are marked &quot;Imported from CSV — check category&quot; in notes so
        they&apos;re easy to find and correct.
      </p>
    </form>
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
