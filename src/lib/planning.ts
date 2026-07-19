import { Accounts, Debts, IncomeSources, Paydays, RecurringExpenses, SinkingFunds, CardStatements, Settings } from "./db/repo";
import {
  DEFAULT_PLANNING_DEFAULTS,
  calcCardStatus,
  calcFortnightStatus,
  calcTrueAvailable,
  splitFlexibleCash,
  round2,
  type BucketSplitResult,
  type PlanningDefaults,
} from "./calculations";
import type {
  Account,
  CardStatus,
  Debt,
  Frequency,
  FortnightStatus,
  IncomeSource,
  Payday,
  PlanningStyle,
  RecurringExpense,
} from "./types";

export interface FortnightWindow {
  startDate: string;
  endDate: string;
}

export interface LineItem {
  name: string;
  amount: number;
  date: string;
  category?: string;
  importance?: string;
}

export interface FortnightSnapshot {
  window: FortnightWindow;
  planningStyle: PlanningStyle;
  startingCash: number;
  income: number;
  incomeItems: LineItem[];
  billsDue: number;
  billItems: LineItem[];
  requiredDebtPayments: number;
  debtItems: LineItem[];
  cardPayments: number;
  cardItems: LineItem[];
  requiredSetAsides: number;
  setAsideItems: LineItem[];
  hardFloorBuffer: number;
  trueAvailable: number;
  buckets: BucketSplitResult;
  status: FortnightStatus;
  worstCardStatus: CardStatus;
  endingCashForecast: number;
}

