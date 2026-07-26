import { Accounts, Debts } from "./db/repo";
import { round2 } from "./calculations";
import type { Transaction } from "./types";

const PURCHASE_RATE = 20.99;
const DEBT_ACCOUNT_TYPES = new Set(["credit_card", "personal_loan", "mortgage"]);

/**
 * Keeps a credit card account's balance — and its linked purchase-rate Debt — in sync with
 * transactions posted directly against it (a purchase charged straight to the card). Moves the
 * balance by -amount, so a purchase (negative amount) grows what's owed, immediately lumped into
 * the balance the next payment and debt payoff calculations are based on.
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

/**
 * For a "Credit card / debt management" transaction with a destination account set (e.g. "$500
 * from Everyday account, paying down the Westpac card"): reduces that destination account's
 * balance and any linked Debt by the transaction amount. Since every transaction is assumed to
 * be spending (amount is negative), the payment size is just the magnitude of the amount.
 *
 * Only affects credit_card / personal_loan / mortgage destinations — paying "to" an everyday,
 * savings, or offset account isn't a debt paydown, so it's left alone.
 * Pass sign=1 to apply, sign=-1 to reverse (on edit/delete).
 */
export function applyDebtPaymentEffect(
  transaction: Pick<Transaction, "destinationAccountId" | "amount" | "category">,
  sign: 1 | -1
): void {
  if (transaction.category !== "Credit card / debt management") return;
  if (!transaction.destinationAccountId) return;
  const account = Accounts.get(transaction.destinationAccountId);
  if (!account || !DEBT_ACCOUNT_TYPES.has(account.type)) return;

  const payment = Math.abs(transaction.amount) * sign;
  if (payment === 0) return;

  const newBalance = Math.max(0, round2(account.currentBalance - payment));
  Accounts.update(account.id, { currentBalance: newBalance });

  const linkedDebt = Debts.all().find((d) => d.accountId === account.id);
  if (linkedDebt) {
    Debts.update(linkedDebt.id, { balance: Math.max(0, round2(linkedDebt.balance - payment)) });
  }
}

/**
 * Keeps a transaction's source account (accountId) — cash accounts especially — in sync with
 * money actually leaving or arriving there, so "Cash available today" on the Dashboard reflects
 * real spending instead of a balance that only ever gets updated by hand.
 *
 * everyday/savings/offset accounts hold real cash: the balance simply moves by the transaction
 * amount (spending, which is negative, reduces it). credit_card is skipped here — it's already
 * handled by applyCardTransactionEffect, which treats a card charge as debt growing rather than
 * cash leaving. personal_loan/mortgage used as a funding source grow what's owed, same direction
 * as a card purchase, since drawing on a loan to pay for something isn't spending real cash.
 *
 * Pass sign=1 to apply a transaction's effect, sign=-1 to reverse it (on edit/delete).
 */
export function applySourceAccountEffect(
  transaction: Pick<Transaction, "accountId" | "amount">,
  sign: 1 | -1
): void {
  if (!transaction.accountId) return;
  const account = Accounts.get(transaction.accountId);
  if (!account || account.type === "credit_card") return;

  const delta = transaction.amount * sign;
  if (delta === 0) return;

  if (account.type === "personal_loan" || account.type === "mortgage") {
    const newBalance = Math.max(0, round2(account.currentBalance - delta));
    Accounts.update(account.id, { currentBalance: newBalance });
  } else {
    Accounts.update(account.id, { currentBalance: round2(account.currentBalance + delta) });
  }
}

/**
 * Keeps a debt-type account's currentBalance mirroring the SUM of every Debt linked to it — e.g.
 * a card with both a purchases debt and an instalment plan debt shows their combined balance, not
 * just whichever one was last edited. Recomputes from scratch each call rather than adding a delta,
 * so it's safe to call after any create/update/delete of a linked debt.
 * No-ops if the account isn't a debt-type account (credit_card/personal_loan/mortgage).
 */
export function syncAccountBalanceFromDebts(accountId: number | null): void {
  if (!accountId) return;
  const account = Accounts.get(accountId);
  if (!account || !DEBT_ACCOUNT_TYPES.has(account.type)) return;

  const total = Debts.all()
    .filter((d) => d.accountId === accountId)
    .reduce((sum, d) => sum + d.balance, 0);

  const newBalance = round2(Math.max(0, total));
  if (newBalance === account.currentBalance) return;
  Accounts.update(account.id, { currentBalance: newBalance });
}
