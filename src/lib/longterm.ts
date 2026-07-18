import { Accounts, Debts, IncomeSources, Paydays, RecurringExpenses, SinkingFunds, Settings } from "./db/repo";
import { listWindows, buildFortnightSnapshot, getPlanningStyle, getPlanningDefaults } from "./planning";
import { toMonthly, calcFixedCostPressure, calcNetWorth, round2, conversions } from "./calculations";
import { mapToValueGroup } from "./valueGroups";
import type { ValueGroup } from "./types";

export interface NetWorthAssumptions {
  propertyEstimate: number;
  superBalance: number;
  investments: number;
}

export const DEFAULT_NET_WORTH_ASSUMPTIONS: NetWorthAssumptions = {
  propertyEstimate: 700000,
  superBalance: 0,
  investments: 0,
};

export function getNetWorthAssumptions(): NetWorthAssumptions {
  return Settings.get("netWorthAssumptions", DEFAULT_NET_WORTH_ASSUMPTIONS);
}

export interface CashFlowPoint {
  date: string;
  cash: number;
  label?: string;
}

/** Projected everyday cash balance forward, applying each fortnight's full plan. */
export function buildCashFlowForecast(fortnights = 13): CashFlowPoint[] {
  const style = getPlanningStyle();
  const defaults = getPlanningDefaults();
  const windows = listWindows(fortnights);
  const accounts = Accounts.all();
  let cash = accounts.filter((a) => a.type === "everyday").reduce((s, a) => s + a.currentBalance, 0);

  const points: CashFlowPoint[] = [{ date: windows[0].startDate, cash: round2(cash), label: "Today" }];
  const markers: Record<number, string> = { 1: "2 weeks", 2: "1 month", 6: "3 months", 12: "6 months" };

  windows.forEach((w, i) => {
    const snapshot = buildFortnightSnapshot(w, style, defaults);
    cash =
      cash +
      snapshot.income -
      snapshot.billsDue -
      snapshot.requiredDebtPayments -
      snapshot.cardPayments -
      snapshot.requiredSetAsides -
      snapshot.buckets.funMoney -
      snapshot.buckets.hobbyMoney -
      snapshot.buckets.holidayContribution -
      snapshot.buckets.bufferContribution -
      snapshot.buckets.cardCleanup;
    points.push({ date: w.endDate, cash: round2(cash), label: markers[i + 1] });
  });
  return points;
}

export interface NetWorthPoint {
  date: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

/** Simple 12-month projection: debts decline via minimum payments, sinking funds grow, property flat. */
export function buildNetWorthProjection(months = 12): NetWorthPoint[] {
  const accounts = Accounts.all();
  const debts = Debts.all().filter((d) => d.balance > 0);
  const funds = SinkingFunds.all();
  const assumptions = getNetWorthAssumptions();

  const cash = accounts.filter((a) => a.type === "everyday").reduce((s, a) => s + a.currentBalance, 0);
  const savingsOffset = accounts.filter((a) => a.type === "offset" || a.type === "savings").reduce((s, a) => s + a.currentBalance, 0);
  const fundsTotal = funds.reduce((s, f) => s + f.currentAmount, 0);
  const fundsFortnightlyGrowth = funds.reduce((s, f) => s + f.fortnightlyContribution, 0);

  const points: NetWorthPoint[] = [];
  const debtBalances = new Map(debts.map((d) => [d.id, d.balance]));

  for (let m = 0; m <= months; m++) {
    const fortnightsElapsed = Math.round((m * 26) / 12);
    for (const d of debts) {
      let bal = d.balance;
      const periodicRate = d.interestRate / 100 / 26;
      const fortnightlyPayment =
        d.paymentFrequency === "weekly"
          ? conversions.weeklyToFortnightly(d.minimumPayment)
          : d.paymentFrequency === "monthly"
            ? conversions.monthlyToFortnightly(d.minimumPayment)
            : d.minimumPayment;
      for (let f = 0; f < fortnightsElapsed; f++) {
        bal += bal * periodicRate;
        bal = Math.max(0, bal - fortnightlyPayment);
      }
      debtBalances.set(d.id, bal);
    }
    const liabilitiesTotal = [...debtBalances.values()].reduce((s, v) => s + v, 0);
    const netWorth = calcNetWorth({
      cash,
      savingsOffset: savingsOffset + fundsTotal + fundsFortnightlyGrowth * fortnightsElapsed,
      propertyEstimate: assumptions.propertyEstimate,
      super_: assumptions.superBalance,
      investments: assumptions.investments,
      mortgageBalance: 0,
      personalLoansBalance: 0,
      creditCardsBalance: 0,
    });
    const date = new Date();
    date.setMonth(date.getMonth() + m);
    points.push({
      date: date.toISOString().slice(0, 10),
      assets: netWorth.assets,
      liabilities: round2(liabilitiesTotal),
      netWorth: round2(netWorth.assets - liabilitiesTotal),
    });
  }
  return points;
}

export function getFixedCostPressure(): { pct: number; monthlyIncome: number; monthlyFixed: number } {
  const paydayMonthly = Paydays.all().length
    ? conversions.fortnightlyToMonthly(Paydays.all()[0].amount)
    : 0;
  const otherIncomeMonthly = IncomeSources.all()
    .filter((i) => i.name !== "Main income" && i.name !== "Additional income")
    .reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const monthlyIncome = round2(paydayMonthly + otherIncomeMonthly);
  const essentialMonthly = RecurringExpenses.all()
    .filter((r) => r.importance === "essential")
    .reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0);
  const debtMonthly = Debts.all()
    .filter((d) => d.balance > 0)
    .reduce((s, d) => s + toMonthly(d.minimumPayment, d.paymentFrequency === "monthly" ? "monthly" : d.paymentFrequency === "weekly" ? "weekly" : "fortnightly"), 0);
  const monthlyFixed = round2(essentialMonthly + debtMonthly);
  return { pct: calcFixedCostPressure(monthlyIncome, monthlyFixed), monthlyIncome, monthlyFixed };
}

export interface ValueGroupTotal {
  group: ValueGroup;
  monthlyAmount: number;
}

/** "What does my committed money say about my life?" — from recurring bills + debt minimums. */
export function buildSpendingByValues(): ValueGroupTotal[] {
  const totals = new Map<ValueGroup, number>();
  for (const r of RecurringExpenses.all()) {
    const group = mapToValueGroup(r.name, r.category);
    totals.set(group, (totals.get(group) ?? 0) + toMonthly(r.amount, r.frequency));
  }
  for (const d of Debts.all().filter((x) => x.balance > 0)) {
    const group = d.debtType === "mortgage" ? "home/security" : "debt cleanup";
    const freq = d.paymentFrequency === "monthly" ? "monthly" : d.paymentFrequency === "weekly" ? "weekly" : "fortnightly";
    totals.set(group, (totals.get(group) ?? 0) + toMonthly(d.minimumPayment, freq));
  }
  return [...totals.entries()]
    .map(([group, monthlyAmount]) => ({ group, monthlyAmount: round2(monthlyAmount) }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}
