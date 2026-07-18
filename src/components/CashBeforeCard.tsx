"use client";

import { useActionState, useState } from "react";
import { logCardPurchase, type CardPurchaseResult } from "@/app/cards/actions";
import { CATEGORIES } from "@/lib/types";
import type { Account } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const labelCls = "text-xs text-muted block mb-1";

const FUNDING_OPTIONS: { value: string; label: string }[] = [
  { value: "cash_allowance", label: "Weekly discretionary allowance" },
  { value: "bills_holding", label: "Bills / card holding account" },
  { value: "emergency_buffer", label: "Emergency buffer" },
  { value: "not_yet_funded", label: "I do not have the cash yet" },
];

const initialState: CardPurchaseResult = { ok: false };

export function CashBeforeCard({ cardAccounts }: { cardAccounts: Account[] }) {
  const [funding, setFunding] = useState("cash_allowance");
  const [state, formAction, pending] = useActionState(async (_prev: CardPurchaseResult, fd: FormData) => {
    return logCardPurchase(fd);
  }, initialState);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Before logging a card purchase: where is the cash for this coming from?
      </p>
      <form action={formAction} className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Card</label>
          <select name="cardAccountId" className={inputCls} required>
            {cardAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Amount</label>
          <input name="amount" type="number" step="0.01" className={inputCls} required />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>What is it?</label>
          <input name="description" type="text" className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Date</label>
          <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select name="category" className={inputCls} defaultValue="Discretionary life">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Where is the cash for this purchase?</label>
          <select
            name="fundingSource"
            className={inputCls}
            value={funding}
            onChange={(e) => setFunding(e.target.value)}
          >
            {FUNDING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {funding === "not_yet_funded" && (
          <div className="sm:col-span-2 rounded-lg border border-status-yellow-border bg-status-yellow-bg px-3 py-2 text-sm text-status-yellow-fg">
            This means the card is being used as a cash-flow bridge. That may be necessary
            sometimes, but it reduces next fortnight&apos;s flexibility.
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isDiscretionary" defaultChecked /> Discretionary spending
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Logging…" : "Log purchase"}
          </button>
        </div>
      </form>
      {state.warning && (
        <div className="rounded-lg border border-status-red-border bg-status-red-bg px-3 py-2 text-sm text-status-red-fg">
          {state.warning}
        </div>
      )}
    </div>
  );
}
