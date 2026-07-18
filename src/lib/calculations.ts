import type {
  CardStatus,
  Debt,
  FortnightStatus,
  Frequency,
  PlanningStyle,
} from "./types";

/* ---------------------------------------------------------------------- */
/* Unit conversions                                                        */
/* ---------------------------------------------------------------------- */

export const conversions = {
  monthlyToFortnightly: (monthlyAmount: number) => (monthlyAmount * 12) / 26,
  weeklyToFortnightly: (weeklyAmount: number) => weeklyAmount * 2,
  quarterlyToFortnightly: (quarterlyAmount: number) => (quarterlyAmount * 4) / 26,
  annualToFortnightly: (annualAmount: number) => annualAmount / 26,
  fortnightlyToMonthly: (fortnightlyAmount: number) => (fortnightlyAmount * 26) / 12,
};

export function toFortnightly(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case "weekly":
      return conversions.weeklyToFortnightly(amount);
    case "fortnightly":
      return amount;
    case "monthly":
      return conversions.monthlyToFortnightly(amount);
    case "quarterly":
      return conversions.quarterlyToFortnightly(amount);
    case "annual":
      return conversions.annualToFortnightly(amount);
  }
}

export function toMonthly(amount: number, frequency: Frequency): number {
  const fortnightly = toFortnightly(amount, frequency);
  return conversions.fortnightlyToMonthly(fortnightly);
}

export function toAnnual(amount: number, frequency: Frequency): number {
  return toFortnightly(amount, frequency) * 26;
}

/* ---------------------------------------------------------------------- */
/* Planning defaults (gentle plan, editable in Settings)                   */
/* ---------------------------------------------------------------------- */

export interface PlanningDefaults {
  funMoneyWeekly: number; // discretionary life target, $/week
  hobbyFortnightly: number; // sewing/hobbies target, $/fortnight
  holidayMonthly: number; // holiday fund target, $/month (only if card risk controlled)
  bufferPhase1: number; // emergency buffer first milestone
  bufferPhase2: number; // emergency buffer stretch target
  hardFloorBuffer: number; // never let the everyday account plan go below this, on top of the buffer goal
}

export const DEFAULT_PLANNING_DEFAULTS: PlanningDefaults = {
  funMoneyWeekly: 110,
  hobbyFortnightly: 150,
  holidayMonthly: 400,
  bufferPhase1: 3000,
  bufferPhase2: 9000,
  hardFloorBuffer: 200,
};

// Style multipliers applied to the gentle-plan defaults above.
export const STYLE_MULTIPLIERS: Record<
  PlanningStyle,
  { fun: number; hobby: number; holiday: number; debtFocus: number }
> = {
  gentle: { fun: 1, hobby: 1, holiday: 1, debtFocus: 0.5 },
  balanced: { fun: 0.75, hobby: 0.75, holiday: 0.6, debtFocus: 0.75 },
  aggressive: { fun: 0.5, hobby: 0.5, holiday: 0, debtFocus: 1 },
};

/* ---------------------------------------------------------------------- */
/* Fortnight planner math                                                  */
/* ---------------------------------------------------------------------- */

export interface FortnightMathInput {
  startingCash: number;
  incomeDueThisFortnight: number;
  billsDueBeforeNextPayday: number;
  requiredDebtPayments: number;
  requiredSinkingFundSetAsides: number;
  minimumCashBufferProtection: number;
}

/** true_available formula from spec section 14 */
export function calcTrueAvailable(input: FortnightMathInput): number {
  return (
    input.startingCash +
    input.incomeDueThisFortnight -
    input.billsDueBeforeNextPayday -
    input.requiredDebtPayments -
    input.requiredSinkingFundSetAsides -
    input.minimumCashBufferProtection
  );
}

export interface MonthlySurplusInput {
  monthlyIncome: number;
  fixedEssentialCosts: number;
  debtMinimums: number;
  familySupport: number;
  healthCommitments: number;
  plannedVariableEssentials: number;
}

