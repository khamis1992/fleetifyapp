/**
 * ContractPulseV3 — the living side rail (light theme).
 * Consolidates health / smart-tasks / financial diagnosis / CRM log /
 * unified timeline into one continuous column the user reads like a
 * heartbeat: score → signals → tasks → timeline.
 */

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Loader2,
  MessageSquare,
  Phone,
  Receipt,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Contract } from '@/types/contracts';
import type { Invoice } from '@/types/finance.types';
import type { CustomerActivity } from '@/hooks/useCustomerCRMActivity';
import {
  buildFinancialDiagnosisV3,
  calculateContractHealthScoreV3,
  type ContractFinancialPaymentV3,
  type ContractFinancialSnapshot,
  type PaymentScheduleLikeV3,
} from './tokens';

export interface ContractPulseProps {
  contract: Contract;
  snapshot: ContractFinancialSnapshot;
  invoices: Invoice[];
  payments: ContractFinancialPaymentV3[];
  paymentSchedules: PaymentScheduleLikeV3[];
  crmActivities: CustomerActivity[];
  crmStats: {
    total: number;
    calls: number;
    successfulCalls: number;
    missedCalls: number;
    messages: number;
    notes: number;
  };
  violationsCount: number;
  daysRemaining: number | null;
  auditLogs: Array<{
    action: string;
    changes_summary: string | null;
    entity_name: string | null;
    created_at: string | null;
    severity: string | null;
    status: string | null;
    user_name: string | null;
  }>;
  formatCurrency: (amount: number) => string;
  crmNote: string;
  callStatus: 'answered' | 'no_answer' | 'busy';
  isSavingCall: boolean;
  onCrmNoteChange: (value: string) => void;
  onCallStatusChange: (value: 'answered' | 'no_answer' | 'busy') => void;
  onSaveCall: () => void;
  onOpenCrm: () => void;
  onWhatsApp: () => void;
  onOpenFinancial: () => void;
  onOpenViolations: () => void;
}

const railFade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const Panel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.section
    variants={railFade}
    initial="hidden"
    animate="visible"
    className={cn(
      'overflow-hidden rounded-2xl border border-[#E5EAF1] bg-white shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]',
      className,
    )}
  >
    {children}
  </motion.section>
);

const PanelHeader = ({
  eyebrow,
  title,
  icon: Icon,
  tone,
}: {
  eyebrow: string;
  title: string;
  icon: React.ElementType;
  tone?: string;
}) => (
  <header className="flex items-center justify-between gap-2 border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
    <div className="flex items-center gap-2.5">
      <span
        className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tone || 'bg-[#E5EAF1] text-slate-600')}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{eyebrow}</p>
        <h3 className="text-sm font-black text-[#0F172A]">{title}</h3>
      </div>
    </div>
  </header>
);

