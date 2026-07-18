import { AiInsights } from "@/lib/db/repo";
import { getAiPrivacyMode } from "@/lib/aiCoach";
import { Panel, EmptyState } from "@/components/ui";
import { CoachClient } from "@/components/CoachClient";
import { updatePrivacyMode, saveManualInsight, updateInsight, deleteInsight } from "./actions";

export const dynamic = "force-dynamic";

const btnCls = "rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90";
const inputCls =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

export default function CoachPage() {
  const insights = AiInsights.active();
  const privacyMode = getAiPrivacyMode();
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">AI Financial Coach</h1>
        <p className="text-sm text-muted mt-1">
          The app calculates every number deterministically. The AI coach only interprets,
          questions, and suggests — it never changes your numbers.
        </p>
      </div>

      {!hasKey && (
        <Panel className="border-status-yellow-border bg-status-yellow-bg/40">
          <p className="text-sm">
            No <code>ANTHROPIC_API_KEY</code> is configured yet, so the coach can&apos;t respond.
            You can still preview exactly what would be sent below. Set the environment variable
            to enable live coaching.
          </p>
        </Panel>
      )}

      <Panel title="Privacy" subtitle="What data leaves this app when you use the coach.">
        <form action={updatePrivacyMode} className="flex flex-wrap items-center gap-2">
          <label className={`rounded-lg border px-3 py-2 text-sm cursor-pointer ${privacyMode === "summary_only" ? "border-primary bg-primary-soft font-medium" : "border-border"}`}>
            <input type="radio" name="mode" value="summary_only" defaultChecked={privacyMode === "summary_only"} className="mr-2" />
            Send summaries only (default)
          </label>
          <label className={`rounded-lg border px-3 py-2 text-sm cursor-pointer ${privacyMode === "raw_opt_in" ? "border-primary bg-primary-soft font-medium" : "border-border"}`}>
            <input type="radio" name="mode" value="raw_opt_in" defaultChecked={privacyMode === "raw_opt_in"} className="mr-2" />
            Include raw merchant/transaction detail
          </label>
          <button type="submit" className={btnCls}>Save</button>
        </form>
        <p className="text-xs text-muted mt-2">
          The data packet never includes bank credentials. Raw transaction descriptions are only
          included if you explicitly opt in above — the current fortnight totals are the same
          numbers shown on your Dashboard either way.
        </p>
      </Panel>

      <Panel title="Ask the coach">
        <CoachClient />
      </Panel>

      <Panel title="What the coach has learned" subtitle="Editable and deletable — nothing is remembered without your ability to see and change it.">
        {insights.length === 0 ? (
          <EmptyState>No learned insights yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-border mb-4">
            {insights.map((i) => (
              <li key={i.id} className="py-2">
                <details>
                  <summary className="cursor-pointer text-sm flex items-center justify-between gap-2">
                    <span>{i.text}</span>
                    <span className="text-xs text-muted shrink-0">{i.source}</span>
                  </summary>
                  <form action={updateInsight} className="flex gap-2 mt-2">
                    <input type="hidden" name="id" value={i.id} />
                    <input name="text" defaultValue={i.text} className={inputCls} />
                    <button className={btnCls} type="submit">Save</button>
                  </form>
                  <form action={deleteInsight} className="mt-1">
                    <input type="hidden" name="id" value={i.id} />
                    <button className="text-xs text-status-red-fg underline" type="submit">Delete</button>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
        <details>
          <summary className="cursor-pointer text-sm font-medium text-primary">+ Add your own note</summary>
          <form action={saveManualInsight} className="flex gap-2 mt-2">
            <input name="text" placeholder="e.g. I regret impulse fabric buys but not planned ones" className={inputCls} />
            <button className={btnCls} type="submit">Save</button>
          </form>
        </details>
      </Panel>
    </div>
  );
}
