"use server";

import { revalidatePath } from "next/cache";
import { Accounts, IncomeSources, RecurringExpenses, Debts, Paydays, Settings } from "@/lib/db/repo";
import { DEFAULT_PLANNING_DEFAULTS, type PlanningDefaults } from "@/lib/calculations";
import { syncAccountBalanceFromDebts } from "@/lib/cardBalance";
import type { AccountType, Debt, DebtType, Frequency, Importance, AmountType, PlanningStyle } from "@/lib/types";

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

/* Accounts */
export async function createAccount(fd: FormData) {
  Accounts.create({
    name: str(fd, "name"),
    type: str(fd, "type") as AccountType,
    institution: strOrNull(fd, "institution"),
    currentBalance: num(fd, "currentBalance"),
    interestRate: numOrNull(fd, "interestRate"),
    creditLimit: numOrNull(fd, "creditLimit"),
    statementDay: numOrNull(fd, "statementDay"),
    paymentDueDay: numOrNull(fd, "paymentDueDay"),
    notes: strOrNull(fd, "notes"),
  });
  revalidatePath("/settings");
  revalidatePath("/");
}
export async function updateAccount(fd: FormData) {
  const id = num(fd, "id");
  Accounts.update(id, {
    name: str(fd, "name"),
    type: str(fd, "type") as AccountType,
    institution: strOrNull(fd, "institution"),
    currentBalance: num(fd, "currentBalance"),
    interestRate: numOrNull(fd, "interestRate"),
    creditLimit: numOrNull(fd, "creditLimit"),
    notes: strOrNull(fd, "notes"),
  });
  revalidatePath("/settings");
  revalidatePath("/");
}
export async function deleteAccount(fd: FormData) {
  Accounts.remove(num(fd, "id"));
  revalidatePath("/settings");
  revalidatePath("/");
}

/* Income sources */
export async function createIncomeSource(fd: FormData) {
  IncomeSources.create({
    name: str(fd, "name"),
    amount: num(fd, "amount"),
    frequency: str(fd, "frequency") as Frequency,
    nextDate: strOrNull(fd, "nextDate"),
    accountId: numOrNull(fd, "accountId"),
    notes: strOrNull(fd, "notes"),
  });
  revalidatePath("/settings");
  revalidatePath("/");
}
export async function deleteIncomeSource(fd: FormData) {
  IncomeSources.remove(num(fd, "id"));
  revalidatePath("/settings");
  revalidatePath("/");
}

/* Paydays */
export async function createPayday(fd: FormData) {
  Paydays.create({ date: str(fd, "date"), amount: num(fd, "amount"), source: str(fd, "source") });
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/planner");
  revalidatePath("/bills");
}
export async function deletePayday(fd: FormData) {
  Paydays.remove(num(fd, "id"));
  revalidatePath("/settings");
  revalidatePath("/");
}

/* Recurring expenses */
export async function createRecurringExpense(fd: FormData) {
  RecurringExpenses.create({
    name: str(fd, "name"),
    amount: num(fd, "amount"),
    frequency: str(fd, "frequency") as Frequency,
    nextDueDate: str(fd, "nextDueDate"),
    category: str(fd, "category"),
    accountId: numOrNull(fd, "accountId"),
    isEssential: fd.get("isEssential") === "on",
    canPause: fd.get("canPause") === "on",
    importance: str(fd, "importance") as Importance,
    amountType: str(fd, "amountType") as AmountType,
    paymentMethod: strOrNull(fd, "paymentMethod"),
    notes: strOrNull(fd, "notes"),
  });
  revalidatePath("/settings");
  revalidatePath("/bills");
  revalidatePath("/");
}
export async function updateRecurringExpense(fd: FormData) {
  const id = num(fd, "id");
  RecurringExpenses.update(id, {
    name: str(fd, "name"),
    amount: num(fd, "amount"),
    frequency: str(fd, "frequency") as Frequency,
    nextDueDate: str(fd, "nextDueDate"),
    category: str(fd, "category"),
    isEssential: fd.get("isEssential") === "on",
    canPause: fd.get("canPause") === "on",
    importance: str(fd, "importance") as Importance,
    amountType: str(fd, "amountType") as AmountType,
    paymentMethod: strOrNull(fd, "paymentMethod"),
  });
  revalidatePath("/settings");
  revalidatePath("/bills");
  revalidatePath("/");
}
export async function deleteRecurringExpense(fd: FormData) {
  RecurringExpenses.remove(num(fd, "id"));
  revalidatePath("/settings");
  revalidatePath("/bills");
  revalidatePath("/");
}

