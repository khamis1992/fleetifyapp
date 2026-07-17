export interface ContractDocumentCandidate {
  id: string;
  document_name: string | null;
  document_type: string | null;
  file_path: string | null;
  mime_type: string | null;
}

const normalizeDocumentName = (value: string | null): string =>
  (value || '')
    .toLocaleLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');

const scoreContractDocument = (document: ContractDocumentCandidate): number => {
  if (!document.file_path) return -1;

  const type = (document.document_type || '').toLocaleLowerCase();
  const name = normalizeDocumentName(document.document_name);

  if (type === 'signed_contract') return 100;
  if (
    name.includes('العقدالموقع') ||
    name.includes('عقدموقع') ||
    name.includes('signedcontract') ||
    name.includes('signedagreement')
  ) return 90;
  if (type === 'contract') return 70;

  return -1;
};

export function selectLegalContractDocument(
  documents: ContractDocumentCandidate[]
): ContractDocumentCandidate | null {
  let selected: ContractDocumentCandidate | null = null;
  let selectedScore = -1;

  for (const document of documents) {
    const score = scoreContractDocument(document);
    if (score > selectedScore) {
      selected = document;
      selectedScore = score;
    }
  }

  return selectedScore >= 0 ? selected : null;
}
