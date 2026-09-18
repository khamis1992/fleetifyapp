import { describe, expect, it } from 'vitest';
import {
  selectContractDocumentForIdentityScan,
  selectLegalContractDocument,
  getContractDocumentReview,
  isActiveLegalEvidenceDocument,
} from '../utils/contractDocumentSelection';

describe('active evidence for legal claims', () => {
  it('accepts active and legacy evidence but rejects quarantined, superseded and empty files', () => {
    expect(isActiveLegalEvidenceDocument({ file_path: 'proof.pdf', legal_evidence_state: 'active' })).toBe(true);
    expect(isActiveLegalEvidenceDocument({ file_path: 'proof.pdf', legal_evidence_state: null })).toBe(true);
    for (const change of [{ legal_evidence_state: 'quarantined' }, { legal_evidence_state: 'superseded' },
      { superseded_by_document_id: 'replacement' }, { file_path: ' ' }, { file_path: null }]) {
      expect(isActiveLegalEvidenceDocument({ file_path: 'proof.pdf', legal_evidence_state: 'active', ...change })).toBe(false);
    }
  });
});

const document = (
  id: string,
  documentType: string,
  documentName: string,
  filePath: string | null = `${id}.pdf`,
  identityStatus?: 'pending' | 'matched' | 'mismatch' | 'unverified' | 'expired_unverified' | 'failed',
  evidenceState: 'active' | 'superseded' | 'quarantined' = 'active',
) => ({
  id,
  document_type: documentType,
  document_name: documentName,
  file_path: filePath,
  mime_type: 'application/pdf',
  legal_identity_match_status: identityStatus,
  legal_evidence_state: evidenceState,
});

describe('attachment availability diagnostics', () => {
  it('distinguishes a quarantined unreadable identity from an absent signed contract', () => {
    const review = getContractDocumentReview([{
      ...document('existing', 'signed_contract', 'العقد المرفوع.pdf', undefined, 'unverified', 'quarantined'),
      legal_identity_match_reason: 'لم تتم قراءة الرقم الشخصي كاملاً',
    }]);
    expect(review.kind).toBe('review');
    expect(review.message).toContain('نسخة العقد موجودة');
    expect(review.message).toContain('لم تتم قراءة الرقم الشخصي كاملاً');
    expect(review.copies[0].id).toBe('existing');
    expect(selectLegalContractDocument(review.copies)).toBeNull();
  });
  it('explains conflicting approved copies without calling either missing', () => {
    const review = getContractDocumentReview([
      document('one', 'signed_contract', 'نسخة 1', undefined, 'matched'),
      document('two', 'signed_contract', 'نسخة 2', undefined, 'matched'),
    ]);
    expect(review.kind).toBe('conflict');
    expect(review.message).toContain('أكثر من نسخة');
  });
  it('requires upload or classification only when no signed attachment exists', () => {
    const review = getContractDocumentReview([document('other', 'violations_proof', 'مخالفات'), document('no-file', 'signed_contract', 'بدون ملف', null)]);
    expect(review.kind).toBe('missing');
    expect(review.copies).toHaveLength(0);
  });
});

describe('selectLegalContractDocument', () => {
  it('blocks when two active copies are both marked as identity-matched', () => {
    const selected = selectLegalContractDocument([
      document('named', 'signed_contract_image', 'العقد الموقع', undefined, 'matched'),
      document('signed', 'signed_contract', 'نسخة العقد', undefined, 'matched'),
    ]);

    expect(selected).toBeNull();
  });

  it('does not accept a misclassified general document as a signed contract', () => {
    const selected = selectLegalContractDocument([
      document('other', 'general', 'مستند عام', undefined, 'matched'),
      document('misclassified', 'general', 'العقد الموقع', undefined, 'matched'),
    ]);

    expect(selected).toBeNull();
  });

  it('requires a persisted recheck before promoting legacy OCR evidence', () => {
    const candidate = {
      ...document('qid-match', 'signed_contract', 'سعيد الحبابي', undefined, 'mismatch'),
      legal_identity_expected_id: '28663402985',
      legal_identity_extracted_id: '28663402985',
    };

    expect(selectLegalContractDocument([candidate])).toBeNull();
    expect(selectLegalContractDocument([{ ...candidate, legal_identity_match_status: 'matched' }])?.id).toBe('qid-match');
  });

  it('does not override a real QID mismatch', () => {
    const candidate = {
      ...document('qid-mismatch', 'signed_contract', 'نسخة العقد', undefined, 'mismatch'),
      legal_identity_expected_id: '28663402985',
      legal_identity_extracted_id: '28663402986',
    };

    expect(selectLegalContractDocument([candidate])).toBeNull();
  });

  it('falls back to the contract type and ignores drafts or missing files', () => {
    const selected = selectLegalContractDocument([
      document('draft', 'draft_contract', 'مسودة عقد'),
      document('missing', 'signed_contract', 'العقد الموقع', null),
      document('contract', 'signed_contract_image', 'عقد الإيجار', undefined, 'matched'),
    ]);

    expect(selected?.id).toBe('contract');
  });

  it('uses the sole active copy after an older matched copy is superseded', () => {
    const selected = selectLegalContractDocument([
      document('older', 'signed_contract', 'نسخة أقدم', undefined, 'matched', 'superseded'),
      document('current', 'signed_contract', 'النسخة الحالية', undefined, 'matched'),
    ]);

    expect(selected?.id).toBe('current');
  });

  it('prefers a previously verified signed contract over a newer OCR mismatch', () => {
    const selected = selectLegalContractDocument([
      document('newer-false-mismatch', 'signed_contract', '7069 - LTO2024284.pdf', undefined, 'mismatch'),
      document('verified-tenant-copy', 'signed_contract', 'عصام عبد الله المزوغي.pdf', undefined, 'matched'),
    ]);

    expect(selected?.id).toBe('verified-tenant-copy');
  });

  it('never selects a contract copy whose tenant identity mismatches', () => {
    const selected = selectLegalContractDocument([
      document('wrong-plate-only-copy', 'signed_contract', '706150 - 276.pdf', undefined, 'mismatch'),
    ]);

    expect(selected).toBeNull();
  });

  it.each(['pending', 'unverified', 'expired_unverified', 'failed'] as const)(
    'never exposes a %s document as legal evidence',
    (status) => {
      expect(selectLegalContractDocument([
        document(`copy-${status}`, 'signed_contract', 'نسخة العقد', undefined, status),
      ])).toBeNull();
    },
  );

  it('routes only pending documents to identity scanning', () => {
    expect(selectContractDocumentForIdentityScan([
      document('unverified', 'signed_contract', 'نسخة قديمة', undefined, 'unverified'),
      document('pending', 'signed_contract', 'نسخة جديدة', undefined, 'pending'),
      document('matched', 'signed_contract', 'نسخة صحيحة', undefined, 'matched'),
    ])?.id).toBe('pending');
  });
});
