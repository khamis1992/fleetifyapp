import { describe, expect, it } from 'vitest';
import {
  selectContractDocumentForIdentityScan,
  selectLegalContractDocument,
} from '../utils/contractDocumentSelection';

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
