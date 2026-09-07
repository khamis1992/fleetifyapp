import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const stateSchema = z.object({
  version: z.literal(1), company_id: z.string().uuid(), contract_id: z.string().uuid(),
  contract_status: z.string(), canonical_paid: z.number(), stored_paid: z.number().nullable(),
  original_amount: z.number(), original_remaining: z.number(), outstanding: z.number(),
  active_invoice_total: z.number(), due_now: z.number(), review_amount: z.number(),
  header_mismatch: z.boolean(), checked_at: z.string(),
  issues: z.array(z.object({ code: z.string(), entity_id: z.string().uuid(), amount: z.number().nullable() })),
  reconciliation: z.object({ status: z.string(), checked_at: z.string().nullable(), last_error: z.string().nullable() }).nullable().optional(),
});
export type ContractFinancialIntegrity = z.infer<typeof stateSchema>;
type RpcClient = { rpc(name: string, args: Record<string, string>): PromiseLike<{ data: unknown; error: { message: string } | null }> };
const rpcClient = supabase as unknown as RpcClient;
export const financialIntegrityKey = (companyId: string, contractId: string) => ['contract-financial-integrity', contractId, companyId] as const;

export function parseFinancialIntegrity(data: unknown, companyId: string, contractId: string): ContractFinancialIntegrity {
  const value = stateSchema.parse(data);
  if (value.company_id !== companyId || value.contract_id !== contractId) throw new Error('نتيجة المطابقة لا تخص هذا العقد.');
  return value;
}
export function financialIntegrityQueryOptions(companyId: string, contractId: string) {
  return {
    queryKey: financialIntegrityKey(companyId, contractId),
    queryFn: async () => {
      const { data, error } = await rpcClient.rpc('get_contract_financial_integrity_v1', { p_company_id: companyId, p_contract_id: contractId });
      if (error) throw new Error('تعذر تحميل المطابقة المالية من الخادم.');
      return parseFinancialIntegrity(data, companyId, contractId);
    },
    enabled: Boolean(companyId && contractId), staleTime: 15000, retry: 1,
    refetchInterval: 30000,
  };
}
export async function requestFinancialReconciliation(companyId: string, contractId: string): Promise<void> {
  const { data, error } = await rpcClient.rpc('request_contract_financial_reconciliation_v1', { p_company_id: companyId, p_contract_id: contractId });
  if (error) throw new Error(error.message);
  const result = z.object({ contract_id: z.literal(contractId), status: z.literal('pending') }).safeParse(data);
  if (!result.success) throw new Error('تعذر التحقق من تسجيل طلب المطابقة؛ حدّث الحالة قبل إعادة الطلب.');
}
export const financialIssueLabels: Record<string, string> = {
  schedule_obligation_review: 'أقساط تحتاج حسم مصدر الاستحقاق أو قرار الإلغاء',
  schedule_invoice_missing: 'أقساط مستحقة تحتاج فاتورة أو مطابقة الرابط',
  schedule_invoice_invalid: 'روابط لا تطابق شهر الفاتورة أو مبلغها',
  schedule_invoice_duplicate: 'فاتورة مرتبطة بأكثر من قسط',
  invoice_cached_settlement: 'أرصدة فواتير تحتاج إعادة احتساب',
  schedule_cached_settlement: 'سداد أقساط يحتاج مزامنة',
};

