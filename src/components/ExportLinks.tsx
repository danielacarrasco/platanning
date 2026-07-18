const LABELS: Record<string, string> = {
  transactions: "All transactions",
  "monthly-summary": "Monthly spending summary",
  "fortnight-plans": "Fortnight plans",
  bills: "Bills calendar",
  "recurring-expenses": "Recurring expenses",
  debts: "Debt balances & payments",
  "sinking-funds": "Sinking funds",
  "card-statements": "Credit card statements",
  "monthly-reviews": "Monthly reviews",
  accounts: "Accounts",
  backup: "Full backup (all tables)",
};

export function ExportLinks({ tables }: { tables: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tables.map((t) => (
        <a
          key={t}
          href={`/api/export/${t}`}
          className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-muted"
        >
          ⬇ {LABELS[t] ?? t}
        </a>
      ))}
    </div>
  );
}
