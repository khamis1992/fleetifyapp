/**
 * Fleet-to-ledger bridge service.
 *
 * Reads bridge candidates (capitalization, financing obligation, reclass,
 * depreciation backfill) from the server and manages documented explanations
 * for negative asset balances. All ledger writes go through the canonical
 * create_manual_journal_entry_v1 / post_manual_journal_entry_v1 RPCs from the
 * journal hooks — this service never writes journal entries itself.
 */
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { financeToday } from "@/services/financialReporting";
import type { FleetBridgeCandidates } from "@/components/finance/fleetBridge/buildFleetBridgeDrafts";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.number().finite();

// Small typed boundaries keep the new migration independent of the generated-type
// dump (same approach as professionalBalanceSheet).
type LooseResult = PromiseLike<{
  data: unknown;
  error: { message: string; code?: string } | null;
}>;
interface LooseEq {
  eq(column: string, value: string): LooseEq & LooseResult;
}
const looseRpc = (name: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>
  ) => LooseResult)(name, args);
const explanationsSelect = () =>
  (
    supabase.from as unknown as (
      relation: string
    ) => {
      select: (columns: string) => LooseEq & LooseResult;
    }
  )("balance_sheet_negative_explanations").select(
    "id, company_id, account_id, as_of, explanation, created_by, created_at, updated_at"
  );
const explanationsUpsert = (values: Record<string, unknown>) =>
  (
    supabase.from as unknown as (
      relation: string
    ) => {
      upsert: (
        values: Record<string, unknown>,
        options?: { onConflict?: string }
      ) => { select: (columns: string) => LooseResult };
    }
  )("balance_sheet_negative_explanations")
    .upsert(values, { onConflict: "company_id,account_id,as_of" })
    .select("id, company_id, account_id, as_of, explanation, created_by, created_at, updated_at");

const bridgeAccountSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  nameAr: z.string().nullable(),
  subtype: z.string().nullable(),
});

const fleetBridgeCandidatesSchema = z.object({
  asOf: isoDate,
  earliestEntryDate: isoDate.nullable(),
  vehicles: z.array(
    z.object({
      id: z.string().uuid(),
      plateNumber: z.string().nullable(),
      make: z.string().nullable(),
      model: z.string().nullable(),
      year: z.number().int().nullable(),
      isActive: z.boolean(),
      status: z.string().nullable(),
      purchaseCost: money,
      purchaseDate: isoDate,
      registrationFees: money,
      depositAmount: money,
      loanAmount: money,
      financingType: z.string().nullable(),
      accumulatedDepreciationStored: money,
      depreciationPosted: money,
      depreciationRate: money.nullable(),
      residualValue: money.nullable(),
      salvageValue: money.nullable(),
      monthsSincePurchase: z.number().int().nullable(),
      fixedAssetId: z.string().uuid().nullable(),
      linkedAgreementId: z.string().uuid().nullable(),
      linkedAgreementNumber: z.string().nullable(),
      linkedAgreementStatus: z.string().nullable(),
      linkedAllocatedAmount: money.nullable(),
      linkedDownPayment: money.nullable(),
      hasCapitalizationEntry: z.boolean(),
      hasDepreciationEntry: z.boolean(),
      hasAnyVehicleReference: z.boolean(),
    })
  ),
  vehiclesMissingData: z.number().int().nonnegative(),
  agreements: z.array(
    z.object({
      id: z.string().uuid(),
      agreementNumber: z.string().nullable(),
      status: z.string().nullable(),
      contractType: z.string().nullable(),
      vendorName: z.string().nullable(),
      startDate: isoDate.nullable(),
      endDate: isoDate.nullable(),
      totalAmount: money,
      downPayment: money,
      financedPrincipal: money,
      principalPaid: money,
      principalRemaining: money,
      longTermPortion: money,
      reclassReferenceId: z.string().uuid(),
      hasObligationEntry: z.boolean(),
      hasReclassEntry: z.boolean(),
      vehicles: z.array(
        z.object({
          id: z.string().uuid(),
          plateNumber: z.string().nullable(),
          make: z.string().nullable(),
          allocatedAmount: money,
        })
      ),
    })
  ),
  accounts: z.object({
    roles: z.record(
      z.string(),
      bridgeAccountSchema
    ),
    suggestions: z.record(z.string(), z.array(bridgeAccountSchema)),
  }),
});

