/** Mirrors the private review RPC; eligibility to review never grants approval. */
export const MANUAL_REVIEW_OCR_REASONS = [
  'insufficient_identity_evidence', 'tenant_name_conflict', 'low_ocr_confidence', 'incomplete_scan',
] as const;

type ReviewCandidate = {
  sourceType?: string;
  document_type: string;
  file_path?: string | null;
  legal_evidence_state?: string | null;
  legal_identity_match_status?: string | null;
  legal_identity_details?: unknown;
};

export function getManualContractIdentityEligibility(document: ReviewCandidate): { eligible: boolean; reason: string } {
  if (document.sourceType !== 'contract') return { eligible: false, reason: 'أرفق هذه النسخة بالعقد قبل مطابقتها.' };
  if (!['signed_contract', 'signed_contract_image'].includes(document.document_type) || !document.file_path?.trim()) {
    return { eligible: false, reason: 'يلزم ملف مصنّف كعقد موقّع للمعاينة والمطابقة.' };
  }
  if (document.legal_evidence_state === 'active') return { eligible: true, reason: '' };
  if (document.legal_evidence_state === 'superseded') return { eligible: false, reason: 'نسخة مستبدلة — راجع النسخة الحالية.' };
  const details = document.legal_identity_details;
  const reasonCode = details && typeof details === 'object' && !Array.isArray(details)
    ? (details as Record<string, unknown>).reasonCode : undefined;
  if (document.legal_evidence_state === 'quarantined'
    && document.legal_identity_match_status === 'unverified'
    && MANUAL_REVIEW_OCR_REASONS.some((reason) => reason === reasonCode)) return { eligible: true, reason: '' };
  return { eligible: false, reason: document.legal_evidence_state === 'quarantined'
    ? 'هذه النسخة موقوفة بسبب تعارض أو نتيجة غير محسومة لا تقبل الاعتماد المباشر. راجع نتيجة المطابقة من مكتبة المستندات أو أرفق نسخة صحيحة.'
    : 'تعذر تحديد حالة النسخة. أعد تحميل المستندات قبل المطابقة.' };
}
