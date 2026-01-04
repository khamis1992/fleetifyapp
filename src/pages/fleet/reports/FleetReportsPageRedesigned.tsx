/**
 * صفحة تقارير الأسطول - تصميم SaaS احترافي
 * Fleet Reports Page - Professional SaaS Design
 *
 * @component FleetReportsPageRedesigned
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { toast } from 'sonner';
import {
  BarChart3,
  RefreshCw,
  Bell,
  Wrench,
  FileText,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Send,
  Settings,
  Users,
  Clock,
  ChevronRight,
  Wifi,
  WifiOff,
  Car,
  Calendar,
  Download,
  Filter,
  PieChart,
  Activity,
  DollarSign,
  Percent,
  Sparkles,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';

// Import Financial Analysis hooks
import {
  useFleetFinancialOverview,
  useFleetFinancialSummary,
  useMonthlyRevenueData,
  useTopProfitableVehicles,
} from '@/hooks/useFleetFinancialAnalytics';
import {
  useWhatsAppSettings,
  useWhatsAppReports,
  useWhatsAppConnectionStatus,
  useWhatsAppRecipients,
} from '@/hooks/useWhatsAppReports';

// Import custom components
import {
  RevenueChart,
  FleetStatusChart,
  UtilizationChart,
  TopVehiclesChart,
  MonthlyContractsChart,
} from './components/FleetCharts';
import { ReportFilters } from './components/ReportFilters';
import { ReportGeneratorRedesigned } from './components/ReportGeneratorRedesigned';

// Import custom hooks
import {
  useFleetAnalytics,
  useVehiclesReport,
  useMaintenanceReport,
  useMonthlyRevenue,
  useFleetStatus,
  useTopPerformingVehicles,
  useVehiclesNeedingMaintenance,
  useInsuranceRegistrationReport,
  useInsuranceRegistrationSummary,
} from './hooks/useFleetReports';

import type { ReportFilters as IReportFilters, ExportFormat } from './types/reports.types';

// ===== Stat Card Component =====
interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  color: 'emerald' | 'sky' | 'coral' | 'amber' | 'violet' | 'slate';
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  description,
}) => {
  const isPositive = change?.includes('+');

  const colorStyles = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-600', iconBg: 'bg-gradient-to-br from-sky-500 to-sky-600' },
    coral: { bg: 'bg-rose-50', text: 'text-rose-600', iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', iconBg: 'bg-gradient-to-br from-slate-500 to-slate-600' },
  };

  const style = colorStyles[color];

  return (
    <motion.div
      className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-all duration-300"
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", style.iconBg)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {change && (
          <span className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
            isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>
      <h3 className="text-sm text-slate-500 font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {description && (
        <p className="text-xs text-slate-400 mt-1">{description}</p>
      )}
    </motion.div>
  );
};

// ===== Section Card Component =====
interface SectionCardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon: Icon,
  children,
  action,
  className,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn("bg-white rounded-2xl border border-slate-200 overflow-hidden", className)}
  >
    <div className="flex items-center justify-between p-6 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-rose-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {action}
    </div>
    <div className="p-6">
      {children}
    </div>
  </motion.div>
);

// ===== Maintenance Alert Item =====
const MaintenanceAlertItem: React.FC<{
  plateNumber: string;
  type: string;
  date: string;
  status: string;
  cost: string;
}> = ({ plateNumber, type, date, status, cost }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className={cn(
        "p-2 rounded-lg",
        status === 'completed' ? "bg-emerald-100 text-emerald-600" :
        status === 'in_progress' ? "bg-sky-100 text-sky-600" :
        "bg-amber-100 text-amber-600"
      )}>
        <Wrench className="w-4 h-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-900">{plateNumber}</p>
        <p className="text-xs text-slate-500">{type} • {date}</p>
      </div>
    </div>
    <div className="text-left">
      <p className="text-sm font-bold text-slate-900">{cost}</p>
      <Badge
        variant="outline"
        className={cn(
          "text-[10px]",
          status === 'completed' && "text-emerald-700 border-emerald-200 bg-emerald-50",
          status === 'in_progress' && "text-sky-700 border-sky-200 bg-sky-50",
          status === 'pending' && "text-amber-700 border-amber-200 bg-amber-50"
        )}
      >
        {status === 'completed' ? 'مكتملة' :
         status === 'in_progress' ? 'قيد التنفيذ' : 'معلقة'}
      </Badge>
    </div>
  </motion.div>
);

// ===== Main Component =====
const FleetReportsPageRedesigned: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<IReportFilters>({
    period: 'month',
    compareWithPrevious: false,
  });

  const { formatCurrency } = useCurrencyFormatter();

  // Financial Analysis hooks
  const { data: financialOverview, isLoading: financialLoading } = useFleetFinancialOverview();
  const { data: financialSummary } = useFleetFinancialSummary();
  const { data: monthlyRevenueFinancial } = useMonthlyRevenueData('2024');
  const { data: topProfitableVehicles } = useTopProfitableVehicles(10);

  // Fetch data using custom hooks
  const { data: analytics, isLoading: analyticsLoading } = useFleetAnalytics();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehiclesReport(filters);
  const { data: maintenance = [], isLoading: maintenanceLoading } = useMaintenanceReport(filters);
  const { data: monthlyRevenue = [], isLoading: revenueLoading } = useMonthlyRevenue();
  const { data: fleetStatus, isLoading: statusLoading } = useFleetStatus();
  const topVehicles = useTopPerformingVehicles(8);
  const maintenanceAlerts = useVehiclesNeedingMaintenance();
  const { data: insuranceReport = [], isLoading: insuranceLoading } = useInsuranceRegistrationReport();
  const { data: insuranceSummary } = useInsuranceRegistrationSummary();

  // WhatsApp hooks
  const { settings: whatsappSettings } = useWhatsAppSettings();
  const { recipients } = useWhatsAppRecipients();
  const { sendDailyReport, sendWeeklyReport, isSending } = useWhatsAppReports();
  const { connected: whatsappConnected } = useWhatsAppConnectionStatus();

  const isLoading = analyticsLoading || vehiclesLoading || maintenanceLoading || revenueLoading || statusLoading;

  // Handle export
  const handleExport = useCallback((format: ExportFormat) => {
    toast.success(`جاري تصدير التقرير بصيغة ${format.toUpperCase()}...`);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    toast.success('جاري تحديث البيانات...');
  }, []);

  if (isLoading && !analytics) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">جاري تحميل التقارير...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">تقارير وتحليلات الأسطول</h1>
                <p className="text-sm text-slate-500">تحليلات شاملة وتقارير مفصلة لأداء الأسطول</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="bg-white gap-2 rounded-xl"
              >
                <RefreshCw className="w-4 h-4" />
                تحديث
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white rounded-xl"
                >
                  <Bell className="w-5 h-5" />
                </Button>
                {maintenanceAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {maintenanceAlerts.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي المركبات"
            value={analytics?.totalVehicles || 0}
            change={`+${Math.round((analytics?.totalVehicles || 0) * 0.02)}`}
            icon={Car}
            color="sky"
          />
          <StatCard
            title="المركبات المؤجرة"
            value={analytics?.rentedVehicles || 0}
            change={`+${Math.round((analytics?.rentedVehicles || 0) * 0.05)}`}
            icon={Activity}
            color="emerald"
          />
          <StatCard
            title="معدل الاستخدام"
            value={`${(analytics?.utilizationRate || 0).toFixed(0)}%`}
            change={analytics?.utilizationRate && analytics.utilizationRate >= 50 ? '+3%' : '-2%'}
            icon={Percent}
            color="coral"
          />
          <StatCard
            title="إجمالي الإيرادات"
            value={formatCurrency(analytics?.totalRevenue || 0)}
            change="+7%"
            icon={DollarSign}
            color="amber"
          />
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <ReportFilters
              filters={filters}
              onFiltersChange={setFilters}
              onExport={handleExport}
              onRefresh={handleRefresh}
              isLoading={isLoading}
              isDark={false}
            />
          </div>
        </motion.div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <TabsList className="w-full justify-start bg-transparent p-2 gap-1 overflow-x-auto h-auto">
              <TabsTrigger
                value="overview"
                className="px-5 py-3 rounded-xl data-[state=active]:bg-rose-500 data-[state=active]:text-white gap-2 transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                نظرة عامة
              </TabsTrigger>
              <TabsTrigger
                value="financial"
                className="px-5 py-3 rounded-xl data-[state=active]:bg-rose-500 data-[state=active]:text-white gap-2 transition-all"
              >
                <DollarSign className="w-4 h-4" />
                التحليل المالي
              </TabsTrigger>
              <TabsTrigger
                value="maintenance"
                className="px-5 py-3 rounded-xl data-[state=active]:bg-rose-500 data-[state=active]:text-white gap-2 transition-all"
              >
                <Wrench className="w-4 h-4" />
                الصيانة
              </TabsTrigger>
              <TabsTrigger
                value="insurance"
                className="px-5 py-3 rounded-xl data-[state=active]:bg-rose-500 data-[state=active]:text-white gap-2 transition-all"
              >
                <Shield className="w-4 h-4" />
                التأمين والتسجيل
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab Content */}
          <TabsContent value="overview" className="mt-6 space-6">
            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <div className="lg:col-span-2">
                <SectionCard title="الإيرادات الشهرية" icon={TrendingUp}>
                  <RevenueChart
                    data={monthlyRevenue}
                    isDark={false}
                    formatCurrency={formatCurrency}
                  />
                </SectionCard>
              </div>

              {/* Fleet Status Chart */}
              <div>
                <SectionCard title="حالة الأسطول" icon={PieChart}>
                  {fleetStatus && (
                    <FleetStatusChart
                      data={fleetStatus}
                      isDark={false}
                    />
                  )}
                </SectionCard>
              </div>
            </div>

            {/* Secondary Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Vehicles Chart */}
              <div className="lg:col-span-2">
                <SectionCard title="أفضل المركبات أداءً" icon={Car}>
                  <TopVehiclesChart
                    vehicles={topVehicles}
                    isDark={false}
                    formatCurrency={formatCurrency}
                  />
                </SectionCard>
              </div>

              {/* Utilization Chart */}
              <div>
                <SectionCard title="معدل الاستخدام" icon={Activity}>
                  {analytics && (
                    <UtilizationChart
                      analytics={analytics}
                      isDark={false}
                    />
                  )}
                </SectionCard>
              </div>
            </div>

            {/* Additional Charts & Maintenance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Contracts Chart */}
              <SectionCard title="العقود الشهرية" icon={FileText}>
                <MonthlyContractsChart
                  data={monthlyRevenue}
                  isDark={false}
                />
              </SectionCard>

              {/* Maintenance Alerts */}
              <SectionCard
                title="تنبيهات الصيانة"
                icon={Wrench}
                action={
                  maintenanceAlerts.length > 0 && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">
                      {maintenanceAlerts.length} تنبيه
                    </Badge>
                  )
                }
              >
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {maintenanceAlerts.slice(0, 5).map((alert) => (
                    <MaintenanceAlertItem
                      key={alert.id}
                      plateNumber={alert.plate_number}
                      type={alert.maintenance_type}
                      date={new Date(alert.scheduled_date).toLocaleDateString('en-GB')}
                      status={alert.status}
                      cost={formatCurrency(alert.estimated_cost)}
                    />
                  ))}
                  {maintenanceAlerts.length === 0 && (
                    <div className="text-center py-8">
                      <Wrench className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p className="text-sm text-slate-500">لا توجد تنبيهات صيانة حالياً</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          </TabsContent>

          {/* Financial Analysis Tab Content */}
          <TabsContent value="financial" className="mt-6 space-6">
            {/* Financial KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard
                title="إجمالي قيمة الأسطول"
                value={formatCurrency(financialOverview?.totalFleetValue || 0)}
                icon={Car}
                color="sky"
                description={`${financialOverview?.activeVehicles || 0} مركبة نشطة`}
              />
              <StatCard
                title="إجمالي الإيرادات"
                value={formatCurrency(financialOverview?.totalRevenue || 0)}
                change="+15.2%"
                icon={TrendingUp}
                color="emerald"
              />
              <StatCard
                title="تكاليف التشغيل"
                value={formatCurrency(financialOverview?.totalOperatingCosts || 0)}
                change="-8.3%"
                icon={Activity}
                color="amber"
              />
              <StatCard
                title="تكاليف الصيانة"
                value={formatCurrency(financialOverview?.totalMaintenanceCosts || 0)}
                icon={Wrench}
                color="coral"
              />
              <StatCard
                title="الاستهلاك المتراكم"
                value={formatCurrency(financialOverview?.totalDepreciation || 0)}
                icon={TrendingDown}
                color="violet"
              />
              <StatCard
                title="صافي الربح"
                value={formatCurrency(financialOverview?.netProfit || 0)}
                change={`+${((financialOverview?.netProfit || 0) / (financialOverview?.totalRevenue || 1) * 100).toFixed(1)}% ROI`}
                icon={DollarSign}
                color="emerald"
              />
            </div>

            {/* Financial Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard title="تطور الإيرادات الشهرية" icon={TrendingUp}>
                <RevenueChart
                  data={monthlyRevenueFinancial?.map(item => ({
                    month: item.monthName || '',
                    revenue: item.revenue || 0,
                    contracts: 0,
                  })) || []}
                  isDark={false}
                  formatCurrency={formatCurrency}
                />
              </SectionCard>

              <SectionCard title="أعلى 10 مركبات ربحية" icon={BarChart3}>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {topProfitableVehicles?.map((vehicle, idx) => (
                    <div
                      key={vehicle.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                          idx === 0 ? "bg-amber-100 text-amber-700" :
                          idx === 1 ? "bg-slate-200 text-slate-700" :
                          idx === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-slate-100 text-slate-500"
                        )}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{vehicle.plate_number}</p>
                          <p className="text-xs text-slate-500">{vehicle.make} {vehicle.model}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(vehicle.totalRevenue || 0)}</p>
                        <p className="text-xs text-slate-400">إجمالي الإيرادات</p>
                      </div>
                    </div>
                  ))}
                  {(!topProfitableVehicles || topProfitableVehicles.length === 0) && (
                    <div className="text-center py-8">
                      <Car className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p className="text-sm text-slate-500">لا توجد بيانات متاحة</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Financial Summary */}
            {financialSummary && (
              <SectionCard title="ملخص الأداء المالي" icon={DollarSign}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-medium mb-1">متوسط الربح لكل مركبة</p>
                    <p className="text-xl font-bold text-emerald-700">{formatCurrency(financialSummary.avgProfitPerVehicle || 0)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-sky-50 border border-sky-100">
                    <p className="text-xs text-sky-600 font-medium mb-1">معدل العائد على الاستثمار</p>
                    <p className="text-xl font-bold text-sky-700">{(financialSummary.roi || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                    <p className="text-xs text-rose-600 font-medium mb-1">هامش الربح</p>
                    <p className="text-xl font-bold text-rose-700">{(financialSummary.profitMargin || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-violet-50 border border-violet-100">
                    <p className="text-xs text-violet-600 font-medium mb-1">معدل استخدام الأسطول</p>
                    <p className="text-xl font-bold text-violet-700">{(financialSummary.utilizationRate || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </SectionCard>
            )}
          </TabsContent>

          {/* Maintenance Tab Content */}
          <TabsContent value="maintenance" className="mt-6 space-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Maintenance Summary */}
              <SectionCard title="ملخص الصيانة" icon={Wrench}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <span className="text-xs text-amber-600 font-medium">قيد الانتظار</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-700">{maintenanceAlerts.filter(a => a.status === 'pending').length}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-sky-50 border border-sky-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench className="w-5 h-5 text-sky-600" />
                      <span className="text-xs text-sky-600 font-medium">قيد التنفيذ</span>
                    </div>
                    <p className="text-2xl font-bold text-sky-700">{maintenanceAlerts.filter(a => a.status === 'in_progress').length}</p>
                  </div>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {maintenanceAlerts.map((alert) => (
                    <MaintenanceAlertItem
                      key={alert.id}
                      plateNumber={alert.plate_number}
                      type={alert.maintenance_type}
                      date={new Date(alert.scheduled_date).toLocaleDateString('en-GB')}
                      status={alert.status}
                      cost={formatCurrency(alert.estimated_cost)}
                    />
                  ))}
                  {maintenanceAlerts.length === 0 && (
                    <div className="text-center py-8">
                      <Wrench className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p className="text-sm text-slate-500">لا توجد تنبيهات صيانة حالياً</p>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Maintenance Costs */}
              <SectionCard title="تكاليف الصيانة الشهرية" icon={DollarSign}>
                <RevenueChart
                  data={maintenance.slice(-12).map(m => ({
                    month: m.month || '',
                    revenue: m.cost || 0,
                    contracts: m.count || 0,
                  }))}
                  isDark={false}
                  formatCurrency={formatCurrency}
                />
              </SectionCard>
            </div>
          </TabsContent>

          {/* Insurance Tab Content */}
          <TabsContent value="insurance" className="mt-6">
            <SectionCard
              title="تقرير التأمين والاستمارة"
              icon={Shield}
              action={
                insuranceSummary && insuranceSummary.needs_attention > 0 && (
                  <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200">
                    {insuranceSummary.needs_attention} يحتاج اهتمام
                  </Badge>
                )
              }
            >
              {/* Summary Cards */}
              {insuranceSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs text-emerald-600 font-medium">مكتمل</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">{insuranceSummary.fully_compliant}</p>
                    <p className="text-xs text-emerald-600">تأمين واستمارة ساريين</p>
                  </div>

                  <div className="p-4 rounded-xl bg-sky-50 border border-sky-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-sky-600" />
                      <span className="text-xs text-sky-600 font-medium">تأمين ساري</span>
                    </div>
                    <p className="text-2xl font-bold text-sky-700">{insuranceSummary.with_valid_insurance}</p>
                    <p className="text-xs text-sky-600">من {insuranceSummary.total_vehicles} مركبة</p>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <span className="text-xs text-indigo-600 font-medium">استمارة سارية</span>
                    </div>
                    <p className="text-2xl font-bold text-indigo-700">{insuranceSummary.with_valid_registration}</p>
                    <p className="text-xs text-indigo-600">من {insuranceSummary.total_vehicles} مركبة</p>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <span className="text-xs text-amber-600 font-medium">يحتاج اهتمام</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-700">{insuranceSummary.needs_attention}</p>
                    <p className="text-xs text-amber-600">منتهي أو ينتهي قريباً</p>
                  </div>
                </div>
              )}

              {/* Vehicles Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500">المركبة</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500">التأمين</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500">الاستمارة</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {insuranceReport.slice(0, 10).map((vehicle) => (
                      <tr key={vehicle.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Car className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{vehicle.plate_number}</p>
                              <p className="text-xs text-slate-500">{vehicle.make} {vehicle.model} {vehicle.year}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {vehicle.insurance_status === 'valid' && (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 ml-1" />
                              ساري ({vehicle.insurance_days_remaining} يوم)
                            </Badge>
                          )}
                          {vehicle.insurance_status === 'expiring_soon' && (
                            <Badge className="bg-amber-100 text-amber-700">
                              <AlertCircle className="w-3 h-3 ml-1" />
                              ينتهي قريباً ({vehicle.insurance_days_remaining} يوم)
                            </Badge>
                          )}
                          {vehicle.insurance_status === 'expired' && (
                            <Badge className="bg-rose-100 text-rose-700">
                              <XCircle className="w-3 h-3 ml-1" />
                              منتهي
                            </Badge>
                          )}
                          {vehicle.insurance_status === 'none' && (
                            <Badge variant="outline" className="text-slate-500">
                              لا يوجد
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {vehicle.registration_status === 'valid' && (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 ml-1" />
                              سارية ({vehicle.registration_days_remaining} يوم)
                            </Badge>
                          )}
                          {vehicle.registration_status === 'expiring_soon' && (
                            <Badge className="bg-amber-100 text-amber-700">
                              <AlertCircle className="w-3 h-3 ml-1" />
                              تنتهي قريباً ({vehicle.registration_days_remaining} يوم)
                            </Badge>
                          )}
                          {vehicle.registration_status === 'expired' && (
                            <Badge className="bg-rose-100 text-rose-700">
                              <XCircle className="w-3 h-3 ml-1" />
                              منتهية
                            </Badge>
                          )}
                          {vehicle.registration_status === 'none' && (
                            <Badge variant="outline" className="text-slate-500">
                              لا يوجد
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {vehicle.insurance_status === 'valid' && vehicle.registration_status === 'valid' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                              <CheckCircle2 className="w-4 h-4" />
                              مكتمل
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                              <AlertCircle className="w-4 h-4" />
                              يحتاج مراجعة
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {insuranceReport.length === 0 && !insuranceLoading && (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-sm text-slate-500">لا توجد بيانات للعرض</p>
                  </div>
                )}
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>

        {/* Report Generator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ReportGeneratorRedesigned
            analytics={analytics}
            vehicles={vehicles}
            maintenance={maintenance}
            insuranceReport={insuranceReport}
            insuranceSummary={insuranceSummary}
            isDark={false}
            formatCurrency={formatCurrency}
          />
        </motion.div>

        {/* WhatsApp Reports Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <SectionCard
            title="تقارير واتساب"
            icon={MessageSquare}
            action={
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "px-3 py-1",
                    whatsappConnected
                      ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                      : "text-rose-600 border-rose-200 bg-rose-50"
                  )}
                >
                  {whatsappConnected ? <Wifi className="w-3 h-3 ml-1" /> : <WifiOff className="w-3 h-3 ml-1" />}
                  {whatsappConnected ? 'متصل' : 'غير متصل'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/settings/whatsapp')}
                  className="rounded-xl"
                >
                  <Settings className="w-4 h-4 ml-2" />
                  الإعدادات
                </Button>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Recipients Count */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <Users className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {recipients.filter(r => r.isActive).length}
                    </p>
                    <p className="text-xs text-slate-500">مستلم نشط</p>
                  </div>
                </div>
              </div>

              {/* Daily Report Status */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    whatsappSettings?.dailyReportEnabled
                      ? "bg-emerald-100"
                      : "bg-slate-200"
                  )}>
                    <Clock className={cn(
                      "w-5 h-5",
                      whatsappSettings?.dailyReportEnabled
                        ? "text-emerald-600"
                        : "text-slate-400"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">التقرير اليومي</p>
                    <p className={cn(
                      "text-xs",
                      whatsappSettings?.dailyReportEnabled
                        ? "text-emerald-600"
                        : "text-slate-400"
                    )}>
                      {whatsappSettings?.dailyReportEnabled
                        ? `مفعّل • ${whatsappSettings?.dailyReportTime || '08:00'}`
                        : 'معطّل'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Weekly Report Status */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    whatsappSettings?.weeklyReportEnabled
                      ? "bg-sky-100"
                      : "bg-slate-200"
                  )}>
                    <FileText className={cn(
                      "w-5 h-5",
                      whatsappSettings?.weeklyReportEnabled
                        ? "text-sky-600"
                        : "text-slate-400"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">التقرير الأسبوعي</p>
                    <p className={cn(
                      "text-xs",
                      whatsappSettings?.weeklyReportEnabled
                        ? "text-sky-600"
                        : "text-slate-400"
                    )}>
                      {whatsappSettings?.weeklyReportEnabled
                        ? `مفعّل • ${['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][whatsappSettings?.weeklyReportDay || 0]}`
                        : 'معطّل'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => sendDailyReport()}
                disabled={!whatsappConnected || isSending || recipients.filter(r => r.isActive).length === 0}
                className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 rounded-xl"
              >
                <Send className="w-4 h-4 ml-2" />
                {isSending ? 'جاري الإرسال...' : 'إرسال تقرير الآن'}
              </Button>

              <Button
                variant="outline"
                onClick={() => sendWeeklyReport()}
                disabled={!whatsappConnected || isSending || recipients.filter(r => r.isActive).length === 0}
                className="rounded-xl"
              >
                <FileText className="w-4 h-4 ml-2" />
                إرسال التقرير الأسبوعي
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/settings/whatsapp')}
                className="mr-auto rounded-xl"
              >
                إدارة المستلمين
                <ChevronRight className="w-4 h-4 mr-2" />
              </Button>
            </div>

            {/* Help Text */}
            {!whatsappConnected && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-700">
                  ⚠️ لم يتم الاتصال بواتساب.
                  <button
                    onClick={() => navigate('/settings/whatsapp')}
                    className="underline mr-1 hover:no-underline font-medium"
                  >
                    اضغط هنا
                  </button>
                  لإعداد الاتصال.
                </p>
              </div>
            )}
          </SectionCard>
        </motion.div>

        {/* Performance Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl p-6 border border-rose-100"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-slate-900">
                {analytics && analytics.utilizationRate >= 70
                  ? '🎉 أداء ممتاز!'
                  : analytics && analytics.utilizationRate >= 50
                  ? '📈 أداء جيد - هناك فرصة للتحسين'
                  : '⚠️ يحتاج لتحسين'}
              </p>
              <p className="text-sm text-slate-600">
                {analytics && `معدل استخدام الأسطول ${analytics.utilizationRate.toFixed(1)}% • هامش الربح ${analytics.profitMargin.toFixed(1)}%`}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {analytics?.totalVehicles || 0}
                </p>
                <p className="text-xs text-slate-500">مركبة</p>
              </div>
              <div className="w-px h-12 bg-rose-200" />
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {analytics?.rentedVehicles || 0}
                </p>
                <p className="text-xs text-slate-500">مؤجرة</p>
              </div>
              <div className="w-px h-12 bg-rose-200" />
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(analytics?.totalProfit || 0)}
                </p>
                <p className="text-xs text-slate-500">صافي الربح</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FleetReportsPageRedesigned;
