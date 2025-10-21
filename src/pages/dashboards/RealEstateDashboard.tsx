import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useRealEstateDashboardStats } from '@/hooks/useRealEstateDashboardStats';
import { useOptimizedRecentActivities } from '@/hooks/useOptimizedRecentActivities';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import ProfessionalBackground from '@/components/dashboard/ProfessionalBackground';
import EnhancedDashboardHeader from '@/components/dashboard/EnhancedDashboardHeader';
import { PropertyStatsCards } from '@/modules/properties/components/PropertyStatsCards';
import RealEstateQuickActions from '@/components/dashboard/RealEstateQuickActions';
import EnhancedActivityFeed from '@/components/dashboard/EnhancedActivityFeed';
import SmartMetricsPanel from '@/components/dashboard/SmartMetricsPanel';
import RealEstateEmptyState from '@/components/dashboard/RealEstateEmptyState';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { CommandPalette } from '@/components/command-palette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useExport } from '@/hooks/useExport';
import { toast } from 'sonner';

// Real Estate Specific Widgets
import { OccupancyAnalyticsWidget } from '@/components/dashboard/real-estate/OccupancyAnalyticsWidget';
import { RentCollectionWidget } from '@/components/dashboard/real-estate/RentCollectionWidget';
import { MaintenanceRequestsWidget } from '@/components/dashboard/real-estate/MaintenanceRequestsWidget';
import { PropertyPerformanceWidget } from '@/components/dashboard/real-estate/PropertyPerformanceWidget';
import { LeaseExpiryWidget } from '@/components/dashboard/real-estate/LeaseExpiryWidget';
import { TenantSatisfactionWidget } from '@/components/dashboard/real-estate/TenantSatisfactionWidget';
import { VacancyAnalysisWidget } from '@/components/dashboard/real-estate/VacancyAnalysisWidget';

const RealEstateDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isBrowsingMode, browsedCompany } = useUnifiedCompanyAccess();
  const { exitBrowseMode } = useCompanyContext();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { data: realEstateStats, isLoading: statsLoading, error: statsError } = useRealEstateDashboardStats();
  const { data: recentActivities, isLoading: activitiesLoading } = useOptimizedRecentActivities();
  const { data: financialOverview, isLoading: financialLoading } = useFinancialOverview('real_estate');
  const { formatCurrency } = useCurrencyFormatter();
  const { exportDashboardPDF, state: exportState } = useExport();

  // Widget refs for export
  const widgetRefs = {
    occupancy: useRef<HTMLDivElement>(null),
    rentCollection: useRef<HTMLDivElement>(null),
    maintenance: useRef<HTMLDivElement>(null),
    propertyPerformance: useRef<HTMLDivElement>(null),
    leaseExpiry: useRef<HTMLDivElement>(null),
    tenantSatisfaction: useRef<HTMLDivElement>(null),
    vacancy: useRef<HTMLDivElement>(null),
  };

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
    onOpenSearch: () => {
      const searchInput = document.querySelector<HTMLInputElement>('input[type="search"]');
      searchInput?.focus();
    },
    onExport: () => {
      const exportButton = document.querySelector<HTMLButtonElement>('[data-action="export"]');
      exportButton?.click();
    },
  });

  // Check if we have no data (empty state)
  const hasNoData = realEstateStats && realEstateStats.total_properties === 0 && !statsLoading;
  const companyName = browsedCompany?.name || user?.company?.name || "شركتك";

  // Convert real estate data for SmartMetricsPanel
  const smartMetricsData = realEstateStats ? {
    totalRevenue: realEstateStats.yearly_revenue || 0,
    monthlyRevenue: realEstateStats.monthly_revenue || 0,
    totalProfit: (realEstateStats.monthly_revenue * 0.7) || 0, // Mock profit calculation
    profitMargin: realEstateStats.monthly_revenue > 0 ? ((realEstateStats.monthly_revenue * 0.7) / realEstateStats.monthly_revenue) * 100 : 0,
    monthlyGrowth: 0,
    activeContracts: realEstateStats.active_contracts || 0,
    pendingPayments: realEstateStats.pending_payments || 0,
    overduePayments: realEstateStats.overdue_payments || 0,
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
        { element: widgetRefs.occupancy.current!, title: 'تحليلات الإشغال' },
        { element: widgetRefs.rentCollection.current!, title: 'تحصيل الإيجارات' },
        { element: widgetRefs.maintenance.current!, title: 'طلبات الصيانة' },
        { element: widgetRefs.propertyPerformance.current!, title: 'أداء العقارات' },
        { element: widgetRefs.leaseExpiry.current!, title: 'انتهاء العقود' },
        { element: widgetRefs.tenantSatisfaction.current!, title: 'رضا المستأجرين' },
        { element: widgetRefs.vacancy.current!, title: 'تحليل الشواغر' },
      ].filter(chart => chart.element !== null);

      if (charts.length === 0) {
        toast.error('لا توجد بيانات للتصدير');
        return;
      }

      await exportDashboardPDF(charts, 'real_estate_dashboard.pdf', 'لوحة معلومات العقارات');
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Show empty state if no data
  if (hasNoData) {
    return (
      <>
        <ProfessionalBackground />
        <div className="relative z-10 space-y-8">
          <EnhancedDashboardHeader
            isBrowsingMode={isBrowsingMode}
            browsedCompany={browsedCompany}
            onExitBrowseMode={exitBrowseMode}
          />
          <RealEstateEmptyState companyName={companyName} />
        </div>
      </>
    );
  }

  return (
    <>
      <ProfessionalBackground />
      <CommandPalette open={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
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

        {/* Real Estate Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <PropertyStatsCards 
            stats={realEstateStats || {
              total_properties: 0,
              available_properties: 0,
              rented_properties: 0,
              for_sale_properties: 0,
              maintenance_properties: 0,
              total_monthly_rent: 0,
              total_yearly_rent: 0,
              occupancy_rate: 0,
              average_rent_per_sqm: 0,
              properties_by_type: {
                residential: 0,
                commercial: 0,
                industrial: 0,
                land: 0,
                warehouse: 0,
                office: 0,
                retail: 0,
                villa: 0,
                apartment: 0,
                building: 0
              },
              properties_by_area: {}
            }}
            isLoading={statsLoading}
          />
        </motion.div>

        {/* Phase 7C.2: Real Estate Analytics Widgets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div ref={widgetRefs.occupancy}>
              <OccupancyAnalyticsWidget />
            </div>
            <div ref={widgetRefs.rentCollection}>
              <RentCollectionWidget />
            </div>
            <div ref={widgetRefs.maintenance}>
              <MaintenanceRequestsWidget />
            </div>
          </div>
        </motion.div>

        {/* Property Performance - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div ref={widgetRefs.propertyPerformance}>
            <PropertyPerformanceWidget />
          </div>
        </motion.div>

        {/* Lease & Satisfaction Widgets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div ref={widgetRefs.leaseExpiry}>
              <LeaseExpiryWidget />
            </div>
            <div ref={widgetRefs.tenantSatisfaction}>
              <TenantSatisfactionWidget />
            </div>
            <div ref={widgetRefs.vacancy}>
              <VacancyAnalysisWidget />
            </div>
          </div>
        </motion.div>

        {/* Real Estate Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <RealEstateQuickActions />
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
            transition={{ duration: 0.6, delay: 0.7 }}
            className="space-y-6"
          >
            <SmartMetricsPanel
              financialData={smartMetricsData}
              loading={financialLoading}
            />
          </motion.div>
        </div>

      </div>
    </>
  );
};

export default RealEstateDashboard;