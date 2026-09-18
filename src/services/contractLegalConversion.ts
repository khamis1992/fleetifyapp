import { supabase } from '@/integrations/supabase/client';
import { LEGAL_CLAIM_SCOPES, type LegalClaimScope } from '@/types/legalClaimScope';

export type LegalConversionInput = {
  actorId: string;
  contractId: string;
  contract: { id: string; company_id: string; customer_id: string; status: string; vehicle_returned?: boolean | null };
  notes?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  caseType?: 'payment_collection' | 'contract_breach' | 'vehicle_damage' | 'other';
  vehicleReturned?: boolean;
  claimScope?: LegalClaimScope;
};

type LegalCaseIdentity = { id: string; company_id: string; contract_id: string; client_id: string };
export type LegalConversionResult = { legalCase: LegalCaseIdentity; caseNumber: string; totalCaseValue: number };
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  // Preserve SupabaseClient's `this.rest` receiver; never call a detached rpc.
  const call = supabase.rpc as unknown as (name: string,args: Record<string,unknown>) => Promise<{
    data: unknown; error: { message?: string } | null;
  }>;
  const { data,error } = await call.call(supabase,name,args);
  if (error) throw new Error(error.message || 'تعذر تنفيذ التحويل القانوني');
  return data;
}

/** Shared by contract details and batch conversion. No direct legal_cases writes. */
export async function convertContractToLegal(input: LegalConversionInput): Promise<LegalConversionResult> {
  const { contract } = input;
  if (!text(input.actorId) || !text(input.contractId) || !contract
    || input.contractId !== contract.id || !text(contract.company_id) || !text(contract.customer_id)) {
    throw new Error('تعذر التحقق من تطابق العقد والعميل والشركة المطلوبة للتحويل.');
  }
  // An uncertain earlier conversion may already have moved the contract to
  // legal. The atomic server command owns same-contract case reuse.
  if (!['active','cancelled','canceled','closed','expired','under_legal_procedure'].includes(String(contract.status).trim().toLowerCase())) {
    throw new Error('حالة العقد الحالية لا تسمح بإنشاء مطالبة قانونية.');
  }
  const scope = input.claimScope ?? 'full_outstanding';
  if (!LEGAL_CLAIM_SCOPES.includes(scope)) throw new Error('نطاق المطالبة القانونية غير صالح.');
  const vehicleReturned = input.vehicleReturned ?? contract.vehicle_returned;
  if (typeof vehicleReturned !== 'boolean') throw new Error('حالة استلام المركبة غير مؤكدة؛ تحقق منها قبل التحويل.');
  const identity = { p_company_id: contract.company_id,p_contract_id: contract.id };
  const [lease,customerIdentity] = await Promise.all([
    rpc('check_contract_has_verified_signed_lease_v1',identity),
    rpc('check_contract_identity_verified_v1',identity),
  ]);
  if (lease !== true) throw new Error('تعذر تأكيد وجود عقد موقّع مطابق؛ تحقق من المستند ونتيجة المطابقة.');
  if (customerIdentity !== true) throw new Error('تعذر تأكيد تطابق هوية العميل؛ تحقق من نتيجة المطابقة.');
  const result = await rpc('convert_contract_to_legal_collection_v2',{
    ...identity,p_actor_id:input.actorId,p_notes:input.notes || '',p_priority:input.priority || 'high',
    p_case_type:input.caseType || 'payment_collection',p_vehicle_returned:vehicleReturned,p_claim_scope:scope,
  });
  if (record(result) && result.blocked === true) {
    throw new Error(text(result.message_ar) ? result.message_ar : 'التحويل القانوني محجوب؛ راجع متطلبات العقد.');
  }
  const legalCase = record(result) && record(result.legal_case) ? result.legal_case : null;
  const amount = record(result) ? result.total_case_value : null;
  if (!record(result) || (result.blocked !== undefined && result.blocked !== false)
    || result.claim_scope !== scope || !legalCase || !text(legalCase.id)
    || legalCase.company_id !== contract.company_id || legalCase.contract_id !== contract.id
    || legalCase.client_id !== contract.customer_id || !text(result.case_number)
    || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0
    || !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) {
    // The command may have committed. Do not retry or invent a zero-valued case.
    throw new Error('تعذر التحقق من نتيجة التحويل؛ تحقق من حالة العقد والقضية قبل إعادة المحاولة.');
  }
  return { legalCase:legalCase as LegalCaseIdentity,caseNumber:result.case_number,totalCaseValue:amount };
}
