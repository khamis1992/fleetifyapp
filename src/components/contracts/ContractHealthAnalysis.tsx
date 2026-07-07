import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  CreditCard,
  FileWarning,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Contract } from '@/types/contracts';
import type { Invoice } from '@/types/finance.types';

type ContractPaymentRow = {
  id: string;
  payment_number: string | null;
  payment_date: string | null;
  amount: number | null;
  payment_status: string | null;
  invoice_id: string | null;
};

type HealthSeverity = 'critical' | 'warning' | 'info' | 'good';

type HealthIssue = {
  title: string;
  detail: string;
  severity: HealthSeverity;
  count?: number;
};

type ContractHealthResult = {
  score: number;
  summary: string;
  recommendation: string;
  source: 'openai' | 'local';
  issues: HealthIssue[];
  metrics: {
    expectedInvoices: number;
    activeInvoices: number;
    missingInvoices: number;
    paymentsBeforeStart: number;
    invoicesOutsideContract: number;
    totalPaid: number;
    contractAmount: number;
    overpaidAmount: number;
    scheduleInvoiceDifference: number;
  };
};

type PaymentScheduleLike = {
  id: string;
  installment_number?: number | null;
  due_date?: string | null;
  amount?: number | null;
  status?: string | null;
  payment_date?: string | null;
};

export const ContractHealthAnalysis: React.FC<{
  contract: Contract;
  formatCurrency: (amount: number) => string;
  paymentSchedules: PaymentScheduleLike[];
}> = ({ contract, formatCurrency, paymentSchedules }) => {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['contract-health-analysis', contract.id, contract.updated_at],
    queryFn: async () => {
      const [invoicesResult, paymentsResult] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, invoice_number, invoice_date, due_date, total_amount, paid_amount, balance_due, status, payment_status, created_at, updated_at')
          .eq('contract_id', contract.id)
          .eq('company_id', contract.company_id)
          .order('due_date', { ascending: true }),
        supabase
          .from('payments')
          .select('id, payment_number, payment_date, amount, payment_status, invoice_id')
          .eq('contract_id', contract.id)
          .eq('company_id', contract.company_id)
          .order('payment_date', { ascending: true }),
      ]);

      if (invoicesResult.error) throw invoicesResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      const metrics = buildContractHealthMetrics({
        contract,
        invoices: (invoicesResult.data || []) as Invoice[],
        payments: (paymentsResult.data || []) as ContractPaymentRow[],
        paymentSchedules,
      });

      const fallback = buildLocalContractHealth(metrics);

      try {
        const { data: aiData, error } = await supabase.functions.invoke('contract-health-analysis', {
          body: {
            contract: {
              id: contract.id,
              contract_number: contract.contract_number,
              status: contract.status,
              start_date: contract.start_date,
              end_date: contract.end_date,
              contract_amount: contract.contract_amount,
              monthly_amount: contract.monthly_amount,
              total_paid: contract.total_paid,
              balance_due: contract.balance_due,
              payment_status: contract.payment_status,
            },
            metrics,
            locale: 'ar-QA',
          },
        });

        if (error) throw new Error(error.message);
        if (aiData?.summary && Array.isArray(aiData?.issues)) {
          return {
            ...fallback,
            ...aiData,
            source: aiData.source === 'openai' ? 'openai' : 'local',
            metrics,
          } as ContractHealthResult;
        }
      } catch (error) {
        console.warn('[ContractHealthAnalysis] Falling back to local analysis:', error);
      }

      return fallback;
    },
    enabled: !!contract.id && !!contract.company_id,
    staleTime: 2 * 60 * 1000,
  });

  const health = data;
  const scoreTone = useMemo(() => {
    const score = health?.score || 0;
    if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 65) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  }, [health?.score]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#DDE5EF] bg-white p-5">
        <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (!health) return null;

  return (
    <section className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            <Sparkles className="h-4 w-4" />
            {health.source === 'openai' ? 'تحليل OpenAI' : 'تحليل ذكي داخلي'}
          </div>
          <h2 className="text-xl font-black text-[#142033]">تحليل صحة العقد</h2>
          <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-[#6A7688]">{health.summary}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('rounded-xl border px-4 py-3 text-center', scoreTone)}>
            <p className="text-xs font-bold">درجة الصحة</p>
            <p className="text-2xl font-black">{health.score}%</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            تحديث
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HealthMetric label="الفواتير الناقصة" value={String(health.metrics.missingInvoices)} icon={FileWarning} tone="amber" />
        <HealthMetric label="دفعات قبل البداية" value={String(health.metrics.paymentsBeforeStart)} icon={CalendarX} tone="red" />
        <HealthMetric label="إجمالي المدفوع" value={formatCurrency(health.metrics.totalPaid)} icon={CreditCard} tone="emerald" />
        <HealthMetric label="تجاوز قيمة العقد" value={formatCurrency(health.metrics.overpaidAmount)} icon={TrendingUp} tone="red" />
      </div>

      <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <p className="font-black text-emerald-900">القرار المقترح</p>
            <p className="mt-1 text-sm font-bold leading-6 text-emerald-800">{health.recommendation}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {health.issues.map((issue, index) => (
          <IssueCard key={`${issue.title}-${index}`} issue={issue} />
        ))}
      </div>
    </section>
  );
};

