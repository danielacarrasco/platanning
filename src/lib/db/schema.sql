-- Platanning local-first schema (SQLite)
-- All money values stored in dollars (REAL). Dates stored as TEXT 'YYYY-MM-DD'.

CREATE TABLE IF NOT EXISTS account (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('everyday','savings','offset','credit_card','mortgage','personal_loan')),
  institution TEXT,
  current_balance REAL NOT NULL DEFAULT 0,
  interest_rate REAL,
  credit_limit REAL,
  statement_day INTEGER,
  payment_due_day INTEGER,
  notes TEXT,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS income_source (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly','fortnightly','monthly','quarterly','annual')),
  next_date TEXT,
  account_id INTEGER REFERENCES account(id),
  notes TEXT,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "transaction" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  account_id INTEGER REFERENCES account(id),
  description TEXT NOT NULL,
  amount REAL NOT NULL, -- negative = money out, positive = money in
  merchant TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  is_transfer INTEGER NOT NULL DEFAULT 0,
  is_credit_card_payment INTEGER NOT NULL DEFAULT 0,
  is_debt_payment INTEGER NOT NULL DEFAULT 0,
  is_interest INTEGER NOT NULL DEFAULT 0,
  is_fee INTEGER NOT NULL DEFAULT 0,
  is_discretionary INTEGER NOT NULL DEFAULT 0,
  is_family_support INTEGER NOT NULL DEFAULT 0,
  is_planned INTEGER NOT NULL DEFAULT 0,
  funding_source TEXT, -- cash_allowance | bills_holding | emergency_buffer | not_yet_funded | null
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recurring_expense (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly','fortnightly','monthly','quarterly','annual')),
  next_due_date TEXT NOT NULL,
  category TEXT NOT NULL,
  account_id INTEGER REFERENCES account(id),
  is_essential INTEGER NOT NULL DEFAULT 1,
  can_pause INTEGER NOT NULL DEFAULT 0,
  importance TEXT NOT NULL DEFAULT 'essential' CHECK (importance IN ('essential','important','discretionary')),
  amount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (amount_type IN ('fixed','variable','estimated')),
  payment_method TEXT,
  notes TEXT,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS debt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  account_id INTEGER REFERENCES account(id),
  balance REAL NOT NULL,
  interest_rate REAL NOT NULL,
  minimum_payment REAL NOT NULL,
  payment_frequency TEXT NOT NULL CHECK (payment_frequency IN ('weekly','fortnightly','monthly')),
  debt_type TEXT NOT NULL CHECK (debt_type IN ('credit_card_purchase','credit_card_instalment','personal_loan','mortgage')),
  next_payment_date TEXT,
  priority INTEGER,
  is_promotional INTEGER NOT NULL DEFAULT 0,
  promotional_end_date TEXT,
  notes TEXT,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS credit_card_statement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_account_id INTEGER NOT NULL REFERENCES account(id),
  statement_start TEXT NOT NULL,
  statement_end TEXT NOT NULL,
  closing_balance REAL NOT NULL,
  minimum_payment REAL NOT NULL,
  interest_free_payment REAL NOT NULL,
  due_date TEXT NOT NULL,
  purchase_balance REAL NOT NULL DEFAULT 0,
  instalment_balance REAL NOT NULL DEFAULT 0,
  interest_charged REAL NOT NULL DEFAULT 0,
  fees_charged REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'watch' CHECK (status IN ('clean','watch','risk','problem')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS sinking_fund (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  target_date TEXT,
  fortnightly_contribution REAL NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 5,
  can_pause_in_red_fortnight INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payday (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fortnight_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  planning_style TEXT NOT NULL DEFAULT 'gentle' CHECK (planning_style IN ('gentle','balanced','aggressive')),
  income REAL NOT NULL DEFAULT 0,
  starting_cash REAL NOT NULL DEFAULT 0,
  bills_due REAL NOT NULL DEFAULT 0,
  set_asides REAL NOT NULL DEFAULT 0,
  debt_payments REAL NOT NULL DEFAULT 0,
  card_payments REAL NOT NULL DEFAULT 0,
  fun_money REAL NOT NULL DEFAULT 0,
  hobby_money REAL NOT NULL DEFAULT 0,
  holiday_contribution REAL NOT NULL DEFAULT 0,
  buffer_contribution REAL NOT NULL DEFAULT 0,
  ending_cash_forecast REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'yellow' CHECK (status IN ('green','yellow','red')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS monthly_review (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL UNIQUE, -- 'YYYY-MM'
  total_income REAL NOT NULL DEFAULT 0,
  total_fixed REAL NOT NULL DEFAULT 0,
  total_discretionary REAL NOT NULL DEFAULT 0,
  total_card_spending REAL NOT NULL DEFAULT 0,
  card_interest_paid REAL NOT NULL DEFAULT 0,
  debt_balance_change REAL NOT NULL DEFAULT 0,
  emergency_buffer_change REAL NOT NULL DEFAULT 0,
  holiday_fund_change REAL NOT NULL DEFAULT 0,
  biggest_overspend_category TEXT,
  best_value_category TEXT,
  recommended_action TEXT,
  narrative TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_insight (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai','user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','deleted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_setting (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_transaction_date ON "transaction"(date);
CREATE INDEX IF NOT EXISTS idx_transaction_category ON "transaction"(category);
CREATE INDEX IF NOT EXISTS idx_fortnight_plan_dates ON fortnight_plan(start_date, end_date);
