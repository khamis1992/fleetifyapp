import { describe, expect, it } from 'vitest';
import {
  normalizeLegalIdentityMatchStatus,
  normalizeLegalContractDocumentIdentityRow,
  toLegalIdentityVerification,
  type LegalContractDocumentIdentityRow,
} from '@/services/legalContractIdentityVerifier';
import { selectLegalContractDocument } from '@/pages/legal/LawsuitPreparation/utils/contractDocumentSelection';

describe('legal identity status normalization', () => {
  it.each(['pending', 'matched', 'mismatch', 'unverified', 'failed'] as const)(
    'preserves the supported %s status',
    (status) => {
      expect(normalizeLegalIdentityMatchStatus(status)).toBe(status);
    },
  );

  it.each([null, undefined, '', 'approved', 'MATCHED', 1, {}])(
    'fails closed for an unknown database value %#',
    (value) => {
      expect(normalizeLegalIdentityMatchStatus(value)).toBe('unverified');
    },
  );
});

describe('legacy OCR identity evidence', () => {
  const document: LegalContractDocumentIdentityRow & { document_type: string; legal_evidence_state: string } = {
    id: 'signed-lease',
    document_name: 'عقد اختبار.pdf',
    document_type: 'signed_contract',
    file_path: 'test/signed-lease.pdf',
    mime_type: 'application/pdf',
    legal_evidence_state: 'active',
    legal_identity_match_status: 'mismatch',
    legal_identity_expected_name: 'عميل الاختبار',
    legal_identity_extracted_name: 'للطرف الاول بموجب هذا العقد ولا يمكن استرجاع',
    legal_identity_expected_id: '29900000001',
    legal_identity_extracted_id: '29900000001',
    legal_identity_match_reason: 'Legacy OCR name mismatch',
    legal_identity_checked_at: '2026-09-01T00:00:00Z',
  };

  it('keeps selection and display on the persisted decision until a server recheck', () => {
    expect(selectLegalContractDocument([document])).toBeNull();
    expect(toLegalIdentityVerification(document).status).toBe('mismatch');
    expect(toLegalIdentityVerification(document).reason).toBe('Legacy OCR name mismatch');
    expect(normalizeLegalContractDocumentIdentityRow(document).legal_identity_match_status).toBe('mismatch');
    const rechecked = { ...document, legal_identity_match_status: 'matched' as const };
    expect(selectLegalContractDocument([rechecked])).toBe(rechecked);
    expect(toLegalIdentityVerification(rechecked).status).toBe('matched');
  });

  it.each([
    ['29900000001', '29900000002'],
    ['12345', '12345'],
    [null, null],
  ])('does not clear a mismatch without a complete matching identity number (%s, %s)', (expected, extracted) => {
    const candidate = { ...document, legal_identity_expected_id: expected, legal_identity_extracted_id: extracted };
    expect(selectLegalContractDocument([candidate])).toBeNull();
    expect(toLegalIdentityVerification(candidate).status).toBe('mismatch');
  });

  it.each(['superseded', 'quarantined'])('still excludes %s evidence despite an identity match', (state) => {
    expect(selectLegalContractDocument([{ ...document, legal_evidence_state: state }])).toBeNull();
  });
});
