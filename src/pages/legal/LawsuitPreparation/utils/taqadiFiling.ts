import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

const LIVE_CASE_STATUSES = new Set(['open', 'active', 'pending', 'on_hold', 'under_review']);

export interface LawsuitLegalCase {
  id: string;
  case_number: string;
  case_status: string | null;
  workflow_stage: string | null;
  case_reference: string | null;
  court_fees: number | null;
  filing_date: string | null;
  created_at: string | null;
}

export interface TaqadiFilingDetails {
  caseNumber: string | null;
  referenceNumber: string | null;
  courtFees: number | null;
}

type UnknownRecord = Record<string, unknown>;
type LegalCaseUpdate = Database['public']['Tables']['legal_cases']['Update'];
type LawsuitPreparationUpdate = Database['public']['Tables']['lawsuit_preparations']['Update'];
type TransitionWorkflowRpc = (
  name: 'transition_legal_case_workflow_v1',
  args: {
    p_company_id: string;
    p_case_id: string;
    p_target_stage: string;
    p_reason: string | null;
    p_actor_id: string | null;
  },
) => PromiseLike<{ error: { message: string } | null }>;
type ReopenLegalCaseRpc = (
  name: 'reopen_legal_case_v1',
  args: {
    p_company_id: string;
    p_case_id: string;
    p_target_stage: 'preparation';
    p_reason: string;
  },
) => PromiseLike<{
  data: LawsuitLegalCase | null;
  error: { message: string; code?: string } | null;
}>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null;

const firstText = (records: UnknownRecord[], keys: string[]) => {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    }
  }
  return null;
};

const firstAmount = (records: UnknownRecord[], keys: string[]) => {
  const text = firstText(records, keys);
  if (!text) return null;
  const amount = Number(text.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(amount) ? amount : null;
};

export function extractTaqadiFilingDetails(payload: unknown): TaqadiFilingDetails {
  const root = asRecord(payload) ?? {};
  const records = [
    root,
    asRecord(root.data),
    asRecord(root.result),
    asRecord(root.filing),
    asRecord(root.submission),
  ].filter((record): record is UnknownRecord => Boolean(record));

  const caseNumber = firstText(records, [
    'caseNumber',
    'case_number',
    'taqadiCaseNumber',
    'taqadi_case_number',
  ]);
  const referenceNumber = firstText(records, [
    'referenceNumber',
    'reference_number',
    'caseReference',
    'case_reference',
    'taqadiReferenceNumber',
    'taqadi_reference_number',
  ]) || caseNumber;
  const courtFees = firstAmount(records, [
    'courtFees',
    'court_fees',
    'filingFee',
    'filing_fee',
    'fees',
  ]);

  return { caseNumber, referenceNumber, courtFees };
}

export function selectCurrentLegalCase(cases: LawsuitLegalCase[]) {
  return cases.find((legalCase) => LIVE_CASE_STATUSES.has(legalCase.case_status || ''))
    ?? cases[0]
    ?? null;
}

export async function getCurrentLegalCase(
  companyId: string,
  contractId: string,
): Promise<LawsuitLegalCase | null> {
  const { data, error } = await supabase
    .from('legal_cases')
    .select('id,case_number,case_status,workflow_stage,case_reference,court_fees,filing_date,created_at')
    .eq('company_id', companyId)
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return selectCurrentLegalCase((data ?? []) as LawsuitLegalCase[]);
}

export function isLegalCaseReopenable(legalCase: LawsuitLegalCase | null | undefined) {
  return Boolean(
    legalCase
    && ['closed', 'cancelled'].includes(legalCase.workflow_stage ?? ''),
  );
}

export async function reopenLegalCaseForPreparation(
  companyId: string,
  caseId: string,
  reason: string,
) {
  const normalizedReason = reason.trim();
  if (normalizedReason.length < 10) {
    throw new Error('اكتب سبب إعادة الفتح بما لا يقل عن 10 أحرف');
  }

  const reopenLegalCase = supabase.rpc as unknown as ReopenLegalCaseRpc;
  const { data, error } = await reopenLegalCase('reopen_legal_case_v1', {
    p_company_id: companyId,
    p_case_id: caseId,
    p_target_stage: 'preparation',
    p_reason: normalizedReason,
  });

  if (error) {
    if (error.code === '42501' || error.message.includes('Manager permission')) {
      throw new Error('تحتاج صلاحية مدير لإعادة فتح القضية');
    }
    throw new Error(error.message);
  }
  if (!data) throw new Error('لم تُرجع قاعدة البيانات حالة القضية بعد إعادة فتحها');
  return data;
}

interface RecordTaqadiFilingInput {
  companyId: string;
  contractId: string;
  caseId: string;
  workflowStage?: string | null;
  result: unknown;
  sourceDocumentId: string;
}

export async function recordTaqadiFiling({
  companyId,
  contractId,
  caseId,
  workflowStage,
  result,
  sourceDocumentId,
}: RecordTaqadiFilingInput) {
  const filing = extractTaqadiFilingDetails(result);

  if (!workflowStage || workflowStage === 'preparation') {
    const transitionWorkflow = supabase.rpc as unknown as TransitionWorkflowRpc;
    const { error } = await transitionWorkflow('transition_legal_case_workflow_v1', {
      p_company_id: companyId,
      p_case_id: caseId,
      p_target_stage: 'filed',
      p_reason: 'تم رفع الدعوى واعتمادها آليًا عبر نظام تقاضي',
      p_actor_id: null,
    });
    if (error) throw error;
  }

  const caseUpdates: LegalCaseUpdate = {};
  if (filing.referenceNumber) caseUpdates.case_reference = filing.referenceNumber;
  if (filing.courtFees !== null) caseUpdates.court_fees = filing.courtFees;

  if (Object.keys(caseUpdates).length > 0) {
    const { error } = await supabase
      .from('legal_cases')
      .update(caseUpdates)
      .eq('id', caseId)
      .eq('company_id', companyId);
    if (error) throw error;
  }

  const now = new Date().toISOString();
  const preparationUpdates: LawsuitPreparationUpdate = {
    status: 'registered',
    submitted_at: now,
    registered_at: now,
    source_document_id: sourceDocumentId,
  };
  if (filing.caseNumber) preparationUpdates.taqadi_case_number = filing.caseNumber;
  if (filing.referenceNumber) preparationUpdates.taqadi_reference_number = filing.referenceNumber;

  const { error: preparationError } = await supabase
    .from('lawsuit_preparations')
    .update(preparationUpdates)
    .eq('company_id', companyId)
    .eq('contract_id', contractId);
  if (preparationError) throw preparationError;

  return filing;
}
