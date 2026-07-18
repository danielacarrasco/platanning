import { Accounts, Debts, SinkingFunds, Settings, AiInsights } from "./db/repo";
import { Transactions } from "./db/transactions";
import { buildFortnightSnapshot, getFortnightWindow, getPlanningStyle, getPlanningDefaults } from "./planning";
import { computeDebtPriority, round2 } from "./calculations";

export type AiPrivacyMode = "summary_only" | "raw_opt_in";

export interface CoachDataPacket {
  user_context: {
    planning_style: string;
    primary_goals: string[];
    important_context: string[];
  };
  current_period: {
    start_date: string;
    end_date: string;
    fortnight_status: string;
    income: number;
    starting_cash: number;
    bills_due: number;
    required_debt_payments: number;
    planned_discretionary: number;
    actual_discretionary: number;
    planned_hobbies: number;
    actual_hobbies: number;
    card_spending: number;
    card_payments: number;
    ending_cash_forecast: number;
  };
  debt_snapshot: {
    balances: { name: string; balance: number; interest_rate: number }[];
    highest_priority_debt: string;
  };
  goals: {
    emergency_buffer_current: number;
    emergency_buffer_target: number;
    holiday_fund_current: number;
    holiday_fund_target: number;
  };
  recent_patterns: string[];
  user_question: string;
  recent_transactions?: { date: string; description: string; amount: number; category: string }[];
}

export const PRIMARY_GOALS = [
  "avoid credit card interest",
  "maintain cash buffer",
  "save for one holiday",
  "reduce high-interest debt",
  "preserve some joy spending",
];

export const IMPORTANT_CONTEXT = [
  "family support is a core obligation, not discretionary",
  "therapy and health spending should be protected",
  "sewing is emotionally valuable but needs a cap",
  "credit cards are currently used partly as a cash-flow bridge",
];

export function buildDataPacket(question: string, privacyMode: AiPrivacyMode = "summary_only"): CoachDataPacket {
  const style = getPlanningStyle();
  const defaults = getPlanningDefaults();
  const window = getFortnightWindow();
  const snapshot = buildFortnightSnapshot(window, style, defaults);
  const debts = Debts.all().filter((d) => d.balance > 0);
  const priority = computeDebtPriority(debts, "avalanche");
  const funds = SinkingFunds.all();
  const bufferFund = funds.find((f) => f.name === "Emergency buffer");
  const holidayFund = funds.find((f) => f.name === "Holiday fund");
  const patterns = AiInsights.active().map((i) => i.text);

  const windowTxns = Transactions.list({ from: window.startDate, to: window.endDate });
  const cardAccountIds = new Set(Accounts.all().filter((a) => a.type === "credit_card").map((a) => a.id));
  const actualDiscretionary = round2(
    windowTxns
      .filter((t) => t.category === "Discretionary life" && t.isDiscretionary && t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0)
  );
  const actualHobbies = round2(
    windowTxns
      .filter((t) => t.category === "Hobbies and identity" && t.isDiscretionary && t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0)
  );
  const cardSpending = round2(
    windowTxns
      .filter((t) => t.accountId && cardAccountIds.has(t.accountId) && t.amount < 0 && !t.isCreditCardPayment && !t.isTransfer)
      .reduce((s, t) => s + Math.abs(t.amount), 0)
  );

  const packet: CoachDataPacket = {
    user_context: {
      planning_style: style,
      primary_goals: PRIMARY_GOALS,
      important_context: IMPORTANT_CONTEXT,
    },
    current_period: {
      start_date: window.startDate,
      end_date: window.endDate,
      fortnight_status: snapshot.status,
      income: snapshot.income,
      starting_cash: snapshot.startingCash,
      bills_due: snapshot.billsDue,
      required_debt_payments: snapshot.requiredDebtPayments + snapshot.cardPayments,
      planned_discretionary: snapshot.buckets.funMoney,
      actual_discretionary: actualDiscretionary,
      planned_hobbies: snapshot.buckets.hobbyMoney,
      actual_hobbies: actualHobbies,
      card_spending: cardSpending,
      card_payments: snapshot.cardPayments,
      ending_cash_forecast: snapshot.endingCashForecast,
    },
    debt_snapshot: {
      balances: Accounts.all()
        .filter((a) => a.type === "credit_card" || a.type === "personal_loan" || a.type === "mortgage")
        .map((a) => ({ name: a.name, balance: a.currentBalance, interest_rate: a.interestRate ?? 0 })),
      highest_priority_debt: priority.find((p) => p.group !== "promotional_zero_percent")?.debt.name ?? "none",
    },
    goals: {
      emergency_buffer_current: bufferFund?.currentAmount ?? 0,
      emergency_buffer_target: bufferFund?.targetAmount ?? 0,
      holiday_fund_current: holidayFund?.currentAmount ?? 0,
      holiday_fund_target: holidayFund?.targetAmount ?? 0,
    },
    recent_patterns: patterns,
    user_question: question,
  };

  if (privacyMode === "raw_opt_in") {
    packet.recent_transactions = windowTxns.slice(0, 15).map((t) => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      category: t.category,
    }));
  }

  return packet;
}

export function getAiPrivacyMode(): AiPrivacyMode {
  return Settings.get<AiPrivacyMode>("aiPrivacyMode", "summary_only");
}

export interface CoachAdvice {
  summary: string;
  what_went_well: string[];
  what_needs_attention: string[];
  questions_for_user: string[];
  recommended_actions: { action: string; why: string; impact: string; difficulty: "easy" | "medium" | "hard" }[];
  next_fortnight_suggestion: {
    fun_money: number;
    hobbies: number;
    card_payment_target: number;
    holiday_contribution: number;
    buffer_contribution: number;
  };
  learned_insights_to_save: string[];
}

export const COACH_SYSTEM_PROMPT = `You are a calm, non-judgemental personal finance coach inside a fortnightly cash-flow planning app.
Rules:
- Never use shame-based language ("bad spending", "irresponsible", "failure", "you overspent again", "unnecessary expenses").
- Separate moral judgement from financial risk. Describe consequences, not character.
- Family support and therapy/health spending are core obligations, not discretionary — never suggest cutting them.
- Sewing/hobbies is deliberate joy spending with a cap, not a leak to eliminate.
- The deterministic numbers in the data packet are already correct — interpret them, do not recompute them.
- You are not providing financial, tax, or legal advice — this is coaching and interpretation only.
Respond with ONLY valid JSON matching this exact shape, no markdown fencing:
{
  "summary": string,
  "what_went_well": string[],
  "what_needs_attention": string[],
  "questions_for_user": string[],
  "recommended_actions": [{"action": string, "why": string, "impact": string, "difficulty": "easy"|"medium"|"hard"}],
  "next_fortnight_suggestion": {"fun_money": number, "hobbies": number, "card_payment_target": number, "holiday_contribution": number, "buffer_contribution": number},
  "learned_insights_to_save": string[]
}`;
