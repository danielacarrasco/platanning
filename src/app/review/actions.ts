"use server";

import { revalidatePath } from "next/cache";
import { MonthlyReviews } from "@/lib/db/repo";
import { generateMonthlyReview } from "@/lib/review";

export async function saveMonthlyReview(fd: FormData) {
  const month = String(fd.get("month") ?? "");
  if (!month) return;
  const review = generateMonthlyReview(month);
  MonthlyReviews.upsert(review);
  revalidatePath("/review");
}
