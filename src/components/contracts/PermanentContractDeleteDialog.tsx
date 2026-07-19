import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  Loader2,
  Scale,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { canPermanentlyDeleteContract } from '@/components/contracts/contractDeletionEligibility';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useToast } from '@/hooks/use-toast-mock';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type DeletableContract = {
  id: string;
  contract_number: string;
  status?: string | null;
};

type RelatedDataSummary = {
  invoices: number;
  payments: number;
  schedules: number;
  documents: number;
  legalCases: number;
  violations: number;
  violationAmount: number;
  unpaidViolationAmount: number;
};

type DeletionResult = {
  contract_number?: string;
  violation_count?: number;
  liability_amount?: number;
  liability_journal_entry_id?: string | null;
  cancelled_invoice_count?: number;
  cancelled_payment_count?: number;
};

type RpcError = {
  code?: string;
  message?: string;
};

const isRpcAuthenticationError = (error: RpcError | null) => {
  if (error?.code !== '42501') return false;

  const message = error.message?.toLowerCase() || '';
  return message.includes('authentication is required')
    || message.includes('permission denied for function');
};

interface PermanentContractDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: DeletableContract | null;
  companyId: string | null | undefined;
  onDeleted: (result: DeletionResult) => void | Promise<void>;
  onReviewViolations?: (contract: DeletableContract) => void;
}

const emptySummary: RelatedDataSummary = {
  invoices: 0,
  payments: 0,
  schedules: 0,
  documents: 0,
  legalCases: 0,
  violations: 0,
  violationAmount: 0,
  unpaidViolationAmount: 0,
};

