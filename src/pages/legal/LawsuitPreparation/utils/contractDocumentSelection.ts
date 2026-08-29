export interface ContractDocumentCandidate {
  id: string;
  document_name: string | null;
  document_type: string | null;
  file_path: string | null;
  mime_type: string | null;
  legal_identity_match_status?: string | null;
  legal_evidence_state?: string | null;
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
  if (identityMode === 'matched' && document.legal_identity_match_status !== 'matched') return -1;
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
