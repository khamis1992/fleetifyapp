import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { financeToday } from "@/services/financialReporting";
import { summarizeFinancialReportError } from "@/utils/financialReportDiagnostics";
import type {
  BalanceSheetLocale,
  BalanceSheetReviewConfirmations,
  ProfessionalBalanceSheet,
  SavedBalanceSheet,
} from "@/types/balanceSheet";

const money = z.number().finite();
const count = z.number().int().nonnegative();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const totalsSchema = z.object({
  assets: money,
  liabilities: money,
  equityAccounts: money,
  revenue: money,
  expenses: money,
  unclosedResult: money,
  equity: money,
  liabilitiesAndEquity: money,
  imbalance: money,
  postedEntries: count,
  postedLines: count,
  draftEntries: count,
});
export const professionalBalanceSheetSchema = z.object({
  version: z.literal(1),
  company: z.object({
    id: z.string().uuid(),
    name: z.string(),
    nameAr: z.string().nullable(),
    commercialRegister: z.string().nullable(),
    currency: z.string(),
    address: z.string().nullable(),
  }),
  asOfDate: isoDate,
  comparisonDate: isoDate.nullable(),
  generatedAt: z.string().datetime({ offset: true }),
  accounts: z.array(
    z.object({
      id: z.string().uuid(),
      code: z.string(),
      name: z.string(),
      nameAr: z.string().nullable(),
      type: z.enum([
        "asset",
        "liability",
        "equity",
        "revenue",
        "expense",
        "unknown",
      ]),
      subtype: z.string().nullable(),
      classification: z.enum([
        "current",
        "non_current",
        "unclassified",
        "equity",
        "result",
      ]),
      level: z.number().int().nullable(),
      isHeader: z.boolean().nullable(),
      isActive: z.boolean().nullable(),
      debit: money,
      credit: money,
      balance: money,
      comparisonBalance: money,
    })
  ),
  current: totalsSchema,
  comparison: totalsSchema.nullable(),
  checks: z.array(
    z.object({
      code: z.string().min(1),
      severity: z.enum(["error", "warning"]),
      count,
      asOfDate: isoDate,
      detail: z
        .array(
          z.object({
            id: z.string(),
            code: z.string().optional(),
            number: z.string().optional(),
            balance: money.optional(),
          })
        )
        .optional(),
    })
  ),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  permissions: z.object({ canSave: z.boolean(), canApprove: z.boolean() }),
});
const snapshotSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  as_of_date: isoDate,
  comparison_date: isoDate.nullable(),
  payload: professionalBalanceSheetSchema,
  source_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(["draft", "approved", "voided"]),
  created_by: z.string().uuid(),
  created_by_name: z.string(),
  created_at: z.string().datetime({ offset: true }),
  approved_by: z.string().uuid().nullable(),
  approved_by_name: z.string().nullable(),
  approved_at: z.string().datetime({ offset: true }).nullable(),
  notes: z.string().nullable(),
  review_notes: z.string().nullable(),
  voided_by: z.string().uuid().nullable().optional(),
  voided_at: z.string().nullable().optional(),
  void_reason: z.string().nullable().optional(),
});

type RpcName =
  | "get_professional_balance_sheet_v1"
  | "list_professional_balance_sheets_v1"
  | "save_professional_balance_sheet_v1"
  | "approve_professional_balance_sheet_v1"
  | "void_professional_balance_sheet_v1";
type RpcArgs = Record<string, string | boolean | null | BalanceSheetReviewConfirmations>;
// A small typed boundary keeps the new migration independent of unrelated generated-type edits.
const rpc = (name: RpcName, args: RpcArgs) =>
  (
    supabase.rpc as unknown as (
      name: RpcName,
      args: RpcArgs
    ) => PromiseLike<{
      data: unknown;
      error: { message: string; code?: string } | null;
    }>
  )(name, args);

