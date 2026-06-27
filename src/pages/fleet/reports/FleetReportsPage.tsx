import React, { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Download,
  FileSpreadsheet,
  Gauge,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { cn } from '@/lib/utils';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';
import type { DateFilterPeriod, ExportFormat, ReportFilters as IReportFilters } from './types/reports.types';
import {
  useFleetAnalytics,
  useFleetStatus,
  useInsuranceRegistrationReport,
  useInsuranceRegistrationSummary,
  useMaintenanceReport,
  useMonthlyRevenue,
  useTopPerformingVehicles,
  useVehiclesNeedingMaintenance,
  useVehiclesReport,
} from './hooks/useFleetReports';

const theme = {
  text: systemColorPattern.colors.text,
  muted: systemColorPattern.colors.secondaryText,
  border: systemColorPattern.colors.border,
  surface: '#FFFFFF',
  page: '#F4F7FA',
  navy: '#173A63',
  success: systemColorPattern.colors.success,
  info: systemColorPattern.colors.info,
  alert: systemColorPattern.colors.alert,
  amber: '#F59E0B',
  focus: systemColorPattern.colors.focus,
};

const periodOptions: Array<{ label: string; value: DateFilterPeriod }> = [
  { label: 'اليوم', value: 'today' },
  { label: 'الأسبوع', value: 'week' },
  { label: 'الشهر', value: 'month' },
  { label: 'الربع', value: 'quarter' },
  { label: 'السنة', value: 'year' },
];

const statusLabels: Record<string, string> = {
  available: 'متاحة',
  rented: 'مؤجرة',
  maintenance: 'صيانة',
  reserved: 'محجوزة',
  pending: 'معلقة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
};

type ReportView = 'overview' | 'financial' | 'maintenance' | 'compliance';

const viewOptions: Array<{ label: string; value: ReportView; icon: React.ElementType }> = [
  { label: 'لوحة الأداء', value: 'overview', icon: Gauge },
  { label: 'التحليل المالي', value: 'financial', icon: Wallet },
  { label: 'الصيانة', value: 'maintenance', icon: Wrench },
  { label: 'التأمين والتسجيل', value: 'compliance', icon: ShieldCheck },
];

const chartColors = [theme.success, theme.info, theme.amber, theme.focus, theme.alert];

const formatPercent = (value?: number) => `${Math.round(value || 0)}%`;

const ShellCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className={cn('rounded-lg border bg-white shadow-sm', className)}
    style={{ borderColor: theme.border }}
  >
    {children}
  </motion.div>
);

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  hint: string;
  icon: React.ElementType;
  tone: 'navy' | 'success' | 'info' | 'warning' | 'danger';
}> = ({ label, value, hint, icon: Icon, tone }) => {
  const color =
    tone === 'success' ? theme.success :
    tone === 'info' ? theme.info :
    tone === 'warning' ? theme.amber :
    tone === 'danger' ? theme.alert :
    theme.navy;

  return (
    <ShellCard className="min-h-[132px] p-4">
      <div className="flex h-full items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: theme.muted }}>{label}</p>
          <p className="mt-2 text-2xl font-black tracking-normal" style={{ color: theme.text }}>{value}</p>
          <p className="mt-2 text-xs font-medium leading-5" style={{ color: theme.muted }}>{hint}</p>
        </div>
        <span className="rounded-lg p-3" style={{ backgroundColor: `${color}14`, color }}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </ShellCard>
  );
};

