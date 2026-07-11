import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserCheck,
  Wallet,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CustomerActivity } from '@/hooks/useCustomerCRMActivity';

type RecommendationType = 'accept' | 'guarantee' | 'temporary_reject';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

type CustomerAIResult = {
  summary: string;
  paymentBehavior: string;
  riskLevel: RiskLevel;
  riskScore: number;
  bestContactMethod: string;
  repeatedIssues: string[];
  recommendation: RecommendationType;
  recommendationReason: string;
  source: 'longcat' | 'local';
};

type CustomerAISummaryProps = {
  customer: any;
  contracts: any[];
  invoices: any[];
  payments: any[];
  violations: any[];
  activities: CustomerActivity[];
  scheduledFollowups: any[];
  formatCurrency: (amount: number) => string;
  onCreateContract?: () => void;
  onOpenCrm?: () => void;
};

export const CustomerAISummary: React.FC<CustomerAISummaryProps> = ({
  customer,
  contracts,
  invoices,
  payments,
  violations,
  activities,
  scheduledFollowups,
  formatCurrency,
  onCreateContract,
  onOpenCrm,
}) => {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['customer-ai-summary', customer?.id, contracts.length, invoices.length, payments.length, violations.length, activities.length],
    queryFn: async () => {
      const metrics = buildCustomerMetrics({ customer, contracts, invoices, payments, violations, activities, scheduledFollowups });
      const fallback = buildLocalCustomerSummary(metrics);

      try {
        const { data: aiData, error } = await supabase.functions.invoke('customer-ai-summary', {
          body: {
            customer: {
              id: customer.id,
              customer_code: customer.customer_code,
              name: metrics.customerName,
              phone: customer.phone || customer.mobile_number,
              email: customer.email,
              customer_type: customer.customer_type,
              created_at: customer.created_at,
            },
            metrics,
            locale: 'ar-QA',
          },
        });

        if (error) throw new Error(error.message);
        if (aiData?.summary && aiData?.recommendation) {
          return normalizeCustomerAIResult(aiData, fallback);
        }
      } catch (error) {
        console.warn('[CustomerAISummary] Falling back to local analysis:', error);
      }

      return fallback;
    },
    enabled: !!customer?.id,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#DDE5EF] bg-white p-5">
        <div className="h-44 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (!data) return null;

  const metrics = buildCustomerMetrics({ customer, contracts, invoices, payments, violations, activities, scheduledFollowups });
  const recommendationStyle = recommendationStyles[data.recommendation];
  const riskStyle = riskStyles[data.riskLevel];

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              <Sparkles className="h-4 w-4" />
              {data.source === 'longcat' ? 'ملخص LongCat' : 'تحليل ذكي داخلي'}
            </div>
            <h2 className="text-xl font-black text-[#142033]">ملخص ذكي للعميل</h2>
            <p className="mt-1 max-w-3xl text-sm font-medium leading-7 text-[#6A7688]">{data.summary}</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2 border-[#DDE5EF]">
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            تحديث
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="درجة المخاطر" value={`${data.riskScore}%`} icon={ShieldAlert} className={riskStyle.card} />
          <MetricCard label="المتأخرات" value={formatCurrency(metrics.overdueAmount)} icon={Wallet} className="border-rose-200 bg-rose-50 text-rose-700" />
          <MetricCard label="العقود السابقة" value={String(metrics.totalContracts)} icon={UserCheck} className="border-blue-200 bg-blue-50 text-blue-700" />
          <MetricCard label="المشاكل المتكررة" value={String(data.repeatedIssues.length)} icon={AlertTriangle} className="border-amber-200 bg-amber-50 text-amber-700" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-[#142033]">القرار المقترح</h3>
          <div className={cn('rounded-lg border p-4', recommendationStyle.card)}>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-black">{recommendationStyle.label}</p>
                <p className="mt-1 text-sm font-bold leading-6">{data.recommendationReason}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoBlock title="سلوك السداد" value={data.paymentBehavior} />
            <InfoBlock title="أفضل طريقة للتواصل" value={data.bestContactMethod} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={onCreateContract} className="gap-2 bg-[#173A63] text-white hover:bg-[#142033]">
              <TrendingUp className="h-4 w-4" />
              عقد جديد
            </Button>
            <Button variant="outline" onClick={onOpenCrm} className="gap-2 border-[#DDE5EF] text-[#173A63] hover:bg-[#EEF5FB]">
              <Phone className="h-4 w-4" />
              متابعة CRM
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-[#142033]">المشاكل المتكررة</h3>
          <div className="space-y-2">
            {data.repeatedIssues.map((issue, index) => (
              <div key={`${issue}-${index}`} className="rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-3 text-sm font-bold leading-6 text-[#142033]">
                {issue}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-[#DDE5EF] bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-[#6A7688]">ملخص التواصل</span>
              <Badge className="border border-[#DDE5EF] bg-[#F8FAFC] text-[#536173]">{activities.length} تفاعل</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat icon={Phone} label="اتصالات" value={metrics.calls} />
              <MiniStat icon={MessageCircle} label="رسائل" value={metrics.messages} />
              <MiniStat icon={AlertTriangle} label="متابعات" value={metrics.openFollowups} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

function buildCustomerMetrics({
  customer,
  contracts,
  invoices,
  payments,
  violations,
  activities,
  scheduledFollowups,
}: {
  customer: any;
  contracts: any[];
  invoices: any[];
  payments: any[];
  violations: any[];
  activities: CustomerActivity[];
  scheduledFollowups: any[];
}) {
  const today = startOfDay(new Date());
  const activeContracts = contracts.filter((contract) => contract.status === 'active');
  const closedContracts = contracts.filter((contract) => ['closed', 'completed', 'expired', 'cancelled'].includes(String(contract.status || '').toLowerCase()));
  const overdueInvoices = invoices.filter((invoice) => {
    const status = String(invoice.payment_status || invoice.status || '').toLowerCase();
    return !['paid', 'completed', 'cancelled'].includes(status) && invoice.due_date && new Date(invoice.due_date) < today;
  });
  const overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
  const unpaidViolations = violations.filter((violation) => {
    const status = String(violation.payment_status || violation.status || '').toLowerCase();
    return !['paid', 'completed', 'cancelled'].includes(status);
  });
  const unpaidViolationsAmount = unpaidViolations.reduce((sum, violation) => sum + Number(violation.fine_amount || violation.total_amount || 0), 0);
  const completedPayments = payments.filter((payment) => ['completed', 'paid', 'cleared', 'confirmed', 'approved'].includes(String(payment.payment_status || '').toLowerCase()));
  const cancelledPayments = payments.filter((payment) => ['cancelled', 'canceled', 'bounced'].includes(String(payment.payment_status || '').toLowerCase()));
  const calls = activities.filter((activity) => activity.note_type === 'phone').length;
  const successfulCalls = activities.filter((activity) => activity.note_type === 'phone' && activity.call_status === 'answered').length;
  const messages = activities.filter((activity) => ['whatsapp', 'message'].includes(activity.note_type)).length;
  const openFollowups = scheduledFollowups.filter((followup) => followup.status !== 'completed').length;
  const importantNotes = activities.filter((activity) => activity.is_important).length;

  return {
    customerName: customer?.company_name_ar || customer?.company_name || [customer?.first_name_ar || customer?.first_name, customer?.last_name_ar || customer?.last_name].filter(Boolean).join(' ') || customer?.customer_code || 'عميل غير محدد',
    totalContracts: contracts.length,
    activeContracts: activeContracts.length,
    closedContracts: closedContracts.length,
    overdueInvoices: overdueInvoices.length,
    overdueAmount,
    unpaidViolations: unpaidViolations.length,
    unpaidViolationsAmount,
    completedPayments: completedPayments.length,
    cancelledPayments: cancelledPayments.length,
    totalPaymentsAmount: completedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    calls,
    successfulCalls,
    messages,
    openFollowups,
    importantNotes,
    latestContractStatus: contracts[0]?.status || null,
    latestPaymentDate: payments[0]?.payment_date || null,
    latestActivityDate: activities[0]?.created_at || null,
  };
}

function buildLocalCustomerSummary(metrics: ReturnType<typeof buildCustomerMetrics>): CustomerAIResult {
  const riskPoints =
    Math.min(45, metrics.overdueAmount / 1000) +
    Math.min(20, metrics.unpaidViolations * 4) +
    Math.min(15, metrics.openFollowups * 3) +
    Math.min(10, metrics.cancelledPayments * 5) +
    Math.min(10, metrics.importantNotes * 2);
  const riskScore = Math.max(0, Math.min(100, Math.round(riskPoints)));
  const riskLevel: RiskLevel = riskScore >= 75 ? 'critical' : riskScore >= 55 ? 'high' : riskScore >= 30 ? 'medium' : 'low';
  const repeatedIssues: string[] = [];

  if (metrics.overdueInvoices > 0) repeatedIssues.push(`تأخر في سداد ${metrics.overdueInvoices} فاتورة`);
  if (metrics.unpaidViolations > 0) repeatedIssues.push(`مخالفات غير مدفوعة بعدد ${metrics.unpaidViolations}`);
  if (metrics.openFollowups > 0) repeatedIssues.push(`متابعات مفتوحة بعدد ${metrics.openFollowups}`);
  if (metrics.cancelledPayments > 0) repeatedIssues.push('يوجد سجل دفعات ملغاة أو مرتجعة');
  if (repeatedIssues.length === 0) repeatedIssues.push('لا توجد مشاكل متكررة واضحة في البيانات الحالية');

  const bestContactMethod = metrics.successfulCalls > 0
    ? 'الاتصال المباشر'
    : metrics.messages >= metrics.calls
    ? 'واتساب أو الرسائل'
    : 'الاتصال ثم واتساب عند عدم الرد';

  let recommendation: RecommendationType = 'accept';
  let recommendationReason = 'يمكن قبول عقد جديد مع المتابعة المعتادة لأن المخاطر الحالية منخفضة.';
  if (riskLevel === 'critical' || metrics.overdueAmount > 10000) {
    recommendation = 'temporary_reject';
    recommendationReason = 'يفضل الرفض المؤقت حتى تسوية المتأخرات والمخالفات المفتوحة.';
  } else if (riskLevel === 'high' || metrics.overdueAmount > 0 || metrics.unpaidViolations > 0) {
    recommendation = 'guarantee';
    recommendationReason = 'يمكن قبول عقد جديد بشرط طلب ضمان أو دفعة مقدمة بسبب وجود ملاحظات مالية.';
  }

  return {
    summary: `العميل لديه ${metrics.totalContracts} عقد و${metrics.overdueInvoices} فاتورة متأخرة، ومستوى المخاطر ${riskLabel(riskLevel)}.`,
    paymentBehavior: metrics.overdueAmount > 0
      ? `يوجد تأخر حالي بقيمة ${metrics.overdueAmount.toLocaleString('ar-QA')} ر.ق، لذلك يحتاج متابعة قبل أي عقد جديد.`
      : metrics.completedPayments > 0
      ? 'سلوك السداد مقبول حسب الدفعات المكتملة ولا توجد متأخرات واضحة.'
      : 'لا توجد بيانات سداد كافية للحكم النهائي.',
    riskLevel,
    riskScore,
    bestContactMethod,
    repeatedIssues,
    recommendation,
    recommendationReason,
    source: 'local',
  };
}

function normalizeCustomerAIResult(payload: any, fallback: CustomerAIResult): CustomerAIResult {
  return {
    summary: typeof payload?.summary === 'string' ? payload.summary : fallback.summary,
    paymentBehavior: typeof payload?.paymentBehavior === 'string' ? payload.paymentBehavior : fallback.paymentBehavior,
    riskLevel: normalizeRiskLevel(payload?.riskLevel, fallback.riskLevel),
    riskScore: clampScore(payload?.riskScore, fallback.riskScore),
    bestContactMethod: typeof payload?.bestContactMethod === 'string' ? payload.bestContactMethod : fallback.bestContactMethod,
    repeatedIssues: Array.isArray(payload?.repeatedIssues) && payload.repeatedIssues.length > 0
      ? payload.repeatedIssues.slice(0, 5).map((issue: unknown) => String(issue))
      : fallback.repeatedIssues,
    recommendation: normalizeRecommendation(payload?.recommendation, fallback.recommendation),
    recommendationReason: typeof payload?.recommendationReason === 'string' ? payload.recommendationReason : fallback.recommendationReason,
    source: payload?.source === 'longcat' || payload?.source === 'openai' ? 'longcat' : 'local',
  };
}

const recommendationStyles: Record<RecommendationType, { label: string; card: string }> = {
  accept: {
    label: 'قبول عقد جديد',
    card: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  guarantee: {
    label: 'قبول بشرط ضمان',
    card: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  temporary_reject: {
    label: 'رفض مؤقت',
    card: 'border-red-200 bg-red-50 text-red-800',
  },
};

const riskStyles: Record<RiskLevel, { card: string }> = {
  low: { card: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  medium: { card: 'border-amber-200 bg-amber-50 text-amber-700' },
  high: { card: 'border-orange-200 bg-orange-50 text-orange-700' },
  critical: { card: 'border-red-200 bg-red-50 text-red-700' },
};

const MetricCard: React.FC<{ label: string; value: string; icon: React.ElementType; className: string }> = ({ label, value, icon: Icon, className }) => (
  <div className={cn('rounded-lg border p-4', className)}>
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-black opacity-80">{label}</p>
        <p className="mt-2 text-xl font-black">{value}</p>
      </div>
      <Icon className="h-5 w-5" />
    </div>
  </div>
);

const InfoBlock: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div className="rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-4">
    <p className="text-xs font-black text-[#6A7688]">{title}</p>
    <p className="mt-2 text-sm font-bold leading-6 text-[#142033]">{value}</p>
  </div>
);

const MiniStat: React.FC<{ icon: React.ElementType; label: string; value: number }> = ({ icon: Icon, label, value }) => (
  <div className="rounded-lg bg-[#F8FAFC] p-2">
    <Icon className="mx-auto h-4 w-4 text-[#173A63]" />
    <p className="mt-1 text-sm font-black text-[#142033]">{value}</p>
    <p className="text-[10px] font-bold text-[#6A7688]">{label}</p>
  </div>
);

function invoiceBalance(invoice: any) {
  return Number(invoice.balance_due ?? Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)));
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function riskLabel(level: RiskLevel) {
  return level === 'critical' ? 'حرج' : level === 'high' ? 'مرتفع' : level === 'medium' ? 'متوسط' : 'منخفض';
}

function normalizeRiskLevel(value: unknown, fallback: RiskLevel): RiskLevel {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical' ? value : fallback;
}

function normalizeRecommendation(value: unknown, fallback: RecommendationType): RecommendationType {
  return value === 'accept' || value === 'guarantee' || value === 'temporary_reject' ? value : fallback;
}

function clampScore(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

export default CustomerAISummary;
