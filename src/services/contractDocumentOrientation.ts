import { supabase } from '@/integrations/supabase/client';
import type { ContractDocument } from '@/hooks/useContractDocuments';

export interface OrientationInspection {
  revision: string; source_sha256: string; can_save: boolean; file_path: string; document_name: string; file_size: number | null;
  history: { created_at: string; previous_file_path: string; corrected_file_path: string; rotations: number[] }[];
  automatic_check?: { status: string; checked_at: string; corrected_pages: number; review_pages: number[] } | null;
  source_bucket?: 'contract-documents' | 'documents';
  affected_contract_ids?: string[];
}
export interface OrientationSaved { saved: true; request_id: string; file_path: string; replayed: boolean; affected_contract_ids?: string[] }

export async function invokeDocumentOrientation(
  document: Pick<ContractDocument, 'id' | 'company_id' | 'contract_id' | 'sourceType'>,
  save?: { revision: string; sourceSha256: string; requestId: string; rotations: number[] },
): Promise<OrientationInspection | OrientationSaved> {
  const { data, error } = await supabase.functions.invoke('correct-contract-document-orientation', {
    body: { action: save ? 'save' : 'inspect', companyId: document.company_id,
      contractId: document.contract_id, documentId: document.id, sourceType: document.sourceType || 'contract', ...save },
  });
  if (error) {
    let message = error.message;
    if ('context' in error && error.context instanceof Response) {
      try { const body = await error.context.clone().json(); if (typeof body.error === 'string') message = body.error; } catch { /* use transport error */ }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  if (!data || (save ? data.saved !== true || data.request_id !== save.requestId : typeof data.revision !== 'string')) {
    throw new Error('لم يؤكد الخادم اكتمال العملية؛ أعد فتح المستند للتحقق');
  }
  return data;
}
