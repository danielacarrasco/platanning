import { Transactions } from "./db/transactions";
import { Accounts, SinkingFunds, Debts } from "./db/repo";
import { getPlanningDefaults } from "./planning";
import { conversions, round2 } from "./calculations";
import type { MonthlyReview } from "./types";

export type GeneratedReview = Omit<MonthlyReview, "id" | "createdAt">;

const DISCRETIONARY_CATEGORIES = ["Discretionary life", "Hobbies and identity", "Personal"];

export function generateMonthlyReview(month: string): GeneratedReview {
  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;

  const txns = Transactions.list({ from, to });
  const defaults = getPlanningDefaults();
  const cardAccountIds = new Set(Accounts.all().filter((a) => a.type === "credit_card").map((a) => a.id));

  const totalIncome = round2(txns.filter((t) => t.amount > 0 && !t.isTransfer).reduce((s, t) => s + t.amount, 0));

  const totalFixed = round2(
    txns
      .filter(
        (t) =>
          t.amount < 0 &&
          !t.isTransfer &&
          !t.isDebtPayment &&
          !t.isCreditCardPayment &&
          !t.isDiscretionary &&
          !t.isInterest &&
          !t.isFee
      )
      .reduce((s, t) => s + Math.abs(t.amount), 0)
  );

  const totalDiscretionary = round2(
    txns.filter((t) => t.isDiscretionary && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  );

  const totalCardSpending = round2(
    txns
      .filter((t) => t.accountId && cardAccountIds.has(t.accountId) && t.amount < 0 && !t.isCreditCardPayment && !t.isTransfer)
      .reduce((s, t) => s + Math.abs(t.amount), 0)
  );

  const cardInterestPaid = round2(txns.filter((t) => t.isInterest).reduce((s, t) => s + Math.abs(t.amount), 0));

  const debtPrincipalPaid = round2(
    txns.filter((t) => t.isDebtPayment || t.isCreditCardPayment).reduce((s, t) => s + Math.abs(t.amount), 0)
  );
  // Net movement estimate: payments made minus new card purchases (new card spend re-adds balance).
  const debtBalanceChange = round2(-(debtPrincipalPaid - totalCardSpending));

  const funds = SinkingFunds.all();
  const bufferFund = funds.find((f) => f.name === "Emergency buffer");
  const holidayFund = funds.find((f) => f.name === "Holiday fund");

  // Compare discretionary sub-categories against their monthly-equivalent plan targets.
  const monthlyFunTarget = conversions.fortnightlyToMonthly(defaults.funMoneyWeekly * 2);
  const monthlyHobbyTarget = conversions.fortnightlyToMonthly(defaults.hobbyFortnightly);
  const categoryTotals = new Map<string, number>();
  for (const cat of DISCRETIONARY_CATEGORIES) {
    const total = txns
      .filter((t) => t.category === cat && t.isDiscretionary && t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    categoryTotals.set(cat, total);
  }
  const targets: Record<string, number> = {
    "Discretionary life": monthlyFunTarget,
    "Hobbies and identity": monthlyHobbyTarget,
    Personal: 50 * (26 / 12), // matches the $50/fortnight starting baseline
  };
  let biggestOverspendCategory: string | null = null;
  let biggestOverAmount = 0;
  let bestValueCategory: string | null = null;
  let bestValueMargin = -Infinity;
  for (const [cat, total] of categoryTotals) {
    const target = targets[cat] ?? 0;
    const over = total - target;
    if (over > biggestOverAmount) {
      biggestOverAmount = over;
      biggestOverspendCategory = cat;
    }
    const margin = target - total; // how much room was left, unused = protected/deliberate
    if (total > 0 && margin >= 0 && margin > bestValueMargin) {
      bestValueMargin = margin;
      bestValueCategory = cat;
    }
  }
  if (!bestValueCategory && categoryTotals.size > 0) {
    bestValueCategory = [...categoryTotals.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
  }

  const cardsAtRisk = Debts.all().some((d) => d.balance > 0 && d.interestRate >= 15 && !d.isPromotional);
  let recommendedAction: string;
  if (cardInterestPaid > 0) {
    recommendedAction = "Protect the interest-free payment on any card charging interest before anything else next month.";
  } else if (biggestOverspendCategory) {
    recommendedAction = `Trim ${biggestOverspendCategory} back toward its planned range next fortnight — it doesn't need to go to zero, just closer to the cap.`;
  } else if (cardsAtRisk) {
    recommendedAction = "Keep sending any spare cash to the highest-interest debt before adding to savings goals.";
  } else {
    recommendedAction = "Keep the current plan running — nothing urgent needs to change.";
  }

  const narrative = buildNarrative({
    month,
    totalIncome,
    totalFixed,
    totalDiscretionary,
    totalCardSpending,
    cardInterestPaid,
    biggestOverspendCategory,
    biggestOverAmount,
  });

  return {
    month,
    totalIncome,
    totalFixed,
    totalDiscretionary,
    totalCardSpending,
    cardInterestPaid,
    debtBalanceChange,
    emergencyBufferChange: bufferFund?.currentAmount ?? 0,
    holidayFundChange: holidayFund?.currentAmount ?? 0,
    biggestOverspendCategory,
    bestValueCategory,
    recommendedAction,
    narrative,
  };
}

function buildNarrative(params: {
  month: string;
  totalIncome: number;
  totalFixed: number;
  totalDiscretionary: number;
  totalCardSpending: number;
  cardInterestPaid: number;
  biggestOverspendCategory: string | null;
  biggestOverAmount: number;
}): string {
  const parts: string[] = [];
  parts.push("You did not fail this month.");
  if (params.cardInterestPaid > 0) {
    parts.push(
      `A card carried a balance long enough to charge interest — that's the main thing worth fixing, not a reason to feel bad about it.`
    );
  } else if (params.totalCardSpending > 0) {
    parts.push(
      "Cards were used this month, but no interest was charged — that's the goal, and it worked."
    );
  } else {
    parts.push("No new card spending landed outside what cash could already cover.");
  }
  if (params.biggestOverspendCategory && params.biggestOverAmount > 0) {
    parts.push(
      `${params.biggestOverspendCategory} ran about ${params.biggestOverAmount.toFixed(0)} over its usual range — the issue isn't the category itself, it's what that reduced elsewhere.`
    );
  } else {
    parts.push("Discretionary spending stayed inside its planned range this month.");
  }
  parts.push(
    `Income was ${params.totalIncome.toFixed(0)}, essential bills took ${params.totalFixed.toFixed(0)}, and ${params.totalDiscretionary.toFixed(0)} went to deliberate joy spending.`
  );
  return parts.join(" ");
}