export const negativeExplanationSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  account_id: z.string().uuid(),
  as_of: isoDate,
  explanation: z.string().min(10),
  created_by: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type NegativeBalanceExplanation = z.infer<typeof negativeExplanationSchema>;

function requireCompany(companyId: string) {
  if (!z.string().uuid().safeParse(companyId).success)
    throw new Error("FLEET_BRIDGE_COMPANY_REQUIRED");
}

export function validateBridgeAsOf(asOf: string, today = financeToday()) {
  if (!isoDate.safeParse(asOf).success || asOf > today)
    throw new Error("FLEET_BRIDGE_INVALID_DATE");
}

export async function readFleetBridgeCandidates(
  companyId: string,
  asOf: string
): Promise<FleetBridgeCandidates> {
  requireCompany(companyId);
  validateBridgeAsOf(asOf);
  const { data, error } = await looseRpc("get_fleet_bridge_candidates_v1", {
    p_company_id: companyId,
    p_as_of: asOf,
  });
  if (error) throw error;
  const parsed = fleetBridgeCandidatesSchema.parse(data);
  if (parsed.asOf !== asOf) throw new Error("FLEET_BRIDGE_SCOPE_MISMATCH");
  return parsed;
}

export async function readNegativeExplanations(
  companyId: string,
  asOf: string
): Promise<NegativeBalanceExplanation[]> {
  requireCompany(companyId);
  const query = await explanationsSelect().eq("company_id", companyId).eq("as_of", asOf);
  const { data, error } = query;
  if (error) throw error;
  return z.array(negativeExplanationSchema).parse(data ?? []);
}

export async function upsertNegativeExplanation(input: {
  companyId: string;
  accountId: string;
  asOf: string;
  explanation: string;
}) {
  requireCompany(input.companyId);
  const explanation = input.explanation.trim();
  if (explanation.length < 10 || explanation.length > 2000)
    throw new Error("FLEET_BRIDGE_EXPLANATION_LENGTH");
  const result = await explanationsUpsert({
    company_id: input.companyId,
    account_id: input.accountId,
    as_of: input.asOf,
    explanation,
  });
  const { data, error } = result;
  if (error) throw error;
  const rows = z.array(negativeExplanationSchema).parse(data ?? []);
  const saved = rows[0];
  if (!saved) throw new Error("FLEET_BRIDGE_UPSERT_FAILED");
  return saved;
}

/** Maps a bridge RPC failure to a reviewer-facing Arabic message. */
export function fleetBridgeErrorMessage(error: unknown): string {
  const raw =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message).toLowerCase()
      : "";
  if (/pgrst202|schema cache|does not exist|could not find the function/.test(raw))
    return "خدمة ترحيل الأسطول لم تُثبت بعد. طبّق تحديثات قاعدة البيانات أولاً ثم أعد المحاولة.";
  if (/permission|access|authorized|authentication/.test(raw))
    return "ليست لديك صلاحية هذه العملية في الشركة المحددة.";
  if (/future entry date|cannot be posted with a future/i.test(raw))
    return "لا يُرحَّل قيد بتاريخ مستقبلي — أبقِه مسودة مجدولة حتى تاريخه (يتولّى «ترحيل المستحق» إذاناً عند حلول التاريخ).";
  if (/closed accounting period|period lock/.test(raw))
    return "الفترة المحاسبية لهذا التاريخ مقفلة؛ اختر تاريخاً داخل فترة مفتوحة.";
  if (/unique|duplicate key/.test(raw))
    return "يوجد قيد مرتبط بهذا المصدر مسبقاً — أعد تحميل المرشحين ثم تابع المتبقي.";
  if (/account mapping|mapping is required/.test(raw))
    return "أكمل ربط حسابات الجسر في بطاقة الإعداد قبل التوليد.";
  return "تعذّر إتمام العملية. أعد المحاولة بعد تحديث الصفحة.";
}