export function validateBalanceSheetDates(
  asOf: string,
  comparison: string | null,
  today = financeToday()
) {
  const valid = (date: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  if (
    !valid(asOf) ||
    asOf > today ||
    (comparison !== null && (!valid(comparison) || comparison >= asOf))
  ) {
    throw new Error("BALANCE_SHEET_INVALID_DATES");
  }
}

function requireCompany(companyId: string) {
  if (!z.string().uuid().safeParse(companyId).success)
    throw new Error("BALANCE_SHEET_COMPANY_REQUIRED");
}

export function parseProfessionalBalanceSheet(
  raw: unknown,
  companyId: string,
  asOf?: string,
  comparison?: string | null
): ProfessionalBalanceSheet {
  const data = professionalBalanceSheetSchema.parse(raw);
  if (
    data.company.id !== companyId ||
    (asOf !== undefined && data.asOfDate !== asOf) ||
    (comparison !== undefined && data.comparisonDate !== comparison) ||
    Boolean(data.comparisonDate) !== Boolean(data.comparison)
  )
    throw new Error("BALANCE_SHEET_SCOPE_MISMATCH");
  if (
    new Set(data.accounts.map((account) => account.id)).size !==
    data.accounts.length
  )
    throw new Error("BALANCE_SHEET_DUPLICATE_ACCOUNTS");
  const close = (a: number, b: number) => Math.abs(a - b) < 0.011;
  for (const [totals, key] of [
    [data.current, "balance"],
    [data.comparison, "comparisonBalance"],
  ] as const) {
    if (!totals) continue;
    const sum = (type: string) =>
      data.accounts
        .filter((account) => account.type === type)
        .reduce((total, account) => total + account[key], 0);
    if (
      !close(totals.assets, sum("asset")) ||
      !close(totals.liabilities, sum("liability")) ||
      !close(totals.equityAccounts, sum("equity")) ||
      !close(totals.revenue, sum("revenue")) ||
      !close(totals.expenses, sum("expense")) ||
      !close(totals.unclosedResult, totals.revenue - totals.expenses) ||
      !close(totals.equity, totals.equityAccounts + totals.unclosedResult) ||
      !close(totals.liabilitiesAndEquity, totals.liabilities + totals.equity) ||
      !close(totals.imbalance, totals.assets - totals.liabilitiesAndEquity)
    )
      throw new Error("BALANCE_SHEET_TOTALS_MISMATCH");
  }
  return data;
}

export function parseSavedBalanceSheet(
  raw: unknown,
  companyId: string
): SavedBalanceSheet {
  const data = snapshotSchema.parse(raw);
  if (
    data.company_id !== companyId ||
    data.source_fingerprint !== data.payload.fingerprint
  )
    throw new Error("BALANCE_SHEET_SCOPE_MISMATCH");
  parseProfessionalBalanceSheet(
    data.payload,
    companyId,
    data.as_of_date,
    data.comparison_date
  );
  if (
    data.status === "approved" &&
    (!data.approved_by ||
      !data.approved_at ||
      !data.approved_by_name ||
      // Self-approval is a documented sole-admin exception recorded server-side;
      // independent approval remains the default path.
      Date.parse(data.approved_at) < Date.parse(data.created_at))
  )
    throw new Error("BALANCE_SHEET_INVALID_APPROVAL");
  return data;
}

export async function readProfessionalBalanceSheet(
  companyId: string,
  asOf: string,
  comparison: string | null
) {
  requireCompany(companyId);
  validateBalanceSheetDates(asOf, comparison);
  const { data, error } = await rpc("get_professional_balance_sheet_v1", {
    p_company_id: companyId,
    p_as_of: asOf,
    p_comparison_date: comparison,
  });
  if (error) {
    console.error("Balance sheet request failed", JSON.stringify(summarizeFinancialReportError(error)));
    throw error;
  }
  try {
    return parseProfessionalBalanceSheet(data, companyId, asOf, comparison);
  } catch (validationError) {
    console.error("Balance sheet response validation failed", JSON.stringify(summarizeFinancialReportError(validationError)));
    throw validationError;
  }
}

export async function listProfessionalBalanceSheets(companyId: string) {
  requireCompany(companyId);
  const { data, error } = await rpc("list_professional_balance_sheets_v1", {
    p_company_id: companyId,
  });
  if (error) throw error;
  return z
    .array(z.unknown())
    .parse(data)
    .map((row) => parseSavedBalanceSheet(row, companyId));
}

export async function saveProfessionalBalanceSheet(
  companyId: string,
  asOf: string,
  comparison: string | null,
  notes: string
) {
  requireCompany(companyId);
  validateBalanceSheetDates(asOf, comparison);
  const { data, error } = await rpc("save_professional_balance_sheet_v1", {
    p_company_id: companyId,
    p_as_of: asOf,
    p_comparison_date: comparison,
    p_notes: notes.trim() || null,
  });
  if (error) throw error;
  const saved = parseSavedBalanceSheet(data, companyId);
  if (
    saved.as_of_date !== asOf ||
    saved.comparison_date !== comparison ||
    saved.status !== "draft"
  )
    throw new Error("BALANCE_SHEET_SCOPE_MISMATCH");
  return saved;
}

export async function approveProfessionalBalanceSheet(
  companyId: string,
  reportId: string,
  notes: string,
  confirmations: BalanceSheetReviewConfirmations,
  selfReviewAcknowledged = false
) {
  requireCompany(companyId);
  const { data, error } = await rpc("approve_professional_balance_sheet_v1", {
    p_report_id: reportId,
    p_review_notes: notes.trim(),
    p_confirmations: confirmations,
    p_self_review_acknowledged: selfReviewAcknowledged,
  });
  if (error) throw error;
  const saved = parseSavedBalanceSheet(data, companyId);
  if (saved.id !== reportId || saved.status !== "approved")
    throw new Error("BALANCE_SHEET_SCOPE_MISMATCH");
  return saved;
}

export async function voidProfessionalBalanceSheet(
  companyId: string,
  reportId: string,
  reason: string
) {
  requireCompany(companyId);
  const { data, error } = await rpc("void_professional_balance_sheet_v1", {
    p_report_id: reportId,
    p_reason: reason.trim(),
  });
  if (error) throw error;
  const saved = parseSavedBalanceSheet(data, companyId);
  if (saved.id !== reportId || saved.status !== "voided")
    throw new Error("BALANCE_SHEET_SCOPE_MISMATCH");
  return saved;
}

export function balanceSheetErrorMessage(
  error: unknown,
  locale: BalanceSheetLocale
): string {
  const raw =
    typeof error === "object" && error && "message" in error
      ? String(error.message).toLowerCase()
      : "";
  const ar = locale === "ar";
  if (["REPORT_REQUEST_TIMEOUT", "57014"].includes(summarizeFinancialReportError(error).code))
    return ar ? "استغرق الطلب وقتًا أطول من المتوقع. حدّث الشاشة للتحقق من حالته قبل إعادة المحاولة." : "The request exceeded its time limit. Refresh to check its status before retrying.";
  if (/dates|date scope|comparison|future|invalid date/.test(raw))
    return ar
      ? "اختر تاريخًا صحيحًا حتى اليوم وتاريخ مقارنة أسبق منه."
      : "Choose a valid date up to today and an earlier comparison date.";
  if (/stale|changed|fingerprint/.test(raw))
    return ar
      ? "تغيرت بيانات المصدر. حدّث التقرير واحفظ نسخة جديدة للمراجعة."
      : "Source data changed. Refresh and save a new version for review.";
  if (/self|generator|independent|creator|different/.test(raw))
    return ar
      ? "يجب أن يعتمد النسخة مستخدم مخول آخر غير مُعدّها."
      : "A different authorized user must approve this report.";
  if (/permission|access|authorized|active profile|authentication/.test(raw))
    return ar
      ? "ليست لديك صلاحية هذه العملية في الشركة المحددة."
      : "You do not have permission for this action in the selected company.";
  if (
    /pgrst202|schema cache|does not exist|could not find the function/.test(raw)
  )
    return ar
      ? "خدمة الميزانية الجديدة لم تُثبت بعد. يلزم تثبيت تحديث قاعدة البيانات قبل استخدام التقرير."
      : "The balance sheet service is not installed. Apply its database migration first.";
  if (/confirm|review notes|readiness|blocking|unbalanced|checks/.test(raw))
    return ar
      ? "استكمل مراجعة الأرصدة وعالج الملاحظات المانعة قبل الاعتماد."
      : "Complete the review and resolve blocking findings before approval.";
  return ar
    ? "تعذر التحقق من بيانات الميزانية. أعد التحميل؛ لن يُصدر تقرير ببيانات جزئية."
    : "The balance sheet could not be verified. Reload; incomplete data will not be exported.";
}
