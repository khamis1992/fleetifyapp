/**
 * Bank <-> ledger reconciliation service.
 * Reads the reconciliation picture and drives the sync/posting commands.
 */
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const money = z.number().finite();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Loose RPC boundary for functions added after the last generated-type dump.
type LooseResult = PromiseLike<{
  data: unknown;
  error: { message: string; code?: string } | null;
}>;
const looseRpc = (name: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>
  ) => LooseResult)(name, args);

export const bankReconciliationSchema = z.object({
  asOf: isoDate,
  banks: z.array(
    z.object({
      id: z.string().uuid(),
      nameAr: z.string(),
      iban: z.string().nullable(),
      ledgerAccountId: z.string().uuid().nullable(),
      openingBalance: money,
      moduleBalance: money,
      ledgerBalance: money,
    })
  ),
  unpostedTransactions: z.array(
    z.object({
      id: z.string().uuid(),
      date: isoDate,
      type: z.string(),
      amount: money,
      description: z.string().nullable(),
      number: z.string().nullable(),
    })
  ),
  unappliedCash: z.object({ count: z.number().int(), amount: money }),
  unappliedAdvancesBalance: money,
});
export type BankReconciliation = z.infer<typeof bankReconciliationSchema>;

export async function readBankReconciliation(companyId: string): Promise<BankReconciliation> {
  if (!z.string().uuid().safeParse(companyId).success)
    throw new Error("BANK_RECON_COMPANY_REQUIRED");
  const { data, error } = await looseRpc("get_bank_reconciliation_v1", {
    p_company_id: companyId,
  });
  if (error) throw error;
  return bankReconciliationSchema.parse(data);
}

export async function syncLedgerToBank(companyId: string) {
  const { data, error } = await looseRpc("sync_ledger_to_bank_v1", {
    p_company_id: companyId,
  });
  if (error) throw error;
  return z.object({ createdTransactions: z.number(), syncedAmount: money, asOf: isoDate }).parse(data);
}

export async function postBankTransaction(
  companyId: string,
  transactionId: string,
  counterpartAccountId: string
) {
  const { data, error } = await looseRpc("post_bank_transaction_journal_v1", {
    p_company_id: companyId,
    p_transaction_id: transactionId,
    p_counterpart_account_id: counterpartAccountId,
  });
  if (error) throw error;
  return z
    .object({ journalEntryId: z.string().uuid(), status: z.string() })
    .parse(data);
}

export function bankReconciliationErrorMessage(error: unknown): string {
  const raw =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message).toLowerCase()
      : "";
  if (/pgrst202|schema cache|does not exist|could not find the function/.test(raw))
    return "خدمة مطابقة البنك لم تُثبت بعد. طبّق تحديثات قاعدة البيانات أولاً.";
  if (/permission|access|authorized|authentication/.test(raw))
    return "ليست لديك صلاحية هذه العملية في الشركة المحددة.";
  if (/counterpart/.test(raw))
    return "اختر حساباً مقابلاً قابلاً للترحيل (غير رئيسي، مستوى ٣ فأعلى).";
  return "تعذّر إتمام العملية — حدّث الصفحة وأعد المحاولة.";
}
