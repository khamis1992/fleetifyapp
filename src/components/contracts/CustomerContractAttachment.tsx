import { useState } from 'react';
import { FileCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCreateContractDocument, type ContractDocument } from '@/hooks/useContractDocuments';

/** Copy customer-owned evidence into this contract through the normal reviewed upload. */
export function CustomerContractAttachment({ document, contractId, documents, onAttached, disabled = false, buttonLabel = 'إرفاق بالعقد للمطابقة' }: {
  document: ContractDocument; contractId: string; documents: ContractDocument[];
  onAttached?: (copy: ContractDocument) => void;
  buttonLabel?: string;
  disabled?: boolean;
}) {
  const createDocument = useCreateContractDocument();
  const [busy, setBusy] = useState(false);
  const [attached, setAttached] = useState(false);
  const [error, setError] = useState('');
  if (document.sourceType !== 'customer' || !document.file_path
    || !['signed_contract', 'signed_contract_image'].includes(document.document_type)) return null;

  const marker = `[customer-document:${document.id}]`;
  const existing = attached || documents.some((copy) => (copy.sourceType || 'contract') === 'contract'
    && copy.contract_id === contractId && copy.notes?.includes(marker)
    && Boolean(copy.file_path) && ['signed_contract', 'signed_contract_image'].includes(copy.document_type));
  const attach = async () => {
    if (busy || existing || disabled) return;
    setBusy(true); setError('');
    try {
      const { data: blob, error: downloadError } = await supabase.storage.from('documents').download(document.file_path!);
      if (downloadError || !blob) throw new Error('تعذر تحميل مستند العميل؛ حاول مجددًا');
      const file = new File([blob], document.document_name, { type: blob.type || document.mime_type || 'application/pdf' });
      // This existing mutation opens the page review before uploading, verifies
      // identity on the server and refreshes the lawsuit's evidence readers.
      const copy = await createDocument.mutateAsync({
        contract_id: contractId, document_type: 'signed_contract', document_name: document.document_name,
        file, is_required: true, notes: `نسخة من مستند العميل لمراجعتها لهذا العقد. ${marker}`,
      });
      setAttached(true);
      if (onAttached) {
        if (copy.contract_id !== contractId || copy.company_id !== document.company_id || !copy.file_path) {
          throw new Error('حُفظت النسخة، لكن تعذر فتح المطابقة. حدّث قائمة المستندات وافتح النسخة المرتبطة بالعقد.');
        }
        onAttached({ ...copy, contract_id: copy.contract_id, sourceType: 'contract', sourceBucket: 'contract-documents' });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إرفاق النسخة بالعقد');
    } finally { setBusy(false); }
  };

  return <div className="w-full rounded-lg border border-sky-100 bg-sky-50 p-2 text-xs text-sky-900">
    <p className="mb-2">هذه النسخة محفوظة في ملف العميل. أرفقها بهذا العقد لمراجعة مطابقتها للدعوى.</p>
    <Button type="button" size="sm" variant="outline" disabled={busy || existing || disabled} className="gap-1 border-sky-200 bg-white"
      onClick={(event) => { event.stopPropagation(); void attach(); }}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
      {busy ? 'جارٍ مراجعة النسخة وإرفاقها…' : existing ? 'أُرفقت نسخة بهذا العقد' : buttonLabel}
    </Button>
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
  </div>;
}