const SectionTitle: React.FC<{ title: string; subtitle?: string; icon: React.ElementType; action?: React.ReactNode }> = ({
  title,
  subtitle,
  icon: Icon,
  action,
}) => (
  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div className="flex items-start gap-3">
      <span className="rounded-lg p-2.5" style={{ backgroundColor: `${theme.navy}10`, color: theme.navy }}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-xl font-black" style={{ color: theme.text }}>{title}</h2>
        {subtitle && <p className="mt-1 text-sm font-medium" style={{ color: theme.muted }}>{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

const FleetReportsPage: React.FC = () => {
  const { formatCurrency } = useCurrencyFormatter();
  const [activeView, setActiveView] = useState<ReportView>('overview');
  const [filters, setFilters] = useState<IReportFilters>({
    period: 'month',
    compareWithPrevious: false,
  });

  const { data: analytics, isLoading: analyticsLoading } = useFleetAnalytics();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehiclesReport(filters);
  const { data: maintenance = [], isLoading: maintenanceLoading } = useMaintenanceReport(filters);
  const { data: monthlyRevenue = [], isLoading: revenueLoading } = useMonthlyRevenue();
  const { data: fleetStatus, isLoading: statusLoading } = useFleetStatus();
  const topVehicles = useTopPerformingVehicles(8);
  const maintenanceAlerts = useVehiclesNeedingMaintenance();
  const { data: insuranceReport = [], isLoading: insuranceLoading } = useInsuranceRegistrationReport();
  const { data: insuranceSummary } = useInsuranceRegistrationSummary();

  const isLoading = analyticsLoading || vehiclesLoading || maintenanceLoading || revenueLoading || statusLoading || insuranceLoading;

  const healthScore = useMemo(() => {
    if (!analytics || !insuranceSummary) return 0;
    const utilization = Math.min(analytics.utilizationRate || 0, 100);
    const availability = analytics.totalVehicles > 0 ? ((analytics.availableVehicles + analytics.rentedVehicles) / analytics.totalVehicles) * 100 : 0;
    const compliance = insuranceSummary.total_vehicles > 0 ? (insuranceSummary.fully_compliant / insuranceSummary.total_vehicles) * 100 : 0;
    const maintenancePenalty = Math.min(analytics.maintenanceRate || 0, 40);
    return Math.max(0, Math.round((utilization * 0.35) + (availability * 0.25) + (compliance * 0.3) + (100 - maintenancePenalty) * 0.1));
  }, [analytics, insuranceSummary]);

  const fleetStatusData = useMemo(() => ([
    { name: 'متاحة', value: fleetStatus?.available || 0, color: theme.success },
    { name: 'مؤجرة', value: fleetStatus?.rented || 0, color: theme.info },
    { name: 'صيانة', value: fleetStatus?.maintenance || 0, color: theme.amber },
    { name: 'محجوزة', value: fleetStatus?.reserved || 0, color: theme.focus },
  ]), [fleetStatus]);

  const decisionItems = [
    {
      title: 'مركبات تحتاج صيانة',
      value: maintenanceAlerts.length,
      detail: maintenanceAlerts.length > 0 ? 'راجع أوامر الصيانة قبل تأثيرها على الجاهزية' : 'لا توجد تنبيهات صيانة حرجة',
      tone: maintenanceAlerts.length > 0 ? theme.amber : theme.success,
      icon: Wrench,
      view: 'maintenance' as ReportView,
    },
    {
      title: 'التأمين والتسجيل',
      value: insuranceSummary?.needs_attention || 0,
      detail: 'مركبات تحتاج متابعة وثائق أو تجديدات',
      tone: (insuranceSummary?.needs_attention || 0) > 0 ? theme.alert : theme.success,
      icon: ShieldCheck,
      view: 'compliance' as ReportView,
    },
    {
      title: 'صحة الأسطول',
      value: `${healthScore}/100`,
      detail: healthScore >= 75 ? 'الأداء التشغيلي جيد' : 'هناك فرصة لتحسين الجاهزية والتحصيل',
      tone: healthScore >= 75 ? theme.success : theme.info,
      icon: Gauge,
      view: 'overview' as ReportView,
    },
  ];

  const handleExport = useCallback((format: ExportFormat) => {
    toast.success(`جاري تجهيز تقرير الأسطول بصيغة ${format.toUpperCase()}`);
  }, []);

  const handleRefresh = useCallback(() => {
    toast.success('تم طلب تحديث بيانات التقارير');
  }, []);

  if (isLoading && !analytics) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: theme.page }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: `${theme.success}55`, borderTopColor: 'transparent' }} />
          <p className="text-sm font-bold" style={{ color: theme.muted }}>جاري تحميل تقارير الأسطول...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: theme.page }}>
      <main className="w-full space-y-6 px-6 py-6">
        <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
          <ShellCard className="overflow-hidden">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="flex h-14 w-14 items-center justify-center rounded-lg text-white" style={{ backgroundColor: theme.navy }}>
                      <BarChart3 className="h-7 w-7" />
                    </span>
                    <div>
                      <p className="text-sm font-black" style={{ color: theme.success }}>مركز تقارير الأسطول</p>
                      <h1 className="mt-1 text-3xl font-black tracking-normal" style={{ color: theme.text }}>
                        اقرأ أداء الأسطول واتخذ القرار بسرعة
                      </h1>
                      <p className="mt-2 max-w-3xl text-sm font-medium leading-6" style={{ color: theme.muted }}>
                        لوحة جديدة تجمع التشغيل، الإيراد، الصيانة، والامتثال في مكان واحد بدل التنقل بين تقارير منفصلة.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" className="gap-2 bg-white" onClick={handleRefresh}>
                      <RefreshCw className="h-4 w-4" />
                      تحديث
                    </Button>
                    <Button className="gap-2 text-white" style={{ backgroundColor: theme.navy }} onClick={() => handleExport('pdf')}>
                      <Download className="h-4 w-4" />
                      تصدير PDF
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {decisionItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        type="button"
                        key={item.title}
                        onClick={() => setActiveView(item.view)}
                        className="group rounded-lg border bg-white p-4 text-right transition-all hover:-translate-y-0.5 hover:shadow-md"
                        style={{ borderColor: `${item.tone}45` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black" style={{ color: theme.text }}>{item.title}</p>
                            <p className="mt-2 text-xs font-medium leading-5" style={{ color: theme.muted }}>{item.detail}</p>
                          </div>
                          <span className="rounded-lg p-2.5" style={{ backgroundColor: `${item.tone}14`, color: item.tone }}>
                            <Icon className="h-5 w-5" />
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-2xl font-black" style={{ color: item.tone }}>{item.value}</span>
                          <span className="inline-flex items-center gap-1 text-xs font-black" style={{ color: theme.navy }}>
                            فتح التقرير
                            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t bg-slate-50 p-6 xl:border-r xl:border-t-0" style={{ borderColor: theme.border }}>
                <p className="text-sm font-black" style={{ color: theme.text }}>فترة التقرير</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {periodOptions.map((period) => (
                    <button
                      type="button"
                      key={period.value}
                      onClick={() => setFilters((current) => ({ ...current, period: period.value }))}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-bold transition-colors',
                        filters.period === period.value ? 'text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                      )}
                      style={{
                        borderColor: filters.period === period.value ? theme.navy : theme.border,
                        backgroundColor: filters.period === period.value ? theme.navy : undefined,
                      }}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5 rounded-lg border bg-white p-4" style={{ borderColor: theme.border }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: theme.muted }}>صحة الأسطول</span>
                    <span className="text-2xl font-black" style={{ color: healthScore >= 75 ? theme.success : theme.amber }}>{healthScore}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${healthScore}%`, backgroundColor: healthScore >= 75 ? theme.success : theme.amber }} />
                  </div>
                </div>
              </div>
            </div>
          </ShellCard>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="إجمالي المركبات" value={analytics?.totalVehicles || 0} hint={`${analytics?.availableVehicles || 0} متاحة و ${analytics?.rentedVehicles || 0} مؤجرة`} icon={Car} tone="navy" />
          <MetricCard label="معدل الاستخدام" value={formatPercent(analytics?.utilizationRate)} hint="نسبة المركبات المؤجرة من إجمالي الأسطول" icon={Activity} tone="success" />
          <MetricCard label="الإيراد الشهري" value={formatCurrency(analytics?.totalRevenue || 0)} hint={`متوسط ${formatCurrency(analytics?.averageRevenue || 0)} لكل مركبة`} icon={Wallet} tone="info" />
          <MetricCard label="تكلفة الصيانة" value={formatCurrency(analytics?.monthlyMaintenanceCost || 0)} hint={`${maintenance.length} أوامر صيانة مسجلة`} icon={Wrench} tone={(analytics?.monthlyMaintenanceCost || 0) > 0 ? 'warning' : 'success'} />
        </section>

        <section className="sticky top-0 z-20 rounded-lg border bg-white/95 p-2 shadow-sm backdrop-blur" style={{ borderColor: theme.border }}>
          <div className="flex gap-2 overflow-x-auto">
            {viewOptions.map((view) => {
              const Icon = view.icon;
              const active = activeView === view.value;
              return (
                <button
                  type="button"
                  key={view.value}
                  onClick={() => setActiveView(view.value)}
                  className={cn(
                    'inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-black transition-colors',
                    active ? 'text-white' : 'text-slate-600 hover:bg-slate-50'
                  )}
                  style={{ backgroundColor: active ? theme.navy : undefined }}
                >
                  <Icon className="h-4 w-4" />
                  {view.label}
                </button>
              );
            })}
            <div className="mr-auto flex shrink-0 gap-2">
              <button type="button" onClick={() => handleExport('excel')} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 text-sm font-bold" style={{ borderColor: theme.border }}>
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </button>
              <button type="button" onClick={() => handleExport('csv')} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 text-sm font-bold" style={{ borderColor: theme.border }}>
                <Download className="h-4 w-4" />
                CSV
              </button>
            </div>
          </div>
        </section>

        {activeView === 'overview' && (
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <ShellCard className="p-5">
              <SectionTitle title="اتجاه الإيرادات والصيانة" subtitle="آخر ستة أشهر: الإيراد، الربح، وتكلفة الصيانة" icon={TrendingUp} />
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue}>
                    <defs>
                      <linearGradient id="fleetRevenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.success} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={theme.success} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.muted }} />
                    <YAxis tick={{ fontSize: 12, fill: theme.muted }} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                    <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? 'الإيراد' : name === 'profit' ? 'الربح' : 'الصيانة']} contentStyle={{ borderRadius: 8, borderColor: theme.border }} />
                    <Area type="monotone" dataKey="revenue" stroke={theme.success} strokeWidth={3} fill="url(#fleetRevenueFill)" />
                    <Area type="monotone" dataKey="profit" stroke={theme.info} strokeWidth={2} fill="transparent" />
                    <Area type="monotone" dataKey="maintenance" stroke={theme.amber} strokeWidth={2} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ShellCard>

            <ShellCard className="p-5">
              <SectionTitle title="توزيع حالة الأسطول" subtitle="قراءة مباشرة لجاهزية المركبات" icon={Gauge} />
              <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[220px_1fr] xl:grid-cols-1 2xl:grid-cols-[220px_1fr]">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={fleetStatusData} dataKey="value" innerRadius={58} outerRadius={90} paddingAngle={3}>
                        {fleetStatusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, borderColor: theme.border }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {fleetStatusData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-lg border px-3 py-3" style={{ borderColor: theme.border }}>
                      <span className="flex items-center gap-2 text-sm font-bold" style={{ color: theme.text }}>
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="text-lg font-black" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ShellCard>
          </section>
        )}

        {activeView === 'financial' && (
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <ShellCard className="p-5">
              <SectionTitle title="الأداء المالي" subtitle="إيرادات، ربح، وهامش الأسطول" icon={Wallet} />
              <div className="space-y-3">
                {[
                  { label: 'إجمالي الإيرادات', value: formatCurrency(analytics?.totalRevenue || 0), color: theme.success },
                  { label: 'إجمالي الربح', value: formatCurrency(analytics?.totalProfit || 0), color: theme.info },
                  { label: 'هامش الربح', value: formatPercent(analytics?.profitMargin), color: theme.navy },
                  { label: 'قيمة الأسطول الدفترية', value: formatCurrency(analytics?.totalBookValue || 0), color: theme.focus },
                  { label: 'الاستهلاك المتراكم', value: formatCurrency(analytics?.totalDepreciation || 0), color: theme.alert },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                    <span className="text-sm font-bold" style={{ color: theme.muted }}>{item.label}</span>
                    <span className="text-lg font-black" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </ShellCard>

            <ShellCard className="p-5">
              <SectionTitle title="أفضل المركبات أداءً" subtitle="المركبات الأعلى إيرادًا حسب البيانات الحالية" icon={BarChart3} />
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topVehicles.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: theme.muted }} />
                    <YAxis dataKey="plate_number" type="category" tick={{ fontSize: 12, fill: theme.muted }} width={88} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 8, borderColor: theme.border }} />
                    <Bar dataKey="revenue" radius={[6, 6, 6, 6]}>
                      {topVehicles.slice(0, 8).map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ShellCard>
          </section>
        )}

        {activeView === 'maintenance' && (
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <ShellCard className="p-5">
              <SectionTitle title="ملخص الصيانة" subtitle="حالة أوامر الصيانة والتكلفة المقدرة" icon={Wrench} />
              <div className="space-y-3">
                {[
                  { label: 'أوامر الصيانة', value: maintenance.length, icon: Wrench, color: theme.navy },
                  { label: 'قيد التنفيذ', value: maintenance.filter((item) => item.status === 'in_progress').length, icon: Clock, color: theme.info },
                  { label: 'معلقة', value: maintenance.filter((item) => item.status === 'pending').length, icon: AlertTriangle, color: theme.amber },
                  { label: 'مكتملة', value: maintenance.filter((item) => item.status === 'completed').length, icon: CheckCircle2, color: theme.success },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border bg-white px-4 py-3" style={{ borderColor: theme.border }}>
                      <span className="flex items-center gap-2 text-sm font-bold" style={{ color: theme.text }}>
                        <Icon className="h-4 w-4" style={{ color: item.color }} />
                        {item.label}
                      </span>
                      <span className="text-xl font-black" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </ShellCard>

            <ShellCard className="p-5">
              <SectionTitle title="قائمة الصيانة الأخيرة" subtitle="أحدث المركبات التي تحتاج متابعة" icon={CalendarDays} />
              <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
                {(maintenanceAlerts.length > 0 ? maintenanceAlerts : maintenance).slice(0, 8).map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3" style={{ borderColor: theme.border }}>
                    <div>
                      <p className="text-base font-black" style={{ color: theme.text }}>{item.plate_number || 'مركبة غير محددة'}</p>
                      <p className="mt-1 text-sm font-medium" style={{ color: theme.muted }}>{item.maintenance_type || 'صيانة'} - {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString('ar-QA') : '-'}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black" style={{ color: theme.navy }}>{formatCurrency(item.estimated_cost || 0)}</p>
                      <span className="mt-1 inline-flex rounded-lg px-2 py-1 text-xs font-bold" style={{ backgroundColor: `${theme.amber}12`, color: theme.amber }}>
                        {statusLabels[item.status] || item.status || 'غير محدد'}
                      </span>
                    </div>
                  </div>
                ))}
                {maintenance.length === 0 && maintenanceAlerts.length === 0 && (
                  <div className="rounded-lg border border-dashed p-10 text-center" style={{ borderColor: theme.border }}>
                    <CheckCircle2 className="mx-auto mb-3 h-10 w-10" style={{ color: theme.success }} />
                    <p className="text-sm font-bold" style={{ color: theme.text }}>لا توجد أوامر صيانة حاليًا</p>
                  </div>
                )}
              </div>
            </ShellCard>
          </section>
        )}

        {activeView === 'compliance' && (
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <ShellCard className="p-5">
              <SectionTitle title="التأمين والتسجيل" subtitle="ملخص الامتثال لوثائق المركبات" icon={ShieldCheck} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { label: 'ملتزمة بالكامل', value: insuranceSummary?.fully_compliant || 0, color: theme.success },
                  { label: 'تحتاج متابعة', value: insuranceSummary?.needs_attention || 0, color: theme.alert },
                  { label: 'تأمين منتهي', value: insuranceSummary?.with_expired_insurance || 0, color: theme.amber },
                  { label: 'استمارة منتهية', value: insuranceSummary?.with_expired_registration || 0, color: theme.focus },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border bg-white p-4" style={{ borderColor: theme.border }}>
                    <p className="text-sm font-bold" style={{ color: theme.muted }}>{item.label}</p>
                    <p className="mt-2 text-2xl font-black" style={{ color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </ShellCard>

            <ShellCard className="p-5">
              <SectionTitle title="المركبات التي تحتاج إجراء" subtitle="أقرب حالات التأمين أو التسجيل التي تحتاج متابعة" icon={AlertTriangle} />
              <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
                {insuranceReport
                  .filter((item) => item.insurance_status !== 'valid' || item.registration_status !== 'valid')
                  .slice(0, 10)
                  .map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3" style={{ borderColor: theme.border }}>
                      <div>
                        <p className="text-base font-black" style={{ color: theme.text }}>{item.plate_number}</p>
                        <p className="mt-1 text-sm font-medium" style={{ color: theme.muted }}>{item.make} {item.model} {item.year}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-lg px-2 py-1 text-xs font-bold" style={{ backgroundColor: item.insurance_status === 'valid' ? `${theme.success}12` : `${theme.alert}12`, color: item.insurance_status === 'valid' ? theme.success : theme.alert }}>
                          التأمين: {item.insurance_status === 'valid' ? 'ساري' : item.insurance_status === 'expiring_soon' ? 'قريب الانتهاء' : item.insurance_status === 'expired' ? 'منتهي' : 'غير مسجل'}
                        </span>
                        <span className="rounded-lg px-2 py-1 text-xs font-bold" style={{ backgroundColor: item.registration_status === 'valid' ? `${theme.success}12` : `${theme.amber}12`, color: item.registration_status === 'valid' ? theme.success : theme.amber }}>
                          التسجيل: {item.registration_status === 'valid' ? 'ساري' : item.registration_status === 'expiring_soon' ? 'قريب الانتهاء' : item.registration_status === 'expired' ? 'منتهي' : 'غير مسجل'}
                        </span>
                      </div>
                    </div>
                  ))}
                {insuranceReport.filter((item) => item.insurance_status !== 'valid' || item.registration_status !== 'valid').length === 0 && (
                  <div className="rounded-lg border border-dashed p-10 text-center" style={{ borderColor: theme.border }}>
                    <CheckCircle2 className="mx-auto mb-3 h-10 w-10" style={{ color: theme.success }} />
                    <p className="text-sm font-bold" style={{ color: theme.text }}>كل الوثائق المسجلة سليمة</p>
                  </div>
                )}
              </div>
            </ShellCard>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ShellCard className="p-5">
            <SectionTitle title="أوامر سريعة" subtitle="إجراءات مرتبطة بالتقارير" icon={Download} />
            <div className="grid grid-cols-1 gap-2">
              <button type="button" onClick={() => handleExport('pdf')} className="rounded-lg border px-4 py-3 text-sm font-black transition-colors hover:bg-slate-50" style={{ borderColor: theme.border }}>تصدير تقرير تنفيذي PDF</button>
              <button type="button" onClick={() => handleExport('excel')} className="rounded-lg border px-4 py-3 text-sm font-black transition-colors hover:bg-slate-50" style={{ borderColor: theme.border }}>تصدير بيانات Excel</button>
              <button type="button" onClick={() => setFilters((current) => ({ ...current, compareWithPrevious: !current.compareWithPrevious }))} className="rounded-lg border px-4 py-3 text-sm font-black transition-colors hover:bg-slate-50" style={{ borderColor: theme.border }}>
                {filters.compareWithPrevious ? 'إلغاء المقارنة السابقة' : 'تفعيل المقارنة السابقة'}
              </button>
            </div>
          </ShellCard>

          <ShellCard className="p-5 xl:col-span-2">
            <SectionTitle title="ملخص المركبات" subtitle="قراءة سريعة لأهم المركبات في التقرير" icon={Car} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {vehicles.slice(0, 6).map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between rounded-lg border bg-white px-4 py-3" style={{ borderColor: theme.border }}>
                  <div>
                    <p className="text-sm font-black" style={{ color: theme.text }}>{vehicle.plate_number}</p>
                    <p className="mt-1 text-xs font-medium" style={{ color: theme.muted }}>{vehicle.make} {vehicle.model} {vehicle.year}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black" style={{ color: theme.navy }}>{formatCurrency(vehicle.monthly_rate || 0)}</p>
                    <span className="text-xs font-bold" style={{ color: theme.muted }}>{statusLabels[vehicle.status] || vehicle.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </ShellCard>
        </section>
      </main>
    </div>
  );
};

export default FleetReportsPage;