export function PermanentContractDeleteDialog({
  open,
  onOpenChange,
  contract,
  companyId,
  onDeleted,
  onReviewViolations,
}: PermanentContractDeleteDialogProps) {
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrencyFormatter();
  const { toast } = useToast();
  const [summary, setSummary] = useState<RelatedDataSummary | null>(null);
  const [inspectionError, setInspectionError] = useState('');
  const [deletionError, setDeletionError] = useState('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [violationResolution, setViolationResolution] = useState<'company' | 'review' | ''>('');
  const [financialResolution, setFinancialResolution] = useState<'reverse_and_cancel' | ''>('');
  const [validationAttempted, setValidationAttempted] = useState(false);

  const inspectRelatedData = useCallback(async () => {
    if (!contract?.id || !companyId) return;

    setIsInspecting(true);
    setInspectionError('');
    setSummary(null);
    try {
      const [invoicesRes, paymentsRes, schedulesRes, documentsRes, legalCasesRes, violationsRes] = await Promise.all([
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('contract_id', contract.id).eq('company_id', companyId),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('contract_id', contract.id).eq('company_id', companyId),
        supabase.from('contract_payment_schedules').select('id', { count: 'exact', head: true }).eq('contract_id', contract.id).eq('company_id', companyId),
        supabase.from('contract_documents').select('id', { count: 'exact', head: true }).eq('contract_id', contract.id).eq('company_id', companyId),
        supabase.from('legal_cases').select('id', { count: 'exact', head: true }).eq('contract_id', contract.id).eq('company_id', companyId),
        supabase.from('traffic_violations').select('id, fine_amount, status').eq('contract_id', contract.id).eq('company_id', companyId),
      ]);

      const relatedError = [invoicesRes, paymentsRes, schedulesRes, documentsRes, legalCasesRes, violationsRes]
        .find((result) => result.error)?.error;
      if (relatedError) throw relatedError;

      const activeViolations = (violationsRes.data || []).filter((violation) => violation.status !== 'cancelled');
      const violationIds = activeViolations.map((violation) => violation.id);
      const completedPaymentsRes = violationIds.length > 0
        ? await supabase
            .from('traffic_violation_payments')
            .select('traffic_violation_id, amount')
            .eq('company_id', companyId)
            .eq('status', 'completed')
            .in('traffic_violation_id', violationIds)
        : { data: [], error: null };
      if (completedPaymentsRes.error) throw completedPaymentsRes.error;

      const paidByViolation = (completedPaymentsRes.data || []).reduce<Record<string, number>>((totals, payment) => {
        totals[payment.traffic_violation_id] = (totals[payment.traffic_violation_id] || 0) + Number(payment.amount || 0);
        return totals;
      }, {});

      const violationAmount = activeViolations.reduce(
        (total, violation) => total + Number(violation.fine_amount || 0),
        0
      );
      const unpaidViolationAmount = activeViolations.reduce(
        (total, violation) => total + Math.max(Number(violation.fine_amount || 0) - (paidByViolation[violation.id] || 0), 0),
        0
      );

      setSummary({
        invoices: invoicesRes.count || 0,
        payments: paymentsRes.count || 0,
        schedules: schedulesRes.count || 0,
        documents: documentsRes.count || 0,
        legalCases: legalCasesRes.count || 0,
        violations: activeViolations.length,
        violationAmount,
        unpaidViolationAmount,
      });
    } catch (error) {
      console.error('[PermanentContractDeleteDialog] related data inspection failed:', error);
      setInspectionError('تعذر التحقق من ارتباطات العقد. أعد المحاولة قبل تنفيذ الحذف.');
    } finally {
      setIsInspecting(false);
    }
  }, [companyId, contract?.id]);

  useEffect(() => {
    if (!open) return;
    setDeleteReason('');
    setDeleteConfirmation('');
    setViolationResolution('');
    setFinancialResolution('');
    setValidationAttempted(false);
    setDeletionError('');
    void inspectRelatedData();
  }, [open, inspectRelatedData]);

  const hasFinancialRecords = Boolean((summary?.invoices || 0) > 0 || (summary?.payments || 0) > 0);
  const canDelete = Boolean(
    contract &&
    summary &&
    !inspectionError &&
    (!hasFinancialRecords || financialResolution === 'reverse_and_cancel') &&
    deleteReason.trim().length >= 5 &&
    deleteConfirmation.trim() === contract.contract_number &&
    ((summary.violations || 0) === 0 || violationResolution === 'company')
  );
  const deletionRequirements = [
    ...(hasFinancialRecords
      ? [{ label: 'الموافقة على إلغاء الفواتير والدفعات بقيود عكسية', complete: financialResolution === 'reverse_and_cancel' }]
      : []),
    ...((summary?.violations || 0) > 0
      ? [{ label: 'اختيار تحويل المخالفات إلى الشركة', complete: violationResolution === 'company' }]
      : []),
    { label: 'كتابة سبب واضح للحذف (5 أحرف على الأقل)', complete: deleteReason.trim().length >= 5 },
    { label: `كتابة رقم العقد ${contract?.contract_number || ''} كما هو`, complete: deleteConfirmation.trim() === contract?.contract_number },
  ];
  const missingRequirements = deletionRequirements.filter((requirement) => !requirement.complete);

  const executeDeletion = async () => {
    if (!contract || !companyId) return;
    if (!canDelete) {
      setValidationAttempted(true);
      toast({
        title: 'أكمل متطلبات الحذف',
        description: missingRequirements.length > 0
          ? missingRequirements.map((requirement) => requirement.label).join('، ')
          : 'تعذر التحقق من جاهزية العقد للحذف.',
        variant: 'destructive',
      });
      return;
    }
    if (!canPermanentlyDeleteContract(contract.status)) {
      toast({
        title: 'الحذف غير مسموح',
        description: 'يجب إنهاء العقد أو إلغاؤه قبل الحذف النهائي.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    setDeletionError('');
    try {
      const getAuthenticatedSession = async (forceRefresh = false) => {
        if (forceRefresh) {
          const { data, error } = await supabase.auth.refreshSession();
          if (error || !data.session) {
            throw new Error('انتهت جلسة تسجيل الدخول. سجّل الدخول مرة أخرى ثم أعد المحاولة.');
          }
          return data.session;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          throw new Error('انتهت جلسة تسجيل الدخول. سجّل الدخول مرة أخرى ثم أعد المحاولة.');
        }

        const expiresSoon = (data.session.expires_at || 0) <= Math.floor(Date.now() / 1000) + 60;
        if (expiresSoon) return getAuthenticatedSession(true);
        return data.session;
      };

      let session = await getAuthenticatedSession();
      const runDeletion = (actorId: string) => supabase.rpc('delete_contract_with_financial_reversals_v2', {
        p_company_id: companyId,
        p_contract_id: contract.id,
        p_reason: deleteReason.trim(),
        p_violation_resolution: 'company',
        p_financial_resolution: hasFinancialRecords ? 'reverse_and_cancel' : 'none',
        p_actor_id: actorId,
      });

      let { data, error } = await runDeletion(session.user.id);
      if (isRpcAuthenticationError(error)) {
        session = await getAuthenticatedSession(true);
        ({ data, error } = await runDeletion(session.user.id));
      }
      if (error || !data) throw error || new Error('لم يُحذف العقد؛ ربما تغيرت حالته أثناء العملية.');

      const result = data as DeletionResult;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contracts'] }),
        queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
        queryClient.invalidateQueries({ queryKey: ['traffic-violations'] }),
        queryClient.invalidateQueries({ queryKey: ['journal-entries'] }),
        queryClient.invalidateQueries({ queryKey: ['financial-reports'] }),
      ]);

      const completionMessages: string[] = [];
      if ((result.cancelled_payment_count || 0) > 0 || (result.cancelled_invoice_count || 0) > 0) {
        completionMessages.push(
          `تم إلغاء ${result.cancelled_payment_count || 0} دفعة و${result.cancelled_invoice_count || 0} فاتورة بقيود عكسية.`
        );
      }
      if ((result.violation_count || 0) > 0) {
        completionMessages.push(
          `تم نقل ${result.violation_count} مخالفة إلى الشركة وإثبات التزام بقيمة ${formatCurrency(Number(result.liability_amount || 0))}.`
        );
      }

      toast({
        title: 'تم حذف العقد نهائيًا',
        description: completionMessages.length > 0
          ? completionMessages.join(' ')
          : `تم حذف العقد #${result.contract_number || contract.contract_number} وحفظ سجل التدقيق.`,
      });
      onOpenChange(false);
      await onDeleted(result);
    } catch (error) {
      console.error('[PermanentContractDeleteDialog] deletion failed:', error);
      const errorDetails = error as RpcError | null;
      const message = errorDetails?.code === 'PGRST202'
        ? 'خدمة الحذف غير متاحة في قاعدة البيانات. أعد تحميل الصفحة ثم حاول مرة أخرى.'
        : isRpcAuthenticationError(errorDetails)
          ? 'انتهت جلسة تسجيل الدخول. سجّل الدخول مرة أخرى ثم أعد المحاولة.'
          : errorDetails?.code === '42501'
            ? 'الحذف النهائي متاح فقط لمدير الشركة أو مدير النظام.'
        : errorDetails?.message || (error instanceof Error ? error.message : 'حدث خطأ أثناء الحذف النهائي.');
      setDeletionError(message);
      toast({ title: 'تعذر حذف العقد', description: message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const displayedSummary = summary || emptySummary;

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !isDeleting && onOpenChange(nextOpen)}>
      <AlertDialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-[8px]" dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-rose-700">
            <Trash2 className="h-5 w-5" />
            حذف العقد نهائيًا
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-right text-sm text-[#64748B]">
              <Alert variant="destructive" className="rounded-[8px]">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="leading-6">
                  سيُحذف العقد <strong dir="ltr">#{contract?.contract_number}</strong> نهائيًا، ولا يمكن التراجع من الواجهة.
                </AlertDescription>
              </Alert>

              {isInspecting ? (
                <div className="flex min-h-28 items-center justify-center gap-2 rounded-[8px] border border-[#DDE5EF] bg-[#F8FAFC] font-bold text-[#475569]">
                  <Loader2 className="h-5 w-5 animate-spin text-[#38BDF8]" />
                  جاري فحص ارتباطات العقد...
                </div>
              ) : inspectionError ? (
                <Alert variant="destructive" className="rounded-[8px]">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="space-y-3">
                    <p>{inspectionError}</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => void inspectRelatedData()}>
                      إعادة الفحص
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      ['الفواتير', displayedSummary.invoices],
                      ['الدفعات', displayedSummary.payments],
                      ['جدول الدفعات', displayedSummary.schedules],
                      ['المستندات', displayedSummary.documents],
                      ['القضايا', displayedSummary.legalCases],
                      ['المخالفات', displayedSummary.violations],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-[8px] border border-[#DDE5EF] bg-[#F8FAFC] p-3">
                        <span className="block text-xs font-bold text-[#64748B]">{label}</span>
                        <strong className="mt-1 block text-lg text-[#142033]">{value}</strong>
                      </div>
                    ))}
                  </div>

                  {hasFinancialRecords && (
                    <div className="space-y-3 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-amber-950">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        <div>
                          <p className="font-black">يجب تسوية السجلات المالية قبل حذف العقد</p>
                          <p className="mt-1 leading-6 text-amber-800">
                            ستُلغى الدفعات أولًا ثم الفواتير، وتُنشأ قيود عكسية بدل تعديل أو حذف القيود المُرحّلة.
                          </p>
                        </div>
                      </div>

                      <label
                        htmlFor="contract-financial-reversal-approval"
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-[8px] border bg-white p-3 transition-colors',
                          financialResolution === 'reverse_and_cancel'
                            ? 'border-emerald-500 ring-2 ring-emerald-200'
                            : 'border-amber-200 hover:border-amber-400'
                        )}
                      >
                        <Checkbox
                          id="contract-financial-reversal-approval"
                          checked={financialResolution === 'reverse_and_cancel'}
                          onCheckedChange={(checked) => setFinancialResolution(checked === true ? 'reverse_and_cancel' : '')}
                          disabled={isDeleting}
                          className="mt-0.5"
                        />
                        <span>
                          <strong className="block">أوافق على إلغاء الفواتير والدفعات بقيود عكسية</strong>
                          <span className="mt-1 block text-xs leading-5 text-amber-800">
                            ستبقى السجلات محفوظة بحالة ملغاة مع سبب الحذف وسجل تدقيق كامل.
                          </span>
                        </span>
                      </label>
                    </div>
                  )}

                  {displayedSummary.violations > 0 ? (
                    <div className="space-y-3 rounded-[8px] border border-sky-200 bg-sky-50 p-4 text-sky-950">
                      <div className="flex items-start gap-3">
                        <Scale className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                        <div>
                          <p className="font-black">يجب تحديد مسؤولية المخالفات قبل الحذف</p>
                          <p className="mt-1 leading-6 text-sky-800">
                            المتبقي غير المسدد <strong>{formatCurrency(displayedSummary.unpaidViolationAmount)}</strong> من أصل{' '}
                            {formatCurrency(displayedSummary.violationAmount)}.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="معالجة مخالفات العقد">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={violationResolution === 'company'}
                          onClick={() => setViolationResolution('company')}
                          className={cn(
                            'min-h-20 rounded-[8px] border p-3 text-right transition-colors',
                            violationResolution === 'company'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-200'
                              : 'border-[#D7E0EA] bg-white text-[#334155] hover:border-emerald-300'
                          )}
                        >
                          <span className="block font-black">تحويلها إلى الشركة</span>
                          <span className="mt-1 block text-xs leading-5 opacity-80">إثبات مصروف والتزام مستحق ثم حذف العقد</span>
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={violationResolution === 'review'}
                          onClick={() => setViolationResolution('review')}
                          className={cn(
                            'min-h-20 rounded-[8px] border p-3 text-right transition-colors',
                            violationResolution === 'review'
                              ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-200'
                              : 'border-[#D7E0EA] bg-white text-[#334155] hover:border-amber-300'
                          )}
                        >
                          <span className="block font-black">مراجعة المخالفات أولًا</span>
                          <span className="mt-1 block text-xs leading-5 opacity-80">فتح العقد لمراجعة المخالفات قبل الحذف</span>
                        </button>
                      </div>

                      {violationResolution === 'company' && (
                        <Alert className="rounded-[8px] border-emerald-200 bg-emerald-50 text-emerald-950">
                          <ShieldCheck className="h-4 w-4" />
                          <AlertDescription className="leading-6">
                            سينشأ قيد: مدين مصروف المخالفات، دائن مخالفات مستحقة الدفع. وعند السداد سيُخفض الالتزام دون تكرار المصروف.
                          </AlertDescription>
                        </Alert>
                      )}

                      {violationResolution === 'review' && contract && onReviewViolations && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-amber-300 bg-white text-amber-900"
                          onClick={() => {
                            onOpenChange(false);
                            onReviewViolations(contract);
                          }}
                        >
                          عرض تفاصيل العقد والمخالفات
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Alert className="rounded-[8px] border-emerald-200 bg-emerald-50 text-emerald-900">
                      <ShieldCheck className="h-4 w-4" />
                      <AlertDescription>لا توجد مخالفات تحتاج إلى نقل مسؤولية.</AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              <div className="space-y-2">
                <label htmlFor="list-contract-delete-reason" className="block font-bold text-[#334155]">سبب الحذف</label>
                <Textarea
                  id="list-contract-delete-reason"
                  value={deleteReason}
                  onChange={(event) => setDeleteReason(event.target.value)}
                  placeholder="اكتب سبب الحذف هنا (مطلوب)"
                  aria-invalid={validationAttempted && deleteReason.trim().length < 5}
                  className={cn(
                    'min-h-20 rounded-[8px] bg-white',
                    validationAttempted && deleteReason.trim().length < 5 && 'border-rose-400 ring-2 ring-rose-100'
                  )}
                  disabled={isDeleting || isInspecting}
                />
                {validationAttempted && deleteReason.trim().length < 5 && (
                  <p className="text-xs font-bold text-rose-600">سبب الحذف مطلوب ويجب ألا يقل عن 5 أحرف.</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="list-contract-delete-confirmation" className="block font-bold text-[#334155]">
                  اكتب رقم العقد <span dir="ltr" className="font-black text-rose-700">{contract?.contract_number}</span> للتأكيد
                </label>
                <Input
                  id="list-contract-delete-confirmation"
                  dir="ltr"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  placeholder={contract?.contract_number}
                  aria-invalid={validationAttempted && deleteConfirmation.trim() !== contract?.contract_number}
                  className={cn(
                    'h-11 rounded-[8px] bg-white text-left font-mono',
                    validationAttempted && deleteConfirmation.trim() !== contract?.contract_number && 'border-rose-400 ring-2 ring-rose-100'
                  )}
                  autoComplete="off"
                  disabled={isDeleting || isInspecting}
                />
              </div>

              {summary && (
                <div className="rounded-[8px] border border-[#DDE5EF] bg-[#F8FAFC] p-3">
                  <p className="mb-2 font-black text-[#334155]">المطلوب لتفعيل الحذف</p>
                  <div className="space-y-2">
                    {deletionRequirements.map((requirement) => (
                      <div
                        key={requirement.label}
                        className={cn(
                          'flex items-center gap-2 rounded-[6px] px-3 py-2 text-xs font-bold',
                          requirement.complete
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-900'
                        )}
                      >
                        {requirement.complete ? (
                          <ShieldCheck className="h-4 w-4 shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 shrink-0" />
                        )}
                        {requirement.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deletionError && (
                <Alert variant="destructive" className="rounded-[8px]">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-bold leading-6">{deletionError}</AlertDescription>
                </Alert>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="rounded-[8px]" disabled={isDeleting}>إلغاء</AlertDialogCancel>
          <Button
            type="button"
            onClick={() => void executeDeletion()}
            disabled={isDeleting || isInspecting || !summary || Boolean(inspectionError)}
            className="rounded-[8px] bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحذف...
              </>
            ) : hasFinancialRecords ? (
              'عكس السجلات المالية وحذف العقد'
            ) : displayedSummary.violations > 0 ? (
              'إثبات الالتزام وحذف العقد'
            ) : (
              'حذف العقد نهائيًا'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