function buildContractHealthMetrics({
  contract,
  invoices,
  payments,
  paymentSchedules,
}: {
  contract: Contract;
  invoices: Invoice[];
  payments: ContractPaymentRow[];
  paymentSchedules: PaymentScheduleLike[];
}) {
  const startDate = normalizeDate(contract.start_date);
  const endDate = normalizeDate(contract.end_date);
  const activeInvoices = invoices.filter((invoice) => !isCancelled(invoice.status) && !isCancelled(invoice.payment_status));
  const activePayments = payments.filter((payment) => !isCancelled(payment.payment_status));
  const completedPayments = activePayments.filter((payment) => isCompletedPayment(payment.payment_status));
  const totalPaid = completedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const contractAmount = Number(contract.contract_amount || 0);
  const expectedByMonths = startDate && endDate ? monthSpanInclusive(startDate, endDate) : 0;
  const expectedByAmount = Number(contract.monthly_amount || 0) > 0
    ? Math.ceil(contractAmount / Number(contract.monthly_amount || 1))
    : 0;
  const expectedInvoices = Math.max(paymentSchedules.length, expectedByMonths, expectedByAmount);
  const invoicesInsideContract = activeInvoices.filter((invoice) => isDateInside(invoice.due_date || invoice.invoice_date, startDate, endDate));
  const invoicesOutsideContract = activeInvoices.length - invoicesInsideContract.length;
  const missingInvoices = Math.max(0, expectedInvoices - invoicesInsideContract.length);
  const paymentsBeforeStart = activePayments.filter((payment) => isBefore(payment.payment_date, startDate)).length;
  const paymentsAfterEnd = activePayments.filter((payment) => isAfter(payment.payment_date, endDate)).length;
  const scheduleTotal = paymentSchedules.reduce((sum, schedule) => sum + Number(schedule.amount || 0), 0);
  const invoicesTotal = invoicesInsideContract.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);

  return {
    contractNumber: contract.contract_number,
    status: contract.status,
    startDate: contract.start_date,
    endDate: contract.end_date,
    expectedInvoices,
    activeInvoices: invoicesInsideContract.length,
    activeInvoicesTotal: invoicesTotal,
    missingInvoices,
    paymentsBeforeStart,
    paymentsAfterEnd,
    invoicesOutsideContract,
    totalPaid,
    contractAmount,
    overpaidAmount: Math.max(0, totalPaid - contractAmount),
    scheduleInvoiceDifference: Math.abs(scheduleTotal - invoicesTotal),
    balanceDue: Number(contract.balance_due ?? Math.max(0, contractAmount - totalPaid)),
    daysUntilEnd: endDate ? Math.ceil((endDate.getTime() - startOfDay(new Date()).getTime()) / 86400000) : null,
  };
}

