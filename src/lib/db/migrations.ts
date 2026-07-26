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