export function ContractPulse({
  contract,
  snapshot,
  invoices,
  payments,
  paymentSchedules,
  crmActivities,
  crmStats,
  violationsCount,
  daysRemaining,
  auditLogs,
  formatCurrency,
  crmNote,
  callStatus,
  isSavingCall,
  onCrmNoteChange,
  onCallStatusChange,
  onSaveCall,
  onOpenCrm,
  onWhatsApp,
  onOpenFinancial,
  onOpenViolations,
}: ContractPulseProps) {
  // ---- Health score ----
  const lastCrmActivity = crmActivities[0];
  const lastContactDays = lastCrmActivity ? differenceInDays(new Date(), new Date(lastCrmActivity.created_at)) : null;

  const health = useMemo(() => {
    return calculateContractHealthScoreV3({
      snapshot,
      daysRemaining,
      violationsCount,
      contractStatus: contract.status,
    });
  }, [contract.status, daysRemaining, snapshot, violationsCount]);

  const factors = [
    {
      label: 'التحصيل',
      value: !snapshot.hasFinancialCoverage
        ? `فواتير ناقصة (${snapshot.missingInvoiceMonthsCount})`
        : snapshot.remainingTotal > 0
          ? `${formatCurrency(snapshot.remainingTotal)}`
          : 'مكتمل',
      state: !snapshot.hasFinancialCoverage || snapshot.remainingTotal > 0 ? 'risk' : 'good',
    },
    {
      label: 'المدة',
      value: daysRemaining !== null ? (daysRemaining > 0 ? `${daysRemaining} يوم` : 'منتهي') : '—',
      state: daysRemaining !== null && daysRemaining <= 30 ? 'watch' : 'good',
    },
    {
      label: 'الجدول المالي',
      value: snapshot.scheduleReviewNeeded ? 'يحتاج مراجعة' : 'متطابق',
      state: snapshot.scheduleReviewNeeded ? 'risk' : 'good',
    },
    {
      label: 'التواصل',
      value: lastContactDays === null ? 'غير مسجل' : `${lastContactDays} يوم`,
      state: lastContactDays === null || lastContactDays > 7 ? 'watch' : 'good',
    },
  ];

  // ---- Smart tasks ----
  const smartTasks = useMemo(
    () =>
      [
        snapshot.remainingTotal > 0 && snapshot.hasFinancialCoverage && {
          title: 'تحصيل المستحقات المفتوحة',
          note: `${snapshot.openInvoicesCount} فاتورة، والمتبقي من العقد ${formatCurrency(snapshot.remainingTotal)}.`,
          priority: snapshot.remainingTotal > 5000 ? 'عالية' : 'متوسطة',
          icon: Wallet,
          action: onOpenFinancial,
        },
        snapshot.scheduleReviewNeeded && {
          title: 'مطابقة جدول الدفعات مع الفواتير',
          note: snapshot.outOfPeriodSchedulesCount + snapshot.outOfPeriodInvoicesCount > 0
            ? `${snapshot.outOfPeriodSchedulesCount + snapshot.outOfPeriodInvoicesCount} سجل مالي خارج مدة العقد، و${snapshot.missingInvoiceMonthsCount} قسطاً بلا فاتورة.`
            : snapshot.missingInvoiceMonthsCount > 0
              ? `${snapshot.missingInvoiceMonthsCount} قسطاً لا توجد له فاتورة فعالة.`
            : `فرق ${formatCurrency(Math.abs(snapshot.scheduleDifference))} بين الفواتير وجدول الدفعات.`,
          priority: 'عالية',
          icon: ClipboardList,
          action: onOpenFinancial,
        },
        (lastContactDays === null || lastContactDays > 7) && {
          title: 'تحديث سجل التواصل',
          note: 'سجل مكالمة أو ملاحظة لتصبح المتابعة قابلة للتدقيق.',
          priority: 'متوسطة',
          icon: Phone,
          action: onOpenCrm,
        },
        violationsCount > 0 && {
          title: 'مراجعة المخالفات المرتبطة',
          note: 'تحقق من التحميل أو التحويل للعميل.',
          priority: 'متوسطة',
          icon: AlertCircle,
          action: onOpenViolations,
        },
        daysRemaining !== null &&
          daysRemaining <= 30 &&
          contract.status === 'active' && {
            title: 'قرار التجديد أو الإغلاق',
            note: 'العقد قريب من الانتهاء ويحتاج إجراء واضح.',
            priority: 'منخفضة',
            icon: Target,
            action: onOpenFinancial,
          },
      ].filter(Boolean) as Array<{
        title: string;
        note: string;
        priority: string;
        icon: React.ElementType;
        action: () => void;
      }>,
    [
      contract.status,
      daysRemaining,
      formatCurrency,
      lastContactDays,
      onOpenCrm,
      onOpenFinancial,
      onOpenViolations,
      snapshot,
      violationsCount,
    ],
  );

  // ---- Diagnosis ----
  const diagnosis = useMemo(
    () => buildFinancialDiagnosisV3({ contract, invoices, payments, paymentSchedules, formatCurrency }),
    [contract, formatCurrency, invoices, paymentSchedules, payments],
  );

  // ---- Unified timeline ----
  const timeline = useMemo(() => {
    const events = [
      contract.created_at && {
        date: contract.created_at,
        title: 'إنشاء العقد',
        detail: contract.contract_number,
        tone: 'neutral' as const,
        icon: Receipt,
      },
      contract.start_date && {
        date: contract.start_date,
        title: 'بداية العقد',
        detail: 'بدء سريان الاتفاق',
        tone: 'success' as const,
        icon: Calendar,
      },
      ...invoices.slice(0, 4).map((invoice) => ({
        date: invoice.updated_at || invoice.invoice_date,
        title: invoice.payment_status === 'paid' ? 'سداد فاتورة' : 'فاتورة مفتوحة',
        detail: `${invoice.invoice_number} — ${formatCurrency(invoice.balance_due || invoice.total_amount || 0)}`,
        tone: (invoice.payment_status === 'paid' ? 'success' : 'warning') as 'success' | 'warning',
        icon: Receipt,
      })),
      ...paymentSchedules.slice(0, 3).map((payment) => ({
        date: payment.due_date || contract.start_date || '',
        title: payment.status === 'paid' ? 'دفعة مكتملة' : 'دفعة مجدولة',
        detail: formatCurrency(Number(payment.amount || 0)),
        tone: (payment.status === 'paid' ? 'success' : 'neutral') as 'success' | 'neutral',
        icon: CreditCard,
      })),
      ...crmActivities.slice(0, 4).map((activity) => ({
        date: activity.created_at,
        title: activity.title || (activity.note_type === 'phone' ? 'تواصل هاتفي' : 'تفاعل مع العميل'),
        detail: activity.content || 'تم تسجيل تفاعل بدون ملاحظات',
        tone: (activity.is_important || activity.call_status === 'no_answer'
          ? 'warning'
          : 'neutral') as 'warning' | 'neutral',
        icon: activity.note_type === 'phone' ? Phone : MessageSquare,
      })),
      ...auditLogs.slice(0, 4).map((log) => ({
        date: log.created_at || contract.updated_at || contract.created_at || '',
        title: log.changes_summary || log.action || 'تحديث على العقد',
        detail: [log.entity_name, log.user_name].filter(Boolean).join(' — ') || 'سجل تدقيق',
        tone: (log.severity === 'high' || log.status === 'failed' ? 'warning' : 'neutral') as
          | 'warning'
          | 'neutral',
        icon: Activity,
      })),
      contract.end_date && {
        date: contract.end_date,
        title: 'نهاية العقد',
        detail: daysRemaining && daysRemaining > 0 ? `متبقي ${daysRemaining} يوم` : 'انتهى العقد',
        tone: 'neutral' as const,
        icon: Calendar,
      },
    ]
      .filter(Boolean)
      .sort((a, b) => new Date((b as { date: string }).date).getTime() - new Date((a as { date: string }).date).getTime())
      .slice(0, 7) as Array<{
      date: string;
      title: string;
      detail: string;
      tone: 'neutral' | 'success' | 'warning';
      icon: React.ElementType;
    }>;

    return events;
  }, [auditLogs, contract, crmActivities, daysRemaining, formatCurrency, invoices, paymentSchedules]);

  const [expandedDiagnosis, setExpandedDiagnosis] = useState(false);

  return (
    <aside className="grid gap-4">
      {/* ===== Health ===== */}
      <Panel>
        <PanelHeader
          eyebrow="Health Score"
          title="نبض العقد"
          icon={ShieldCheck}
          tone={
            health.tone === 'good'
              ? 'bg-[#22C7A1]/10 text-[#0E9E7E]'
              : health.tone === 'watch'
                ? 'bg-[#F59E0B]/10 text-[#B45309]'
                : 'bg-[#FB6B7A]/10 text-[#BE123C]'
          }
        />
        <div className="p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-bold text-slate-500">
              {health.tone === 'good' ? 'الحالة ممتازة' : health.tone === 'watch' ? 'تحت المراقبة' : 'خطر يحتاج تدخلاً'}
            </span>
            <div className="flex items-baseline gap-0.5">
              <strong
                className={cn(
                  'text-4xl font-black leading-none tracking-tight',
                  health.tone === 'good'
                    ? 'text-[#0E9E7E]'
                    : health.tone === 'watch'
                      ? 'text-[#B45309]'
                      : 'text-[#BE123C]',
                )}
              >
                {health.score}
              </strong>
              <small className="text-xs font-bold text-slate-400">/100</small>
            </div>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#E5EAF1]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${health.score}%` }}
              transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] as const, delay: 0.2 }}
              className={cn(
                'h-full rounded-full',
                health.tone === 'good'
                  ? 'bg-gradient-to-l from-[#A7F3D0] to-[#22C7A1]'
                  : health.tone === 'watch'
                    ? 'bg-gradient-to-l from-[#FCD34D] to-[#F59E0B]'
                    : 'bg-gradient-to-l from-[#FDA4AF] to-[#FB6B7A]',
              )}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {factors.map((factor) => (
              <div
                key={factor.label}
                className={cn(
                  'rounded-lg border p-2.5',
                  factor.state === 'good' && 'border-[#22C7A1]/20 bg-[#ECFDF9]',
                  factor.state === 'watch' && 'border-[#F59E0B]/20 bg-[#FFFBEB]',
                  factor.state === 'risk' && 'border-[#FB6B7A]/20 bg-[#FFF5F6]',
                )}
              >
                <p className="text-[10px] font-black text-slate-400">{factor.label}</p>
                <p
                  className={cn(
                    'mt-0.5 truncate text-xs font-black',
                    factor.state === 'good' && 'text-[#0E9E7E]',
                    factor.state === 'watch' && 'text-[#B45309]',
                    factor.state === 'risk' && 'text-[#BE123C]',
                  )}
                >
                  {factor.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* ===== Smart tasks ===== */}
      <Panel>
        <PanelHeader
          eyebrow="Smart Queue"
          title="مهام مقترحة"
          icon={ClipboardList}
          tone="bg-[#38BDF8]/10 text-[#0369A1]"
        />
        <div className="grid">
          {smartTasks.length > 0 ? (
            smartTasks.slice(0, 4).map((task) => {
              const Icon = task.icon;
              return (
                <button
                  key={task.title}
                  type="button"
                  onClick={task.action}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 border-b border-[#E5EAF1] px-4 py-3 text-right transition-colors last:border-b-0 hover:bg-[#F6F8FB]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#38BDF8]/10 text-[#0369A1]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-[#0F172A]">{task.title}</p>
                    <p className="truncate text-[11px] font-semibold text-slate-500">{task.note}</p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-black',
                      task.priority === 'عالية' && 'bg-[#FB6B7A]/10 text-[#BE123C]',
                      task.priority === 'متوسطة' && 'bg-[#F59E0B]/10 text-[#B45309]',
                      task.priority === 'منخفضة' && 'bg-[#F6F8FB] text-slate-500',
                    )}
                  >
                    {task.priority}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="flex items-center gap-2.5 px-4 py-5 text-xs font-bold text-[#0E9E7E]">
              <CheckCircle2 className="h-4 w-4" />
              لا توجد مهام عاجلة على هذا العقد.
            </div>
          )}
        </div>
      </Panel>

      {/* ===== Financial diagnosis ===== */}
      <Panel>
        <PanelHeader
          eyebrow="AI Audit"
          title="تشخيص الفواتير والدفعات"
          icon={Sparkles}
          tone={cn(
            diagnosis.tone === 'ok'
              ? 'bg-[#22C7A1]/10 text-[#0E9E7E]'
              : diagnosis.tone === 'warning'
                ? 'bg-[#F59E0B]/10 text-[#B45309]'
                : 'bg-[#FB6B7A]/10 text-[#BE123C]',
          )}
        />
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  'text-lg font-black',
                  diagnosis.tone === 'ok' && 'text-[#0E9E7E]',
                  diagnosis.tone === 'warning' && 'text-[#B45309]',
                  diagnosis.tone === 'danger' && 'text-[#BE123C]',
                )}
              >
                {diagnosis.status}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-5 text-slate-500">
                {diagnosis.summary}
              </p>
            </div>
            <div className="shrink-0 text-center">
              <span className="text-[10px] font-black text-slate-400">التطابق</span>
              <strong
                className={cn(
                  'block text-2xl font-black leading-none',
                  diagnosis.tone === 'ok' && 'text-[#0E9E7E]',
                  diagnosis.tone === 'warning' && 'text-[#B45309]',
                  diagnosis.tone === 'danger' && 'text-[#BE123C]',
                )}
              >
                {diagnosis.score}%
              </strong>
            </div>
          </div>

          {diagnosis.issues.length > 0 && (
            <div className="mt-3 grid gap-2">
              {diagnosis.issues.slice(0, expandedDiagnosis ? undefined : 2).map((issue) => (
                <div
                  key={issue.title}
                  className={cn(
                    'rounded-lg border p-2.5',
                    issue.severity === 'danger' ? 'border-[#FB6B7A]/25 bg-[#FFF5F6]' : 'border-[#F59E0B]/25 bg-[#FFFBEB]',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={cn(
                        'mt-0.5 h-3.5 w-3.5 shrink-0',
                        issue.severity === 'danger' ? 'text-[#BE123C]' : 'text-[#B45309]',
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#0F172A]">{issue.title}</p>
                      <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-600">{issue.detail}</p>
                      <p className="mt-1.5 text-[11px] font-bold text-slate-800">{issue.action}</p>
                    </div>
                  </div>
                </div>
              ))}
              {diagnosis.issues.length > 2 && (
                <button
                  type="button"
                  onClick={() => setExpandedDiagnosis((value) => !value)}
                  className="w-fit text-[11px] font-black text-slate-500 underline underline-offset-2 hover:text-slate-800"
                >
                  {expandedDiagnosis ? 'إظهار أقل' : `+ ${diagnosis.issues.length - 2} إشارات أخرى`}
                </button>
              )}
            </div>
          )}

          {diagnosis.issues.length === 0 && (
            <div className="mt-3 rounded-lg border border-[#22C7A1]/25 bg-[#ECFDF9] px-3 py-2.5 text-[11px] font-bold text-[#0E9E7E]">
              لا توجد فروقات واضحة بين الفواتير والدفعات ورصيد العقد.
            </div>
          )}
        </div>
      </Panel>

      {/* ===== CRM quick log ===== */}
      <Panel>
        <PanelHeader
          eyebrow="Customer CRM"
          title="التواصل مع العميل"
          icon={Phone}
          tone="bg-[#22C7A1]/10 text-[#0E9E7E]"
        />
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: crmStats.total, label: 'نشاط' },
              { value: crmStats.calls, label: 'مكالمات' },
              { value: crmStats.missedCalls, label: 'لم يرد' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-2.5 text-center"
              >
                <strong className="block text-base font-black text-[#0F172A]">{stat.value}</strong>
                <span className="text-[10px] font-bold text-slate-400">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-2.5">
            <Phone className="mt-0.5 h-3.5 w-3.5 text-[#0E9E7E]" />
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-[#0F172A]">
                {lastCrmActivity?.title || 'لا يوجد تواصل حديث'}
              </p>
              <p className="truncate text-[11px] font-semibold text-slate-500">
                {lastCrmActivity?.content || 'سجل أول ملاحظة أو مكالمة من هنا.'}
              </p>
            </div>
          </div>

          <textarea
            value={crmNote}
            onChange={(event) => onCrmNoteChange(event.target.value)}
            placeholder="اكتب ملخص المكالمة أو الملاحظة..."
            rows={2}
            className="mt-3 w-full resize-y rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-[#22C7A1]/50 focus:outline-none"
          />

          <div className="mt-2.5 grid grid-cols-[1fr_auto_auto] gap-2">
            <select
              value={callStatus}
              onChange={(event) => onCallStatusChange(event.target.value as 'answered' | 'no_answer' | 'busy')}
              className="h-9 rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] px-2 text-xs font-bold text-slate-700 focus:border-[#22C7A1]/50 focus:outline-none"
            >
              <option value="answered">تم الرد</option>
              <option value="no_answer">لم يرد</option>
              <option value="busy">مشغول</option>
            </select>
            <Button
              type="button"
              size="sm"
              onClick={onSaveCall}
              disabled={isSavingCall}
              className="h-9 rounded-lg bg-[#0F172A] px-3 text-xs font-black text-white hover:bg-[#1E293B]"
            >
              {isSavingCall ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
              حفظ
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onWhatsApp}
              className="h-9 gap-1.5 rounded-lg border-[#22C7A1]/40 px-3 text-xs font-black text-[#0E9E7E] hover:bg-[#ECFDF9]"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              واتساب
            </Button>
          </div>

          <button
            type="button"
            onClick={onOpenCrm}
            className="mt-2.5 w-full rounded-lg border border-[#E5EAF1] bg-white py-2 text-[11px] font-black text-slate-600 transition-colors hover:border-[#22C7A1]/40 hover:text-[#0E9E7E]"
          >
            فتح سجل CRM الكامل
          </button>
        </div>
      </Panel>

      {/* ===== Unified timeline ===== */}
      <Panel>
        <PanelHeader
          eyebrow="Timeline"
          title="سجل العقد الموحد"
          icon={Activity}
          tone="bg-[#7C83F6]/10 text-[#4F46E5]"
        />
        <div className="max-h-[420px] overflow-y-auto">
          {timeline.map((event, index) => {
            const Icon = event.icon;
            return (
              <div
                key={`${event.title}-${event.date}-${index}`}
                className="relative grid grid-cols-[auto_1fr] gap-3 px-4 py-3 [&:not(:last-child)]:after:absolute [&:not(:last-child)]:after:bottom-0 [&:not(:last-child)]:after:right-[35px] [&:not(:last-child)]:after:top-11 [&:not(:last-child)]:after:w-px [&:not(:last-child)]:after:bg-[#E5EAF1]"
              >
                <span
                  className={cn(
                    'relative z-10 flex h-8 w-8 items-center justify-center rounded-lg',
                    event.tone === 'success' && 'bg-[#22C7A1]/12 text-[#0E9E7E]',
                    event.tone === 'warning' && 'bg-[#F59E0B]/12 text-[#B45309]',
                    event.tone === 'neutral' && 'bg-[#F6F8FB] text-slate-500',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <p className="truncate text-xs font-black text-[#0F172A]">{event.title}</p>
                    <time className="shrink-0 text-[10px] font-bold text-slate-400" dir="ltr">
                      {event.date ? format(new Date(event.date), 'dd MMM yyyy', { locale: ar }) : '—'}
                    </time>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{event.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </aside>
  );
}