export function calcMonthlySurplus(input: MonthlySurplusInput): number {
  return (
    input.monthlyIncome -
    input.fixedEssentialCosts -
    input.debtMinimums -
    input.familySupport -
    input.healthCommitments -
    input.plannedVariableEssentials
  );
}

/** Determine plain-language fortnight pressure status from bills load vs income. */
export function calcFortnightStatus(params: {
  income: number;
  billsDue: number;
  debtPayments: number;
  cardRisk: "clean" | "watch" | "risk" | "problem";
}): FortnightStatus {
  const committedRatio =
    params.income > 0 ? (params.billsDue + params.debtPayments) / params.income : 1;
  if (params.cardRisk === "problem" || params.cardRisk === "risk" || committedRatio > 0.85) {
    return "red";
  }
  if (committedRatio > 0.6) {
    return "yellow";
  }
  return "green";
}

export interface BucketSplitResult {
  funMoney: number;
  hobbyMoney: number;
  holidayContribution: number;
  bufferContribution: number;
  cardCleanup: number;
  extraDebtRepayment: number;
  leftoverUnallocated: number;
}

/**
 * Splits remaining flexible cash into suggested buckets, following the
 * priority order: buffer protection is already removed upstream, so this
 * distributes what's left across quality-of-life + goal buckets, capped by
 * planning-style-adjusted targets, then routes any remainder to debt cleanup.
 */
export function splitFlexibleCash(params: {
  remainingFlexibleCash: number;
  style: PlanningStyle;
  defaults?: PlanningDefaults;
  cardRiskControlled: boolean; // true unless a card is "risk" or "problem"
  bufferMet: boolean;
}): BucketSplitResult {
  const defaults = params.defaults ?? DEFAULT_PLANNING_DEFAULTS;
  const mult = STYLE_MULTIPLIERS[params.style];

  let pool = Math.max(0, params.remainingFlexibleCash);

  const funTarget = defaults.funMoneyWeekly * 2 * mult.fun;
  const hobbyTarget = defaults.hobbyFortnightly * mult.hobby;
  const holidayTarget = params.cardRiskControlled
    ? conversions.monthlyToFortnightly(defaults.holidayMonthly) * mult.holiday
    : 0;
  const bufferTarget = params.bufferMet ? 0 : conversions.monthlyToFortnightly(200);

  const funMoney = Math.min(funTarget, pool);
  pool -= funMoney;
  const hobbyMoney = Math.min(hobbyTarget, pool);
  pool -= hobbyMoney;
  const bufferContribution = Math.min(bufferTarget, pool);
  pool -= bufferContribution;
  const holidayContribution = Math.min(holidayTarget, pool);
  pool -= holidayContribution;

  // Whatever remains is safe to send at debt cleanup / extra repayment,
  // split according to how debt-focused this planning style is.
  const cardCleanup = pool * mult.debtFocus;
  pool -= cardCleanup;
  const extraDebtRepayment = 0; // surfaced separately once debt strategy selects a target
  const leftoverUnallocated = pool;

  return {
    funMoney: round2(funMoney),
    hobbyMoney: round2(hobbyMoney),
    holidayContribution: round2(holidayContribution),
    bufferContribution: round2(bufferContribution),
    cardCleanup: round2(cardCleanup),
    extraDebtRepayment: round2(extraDebtRepayment),
    leftoverUnallocated: round2(leftoverUnallocated),
  };
}

/* ---------------------------------------------------------------------- */
/* Credit card risk classification                                        */
/* ---------------------------------------------------------------------- */

export interface CardRiskInput {
  purchaseInterestCharged: number;
  interestFreePaymentDue: number;
  availableCardPaymentCash: number;
  balance: number;
}

export function calcCardStatus(input: CardRiskInput): CardStatus {
  if (input.purchaseInterestCharged > 0) return "problem";
  if (input.interestFreePaymentDue > input.availableCardPaymentCash) return "risk";
  if (input.balance > 0) return "watch";
  return "clean";
}