const closureScheduleSchema = z.object({
  id: z.string().uuid(), due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().finite(), invoice_id: z.string().uuid().nullable(),
  invoice_number: z.string().nullable(), eligible: z.boolean(),
});
const closurePreviewSchema = z.object({
  closure_mode: z.enum(['no_claim', 'preserve_claims']).optional(),
  version: z.literal(1), company_id: z.string().uuid(), contract_id: z.string().uuid(),
  contract_number: z.string(), contract_status: z.string(), eligible: z.boolean(),
  blockers: z.array(z.string()), canonical_paid: z.number().finite(), outstanding: z.number().finite(),
  review_amount: z.number().finite(), schedule_count: z.number().int().nonnegative(),
  schedules: z.array(closureScheduleSchema), revision: z.string().regex(/^[a-f0-9]{32}$/),
  open_penalty_amount: z.number().finite(), pending_payment_count: z.number().int().nonnegative(),
});
export type NoClaimClosurePreview = z.infer<typeof closurePreviewSchema>;
export function parseNoClaimClosurePreview(data: unknown, companyId: string, contractId: string): NoClaimClosurePreview {
  const value = closurePreviewSchema.parse(data);
  const sum = value.schedules.reduce((total, row) => total + row.amount, 0);
  if (value.company_id !== companyId || value.contract_id !== contractId
    || value.schedule_count !== value.schedules.length || Math.abs(sum - value.review_amount) > 0.005
    || (value.eligible && (value.blockers.length > 0 || !value.schedule_count || value.schedules.some(row => !row.eligible)))) {
    throw new Error('تعذر التحقق من معاينة هذا العقد؛ حدّث البيانات قبل الاعتماد.');
  }
  return value;
}
export async function previewNoClaimClosure(companyId: string, contractId: string) {
  const { data, error } = await rpcClient.rpc('preview_contract_no_claim_closure_v1', {
    p_company_id: companyId, p_contract_id: contractId,
  });
  if (error) throw new Error(error.message);
  return parseNoClaimClosurePreview(data, companyId, contractId);
}
export async function closeNoClaimClosure(input: {
  companyId: string; contractId: string; revision: string; requestId: string; reason: string;
}) {
  const { data, error } = await rpcClient.rpc('close_contract_no_claim_closure_v1', {
    p_company_id: input.companyId, p_contract_id: input.contractId, p_revision: input.revision,
    p_request_id: input.requestId, p_reason: input.reason.trim(),
  });
  if (error) throw new Error(error.message);
  const result = z.object({
    version: z.literal(1), company_id: z.literal(input.companyId), contract_id: z.literal(input.contractId),
    closure_id: z.string().uuid(), status: z.literal('closed'), closed_count: z.number().int().positive(),
    closed_amount: z.number().positive(), canonical_paid: z.number().finite(), replayed: z.boolean(),
  }).parse(data);
  return { ...result, closure_mode: 'no_claim' as const };
}

export function parsePreservedClaimsClosurePreview(data: unknown, companyId: string, contractId: string) {
  const value = parseNoClaimClosurePreview(data, companyId, contractId);
  if (value.closure_mode !== 'preserve_claims') throw new Error('المعاينة لا تخص إقفال الأقساط مع إبقاء المطالبات.');
  return value;
}
export async function previewScheduleClosure(companyId: string, contractId: string) {
  const { data, error } = await rpcClient.rpc('preview_contract_schedule_closure_v1', {
    p_company_id: companyId, p_contract_id: contractId,
  });
  if (error) throw new Error(error.message);
  return parsePreservedClaimsClosurePreview(data, companyId, contractId);
}
export async function closeScheduleClosure(input: {
  companyId: string; contractId: string; revision: string; requestId: string; reason: string;
}) {
  const { data, error } = await rpcClient.rpc('close_contract_schedule_closure_v1', {
    p_company_id: input.companyId, p_contract_id: input.contractId, p_revision: input.revision,
    p_request_id: input.requestId, p_reason: input.reason.trim(),
  });
  if (error) throw new Error(error.message);
  return z.object({
    version: z.literal(1), company_id: z.literal(input.companyId), contract_id: z.literal(input.contractId),
    closure_mode: z.literal('preserve_claims'), closure_id: z.string().uuid(), status: z.literal('closed'),
    closed_count: z.number().int().positive(), closed_amount: z.number().positive(),
    canonical_paid: z.number().finite(), retained_invoice_amount: z.number().finite().nonnegative(),
    retained_penalty_amount: z.number().finite().nonnegative(), replayed: z.boolean(),
  }).parse(data);
}
