"use server";

import { revalidatePath } from "next/cache";
import { CardStatements, Accounts } from "@/lib/db/repo";
import { Transactions } from "@/lib/db/transactions";
import { calcCardStatus } from "@/lib/calculations";
import type { FundingSource, Category } from "@/lib/types";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function num(fd: FormData, key: string): number {
  const v = fd.get(key);
  return v === null || v === "" ? 0 : Number(v);
}
function strOrNull(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

export async function createCardStatement(fd: FormData) {
  const cardAccountId = num(fd, "cardAccountId");
  const closingBalance = num(fd, "closingBalance");
  const interestFreePayment = num(fd, "interestFreePayment");
  const interestCharged = num(fd, "interestCharged");

  const everydayCash = Accounts.all()
    .filter((a) => a.type === "everyday")
    .reduce((s, a) => s + a.currentBalance, 0);

  const status = calcCardStatus({
    purchaseInterestCharged: interestCharged,
    interestFreePaymentDue: interestFreePayment,
    availableCardPaymentCash: everydayCash,
    balance: closingBalance,
  });

  CardStatements.create({
    cardAccountId,
    statementStart: str(fd, "statementStart"),
    statementEnd: str(fd, "statementEnd"),
    closingBalance,
    minimumPayment: num(fd, "minimumPayment"),
    interestFreePayment,
    dueDate: str(fd, "dueDate"),
    purchaseBalance: num(fd, "purchaseBalance"),
    instalmentBalance: num(fd, "instalmentBalance"),
    interestCharged,
    feesCharged: num(fd, "feesCharged"),
    status,
    notes: strOrNull(fd, "notes"),
  });
  revalidatePath("/cards");
  revalidatePath("/");
  revalidatePath("/planner");
  revalidatePath("/bills");
}

export async function deleteCardStatement(fd: FormData) {
  CardStatements.remove(num(fd, "id"));
  revalidatePath("/cards");
  revalidatePath("/");
}

export interface CardPurchaseResult {
  ok: boolean;
  warning?: string;
}

export async function logCardPurchase(fd: FormData): Promise<CardPurchaseResult> {
  const fundingSource = str(fd, "fundingSource") as FundingSource;
  const amount = -Math.abs(num(fd, "amount"));

  Transactions.create({
    date: str(fd, "date"),
    accountId: num(fd, "cardAccountId"),
    description: str(fd, "description"),
    amount,
    merchant: null,
    category: str(fd, "category") as Category,
    subcategory: null,
    isTransfer: false,
    isCreditCardPayment: false,
    isDebtPayment: false,
    isInterest: false,
    isFee: false,
    isDiscretionary: fd.get("isDiscretionary") === "on",
    isFamilySupport: false,
    isPlanned: fundingSource !== "not_yet_funded",
    fundingSource,
    notes: null,
  });

  revalidatePath("/cards");
  revalidatePath("/spending");
  revalidatePath("/");

  if (fundingSource === "not_yet_funded") {
    return {
      ok: true,
      warning: `This means the card is being used as a cash-flow bridge. That may be necessary sometimes, but it reduces next fortnight's flexibility by ${amount < 0 ? Math.abs(amount).toFixed(2) : "0.00"}.`,
    };
  }
  return { ok: true };
}
