import { supabase } from '@/integrations/supabase/client';
import { convertContractToLegal, type LegalConversionResult } from './contractLegalConversion';

export type LegalBatchCandidate = { contract_id?: string; customer_id: string; days_overdue: number };
export type LegalBatchResult = {
  converted: Array<{ contractId: string; result: LegalConversionResult }>;
  failed: Array<{ contractId: string; message: string }>;
  ineligible: number;
};

/** Server workflow owns readiness, case reuse, claim amount and financial writes. */
export async function convertSelectedContractsToLegal(companyId: string,actorId: string,candidates: LegalBatchCandidate[]): Promise<LegalBatchResult> {
  if (!companyId?.trim() || !actorId?.trim()) throw new Error('تعذر تحديد الشركة والمستخدم للتحويل.');
  const unique = new Map<string,LegalBatchCandidate>();
  for (const candidate of candidates) {
    if (!candidate.contract_id?.trim() || !candidate.customer_id?.trim() || !Number.isFinite(candidate.days_overdue)) {
      throw new Error('بيانات العقد المحدد غير مكتملة؛ أعد تحميل القائمة قبل التحويل.');
    }
    const previous = unique.get(candidate.contract_id);
    if (previous && (previous.customer_id !== candidate.customer_id || previous.days_overdue !== candidate.days_overdue)) {
      throw new Error('توجد بيانات متعارضة للعقد المحدد؛ أعد تحميل القائمة قبل التحويل.');
    }
    unique.set(candidate.contract_id,candidate);
  }
  const result: LegalBatchResult = {converted:[],failed:[],ineligible:0};
  for (const [contractId,candidate] of unique) {
    // The list re-reads current allocations before invoking this service.
    // This threshold is still not an atomic server-side claim validation.
    if (candidate.days_overdue < 30) { result.ineligible++; continue; }
    try {
      const {data:contract,error} = await supabase.from('contracts')
        .select('id,company_id,customer_id,status,vehicle_returned')
        .eq('company_id',companyId).eq('id',contractId).maybeSingle();
      if (error) throw new Error(error.message || 'تعذر قراءة العقد.');
      if (!contract || contract.id !== contractId || contract.company_id !== companyId || contract.customer_id !== candidate.customer_id) {
        throw new Error('العقد لا يطابق الشركة والعميل المحددين؛ أعد تحميل القائمة.');
      }
      const conversion = await convertContractToLegal({
        actorId,contractId,contract,claimScope:'full_outstanding',caseType:'payment_collection',
        notes:'تحويل من قائمة المتأخرين عبر مسار التحقق الموحد؛ تحتسب المطالبة في قاعدة البيانات.',
      });
      result.converted.push({contractId,result:conversion});
    } catch (error) {
      result.failed.push({contractId,message:error instanceof Error ? error.message : 'تعذر تأكيد التحويل؛ تحقق من حالة العقد قبل إعادة المحاولة.'});
    }
  }
  return result;
}