export const CARD_STATUS_COPY: Record<CardStatus, { label: string; description: string }> = {
  clean: {
    label: "Clean card",
    description: "No interest. This card is fully funded by cash right now.",
  },
  watch: {
    label: "Watch card",
    description: "A balance exists, but the interest-free payment can still be met.",
  },
  risk: {
    label: "Risk card",
    description: "The interest-free payment may not be met from cash currently on hand.",
  },
  problem: {
    label: "Problem card",
    description: "Interest is already being charged on this card.",
  },
};

/* ---------------------------------------------------------------------- */
/* Debt priority                                                           */
/* ---------------------------------------------------------------------- */

export type PayoffMethod = "avalanche" | "cashflow_relief";

export interface DebtPriorityEntry {
  debt: Debt;
  rank: number;
  score: number;
  reason: string;
  group: "active_high_interest" | "mortgage" | "promotional_zero_percent";
}

export function computeDebtPriority(
  debts: Debt[],
  method: PayoffMethod = "avalanche"
): DebtPriorityEntry[] {
  const live = debts.filter((d) => d.balance > 0);

  const zeroPercent = live.filter((d) => d.isPromotional || d.interestRate === 0);
  const mortgage = live.filter(
    (d) => d.debtType === "mortgage" && !zeroPercent.includes(d)
  );
  const active = live.filter((d) => !zeroPercent.includes(d) && !mortgage.includes(d));

  const scored = active.map((d) => {
    let score = d.interestRate;
    let reason = `Charging ${d.interestRate.toFixed(2)}% interest.`;
    if (method === "cashflow_relief" && d.balance > 0) {
      const relief = (d.minimumPayment / d.balance) * 100;
      score += relief;
      if (relief > 5) {
        reason += ` Paying this off frees up $${d.minimumPayment.toFixed(0)} of required payments relative to a manageable balance.`;
      }
    }
    return { debt: d, score, reason };
  });
  scored.sort((a, b) => b.score - a.score);

  const entries: DebtPriorityEntry[] = scored.map((s, i) => ({
    debt: s.debt,
    rank: i + 1,
    score: round2(s.score),
    reason: s.reason,
    group: "active_high_interest",
  }));

  mortgage.forEach((d) => {
    entries.push({
      debt: d,
      rank: entries.length + 1,
      score: d.interestRate,
      reason:
        active.length > 0
          ? "Kept on normal repayment only while higher-interest debts exist. No extra payments recommended yet."
          : `Charging ${d.interestRate.toFixed(2)}% interest — now the lowest-rate remaining debt.`,
      group: "mortgage",
    });
  });

  zeroPercent.forEach((d) => {
    entries.push({
      debt: d,
      rank: entries.length + 1,
      score: -1,
      reason: "0% promotional balance. No urgency — pay the minimum and keep an eye on the promo end date.",
      group: "promotional_zero_percent",
    });
  });

  return entries;
}

/* ---------------------------------------------------------------------- */
/* Debt payoff simulation (fortnightly steps, snowball across priority)    */
/* ---------------------------------------------------------------------- */

export interface PayoffSimDebt {
  id: number;
  name: string;
  balance: number;
  interestRatePct: number; // annual %
  minimumPaymentFortnightly: number;
  excludeFromExtra?: boolean; // e.g. mortgage, while other debt exists
}

export interface PayoffSimPoint {
  fortnight: number;
  date: string;
  balances: Record<number, number>;
  totalBalance: number;
  interestPaidThisPeriod: number;
  cumulativeInterestPaid: number;
}

export interface PayoffSimResult {
  points: PayoffSimPoint[];
  payoffDates: Record<number, string | null>;
  totalInterestPaid: number;
  breathingRoomDate: string | null; // when the first non-mortgage debt clears
}

/**
 * Simulates paying debts down fortnight-by-fortnight using the given
 * priority order. Minimum payments are always made; `extraPerFortnight`
 * (plus any minimum payments freed up by cleared debts) is snowballed onto
 * the highest-priority remaining debt. This is a planning estimate, not a
 * bank amortisation schedule.
 */
