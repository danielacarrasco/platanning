import type Database from "better-sqlite3";
import { conversions } from "../calculations";
import { DEFAULT_PLANNING_DEFAULTS } from "../calculations";

/**
 * One-time example seed matching the starting assumptions in the product
 * spec. Everything here is fully editable afterwards in Settings — this
 * only exists so the app is useful on first load instead of empty.
 */
export function seedIfEmpty(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) as c FROM account").get() as { c: number };
  if (count.c > 0) return;

  const today = new Date();

  const insertAccount = db.prepare(
    `INSERT INTO account (name, type, institution, current_balance, interest_rate, credit_limit, notes)
     VALUES (@name, @type, @institution, @currentBalance, @interestRate, @creditLimit, @notes)`
  );
  const everyday1 = insertAccount.run({
    name: "Everyday account 1",
    type: "everyday",
    institution: null,
    currentBalance: 1392.51,
    interestRate: null,
    creditLimit: null,
    notes: null,
  });
  const everyday2 = insertAccount.run({
    name: "Everyday account 2",
    type: "everyday",
    institution: null,
    currentBalance: 4692.71,
    interestRate: null,
    creditLimit: null,
    notes: null,
  });
  insertAccount.run({
    name: "Savings / offset",
    type: "offset",
    institution: null,
    currentBalance: 0,
    interestRate: null,
    creditLimit: null,
    notes: "Emergency buffer + holiday fund live here.",
  });
  const westpac = insertAccount.run({
    name: "Westpac card",
    type: "credit_card",
    institution: "Westpac",
    currentBalance: 9917,
    interestRate: 20.99,
    creditLimit: null,
    notes: "Purchase rate 20.99%. May include 0%/9.99% instalment components — split these out once known.",
  });
  const qantas = insertAccount.run({
    name: "Qantas card",
    type: "credit_card",
    institution: "Qantas",
    currentBalance: 3529,
    interestRate: 20.99,
    creditLimit: null,
    notes: "Retail purchase rate 20.99%. May include 0%/9.99% instalment components — split these out once known.",
  });
  const ing = insertAccount.run({
    name: "ING personal loan",
    type: "personal_loan",
    institution: "ING",
    currentBalance: 11885.54,
    interestRate: 15.49,
    creditLimit: null,
    notes: null,
  });
  const otherLoan = insertAccount.run({
    name: "Other personal loan",
    type: "personal_loan",
    institution: null,
    currentBalance: 30000,
    interestRate: 12,
    creditLimit: null,
    notes: null,
  });
  const mortgage = insertAccount.run({
    name: "Mortgage",
    type: "mortgage",
    institution: null,
    currentBalance: 556000,
    interestRate: 6.56,
    creditLimit: null,
    notes: null,
  });

  // Income
  const insertIncome = db.prepare(
    `INSERT INTO income_source (name, amount, frequency, next_date, account_id, notes)
     VALUES (@name, @amount, @frequency, @nextDate, @accountId, @notes)`
  );
  insertIncome.run({
    name: "Main income",
    amount: 3541.88,
    frequency: "fortnightly",
    nextDate: nextFriday(),
    accountId: everyday1.lastInsertRowid,
    notes: null,
  });
  insertIncome.run({
    name: "Additional income",
    amount: 1670,
    frequency: "fortnightly",
    nextDate: nextFriday(),
    accountId: everyday1.lastInsertRowid,
    notes: null,
  });
  insertIncome.run({
    name: "Room rent income",
    amount: 1100,
    frequency: "monthly",
    nextDate: firstOfNextMonth(),
    accountId: everyday2.lastInsertRowid,
    notes: null,
  });

  // Paydays (6 upcoming fortnightly paydays combining main + additional income)
  const insertPayday = db.prepare("INSERT INTO payday (date, amount, source) VALUES (?, ?, ?)");
  let payDate = new Date(nextFriday());
  for (let i = 0; i < 6; i++) {
    insertPayday.run(
      payDate.toISOString().slice(0, 10),
      3541.88 + 1670,
      "Main + additional income"
    );
    payDate = new Date(payDate);
    payDate.setDate(payDate.getDate() + 14);
  }

  // Debts (used by Debt Strategy). Card debts reflect total balance owed at
  // the purchase/retail rate given — split into purchase vs instalment once
  // actual statement data is entered in Credit Card Control.
  const insertDebt = db.prepare(
    `INSERT INTO debt (name, account_id, balance, interest_rate, minimum_payment, payment_frequency, debt_type, next_payment_date, is_promotional, notes)
     VALUES (@name, @accountId, @balance, @interestRate, @minimumPayment, @paymentFrequency, @debtType, @nextPaymentDate, @isPromotional, @notes)`
  );
  insertDebt.run({
    name: "Westpac card balance",
    accountId: westpac.lastInsertRowid,
    balance: 9917,
    interestRate: 20.99,
    minimumPayment: round2(9917 * 0.025),
    paymentFrequency: "monthly",
    debtType: "credit_card_purchase",
    nextPaymentDate: addDays(today, 18),
    isPromotional: 0,
    notes: "Estimated minimum (2.5% of balance) — replace with real statement minimum in Credit Card Control.",
  });
  insertDebt.run({
    name: "Qantas card balance",
    accountId: qantas.lastInsertRowid,
    balance: 3529,
    interestRate: 20.99,
    minimumPayment: round2(3529 * 0.025),
    paymentFrequency: "monthly",
    debtType: "credit_card_purchase",
    nextPaymentDate: addDays(today, 22),
    isPromotional: 0,
    notes: "Estimated minimum (2.5% of balance) — replace with real statement minimum in Credit Card Control.",
  });
  insertDebt.run({
    name: "ING loan",
    accountId: ing.lastInsertRowid,
    balance: 11885.54,
    interestRate: 15.49,
    minimumPayment: 279,
    paymentFrequency: "fortnightly",
    debtType: "personal_loan",
    nextPaymentDate: nextFriday(),
    isPromotional: 0,
    notes: "Pay off first — freed $279/fortnight rolls into the other loan.",
  });
  insertDebt.run({
    name: "Other loan",
    accountId: otherLoan.lastInsertRowid,
    balance: 30000,
    interestRate: 12,
    minimumPayment: 300,
    paymentFrequency: "fortnightly",
    debtType: "personal_loan",
    nextPaymentDate: nextFriday(),
    isPromotional: 0,
    notes: null,
  });
  insertDebt.run({
    name: "Mortgage",
    accountId: mortgage.lastInsertRowid,
    balance: 556000,
    interestRate: 6.56,
    minimumPayment: 805,
    paymentFrequency: "weekly",
    debtType: "mortgage",
    nextPaymentDate: addDays(today, 3),
    isPromotional: 0,
    notes: "Keep on normal repayment only — no extra repayments while higher-interest debt exists.",
  });

  // Recurring expenses
  const insertRecurring = db.prepare(
    `INSERT INTO recurring_expense
      (name, amount, frequency, next_due_date, category, account_id, is_essential, can_pause, importance, amount_type, payment_method, notes)
     VALUES (@name, @amount, @frequency, @nextDueDate, @category, @accountId, @isEssential, @canPause, @importance, @amountType, @paymentMethod, @notes)`
  );
  const recurring: {
    name: string;
    amount: number;
    frequency: string;
    daysOut: number;
    category: string;
    isEssential: 0 | 1;
    canPause: 0 | 1;
    importance: string;
    amountType: string;
    paymentMethod?: string;
  }[] = [
    { name: "Mum / family support", amount: 2000, frequency: "monthly", daysOut: 10, category: "Family support", isEssential: 1, canPause: 0, importance: "essential", amountType: "fixed", paymentMethod: "Bank transfer" },
    { name: "Therapy", amount: 640, frequency: "fortnightly", daysOut: 5, category: "Essential fixed", isEssential: 1, canPause: 0, importance: "essential", amountType: "fixed", paymentMethod: "Direct debit" },
    { name: "Groceries", amount: 150, frequency: "weekly", daysOut: 2, category: "Essential variable", isEssential: 1, canPause: 0, importance: "essential", amountType: "variable", paymentMethod: "Debit card" },
    { name: "Utilities", amount: 300, frequency: "monthly", daysOut: 14, category: "Essential fixed", isEssential: 1, canPause: 0, importance: "essential", amountType: "estimated", paymentMethod: "Direct debit" },
    { name: "Body corporate / rates (H1)", amount: 1400, frequency: "annual", daysOut: 40, category: "Essential fixed", isEssential: 1, canPause: 0, importance: "essential", amountType: "fixed", paymentMethod: "Bank transfer" },
    { name: "Body corporate / rates (H2)", amount: 1400, frequency: "annual", daysOut: 220, category: "Essential fixed", isEssential: 1, canPause: 0, importance: "essential", amountType: "fixed", paymentMethod: "Bank transfer" },
    { name: "Insurance", amount: 25, frequency: "monthly", daysOut: 8, category: "Essential fixed", isEssential: 1, canPause: 0, importance: "essential", amountType: "fixed", paymentMethod: "Direct debit" },
    { name: "Transport", amount: 100, frequency: "monthly", daysOut: 6, category: "Essential variable", isEssential: 1, canPause: 0, importance: "essential", amountType: "estimated", paymentMethod: "Debit card" },
    { name: "Cat", amount: 150, frequency: "monthly", daysOut: 12, category: "Essential variable", isEssential: 1, canPause: 0, importance: "essential", amountType: "estimated", paymentMethod: "Debit card" },
    { name: "Subscriptions", amount: 250, frequency: "monthly", daysOut: 9, category: "Essential fixed", isEssential: 0, canPause: 1, importance: "important", amountType: "fixed", paymentMethod: "Card" },
    { name: "Land tax", amount: 550, frequency: "quarterly", daysOut: 60, category: "Essential fixed", isEssential: 1, canPause: 0, importance: "essential", amountType: "fixed", paymentMethod: "Bank transfer" },
    { name: "Medical / pharmacy", amount: 350, frequency: "monthly", daysOut: 15, category: "Essential variable", isEssential: 1, canPause: 0, importance: "essential", amountType: "variable", paymentMethod: "Card" },
    { name: "Home / apartment extras", amount: 1000, frequency: "annual", daysOut: 150, category: "Home", isEssential: 0, canPause: 1, importance: "important", amountType: "estimated", paymentMethod: "Card" },
  ];
  for (const r of recurring) {
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + r.daysOut);
    insertRecurring.run({
      name: r.name,
      amount: r.amount,
      frequency: r.frequency,
      nextDueDate: dueDate.toISOString().slice(0, 10),
      category: r.category,
      accountId: null,
      isEssential: r.isEssential,
      canPause: r.canPause,
      importance: r.importance,
      amountType: r.amountType,
      paymentMethod: r.paymentMethod ?? null,
      notes: null,
    });
  }

  // Sinking funds
  const insertFund = db.prepare(
    `INSERT INTO sinking_fund
      (name, target_amount, current_amount, target_date, fortnightly_contribution, priority, can_pause_in_red_fortnight, notes)
     VALUES (@name, @targetAmount, @currentAmount, @targetDate, @fortnightlyContribution, @priority, @canPauseInRedFortnight, @notes)`
  );
  const holidayTargetDate = new Date(today);
  holidayTargetDate.setMonth(holidayTargetDate.getMonth() + 6);
  const funds: {
    name: string;
    targetAmount: number;
    fortnightlyContribution: number;
    priority: number;
    canPause: 0 | 1;
    targetDate: string | null;
    notes: string | null;
  }[] = [
    { name: "Emergency buffer", targetAmount: DEFAULT_PLANNING_DEFAULTS.bufferPhase1, fortnightlyContribution: 100, priority: 1, canPause: 0, targetDate: null, notes: `Phase 1 target $${DEFAULT_PLANNING_DEFAULTS.bufferPhase1}. Phase 2 stretch target $${DEFAULT_PLANNING_DEFAULTS.bufferPhase2}.` },
    { name: "Credit card cleanup", targetAmount: 13446, fortnightlyContribution: 0, priority: 1, canPause: 0, targetDate: null, notes: "Target = current Westpac + Qantas balances. Funded via Debt Strategy priority, not a separate contribution." },
    { name: "Body corporate / rates", targetAmount: 2800, fortnightlyContribution: round2(conversions.annualToFortnightly(2800)), priority: 2, canPause: 0, targetDate: null, notes: "Twice-yearly bill, set aside continuously." },
    { name: "Land tax", targetAmount: 550, fortnightlyContribution: round2(conversions.quarterlyToFortnightly(550)), priority: 2, canPause: 0, targetDate: null, notes: null },
    { name: "Medical / pharmacy buffer", targetAmount: 500, fortnightlyContribution: 20, priority: 3, canPause: 0, targetDate: null, notes: "Covers spikes above the monthly estimate." },
    { name: "Cat / vet", targetAmount: 500, fortnightlyContribution: 20, priority: 5, canPause: 1, targetDate: null, notes: null },
    { name: "Home repairs / extras", targetAmount: 1000, fortnightlyContribution: round2(conversions.annualToFortnightly(1000)), priority: 5, canPause: 1, targetDate: null, notes: null },
    { name: "Family support buffer", targetAmount: 500, fortnightlyContribution: 0, priority: 3, canPause: 0, targetDate: null, notes: "For an occasional extra need beyond the monthly $2,000." },
    { name: "Sewing / hobby fund", targetAmount: 200, fortnightlyContribution: DEFAULT_PLANNING_DEFAULTS.hobbyFortnightly, priority: 6, canPause: 1, targetDate: null, notes: "Deliberate joy spending, not a leak. Cap it, don't cut it." },
    { name: "Holiday fund", targetAmount: 3000, fortnightlyContribution: round2(conversions.monthlyToFortnightly(DEFAULT_PLANNING_DEFAULTS.holidayMonthly)), priority: 4, canPause: 1, targetDate: holidayTargetDate.toISOString().slice(0, 10), notes: "Only grows while card risk is controlled." },
  ];
  for (const f of funds) {
    insertFund.run({
      name: f.name,
      targetAmount: f.targetAmount,
      currentAmount: 0,
      targetDate: f.targetDate,
      fortnightlyContribution: f.fortnightlyContribution,
      priority: f.priority,
      canPauseInRedFortnight: f.canPause,
      notes: f.notes,
    });
  }

  // App settings
  db.prepare(
    "INSERT INTO app_setting (key, value) VALUES ('planningStyle', ?)"
  ).run(JSON.stringify("gentle"));
  db.prepare(
    "INSERT INTO app_setting (key, value) VALUES ('planningDefaults', ?)"
  ).run(JSON.stringify(DEFAULT_PLANNING_DEFAULTS));
  db.prepare(
    "INSERT INTO app_setting (key, value) VALUES ('aiPrivacyMode', ?)"
  ).run(JSON.stringify("summary_only"));
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextFriday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function firstOfNextMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  return d.toISOString().slice(0, 10);
}
