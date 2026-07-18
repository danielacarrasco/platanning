import { RecurringExpenses, Debts, Accounts } from "@/lib/db/repo";
import { buildFortnightSnapshot, getPlanningDefaults, getPlanningStyle, listWindows } from "@/lib/planning";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/format";
import { FortnightStatusBadge, Panel, Pill, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function BillsCalendarPage() {
  const style = getPlanningStyle();
  const defaults = getPlanningDefaults();
  const windows = listWindows(6); // ~3 months
  const snapshots = windows.map((w) => buildFortnightSnapshot(w, style, defaults));
  const recurring = RecurringExpenses.all();
  const debts = Debts.all();
  const accounts = Accounts.all();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Bills Calendar</h1>
        <p className="text-sm text-muted mt-1">
          Every obligation converted to real due dates, grouped by the fortnight it lands in.
          Heavy fortnights are flagged so nothing surprises you.
        </p>
      </div>

      <div className="grid gap-3">
        {snapshots.map((s, i) => {
          const items = [...s.billItems, ...s.debtItems, ...s.cardItems].sort((a, b) =>
            a.date < b.date ? -1 : 1
          );
          const total = items.reduce((sum, it) => sum + it.amount, 0);
          return (
            <Panel
              key={i}
              title={`${formatDate(s.window.startDate)} – ${formatDate(s.window.endDate)}`}
              action={
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular-nums">{formatCurrency(total)}</span>
                  <FortnightStatusBadge status={s.status} compact />
                </div>
              }
            >
              {items.length === 0 ? (
                <EmptyState>Nothing due.</EmptyState>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between py-1.5 text-sm">
                      <span>
                        {item.name} <span className="text-muted">· {formatDateShort(item.date)}</span>
                        {item.category && <Pill>{item.category}</Pill>}
                      </span>
                      <span className="tabular-nums font-medium">{formatCurrency(item.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          );
        })}
      </div>

      <Panel title="All recurring bills" subtitle="Reference list — edit these in Settings.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-2 pr-4 font-normal">Name</th>
                <th className="py-2 pr-4 font-normal">Amount</th>
                <th className="py-2 pr-4 font-normal">Frequency</th>
                <th className="py-2 pr-4 font-normal">Next due</th>
                <th className="py-2 pr-4 font-normal">Category</th>
                <th className="py-2 pr-4 font-normal">Payment method</th>
                <th className="py-2 pr-4 font-normal">Type</th>
                <th className="py-2 pr-4 font-normal">Importance</th>
              </tr>
            </thead>
            <tbody>
              {recurring.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2 pr-4">{r.name}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatCurrency(r.amount)}</td>
                  <td className="py-2 pr-4 capitalize">{r.frequency}</td>
                  <td className="py-2 pr-4">{formatDateShort(r.nextDueDate)}</td>
                  <td className="py-2 pr-4">{r.category}</td>
                  <td className="py-2 pr-4">{r.paymentMethod ?? "—"}</td>
                  <td className="py-2 pr-4 capitalize">{r.amountType}</td>
                  <td className="py-2 pr-4 capitalize">{r.importance}</td>
                </tr>
              ))}
              {debts
                .filter((d) => d.balance > 0)
                .map((d) => (
                  <tr key={`debt-${d.id}`} className="border-t border-border">
                    <td className="py-2 pr-4">{d.name} (minimum)</td>
                    <td className="py-2 pr-4 tabular-nums">{formatCurrency(d.minimumPayment)}</td>
                    <td className="py-2 pr-4 capitalize">{d.paymentFrequency}</td>
                    <td className="py-2 pr-4">{d.nextPaymentDate ? formatDateShort(d.nextPaymentDate) : "—"}</td>
                    <td className="py-2 pr-4">Credit card / debt management</td>
                    <td className="py-2 pr-4">
                      {accounts.find((a) => a.id === d.accountId)?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-4">fixed</td>
                    <td className="py-2 pr-4">essential</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
