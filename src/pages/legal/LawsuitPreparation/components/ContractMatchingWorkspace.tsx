import { lazy, Suspense, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileCheck, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContractDocuments, type ContractDocument } from '@/hooks/useContractDocuments';
import { CustomerContractAttachment } from '@/components/contracts/CustomerContractAttachment';
import { IdentityReviewDialog } from '@/components/contracts/ManualContractIdentityReview';
import { getContractDocumentReview } from '../utils/contractDocumentSelection';
import { useLawsuitPreparationContext } from '../store';
import { getManualContractIdentityEligibility } from '@/utils/manualContractIdentityEligibility';

const ContractDocuments = lazy(() => import('@/components/contracts/ContractDocuments')
  .then((module) => ({ default: module.ContractDocuments })));

export function ContractMatchingWorkspace({ contractId, customerId, vehicleId }: {
  contractId: string; customerId?: string; vehicleId?: string;
}) {
  const { state } = useLawsuitPreparationContext();
  const queryClient = useQueryClient();
  const documentsQuery = useContractDocuments(contractId, customerId, vehicleId);
  const [selected, setSelected] = useState<ContractDocument | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const companyId = state.companyId;
  // The library's fresh rows determine which action is available. A previous
  // evidence assessment must never offer approval of a deleted/replaced copy.
  const scoped = (documentsQuery.data || []).filter((document) =>
    document.company_id === companyId && document.contract_id === contractId);
  const direct = scoped.filter((document) => document.sourceType === 'contract');
  const review = getContractDocumentReview(direct.map((document) => ({
    ...document, file_path: document.file_path || null, mime_type: document.mime_type || null,
  })));
  const signedCopies = direct.filter((document) => review.copies.some((copy) => copy.id === document.id));
  const customerCopies = scoped.filter((document) => document.sourceType === 'customer'
    && document.sourceOwnerId === customerId && document.file_path
    && ['signed_contract', 'signed_contract_image'].includes(document.document_type)
    && !signedCopies.some((copy) => copy.notes?.includes(`[customer-document:${document.id}]`)));
  const ready = review.kind === 'ready' && state.documents.contract.status === 'ready'
    && signedCopies.some((copy) => copy.id === state.documents.contract.sourceDocumentId
      && copy.legal_identity_match_status === 'matched' && (copy.legal_evidence_state || 'active') === 'active');

  useEffect(() => {
    if (!companyId || !documentsQuery.isSuccess || documentsQuery.isFetching || !documentsQuery.dataUpdatedAt) return;
    // Refresh the separate filing assessment once the current inventory is
    // known, including after a copy was removed in another view.
    void queryClient.invalidateQueries({ queryKey: ['contract-document', contractId, companyId] });
  }, [companyId, contractId, documentsQuery.dataUpdatedAt, documentsQuery.isSuccess, documentsQuery.isFetching, queryClient]);

  const openReview = (copy: ContractDocument) => {
    if (copy.company_id === companyId && copy.contract_id === contractId && copy.sourceType === 'contract'
      && getManualContractIdentityEligibility(copy).eligible) setSelected(copy);
  };

  if (documentsQuery.isPending || !companyId) return <p role="status" className="flex items-center gap-2 p-5">
    <Loader2 className="h-4 w-4 animate-spin" />جارٍ التحقق من النسخ الحالية…
  </p>;
  if (documentsQuery.error && !selected) return <div className="space-y-3 p-5">
    <p role="alert" className="text-sm text-red-800">تعذر تحميل النسخ الحالية. أعد المحاولة لإظهار إجراء الاعتماد الصحيح.</p>
    <Button variant="outline" onClick={() => void documentsQuery.refetch()}><RefreshCw className="h-4 w-4" />إعادة تحميل النسخ</Button>
  </div>;

  return <div className="space-y-4 p-3 sm:p-4">
    {selected && <IdentityReviewDialog document={selected} onClose={() => setSelected(null)} />}
    <div role="status" className={`rounded-xl border p-3 text-sm ${ready
      ? 'border-teal-200 bg-teal-50 text-teal-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      <p className="font-semibold">{documentsQuery.isFetching ? 'جارٍ التحقق من النسخ الحالية…' : ready ? 'نسخة العقد مطابقة وجاهزة في حافظة الدعوى'
        : signedCopies.length ? review.kind === 'ready' ? 'النسخة مطابقة، جارٍ تجهيزها للحافظة' : review.label
          : customerCopies.length ? 'نسخة موجودة في ملف العميل — يلزم إرفاقها بهذا العقد' : review.label}</p>
      {!ready && !documentsQuery.isFetching && <p className="mt-1 leading-6">{customerCopies.length && !signedCopies.length
        ? 'اضغط «إرفاق النسخة ومتابعة الاعتماد». راجع الصفحات واحفظ النسخة، ثم يفتح نموذج المطابقة مباشرة.'
        : signedCopies.length ? 'افتح النسخة أدناه، ثم راجع المستند وأكمل بيانات المطابقة لاعتمادها.'
          : 'ارفع النسخة الموقعة أو راجع تصنيف الملفات من مكتبة المستندات أدناه.'}</p>}
    </div>

    {signedCopies.map((copy) => <section key={copy.id} aria-label={`نسخة العقد: ${copy.document_name}`}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div><p className="text-xs text-slate-500">نسخة مرتبطة بهذا العقد</p><h3 className="mt-1 break-words font-semibold">{copy.document_name}</h3></div>
      {copy.legal_identity_match_reason && <p className="text-sm leading-6 text-slate-600">{copy.legal_identity_match_reason}</p>}
      {!getManualContractIdentityEligibility(copy).eligible
        ? <p className="text-sm text-amber-800">{getManualContractIdentityEligibility(copy).reason}</p>
        : <Button disabled={documentsQuery.isFetching || Boolean(documentsQuery.error)} className="h-auto w-full whitespace-normal bg-teal-700 py-3 text-white hover:bg-teal-800 sm:w-auto"
          onClick={() => openReview(copy)}><FileCheck className="h-4 w-4 shrink-0" />{copy.legal_identity_match_status === 'matched' ? 'مراجعة المطابقة المعتمدة' : 'مراجعة واعتماد هذه النسخة'}</Button>}
    </section>)}

    {customerCopies.map((copy) => <section key={copy.id} aria-label={`نسخة العميل: ${copy.document_name}`}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="break-words font-semibold">{copy.document_name}</h3>
      <CustomerContractAttachment document={copy} contractId={contractId} documents={scoped}
        buttonLabel="إرفاق النسخة ومتابعة الاعتماد" onAttached={openReview} disabled={documentsQuery.isFetching || Boolean(documentsQuery.error)} />
    </section>)}

    <div className="border-t pt-3">
      <Button variant="outline" aria-expanded={libraryOpen} onClick={() => setLibraryOpen((open) => !open)}>
        {libraryOpen ? 'إخفاء مكتبة المستندات' : 'رفع نسخة أو تعديل تصنيف المستندات'}
      </Button>
      {libraryOpen && <Suspense fallback={<p className="p-4 text-sm">جارٍ تحميل مكتبة المستندات…</p>}>
        <ContractDocuments contractId={contractId} customerId={customerId} vehicleId={vehicleId} />
      </Suspense>}
    </div>
  </div>;
}
