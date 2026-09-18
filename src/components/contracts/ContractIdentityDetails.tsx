import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, ScanSearch } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ContractDocument } from '@/hooks/useContractDocuments';
import { ContractIdentityBadge } from './ContractIdentityBadge';
import { normalizeLegalContractDocumentIdentityRow, verifyLegalContractDocumentIdentity } from '@/services/legalContractIdentityVerifier';
import { invalidateContractDocumentDependents } from '@/utils/contractDocumentQueries';

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const display = (value: unknown) => typeof value === 'string' && value ? value : 'غير متوفر';
const statusLabel = (value: unknown) => value === 'matched' ? 'مطابق' : value === 'mismatch' ? 'تعارض في الهوية' : 'يحتاج مراجعة';

export function ContractIdentityDetails({ document }: { document: ContractDocument }) {
  const [open, setOpen] = useState(false);
  if (document.sourceType !== 'contract' || !['signed_contract', 'signed_contract_image'].includes(document.document_type)) return null;
  return <>
    <button type="button" className="rounded-md text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
      aria-label={`تفاصيل مطابقة الهوية: ${document.document_name}`}
      onClick={(event) => { event.stopPropagation(); setOpen(true); }}>
      <ContractIdentityBadge type={document.document_type} status={document.legal_identity_match_status} reason={document.legal_identity_match_reason} />
      <span className="mr-1 text-[10px] text-teal-700 underline">عرض المقارنة</span>
    </button>
    {open && <IdentityDetailsDialog document={document} onClose={() => setOpen(false)} />}
  </>;
}

