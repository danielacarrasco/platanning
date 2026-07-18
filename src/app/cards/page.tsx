import { Accounts, CardStatements } from "@/lib/db/repo";
import { Transactions } from "@/lib/db/transactions";
import { formatCurrency, formatDate } from "@/lib/format";
import { Panel, CardStatusBadge, EmptyState } from "@/components/ui";
import { CARD_STATUS_COPY, calcCardStatus } from "@/lib/calculations";
import { CashBeforeCard } from "@/components/CashBeforeCard";
import { ExportLinks } from "@/components/ExportLinks";
import { createCardStatement, deleteCardStatement } from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const labelCls = "text-xs text-muted block mb-1";
const btnCls = "rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90";

export default function CardsPage() {
  const cardAccounts = Accounts.all().filter((a) => a.type === "credit_card");
  const everydayCash = Accounts.all()
    .filter((a) => a.type === "everyday")
    .reduce((s, a) => s + a.currentBalance, 0);
  const allTransactions = Transactions.list();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Credit Card Control</h1>
        <p className="text-sm text-muted mt-1">
          The goal isn&apos;t to avoid cards — it&apos;s to only use them when the cash already
          exists, and to know immediately when one isn&apos;t.
        </p>
      </div>

      <Panel title="Cash Before Card" subtitle="Log a card purchase and see the consequence, not just a block.">
        {cardAccounts.length === 0 ? (
          <EmptyState>Add a credit card account in Settings first.</EmptyState>
        ) : (
          <CashBeforeCard cardAccounts={cardAccounts} />
        )}
      </Panel>

      {cardAccounts.map((account) => {
        const statements = CardStatements.forCard(account.id);
        const latest = statements[0];
        const status = latest
          ? calcCardStatus({
              purchaseInterestCharged: latest.interestCharged,
              interestFreePaymentDue: latest.interestFreePayment,
              availableCardPaymentCash: everydayCash,
              balance: latest.closingBalance,
            })
          : account.currentBalance > 0
            ? "watch"
            : "clean";

        const sinceStatement = latest
          ? allTransactions.filter((t) => t.accountId === account.id && t.date > latest.statementEnd)
          : allTransactions.filter((t) => t.accountId === account.id);
        const newPurchases = sinceStatement.filter((t) => t.amount < 0 && !t.isCreditCardPayment);
        const paymentsMade = sinceStatement.filter((t) => t.isCreditCardPayment);

        return (
          <Panel
            key={account.id}
            title={account.name}
            subtitle={`${formatCurrency(account.currentBalance)} owed · ${account.interestRate ?? "?"}% purchase rate`}
            action={<CardStatusBadge status={status} />}
          >
            <p className="text-sm text-muted mb-3">{CARD_STATUS_COPY[status].description}</p>

            {latest ? (
              <div className="grid sm:grid-cols-3 gap-3 mb-4 text-sm">
                <Stat label="Statement closing balance" value={formatCurrency(latest.closingBalance)} />
                <Stat label="Purchase balance" value={formatCurrency(latest.purchaseBalance)} />
                <Stat label="Instalment balance" value={formatCurrency(latest.instalmentBalance)} />
                <Stat label="Minimum payment" value={formatCurrency(latest.minimumPayment)} />
                <Stat label="Interest-free payment" value={formatCurrency(latest.interestFreePayment)} />
                <Stat label="Due date" value={formatDate(latest.dueDate)} />
                <Stat label="Interest charged" value={formatCurrency(latest.interestCharged)} />
                <Stat label="Fees charged" value={formatCurrency(latest.feesCharged)} />
                <Stat label="New purchases since statement" value={formatCurrency(Math.abs(newPurchases.reduce((s, t) => s + t.amount, 0)))} />
                <Stat label="Payments made since statement" value={formatCurrency(Math.abs(paymentsMade.reduce((s, t) => s + t.amount, 0)))} />
              </div>
            ) : (
              <EmptyState>No statement logged yet — add one below to get a real risk status.</EmptyState>
            )}

            <details>
              <summary className="cursor-pointer text-sm font-medium text-primary">+ Add / update statement</summary>
              <form action={createCardStatement} className="grid sm:grid-cols-3 gap-3 mt-3">
                <input type="hidden" name="cardAccountId" value={account.id} />
                <Field label="Statement start" name="statementStart" type="date" required />
                <Field label="Statement end" name="statementEnd" type="date" required />
                <Field label="Due date" name="dueDate" type="date" required />
                <Field label="Closing balance" name="closingBalance" required />
                <Field label="Purchase balance" name="purchaseBalance" />
                <Field label="Instalment balance" name="instalmentBalance" />
                <Field label="Minimum payment" name="minimumPayment" required />
                <Field label="Interest-free payment" name="interestFreePayment" required />
                <Field label="Interest charged" name="interestCharged" />
                <Field label="Fees charged" name="feesCharged" />
                <div className="sm:col-span-3">
                  <Field label="Notes" name="notes" type="text" />
                </div>
                <div className="sm:col-span-3">
                  <button className={btnCls} type="submit">Save statement</button>
                </div>
              </form>
            </details>

            {statements.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-muted">Statement history ({statements.length})</summary>
                <ul className="divide-y divide-border mt-2">
                  {statements.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-1.5 text-sm">
                      <span>{formatDate(s.statementEnd)} · {formatCurrency(s.closingBalance)} · due {formatDate(s.dueDate)}</span>
                      <form action={deleteCardStatement}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="text-xs text-status-red-fg underline" type="submit">Remove</button>
                      </form>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Panel>
        );
      })}

      <Panel title="Export">
        <ExportLinks tables={["card-statements"]} />
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-muted p-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
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
