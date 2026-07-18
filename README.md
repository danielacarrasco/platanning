# Platanning

A calm, non-judgemental fortnightly cash-flow planner for one person with high income, high fixed
obligations, family-support responsibilities, and a mix of mortgage, personal loan, and credit
card debt. It answers: what's safe to spend this fortnight, what's due before the next payday,
which debt to prioritise next, and whether cards are being used as a cash-flow bridge — without
shame-based language.

The app is local-first: all data lives in a SQLite file on disk (`data/platanning.db`, gitignored)
and is never sent anywhere unless you explicitly use the AI Coach.

## Sections

- **Dashboard** — this fortnight's status (green/yellow/red), a breakdown of cash vs. what's
  already allocated vs. true discretionary money, and the current debt priority.
- **Fortnight Planner** — converts every bill to a fortnightly set-aside, computes safe-to-spend,
  and splits it into fun money / hobbies / holiday / buffer / card cleanup under gentle, balanced,
  or aggressive planning styles.
- **Bills Calendar** — every obligation on its real due date, grouped by fortnight, with heavy
  fortnights flagged.
- **Spending Tracker** — manual entry and CSV import, with transfers, card payments, debt
  payments, and interest kept separate from real spending so nothing double-counts.
- **Credit Card Control** — per-card statement tracking, a clean/watch/risk/problem classification,
  and a "Cash Before Card" flow that shows the consequence of an unfunded purchase instead of
  blocking it.
- **Debt Strategy** — avalanche vs. cash-flow-relief priority ordering, a payoff timeline under
  different extra-payment scenarios, and a "breathing room" date.
- **Goals & Sinking Funds** — buffer, holiday, irregular bills, and a protected sewing/hobby fund
  (deliberate joy spending, not a leak).
- **Long-Term Visuals** — cash-flow forecast, debt payoff timeline, net worth, fixed-cost
  pressure, and spending grouped by what it says about priorities (home/security, family support,
  health/recovery, debt cleanup, joy/identity, convenience, future self).
- **Monthly Review** — a deterministic, supportively-worded look back at the month.
- **AI Coach** — optional. Builds a structured summary of your numbers, previews exactly what
  would be sent, and asks an OpenAI model to interpret it — it never recalculates your numbers
  itself.
- **Settings** — every assumption (income, accounts, debts, recurring bills, planning targets) is
  editable; the app ships pre-filled with an example starting position purely so it's useful on
  first load.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first run the app seeds itself with an
editable example financial position — change anything in **Settings** to match reality.

### AI Coach (optional)

Set `OPENAI_API_KEY` in your environment to enable the AI Coach. Without it, every other page
works normally; the Coach page will let you preview the data packet but can't send it.

```bash
OPENAI_API_KEY=sk-... npm run dev
```

The model defaults to `gpt-4o-mini`; override it with `OPENAI_MODEL` if you want a different one.

By default only summary figures are sent, never raw transaction descriptions — see the privacy
toggle on the Coach page.

## Data & privacy

- All data is stored in a local SQLite file (`data/platanning.db`), not committed to git.
- CSV export is available for every table (Settings and each relevant page have export buttons),
  plus a full backup export — your data is never locked into the app.
- The only network call this app ever makes is the optional AI Coach request, and only when you
  click a Coach button.

## Tech

Next.js (App Router) + TypeScript + Tailwind CSS v4 + better-sqlite3 + Recharts. No external
services required to run the core app.
