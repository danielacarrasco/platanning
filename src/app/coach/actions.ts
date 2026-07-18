"use server";

import { revalidatePath } from "next/cache";
import { AiInsights, Settings } from "@/lib/db/repo";
import { buildDataPacket, getAiPrivacyMode, type AiPrivacyMode } from "@/lib/aiCoach";

export async function previewDataPacket(question: string) {
  return buildDataPacket(question, getAiPrivacyMode());
}

export async function updatePrivacyMode(fd: FormData) {
  Settings.set<AiPrivacyMode>("aiPrivacyMode", String(fd.get("mode")) as AiPrivacyMode);
  revalidatePath("/coach");
}

export async function saveManualInsight(fd: FormData) {
  const text = String(fd.get("text") ?? "").trim();
  if (text) AiInsights.create(text, "user");
  revalidatePath("/coach");
}

export async function updateInsight(fd: FormData) {
  const id = Number(fd.get("id"));
  const text = String(fd.get("text") ?? "").trim();
  if (text) AiInsights.update(id, text);
  revalidatePath("/coach");
}

export async function deleteInsight(fd: FormData) {
  AiInsights.remove(Number(fd.get("id")));
  revalidatePath("/coach");
}
