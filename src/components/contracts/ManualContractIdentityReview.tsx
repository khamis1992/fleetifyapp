import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { invalidateContractDocumentDependents } from '@/utils/contractDocumentQueries';
import type { ContractDocument } from '@/hooks/useContractDocuments';
import { reviewContractDocumentIdentity, type IdentityReviewPreview } from '@/services/manualContractIdentityReview';
import { getManualContractIdentityEligibility } from '@/utils/manualContractIdentityEligibility';

export function ManualContractIdentityReview({ document }: { document: ContractDocument }) {
  const [open, setOpen] = useState(false);
  const eligible = document.sourceType === 'contract'
    && ['signed_contract', 'signed_contract_image'].includes(document.document_type)
    && Boolean(document.file_path);
  if (!eligible) return null;
  const eligibility = getManualContractIdentityEligibility(document);
  if (!eligibility.eligible) return <p className="w-full text-xs leading-6 text-amber-800">{eligibility.reason}</p>;
  return <>
    <Button type="button" size="sm" variant="outline"
      className="gap-1 border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100"
      onClick={(event) => { event.stopPropagation(); setOpen(true); }}>
      <ShieldCheck className="h-4 w-4" />مطابقة يدوية
    </Button>
    {open && <IdentityReviewDialog document={document} onClose={() => setOpen(false)} />}
  </>;
}

export function IdentityReviewDialog({ document, onClose }: { document: ContractDocument; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [observedId, setObservedId] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const preview = useQuery({
    queryKey: ['manual-contract-identity-preview', document.company_id, document.contract_id, document.id],
    queryFn: async () => {
      const data = await reviewContractDocumentIdentity(document) as IdentityReviewPreview;
      const { data: url, error } = await supabase.storage.from('contract-documents').createSignedUrl(data.file_path, 3600);
      if (error || !url?.signedUrl) throw new Error('تعذر فتح مستند العقد للمعاينة. أغلق النافذة وحاول مجددًا.');
      return { ...data, previewUrl: url.signedUrl };
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const approve = useMutation({
    mutationFn: async () => {
      if (!preview.data) throw new Error('انتظر تحميل بيانات المطابقة');
      return reviewContractDocumentIdentity(document, {
        revision: preview.data.revision, observedId, reason: reason.trim(), confirmed,
      });
    },
    onSuccess: async () => {
      await invalidateContractDocumentDependents(queryClient, document.company_id, document.contract_id);
      toast.success('تم اعتماد المطابقة اليدوية وتحديث جاهزية العقد والدعوى');
      onClose();
    },
  });
  const data = preview.data;
  return <Dialog open onOpenChange={(next) => { if (!next && !approve.isPending) onClose(); }}>
    <DialogContent dir="rtl" className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-5xl overflow-y-auto bg-white text-slate-900 dark:bg-white dark:text-slate-900" onClick={(event) => event.stopPropagation()}>
      <DialogHeader className="text-right">
        <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-teal-700" />مطابقة العقد يدويًا</DialogTitle>
        <DialogDescription>افتح المستند وتحقق من المستأجر، ثم أدخل الرقم الشخصي وسبب المراجعة وأكّد المطابقة. سيُحفظ الاعتماد في سجل التدقيق.</DialogDescription>
      </DialogHeader>
      {preview.isPending && <p className="flex items-center gap-2 py-8"><Loader2 className="h-4 w-4 animate-spin" />جارٍ تحميل العقد وبيانات المطابقة…</p>}
      {preview.error && <div className="space-y-3">
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{preview.error.message}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={preview.isFetching} onClick={() => void preview.refetch()}>إعادة المحاولة</Button>
          <Button type="button" variant="outline" onClick={onClose}>العودة إلى النسخ</Button>
        </div>
      </div>}
      {data && <div className="grid gap-5 lg:grid-cols-2">
        <section className="order-2 space-y-3 lg:order-1" aria-label="معاينة العقد الموقع">
          <h3 className="font-semibold">{data.document_name}</h3>
          {data.mime_type?.startsWith('image/')
            ? <img src={data.previewUrl} alt="نسخة العقد للمطابقة اليدوية" className="max-h-[60vh] w-full rounded-xl border object-contain" />
            : <iframe src={data.previewUrl} title="نسخة العقد للمطابقة اليدوية" className="h-[55vh] w-full rounded-xl border" />}
          <a href={data.previewUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-teal-700 underline">فتح المستند بحجم كامل</a>
        </section>
        <form className="order-1 space-y-4 lg:order-2" onSubmit={(event) => { event.preventDefault(); approve.mutate(); }}>
          <a href={data.previewUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800">افتح نسخة العقد للتحقق</a>
          <div className="rounded-xl border bg-slate-50 p-4 text-sm">
            <p>العقد: <strong>{data.contract_number}</strong></p>
            <p className="mt-2">العميل: <strong>{data.customer_name}</strong></p>
            <p className="mt-2">الرقم الشخصي المسجل: <strong dir="ltr">{data.national_id || 'غير مسجل'}</strong></p>
          </div>
          <details className="rounded-xl border p-3 text-sm">
            <summary className="cursor-pointer font-medium">نتيجة القراءة السابقة</summary>
            <p className="mt-2">الاسم المقروء: {data.extracted_name || 'غير متاح'}</p>
            <p>الرقم المقروء: <span dir="ltr">{data.extracted_id || 'غير متاح'}</span></p>
            <p className="mt-2 text-slate-500">{data.previous_reason || 'لم تكتمل المطابقة الآلية.'}</p>
          </details>
          <div className="space-y-2">
            <Label htmlFor="manual-contract-observed-id">الرقم الشخصي كما يظهر في العقد</Label>
            <Input id="manual-contract-observed-id" dir="ltr" inputMode="numeric" autoComplete="off"
              value={observedId} onChange={(event) => setObservedId(event.target.value)} disabled={approve.isPending} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-contract-review-reason">سبب المطابقة اليدوية</Label>
            <Textarea id="manual-contract-review-reason" value={reason} onChange={(event) => setReason(event.target.value)}
              placeholder="وضّح ما راجعته وسبب تصحيح نتيجة المطابقة" minLength={10} maxLength={2000} required disabled={approve.isPending} />
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3">
            <Checkbox id="manual-contract-confirmed" checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} disabled={approve.isPending} />
            <Label htmlFor="manual-contract-confirmed" className="text-sm leading-6">عاينت العقد الموقّع وتحققت أن المستأجر وبيانات العقد يخصان العميل والعقد المعروضين.</Label>
          </div>
          {approve.error && <p role="alert" className="text-sm text-red-700">{approve.error.message}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="gap-2 bg-teal-700 text-white hover:bg-teal-800"
              disabled={approve.isPending || !confirmed || !observedId.trim() || reason.trim().length < 10}>
              {approve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}اعتماد المطابقة اليدوية
            </Button>
            <Button type="button" variant="outline" disabled={approve.isPending} onClick={onClose}>إلغاء</Button>
          </div>
        </form>
      </div>}
    </DialogContent>
  </Dialog>;
}
