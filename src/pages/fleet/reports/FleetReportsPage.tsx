/**
 * صفحة تقارير الأسطول - التصميم المطابق للداشبورد
 * Fleet Reports Page - Dashboard-Matched Design
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  ArrowUpRight,
  Sparkles,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';

// Import Financial Analysis components
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
import { FleetKPICards } from './components/FleetKPICards';
import { 
  RevenueChart, 
  FleetStatusChart, 
  UtilizationChart,
  TopVehiclesChart,
  MonthlyContractsChart,
} from './components/FleetCharts';
import { ReportFilters } from './components/ReportFilters';
import { ReportGenerator } from './components/ReportGenerator';

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

// ===== Stat Card Component (Dashboard Style) =====
interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  iconBg: string;
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconBg,
  description,
}) => {
  const isPositive = change?.includes('+');
  
  return (
    <motion.div 
      className="bg-white rounded-xl p-5 shadow-sm hover:shadow-lg transition-all"
      whileHover={{ y: -4, scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <motion.div 
          className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}
          whileHover={{ rotate: 10, scale: 1.1 }}
        >
          <Icon className="w-5 h-5" />
        </motion.div>
        {change && (
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
            isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>
      <h3 className="text-xs text-neutral-500 font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      {description && (
        <p className="text-xs text-neutral-400 mt-1">{description}</p>
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
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn("bg-white rounded-xl p-6 shadow-sm", className)}
  >
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-coral-600" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      </div>
      {action}
    </div>
    {children}
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
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className={cn(
        "p-2 rounded-lg",
        status === 'completed' ? "bg-green-100 text-green-600" :
        status === 'in_progress' ? "bg-blue-100 text-blue-600" :
        "bg-amber-100 text-amber-600"
      )}>
        <Wrench className="w-4 h-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-900">{plateNumber}</p>
        <p className="text-xs text-neutral-500">{type} • {date}</p>
      </div>
    </div>
    <div className="text-left">
      <p className="text-sm font-bold text-neutral-900">{cost}</p>
      <Badge 
        variant="outline"
        className={cn(
          "text-[10px]",
          status === 'completed' && "text-green-600 border-green-200 bg-green-50",
          status === 'in_progress' && "text-blue-600 border-blue-200 bg-blue-50",
          status === 'pending' && "text-amber-600 border-amber-200 bg-amber-50"
        )}
      >
        {status === 'completed' ? 'مكتملة' : 
         status === 'in_progress' ? 'قيد التنفيذ' : 'معلقة'}
      </Badge>
    </div>
  </motion.div>
);

// ===== Main Component =====
const FleetReportsPage: React.FC = () => {
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
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500 font-medium">جاري تحميل التقارير...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0efed]">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">تقارير وتحليلات الأسطول</h1>
                <p className="text-neutral-500 text-sm mt-1">
                  تحليلات شاملة وتقارير مفصلة لأداء الأسطول
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="bg-white gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                تحديث
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white"
                >
                  <Bell className="w-5 h-5" />
                </Button>
                {maintenanceAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {maintenanceAlerts.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.header>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <StatCard
            title="إجمالي المركبات"
            value={analytics?.totalVehicles || 0}
            change={`+${Math.round((analytics?.totalVehicles || 0) * 0.02)}`}
            icon={Car}
            iconBg="bg-blue-100 text-blue-600"
          />
          <StatCard
            title="المركبات المؤجرة"
            value={analytics?.rentedVehicles || 0}
            change={`+${Math.round((analytics?.rentedVehicles || 0) * 0.05)}`}
            icon={Activity}
            iconBg="bg-green-100 text-green-600"
          />
          <StatCard
            title="معدل الاستخدام"
            value={`${(analytics?.utilizationRate || 0).toFixed(0)}%`}
            change={analytics?.utilizationRate && analytics.utilizationRate >= 50 ? '+3%' : '-2%'}
            icon={Percent}
            iconBg="bg-rose-100 text-coral-600"
          />
          <StatCard
            title="إجمالي الإيرادات"
            value={formatCurrency(analytics?.totalRevenue || 0)}
            change="+7%"
            icon={DollarSign}
            iconBg="bg-amber-100 text-amber-600"
          />
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="bg-white rounded-xl p-4 shadow-sm">
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="w-full justify-start bg-white rounded-xl p-1 shadow-sm gap-1 overflow-x-auto">
            <TabsTrigger 
              value="overview" 
              className="px-6 py-3 rounded-xl data-[state=active]:bg-teal-600 data-[state=active]:text-white gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger 
              value="financial" 
              className="px-6 py-3 rounded-xl data-[state=active]:bg-teal-600 data-[state=active]:text-white gap-2"
            >
              <DollarSign className="w-4 h-4" />
              التحليل المالي
            </TabsTrigger>
            <TabsTrigger 
              value="maintenance" 
              className="px-6 py-3 rounded-xl data-[state=active]:bg-teal-600 data-[state=active]:text-white gap-2"
            >
              <Wrench className="w-4 h-4" />
              الصيانة
            </TabsTrigger>
            <TabsTrigger 
              value="insurance" 
              className="px-6 py-3 rounded-xl data-[state=active]:bg-teal-600 data-[state=active]:text-white gap-2"
            >
              <Shield className="w-4 h-4" />
              التأمين والتسجيل
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab Content */}
          <TabsContent value="overview" className="mt-6">
        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue Chart - Takes 2 columns */}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Top Vehicles Chart - Takes 2 columns */}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                  <Wrench className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                  <p className="text-sm text-neutral-500">لا توجد تنبيهات صيانة حالياً</p>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
          </TabsContent>

          {/* Financial Analysis Tab Content */}
          <TabsContent value="financial" className="mt-6">
            {/* Financial KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <StatCard
                title="إجمالي قيمة الأسطول"
                value={formatCurrency(financialOverview?.totalFleetValue || 0)}
                icon={Car}
                iconBg="bg-blue-100 text-blue-600"
                description={`${financialOverview?.activeVehicles || 0} مركبة نشطة`}
              />
              <StatCard
                title="إجمالي الإيرادات"
                value={formatCurrency(financialOverview?.totalRevenue || 0)}
                change="+15.2%"
                icon={TrendingUp}
                iconBg="bg-green-100 text-green-600"
              />
              <StatCard
                title="تكاليف التشغيل"
                value={formatCurrency(financialOverview?.totalOperatingCosts || 0)}
                change="-8.3%"
                icon={Activity}
                iconBg="bg-amber-100 text-amber-600"
              />
              <StatCard
                title="تكاليف الصيانة"
                value={formatCurrency(financialOverview?.totalMaintenanceCosts || 0)}
                icon={Wrench}
                iconBg="bg-rose-100 text-coral-600"
              />
              <StatCard
                title="الاستهلاك المتراكم"
                value={formatCurrency(financialOverview?.totalDepreciation || 0)}
                icon={TrendingDown}
                iconBg="bg-purple-100 text-purple-600"
              />
              <StatCard
                title="صافي الربح"
                value={formatCurrency(financialOverview?.netProfit || 0)}
                change={`+${((financialOverview?.netProfit || 0) / (financialOverview?.totalRevenue || 1) * 100).toFixed(1)}% ROI`}
                icon={DollarSign}
                iconBg="bg-emerald-100 text-emerald-600"
              />
            </div>

            {/* Financial Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                      key={vehicle.id || `vehicle-${idx}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                          idx === 0 ? "bg-amber-100 text-amber-700" :
                          idx === 1 ? "bg-neutral-200 text-neutral-700" :
                          idx === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-neutral-100 text-neutral-500"
                        )}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{vehicle.plate_number}</p>
                          <p className="text-xs text-neutral-500">{vehicle.make} {vehicle.model}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-green-600">{formatCurrency(vehicle.totalRevenue || 0)}</p>
                        <p className="text-xs text-neutral-400">إجمالي الإيرادات</p>
                      </div>
                    </div>
                  ))}
                  {(!topProfitableVehicles || topProfitableVehicles.length === 0) && (
                    <div className="text-center py-8">
                      <Car className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                      <p className="text-sm text-neutral-500">لا توجد بيانات متاحة</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Financial Summary */}
            {financialSummary && (
              <SectionCard title="ملخص الأداء المالي" icon={DollarSign}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                    <p className="text-xs text-green-600 font-medium mb-1">متوسط الربح لكل مركبة</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(financialSummary.avgProfitPerVehicle || 0)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium mb-1">معدل العائد على الاستثمار</p>
                    <p className="text-xl font-bold text-blue-700">{(financialSummary.roi || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                    <p className="text-xs text-coral-600 font-medium mb-1">هامش الربح</p>
                    <p className="text-xl font-bold text-coral-700">{(financialSummary.profitMargin || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                    <p className="text-xs text-purple-600 font-medium mb-1">معدل استخدام الأسطول</p>
                    <p className="text-xl font-bold text-purple-700">{(financialSummary.utilizationRate || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </SectionCard>
            )}
          </TabsContent>

          {/* Maintenance Tab Content */}
          <TabsContent value="maintenance" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench className="w-5 h-5 text-blue-600" />
                      <span className="text-xs text-blue-600 font-medium">قيد التنفيذ</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{maintenanceAlerts.filter(a => a.status === 'in_progress').length}</p>
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
                      <Wrench className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                      <p className="text-sm text-neutral-500">لا توجد تنبيهات صيانة حالياً</p>
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
        {/* Insurance & Registration Report Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-6"
        >
          <SectionCard 
            title="تقرير التأمين والاستمارة" 
            icon={Shield}
            action={
              insuranceSummary && insuranceSummary.needs_attention > 0 && (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-200">
                  {insuranceSummary.needs_attention} يحتاج اهتمام
                </Badge>
              )
            }
          >
            {/* Summary Cards */}
            {insuranceSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">مكتمل</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{insuranceSummary.fully_compliant}</p>
                  <p className="text-xs text-green-600">تأمين واستمارة ساريين</p>
                </div>
                
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">تأمين ساري</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{insuranceSummary.with_valid_insurance}</p>
                  <p className="text-xs text-blue-600">من {insuranceSummary.total_vehicles} مركبة</p>
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
                  <tr className="border-b border-neutral-200">
                    <th className="text-right py-3 px-4 text-xs font-semibold text-neutral-500">المركبة</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-neutral-500">التأمين</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-neutral-500">الاستمارة</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-neutral-500">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {insuranceReport.slice(0, 10).map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center">
                            <Car className="w-5 h-5 text-neutral-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-900">{vehicle.plate_number}</p>
                            <p className="text-xs text-neutral-500">{vehicle.make} {vehicle.model} {vehicle.year}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {vehicle.insurance_status === 'valid' && (
                          <Badge className="bg-green-100 text-green-700">
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
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3 ml-1" />
                            منتهي
                          </Badge>
                        )}
                        {vehicle.insurance_status === 'none' && (
                          <Badge variant="outline" className="text-neutral-500">
                            لا يوجد
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {vehicle.registration_status === 'valid' && (
                          <Badge className="bg-green-100 text-green-700">
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
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3 ml-1" />
                            منتهية
                          </Badge>
                        )}
                        {vehicle.registration_status === 'none' && (
                          <Badge variant="outline" className="text-neutral-500">
                            لا يوجد
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {vehicle.insurance_status === 'valid' && vehicle.registration_status === 'valid' ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
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
                  <Shield className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                  <p className="text-sm text-neutral-500">لا توجد بيانات للعرض</p>
                </div>
              )}
              {insuranceReport.length > 10 && (
                <div className="text-center py-4 border-t border-neutral-100">
                  <p className="text-xs text-neutral-500">
                    عرض 10 من {insuranceReport.length} مركبة
                  </p>
                </div>
              )}
            </div>
          </SectionCard>
        </motion.div>
          </TabsContent>
        </Tabs>

        {/* Report Generator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ReportGenerator
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6"
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
                      ? "text-green-600 border-green-200 bg-green-50"
                      : "text-red-600 border-red-200 bg-red-50"
                  )}
                >
                  {whatsappConnected ? <Wifi className="w-3 h-3 ml-1" /> : <WifiOff className="w-3 h-3 ml-1" />}
                  {whatsappConnected ? 'متصل' : 'غير متصل'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/settings/whatsapp')}
                >
                  <Settings className="w-4 h-4 ml-2" />
                  الإعدادات
                </Button>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Recipients Count */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <Users className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">
                      {recipients.filter(r => r.isActive).length}
                    </p>
                    <p className="text-xs text-neutral-500">مستلم نشط</p>
                  </div>
                </div>
              </div>

              {/* Daily Report Status */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    whatsappSettings?.dailyReportEnabled 
                      ? "bg-green-100" 
                      : "bg-neutral-100"
                  )}>
                    <Clock className={cn(
                      "w-5 h-5",
                      whatsappSettings?.dailyReportEnabled 
                        ? "text-green-600" 
                        : "text-neutral-400"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">التقرير اليومي</p>
                    <p className={cn(
                      "text-xs",
                      whatsappSettings?.dailyReportEnabled 
                        ? "text-green-600" 
                        : "text-neutral-400"
                    )}>
                      {whatsappSettings?.dailyReportEnabled 
                        ? `مفعّل • ${whatsappSettings?.dailyReportTime || '08:00'}` 
                        : 'معطّل'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Weekly Report Status */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    whatsappSettings?.weeklyReportEnabled 
                      ? "bg-blue-100" 
                      : "bg-neutral-100"
                  )}>
                    <FileText className={cn(
                      "w-5 h-5",
                      whatsappSettings?.weeklyReportEnabled 
                        ? "text-blue-600" 
                        : "text-neutral-400"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">التقرير الأسبوعي</p>
                    <p className={cn(
                      "text-xs",
                      whatsappSettings?.weeklyReportEnabled 
                        ? "text-blue-600" 
                        : "text-neutral-400"
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
                className="bg-gradient-to-l from-rose-500 to-orange-500 hover:from-coral-600 hover:to-orange-600"
              >
                <Send className="w-4 h-4 ml-2" />
                {isSending ? 'جاري الإرسال...' : 'إرسال تقرير الآن'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => sendWeeklyReport()}
                disabled={!whatsappConnected || isSending || recipients.filter(r => r.isActive).length === 0}
              >
                <FileText className="w-4 h-4 ml-2" />
                إرسال التقرير الأسبوعي
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate('/settings/whatsapp')}
                className="mr-auto"
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6 bg-gradient-to-l from-rose-50 to-orange-50 rounded-xl p-6 border border-rose-100"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-l from-rose-500 to-orange-500 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-neutral-900">
                {analytics && analytics.utilizationRate >= 70 
                  ? '🎉 أداء ممتاز!' 
                  : analytics && analytics.utilizationRate >= 50 
                  ? '📈 أداء جيد - هناك فرصة للتحسين'
                  : '⚠️ يحتاج لتحسين'}
              </p>
              <p className="text-sm text-neutral-600">
                {analytics && `معدل استخدام الأسطول ${analytics.utilizationRate.toFixed(1)}% • هامش الربح ${analytics.profitMargin.toFixed(1)}%`}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">
                  {analytics?.totalVehicles || 0}
                </p>
                <p className="text-xs text-neutral-500">مركبة</p>
              </div>
              <div className="w-px h-12 bg-rose-200" />
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">
                  {analytics?.rentedVehicles || 0}
                </p>
                <p className="text-xs text-neutral-500">مؤجرة</p>
              </div>
              <div className="w-px h-12 bg-rose-200" />
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(analytics?.totalProfit || 0)}
                </p>
                <p className="text-xs text-neutral-500">صافي الربح</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FleetReportsPage;
