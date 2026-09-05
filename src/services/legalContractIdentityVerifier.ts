import { supabase } from '@/integrations/supabase/client';
import { convertAllPagesToImages } from '@/services/contractPDFExtractor';

export type LegalIdentityMatchStatus =
  | 'pending'
  | 'matched'
  | 'mismatch'
  | 'unverified'
  | 'expired_unverified'
  | 'failed';

const LEGAL_IDENTITY_MATCH_STATUSES = new Set<LegalIdentityMatchStatus>([
  'pending',
  'matched',
  'mismatch',
  'unverified',
  'expired_unverified',
  'failed',
]);

export const normalizeLegalIdentityMatchStatus = (
  value: unknown,
): LegalIdentityMatchStatus =>
  typeof value === 'string'
    && LEGAL_IDENTITY_MATCH_STATUSES.has(value as LegalIdentityMatchStatus)
    ? value as LegalIdentityMatchStatus
    : 'unverified';

export interface LegalContractIdentityVerification {
  status: LegalIdentityMatchStatus;
  expectedName: string | null;
  extractedName: string | null;
  expectedId: string | null;
  extractedId: string | null;
  reason: string | null;
  checkedAt: string | null;
}

export interface LegalContractDocumentIdentityRow {
  id: string;
  document_name: string;
  file_path: string | null;
  mime_type: string | null;
  legal_identity_match_status: LegalIdentityMatchStatus;
  legal_identity_expected_name: string | null;
  legal_identity_extracted_name: string | null;
  legal_identity_expected_id: string | null;
  legal_identity_extracted_id: string | null;
  legal_identity_match_reason: string | null;
  legal_identity_checked_at: string | null;
}

export const normalizeLegalContractDocumentIdentityRow = (
  document: Omit<LegalContractDocumentIdentityRow, 'legal_identity_match_status'> & {
    legal_identity_match_status: unknown;
  },
): LegalContractDocumentIdentityRow => ({
  ...document,
  legal_identity_match_status: normalizeLegalIdentityMatchStatus(
    document.legal_identity_match_status,
  ),
});

export const toLegalIdentityVerification = (
  document: LegalContractDocumentIdentityRow,
): LegalContractIdentityVerification => ({
  status: document.legal_identity_match_status,
  expectedName: document.legal_identity_expected_name,
  extractedName: document.legal_identity_extracted_name,
  expectedId: document.legal_identity_expected_id,
  extractedId: document.legal_identity_extracted_id,
  reason: document.legal_identity_match_reason,
  checkedAt: document.legal_identity_checked_at,
});

async function throwEdgeFunctionError(
  error: unknown,
  fallbackMessage: string,
): Promise<never> {
  let detail = '';
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: unknown; message?: unknown };
      detail = String(payload.error || payload.message || '').trim();
    } catch {
      try {
        detail = (await context.clone().text()).trim();
      } catch {
        detail = '';
      }
    }
  }
  if (!detail && error instanceof Error) detail = error.message;
  throw new Error(detail ? `${fallbackMessage}: ${detail}` : fallbackMessage);
}

export async function verifyLegalContractDocumentIdentity(
  companyId: string,
  document: LegalContractDocumentIdentityRow,
) {
  if (document.legal_identity_match_status !== 'pending') return document;
  if (!document.file_path) throw new Error('نسخة العقد لا تحتوي على ملف قابل للفحص');

  if (document.mime_type?.startsWith('image/')) {
    const { error } = await supabase.functions.invoke('contract-id-scanner', {
      body: { mode: 'document', contractDocumentId: document.id },
    });
    if (error) await throwEdgeFunctionError(error, 'تعذر فحص نسخة العقد');
  } else if (document.mime_type === 'application/pdf') {
    const { data: storedOcrResult, error: storedOcrError } = await supabase.functions.invoke(
      'contract-id-scanner',
      {
        body: { mode: 'stored_ocr', contractDocumentId: document.id },
      },
    );
    if (storedOcrError) {
      await throwEdgeFunctionError(storedOcrError, 'تعذر استخدام نتيجة الفحص المحفوظة');
    }

    if (storedOcrResult?.outcome === 'stored_ocr_unavailable') {
      const { data: blob, error: downloadError } = await supabase.storage
        .from('contract-documents')
        .download(document.file_path);
      if (downloadError || !blob) {
        throw downloadError || new Error('تعذر تنزيل نسخة العقد لفحصها');
      }

      const file = new File(
        [blob],
        document.document_name || 'signed-contract.pdf',
        { type: 'application/pdf' },
      );
      const pageImages = await convertAllPagesToImages(file, 2, 10);
      const pages = pageImages.map((imageBase64, index) => ({
        pageNumber: index + 1,
        imageBase64,
      }));
      const { error } = await supabase.functions.invoke('contract-id-scanner', {
        body: {
          mode: 'pages',
          contractDocumentId: document.id,
          pages,
        },
      });
      if (error) await throwEdgeFunctionError(error, 'تعذر فحص صفحات نسخة العقد');
    }
  } else {
    throw new Error('صيغة نسخة العقد لا تدعم فحص الهوية الآلي');
  }

  const { data, error } = await supabase
    .from('contract_documents')
    .select('id, document_name, file_path, mime_type, legal_identity_match_status, legal_identity_expected_name, legal_identity_extracted_name, legal_identity_expected_id, legal_identity_extracted_id, legal_identity_match_reason, legal_identity_checked_at')
    .eq('id', document.id)
    .eq('company_id', companyId)
    .single();
  if (error || !data) throw error || new Error('تعذر قراءة نتيجة فحص نسخة العقد');
  return normalizeLegalContractDocumentIdentityRow(data);
}
