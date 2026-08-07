import { describe, expect, it, vi } from 'vitest';
import {
  buildContractDocumentStoragePath,
  getLegalDocumentUploadRoute,
  isUploadableDocumentId,
  sanitizeLegalDocumentFileName,
  validateLegalDocumentFile,
} from '../documentUploadRouting';

describe('document upload routing', () => {
  it('routes every manually uploaded document to its canonical storage scope', () => {
    expect(getLegalDocumentUploadRoute('contract')).toMatchObject({
      destination: 'contract',
      bucket: 'contract-documents',
      documentType: 'signed_contract',
    });
    expect(getLegalDocumentUploadRoute('violationsEvidence')).toMatchObject({
      destination: 'contract',
      bucket: 'contract-documents',
      documentType: 'violations_proof',
    });
    expect(getLegalDocumentUploadRoute('commercialRegister')).toMatchObject({
      destination: 'company',
      bucket: 'legal-documents',
      documentType: 'commercial_register',
    });
    expect(getLegalDocumentUploadRoute('ibanCertificate')?.documentType).toBe('iban_certificate');
    expect(getLegalDocumentUploadRoute('representativeId')?.documentType).toBe('representative_id');
    expect(getLegalDocumentUploadRoute('memo')).toBeNull();
  });

  it('recognizes only documents that have a persistent upload destination', () => {
    expect(isUploadableDocumentId('violationsEvidence')).toBe(true);
    expect(isUploadableDocumentId('docsList')).toBe(false);
  });

  it('builds a contract-scoped path and keeps Arabic file names safe', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    expect(sanitizeLegalDocumentFileName('تقرير مخالفات (نهائي).pdf')).toBe('تقرير_مخالفات_نهائي_.pdf');
    expect(buildContractDocumentStoragePath({
      companyId: 'company-1',
      contractId: 'contract-1',
      documentType: 'violations_proof',
      fileName: 'تقرير مخالفات (نهائي).pdf',
      uniqueId: 'upload-1',
    })).toBe('company-1/contract-1/violations_proof/1234-upload-1-تقرير_مخالفات_نهائي_.pdf');
    vi.restoreAllMocks();
  });

  it('rejects empty and unsupported files', () => {
    expect(() => validateLegalDocumentFile(new File([], 'empty.pdf', { type: 'application/pdf' })))
      .toThrow('الملف المحدد فارغ');
    expect(() => validateLegalDocumentFile(new File(['x'], 'script.exe', { type: 'application/octet-stream' })))
      .toThrow('نوع الملف غير مدعوم');
    expect(() => validateLegalDocumentFile(new File(['pdf'], 'document.pdf', { type: 'application/pdf' })))
      .not.toThrow();
  });

  it('matches the PDF-only company legal documents bucket', () => {
    const companyRoute = getLegalDocumentUploadRoute('commercialRegister');
    expect(() => validateLegalDocumentFile(
      new File(['image'], 'register.png', { type: 'image/png' }),
      companyRoute,
    )).toThrow('المستندات القانونية للشركة يجب أن تكون بصيغة PDF');
    expect(() => validateLegalDocumentFile(
      new File(['pdf'], 'register.pdf', { type: 'application/pdf' }),
      companyRoute,
    )).not.toThrow();
  });
});
