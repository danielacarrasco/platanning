import type Database from "better-sqlite3";

interface ColumnMigration {
  table: string;
  column: string;
  ddl: string;
}

// Additive, idempotent column migrations for databases created before schema.sql grew a new
// column. schema.sql's CREATE TABLE IF NOT EXISTS only applies to brand-new databases, so an
// already-deployed one needs these run explicitly on every boot (each is a no-op once applied).
const COLUMN_MIGRATIONS: ColumnMigration[] = [
  {
    table: "transaction",
    column: "destination_account_id",
    ddl: `ALTER TABLE "transaction" ADD COLUMN destination_account_id INTEGER REFERENCES account(id)`,
  },
];

export function runMigrations(db: Database.Database) {
  for (const migration of COLUMN_MIGRATIONS) {
    const columns = db.prepare(`PRAGMA table_info("${migration.table}")`).all() as { name: string }[];
    const hasColumn = columns.some((c) => c.name === migration.column);
    if (!hasColumn) {
      db.exec(migration.ddl);
    }
  }
  backfillCardDebtDueDates(db);
  widenFrequencyCheckConstraints(db);
}

/**
 * SQLite can't ALTER a CHECK constraint in place, so an already-deployed database's
 * income_source/recurring_expense/debt tables still reject 'biannual' and 'one_off' even after
 * schema.sql is updated — CREATE TABLE IF NOT EXISTS only applies to brand-new databases. This
 * rebuilds each table (rename → recreate with the wider CHECK → copy rows → drop the old one)
 * exactly once; detected via whether the stored CHECK text already allows 'one_off'.
 */
const FREQUENCY_CHECK_REBUILDS: { table: string; createSql: string }[] = [
  {
    table: "income_source",
    createSql: `CREATE TABLE income_source (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      frequency TEXT NOT NULL CHECK (frequency IN ('weekly','fortnightly','monthly','quarterly','annual','biannual','one_off')),
      next_date TEXT,
      account_id INTEGER REFERENCES account(id),
      notes TEXT,
      archived INTEGER NOT NULL DEFAULT 0
    )`,
  },
  {
    table: "recurring_expense",
    createSql: `CREATE TABLE recurring_expense (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      frequency TEXT NOT NULL CHECK (frequency IN ('weekly','fortnightly','monthly','quarterly','annual','biannual','one_off')),
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
    )`,
  },
  {
    table: "debt",
    createSql: `CREATE TABLE debt (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      account_id INTEGER REFERENCES account(id),
      balance REAL NOT NULL,
      interest_rate REAL NOT NULL,
      minimum_payment REAL NOT NULL,
      payment_frequency TEXT NOT NULL CHECK (payment_frequency IN ('weekly','fortnightly','monthly','biannual','one_off')),
      debt_type TEXT NOT NULL CHECK (debt_type IN ('credit_card_purchase','credit_card_instalment','personal_loan','mortgage')),
      next_payment_date TEXT,
      priority INTEGER,
      is_promotional INTEGER NOT NULL DEFAULT 0,
      promotional_end_date TEXT,
      notes TEXT,
      archived INTEGER NOT NULL DEFAULT 0
    )`,
  },
];

function widenFrequencyCheckConstraints(db: Database.Database) {
  for (const { table, createSql } of FREQUENCY_CHECK_REBUILDS) {
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(table) as
      | { sql: string }
      | undefined;
    if (!row || row.sql.includes("one_off")) continue; // already wide enough, or table doesn't exist yet

    const wasForeignKeysOn = (db.pragma("foreign_keys", { simple: true }) as number) === 1;
    db.pragma("foreign_keys = OFF");
    const rebuild = db.transaction(() => {
      db.exec(`ALTER TABLE "${table}" RENAME TO "${table}_migrating_old"`);
      db.exec(createSql);
      db.exec(`INSERT INTO "${table}" SELECT * FROM "${table}_migrating_old"`);
      db.exec(`DROP TABLE "${table}_migrating_old"`);
    });
    rebuild();
    if (wasForeignKeysOn) db.pragma("foreign_keys = ON");
  }
}

/**
 * Debts with no next_payment_date are invisible to the Fortnight Planner's required-payment
 * totals (see occurrencesInWindow in lib/planning.ts). Card-purchase debts created before
 * applyCardTransactionEffect started setting a default due date are stuck with next_payment_date
 * NULL despite carrying a real balance — this gives them a one-time starting guess (21 days out)
 * so they actually get planned for, without touching debts that already have a date (possibly
 * already corrected by hand). Idempotent: once a row gets a date, this no-ops on it forever after.
 */
function backfillCardDebtDueDates(db: Database.Database) {
  db.prepare(
    `UPDATE debt
     SET next_payment_date = date('now', '+21 days')
     WHERE next_payment_date IS NULL
       AND balance > 0
       AND account_id IN (SELECT id FROM account WHERE type = 'credit_card')`
  ).run();
}
