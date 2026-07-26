import { Accounts, Debts } from "./db/repo";
import { round2 } from "./calculations";
import type { Transaction } from "./types";

const PURCHASE_RATE = 20.99;

/**
 * Keeps a credit card account's balance — and its linked purchase-rate Debt — in sync with
 * transactions posted against it. Any transaction on a credit_card account moves the balance
 * by -amount (a purchase, negative amount, grows what's owed; a payment or refund, positive
 * amount, shrinks it), so new charges are immediately lumped into the balance the next
 * statement/payment and debt payoff calculations are based on.
 *
 * Pass sign=1 to apply a transaction's effect, sign=-1 to reverse it (on edit/delete).
 * No-ops for any account that isn't a credit card.
 */
export function applyCardTransactionEffect(
  transaction: Pick<Transaction, "accountId" | "amount">,
  sign: 1 | -1
): void {
  if (!transaction.accountId) return;
  const account = Accounts.get(transaction.accountId);
  if (!account || account.type !== "credit_card") return;

  const delta = -transaction.amount * sign;
  if (delta === 0) return;

  const newBalance = Math.max(0, round2(account.currentBalance + delta));
  Accounts.update(account.id, { currentBalance: newBalance });

  const linkedDebt = Debts.all().find(
    (d) => d.accountId === account.id && d.debtType === "credit_card_purchase"
  );
  if (linkedDebt) {
    Debts.update(linkedDebt.id, { balance: Math.max(0, round2(linkedDebt.balance + delta)) });
  } else if (delta > 0) {
    // A purchase grew the card with no existing debt record for it yet — start one.
    Debts.create({
      name: `${account.name} balance`,
      accountId: account.id,
      balance: round2(delta),
      interestRate: PURCHASE_RATE,
      minimumPayment: round2(Math.max(delta * 0.025, 20)),
      paymentFrequency: "monthly",
      debtType: "credit_card_purchase",
      nextPaymentDate: null,
      priority: null,
      isPromotional: false,
      promotionalEndDate: null,
      notes: "Auto-created from card purchases — adjust the minimum payment once you know the real one.",
    });
  }
}
