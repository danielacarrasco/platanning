"use server";

import { revalidatePath } from "next/cache";
import { SinkingFunds } from "@/lib/db/repo";

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

export async function createSinkingFund(fd: FormData) {
  SinkingFunds.create({
    name: str(fd, "name"),
    targetAmount: num(fd, "targetAmount"),
    currentAmount: num(fd, "currentAmount"),
    targetDate: strOrNull(fd, "targetDate"),
    fortnightlyContribution: num(fd, "fortnightlyContribution"),
    priority: num(fd, "priority") || 5,
    canPauseInRedFortnight: fd.get("canPauseInRedFortnight") === "on",
    notes: strOrNull(fd, "notes"),
  });
  revalidatePath("/goals");
  revalidatePath("/");
}

export async function updateSinkingFund(fd: FormData) {
  const id = num(fd, "id");
  SinkingFunds.update(id, {
    name: str(fd, "name"),
    targetAmount: num(fd, "targetAmount"),
    targetDate: strOrNull(fd, "targetDate"),
    fortnightlyContribution: num(fd, "fortnightlyContribution"),
    priority: num(fd, "priority") || 5,
    canPauseInRedFortnight: fd.get("canPauseInRedFortnight") === "on",
  });
  revalidatePath("/goals");
  revalidatePath("/");
}

export async function contributeToSinkingFund(fd: FormData) {
  const id = num(fd, "id");
  const amount = num(fd, "amount");
  const fund = SinkingFunds.all().find((f) => f.id === id);
  if (fund) {
    SinkingFunds.update(id, { currentAmount: fund.currentAmount + amount });
  }
  revalidatePath("/goals");
  revalidatePath("/");
}

export async function deleteSinkingFund(fd: FormData) {
  SinkingFunds.remove(num(fd, "id"));
  revalidatePath("/goals");
  revalidatePath("/");
}
