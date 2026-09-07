import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { financialIntegrityQueryOptions, financialIssueLabels, requestFinancialReconciliation } from '@/services/contractFinancialIntegrity';
import { useToast } from '@/hooks/use-toast';
import { useFinanceAccessGuard } from '@/hooks/finance/useFinanceAccessGuard';
import { ContractNoClaimClosureDialog } from './ContractNoClaimClosureDialog';

export function ContractFinancialIntegrityPanel({ companyId, contractId, formatCurrency }: {
  companyId: string; contractId: string; formatCurrency: (amount: number) => string;
}) {
  const query = useQuery(financialIntegrityQueryOptions(companyId, contractId));
  const client = useQueryClient();
  const { toast } = useToast();
  const [requesting, setRequesting] = useState(false);
  const [closing, setClosing] = useState(false);
  const access = useFinanceAccessGuard();
  const state = query.data;
  const pending = state?.reconciliation?.status === 'pending';
  const review = Boolean(state?.header_mismatch || state?.issues.length);
  const request = async () => {
    setRequesting(true);
    try {
      await requestFinancialReconciliation(companyId, contractId);
      await client.invalidateQueries({ queryKey: ['contract-financial-integrity', contractId, companyId] });
      toast({ title: 'سُجل طلب المطابقة', description: 'ستظهر نتيجة الفحص هنا بعد اكتمال المعالجة والتحقق.' });
    } catch (error) {
      toast({ title: 'تعذر طلب المطابقة', description: error instanceof Error ? error.message : 'أعد تحميل الحالة.', variant: 'destructive' });
    } finally { setRequesting(false); }
  };
  const counts = state?.issues.reduce<Record<string, number>>((result, issue) => ({ ...result, [issue.code]: (result[issue.code] || 0) + 1 }), {}) || {};
  return <section dir="rtl" aria-label="المطابقة المالية" className={`rounded-2xl border p-4 ${review || query.isError ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-teal-200 bg-teal-50 text-teal-950'}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 font-bold">
        {query.isPending || pending ? <Loader2 className="h-4 w-4 animate-spin" /> : review || query.isError ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        {query.isError ? 'تعذر التحقق من المطابقة المالية' : query.isPending ? 'جارٍ فحص المطابقة المالية' : pending ? 'المطابقة قيد المعالجة' : review ? 'المطابقة المالية تحتاج مراجعة' : 'الأرصدة والروابط المفحوصة متطابقة'}
      </div>
      <div className="flex flex-wrap gap-2">
      {state && state.review_amount > 0 && ['cancelled', 'canceled'].includes(state.contract_status.toLowerCase()) && !access.isLoading && access.can('finance.invoice.cancel') &&
        <Button size="sm" className="bg-teal-700 text-white hover:bg-teal-800" onClick={() => setClosing(true)} disabled={query.isError || pending}>إقفال الأقساط الملغاة</Button>}
      <Button variant="outline" size="sm" className="border-current bg-white text-slate-900" disabled={requesting || pending || !state} onClick={request}>
        {requesting ? 'جارٍ تسجيل الطلب…' : 'طلب مطابقة مالية'}
      </Button>
      </div>
    </div>
    {query.isError && <p className="mt-2 text-sm">لم تُعتمد سلامة البيانات. أعد تحميل الصفحة للتحقق من خدمة المطابقة.</p>}
    {state && <div className="mt-3 space-y-2 text-sm leading-6">
      <p>المسدد من سجل الدفعات: <strong>{formatCurrency(state.canonical_paid)}</strong> · الفواتير المفتوحة: <strong>{formatCurrency(state.outstanding)}</strong></p>
      {state.header_mismatch && <p>المسدد المخزن {formatCurrency(state.stored_paid || 0)}؛ الفرق {formatCurrency((state.stored_paid || 0) - state.canonical_paid)}. تحتاج القيمة المخزنة إعادة احتساب.</p>}
      {Object.keys(counts).length > 0 && <ul className="list-inside list-disc">{Object.entries(counts).map(([code, count]) => <li key={code}>{financialIssueLabels[code] || 'حالة مالية تحتاج مراجعة'}: {count}</li>)}</ul>}
      {state.review_amount > 0 && <p>قيمة الأقساط تحت المراجعة: <strong>{formatCurrency(state.review_amount)}</strong>. إعادة الفوترة موقوفة لهذه الأقساط حتى حسم مصدر الاستحقاق أو قرار الإلغاء.</p>}
      {state.reconciliation?.status === 'failed' && <p>تعذرت المعالجة بعد المحاولات المحددة. لم تُسجّل النتيجة كإصلاح ناجح.</p>}
      {state.reconciliation?.checked_at && <p className="text-xs opacity-80">آخر فحص: {new Date(state.reconciliation.checked_at).toLocaleString('ar-QA', { timeZone: 'Asia/Qatar' })}</p>}
    </div>}
    {closing && <ContractNoClaimClosureDialog key={`${companyId}:${contractId}`} companyId={companyId} contractId={contractId} formatCurrency={formatCurrency} onClose={() => setClosing(false)} />}
  </section>;
}
