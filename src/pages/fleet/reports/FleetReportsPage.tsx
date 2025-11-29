/**
 * صفحة تقارير الأسطول - التصميم الجديد
 * Fleet Reports Page - New Design
 * مستوحى من تصميم DashboardV2
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { toast } from 'sonner';
import {
  Sun,
  Moon,
  Sparkles,
  BarChart3,
  RefreshCw,
  Bell,
  Wrench,
  FileText,
  TrendingUp,
  Activity,
  MessageSquare,
  Send,
  Settings,
  Users,
  Clock,
  ChevronRight,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
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
} from './hooks/useFleetReports';

import type { ReportFilters as IReportFilters, ExportFormat } from './types/reports.types';

// Animated Background Component
const AnimatedBackground: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    {/* Gradient Orbs */}
    <motion.div
      className={cn(
        "absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-30",
        isDark ? "bg-violet-600" : "bg-violet-300"
      )}
      animate={{
        x: [0, 100, 0],
        y: [0, 50, 0],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      style={{ top: '-10%', right: '-10%' }}
    />
    <motion.div
      className={cn(
        "absolute w-[500px] h-[500px] rounded-full blur-3xl opacity-20",
        isDark ? "bg-cyan-600" : "bg-cyan-300"
      )}
      animate={{
        x: [0, -50, 0],
        y: [0, 100, 0],
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      style={{ bottom: '-5%', left: '-5%' }}
    />
    <motion.div
      className={cn(
        "absolute w-[400px] h-[400px] rounded-full blur-3xl opacity-20",
        isDark ? "bg-amber-600" : "bg-amber-300"
      )}
      animate={{
        x: [0, 80, 0],
        y: [0, -80, 0],
      }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      style={{ top: '40%', left: '30%' }}
    />
    
    {/* Grid Pattern */}
    <div 
      className={cn(
        "absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)]",
        "bg-[size:24px_24px]"
      )}
    />
  </div>
);

// Maintenance Alert Item
const MaintenanceAlertItem: React.FC<{
  plateNumber: string;
  type: string;
  date: string;
  status: string;
  cost: string;
  isDark: boolean;
}> = ({ plateNumber, type, date, status, cost, isDark }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className={cn(
      "flex items-center justify-between p-3 rounded-xl",
      isDark ? "bg-gray-800/50 hover:bg-gray-800" : "bg-gray-100 hover:bg-gray-200",
      "transition-colors duration-200"
    )}
  >
    <div className="flex items-center gap-3">
      <div className={cn(
        "p-2 rounded-lg",
        status === 'completed' ? "bg-emerald-500/20 text-emerald-500" :
        status === 'in_progress' ? "bg-blue-500/20 text-blue-500" :
        "bg-amber-500/20 text-amber-500"
      )}>
        <Wrench className="w-4 h-4" />
      </div>
      <div>
        <p className={cn(
          "text-sm font-medium",
          isDark ? "text-white" : "text-gray-900"
        )}>
          {plateNumber}
        </p>
        <p className={cn(
          "text-xs",
          isDark ? "text-gray-400" : "text-gray-500"
        )}>
          {type} • {date}
        </p>
      </div>
    </div>
    <div className="text-left">
      <p className={cn(
        "text-sm font-bold",
        isDark ? "text-white" : "text-gray-900"
      )}>
        {cost}
      </p>
      <Badge 
        variant="outline"
        className={cn(
          "text-[10px]",
          status === 'completed' && "text-emerald-500 border-emerald-500/30",
          status === 'in_progress' && "text-blue-500 border-blue-500/30",
          status === 'pending' && "text-amber-500 border-amber-500/30"
        )}
      >
        {status === 'completed' ? 'مكتملة' : 
         status === 'in_progress' ? 'قيد التنفيذ' : 'معلقة'}
      </Badge>
    </div>
  </motion.div>
);

// Main Component
const FleetReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);
  const [filters, setFilters] = useState<IReportFilters>({
    period: 'month',
    compareWithPrevious: false,
  });
  
  const { formatCurrency } = useCurrencyFormatter();
  
  // Fetch data using custom hooks
  const { data: analytics, isLoading: analyticsLoading } = useFleetAnalytics();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehiclesReport(filters);
  const { data: maintenance = [], isLoading: maintenanceLoading } = useMaintenanceReport(filters);
  const { data: monthlyRevenue = [], isLoading: revenueLoading } = useMonthlyRevenue();
  const { data: fleetStatus, isLoading: statusLoading } = useFleetStatus();
  const topVehicles = useTopPerformingVehicles(8);
  const maintenanceAlerts = useVehiclesNeedingMaintenance();
  
  // WhatsApp hooks
  const { settings: whatsappSettings } = useWhatsAppSettings();
  const { recipients } = useWhatsAppRecipients();
  const { sendDailyReport, sendWeeklyReport, isSending } = useWhatsAppReports();
  const { connected: whatsappConnected, checkStatus } = useWhatsAppConnectionStatus();
  
  const isLoading = analyticsLoading || vehiclesLoading || maintenanceLoading || revenueLoading || statusLoading;
  
  // Handle export
  const handleExport = useCallback((format: ExportFormat) => {
    toast.success(`جاري تصدير التقرير بصيغة ${format.toUpperCase()}...`);
    // TODO: Implement actual export logic
  }, []);
  
  // Handle refresh
  const handleRefresh = useCallback(() => {
    toast.success('جاري تحديث البيانات...');
    // The queries will automatically refetch
  }, []);

  if (isLoading && !analytics) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center",
        isDark ? "bg-gray-950" : "bg-gray-50"
      )}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500",
      isDark ? "bg-gray-950" : "bg-gray-50"
    )}>
      <AnimatedBackground isDark={isDark} />
      
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-2"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full blur-lg opacity-50" />
                <div className={cn(
                  "relative w-12 h-12 rounded-full flex items-center justify-center",
                  "bg-gradient-to-r from-violet-500 to-cyan-500"
                )}>
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className={cn(
                  "text-2xl font-bold",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  تقارير وتحليلات الأسطول
                </h1>
                <p className={cn(
                  "text-sm",
                  isDark ? "text-gray-400" : "text-gray-600"
                )}>
                  تحليلات شاملة وتقارير مفصلة لأداء الأسطول
                </p>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsDark(!isDark)}
              className={cn(
                "p-3 rounded-xl",
                isDark 
                  ? "bg-gray-800 text-amber-400" 
                  : "bg-white text-gray-700 shadow-lg"
              )}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>

            {/* Alerts */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "relative p-3 rounded-xl",
                isDark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-700 shadow-lg"
              )}
            >
              <Bell className="w-5 h-5" />
              {maintenanceAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                  {maintenanceAlerts.length}
                </span>
              )}
            </motion.button>
          </div>
        </motion.header>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <ReportFilters
            filters={filters}
            onFiltersChange={setFilters}
            onExport={handleExport}
            onRefresh={handleRefresh}
            isLoading={isLoading}
            isDark={isDark}
          />
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <FleetKPICards
            analytics={analytics}
            isDark={isDark}
            formatCurrency={formatCurrency}
          />
        </motion.div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Chart - Takes 2 columns */}
          <RevenueChart
            data={monthlyRevenue}
            isDark={isDark}
            formatCurrency={formatCurrency}
          />
          
          {/* Fleet Status Chart */}
          {fleetStatus && (
            <FleetStatusChart
              data={fleetStatus}
              isDark={isDark}
            />
          )}
        </div>

        {/* Secondary Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Vehicles Chart - Takes 2 columns */}
          <TopVehiclesChart
            vehicles={topVehicles}
            isDark={isDark}
            formatCurrency={formatCurrency}
          />
          
          {/* Utilization Chart */}
          {analytics && (
            <UtilizationChart
              analytics={analytics}
              isDark={isDark}
            />
          )}
        </div>

        {/* Additional Charts & Maintenance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Contracts Chart */}
          <MonthlyContractsChart
            data={monthlyRevenue}
            isDark={isDark}
          />
          
          {/* Maintenance Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className={cn(
              "rounded-2xl p-6",
              "backdrop-blur-xl border",
              isDark 
                ? "bg-gray-900/60 border-gray-800/50" 
                : "bg-white/80 border-gray-200/50",
              "shadow-xl"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wrench className={cn(
                  "w-5 h-5",
                  isDark ? "text-amber-400" : "text-amber-500"
                )} />
                <h3 className={cn(
                  "text-lg font-semibold",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  تنبيهات الصيانة
                </h3>
              </div>
              {maintenanceAlerts.length > 0 && (
                <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                  {maintenanceAlerts.length} تنبيه
                </Badge>
              )}
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {maintenanceAlerts.slice(0, 5).map((alert, idx) => (
                <MaintenanceAlertItem
                  key={alert.id}
                  plateNumber={alert.plate_number}
                  type={alert.maintenance_type}
                  date={new Date(alert.scheduled_date).toLocaleDateString('en-GB')}
                  status={alert.status}
                  cost={formatCurrency(alert.estimated_cost)}
                  isDark={isDark}
                />
              ))}
              {maintenanceAlerts.length === 0 && (
                <div className="text-center py-8">
                  <Wrench className={cn(
                    "w-12 h-12 mx-auto mb-4",
                    isDark ? "text-gray-600" : "text-gray-300"
                  )} />
                  <p className={cn(
                    "text-sm",
                    isDark ? "text-gray-400" : "text-gray-500"
                  )}>
                    لا توجد تنبيهات صيانة حالياً
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Report Generator */}
        <ReportGenerator
          analytics={analytics}
          vehicles={vehicles}
          maintenance={maintenance}
          isDark={isDark}
          formatCurrency={formatCurrency}
        />

        {/* WhatsApp Reports Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className={cn(
            "mt-8 rounded-2xl p-6",
            "backdrop-blur-xl border",
            isDark 
              ? "bg-gray-900/60 border-gray-800/50" 
              : "bg-white/80 border-gray-200/50",
            "shadow-xl"
          )}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={cn(
                  "text-lg font-semibold",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  تقارير واتساب
                </h3>
                <p className={cn(
                  "text-sm",
                  isDark ? "text-gray-400" : "text-gray-600"
                )}>
                  إرسال التقارير للمدير عبر واتساب
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <Badge 
                variant="outline" 
                className={cn(
                  "px-3 py-1",
                  whatsappConnected 
                    ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                    : "text-rose-500 border-rose-500/30 bg-rose-500/10"
                )}
              >
                {whatsappConnected ? <Wifi className="w-3 h-3 ml-1" /> : <WifiOff className="w-3 h-3 ml-1" />}
                {whatsappConnected ? 'متصل' : 'غير متصل'}
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/settings/whatsapp')}
                className={cn(
                  isDark && "border-gray-700 hover:bg-gray-800"
                )}
              >
                <Settings className="w-4 h-4 ml-2" />
                الإعدادات
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Recipients Count */}
            <div className={cn(
              "p-4 rounded-xl border",
              isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"
            )}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <p className={cn(
                    "text-2xl font-bold",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    {recipients.filter(r => r.isActive).length}
                  </p>
                  <p className={cn(
                    "text-xs",
                    isDark ? "text-gray-400" : "text-gray-500"
                  )}>
                    مستلم نشط
                  </p>
                </div>
              </div>
            </div>

            {/* Daily Report Status */}
            <div className={cn(
              "p-4 rounded-xl border",
              isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  whatsappSettings?.dailyReportEnabled 
                    ? "bg-emerald-500/20" 
                    : "bg-gray-500/20"
                )}>
                  <Clock className={cn(
                    "w-5 h-5",
                    whatsappSettings?.dailyReportEnabled 
                      ? "text-emerald-500" 
                      : "text-gray-500"
                  )} />
                </div>
                <div>
                  <p className={cn(
                    "text-sm font-medium",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    التقرير اليومي
                  </p>
                  <p className={cn(
                    "text-xs",
                    whatsappSettings?.dailyReportEnabled 
                      ? "text-emerald-500" 
                      : isDark ? "text-gray-500" : "text-gray-400"
                  )}>
                    {whatsappSettings?.dailyReportEnabled 
                      ? `مفعّل • ${whatsappSettings?.dailyReportTime || '08:00'}` 
                      : 'معطّل'}
                  </p>
                </div>
              </div>
            </div>

            {/* Weekly Report Status */}
            <div className={cn(
              "p-4 rounded-xl border",
              isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  whatsappSettings?.weeklyReportEnabled 
                    ? "bg-cyan-500/20" 
                    : "bg-gray-500/20"
                )}>
                  <FileText className={cn(
                    "w-5 h-5",
                    whatsappSettings?.weeklyReportEnabled 
                      ? "text-cyan-500" 
                      : "text-gray-500"
                  )} />
                </div>
                <div>
                  <p className={cn(
                    "text-sm font-medium",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    التقرير الأسبوعي
                  </p>
                  <p className={cn(
                    "text-xs",
                    whatsappSettings?.weeklyReportEnabled 
                      ? "text-cyan-500" 
                      : isDark ? "text-gray-500" : "text-gray-400"
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
              className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
            >
              <Send className="w-4 h-4 ml-2" />
              {isSending ? 'جاري الإرسال...' : 'إرسال تقرير الآن'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => sendWeeklyReport()}
              disabled={!whatsappConnected || isSending || recipients.filter(r => r.isActive).length === 0}
              className={isDark ? "border-gray-700 hover:bg-gray-800" : ""}
            >
              <FileText className="w-4 h-4 ml-2" />
              إرسال التقرير الأسبوعي
            </Button>
            
            <Button
              variant="outline"
              onClick={() => navigate('/settings/whatsapp')}
              className={cn(
                "mr-auto",
                isDark ? "border-gray-700 hover:bg-gray-800" : ""
              )}
            >
              إدارة المستلمين
              <ChevronRight className="w-4 h-4 mr-2" />
            </Button>
          </div>

          {/* Help Text */}
          {!whatsappConnected && (
            <div className={cn(
              "mt-4 p-3 rounded-lg border",
              isDark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"
            )}>
              <p className={cn(
                "text-sm",
                isDark ? "text-amber-400" : "text-amber-700"
              )}>
                ⚠️ لم يتم الاتصال بواتساب. 
                <button 
                  onClick={() => navigate('/settings/whatsapp')}
                  className="underline mr-1 hover:no-underline"
                >
                  اضغط هنا
                </button>
                لإعداد الاتصال.
              </p>
            </div>
          )}
        </motion.div>

        {/* Performance Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className={cn(
            "mt-8 rounded-2xl p-6",
            "backdrop-blur-xl border",
            isDark 
              ? "bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border-violet-500/20" 
              : "bg-gradient-to-r from-violet-100 to-cyan-100 border-violet-200"
          )}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className={cn(
                "text-lg font-semibold",
                isDark ? "text-white" : "text-gray-900"
              )}>
                {analytics && analytics.utilizationRate >= 70 
                  ? '🎉 أداء ممتاز!' 
                  : analytics && analytics.utilizationRate >= 50 
                  ? '📈 أداء جيد - هناك فرصة للتحسين'
                  : '⚠️ يحتاج لتحسين'}
              </p>
              <p className={cn(
                "text-sm",
                isDark ? "text-gray-400" : "text-gray-600"
              )}>
                {analytics && `معدل استخدام الأسطول ${analytics.utilizationRate.toFixed(1)}% • هامش الربح ${analytics.profitMargin.toFixed(1)}%`}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <p className={cn(
                  "text-2xl font-bold",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  {analytics?.totalVehicles || 0}
                </p>
                <p className={cn(
                  "text-xs",
                  isDark ? "text-gray-400" : "text-gray-600"
                )}>
                  مركبة
                </p>
              </div>
              <div className="w-px h-12 bg-gradient-to-b from-transparent via-gray-500 to-transparent" />
              <div className="text-center">
                <p className={cn(
                  "text-2xl font-bold",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  {analytics?.rentedVehicles || 0}
                </p>
                <p className={cn(
                  "text-xs",
                  isDark ? "text-gray-400" : "text-gray-600"
                )}>
                  مؤجرة
                </p>
              </div>
              <div className="w-px h-12 bg-gradient-to-b from-transparent via-gray-500 to-transparent" />
              <div className="text-center">
                <p className={cn(
                  "text-2xl font-bold text-emerald-500"
                )}>
                  {formatCurrency(analytics?.totalProfit || 0)}
                </p>
                <p className={cn(
                  "text-xs",
                  isDark ? "text-gray-400" : "text-gray-600"
                )}>
                  صافي الربح
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className={cn(
            "text-center mt-8 py-4",
            isDark ? "text-gray-500" : "text-gray-400"
          )}
        >
          <p className="text-sm">
            Fleet Reports V2 • تصميم احترافي متقدم
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default FleetReportsPage;

