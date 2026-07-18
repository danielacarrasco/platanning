"use client";

import { useState, useTransition } from "react";
import { previewDataPacket } from "@/app/coach/actions";
import type { CoachDataPacket, CoachAdvice } from "@/lib/aiCoach";
import { formatCurrency } from "@/lib/format";

const QUICK_ACTIONS = [
  "Review my fortnight",
  "What am I doing well?",
  "What needs attention?",
  "Ask me useful questions",
  "Explain my spending patterns",
  "Give me next fortnight's plan",
  "Help me avoid card debt",
  "Prepare my monthly review",
];

const btnCls = "rounded-full border border-border px-3 py-1.5 text-sm hover:bg-surface-muted";

export function CoachClient() {
  const [question, setQuestion] = useState(QUICK_ACTIONS[0]);
  const [packet, setPacket] = useState<CoachDataPacket | null>(null);
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sending, setSending] = useState(false);

  function handlePreview(q: string) {
    setQuestion(q);
    setAdvice(null);
    setError(null);
    startTransition(async () => {
      const p = await previewDataPacket(q);
      setPacket(p);
    });
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, saveInsights: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setPacket(data.packet);
        setAdvice(data.advice);
      }
    } catch {
      setError("Couldn't reach the AI coach.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((q) => (
          <button
            key={q}
            className={`${btnCls} ${q === question ? "border-primary bg-primary-soft font-medium" : ""}`}
            onClick={() => handlePreview(q)}
          >
            {q}
          </button>
        ))}
      </div>

      {packet && (
        <div className="space-y-3">
          <details className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Preview what gets sent {pending && "(updating…)"}
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-surface-muted p-3 text-xs">
              {JSON.stringify(packet, null, 2)}
            </pre>
          </details>
          <button
            onClick={handleSend}
            disabled={sending}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {sending ? "Asking the coach…" : `Send to AI Coach: "${question}"`}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-status-red-border bg-status-red-bg px-3 py-2 text-sm text-status-red-fg">
          {error}
        </div>
      )}

      {advice && (
        <div className="space-y-4 rounded-xl border border-border p-4">
          <p className="text-sm leading-relaxed">{advice.summary}</p>

          {advice.what_went_well.length > 0 && (
            <Section title="What's going well">
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {advice.what_went_well.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </Section>
          )}

          {advice.what_needs_attention.length > 0 && (
            <Section title="What needs attention">
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {advice.what_needs_attention.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </Section>
          )}

          {advice.questions_for_user.length > 0 && (
            <Section title="Questions worth sitting with">
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {advice.questions_for_user.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </Section>
          )}

          {advice.recommended_actions.length > 0 && (
            <Section title="Recommended actions">
              <ul className="space-y-2">
                {advice.recommended_actions.map((a, i) => (
                  <li key={i} className="text-sm rounded-lg bg-surface-muted p-2.5">
                    <p className="font-medium">{a.action} <span className="text-xs text-muted">({a.difficulty})</span></p>
                    <p className="text-muted">{a.why}</p>
                    <p className="text-muted">Impact: {a.impact}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Next fortnight suggestion">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
              <SuggestStat label="Fun money" value={advice.next_fortnight_suggestion.fun_money} />
              <SuggestStat label="Hobbies" value={advice.next_fortnight_suggestion.hobbies} />
              <SuggestStat label="Card target" value={advice.next_fortnight_suggestion.card_payment_target} />
              <SuggestStat label="Holiday" value={advice.next_fortnight_suggestion.holiday_contribution} />
              <SuggestStat label="Buffer" value={advice.next_fortnight_suggestion.buffer_contribution} />
            </div>
          </Section>

          {advice.learned_insights_to_save.length > 0 && (
            <p className="text-xs text-muted">
              Saved {advice.learned_insights_to_save.length} insight(s) to your learned patterns below.
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-muted">
        This is coaching and interpretation, not financial, tax, or legal advice.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold mb-1.5">{title}</p>
      {children}
    </div>
  );
}

function SuggestStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-muted p-2 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-medium tabular-nums">{formatCurrency(value)}</p>
    </div>
  );
}
