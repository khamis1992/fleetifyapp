import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CalendarClock,
  Car,
  CheckCircle2,
  ClipboardList,
  FileText,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UserRound,
  Wallet,
  Wrench,
} from 'lucide-react';

import {
  DailyDecisionAction,
  DailyDecisionRisk,
  useDailyDecisionCenter,
} from '@/hooks/useDailyDecisionCenter';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { cn } from '@/lib/utils';

const priorityStyles = {
  high: 'border-red-200 bg-red-50 text-red-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const severityStyles = {
  critical: 'border-red-200 bg-red-50 text-red-700',
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const priorityLabel = {
  high: 'عاجل',
  medium: 'متوسط',
  low: 'متابعة',
};

const severityLabel = {
  critical: 'حرج',
  high: 'مرتفع',
  medium: 'متوسط',
  low: 'منخفض',
};

const OperationalAICenter: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data, isLoading, isFetching, refetch } = useDailyDecisionCenter();
  const metrics = data?.metrics;

  const openRoute = (route?: string) => {
    if (route) navigate(route);
  };

  if (isLoading) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 px-6 py-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="h-36 animate-pulse rounded-lg bg-white shadow-sm" />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-52 animate-pulse rounded-lg bg-white shadow-sm" />
            <div className="h-52 animate-pulse rounded-lg bg-white shadow-sm" />
            <div className="h-52 animate-pulse rounded-lg bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
                <Sparkles className="h-4 w-4" />
                {data?.source === 'longcat' ? 'تحليل LongCat' : 'تحليل ذكي داخلي'}
              </div>
              <h1 className="text-3xl font-black text-slate-950">مركز AI التشغيلي</h1>
              <p className="max-w-3xl text-sm font-medium leading-7 text-slate-500">
                {data?.summary || 'يعرض المركز أهم الحالات التي تحتاج متابعة اليوم حسب بيانات التحصيل والعقود والأسطول.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                لوحة التحكم
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                تحديث التحليل
                <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <Metric label="متوقع خلال 7 أيام" value={formatCurrency(data?.cashflow.next7Days || 0)} icon={Wallet} tone="emerald" />
            <Metric label="متوقع خلال 30 يوم" value={formatCurrency(data?.cashflow.next30Days || 0)} icon={Banknote} tone="sky" />
            <Metric label="متأخرات مفتوحة" value={formatCurrency(metrics?.collections.overdueAmount || 0)} icon={ShieldAlert} tone="red" />
            <Metric label="عملاء متأخرون" value={String(metrics?.collections.topCustomers.length || 0)} icon={UserRound} tone="amber" />
            <Metric label="عقود تحتاج إجراء" value={String(metrics?.contracts.endingSoonCount || 0)} icon={FileText} tone="blue" />
            <Metric label="مركبات تحتاج متابعة" value={String(metrics?.fleet.maintenanceRiskCount || 0)} icon={Wrench} tone="violet" />
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel title="ماذا أتابع اليوم؟" icon={ClipboardList}>
            <div className="space-y-3">
              {(data?.actions || []).map((action, index) => (
                <ActionRow key={`${action.title}-${index}`} action={action} onOpen={() => openRoute(action.route)} />
              ))}
            </div>
          </Panel>

          <Panel title="القرار المقترح" icon={CheckCircle2}>
            <div className="space-y-3">
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-7 text-emerald-800">
                {getMainDecision(data?.actions || [])}
              </p>
              <p className="text-sm leading-7 text-slate-500">
                {data?.cashflow.note || 'التوقع مبني على الفواتير المفتوحة وتواريخ الاستحقاق الحالية.'}
              </p>
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <Panel title="العملاء المتأخرون" icon={UserRound}>
            <div className="space-y-3">
              {(metrics?.collections.topCustomers || []).map((customer) => (
                <button
                  key={`${customer.customerName}-${customer.phone || 'no-phone'}`}
                  type="button"
                  onClick={() => navigate('/legal/delinquency')}
                  className="w-full rounded-lg border border-slate-200 bg-white p-4 text-right transition hover:border-red-200 hover:bg-red-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{customer.customerName}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {customer.phone || 'لا يوجد رقم جوال'} - {customer.invoices} فاتورة
                      </p>
                    </div>
                    <p className="text-sm font-black text-red-600">{formatCurrency(customer.amount)}</p>
                  </div>
                </button>
              ))}
              {emptyState(!metrics?.collections.topCustomers.length, 'لا يوجد عملاء متأخرون ضمن التحليل الحالي.')}
            </div>
          </Panel>

          <Panel title="العقود التي تحتاج إجراء" icon={CalendarClock}>
            <div className="space-y-3">
              {(metrics?.contracts.endingSoon || []).map((contract) => (
                <button
                  key={contract.contractNumber}
                  type="button"
                  onClick={() => navigate(contract.route)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-4 text-right transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{contract.customerName}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{contract.contractNumber}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-blue-700">{formatDate(contract.endDate)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{formatCurrency(contract.monthlyAmount)}</p>
                    </div>
                  </div>
                </button>
              ))}
              {emptyState(!metrics?.contracts.endingSoon.length, 'لا توجد عقود قريبة الانتهاء ضمن التحليل الحالي.')}
            </div>
          </Panel>

          <Panel title="مركبات تسبب خسارة أو تحتاج متابعة" icon={Car}>
            <div className="space-y-3">
              {(metrics?.fleet.maintenanceRiskVehicles || []).map((vehicle) => (
                <button
                  key={vehicle.plateNumber}
                  type="button"
                  onClick={() => navigate('/fleet/maintenance')}
                  className="w-full rounded-lg border border-slate-200 bg-white p-4 text-right transition hover:border-violet-200 hover:bg-violet-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{vehicle.plateNumber}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {vehicle.status || 'غير محدد'} - الصيانة القادمة {vehicle.nextServiceDue ? formatDate(vehicle.nextServiceDue) : 'غير محددة'}
                      </p>
                    </div>
                    <p className="text-sm font-black text-violet-700">{formatCurrency(vehicle.maintenanceCost)}</p>
                  </div>
                </button>
              ))}
              {metrics?.fleet.idleVehiclesCount ? (
                <button
                  type="button"
                  onClick={() => navigate('/fleet')}
                  className="w-full rounded-lg border border-amber-200 bg-amber-50 p-4 text-right text-sm font-bold text-amber-800"
                >
                  توجد {metrics.fleet.idleVehiclesCount} مركبة متاحة أو غير نشطة يمكن مراجعة تشغيلها.
                </button>
              ) : null}
              {emptyState(!metrics?.fleet.maintenanceRiskVehicles.length && !metrics?.fleet.idleVehiclesCount, 'لا توجد مركبات عالية المخاطر ضمن التحليل الحالي.')}
            </div>
          </Panel>
        </div>

        <Panel title="أهم المخاطر المالية أو التشغيلية" icon={AlertTriangle}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(data?.risks || []).map((risk, index) => (
              <RiskCard key={`${risk.title}-${index}`} risk={risk} />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

const Metric: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  tone: 'emerald' | 'sky' | 'red' | 'amber' | 'blue' | 'violet';
}> = ({ label, value, icon: Icon, tone }) => {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
        </div>
        <div className={cn('rounded-lg p-2', toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const Panel: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center gap-2">
      <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
    </div>
    {children}
  </section>
);

const ActionRow: React.FC<{ action: DailyDecisionAction; onOpen: () => void }> = ({ action, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="w-full rounded-lg border border-slate-200 bg-white p-4 text-right transition hover:border-slate-300 hover:bg-slate-50"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full border px-2 py-1 text-xs font-black', priorityStyles[action.priority])}>
            {priorityLabel[action.priority]}
          </span>
          <p className="font-black text-slate-950">{action.title}</p>
        </div>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{action.reason}</p>
      </div>
      <ArrowLeft className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
    </div>
  </button>
);

const RiskCard: React.FC<{ risk: DailyDecisionRisk }> = ({ risk }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="font-black text-slate-950">{risk.title}</p>
      <span className={cn('rounded-full border px-2 py-1 text-xs font-black', severityStyles[risk.severity])}>
        {severityLabel[risk.severity]}
      </span>
    </div>
    <p className="text-sm font-medium leading-6 text-slate-500">{risk.impact}</p>
  </div>
);

function getMainDecision(actions: DailyDecisionAction[]) {
  const highPriority = actions.find((action) => action.priority === 'high') || actions[0];
  if (!highPriority) {
    return 'لا توجد حالة عاجلة الآن. القرار المقترح هو متابعة المؤشرات فقط خلال اليوم.';
  }
  return `ابدأ بـ ${highPriority.title}. السبب: ${highPriority.reason}`;
}

function emptyState(show: boolean, message: string) {
  if (!show) return null;
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
      {message}
    </div>
  );
}

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat('en-GB').format(new Date(dateValue));
}

export default OperationalAICenter;