/** Roll a date forward by one period of the given frequency (calendar-correct). */
export function rollForward(date: Date, frequency: Frequency): Date {
  const d = new Date(date);
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "fortnightly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "annual":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

/** All occurrences of a recurring date/frequency that fall within [start, end]. */
export function occurrencesInWindow(
  nextDate: string,
  frequency: Frequency,
  window: FortnightWindow
): string[] {
  const windowStart = new Date(window.startDate);
  const windowEnd = new Date(window.endDate);
  let cursor = new Date(nextDate);
  let guard = 0;
  // Roll backward if the stored next-date is ahead of the window we care about
  // is not needed (we only ever look forward), but roll forward past stale dates.
  while (cursor < windowStart && guard < 2000) {
    cursor = rollForward(cursor, frequency);
    guard++;
  }
  const results: string[] = [];
  guard = 0;
  while (cursor <= windowEnd && guard < 100) {
    results.push(cursor.toISOString().slice(0, 10));
    cursor = rollForward(cursor, frequency);
    guard++;
  }
  return results;
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The single source of truth for "where in the fortnight cycle are we": the most recent
 * recorded payday on or before referenceDate, or — if every recorded payday is still in the
 * future — the earliest one known. Both the window boundaries and the projected income for
 * future fortnights are derived from this same anchor, so correcting one Payday row fixes
 * everything downstream instead of requiring a literal row per fortnight.
 */
function getPaydayAnchor(referenceDate: string): Payday | null {
  const all = Paydays.all();
  if (all.length === 0) return null;
  const past = all.filter((p) => p.date <= referenceDate).sort((a, b) => (a.date < b.date ? 1 : -1));
  if (past.length > 0) return past[0];
  return all.slice().sort((a, b) => (a.date < b.date ? -1 : 1))[0];
}

/** Rolls a date by 14-day steps until it falls within [window.startDate, window.endDate]. */
function rollToWindow(date: Date, window: FortnightWindow): Date {
  const cursor = new Date(date);
  const winStart = new Date(window.startDate);
  let guard = 0;
  while (cursor > winStart && guard < 500) {
    cursor.setDate(cursor.getDate() - 14);
    guard++;
  }
  guard = 0;
  while (cursor < winStart && guard < 500) {
    cursor.setDate(cursor.getDate() + 14);
    guard++;
  }
  return cursor;
}

/** Finds the fortnight window (payday to payday-minus-a-day) containing referenceDate. */
export function getFortnightWindow(referenceDate: string = isoToday()): FortnightWindow {
  const anchor = getPaydayAnchor(referenceDate);
  if (!anchor) {
    const start = new Date(referenceDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    return { startDate: referenceDate, endDate: end.toISOString().slice(0, 10) };
  }
  const ref = new Date(referenceDate);
  const start = new Date(anchor.date);
  let guard = 0;
  while (start > ref && guard < 500) {
    start.setDate(start.getDate() - 14);
    guard++;
  }
  let end = new Date(start);
  end.setDate(end.getDate() + 13);
  guard = 0;
  while (end < ref && guard < 500) {
    start.setDate(start.getDate() + 14);
    end = new Date(start);
    end.setDate(end.getDate() + 13);
    guard++;
  }
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

/** Projects the fortnightly pay cycle from the anchor payday into the given window, rather
 * than requiring a literal Payday row to exist for every future fortnight. */
function projectedPaydayForWindow(window: FortnightWindow, referenceDate: string): LineItem | null {
  const anchor = getPaydayAnchor(referenceDate);
  if (!anchor) return null;
  const projected = rollToWindow(new Date(anchor.date), window);
  const iso = projected.toISOString().slice(0, 10);
  if (iso >= window.startDate && iso <= window.endDate) {
    return { name: anchor.source, amount: anchor.amount, date: iso };
  }
  return null;
}

export function nextWindow(window: FortnightWindow): FortnightWindow {
  const start = new Date(window.startDate);
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setDate(end.getDate() + 13);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export function listWindows(count: number, referenceDate: string = isoToday()): FortnightWindow[] {
  const windows: FortnightWindow[] = [];
  let w = getFortnightWindow(referenceDate);
  for (let i = 0; i < count; i++) {
    windows.push(w);
    w = nextWindow(w);
  }
  return windows;
}

function sumEverydayCash(accounts: Account[]): number {
  return round2(
    accounts.filter((a) => a.type === "everyday").reduce((s, a) => s + a.currentBalance, 0)
  );
}

/** Best-known worst-case card status across all credit card accounts, from latest statements. */
export function assessCardRisk(): {
  worst: CardStatus;
  perCard: { account: Account; status: CardStatus; hasStatement: boolean }[];
} {
  const cards = Accounts.all().filter((a) => a.type === "credit_card");
  const everydayCash = sumEverydayCash(Accounts.all());
  const perCard = cards.map((account) => {
    const statement = CardStatements.latestForCard(account.id);
    if (!statement) {
      return { account, status: (account.currentBalance > 0 ? "watch" : "clean") as CardStatus, hasStatement: false };
    }
    const status = calcCardStatus({
      purchaseInterestCharged: statement.interestCharged,
      interestFreePaymentDue: statement.interestFreePayment,
      availableCardPaymentCash: everydayCash,
      balance: statement.closingBalance,
    });
    return { account, status, hasStatement: true };
  });
  const order: CardStatus[] = ["clean", "watch", "risk", "problem"];
  const worst = perCard.reduce<CardStatus>((acc, c) => {
    return order.indexOf(c.status) > order.indexOf(acc) ? c.status : acc;
  }, "clean");
  return { worst, perCard };
}

export function buildFortnightSnapshot(
  window: FortnightWindow,
  planningStyle: PlanningStyle,
  defaults: PlanningDefaults = DEFAULT_PLANNING_DEFAULTS
): FortnightSnapshot {
  const accounts = Accounts.all();
  const startingCash = sumEverydayCash(accounts);

  // Income — the payday cadence is projected forward/back from the most recent recorded
  // payday rather than requiring a literal row for every fortnight (see projectedPaydayForWindow).
  const incomeItems: LineItem[] = [];
  const projectedPayday = projectedPaydayForWindow(window, isoToday());
  if (projectedPayday) incomeItems.push(projectedPayday);
  const nonPaydayIncome = IncomeSources.all().filter(
    (i: IncomeSource) => i.name !== "Main income" && i.name !== "Additional income"
  );
  for (const src of nonPaydayIncome) {
    if (!src.nextDate) continue;
    for (const date of occurrencesInWindow(src.nextDate, src.frequency, window)) {
      incomeItems.push({ name: src.name, amount: src.amount, date });
    }
  }
  const income = round2(incomeItems.reduce((s, i) => s + i.amount, 0));

  // Bills (recurring expenses)
  const billItems: LineItem[] = [];
  for (const r of RecurringExpenses.all() as RecurringExpense[]) {
    for (const date of occurrencesInWindow(r.nextDueDate, r.frequency, window)) {
      billItems.push({ name: r.name, amount: r.amount, date, category: r.category, importance: r.importance });
    }
  }
  const billsDue = round2(billItems.reduce((s, i) => s + i.amount, 0));

  // Required debt minimum payments
  const debtItems: LineItem[] = [];
  for (const d of Debts.all() as Debt[]) {
    if (d.balance <= 0 || !d.nextPaymentDate) continue;
    const freq = d.paymentFrequency as Frequency;
    for (const date of occurrencesInWindow(d.nextPaymentDate, freq, window)) {
      debtItems.push({ name: d.name, amount: d.minimumPayment, date, category: "Credit card / debt management" });
    }
  }
  const requiredDebtPayments = round2(debtItems.reduce((s, i) => s + i.amount, 0));

  // Credit card statement due payments (interest-free payment target) within window
  const cardItems: LineItem[] = [];
  for (const stmt of CardStatements.all()) {
    if (stmt.dueDate >= window.startDate && stmt.dueDate <= window.endDate) {
      const account = accounts.find((a) => a.id === stmt.cardAccountId);
      cardItems.push({
        name: `${account?.name ?? "Card"} statement payment`,
        amount: stmt.interestFreePayment,
        date: stmt.dueDate,
        category: "Credit card / debt management",
      });
    }
  }
  const cardPayments = round2(cardItems.reduce((s, i) => s + i.amount, 0));

  // Sinking fund set-asides (every active fund contributes each fortnight)
  const setAsideItems: LineItem[] = SinkingFunds.all().map((f) => ({
    name: f.name,
    amount: f.fortnightlyContribution,
    date: window.startDate,
    category: "Goals",
  }));
  const requiredSetAsides = round2(setAsideItems.reduce((s, i) => s + i.amount, 0));

  const trueAvailable = calcTrueAvailable({
    startingCash,
    incomeDueThisFortnight: income,
    billsDueBeforeNextPayday: billsDue,
    requiredDebtPayments: requiredDebtPayments + cardPayments,
    requiredSinkingFundSetAsides: requiredSetAsides,
    minimumCashBufferProtection: defaults.hardFloorBuffer,
  });

  const cardRisk = assessCardRisk();
  const status = calcFortnightStatus({
    income,
    billsDue,
    debtPayments: requiredDebtPayments + cardPayments,
    cardRisk: cardRisk.worst,
  });

  const bufferFund = SinkingFunds.all().find((f) => f.name === "Emergency buffer");
  const bufferMet = bufferFund ? bufferFund.currentAmount >= bufferFund.targetAmount : false;

  const buckets = splitFlexibleCash({
    remainingFlexibleCash: trueAvailable,
    style: planningStyle,
    defaults,
    cardRiskControlled: cardRisk.worst === "clean" || cardRisk.worst === "watch",
    bufferMet,
  });

  const endingCashForecast = round2(
    startingCash + income - billsDue - requiredDebtPayments - cardPayments - requiredSetAsides -
      buckets.funMoney - buckets.hobbyMoney - buckets.holidayContribution - buckets.bufferContribution - buckets.cardCleanup
  );

  return {
    window,
    planningStyle,
    startingCash,
    income,
    incomeItems,
    billsDue,
    billItems,
    requiredDebtPayments,
    debtItems,
    cardPayments,
    cardItems,
    requiredSetAsides,
    setAsideItems,
    hardFloorBuffer: defaults.hardFloorBuffer,
    trueAvailable,
    buckets,
    status,
    worstCardStatus: cardRisk.worst,
    endingCashForecast,
  };
}

export function getPlanningStyle(): PlanningStyle {
  return Settings.get<PlanningStyle>("planningStyle", "gentle");
}

export function getPlanningDefaults(): PlanningDefaults {
  return Settings.get<PlanningDefaults>("planningDefaults", DEFAULT_PLANNING_DEFAULTS);
}
