import { supabase } from '@/integrations/supabase/client';
import type { LawsuitPreparationState } from '../store';
import { getLawsuitClaimAmounts } from './claimAmounts';
import { assertFilingCanStart, assertFilingReady } from './filingReadiness';

export interface RegisterCaseResult {
  caseId: string;
  caseNumber: string;
}

interface OpenedLegalCaseRow {
  id?: string;
  case_status?: string | null;
  workflow_stage?: string | null;
}

type FinalizeLegalCaseFilingRpc = (
  name: 'finalize_legal_case_filing_v1',
  args: {
    p_company_id: string;
    p_contract_id: string;
    p_case_id: string;
    p_claim_amount: number;
    p_case_title: string | null;
    p_facts: string | null;
    p_claims: string | null;
    p_actor_id: string;
  },
) => Promise<{ data: OpenedLegalCaseRow | null; error: { message?: string } | null }>;

/**
 * ينشئ سجل القضية في مرحلة التجهيز ويزامنه مع البيانات التي اجتازت بوابة
 * الجاهزية. لا يغيّر الحالة إلى «مرفوعة»؛ ذلك محصور في الإجراء الذري أدناه.
 */
export async function registerLegalCase(
  state: LawsuitPreparationState,
  userId: string,
  options: { preparationOnly?: boolean } = {},
): Promise<RegisterCaseResult> {
  if (options.preparationOnly) {
    assertFilingCanStart(state);
  } else {
    assertFilingReady(state);
  }
  const { companyId, contractId, calculations, taqadiData } = state;
  if (!companyId || !contractId || !calculations) {
    throw new Error('بيانات القضية غير مكتملة');
  }

  const { taqadiClaimAmount } = getLawsuitClaimAmounts(calculations);
  const { data, error } = await supabase.rpc('convert_contract_to_legal_v1', {
    p_actor_id: userId,
    p_case_type: 'contract_dispute',
    p_company_id: companyId,
    p_contract_id: contractId,
    p_notes: taqadiData ? `${taqadiData.caseTitle}\n${taqadiData.claims}` : '',
    p_priority: calculations.total > 10000 ? 'urgent' : 'high',
    p_vehicle_returned: false,
  });
  if (error || !data) {
    throw new Error(`فشل إنشاء سجل القضية: ${error?.message || 'خطأ غير معروف'}`);
  }

  const result = data as {
    case_number?: string;
    legal_case?: { id?: string; case_number?: string };
    blocked?: boolean;
    message_ar?: string;
  };
  if (result.blocked) {
    throw new Error(
      result.message_ar
      || 'لا توجد نسخة عقد PDF مطابقة للعميل. تم إنشاء طلب واتساب تلقائي للمسؤولين.',
    );
  }
  if (!result.legal_case?.id) {
    throw new Error('لم يُرجع أمر إنشاء القضية معرّفاً صالحاً');
  }

  const { error: syncError } = await supabase.rpc('sync_lawsuit_preparation_to_legal_case_v1', {
    p_actor_id: userId,
    p_case_id: result.legal_case.id,
    p_case_title: taqadiData?.caseTitle || null,
    p_claim_amount: taqadiClaimAmount,
    p_claims: taqadiData?.claims || null,
    p_company_id: companyId,
    p_contract_id: contractId,
    p_facts: taqadiData?.facts || null,
  });
  if (syncError) {
    throw new Error(`أُنشئت القضية لكن تعذرت مزامنة ملف التجهيز: ${syncError.message}`);
  }

  return {
    caseId: result.legal_case.id,
    caseNumber: result.legal_case.case_number || result.case_number || '',
  };
}

/** يتحقق ويزامن وينقل القضية إلى «مرفوعة» داخل معاملة قاعدة بيانات واحدة. */
export async function openLegalCase(
  state: LawsuitPreparationState,
  userId: string,
): Promise<RegisterCaseResult> {
  const registeredCase = await registerLegalCase(state, userId);
  if (!state.companyId || !state.contractId || !state.calculations) {
    throw new Error('بيانات الشركة أو العقد أو المطالبة غير مكتملة');
  }
  const { taqadiClaimAmount } = getLawsuitClaimAmounts(state.calculations);

  const workflowClient = supabase as typeof supabase & {
    rpc: FinalizeLegalCaseFilingRpc;
  };
  const { data: openedCase, error } = await workflowClient.rpc(
    'finalize_legal_case_filing_v1',
    {
      p_company_id: state.companyId,
      p_contract_id: state.contractId,
      p_case_id: registeredCase.caseId,
      p_claim_amount: taqadiClaimAmount,
      p_case_title: state.taqadiData?.caseTitle || null,
      p_facts: state.taqadiData?.facts || null,
      p_claims: state.taqadiData?.claims || null,
      p_actor_id: userId,
    },
  );

  if (error) {
    throw new Error(`تعذر تغيير حالة القضية إلى مرفوعة: ${error.message || 'خطأ غير معروف'}`);
  }
  if (
    !openedCase
    || openedCase.id !== registeredCase.caseId
    || openedCase.workflow_stage !== 'filed'
    || openedCase.case_status !== 'active'
  ) {
    throw new Error('لم تؤكد قاعدة البيانات انتقال القضية إلى الحالة المرفوعة');
  }

  return registeredCase;
}