/* Debts */
export async function createDebt(fd: FormData) {
  const debt = Debts.create({
    name: str(fd, "name"),
    accountId: numOrNull(fd, "accountId"),
    balance: num(fd, "balance"),
    interestRate: num(fd, "interestRate"),
    minimumPayment: num(fd, "minimumPayment"),
    paymentFrequency: str(fd, "paymentFrequency") as Debt["paymentFrequency"],
    debtType: str(fd, "debtType") as DebtType,
    nextPaymentDate: strOrNull(fd, "nextPaymentDate"),
    priority: null,
    isPromotional: fd.get("isPromotional") === "on",
    promotionalEndDate: strOrNull(fd, "promotionalEndDate"),
    notes: strOrNull(fd, "notes"),
  });
  // Linking a debt to a credit_card/personal_loan/mortgage account mirrors the SUM of every
  // debt linked to that account onto its balance — see lib/cardBalance.ts.
  syncAccountBalanceFromDebts(debt.accountId);
  revalidatePath("/settings");
  revalidatePath("/debt");
  revalidatePath("/");
}
export async function updateDebt(fd: FormData) {
  const id = num(fd, "id");
  const before = Debts.get(id);
  const debt = Debts.update(id, {
    name: str(fd, "name"),
    accountId: numOrNull(fd, "accountId"),
    balance: num(fd, "balance"),
    interestRate: num(fd, "interestRate"),
    minimumPayment: num(fd, "minimumPayment"),
    paymentFrequency: str(fd, "paymentFrequency") as Debt["paymentFrequency"],
    nextPaymentDate: strOrNull(fd, "nextPaymentDate"),
    isPromotional: fd.get("isPromotional") === "on",
    promotionalEndDate: strOrNull(fd, "promotionalEndDate"),
  });
  syncAccountBalanceFromDebts(debt.accountId);
  if (before && before.accountId !== debt.accountId) {
    syncAccountBalanceFromDebts(before.accountId); // moved off this account — recompute its old total too
  }
  revalidatePath("/settings");
  revalidatePath("/debt");
  revalidatePath("/");
}
export async function deleteDebt(fd: FormData) {
  const id = num(fd, "id");
  const debt = Debts.get(id);
  Debts.remove(id);
  syncAccountBalanceFromDebts(debt?.accountId ?? null);
  revalidatePath("/settings");
  revalidatePath("/debt");
  revalidatePath("/");
}

/* Planning style + defaults */
export async function updatePlanningStyle(fd: FormData) {
  Settings.set<PlanningStyle>("planningStyle", str(fd, "planningStyle") as PlanningStyle);
  revalidatePath("/");
  revalidatePath("/planner");
}

export async function updatePlanningDefaults(fd: FormData) {
  const current = Settings.get<PlanningDefaults>("planningDefaults", DEFAULT_PLANNING_DEFAULTS);
  const updated: PlanningDefaults = {
    funMoneyWeekly: num(fd, "funMoneyWeekly") || current.funMoneyWeekly,
    hobbyFortnightly: num(fd, "hobbyFortnightly") || current.hobbyFortnightly,
    holidayMonthly: num(fd, "holidayMonthly") || current.holidayMonthly,
    bufferPhase1: num(fd, "bufferPhase1") || current.bufferPhase1,
    bufferPhase2: num(fd, "bufferPhase2") || current.bufferPhase2,
    hardFloorBuffer: num(fd, "hardFloorBuffer") || current.hardFloorBuffer,
  };
  Settings.set("planningDefaults", updated);
  revalidatePath("/");
  revalidatePath("/planner");
}
