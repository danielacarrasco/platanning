"use server";

import { revalidatePath } from "next/cache";
import { FortnightOverrides } from "@/lib/db/repo";
import type { FortnightOverrideField } from "@/lib/types";

const OVERRIDE_FIELDS: FortnightOverrideField[] = [
  "startingCash",
  "income",
  "billsDue",
  "debtAndCardPayments",
  "requiredSetAsides",
  "hardFloorBuffer",
];

export async function setFortnightOverrides(fd: FormData) {
  const windowStart = String(fd.get("windowStart") ?? "").trim();
  if (!windowStart) return;
  for (const field of OVERRIDE_FIELDS) {
    const raw = fd.get(field);
    if (raw === null || raw === "") continue;
    const value = Number(raw);
    if (Number.isNaN(value)) continue;
    FortnightOverrides.set(windowStart, field, value);
  }
  revalidatePath("/planner");
  revalidatePath("/");
}

export async function clearFortnightOverrides(fd: FormData) {
  const windowStart = String(fd.get("windowStart") ?? "").trim();
  if (!windowStart) return;
  FortnightOverrides.clearAll(windowStart);
  revalidatePath("/planner");
  revalidatePath("/");
}
