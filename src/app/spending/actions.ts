"use server";

import { revalidatePath } from "next/cache";
import { Transactions } from "@/lib/db/transactions";
import { parseCsv } from "@/lib/csv";
import { suggestCategory } from "@/lib/categorize";
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
  Transactions.create({
    date: str(fd, "date"),
    accountId: numOrNull(fd, "accountId"),
    description,
    amount: num(fd, "amount"),
    merchant: strOrNull(fd, "merchant"),
    category: (str(fd, "category") || suggestion.category) as Category,
    subcategory: strOrNull(fd, "subcategory"),
    isTransfer: fd.get("isTransfer") === "on",
    isCreditCardPayment: fd.get("isCreditCardPayment") === "on",
    isDebtPayment: fd.get("isDebtPayment") === "on",
    isInterest: fd.get("isInterest") === "on",
    isFee: fd.get("isFee") === "on",
    isDiscretionary: fd.get("isDiscretionary") === "on",
    isFamilySupport: fd.get("isFamilySupport") === "on",
    isPlanned: fd.get("isPlanned") === "on",
    fundingSource: (strOrNull(fd, "fundingSource") as FundingSource) ?? null,
    notes: strOrNull(fd, "notes"),
  });
  revalidatePath("/spending");
  revalidatePath("/");
}

export async function updateTransaction(fd: FormData) {
  const id = num(fd, "id");
  Transactions.update(id, {
    date: str(fd, "date"),
    description: str(fd, "description"),
    amount: num(fd, "amount"),
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
  revalidatePath("/spending");
  revalidatePath("/");
}

export async function deleteTransaction(fd: FormData) {
  Transactions.remove(num(fd, "id"));
  revalidatePath("/spending");
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
