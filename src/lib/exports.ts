import { toCsv } from "./csv";
import { Accounts, Debts, SinkingFunds, CardStatements, MonthlyReviews, RecurringExpenses } from "./db/repo";
import { Transactions, type TransactionFilter } from "./db/transactions";
import { listWindows, buildFortnightSnapshot, getPlanningStyle, getPlanningDefaults } from "./planning";

export function exportTransactionsCsv(filter: TransactionFilter = {}): string {
  const rows = Transactions.list(filter);
  return toCsv(
    rows as unknown as Record<string, unknown>[],
    [
      "id", "date", "description", "amount", "merchant", "category", "subcategory",
      "isTransfer", "isCreditCardPayment", "isDebtPayment", "isInterest", "isFee",
      "isDiscretionary", "isFamilySupport", "isPlanned", "fundingSource", "notes",
    ]
  );
}

export function exportMonthlySummaryCsv(): string {
  const rows = Transactions.list();
  const byMonth = new Map<string, Record<string, number>>();
  for (const t of rows) {
    const month = t.date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, {});
    const bucket = byMonth.get(month)!;
    bucket[t.category] = (bucket[t.category] ?? 0) + t.amount;
  }
  const months = [...byMonth.keys()].sort();
  const categories = [...new Set(rows.map((r) => r.category))].sort();
  const out = months.map((month) => {
    const bucket = byMonth.get(month)!;
    const row: Record<string, unknown> = { month };
    for (const c of categories) row[c] = (bucket[c] ?? 0).toFixed(2);
    return row;
  });
  return toCsv(out, ["month", ...categories]);
}

export function exportFortnightPlansCsv(): string {
  const windows = listWindows(6);
  const style = getPlanningStyle();
  const defaults = getPlanningDefaults();
  const rows = windows.map((w) => {
    const s = buildFortnightSnapshot(w, style, defaults);
    return {
      startDate: s.window.startDate,
      endDate: s.window.endDate,
      planningStyle: s.planningStyle,
      income: s.income,
      startingCash: s.startingCash,
      billsDue: s.billsDue,
      requiredDebtPayments: s.requiredDebtPayments,
      cardPayments: s.cardPayments,
      requiredSetAsides: s.requiredSetAsides,
      funMoney: s.buckets.funMoney,
      hobbyMoney: s.buckets.hobbyMoney,
      holidayContribution: s.buckets.holidayContribution,
      bufferContribution: s.buckets.bufferContribution,
      cardCleanup: s.buckets.cardCleanup,
      endingCashForecast: s.endingCashForecast,
      status: s.status,
    };
  });
  return toCsv(rows, [
    "startDate", "endDate", "planningStyle", "income", "startingCash", "billsDue",
    "requiredDebtPayments", "cardPayments", "requiredSetAsides", "funMoney", "hobbyMoney",
    "holidayContribution", "bufferContribution", "cardCleanup", "endingCashForecast", "status",
  ]);
}

export function exportBillsCalendarCsv(): string {
  const windows = listWindows(6);
  const style = getPlanningStyle();
  const defaults = getPlanningDefaults();
  const rows: Record<string, unknown>[] = [];
  for (const w of windows) {
    const s = buildFortnightSnapshot(w, style, defaults);
    for (const item of [...s.billItems, ...s.debtItems, ...s.cardItems]) {
      rows.push({ date: item.date, name: item.name, amount: item.amount, category: item.category ?? "" });
    }
  }
  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return toCsv(rows, ["date", "name", "amount", "category"]);
}

export function exportRecurringExpensesCsv(): string {
  return toCsv(RecurringExpenses.all() as unknown as Record<string, unknown>[], [
    "id", "name", "amount", "frequency", "nextDueDate", "category", "isEssential", "canPause",
    "importance", "amountType", "paymentMethod", "notes",
  ]);
}

export function exportDebtsCsv(): string {
  return toCsv(Debts.all() as unknown as Record<string, unknown>[], [
    "id", "name", "balance", "interestRate", "minimumPayment", "paymentFrequency", "debtType",
    "nextPaymentDate", "isPromotional", "promotionalEndDate", "notes",
  ]);
}

export function exportSinkingFundsCsv(): string {
  return toCsv(SinkingFunds.all() as unknown as Record<string, unknown>[], [
    "id", "name", "targetAmount", "currentAmount", "targetDate", "fortnightlyContribution",
    "priority", "canPauseInRedFortnight", "notes",
  ]);
}

export function exportCardStatementsCsv(): string {
  return toCsv(CardStatements.all() as unknown as Record<string, unknown>[], [
    "id", "cardAccountId", "statementStart", "statementEnd", "closingBalance", "minimumPayment",
    "interestFreePayment", "dueDate", "purchaseBalance", "instalmentBalance", "interestCharged",
    "feesCharged", "status", "notes",
  ]);
}

export function exportMonthlyReviewsCsv(): string {
  return toCsv(MonthlyReviews.all() as unknown as Record<string, unknown>[], [
    "month", "totalIncome", "totalFixed", "totalDiscretionary", "totalCardSpending",
    "cardInterestPaid", "debtBalanceChange", "emergencyBufferChange", "holidayFundChange",
    "biggestOverspendCategory", "bestValueCategory", "recommendedAction", "narrative",
  ]);
}

export function exportAccountsCsv(): string {
  return toCsv(Accounts.all() as unknown as Record<string, unknown>[], [
    "id", "name", "type", "institution", "currentBalance", "interestRate", "creditLimit", "notes",
  ]);
}

export function exportFullBackupCsv(): string {
  const sections: [string, string][] = [
    ["accounts", exportAccountsCsv()],
    ["transactions", exportTransactionsCsv()],
    ["recurring_expenses", exportRecurringExpensesCsv()],
    ["debts", exportDebtsCsv()],
    ["sinking_funds", exportSinkingFundsCsv()],
    ["credit_card_statements", exportCardStatementsCsv()],
    ["fortnight_plans", exportFortnightPlansCsv()],
    ["monthly_reviews", exportMonthlyReviewsCsv()],
  ];
  return sections.map(([name, csv]) => `## ${name}\n${csv}`).join("\n\n");
}