function IdentityDetailsDialog({ document, onClose }: { document: ContractDocument; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['contract-identity-details', document.company_id, document.id],
    queryFn: async () => {
      const [row, history] = await Promise.all([
        supabase.from('contract_documents').select('*').eq('id', document.id).eq('company_id', document.company_id).single(),
        supabase.from('contract_identity_assessments').select('id, recorded_at, method, result')
          .eq('document_id', document.id).eq('company_id', document.company_id).order('recorded_at', { ascending: false }).limit(10),
      ]);
      if (row.error) throw row.error;
      if (history.error) throw history.error;
      let previewUrl: string | null = null;
      if (row.data.file_path) {
        const url = await supabase.storage.from('contract-documents').createSignedUrl(row.data.file_path, 1800);
        if (url.error) throw url.error;
        previewUrl = url.data.signedUrl;
      }
      return { row: row.data, history: history.data, previewUrl };
    },
    retry: false, staleTime: 0, gcTime: 0,
  });
  const recheck = useMutation({
    mutationFn: async () => {
      if (!query.data) throw new Error('انتظر تحميل المستند');
      return verifyLegalContractDocumentIdentity(document.company_id, normalizeLegalContractDocumentIdentityRow(query.data.row), { force: true });
    },
    onSuccess: (result) => toast.success(`اكتمل الفحص: ${statusLabel(result.legal_identity_match_status)}`),
    onSettled: async () => {
      await query.refetch();
      await invalidateContractDocumentDependents(queryClient, document.company_id, document.contract_id);
    },
  });
  const row = query.data?.row;
  const details = object(row?.legal_identity_details);
  const raw = object(details.raw);
  const normalized = object(details.normalized);
  const fields = [
    { label: 'اسم العميل', expected: raw.expectedName ?? row?.legal_identity_expected_name, extracted: raw.extractedName ?? row?.legal_identity_extracted_name, normalized: normalized.extractedName, source: object(details.name) },
    { label: 'الرقم الشخصي', expected: raw.expectedId ?? row?.legal_identity_expected_id, extracted: raw.extractedId ?? row?.legal_identity_extracted_id, normalized: normalized.extractedId, source: object(details.identityNumber) },
  ];
  return <Dialog open onOpenChange={(next) => { if (!next && !recheck.isPending) onClose(); }}>
    <DialogContent dir="rtl" className="max-h-[92vh] max-w-6xl overflow-y-auto bg-white" onClick={(event) => event.stopPropagation()}>
      <DialogHeader className="text-right">
        <DialogTitle className="flex items-center gap-2"><ScanSearch className="h-5 w-5 text-teal-700" />تفاصيل مطابقة الهوية</DialogTitle>
        <DialogDescription>قارن بيانات العميل وقت الفحص بالنص المقروء من نسخة العقد. النتيجة المعروضة هي النتيجة المحفوظة في النظام.</DialogDescription>
      </DialogHeader>
      {query.isPending && <p role="status" className="py-8">جارٍ تحميل المقارنة…</p>}
      {query.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">تعذر تحميل التفاصيل: {query.error.message}</p>}
      {row && <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3" aria-label="دليل المستند">
          <h3 className="break-all font-semibold">{row.document_name}</h3>
          {query.data?.previewUrl && (row.mime_type?.startsWith('image/')
            ? <img src={query.data.previewUrl} alt="نسخة العقد للتحقق من الحقول المقروءة" className="max-h-[60vh] w-full rounded-xl border object-contain" />
            : <iframe key={page} src={`${query.data.previewUrl}#page=${page}`} title={`نسخة العقد، الصفحة ${page}`} className="h-[60vh] w-full rounded-xl border" />)}
          {typeof object(details.name).snippet === 'string' && <blockquote className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm">{String(object(details.name).snippet)}</blockquote>}
        </section>
        <section className="space-y-4" aria-label="نتيجة المقارنة">
          <div className="rounded-xl border bg-slate-50 p-4">
            <ContractIdentityBadge type={row.document_type} status={row.legal_identity_match_status} reason={row.legal_identity_match_reason} />
            <p className="mt-2 text-sm leading-6">{row.legal_identity_match_reason || 'لم يُحفظ تفسير لهذه النتيجة القديمة.'}</p>
            <p className="mt-2 text-xs text-slate-500">آخر فحص: {row.legal_identity_checked_at ? new Date(row.legal_identity_checked_at).toLocaleString('ar-QA') : 'لم يُفحص'}</p>
            {!row.legal_identity_engine_version && !row.legal_identity_match_reason?.startsWith('مطابقة يدوية معتمدة:') && <p className="mt-2 text-xs text-amber-800">هذه النتيجة لا تحمل أدلة محرك المطابقة الجديد. يمكن إعادة فحص الملف كاملًا لتحديثها.</p>}
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-right text-sm">
              <caption className="sr-only">القيم المسجلة والمقروءة</caption>
              <thead className="bg-slate-50"><tr><th className="p-3">الحقل</th><th className="p-3">المسجل وقت الفحص</th><th className="p-3">المقروء من الملف</th></tr></thead>
              <tbody>{fields.map((field) => <tr key={field.label} className="border-t align-top">
                <th className="p-3 font-medium">{field.label}</th>
                <td className="p-3" dir="auto">{display(field.expected)}</td>
                <td className="p-3"><span dir="auto">{display(field.extracted)}</span>
                  {field.normalized && field.normalized !== field.extracted ? <p className="mt-1 text-xs text-slate-500">بعد توحيد الكتابة: {display(field.normalized)}</p> : null}
                  {typeof field.source.pageNumber === 'number' && <button className="mt-1 block text-xs text-teal-700 underline" onClick={() => setPage(Number(field.source.pageNumber))}>الصفحة {field.source.pageNumber}</button>}
                </td>
              </tr>)}</tbody>
            </table>
          </div>
          <Button disabled={recheck.isPending || !row.file_path} onClick={() => recheck.mutate()} className="gap-2 bg-teal-700 hover:bg-teal-800">
            {recheck.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {recheck.isPending ? 'جارٍ فحص جميع الصفحات…' : 'إعادة فحص الملف كاملًا'}
          </Button>
          {recheck.error && <p role="alert" className="text-sm text-red-700">{recheck.error.message}</p>}
          <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-medium">سجل نتائج المطابقة</summary>
            <p className="my-2 text-xs text-slate-500">آخر 10 تغييرات محفوظة. السجل يبدأ من تفعيل التحديث.</p>
            {query.data?.history.length === 0 && <p className="text-sm text-slate-500">لا توجد تغييرات مسجلة بعد.</p>}
            {query.data?.history.map((entry) => <div key={entry.id} className="mt-2 border-t pt-2 text-xs">
              <p>{new Date(entry.recorded_at).toLocaleString('ar-QA')} · {entry.method === 'manual' ? 'مراجعة يدوية' : 'تحديث نتيجة'} · {statusLabel(object(entry.result).legal_identity_match_status)}</p>
              <p className="mt-1 text-slate-600">{display(object(entry.result).legal_identity_match_reason)}</p>
            </div>)}
          </details>
        </section>
      </div>}
    </DialogContent>
  </Dialog>;
}
