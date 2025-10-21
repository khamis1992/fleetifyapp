import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useOptimizedRecentActivities } from '@/hooks/useOptimizedRecentActivities';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import ProfessionalBackground from '@/components/dashboard/ProfessionalBackground';
import EnhancedDashboardHeader from '@/components/dashboard/EnhancedDashboardHeader';
import QuickActionsDashboard from '@/components/dashboard/QuickActionsDashboard';
import EnhancedActivityFeed from '@/components/dashboard/EnhancedActivityFeed';
import SmartMetricsPanel from '@/components/dashboard/SmartMetricsPanel';
import { DocumentExpiryAlerts } from '@/components/dashboard/DocumentExpiryAlerts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { FleetAvailabilityWidget } from '@/components/dashboard/car-rental/FleetAvailabilityWidget';
import { RentalAnalyticsWidget } from '@/components/dashboard/car-rental/RentalAnalyticsWidget';
import { MaintenanceScheduleWidget } from '@/components/dashboard/car-rental/MaintenanceScheduleWidget';
import { RentalTimelineWidget } from '@/components/dashboard/car-rental/RentalTimelineWidget';
import { InsuranceAlertsWidget } from '@/components/dashboard/car-rental/InsuranceAlertsWidget';
import { RevenueOptimizationWidget } from '@/components/dashboard/car-rental/RevenueOptimizationWidget';
import { CommandPalette } from '@/components/command-palette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useExport } from '@/hooks/useExport';
import { toast } from 'sonner';

const CarRentalDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isBrowsingMode, browsedCompany } = useUnifiedCompanyAccess();
  const { exitBrowseMode } = useCompanyContext();
  const { data: recentActivities, isLoading: activitiesLoading } = useOptimizedRecentActivities();
  const { data: financialOverview, isLoading: financialLoading } = useFinancialOverview('car_rental');
  const { formatCurrency } = useCurrencyFormatter();
  const { exportDashboardPDF, state: exportState } = useExport();

  // Command Palette State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Widget refs for export
  const widgetRefs = {
    fleetAvailability: useRef<HTMLDivElement>(null),
    rentalAnalytics: useRef<HTMLDivElement>(null),
    maintenanceSchedule: useRef<HTMLDivElement>(null),
    revenueOptimization: useRef<HTMLDivElement>(null),
    insuranceAlerts: useRef<HTMLDivElement>(null),
    rentalTimeline: useRef<HTMLDivElement>(null),
  };

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
    onOpenSearch: () => {
      // Focus search input if exists
      const searchInput = document.querySelector<HTMLInputElement>('input[type="search"]');
      searchInput?.focus();
    },
    onExport: () => {
      // Trigger export button if exists
      const exportButton = document.querySelector<HTMLButtonElement>('[data-action="export"]');
      exportButton?.click();
    },
  });

  // Convert financial overview data
  const smartMetricsData = financialOverview ? {
    totalRevenue: financialOverview.totalRevenue || 0,
    monthlyRevenue: financialOverview.monthlyTrend?.[financialOverview.monthlyTrend.length - 1]?.revenue || 0,
    totalProfit: financialOverview.netIncome || 0,
    profitMargin: financialOverview.profitMargin || 0,
    monthlyGrowth: 0,
    activeContracts: 0,
    pendingPayments: 0,
    overduePayments: 0,
  } : undefined;

  // Convert activities to enhanced format
  const enhancedActivities = recentActivities?.slice(0, 10).map((activity, index) => ({
    id: activity.id || `activity-${index}`,
    type: 'system' as const,
    title: activity.description || 'نشاط جديد',
    description: activity.description || 'لا يوجد وصف',
    user: 'النظام',
    timestamp: new Date(activity.created_at || new Date()),
    status: 'info' as const,
    metadata: {
      'نوع العملية': activity.description || 'غير محدد',
      'الوقت': new Date(activity.created_at || new Date()).toLocaleString('ar-SA')
    }
  })) || [];

  // Handle Export All
  const handleExportAll = async () => {
    try {
      const charts = [
        { element: widgetRefs.fleetAvailability.current!, title: 'توافر الأسطول' },
        { element: widgetRefs.rentalAnalytics.current!, title: 'تحليلات الإيجار' },
        { element: widgetRefs.maintenanceSchedule.current!, title: 'جدول الصيانة' },
        { element: widgetRefs.revenueOptimization.current!, title: 'تحسين الإيرادات' },
        { element: widgetRefs.insuranceAlerts.current!, title: 'تنبيهات التأمين' },
        { element: widgetRefs.rentalTimeline.current!, title: 'جدول الإيجارات' },
      ].filter(chart => chart.element !== null);

      if (charts.length === 0) {
        toast.error('لا توجد بيانات للتصدير');
        return;
      }

      await exportDashboardPDF(charts, 'car_rental_dashboard.pdf', 'لوحة معلومات تأجير السيارات');
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <>
      <ProfessionalBackground />

      {/* Command Palette */}
      <CommandPalette
        open={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      <div className="relative z-10 space-y-8">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between mb-6">
          <EnhancedDashboardHeader
            isBrowsingMode={isBrowsingMode}
            browsedCompany={browsedCompany}
            onExitBrowseMode={exitBrowseMode}
          />
          <Button
            onClick={handleExportAll}
            disabled={exportState.isExporting}
            variant="outline"
            size="default"
            className="gap-2"
            data-action="export"
          >
            <Download className="h-4 w-4" />
            {exportState.isExporting ? 'جاري التصدير...' : 'تصدير لوحة المعلومات'}
          </Button>
        </div>

        {/* Car Rental Dashboard Widgets - Row 1 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div ref={widgetRefs.fleetAvailability}>
              <FleetAvailabilityWidget />
            </div>
            <div ref={widgetRefs.rentalAnalytics}>
              <RentalAnalyticsWidget />
            </div>
            <div ref={widgetRefs.maintenanceSchedule}>
              <MaintenanceScheduleWidget />
            </div>
          </div>
        </motion.div>

        {/* Car Rental Dashboard Widgets - Row 2 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div ref={widgetRefs.revenueOptimization}>
              <RevenueOptimizationWidget />
            </div>
            <div ref={widgetRefs.insuranceAlerts}>
              <InsuranceAlertsWidget />
            </div>
          </div>
        </motion.div>

        {/* Car Rental Dashboard Widgets - Row 3 (Full Width Timeline) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div ref={widgetRefs.rentalTimeline}>
            <RentalTimelineWidget />
          </div>
        </motion.div>

        {/* Quick Actions Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <QuickActionsDashboard />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Enhanced Activity Feed */}
          <div className="xl:col-span-2">
            <EnhancedActivityFeed
              activities={enhancedActivities}
              loading={activitiesLoading}
              title="النشاطات الأخيرة"
              onRefresh={() => window.location.reload()}
              showFilters={true}
            />
          </div>

          {/* Enhanced Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-6"
          >
            <SmartMetricsPanel 
              financialData={smartMetricsData} 
              loading={financialLoading} 
            />
            <DocumentExpiryAlerts />
          </motion.div>
        </div>

      </div>
    </>
  );
};

export default CarRentalDashboard;