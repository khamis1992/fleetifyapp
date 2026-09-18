export { hasExactIdentityNumberMatch, getEffectiveLegalIdentityMatchStatus } from '@/utils/legalContractIdentityMatch';

export interface ContractDocumentCandidate {
  id: string;
  document_name: string | null;
  document_type: string | null;
  file_path: string | null;
  mime_type: string | null;
  legal_identity_match_status?: string | null;
  legal_identity_expected_id?: string | null;
  legal_identity_extracted_id?: string | null;
  legal_evidence_state?: string | null;
  superseded_by_document_id?: string | null;
  legal_identity_match_reason?: string | null;
}

export function isActiveLegalEvidenceDocument(document: Pick<ContractDocumentCandidate,
  'file_path' | 'legal_evidence_state' | 'superseded_by_document_id'>): boolean {
  return Boolean(document.file_path?.trim()
    && (document.legal_evidence_state || 'active') === 'active'
    && !document.superseded_by_document_id);
}

const normalizeDocumentName = (value: string | null): string =>
  (value || '')
    .toLocaleLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');

const scoreContractDocument = (
  document: ContractDocumentCandidate,
  identityMode: 'matched' | 'pending',
): number => {
  if (!document.file_path) return -1;
  if ((document.legal_evidence_state || 'active') !== 'active') return -1;
  if (
    identityMode === 'matched'
    && document.legal_identity_match_status !== 'matched'
  ) return -1;
  if (identityMode === 'pending' && document.legal_identity_match_status !== 'pending') return -1;

  const type = (document.document_type || '').toLocaleLowerCase();
  const name = normalizeDocumentName(document.document_name);

  if (!['signed_contract', 'signed_contract_image'].includes(type)) return -1;

  let documentScore = -1;
  if (type === 'signed_contract') documentScore = 100;
  if (type === 'signed_contract_image') documentScore = 95;
  if (
    name.includes('العقدالموقع') ||
    name.includes('عقدموقع') ||
    name.includes('signedcontract') ||
    name.includes('signedagreement')
  ) documentScore = Math.max(documentScore, 90);
  if (documentScore < 0) return -1;

  return documentScore;
};

export function selectLegalContractDocument<T extends ContractDocumentCandidate>(
  documents: T[]
): T | null {
  const matched = documents
    .map((document) => ({ document, score: scoreContractDocument(document, 'matched') }))
    .filter((candidate) => candidate.score >= 0);

  // More than one active identity-matched copy is an evidence conflict, not a
  // reason to silently choose the newest file. A supervisor/agent must mark all
  // older copies as superseded before legal filing can continue.
  if (matched.length !== 1) return null;
  return matched[0].document;
}

/** Explains attachment presence separately from eligibility as filing evidence. */
export function getContractDocumentReview(documents: ContractDocumentCandidate[]) {
  const copies = documents.filter((document) => document.file_path
    && ['signed_contract', 'signed_contract_image'].includes((document.document_type || '').toLowerCase()));
  const matched = selectLegalContractDocument(documents);
  const activeMatched = copies.filter((document) => (document.legal_evidence_state || 'active') === 'active'
    && document.legal_identity_match_status === 'matched');
  if (matched) return { kind: 'ready' as const, label: 'جاهز', message: '', copies };
  if (!copies.length) return {
    kind: 'missing' as const, label: 'نسخة العقد ناقصة', copies,
    message: 'لا توجد نسخة مرفوعة مصنفة كعقد موقّع لهذا العقد. ارفع النسخة أو راجع تصنيف المستند الموجود في ملف العقد.',
  };
  if (activeMatched.length > 1) return {
    kind: 'conflict' as const, label: 'موجود — تعدد النسخ', copies,
    message: 'توجد أكثر من نسخة عقد نشطة ومطابقة. راجع النسخ وحدد النسخة المعتمدة قبل الرفع.',
  };
  const candidate = copies.find((document) => document.legal_evidence_state !== 'superseded') || copies[0];
  const reason = candidate.legal_identity_match_reason?.trim();
  return {
    kind: 'review' as const, label: 'موجود — يحتاج مراجعة', copies,
    message: candidate.legal_evidence_state === 'superseded'
      ? 'نسخة العقد موجودة لكنها مستبدلة وغير معتمدة للرفع. راجع النسخة الحالية في ملف العقد.'
      : `نسخة العقد موجودة. يلزم مراجعة المطابقة قبل اعتمادها للدعوى. ${reason || 'لم تكتمل مطابقة هوية المستأجر.'} افتح مراجعة العقد لإكمال التحقق.`,
  };
}

/**
 * Selects only a pending direct-contract copy for OCR. It is deliberately
 * separate from legal selection so an unverified file can never become filing
 * evidence merely because it has a convincing name or document type.
 */
export function selectContractDocumentForIdentityScan<
  T extends ContractDocumentCandidate,
>(documents: T[]): T | null {
  let selected: T | null = null;
  let selectedScore = -1;

  for (const document of documents) {
    const score = scoreContractDocument(document, 'pending');
    if (score > selectedScore) {
      selected = document;
      selectedScore = score;
    }
  }

  return selectedScore >= 0 ? selected : null;
}
