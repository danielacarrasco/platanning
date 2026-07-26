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
}