export function simulatePayoff(
  debtsInPriorityOrder: PayoffSimDebt[],
  extraPerFortnight: number,
  startDate: Date,
  maxFortnights = 260 // 10 years
): PayoffSimResult {
  const debts = debtsInPriorityOrder.map((d) => ({ ...d }));
  const points: PayoffSimPoint[] = [];
  const payoffDates: Record<number, string | null> = {};
  debts.forEach((d) => (payoffDates[d.id] = d.balance <= 0 ? isoDate(startDate) : null));

  let cumulativeInterest = 0;
  let freedMinimums = 0;
  let breathingRoomDate: string | null = null;

  for (let f = 1; f <= maxFortnights; f++) {
    const periodDate = addFortnights(startDate, f);
    let interestThisPeriod = 0;
    const periodicRate = (rate: number) => rate / 100 / 26;

    // Accrue interest first
    for (const d of debts) {
      if (d.balance <= 0) continue;
      const interest = d.balance * periodicRate(d.interestRatePct);
      d.balance += interest;
      interestThisPeriod += interest;
    }

    // Apply minimum payments
    for (const d of debts) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.minimumPaymentFortnightly, d.balance);
      d.balance -= pay;
    }

    // Snowball extra + freed minimums onto highest-priority remaining debt
    let extraPool = extraPerFortnight + freedMinimums;
    for (const d of debts) {
      if (extraPool <= 0) break;
      if (d.balance <= 0 || d.excludeFromExtra) continue;
      const pay = Math.min(extraPool, d.balance);
      d.balance -= pay;
      extraPool -= pay;
    }

    // Detect newly cleared debts -> free their minimum payment for next period
    freedMinimums = 0;
    for (const d of debts) {
      if (d.balance <= 0.005) {
        d.balance = 0;
        if (!payoffDates[d.id]) payoffDates[d.id] = isoDate(periodDate);
        freedMinimums += d.minimumPaymentFortnightly;
      }
    }

    if (!breathingRoomDate) {
      const clearedNonMortgage = debts.find(
        (d) => d.balance === 0 && !d.excludeFromExtra
      );
      if (clearedNonMortgage) breathingRoomDate = isoDate(periodDate);
    }

    cumulativeInterest += interestThisPeriod;
    points.push({
      fortnight: f,
      date: isoDate(periodDate),
      balances: Object.fromEntries(debts.map((d) => [d.id, round2(d.balance)])),
      totalBalance: round2(debts.reduce((s, d) => s + d.balance, 0)),
      interestPaidThisPeriod: round2(interestThisPeriod),
      cumulativeInterestPaid: round2(cumulativeInterest),
    });

    if (debts.every((d) => d.balance <= 0)) break;
  }

  return {
    points,
    payoffDates,
    totalInterestPaid: round2(cumulativeInterest),
    breathingRoomDate,
  };
}

/* ---------------------------------------------------------------------- */
/* Net worth & fixed-cost pressure                                         */
/* ---------------------------------------------------------------------- */

export interface NetWorthInput {
  cash: number;
  savingsOffset: number;
  propertyEstimate: number;
  super_?: number;
  investments?: number;
  mortgageBalance: number;
  personalLoansBalance: number;
  creditCardsBalance: number;
}

export function calcNetWorth(input: NetWorthInput) {
  const assets =
    input.cash +
    input.savingsOffset +
    input.propertyEstimate +
    (input.super_ ?? 0) +
    (input.investments ?? 0);
  const liabilities =
    input.mortgageBalance + input.personalLoansBalance + input.creditCardsBalance;
  return { assets: round2(assets), liabilities: round2(liabilities), netWorth: round2(assets - liabilities) };
}

export function calcFixedCostPressure(monthlyIncome: number, monthlyFixedCommitted: number) {
  if (monthlyIncome <= 0) return 0;
  return round2((monthlyFixedCommitted / monthlyIncome) * 100);
}

/* ---------------------------------------------------------------------- */
/* Utilities                                                               */
/* ---------------------------------------------------------------------- */

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addFortnights(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n * 14);
  return copy;
}