function buildLocalContractHealth(metrics: ReturnType<typeof buildContractHealthMetrics>): ContractHealthResult {
  const issues: HealthIssue[] = [];

  if (metrics.paymentsBeforeStart > 0) {
    issues.push({
      title: 'توجد دفعات قبل بداية العقد',
      detail: `تم العثور على ${metrics.paymentsBeforeStart} دفعة بتاريخ أقدم من بداية العقد. يجب مراجعتها قبل اعتماد صحة الملف المالي.`,
      severity: 'critical',
      count: metrics.paymentsBeforeStart,
    });
  }

  if (metrics.missingInvoices > 0) {
    issues.push({
      title: 'توجد فواتير ناقصة',
      detail: `المتوقع ${metrics.expectedInvoices} فاتورة، والموجود داخل مدة العقد ${metrics.activeInvoices} فاتورة فقط.`,
      severity: 'warning',
      count: metrics.missingInvoices,
    });
  }

  if (metrics.overpaidAmount > 0) {
    issues.push({
      title: 'المدفوع أكبر من قيمة العقد',
      detail: `يوجد تجاوز في المدفوعات بقيمة ${metrics.overpaidAmount.toLocaleString('ar-QA')} ر.ق مقارنة بقيمة العقد.`,
      severity: 'critical',
      count: 1,
    });
  }

  if (metrics.invoicesOutsideContract > 0 || metrics.paymentsAfterEnd > 0) {
    issues.push({
      title: 'تعارض بين التواريخ والفواتير أو الدفعات',
      detail: `يوجد ${metrics.invoicesOutsideContract} فاتورة خارج مدة العقد و${metrics.paymentsAfterEnd} دفعة بعد نهاية العقد.`,
      severity: 'warning',
      count: metrics.invoicesOutsideContract + metrics.paymentsAfterEnd,
    });
  }

  if (metrics.scheduleInvoiceDifference > 1) {
    issues.push({
      title: 'فرق بين جدول الدفعات والفواتير',
      detail: `يوجد فرق مالي بين جدول الدفعات والفواتير بقيمة ${metrics.scheduleInvoiceDifference.toLocaleString('ar-QA')} ر.ق.`,
      severity: 'warning',
      count: 1,
    });
  }

  if (issues.length === 0) {
    issues.push({
      title: 'العقد متوازن ماليًا',
      detail: 'لا تظهر مشاكل واضحة في الدفعات أو الفواتير أو تواريخ العقد حسب البيانات الحالية.',
      severity: 'good',
    });
  }

  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const score = Math.max(0, 100 - criticalCount * 28 - warningCount * 12);

  let recommendation = 'يمكن متابعة العقد بشكل طبيعي مع مراقبة السداد والفواتير.';
  if (criticalCount > 0) {
    recommendation = 'لا يفضل تجديد أو إغلاق العقد قبل معالجة المشاكل الحرجة في الدفعات والتواريخ.';
  } else if (metrics.daysUntilEnd !== null && metrics.daysUntilEnd <= 30 && metrics.balanceDue <= 0) {
    recommendation = 'العقد مناسب للإغلاق أو التجديد بعد التأكد من حالة المركبة والمخالفات.';
  } else if (metrics.daysUntilEnd !== null && metrics.daysUntilEnd <= 30) {
    recommendation = 'العقد قريب من الانتهاء. يفضل متابعة التحصيل أولًا ثم اتخاذ قرار التجديد.';
  }

  return {
    score,
    summary: criticalCount > 0
      ? 'يوجد خلل مهم في صحة العقد ويحتاج مراجعة قبل أي قرار مالي.'
      : warningCount > 0
      ? 'العقد قابل للمتابعة لكن توجد ملاحظات يجب معالجتها.'
      : 'العقد يبدو سليمًا من ناحية الفواتير والدفعات والتواريخ.',
    recommendation,
    source: 'local',
    issues,
    metrics: {
      expectedInvoices: metrics.expectedInvoices,
      activeInvoices: metrics.activeInvoices,
      missingInvoices: metrics.missingInvoices,
      paymentsBeforeStart: metrics.paymentsBeforeStart,
      invoicesOutsideContract: metrics.invoicesOutsideContract,
      totalPaid: metrics.totalPaid,
      contractAmount: metrics.contractAmount,
      overpaidAmount: metrics.overpaidAmount,
      scheduleInvoiceDifference: metrics.scheduleInvoiceDifference,
    },
  };
}

const HealthMetric: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  tone: 'emerald' | 'amber' | 'red';
}> = ({ label, value, icon: Icon, tone }) => {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  }[tone];

  return (
    <div className="rounded-lg border border-[#DDE5EF] bg-[#FCFDFE] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#6A7688]">{label}</p>
          <p className="mt-2 text-lg font-black text-[#142033]">{value}</p>
        </div>
        <div className={cn('rounded-lg p-2', toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const IssueCard: React.FC<{ issue: HealthIssue }> = ({ issue }) => {
  const styles = {
    critical: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }[issue.severity];
  const Icon = issue.severity === 'good' ? CheckCircle2 : AlertTriangle;

  return (
    <div className={cn('rounded-lg border p-4', styles)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-black">{issue.title}</p>
          <p className="mt-1 text-sm font-medium leading-6">{issue.detail}</p>
        </div>
      </div>
    </div>
  );
};

function isCancelled(status: string | null | undefined) {
  return ['cancelled', 'canceled', 'void'].includes(String(status || '').toLowerCase());
}

function isCompletedPayment(status: string | null | undefined) {
  return ['completed', 'paid', 'cleared', 'confirmed', 'approved'].includes(String(status || '').toLowerCase());
}

function normalizeDate(dateValue: string | null | undefined) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isBefore(dateValue: string | null | undefined, target: Date | null) {
  const date = normalizeDate(dateValue);
  return !!date && !!target && date < target;
}

function isAfter(dateValue: string | null | undefined, target: Date | null) {
  const date = normalizeDate(dateValue);
  return !!date && !!target && date > target;
}

function isDateInside(dateValue: string | null | undefined, start: Date | null, end: Date | null) {
  const date = normalizeDate(dateValue);
  if (!date || !start || !end) return false;
  return date >= start && date <= end;
}

function monthSpanInclusive(start: Date, end: Date) {
  const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
  return Math.max(1, months);
}

export default ContractHealthAnalysis;
