import { getDb } from "./index";
import { toCamel, toCamelList } from "./mapper";
import type { Transaction } from "../types";

export interface TransactionFilter {
  from?: string;
  to?: string;
  category?: string;
  accountId?: number;
}

function boolFields(data: Partial<Transaction>) {
  return {
    isTransfer: data.isTransfer ? 1 : 0,
    isCreditCardPayment: data.isCreditCardPayment ? 1 : 0,
    isDebtPayment: data.isDebtPayment ? 1 : 0,
    isInterest: data.isInterest ? 1 : 0,
    isFee: data.isFee ? 1 : 0,
    isDiscretionary: data.isDiscretionary ? 1 : 0,
    isFamilySupport: data.isFamilySupport ? 1 : 0,
    isPlanned: data.isPlanned ? 1 : 0,
  };
}

export const Transactions = {
  list(filter: TransactionFilter = {}): Transaction[] {
    const clauses: string[] = [];
    const params: Record<string, unknown> = {};
    if (filter.from) {
      clauses.push("date >= @from");
      params.from = filter.from;
    }
    if (filter.to) {
      clauses.push("date <= @to");
      params.to = filter.to;
    }
    if (filter.category) {
      clauses.push("category = @category");
      params.category = filter.category;
    }
    if (filter.accountId) {
      clauses.push("account_id = @accountId");
      params.accountId = filter.accountId;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return toCamelList<Transaction>(
      getDb()
        .prepare(`SELECT * FROM "transaction" ${where} ORDER BY date DESC, id DESC`)
        .all(params) as Record<string, unknown>[]
    );
  },
  get(id: number): Transaction | undefined {
    const row = getDb().prepare('SELECT * FROM "transaction" WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? toCamel<Transaction>(row) : undefined;
  },
  create(data: Omit<Transaction, "id" | "createdAt">): Transaction {
    const info = getDb()
      .prepare(
        `INSERT INTO "transaction"
          (date, account_id, description, amount, merchant, category, subcategory, is_transfer,
           is_credit_card_payment, is_debt_payment, is_interest, is_fee, is_discretionary,
           is_family_support, is_planned, funding_source, notes)
         VALUES (@date, @accountId, @description, @amount, @merchant, @category, @subcategory, @isTransfer,
           @isCreditCardPayment, @isDebtPayment, @isInterest, @isFee, @isDiscretionary,
           @isFamilySupport, @isPlanned, @fundingSource, @notes)`
      )
      .run({ ...data, ...boolFields(data) });
    return Transactions.get(Number(info.lastInsertRowid))!;
  },
  createMany(rows: Omit<Transaction, "id" | "createdAt">[]): number {
    const insert = getDb().prepare(
      `INSERT INTO "transaction"
        (date, account_id, description, amount, merchant, category, subcategory, is_transfer,
         is_credit_card_payment, is_debt_payment, is_interest, is_fee, is_discretionary,
         is_family_support, is_planned, funding_source, notes)
       VALUES (@date, @accountId, @description, @amount, @merchant, @category, @subcategory, @isTransfer,
         @isCreditCardPayment, @isDebtPayment, @isInterest, @isFee, @isDiscretionary,
         @isFamilySupport, @isPlanned, @fundingSource, @notes)`
    );
    const insertAll = getDb().transaction((items: typeof rows) => {
      for (const item of items) insert.run({ ...item, ...boolFields(item) });
      return items.length;
    });
    return insertAll(rows);
  },
  update(id: number, data: Partial<Omit<Transaction, "id">>): Transaction {
    const existing = Transactions.get(id);
    if (!existing) throw new Error("Transaction not found");
    const merged = { ...existing, ...data };
    getDb()
      .prepare(
        `UPDATE "transaction" SET date=@date, account_id=@accountId, description=@description, amount=@amount,
         merchant=@merchant, category=@category, subcategory=@subcategory, is_transfer=@isTransfer,
         is_credit_card_payment=@isCreditCardPayment, is_debt_payment=@isDebtPayment, is_interest=@isInterest,
         is_fee=@isFee, is_discretionary=@isDiscretionary, is_family_support=@isFamilySupport,
         is_planned=@isPlanned, funding_source=@fundingSource, notes=@notes WHERE id=@id`
      )
      .run({ ...merged, id, ...boolFields(merged) });
    return Transactions.get(id)!;
  },
  remove(id: number) {
    getDb().prepare('DELETE FROM "transaction" WHERE id = ?').run(id);
  },
};
