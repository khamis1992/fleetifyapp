export interface LegalIdentityEvidence {
  legal_identity_match_status?: string | null;
  legal_identity_expected_id?: string | null;
  legal_identity_extracted_id?: string | null;
}

const normalizeIdentityNumber = (value: string | null | undefined): string =>
  String(value || '').replace(/[^0-9]/g, '');

export const hasExactIdentityNumberMatch = (
  document: Pick<LegalIdentityEvidence, 'legal_identity_expected_id' | 'legal_identity_extracted_id'>,
): boolean => {
  const expectedId = normalizeIdentityNumber(document.legal_identity_expected_id);
  const extractedId = normalizeIdentityNumber(document.legal_identity_extracted_id);
  return expectedId.length === 11 && expectedId === extractedId;
};

/** The persisted server decision is authoritative. Numeric equality alone cannot override tenant conflicts. */
export const getEffectiveLegalIdentityMatchStatus = (
  document: LegalIdentityEvidence,
): string | null | undefined => (
  document.legal_identity_match_status
);
