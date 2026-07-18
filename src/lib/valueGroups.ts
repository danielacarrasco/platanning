import type { Category, ValueGroup } from "./types";

export function mapToValueGroup(description: string, category: Category | string): ValueGroup {
  const text = description.toLowerCase();
  if (/therap|psycholog|counsel|medical|pharmacy|chemist|doctor|\bgp\b|vet\b/.test(text)) {
    return "health/recovery";
  }
  if (category === "Family support") return "family support";
  if (category === "Credit card / debt management") return "debt cleanup";
  if (category === "Discretionary life" || category === "Hobbies and identity" || category === "Personal") {
    return "joy/identity";
  }
  if (/subscription|netflix|spotify|prime video|disney/.test(text)) return "convenience";
  if (category === "Goals") return "future self";
  if (category === "Home" || /mortgage|utilit|insurance|rates|body corporate|land tax/.test(text)) {
    return "home/security";
  }
  return "convenience";
}
