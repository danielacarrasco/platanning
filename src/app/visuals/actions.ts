"use server";

import { revalidatePath } from "next/cache";
import { Settings } from "@/lib/db/repo";
import { DEFAULT_NET_WORTH_ASSUMPTIONS, type NetWorthAssumptions } from "@/lib/longterm";

export async function updateNetWorthAssumptions(fd: FormData) {
  const current = Settings.get<NetWorthAssumptions>("netWorthAssumptions", DEFAULT_NET_WORTH_ASSUMPTIONS);
  const num = (key: string) => {
    const v = fd.get(key);
    return v === null || v === "" ? current[key as keyof NetWorthAssumptions] : Number(v);
  };
  Settings.set<NetWorthAssumptions>("netWorthAssumptions", {
    propertyEstimate: num("propertyEstimate"),
    superBalance: num("superBalance"),
    investments: num("investments"),
  });
  revalidatePath("/visuals");
}
