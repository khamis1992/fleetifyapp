import type { LegalDocumentType } from '@/services/LawsuitService';
import type { DocumentsState } from '../store/types';

export type UploadableDocumentId =
  | 'contract'
  | 'violationsEvidence'
  | 'commercialRegister'
  | 'ibanCertificate'
  | 'representativeId';

export type LegalDocumentUploadRoute =
  | {
      destination: 'contract';
      bucket: 'contract-documents';
      documentType: 'signed_contract' | 'violations_proof';
      scopeLabel: string;
    }
  | {
      destination: 'company';
      bucket: 'legal-documents';
      documentType: LegalDocumentType;
      scopeLabel: string;
    };

export const LEGAL_DOCUMENT_UPLOAD_ROUTES: Record<UploadableDocumentId, LegalDocumentUploadRoute> = {
  contract: {
    destination: 'contract',
    bucket: 'contract-documents',
    documentType: 'signed_contract',
    scopeLabel: 'يُحفظ ضمن مستندات هذا العقد',
  },
  violationsEvidence: {
    destination: 'contract',
    bucket: 'contract-documents',
    documentType: 'violations_proof',
    scopeLabel: 'يُحفظ كإثبات مخالفات لهذا العقد',
  },
  commercialRegister: {
    destination: 'company',
    bucket: 'legal-documents',
    documentType: 'commercial_register',
    scopeLabel: 'يُحفظ في المستندات القانونية للشركة',
  },
  ibanCertificate: {
    destination: 'company',
    bucket: 'legal-documents',
    documentType: 'iban_certificate',
    scopeLabel: 'يُحفظ في المستندات القانونية للشركة',
  },
  representativeId: {
    destination: 'company',
    bucket: 'legal-documents',
    documentType: 'representative_id',
    scopeLabel: 'يُحفظ في المستندات القانونية للشركة',
  },
};

const MAX_CONTRACT_DOCUMENT_SIZE_BYTES = 100 * 1024 * 1024;
const MAX_COMPANY_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp']);

export function isUploadableDocumentId(docId: keyof DocumentsState): docId is UploadableDocumentId {
  return docId in LEGAL_DOCUMENT_UPLOAD_ROUTES;
}

export function getLegalDocumentUploadRoute(
  docId: keyof DocumentsState,
): LegalDocumentUploadRoute | null {
  return isUploadableDocumentId(docId) ? LEGAL_DOCUMENT_UPLOAD_ROUTES[docId] : null;
}

export function validateLegalDocumentFile(
  file: File,
  route?: LegalDocumentUploadRoute | null,
): void {
  if (file.size <= 0) throw new Error('الملف المحدد فارغ');

  const extension = file.name.split('.').pop()?.toLocaleLowerCase() || '';
  if (route?.destination === 'company') {
    if (file.size > MAX_COMPANY_DOCUMENT_SIZE_BYTES) {
      throw new Error('حجم مستند الشركة يتجاوز الحد الأقصى المسموح وهو 50 ميجابايت');
    }
    if (file.type !== 'application/pdf' && extension !== 'pdf') {
      throw new Error('المستندات القانونية للشركة يجب أن تكون بصيغة PDF');
    }
    return;
  }

  if (file.size > MAX_CONTRACT_DOCUMENT_SIZE_BYTES) {
    throw new Error('حجم الملف يتجاوز الحد الأقصى المسموح وهو 100 ميجابايت');
  }
  if (!ALLOWED_MIME_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error('نوع الملف غير مدعوم. استخدم PDF أو Word أو صورة');
  }
}

export function sanitizeLegalDocumentFileName(fileName: string): string {
  const sanitized = fileName
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}._-]+/gu, '_')
    .replace(/^[_\.]+|[_\.]+$/g, '');
  return sanitized || 'document';
}

export function buildContractDocumentStoragePath(input: {
  companyId: string;
  contractId: string;
  documentType: 'signed_contract' | 'violations_proof';
  fileName: string;
  uniqueId?: string;
}): string {
  const uniqueId = input.uniqueId || crypto.randomUUID();
  return [
    input.companyId,
    input.contractId,
    input.documentType,
    `${Date.now()}-${uniqueId}-${sanitizeLegalDocumentFileName(input.fileName)}`,
  ].join('/');
}
