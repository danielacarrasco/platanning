import { getDb } from "./index";
import { toCamel, toCamelList } from "./mapper";
import type {
  Account,
  AiInsight,
  CreditCardStatement,
  Debt,
  FortnightPlan,
  IncomeSource,
  MonthlyReview,
  Payday,
  RecurringExpense,
  SinkingFund,
} from "../types";

/* Accounts ---------------------------------------------------------------*/
export const Accounts = {
  all(): Account[] {
    return toCamelList<Account>(
      getDb().prepare("SELECT * FROM account WHERE archived = 0 ORDER BY id").all() as Record<
        string,
        unknown
      >[]
    );
  },
  get(id: number): Account | undefined {
    const row = getDb().prepare("SELECT * FROM account WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? toCamel<Account>(row) : undefined;
  },
  create(data: Omit<Account, "id" | "archived">): Account {
    const stmt = getDb().prepare(
      `INSERT INTO account (name, type, institution, current_balance, interest_rate, credit_limit, statement_day, payment_due_day, notes)
       VALUES (@name, @type, @institution, @currentBalance, @interestRate, @creditLimit, @statementDay, @paymentDueDay, @notes)`
    );
    const info = stmt.run(data);
    return Accounts.get(Number(info.lastInsertRowid))!;
  },
  update(id: number, data: Partial<Omit<Account, "id">>): Account {
    const existing = Accounts.get(id);
    if (!existing) throw new Error("Account not found");
    const merged = { ...existing, ...data };
    getDb()
      .prepare(
        `UPDATE account SET name=@name, type=@type, institution=@institution, current_balance=@currentBalance,
         interest_rate=@interestRate, credit_limit=@creditLimit, statement_day=@statementDay,
         payment_due_day=@paymentDueDay, notes=@notes, archived=@archived WHERE id=@id`
      )
      .run({ ...merged, id, archived: merged.archived ? 1 : 0 });
    return Accounts.get(id)!;
  },
  remove(id: number) {
    getDb().prepare("UPDATE account SET archived = 1 WHERE id = ?").run(id);
  },
};

/* Income sources -----------------------------------------------------------*/
export const IncomeSources = {
  all(): IncomeSource[] {
    return toCamelList<IncomeSource>(
      getDb().prepare("SELECT * FROM income_source WHERE archived = 0 ORDER BY id").all() as Record<
        string,
        unknown
      >[]
    );
  },
  get(id: number): IncomeSource | undefined {
    const row = getDb().prepare("SELECT * FROM income_source WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? toCamel<IncomeSource>(row) : undefined;
  },
  create(data: Omit<IncomeSource, "id" | "archived">): IncomeSource {
    const info = getDb()
      .prepare(
        `INSERT INTO income_source (name, amount, frequency, next_date, account_id, notes)
         VALUES (@name, @amount, @frequency, @nextDate, @accountId, @notes)`
      )
      .run(data);
    return IncomeSources.get(Number(info.lastInsertRowid))!;
  },
  update(id: number, data: Partial<Omit<IncomeSource, "id">>): IncomeSource {
    const existing = IncomeSources.get(id);
    if (!existing) throw new Error("Income source not found");
    const merged = { ...existing, ...data };
    getDb()
      .prepare(
        `UPDATE income_source SET name=@name, amount=@amount, frequency=@frequency, next_date=@nextDate,
         account_id=@accountId, notes=@notes, archived=@archived WHERE id=@id`
      )
      .run({ ...merged, id, archived: merged.archived ? 1 : 0 });
    return IncomeSources.get(id)!;
  },
  remove(id: number) {
    getDb().prepare("UPDATE income_source SET archived = 1 WHERE id = ?").run(id);
  },
};

/* Recurring expenses ---------------------------------------------------- */
export const RecurringExpenses = {
  all(): RecurringExpense[] {
    return toCamelList<RecurringExpense>(
      getDb()
        .prepare("SELECT * FROM recurring_expense WHERE archived = 0 ORDER BY next_due_date")
        .all() as Record<string, unknown>[]
    );
  },
  get(id: number): RecurringExpense | undefined {
    const row = getDb().prepare("SELECT * FROM recurring_expense WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? toCamel<RecurringExpense>(row) : undefined;
  },
  create(data: Omit<RecurringExpense, "id" | "archived">): RecurringExpense {
    const info = getDb()
      .prepare(
        `INSERT INTO recurring_expense
          (name, amount, frequency, next_due_date, category, account_id, is_essential, can_pause, importance, amount_type, payment_method, notes)
         VALUES (@name, @amount, @frequency, @nextDueDate, @category, @accountId, @isEssential, @canPause, @importance, @amountType, @paymentMethod, @notes)`
      )
      .run({ ...data, isEssential: data.isEssential ? 1 : 0, canPause: data.canPause ? 1 : 0 });
    return RecurringExpenses.get(Number(info.lastInsertRowid))!;
  },
  update(id: number, data: Partial<Omit<RecurringExpense, "id">>): RecurringExpense {
    const existing = RecurringExpenses.get(id);
    if (!existing) throw new Error("Recurring expense not found");
    const merged = { ...existing, ...data };
    getDb()
      .prepare(
        `UPDATE recurring_expense SET name=@name, amount=@amount, frequency=@frequency, next_due_date=@nextDueDate,
         category=@category, account_id=@accountId, is_essential=@isEssential, can_pause=@canPause,
         importance=@importance, amount_type=@amountType, payment_method=@paymentMethod, notes=@notes, archived=@archived
         WHERE id=@id`
      )
      .run({
        ...merged,
        id,
        isEssential: merged.isEssential ? 1 : 0,
        canPause: merged.canPause ? 1 : 0,
        archived: merged.archived ? 1 : 0,
      });
    return RecurringExpenses.get(id)!;
  },
  remove(id: number) {
    getDb().prepare("UPDATE recurring_expense SET archived = 1 WHERE id = ?").run(id);
  },
};

/* Debts -------------------------------------------------------------------*/
export const Debts = {
  all(): Debt[] {
    return toCamelList<Debt>(
      getDb().prepare("SELECT * FROM debt WHERE archived = 0 ORDER BY interest_rate DESC").all() as Record<
        string,
        unknown
      >[]
    );
  },
  get(id: number): Debt | undefined {
    const row = getDb().prepare("SELECT * FROM debt WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? toCamel<Debt>(row) : undefined;
  },
  create(data: Omit<Debt, "id" | "archived">): Debt {
    const info = getDb()
      .prepare(
        `INSERT INTO debt
          (name, account_id, balance, interest_rate, minimum_payment, payment_frequency, debt_type, next_payment_date, priority, is_promotional, promotional_end_date, notes)
         VALUES (@name, @accountId, @balance, @interestRate, @minimumPayment, @paymentFrequency, @debtType, @nextPaymentDate, @priority, @isPromotional, @promotionalEndDate, @notes)`
      )
      .run({ ...data, isPromotional: data.isPromotional ? 1 : 0 });
    return Debts.get(Number(info.lastInsertRowid))!;
  },
  update(id: number, data: Partial<Omit<Debt, "id">>): Debt {
    const existing = Debts.get(id);
    if (!existing) throw new Error("Debt not found");
    const merged = { ...existing, ...data };
    getDb()
      .prepare(
        `UPDATE debt SET name=@name, account_id=@accountId, balance=@balance, interest_rate=@interestRate,
         minimum_payment=@minimumPayment, payment_frequency=@paymentFrequency, debt_type=@debtType,
         next_payment_date=@nextPaymentDate, priority=@priority, is_promotional=@isPromotional,
         promotional_end_date=@promotionalEndDate, notes=@notes, archived=@archived WHERE id=@id`
      )
      .run({
        ...merged,
        id,
        isPromotional: merged.isPromotional ? 1 : 0,
        archived: merged.archived ? 1 : 0,
      });
    return Debts.get(id)!;
  },
  remove(id: number) {
    getDb().prepare("UPDATE debt SET archived = 1 WHERE id = ?").run(id);
  },
};

/* Credit card statements ---------------------------------------------------*/
export const CardStatements = {
  all(): CreditCardStatement[] {
    return toCamelList<CreditCardStatement>(
      getDb().prepare("SELECT * FROM credit_card_statement ORDER BY due_date DESC").all() as Record<
        string,
        unknown
      >[]
    );
  },
  forCard(cardAccountId: number): CreditCardStatement[] {
    return toCamelList<CreditCardStatement>(
      getDb()
        .prepare("SELECT * FROM credit_card_statement WHERE card_account_id = ? ORDER BY due_date DESC")
        .all(cardAccountId) as Record<string, unknown>[]
    );
  },
  latestForCard(cardAccountId: number): CreditCardStatement | undefined {
    const row = getDb()
      .prepare(
        "SELECT * FROM credit_card_statement WHERE card_account_id = ? ORDER BY due_date DESC LIMIT 1"
      )
      .get(cardAccountId) as Record<string, unknown> | undefined;
    return row ? toCamel<CreditCardStatement>(row) : undefined;
  },
  get(id: number): CreditCardStatement | undefined {
    const row = getDb().prepare("SELECT * FROM credit_card_statement WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? toCamel<CreditCardStatement>(row) : undefined;
  },
  create(data: Omit<CreditCardStatement, "id">): CreditCardStatement {
    const info = getDb()
      .prepare(
        `INSERT INTO credit_card_statement
          (card_account_id, statement_start, statement_end, closing_balance, minimum_payment, interest_free_payment,
           due_date, purchase_balance, instalment_balance, interest_charged, fees_charged, status, notes)
         VALUES (@cardAccountId, @statementStart, @statementEnd, @closingBalance, @minimumPayment, @interestFreePayment,
           @dueDate, @purchaseBalance, @instalmentBalance, @interestCharged, @feesCharged, @status, @notes)`
      )
      .run(data);
    return CardStatements.get(Number(info.lastInsertRowid))!;
  },
  update(id: number, data: Partial<Omit<CreditCardStatement, "id">>): CreditCardStatement {
    const existing = CardStatements.get(id);
    if (!existing) throw new Error("Statement not found");
    const merged = { ...existing, ...data };
    getDb()
      .prepare(
        `UPDATE credit_card_statement SET card_account_id=@cardAccountId, statement_start=@statementStart,
         statement_end=@statementEnd, closing_balance=@closingBalance, minimum_payment=@minimumPayment,
         interest_free_payment=@interestFreePayment, due_date=@dueDate, purchase_balance=@purchaseBalance,
         instalment_balance=@instalmentBalance, interest_charged=@interestCharged, fees_charged=@feesCharged,
         status=@status, notes=@notes WHERE id=@id`
      )
      .run({ ...merged, id });
    return CardStatements.get(id)!;
  },
  remove(id: number) {
    getDb().prepare("DELETE FROM credit_card_statement WHERE id = ?").run(id);
  },
};

/* Sinking funds -------------------------------------------------------------*/
export const SinkingFunds = {
  all(): SinkingFund[] {
    return toCamelList<SinkingFund>(
      getDb().prepare("SELECT * FROM sinking_fund WHERE archived = 0 ORDER BY priority").all() as Record<
        string,
        unknown
      >[]
    );
  },
  get(id: number): SinkingFund | undefined {
    const row = getDb().prepare("SELECT * FROM sinking_fund WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? toCamel<SinkingFund>(row) : undefined;
  },
  create(data: Omit<SinkingFund, "id" | "archived">): SinkingFund {
    const info = getDb()
      .prepare(
        `INSERT INTO sinking_fund
          (name, target_amount, current_amount, target_date, fortnightly_contribution, priority, can_pause_in_red_fortnight, notes)
         VALUES (@name, @targetAmount, @currentAmount, @targetDate, @fortnightlyContribution, @priority, @canPauseInRedFortnight, @notes)`
      )
      .run({ ...data, canPauseInRedFortnight: data.canPauseInRedFortnight ? 1 : 0 });
    return SinkingFunds.get(Number(info.lastInsertRowid))!;
  },
  update(id: number, data: Partial<Omit<SinkingFund, "id">>): SinkingFund {
    const existing = SinkingFunds.get(id);
    if (!existing) throw new Error("Sinking fund not found");
    const merged = { ...existing, ...data };
    getDb()
      .prepare(
        `UPDATE sinking_fund SET name=@name, target_amount=@targetAmount, current_amount=@currentAmount,
         target_date=@targetDate, fortnightly_contribution=@fortnightlyContribution, priority=@priority,
         can_pause_in_red_fortnight=@canPauseInRedFortnight, notes=@notes, archived=@archived WHERE id=@id`
      )
      .run({
        ...merged,
        id,
        canPauseInRedFortnight: merged.canPauseInRedFortnight ? 1 : 0,
        archived: merged.archived ? 1 : 0,
      });
    return SinkingFunds.get(id)!;
  },
  remove(id: number) {
    getDb().prepare("UPDATE sinking_fund SET archived = 1 WHERE id = ?").run(id);
  },
};

/* Paydays -------------------------------------------------------------------*/
export const Paydays = {
  all(): Payday[] {
    return toCamelList<Payday>(
      getDb().prepare("SELECT * FROM payday ORDER BY date").all() as Record<string, unknown>[]
    );
  },
  upcoming(fromDate: string, limit = 6): Payday[] {
    return toCamelList<Payday>(
      getDb()
        .prepare("SELECT * FROM payday WHERE date >= ? ORDER BY date LIMIT ?")
        .all(fromDate, limit) as Record<string, unknown>[]
    );
  },
  create(data: Omit<Payday, "id">): Payday {
    const info = getDb()
      .prepare("INSERT INTO payday (date, amount, source) VALUES (@date, @amount, @source)")
      .run(data);
    return toCamel<Payday>(
      getDb().prepare("SELECT * FROM payday WHERE id = ?").get(info.lastInsertRowid) as Record<
        string,
        unknown
      >
    );
  },
  remove(id: number) {
    getDb().prepare("DELETE FROM payday WHERE id = ?").run(id);
  },
};

/* Fortnight plans -------------------------------------------------------------*/
export const FortnightPlans = {
  all(): FortnightPlan[] {
    return toCamelList<FortnightPlan>(
      getDb().prepare("SELECT * FROM fortnight_plan ORDER BY start_date DESC").all() as Record<
        string,
        unknown
      >[]
    );
  },
  get(id: number): FortnightPlan | undefined {
    const row = getDb().prepare("SELECT * FROM fortnight_plan WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? toCamel<FortnightPlan>(row) : undefined;
  },
  findByStart(startDate: string): FortnightPlan | undefined {
    const row = getDb()
      .prepare("SELECT * FROM fortnight_plan WHERE start_date = ? ORDER BY id DESC LIMIT 1")
      .get(startDate) as Record<string, unknown> | undefined;
    return row ? toCamel<FortnightPlan>(row) : undefined;
  },
  upsert(data: Omit<FortnightPlan, "id" | "createdAt">): FortnightPlan {
    const existing = FortnightPlans.findByStart(data.startDate);
    if (existing) {
      getDb()
        .prepare(
          `UPDATE fortnight_plan SET end_date=@endDate, planning_style=@planningStyle, income=@income,
           starting_cash=@startingCash, bills_due=@billsDue, set_asides=@setAsides, debt_payments=@debtPayments,
           card_payments=@cardPayments, fun_money=@funMoney, hobby_money=@hobbyMoney,
           holiday_contribution=@holidayContribution, buffer_contribution=@bufferContribution,
           ending_cash_forecast=@endingCashForecast, status=@status, notes=@notes WHERE id=@id`
        )
        .run({ ...data, id: existing.id });
      return FortnightPlans.get(existing.id)!;
    }
    const info = getDb()
      .prepare(
        `INSERT INTO fortnight_plan
          (start_date, end_date, planning_style, income, starting_cash, bills_due, set_asides, debt_payments,
           card_payments, fun_money, hobby_money, holiday_contribution, buffer_contribution, ending_cash_forecast, status, notes)
         VALUES (@startDate, @endDate, @planningStyle, @income, @startingCash, @billsDue, @setAsides, @debtPayments,
           @cardPayments, @funMoney, @hobbyMoney, @holidayContribution, @bufferContribution, @endingCashForecast, @status, @notes)`
      )
      .run(data);
    return FortnightPlans.get(Number(info.lastInsertRowid))!;
  },
};

/* Monthly reviews -------------------------------------------------------------*/
export const MonthlyReviews = {
  all(): MonthlyReview[] {
    return toCamelList<MonthlyReview>(
      getDb().prepare("SELECT * FROM monthly_review ORDER BY month DESC").all() as Record<
        string,
        unknown
      >[]
    );
  },
  get(month: string): MonthlyReview | undefined {
    const row = getDb().prepare("SELECT * FROM monthly_review WHERE month = ?").get(month) as
      | Record<string, unknown>
      | undefined;
    return row ? toCamel<MonthlyReview>(row) : undefined;
  },
  upsert(data: Omit<MonthlyReview, "id" | "createdAt">): MonthlyReview {
    const existing = MonthlyReviews.get(data.month);
    if (existing) {
      getDb()
        .prepare(
          `UPDATE monthly_review SET total_income=@totalIncome, total_fixed=@totalFixed,
           total_discretionary=@totalDiscretionary, total_card_spending=@totalCardSpending,
           card_interest_paid=@cardInterestPaid, debt_balance_change=@debtBalanceChange,
           emergency_buffer_change=@emergencyBufferChange, holiday_fund_change=@holidayFundChange,
           biggest_overspend_category=@biggestOverspendCategory, best_value_category=@bestValueCategory,
           recommended_action=@recommendedAction, narrative=@narrative WHERE id=@id`
        )
        .run({ ...data, id: existing.id });
      return MonthlyReviews.get(data.month)!;
    }
    getDb()
      .prepare(
        `INSERT INTO monthly_review
          (month, total_income, total_fixed, total_discretionary, total_card_spending, card_interest_paid,
           debt_balance_change, emergency_buffer_change, holiday_fund_change, biggest_overspend_category,
           best_value_category, recommended_action, narrative)
         VALUES (@month, @totalIncome, @totalFixed, @totalDiscretionary, @totalCardSpending, @cardInterestPaid,
           @debtBalanceChange, @emergencyBufferChange, @holidayFundChange, @biggestOverspendCategory,
           @bestValueCategory, @recommendedAction, @narrative)`
      )
      .run(data);
    return MonthlyReviews.get(data.month)!;
  },
};

/* AI insights -------------------------------------------------------------*/
export const AiInsights = {
  active(): AiInsight[] {
    return toCamelList<AiInsight>(
      getDb()
        .prepare("SELECT * FROM ai_insight WHERE status = 'active' ORDER BY created_at DESC")
        .all() as Record<string, unknown>[]
    );
  },
  create(text: string, source: "ai" | "user" = "ai"): AiInsight {
    const info = getDb()
      .prepare("INSERT INTO ai_insight (text, source) VALUES (?, ?)")
      .run(text, source);
    return toCamel<AiInsight>(
      getDb().prepare("SELECT * FROM ai_insight WHERE id = ?").get(info.lastInsertRowid) as Record<
        string,
        unknown
      >
    );
  },
  update(id: number, text: string): void {
    getDb().prepare("UPDATE ai_insight SET text = ? WHERE id = ?").run(text, id);
  },
  remove(id: number): void {
    getDb().prepare("UPDATE ai_insight SET status = 'deleted' WHERE id = ?").run(id);
  },
};

/* App settings (key/value JSON store) --------------------------------------*/
export const Settings = {
  get<T>(key: string, fallback: T): T {
    const row = getDb().prepare("SELECT value FROM app_setting WHERE key = ?").get(key) as
      | { value: string }
      | undefined;
    if (!row) return fallback;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    getDb()
      .prepare(
        "INSERT INTO app_setting (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = @value"
      )
      .run({ key, value: JSON.stringify(value) });
  },
};
