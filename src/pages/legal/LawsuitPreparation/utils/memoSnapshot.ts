import { supabase } from '@/integrations/supabase/client';
import type { LegalMemoSnapshot, LawsuitPreparationState } from '../store/types';
import { buildMemoDocumentData, isMemoSnapshotCurrent, loadCanonicalLawsuitState } from './documentGenerators';
import { evaluateLegalMemoReadiness } from './legalCaseWorkflow';
import { getQatarBusinessDate } from './legalClaimSources';
import { assertRentClaimConsistent } from './rentClaimSummary';

/** Freeze persisted facts, never a page's potentially stale query snapshot. */
export class MemoFactsChangedError extends Error {
  constructor() {
    super('تغيرت بيانات المذكرة منذ عرضها؛ جارٍ تحديث الصفحة. راجع التفاصيل الجديدة ثم ثبّت المذكرة.');
    this.name = 'MemoFactsChangedError';
  }
}

export async function freezeCurrentMemoSnapshot(
  companyId: string, contractId: string, reviewedState: LawsuitPreparationState,
): Promise<LegalMemoSnapshot> {
  const current = await loadCanonicalLawsuitState(companyId, contractId);
  assertRentClaimConsistent(current);
  const readiness = evaluateLegalMemoReadiness(current);
  if (readiness.status === 'not_ready') {
    throw new Error(`لا يمكن تثبيت المذكرة قبل معالجة: ${readiness.issues.join('، ')}`);
  }
  if (!isMemoSnapshotCurrent(current, { payload: { ...buildMemoDocumentData(reviewedState) } })) {
    throw new MemoFactsChangedError();
  }

  const factsDate = getQatarBusinessDate();
  const filingDate = current.legalCase?.filing_date?.slice(0, 10) || null;
  const payload = {
    ...buildMemoDocumentData(current),
    memoDate: factsDate.split('-').reverse().join('/'),
    filingDate: filingDate || undefined,
  };
  const { data, error } = await supabase.rpc('freeze_legal_case_memo_snapshot', {
    p_company_id: companyId,
    p_contract_id: contractId,
    p_case_id: current.legalCase?.id || null,
    p_facts_as_of_date: factsDate,
    p_filing_date: filingDate,
    p_legal_path: readiness.legalPath.effectivePath,
    p_readiness_status: ['ready', 'approved'].includes(readiness.status) ? 'ready' : 'ready_with_reservations',
    p_readiness_issues: [...readiness.issues, ...readiness.warnings],
    p_payload: JSON.parse(JSON.stringify(payload)),
    p_template_version: 'INVESTMENT_COURT_MEMO_V2',
    p_approve: false,
  });
  if (error) throw error;
  return data as unknown as LegalMemoSnapshot;
}
