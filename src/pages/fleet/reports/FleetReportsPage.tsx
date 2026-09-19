/**
 * Fleet Reports Page — rebuilt on the shared dashboard workspace design language (dw-*).
 * Data hooks and routes are unchanged; only the presentation layer was redesigned,
 * keeping every previous capability (period filter, exports, view sections, health score).
 */
import { useCallback, useMemo, useState, type CSSProperties, type ElementType, type FunctionComponent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronLeft,
  FileSpreadsheet,
  Gauge,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  Wrench,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import '@/components/dashboard/workspace/dashboard-workspace.css';
import { fleetGradient, formatDashboardCurrency as money } from '@/components/dashboard/workspace/model';
import type {
  DateFilterPeriod,
  ExportFormat,
  FleetStatusData,
  ReportFilters as IReportFilters,
} from './types/reports.types';
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
import './fleet-reports-workspace.css';

const chartPalette = {
  revenue: '#2f7966',
  profit: '#7c9e65',
  maintenance: '#d5ad69',
  ticks: '#7d8975',
  grid: '#edf1e7',
};
const barColors = ['#2f7966', '#7c9e65', '#9db88a', '#d5ad69'];
const tooltipStyle: CSSProperties = {
  borderRadius: 9,
  border: '1px solid #dfe5d9',
  fontSize: 11,
  fontFamily: 'Cairo, sans-serif',
  direction: 'rtl',
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

const statusTone: Record<string, 'ok' | 'warn' | 'risk' | 'info'> = {
  available: 'ok',
  rented: 'info',
  maintenance: 'warn',
  reserved: 'info',
  pending: 'warn',
  in_progress: 'warn',
  completed: 'ok',
};

const docStatusLabels: Record<string, string> = {
  valid: 'ساري',
  expiring_soon: 'قريب الانتهاء',
  expired: 'منتهي',
  none: 'غير مسجل',
};
const docStatusTone = (status: string): 'ok' | 'warn' | 'risk' | 'info' =>
  status === 'valid' ? 'ok' : status === 'expiring_soon' ? 'warn' : status === 'expired' ? 'risk' : 'info';

const formatPercent = (value?: number) => `${Math.round(value || 0)}%`;

type FleetRow = { label: string; value: number; color: string; path: string; percent: number };

/** Same visual breakdown as the dashboard readiness ring, scoped to the reports data shape. */
function fleetBreakdown(fleet: FleetStatusData): FleetRow[] {
  const rows: FleetRow[] = [
    { label: 'متاحة للتأجير', value: fleet.available, color: '#7c9e65', path: '/fleet?status=available', percent: 0 },
    { label: 'مؤجرة', value: fleet.rented, color: '#2f7966', path: '/fleet?status=rented', percent: 0 },
    { label: 'في الصيانة', value: fleet.maintenance, color: '#d5ad69', path: '/fleet/maintenance', percent: 0 },
    { label: 'محجوزة', value: fleet.reserved, color: '#83a9b2', path: '/fleet/reservations', percent: 0 },
  ];
  const rest = Math.max(0, fleet.total - rows.reduce((sum, row) => sum + row.value, 0));
  return [...rows, { label: 'حالات أخرى', value: rest, color: '#d2d9cd', path: '/fleet', percent: 0 }].map((row) => ({
    ...row,
    percent: fleet.total > 0 ? (row.value / fleet.total) * 100 : 0,
  }));
}

function Panel({
  number,
  title,
  subtitle,
  action,
  className = '',
  id,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
  className?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`dw-panel ${className}`}>
      <header className="dw-panel-heading">
        <div className="dw-panel-title">
          <span className="dw-section-number">{number}</span>
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function LoadingState({ label = 'جاري تحميل البيانات…' }: { label?: string }) {
  return (
    <div className="dw-state" role="status">
      <RefreshCw className="animate-spin" size={20} />
      <p>{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: ElementType; message: string }) {
  return (
    <div className="dw-state">
      <Icon size={28} />
      <p>{message}</p>
    </div>
  );
}

const FleetReportsPage: FunctionComponent = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<IReportFilters>({
    period: 'month',
    compareWithPrevious: false,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now());

  const { data: analytics, isLoading: analyticsLoading } = useFleetAnalytics();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehiclesReport(filters);
  const { data: maintenance = [], isLoading: maintenanceLoading } = useMaintenanceReport(filters);
  const { data: monthlyRevenue = [], isLoading: revenueLoading } = useMonthlyRevenue();
  const { data: fleetStatus, isLoading: statusLoading } = useFleetStatus();
  const topVehicles = useTopPerformingVehicles(8);
  const maintenanceAlerts = useVehiclesNeedingMaintenance();
  const { data: insuranceReport = [], isLoading: insuranceLoading } = useInsuranceRegistrationReport();
  const { data: insuranceSummary } = useInsuranceRegistrationSummary();

  const healthScore = useMemo(() => {
    if (!analytics || !insuranceSummary) return 0;
    const utilization = Math.min(analytics.utilizationRate || 0, 100);
    const availability =
      analytics.totalVehicles > 0
        ? ((analytics.availableVehicles + analytics.rentedVehicles) / analytics.totalVehicles) * 100
        : 0;
    const compliance =
      insuranceSummary.total_vehicles > 0
        ? (insuranceSummary.fully_compliant / insuranceSummary.total_vehicles) * 100
        : 0;
    const maintenancePenalty = Math.min(analytics.maintenanceRate || 0, 40);
    return Math.max(
      0,
      Math.round(utilization * 0.35 + availability * 0.25 + compliance * 0.3 + (100 - maintenancePenalty) * 0.1),
    );
  }, [analytics, insuranceSummary]);

  const fleetRows = useMemo(() => (fleetStatus ? fleetBreakdown(fleetStatus) : []), [fleetStatus]);
  const occupancy = fleetStatus && fleetStatus.total > 0 ? Math.round((fleetStatus.rented / fleetStatus.total) * 100) : 0;
  const maintenanceCostRatio =
    analytics && analytics.totalRevenue > 0 ? (analytics.monthlyMaintenanceCost / analytics.totalRevenue) * 100 : 0;

  const openMaintenance = maintenanceAlerts.length;
  const vehiclesNeedingDocs = insuranceReport.filter(
    (item) => item.insurance_status !== 'valid' || item.registration_status !== 'valid',
  ).length;
  const expiredDocs = insuranceReport.filter(
    (item) => item.insurance_status === 'expired' || item.registration_status === 'expired',
  ).length;

  const insightRows = useMemo(
    () => [
      {
        key: 'maintenance',
        href: '#fr-maintenance',
        icon: Wrench,
        urgent: openMaintenance > 0,
        title: 'أوامر صيانة مفتوحة',
        reason:
          openMaintenance > 0
            ? 'راجع أوامر الصيانة قبل تأثيرها على جاهزية المركبات'
            : 'لا توجد أوامر صيانة مفتوحة حالياً',
        badge: `${openMaintenance} أمر`,
        track: undefined as number | undefined,
      },
      {
        key: 'docs',
        href: '#fr-compliance',
        icon: ShieldAlert,
        urgent: expiredDocs > 0,
        title: 'وثائق تحتاج متابعة',
        reason: 'تأمين أو استمارة منتهية أو تنتهي خلال 30 يوماً',
        badge: `${vehiclesNeedingDocs} مركبة`,
        track: undefined as number | undefined,
      },
      {
        key: 'health',
        href: '#fr-readiness',
        icon: Gauge,
        urgent: healthScore < 75,
        title: 'صحة الأسطول',
        reason: healthScore >= 75 ? 'الأداء التشغيلي جيد ومستقر' : 'هناك فرصة لتحسين الجاهزية والتحصيل',
        badge: `${healthScore}/100`,
        track: healthScore as number | undefined,
      },
    ],
    [openMaintenance, expiredDocs, vehiclesNeedingDocs, healthScore],
  );

  const handleExport = useCallback((format: ExportFormat) => {
    toast.success(`جاري تجهيز تقرير الأسطول بصيغة ${format.toUpperCase()}`);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['fleet-vehicles-report'] }),
        queryClient.invalidateQueries({ queryKey: ['fleet-maintenance-report'] }),
        queryClient.invalidateQueries({ queryKey: ['fleet-monthly-revenue'] }),
        queryClient.invalidateQueries({ queryKey: ['fleet-status-report'] }),
        queryClient.invalidateQueries({ queryKey: ['fleet-insurance-registration-report'] }),
      ]);
      setRefreshedAt(Date.now());
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const triggerSearch = useCallback(() => {
    document.dispatchEvent(new Event('fleetify:open-global-search'));
  }, []);

  const metricValue = (loading: boolean, value: string | number | undefined) =>
    loading || value === undefined ? '—' : value;

  const metrics = [
    {
      label: 'إجمالي الأسطول',
      value: metricValue(analyticsLoading, analytics?.totalVehicles),
      hint: analytics ? `${analytics.availableVehicles} متاحة و ${analytics.rentedVehicles} مؤجرة` : 'حالة المركبات الحالية',
      icon: Car,
      path: '/fleet',
      accent: true,
    },
    {
      label: 'معدل الإشغال',
      value: metricValue(analyticsLoading, analytics ? formatPercent(analytics.utilizationRate) : undefined),
      hint: 'نسبة المركبات المؤجرة من إجمالي الأسطول',
      icon: Gauge,
      path: '/fleet',
      accent: false,
    },
    {
      label: 'الإيراد الشهري',
      value: metricValue(analyticsLoading, analytics ? money(analytics.totalRevenue) : undefined),
      hint: analytics ? `متوسط ${money(analytics.averageRevenue)} لكل مركبة` : 'من العقود النشطة',
      icon: Wallet,
      path: '/finance',
      accent: false,
    },
    {
      label: 'تكلفة الصيانة',
      value: metricValue(analyticsLoading, analytics ? money(analytics.monthlyMaintenanceCost) : undefined),
      hint: `${maintenance.length} أمر صيانة مسجل`,
      icon: Wrench,
      path: '/fleet/maintenance',
      accent: false,
    },
  ];

  const vehiclesNeedingDocsList = insuranceReport.filter(
    (item) => item.insurance_status !== 'valid' || item.registration_status !== 'valid',
  );
  const urgentVehicles = vehiclesNeedingDocsList.slice(0, 6);
  const urgentVehiclesTotal = vehiclesNeedingDocsList.length;
  // Compliance tiles share the list's definition so counts stay consistent on screen.
  const fullyCompliantVehicles = insuranceReport.length - urgentVehiclesTotal;
  const expiredInsuranceCount = insuranceReport.filter((item) => item.insurance_status === 'expired').length;
  const expiredRegistrationCount = insuranceReport.filter((item) => item.registration_status === 'expired').length;

  const maintenanceRows = (maintenanceAlerts.length > 0 ? maintenanceAlerts : maintenance).slice(0, 8);
  const maxVehicleRate = topVehicles.length > 0 ? Math.max(...topVehicles.map((vehicle) => vehicle.monthly_rate)) : 0;

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> الأسطول <span>/</span> التقارير
            </div>
            <h1>تقارير الأسطول</h1>
            <p>قراءة شاملة لأداء المركبات: التشغيل والإيراد والصيانة والامتثال في مكان واحد.</p>
          </div>
          <div className="dw-header-tools">
            <button className="dw-search-button" onClick={triggerSearch}>
              <Search size={17} />
              <span>البحث في النظام</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="dw-icon-button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="تحديث بيانات التقارير"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <div className="dw-daybar">
          <div className="dw-date">
            <CalendarDays size={17} />
            <span>{new Date().toLocaleDateString('ar-QA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="dw-primary-actions">
            <button className="dw-button" onClick={() => handleExport('csv')}>
              تصدير CSV
            </button>
            <button className="dw-button" onClick={() => handleExport('excel')}>
              <FileSpreadsheet size={16} />
              تصدير Excel
            </button>
            <button className="dw-button dw-button-primary" onClick={() => handleExport('pdf')}>
              <Printer size={16} />
              تقرير PDF تنفيذي
            </button>
          </div>
        </div>

        <section className="dw-metrics" aria-label="المؤشرات الرئيسية">
          {metrics.map((metric) => (
            <Link key={metric.label} to={metric.path} className={`dw-metric ${metric.accent ? 'dw-metric-accent' : ''}`}>
              <div className="dw-metric-top">
                <span>{metric.label}</span>
                <metric.icon size={19} />
              </div>
              <strong>{metric.value}</strong>
              <div className="dw-metric-bottom">
                <small>{metric.hint}</small>
              </div>
            </Link>
          ))}
        </section>

        <div className="dw-main-grid">
          <Panel number="01" title="أولويات المتابعة" subtitle="الحالات التي تستحق انتباهك أولاً" className="fr-panel-main">
            <div className="dw-priority-toolbar">
              <div className="dw-filters" role="group" aria-label="فترة التقرير">
                {periodOptions.map((period) => (
                  <button
                    key={period.value}
                    aria-pressed={filters.period === period.value}
                    onClick={() => setFilters((current) => ({ ...current, period: period.value }))}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
              <span className="dw-priority-note">
                <CalendarDays size={13} />
                فترة التقرير
              </span>
            </div>
            <div className="dw-priority-list" aria-live="polite">
              {insightRows.map((row) => {
                const Icon = row.icon;
                return (
                  <a key={row.key} href={row.href} className="dw-priority-row">
                    <span className={`dw-priority-icon ${row.urgent ? 'is-urgent' : ''}`}>
                      <Icon size={19} />
                    </span>
                    <div className="fr-row-copy">
                      <h3>{row.title}</h3>
                      <p>{row.reason}</p>
                      {row.track !== undefined && (
                        <div className="dw-forecast-track fr-row-track" aria-hidden="true">
                          <i style={{ width: `${Math.max(0, Math.min(100, row.track))}%`, background: row.track >= 75 ? '#7c9e65' : '#d5ad69' }} />
                        </div>
                      )}
                    </div>
                    <span className={`dw-priority-badge ${row.urgent ? 'is-urgent' : ''}`}>{row.badge}</span>
                    <ChevronLeft className="dw-row-arrow" size={16} />
                  </a>
                );
              })}
            </div>
            <div className="dw-panel-foot">
              <ShieldCheck size={14} />
              <span>اختر أي حالة للانتقال إلى تفاصيلها أسفل الصفحة مباشرة.</span>
            </div>
          </Panel>

          <Panel number="02" title="جاهزية الأسطول" subtitle="توزيع جميع المركبات حسب الحالة" className="fr-panel-side" id="fr-readiness">
            {statusLoading ? (
              <LoadingState />
            ) : (
              <>
                <div className="dw-fleet-visual">
                  <div
                    className="dw-fleet-ring"
                    style={{ background: fleetGradient(fleetRows) }}
                    role="img"
                    aria-label={`نسبة إشغال الأسطول ${occupancy}%`}
                  >
                    <div>
                      <strong>
                        {fleetStatus ? occupancy : '—'}
                        <small>%</small>
                      </strong>
                      <span>نسبة الإشغال</span>
                    </div>
                  </div>
                  <div className="dw-fleet-annotation">
                    <span>جاهزة للانطلاق</span>
                    <strong>{fleetStatus?.available ?? '—'}</strong>
                    <small>مركبة متاحة للتأجير</small>
                    <Link to="/fleet?status=available">
                      عرض المتاح
                      <ArrowLeft size={13} />
                    </Link>
                  </div>
                </div>
                <div className="dw-fleet-legend">
                  {fleetRows.map((row) => (
                    <Link key={row.label} to={row.path}>
                      <i style={{ background: row.color }} />
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                      <small>{Math.round(row.percent)}%</small>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </Panel>

          <Panel number="03" title="اتجاه الإيراد والتكاليف" subtitle="آخر ستة أشهر: الإيراد والربح وتكلفة الصيانة" className="fr-panel-main">
            {revenueLoading ? (
              <LoadingState />
            ) : monthlyRevenue.length === 0 ? (
              <EmptyState icon={BarChart3} message="لا توجد بيانات إيرادات متاحة حالياً" />
            ) : (
              <div className="fr-chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue} margin={{ top: 6, right: 12, left: 12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="frRevenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartPalette.revenue} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={chartPalette.revenue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: chartPalette.ticks }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 10, fill: chartPalette.ticks }}
                      tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                      axisLine={false}
                      tickLine={false}
                      width={38}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number, name: string) => [
                        money(value),
                        name === 'revenue' ? 'الإيراد' : name === 'profit' ? 'الربح' : 'الصيانة',
                      ]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke={chartPalette.revenue} strokeWidth={2} fill="url(#frRevenueFill)" />
                    <Area type="monotone" dataKey="profit" stroke={chartPalette.profit} strokeWidth={2} fill="transparent" />
                    <Area type="monotone" dataKey="maintenance" stroke={chartPalette.maintenance} strokeWidth={2} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel number="04" title="الملخص المالي للأسطول" subtitle="الإيراد والربح والقيمة الدفترية" className="fr-panel-side">
            {analyticsLoading || !analytics ? (
              <LoadingState />
            ) : (
              <div className="fr-financial">
                {[
                  { label: 'إجمالي الإيرادات الشهرية', value: money(analytics.totalRevenue), track: undefined },
                  { label: 'صافي الربح (تقديري)', value: money(analytics.totalProfit), track: undefined },
                  {
                    label: 'هامش الربح',
                    value: formatPercent(analytics.profitMargin),
                    track: Math.max(0, Math.min(100, analytics.profitMargin || 0)),
                  },
                  { label: 'القيمة الدفترية للأسطول', value: money(analytics.totalBookValue), track: undefined },
                  { label: 'الاستهلاك المتراكم', value: money(analytics.totalDepreciation), track: undefined },
                  {
                    label: 'تكلفة الصيانة من الإيراد',
                    value: formatPercent(maintenanceCostRatio),
                    track: Math.max(0, Math.min(100, maintenanceCostRatio)),
                  },
                ].map((row, index) => (
                  <div key={row.label} className="dw-forecast-row">
                    <div>
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                    {row.track !== undefined && (
                      <div className="dw-forecast-track" aria-hidden="true">
                        <i style={{ width: `${row.track}%`, background: index === 5 ? '#d5ad69' : '#7c9e65' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel number="05" title="أعلى المركبات إيراداً" subtitle="المركبات المؤجرة الأعلى قيمة تعاقد" className="fr-panel-side">
            {analyticsLoading ? (
              <LoadingState />
            ) : topVehicles.length === 0 ? (
              <EmptyState icon={Car} message="لا توجد مركبات مؤجرة لعرض الأداء" />
            ) : (
              <div className="fr-vehicle-rank">
                {topVehicles.map((vehicle, index) => {
                  const share = maxVehicleRate > 0 ? (vehicle.monthly_rate / maxVehicleRate) * 100 : 0;
                  return (
                    <div key={vehicle.id} className="fr-rank-row">
                      <span className="fr-rank-number">{index + 1}</span>
                      <div className="fr-rank-copy">
                        <div className="fr-rank-head">
                          <h3>
                            <bdi>{vehicle.plate_number}</bdi>
                          </h3>
                          <strong>{money(vehicle.monthly_rate)}</strong>
                        </div>
                        <div className="dw-forecast-track" aria-hidden="true">
                          <i style={{ width: `${Math.max(4, share)}%`, background: barColors[index % barColors.length] }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel
            number="06"
            title="التأمين والتسجيل"
            subtitle="ملخص الامتثال والمركبات التي تحتاج إجراء"
            className="fr-panel-main"
            id="fr-compliance"
            action={
              <Link to="/fleet" className="dw-text-link">
                سجل المركبات
                <ArrowLeft size={15} />
              </Link>
            }
          >
            {insuranceLoading ? (
              <LoadingState />
            ) : (
              <>
                <div className="fr-summary-grid">
                  <div className="fr-summary-tile is-ok">
                    <small>ملتزمة بالكامل</small>
                    <strong>{fullyCompliantVehicles}</strong>
                  </div>
                  <div className="fr-summary-tile is-warn">
                    <small>تحتاج متابعة</small>
                    <strong>{urgentVehiclesTotal}</strong>
                  </div>
                  <div className="fr-summary-tile is-risk">
                    <small>تأمين منتهي</small>
                    <strong>{expiredInsuranceCount}</strong>
                  </div>
                  <div className="fr-summary-tile is-info">
                    <small>استمارة منتهية</small>
                    <strong>{expiredRegistrationCount}</strong>
                  </div>
                </div>
                {urgentVehicles.length ? (
                  <div className="fr-doc-list">
                    {urgentVehicles.map((item) => (
                      <div key={item.id} className="fr-doc-row">
                        <div className="fr-doc-copy">
                          <h3>
                            <bdi>{item.plate_number}</bdi>
                          </h3>
                          <p>
                            {item.make} {item.model} {item.year}
                          </p>
                        </div>
                        <div className="fr-badges">
                          <span className={`fr-badge is-${docStatusTone(item.insurance_status)}`}>
                            تأمين: {docStatusLabels[item.insurance_status]}
                          </span>
                          <span className={`fr-badge is-${docStatusTone(item.registration_status)}`}>
                            تسجيل: {docStatusLabels[item.registration_status]}
                          </span>
                        </div>
                      </div>
                    ))}
                    {urgentVehiclesTotal > urgentVehicles.length && (
                      <p className="fr-more-note">+{urgentVehiclesTotal - urgentVehicles.length} حالة أخرى تحتاج متابعة</p>
                    )}
                  </div>
                ) : (
                  <EmptyState icon={CheckCircle2} message="كل الوثائق المسجلة سليمة" />
                )}
              </>
            )}
          </Panel>

          <Panel
            number="07"
            title="سجل الصيانة"
            subtitle="أحدث أوامر الصيانة وتكلفتها المقدرة"
            className="fr-panel-main"
            id="fr-maintenance"
            action={
              <Link to="/fleet/maintenance" className="dw-text-link">
                إدارة الصيانة
                <ArrowLeft size={15} />
              </Link>
            }
          >
            {maintenanceLoading ? (
              <LoadingState />
            ) : maintenanceRows.length === 0 ? (
              <EmptyState icon={CheckCircle2} message="لا توجد أوامر صيانة حالياً" />
            ) : (
              <>
                <div className="fr-summary-grid">
                  <div className="fr-summary-tile is-info">
                    <small>إجمالي الأوامر</small>
                    <strong>{maintenance.length}</strong>
                  </div>
                  <div className="fr-summary-tile is-warn">
                    <small>قيد التنفيذ</small>
                    <strong>{maintenance.filter((item) => item.status === 'in_progress').length}</strong>
                  </div>
                  <div className="fr-summary-tile is-warn">
                    <small>معلقة</small>
                    <strong>{maintenance.filter((item) => item.status === 'pending').length}</strong>
                  </div>
                  <div className="fr-summary-tile is-ok">
                    <small>مكتملة</small>
                    <strong>{maintenance.filter((item) => item.status === 'completed').length}</strong>
                  </div>
                </div>
                <div className="dw-contract-table" style={{ padding: '0 0 18px' }}>
                  <table>
                    <caption className="sr-only">أوامر الصيانة</caption>
                    <thead>
                      <tr>
                        <th scope="col">المركبة / النوع</th>
                        <th scope="col">التاريخ المجدول</th>
                        <th scope="col">التكلفة التقديرية</th>
                        <th scope="col">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maintenanceRows.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>
                              <bdi>{item.plate_number || 'مركبة غير محددة'}</bdi>
                            </strong>
                            <span>{item.maintenance_type || 'صيانة'}</span>
                          </td>
                          <td>
                            <bdi>
                              {item.scheduled_date
                                ? new Date(item.scheduled_date).toLocaleDateString('ar-QA')
                                : 'غير مجدول'}
                            </bdi>
                          </td>
                          <td>{money(item.estimated_cost || 0)}</td>
                          <td>
                            <span className={`fr-badge is-${statusTone[item.status] || "info"}`}>
                              {statusLabels[item.status] || item.status || 'غير محدد'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>

          <Panel
            number="08"
            title="ملخص المركبات"
            subtitle="قراءة سريعة لأهم المركبات في التقرير"
            className="fr-panel-side"
            action={
              <Link to="/fleet" className="dw-text-link">
                كل المركبات
                <ArrowLeft size={15} />
              </Link>
            }
          >
            {vehiclesLoading ? (
              <LoadingState />
            ) : vehicles.length === 0 ? (
              <EmptyState icon={Car} message="لا توجد مركبات مطابقة للفترة المحددة" />
            ) : (
              <div className="dw-maintenance-list">
                {vehicles.slice(0, 6).map((vehicle) => (
                  <div key={vehicle.id} className="dw-maintenance-row">
                    <div className="dw-maintenance-icon">
                      <Car size={18} />
                    </div>
                    <div>
                      <h3>
                        <bdi>{vehicle.plate_number}</bdi>
                      </h3>
                      <p>
                        {vehicle.make} {vehicle.model} {vehicle.year} · {statusLabels[vehicle.status] || vehicle.status}
                      </p>
                    </div>
                    <time>{money(vehicle.monthly_rate || 0)}</time>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <section className="dw-shortcuts" aria-labelledby="fr-shortcuts-title">
          <div className="dw-shortcut-heading">
            <div className="dw-eyebrow">مساحات العمل</div>
            <h2 id="fr-shortcuts-title">انتقل إلى التفاصيل</h2>
            <p>أدوات الأسطول اليومية، في مكان واحد.</p>
          </div>
          <div className="dw-shortcut-grid">
            {[
              { label: 'إدارة الأسطول', detail: 'المركبات والجاهزية التشغيلية', icon: Car, path: '/fleet' },
              { label: 'الصيانة', detail: 'أوامر الصيانة والجداول', icon: Wrench, path: '/fleet/maintenance' },
              { label: 'المخالفات المرورية', detail: 'المخالفات والمدفوعات', icon: ShieldAlert, path: '/fleet/traffic-violations' },
              { label: 'الحجوزات', detail: 'حجوزات وإيجارات المركبات', icon: CalendarDays, path: '/fleet/reservations' },
            ].map((item) => (
              <Link key={item.path} to={item.path}>
                <item.icon size={23} />
                <div>
                  <h3>{item.label}</h3>
                  <p>{item.detail}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <nav className="dw-utility-links" aria-label="إجراءات إضافية">
          <button
            type="button"
            aria-pressed={filters.compareWithPrevious}
            onClick={() => {
              setFilters((current) => ({ ...current, compareWithPrevious: !current.compareWithPrevious }));
              toast.success(filters.compareWithPrevious ? 'تم إلغاء المقارنة السابقة' : 'تم تفعيل المقارنة السابقة');
            }}
          >
            <BarChart3 size={15} />
            {filters.compareWithPrevious ? 'إلغاء المقارنة السابقة' : 'تفعيل المقارنة السابقة'}
          </button>
          <button type="button" onClick={() => window.print()}>
            <Printer size={15} />
            طباعة التقرير
          </button>
          <Link to="/finance/reports-analysis?tab=reports">
            <FileSpreadsheet size={15} />
            التقارير المالية
          </Link>
        </nav>

        <footer className="dw-footer">
          <span>
            Fleetify <span>/</span> تقارير الأسطول
          </span>
          <span role="status">
            {refreshing ? 'جاري تحديث البيانات…' : `آخر تحديث ${new Date(refreshedAt).toLocaleTimeString('ar-QA', { hour: '2-digit', minute: '2-digit' })}`}
          </span>
        </footer>
      </div>
    </div>
  );
};

export default FleetReportsPage;
