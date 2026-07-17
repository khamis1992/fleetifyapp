import { describe, expect, it } from 'vitest';
import { selectLegalContractDocument } from '../utils/contractDocumentSelection';

const document = (
  id: string,
  documentType: string,
  documentName: string,
  filePath: string | null = `${id}.pdf`
) => ({
  id,
  document_type: documentType,
  document_name: documentName,
  file_path: filePath,
  mime_type: 'application/pdf',
});

describe('selectLegalContractDocument', () => {
  it('prefers an explicitly classified signed contract', () => {
    const selected = selectLegalContractDocument([
      document('named', 'general', 'العقد الموقع'),
      document('signed', 'signed_contract', 'نسخة العقد'),
    ]);

    expect(selected?.id).toBe('signed');
  });

  it('recognizes a signed contract saved with the general type', () => {
    const selected = selectLegalContractDocument([
      document('other', 'general', 'مستند عام'),
      document('misclassified', 'general', 'العقد الموقع'),
    ]);

    expect(selected?.id).toBe('misclassified');
  });

  it('falls back to the contract type and ignores drafts or missing files', () => {
    const selected = selectLegalContractDocument([
      document('draft', 'draft_contract', 'مسودة عقد'),
      document('missing', 'signed_contract', 'العقد الموقع', null),
      document('contract', 'contract', 'عقد الإيجار'),
    ]);

    expect(selected?.id).toBe('contract');
  });
});
