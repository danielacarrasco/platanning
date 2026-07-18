import { NextRequest } from "next/server";
import { csvResponse } from "@/lib/csv";
import {
  exportTransactionsCsv,
  exportMonthlySummaryCsv,
  exportFortnightPlansCsv,
  exportBillsCalendarCsv,
  exportRecurringExpensesCsv,
  exportDebtsCsv,
  exportSinkingFundsCsv,
  exportCardStatementsCsv,
  exportMonthlyReviewsCsv,
  exportAccountsCsv,
  exportFullBackupCsv,
} from "@/lib/exports";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/export/[table]">
) {
  const { table } = await ctx.params;
  const { searchParams } = request.nextUrl;

  switch (table) {
    case "transactions": {
      const csv = exportTransactionsCsv({
        from: searchParams.get("from") ?? undefined,
        to: searchParams.get("to") ?? undefined,
        category: searchParams.get("category") ?? undefined,
      });
      return csvResponse(`transactions_export_${today()}.csv`, csv);
    }
    case "monthly-summary":
      return csvResponse(`monthly_summary_${today()}.csv`, exportMonthlySummaryCsv());
    case "fortnight-plans":
      return csvResponse(`fortnight_plan_${today()}.csv`, exportFortnightPlansCsv());
    case "bills":
      return csvResponse(`bills_calendar_${today()}.csv`, exportBillsCalendarCsv());
    case "recurring-expenses":
      return csvResponse(`recurring_expenses_${today()}.csv`, exportRecurringExpensesCsv());
    case "debts":
      return csvResponse(`debt_progress_${today()}.csv`, exportDebtsCsv());
    case "sinking-funds":
      return csvResponse(`sinking_funds_${today()}.csv`, exportSinkingFundsCsv());
    case "card-statements":
      return csvResponse(`credit_card_statements_${today()}.csv`, exportCardStatementsCsv());
    case "monthly-reviews":
      return csvResponse(`monthly_reviews_${today()}.csv`, exportMonthlyReviewsCsv());
    case "accounts":
      return csvResponse(`accounts_${today()}.csv`, exportAccountsCsv());
    case "backup":
      return csvResponse(`full_backup_${today()}.csv`, exportFullBackupCsv());
    default:
      return new Response("Unknown export", { status: 404 });
  }
}
