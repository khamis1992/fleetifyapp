import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { closeNoClaimClosure, previewNoClaimClosure, closeScheduleClosure, previewScheduleClosure } from '@/services/contractFinancialIntegrity';
import { useToast } from '@/hooks/use-toast';

type ClosureResult = Awaited<ReturnType<typeof closeNoClaimClosure>> | Awaited<ReturnType<typeof closeScheduleClosure>>;

export function ContractNoClaimClosureDialog({ companyId, contractId, formatCurrency, onClose }: {
  companyId: string; contractId: string; formatCurrency: (amount: number) => string; onClose: () => void;
}) {
  const client = useQueryClient();
  const { toast } = useToast();
  const [mode, setMode] = useState<'no_claim' | 'preserve_claims'>('no_claim');
  const preservingClaims = mode === 'preserve_claims';
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const preview = useQuery({
    queryKey: ['contract-no-claim-preview', companyId, contractId, mode],
    queryFn: () => preservingClaims ? previewScheduleClosure(companyId, contractId) : previewNoClaimClosure(companyId, contractId),
    staleTime: 0, retry: false, refetchOnWindowFocus: false,
  });
  useEffect(() => { setConfirmed(false); }, [preview.data?.revision]);
  const save = useMutation<ClosureResult, Error, void>({
    mutationFn: () => {
      if (!preview.data?.eligible || preview.isFetching || preview.isError || !confirmed || reason.trim().length < 10) {
        throw new Error('راجع المعاينة وأدخل سبب الإقفال وأكّد القرار المعروض.');
      }
      const approve = preservingClaims ? closeScheduleClosure : closeNoClaimClosure;
      return approve({ companyId, contractId, revision: preview.data.revision, requestId, reason });
    },
    onSuccess: async (result) => {
      await Promise.all([
        ['contract-financial-integrity', contractId, companyId], ['payment-schedules'],
        ['contracts'], ['contract', contractId], ['contract-invoices', contractId],
        ['delinquent-customers'], ['contract-no-claim-preview', companyId, contractId],
      ].map(queryKey => client.invalidateQueries({ queryKey })));
      toast({ title: result.replayed ? 'سبق اعتماد هذا الإقفال' : preservingClaims ? 'تم إقفال الأقساط مع إبقاء المطالبات' : 'تم إقفال الأقساط بلا مطالبات',
        description: `أُقفل ${result.closed_count} قسطًا مع حفظ المسدد ${formatCurrency(result.canonical_paid)}.${result.closure_mode === 'preserve_claims' ? ` بقي رصيد الفواتير ${formatCurrency(result.retained_invoice_amount)} والمخالفات ${formatCurrency(result.retained_penalty_amount)}.` : ''}` });
      onClose();
    },
  });
  const refresh = () => {
    setConfirmed(false);
    setRequestId(crypto.randomUUID());
    save.reset();
    void preview.refetch();
  };
  const state = preview.data;
  const changeMode = (next: typeof mode) => {
    if (next === mode || save.isPending) return;
    setConfirmed(false);
    setRequestId(crypto.randomUUID());
    save.reset();
    setMode(next);
  };
  const canSave = state?.eligible && !preview.isFetching && !preview.isError && confirmed && reason.trim().length >= 10 && !save.isPending;

  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose(); }}>
    <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" onEscapeKeyDown={event => { if (save.isPending) event.preventDefault(); }}>
      <DialogHeader className="text-right sm:text-right">
        <DialogTitle className="flex items-center gap-2 pl-8"><ShieldCheck className="h-5 w-5 text-teal-700" />إقفال الأقساط الملغاة</DialogTitle>
        <DialogDescription>اعتماد أن الأقساط المعروضة غير مستحقة بعد إلغاء العقد، مع حفظ الفواتير والدفعات وسجل القرار.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2 sm:grid-cols-2" aria-label="نوع قرار الإقفال">
        <Button variant={preservingClaims ? 'outline' : 'default'} aria-pressed={!preservingClaims} disabled={save.isPending} onClick={() => changeMode('no_claim')}>إقفال بلا مطالبات</Button>
        <Button variant={preservingClaims ? 'default' : 'outline'} className="h-auto whitespace-normal py-2" aria-pressed={preservingClaims} disabled={save.isPending} onClick={() => changeMode('preserve_claims')}>إقفال الأقساط مع إبقاء المطالبات</Button>
      </div>
      {preview.isFetching && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />جارٍ فحص بيانات العقد الحالية…</p>}
      {preview.isError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{preview.error.message}</p>}
      {state && !preview.isError && <div className="space-y-4">
        <p className="font-semibold">العقد <bdi>{state.contract_number}</bdi></p>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-600">الأقساط المشمولة</p><p className="mt-1 font-bold">{state.schedule_count}</p></div>
          <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs text-amber-800">قيمة الأقساط</p><p className="mt-1 font-bold text-amber-950">{formatCurrency(state.review_amount)}</p></div>
          <div className="rounded-xl bg-teal-50 p-3"><p className="text-xs text-teal-800">المسدد المحفوظ</p><p className="mt-1 font-bold text-teal-950">{formatCurrency(state.canonical_paid)}</p></div>
        </div>
        {preservingClaims && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950" aria-label="المطالبات الباقية بعد الإقفال">
          <p className="font-semibold">المطالبات الباقية بعد الإقفال</p>
          <p className="mt-1">رصيد الفواتير: <strong>{formatCurrency(state.outstanding)}</strong> · المخالفات غير المسددة: <strong>{formatCurrency(state.open_penalty_amount)}</strong></p>
          <p className="mt-1">يُقفل فقط جدول الأقساط المعروض. تبقى الفواتير المفتوحة والمخالفات والمدفوعات محفوظة، ولا يُعتمد إخلاء ذمة للعقد.</p>
        </div>}
        {!state.eligible && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-semibold">لا يمكن اعتماد الإقفال الآن</p>
          <ul className="mt-1 list-inside list-disc space-y-1">{state.blockers.map(message => <li key={message}>{message}</li>)}</ul>
        </div>}
        {state.schedules.length > 0 && <div className="max-h-52 overflow-auto rounded-xl border">
          <table className="w-full text-right text-sm">
            <caption className="sr-only">الأقساط والفواتير المشمولة بالإقفال</caption>
            <thead className="sticky top-0 bg-slate-100"><tr><th className="p-2">الشهر</th><th className="p-2">الفاتورة الملغاة</th><th className="p-2">المبلغ</th></tr></thead>
            <tbody>{state.schedules.map(row => <tr key={row.id} className="border-t"><td className="whitespace-nowrap p-2">{new Date(`${row.due_date}T12:00:00Z`).toLocaleDateString('ar-QA', { month: 'long', year: 'numeric' })}</td><td className="p-2"><bdi>{row.invoice_number || 'تحتاج مراجعة المصدر'}</bdi></td><td className="whitespace-nowrap p-2">{formatCurrency(row.amount)}</td></tr>)}</tbody>
          </table>
        </div>}
        {state.eligible && <>
          <div className="space-y-2"><Label htmlFor="no-claim-reason">سبب الإقفال</Label><Textarea id="no-claim-reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} disabled={save.isPending} placeholder="وضح سبب عدم استحقاق الأقساط بعد إلغاء العقد…" /><p className="text-xs text-slate-500">10 أحرف على الأقل. يُحفظ السبب واسم المعتمد في سجل القرار.</p></div>
          <label className="flex items-start gap-3 rounded-xl border p-3 text-sm leading-6"><Checkbox checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} disabled={save.isPending} className="mt-1" /><span>{preservingClaims ? 'أؤكد إقفال الأقساط المعروضة المرتبطة بفواتير ملغاة ومنع إعادة توليدها، مع إبقاء جميع المطالبات الأخرى والمسددات دون إسقاط أو إخلاء ذمة.' : 'أؤكد أن العقد ملغي ولا توجد عليه مطالبات حالية، وأن الأقساط المعروضة غير مستحقة. أفهم أن الإقفال يمنع إعادة توليدها تلقائيًا.'}</span></label>
        </>}
      </div>}
      {save.isError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{save.error.message}</p>}
      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button className="bg-teal-700 text-white hover:bg-teal-800" disabled={!canSave} onClick={() => save.mutate()}>{save.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}{preservingClaims ? 'اعتماد إقفال الأقساط مع إبقاء المطالبات' : 'اعتماد الإقفال بلا مطالبات'}</Button>
        <Button variant="outline" onClick={refresh} disabled={save.isPending || preview.isFetching}>تحديث المعاينة</Button>
        <Button variant="ghost" onClick={onClose} disabled={save.isPending}>رجوع</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
