import { supabase } from '@/integrations/supabase/client';

export interface IdentityReviewPreview {
  revision: string;
  document_name: string;
  file_path: string;
  mime_type: string | null;
  contract_number: string;
  customer_name: string;
  national_id: string | null;
  status: string;
  extracted_name: string | null;
  extracted_id: string | null;
  previous_reason: string | null;
}

export async function reviewContractDocumentIdentity(
  document: { company_id: string; contract_id: string; id: string },
  approval?: { revision: string; observedId: string; reason: string; confirmed: boolean },
): Promise<IdentityReviewPreview | { status: 'matched'; review_id: string; replayed: boolean }> {
  const { data, error } = await supabase.rpc('review_contract_document_identity_v1', {
    p_company_id: document.company_id, p_contract_id: document.contract_id, p_document_id: document.id,
    ...(approval ? { p_revision: approval.revision, p_observed_id: approval.observedId, p_reason: approval.reason, p_confirmed: approval.confirmed } : {}),
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || (approval ? data.status !== 'matched' : typeof data.revision !== 'string')) {
    throw new Error('لم يكتمل تأكيد المطابقة من الخادم. حدّث البيانات وحاول مجددًا.');
  }
  return data as unknown as IdentityReviewPreview | { status: 'matched'; review_id: string; replayed: boolean };
}
