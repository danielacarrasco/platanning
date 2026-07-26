"use server";

import { revalidatePath } from "next/cache";
import { Transactions } from "@/lib/db/transactions";
import { Accounts } from "@/lib/db/repo";
import { parseCsv } from "@/lib/csv";
import { suggestCategory } from "@/lib/categorize";
import { applyCardTransactionEffect, applyDebtPaymentEffect, applySourceAccountEffect } from "@/lib/cardBalance";
import type { Category, FundingSource } from "@/lib/types";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function num(fd: FormData, key: string): number {
  const v = fd.get(key);
  return v === null || v === "" ? 0 : Number(v);
}
function numOrNull(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  return v === null || v === "" ? null : Number(v);
}
function strOrNull(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

export async function createTransaction(fd: FormData) {
  const description = str(fd, "description");
  const suggestion = suggestCategory(description);
  // Every manually-entered transaction is assumed to be spending — money out.
  const amount = -Math.abs(num(fd, "amount"));
  const category = (str(fd, "category") || suggestion.category) as Category;
  const destinationAccountId = numOrNull(fd, "destinationAccountId");
  const destinationAccount = destinationAccountId ? Accounts.get(destinationAccountId) : undefined;
  const isDebtManagement = category === "Credit card / debt management";

  const transaction = Transactions.create({
    date: str(fd, "date"),
    accountId: numOrNull(fd, "accountId"),
    destinationAccountId,
    description,
    amount,
    merchant: strOrNull(fd, "merchant"),
    category,
    subcategory: strOrNull(fd, "subcategory"),
    // No more manual checkboxes — the category and destination account (an authoritative user
    // choice) plus the same description heuristics CSV import uses are enough to classify these.
    isTransfer: suggestion.isTransfer,
    isCreditCardPayment: isDebtManagement && destinationAccount?.type === "credit_card",
    isDebtPayment: isDebtManagement && (destinationAccount?.type === "personal_loan" || destinationAccount?.type === "mortgage"),
    isInterest: suggestion.isInterest,
    isFee: suggestion.isFee,
    isDiscretionary:
      category === "Discretionary life" || category === "Hobbies and identity" || category === "Personal" || suggestion.isDiscretionary,
    isFamilySupport: category === "Family support" || suggestion.isFamilySupport,
    isPlanned: false,
    fundingSource: (strOrNull(fd, "fundingSource") as FundingSource) ?? null,
    notes: strOrNull(fd, "notes"),
  });
  // A purchase charged straight to a card grows that card's balance; a "Credit card / debt
  // management" transaction with a destination account pays that debt down; the source account
  // (cash leaving an everyday account, or a loan drawn on) moves too — see lib/cardBalance.ts.
  applyCardTransactionEffect(transaction, 1);
  applyDebtPaymentEffect(transaction, 1);
  applySourceAccountEffect(transaction, 1);
  revalidatePath("/spending");
  revalidatePath("/cards");
  revalidatePath("/debt");
  revalidatePath("/settings");
  revalidatePath("/planner");
  revalidatePath("/");
}

export async function updateTransaction(fd: FormData) {
  const id = num(fd, "id");
  const before = Transactions.get(id);
  if (before) {
    applyCardTransactionEffect(before, -1); // reverse the old effect first
    applyDebtPaymentEffect(before, -1);
    applySourceAccountEffect(before, -1);
  }

  const amount = -Math.abs(num(fd, "amount"));
  const updated = Transactions.update(id, {
    date: str(fd, "date"),
    destinationAccountId: numOrNull(fd, "destinationAccountId"),
    description: str(fd, "description"),
    amount,
    category: str(fd, "category") as Category,
    subcategory: strOrNull(fd, "subcategory"),
    isTransfer: fd.get("isTransfer") === "on",
    isCreditCardPayment: fd.get("isCreditCardPayment") === "on",
    isDebtPayment: fd.get("isDebtPayment") === "on",
    isInterest: fd.get("isInterest") === "on",
    isFee: fd.get("isFee") === "on",
    isDiscretionary: fd.get("isDiscretionary") === "on",
    isFamilySupport: fd.get("isFamilySupport") === "on",
    isPlanned: fd.get("isPlanned") === "on",
  });
  applyCardTransactionEffect(updated, 1); // then apply the corrected one
  applyDebtPaymentEffect(updated, 1);
  applySourceAccountEffect(updated, 1);

  revalidatePath("/spending");
  revalidatePath("/cards");
  revalidatePath("/debt");
  revalidatePath("/settings");
  revalidatePath("/planner");
  revalidatePath("/");
}

export async function deleteTransaction(fd: FormData) {
  const id = num(fd, "id");
  const before = Transactions.get(id);
  if (before) {
    applyCardTransactionEffect(before, -1);
    applyDebtPaymentEffect(before, -1);
    applySourceAccountEffect(before, -1);
  }
  Transactions.remove(id);
  revalidatePath("/spending");
  revalidatePath("/cards");
  revalidatePath("/debt");
  revalidatePath("/settings");
  revalidatePath("/planner");
  revalidatePath("/");
}

export interface ImportResult {
  imported: number;
  skipped: number;
  error?: string;
}

export async function importTransactionsCsv(fd: FormData): Promise<ImportResult> {
  const file = fd.get("file");
  if (!(file instanceof File)) {
    return { imported: 0, skipped: 0, error: "No file uploaded." };
  }
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { imported: 0, skipped: 0, error: "Couldn't find any rows in that file." };
  }

  const findKey = (row: Record<string, string>, candidates: string[]) =>
    Object.keys(row).find((k) => candidates.includes(k.toLowerCase().trim()));

  let imported = 0;
  let skipped = 0;
  const toInsert: Parameters<typeof Transactions.createMany>[0] = [];

  for (const row of rows) {
    const dateKey = findKey(row, ["date"]);
    const descKey = findKey(row, ["description", "narrative", "details", "memo"]);
    const amountKey = findKey(row, ["amount", "value"]);
    const debitKey = findKey(row, ["debit", "withdrawal"]);
    const creditKey = findKey(row, ["credit", "deposit"]);
    const merchantKey = findKey(row, ["merchant", "payee"]);
    const categoryKey = findKey(row, ["category"]);

    const dateRaw = dateKey ? row[dateKey] : "";
    const description = descKey ? row[descKey] : "";
    let amount = amountKey ? Number(row[amountKey]) : NaN;
    if (isNaN(amount) && (debitKey || creditKey)) {
      const debit = debitKey ? Number(row[debitKey] || 0) : 0;
      const credit = creditKey ? Number(row[creditKey] || 0) : 0;
      amount = credit - debit;
    }
    const date = normaliseDate(dateRaw);

    if (!date || !description || isNaN(amount)) {
      skipped++;
      continue;
    }

    const suggestion = suggestCategory(description);
    toInsert.push({
      date,
      accountId: null,
      destinationAccountId: null,
      description,
      amount,
      merchant: merchantKey ? row[merchantKey] || null : null,
      category: (categoryKey && row[categoryKey]) || suggestion.category,
      subcategory: suggestion.subcategory ?? null,
      isTransfer: suggestion.isTransfer,
      isCreditCardPayment: suggestion.isCreditCardPayment,
      isDebtPayment: suggestion.isDebtPayment,
      isInterest: suggestion.isInterest,
      isFee: suggestion.isFee,
      isDiscretionary: suggestion.isDiscretionary,
      isFamilySupport: suggestion.isFamilySupport,
      isPlanned: false,
      fundingSource: null,
      notes: "Imported from CSV — check category.",
    });
    imported++;
  }

  if (toInsert.length > 0) {
    Transactions.createMany(toInsert);
  }

  revalidatePath("/spending");
  revalidatePath("/planner");
  revalidatePath("/");
  return { imported, skipped };
}

function normaliseDate(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}
