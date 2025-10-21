import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useOptimizedDashboardStats } from '@/hooks/useOptimizedDashboardStats';
import { useOptimizedRecentActivities } from '@/hooks/useOptimizedRecentActivities';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import ProfessionalBackground from '@/components/dashboard/ProfessionalBackground';
import EnhancedDashboardHeader from '@/components/dashboard/EnhancedDashboardHeader';
import QuickActionsDashboard from '@/components/dashboard/QuickActionsDashboard';
import EnhancedActivityFeed from '@/components/dashboard/EnhancedActivityFeed';
import SmartMetricsPanel from '@/components/dashboard/SmartMetricsPanel';
import { DocumentExpiryAlerts } from '@/components/dashboard/DocumentExpiryAlerts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { CommandPalette } from '@/components/command-palette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useExport } from '@/hooks/useExport';
import { toast } from 'sonner';

// Import Retail-specific widgets
import { SalesAnalyticsWidget } from '@/components/dashboard/retail/SalesAnalyticsWidget';
import { InventoryLevelsWidget } from '@/components/dashboard/retail/InventoryLevelsWidget';
import { TopProductsWidget } from '@/components/dashboard/retail/TopProductsWidget';
import { CustomerInsightsWidget } from '@/components/dashboard/retail/CustomerInsightsWidget';
import { ReorderRecommendationsWidget } from '@/components/dashboard/retail/ReorderRecommendationsWidget';
import { SalesForecastWidget } from '@/components/dashboard/retail/SalesForecastWidget';
import { CategoryPerformanceWidget } from '@/components/dashboard/retail/CategoryPerformanceWidget';

const RetailDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isBrowsingMode, browsedCompany } = useUnifiedCompanyAccess();
  const { exitBrowseMode } = useCompanyContext();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { data: recentActivities, isLoading: activitiesLoading } = useOptimizedRecentActivities();
  const { data: financialOverview, isLoading: financialLoading } = useFinancialOverview();
  const { formatCurrency } = useCurrencyFormatter();
  const { exportDashboardPDF, state: exportState } = useExport();

  // Widget refs for export
  const widgetRefs = {
    salesAnalytics: useRef<HTMLDivElement>(null),
    inventoryLevels: useRef<HTMLDivElement>(null),
    customerInsights: useRef<HTMLDivElement>(null),
    topProducts: useRef<HTMLDivElement>(null),
    reorderRecommendations: useRef<HTMLDivElement>(null),
    salesForecast: useRef<HTMLDivElement>(null),
    categoryPerformance: useRef<HTMLDivElement>(null),
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
        { element: widgetRefs.salesAnalytics.current!, title: 'تحليلات المبيعات' },
        { element: widgetRefs.inventoryLevels.current!, title: 'مستويات المخزون' },
        { element: widgetRefs.customerInsights.current!, title: 'رؤى العملاء' },
        { element: widgetRefs.topProducts.current!, title: 'أفضل المنتجات' },
        { element: widgetRefs.reorderRecommendations.current!, title: 'توصيات إعادة الطلب' },
        { element: widgetRefs.salesForecast.current!, title: 'توقعات المبيعات' },
        { element: widgetRefs.categoryPerformance.current!, title: 'أداء الفئات' },
      ].filter(chart => chart.element !== null);

      if (charts.length === 0) {
        toast.error('لا توجد بيانات للتصدير');
        return;
      }

      await exportDashboardPDF(charts, 'retail_dashboard.pdf', 'لوحة معلومات التجزئة');
    } catch (error) {
      console.error('Export error:', error);
    }
  };

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

        {/* Row 1: Sales Analytics, Inventory Levels, Customer Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div ref={widgetRefs.salesAnalytics}>
              <SalesAnalyticsWidget className="lg:col-span-1" />
            </div>
            <div ref={widgetRefs.inventoryLevels}>
              <InventoryLevelsWidget className="lg:col-span-1" />
            </div>
            <div ref={widgetRefs.customerInsights}>
              <CustomerInsightsWidget className="lg:col-span-1" />
            </div>
          </div>
        </motion.div>

        {/* Row 3: Top Products, Reorder Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div ref={widgetRefs.topProducts}>
              <TopProductsWidget />
            </div>
            <div ref={widgetRefs.reorderRecommendations}>
              <ReorderRecommendationsWidget />
            </div>
          </div>
        </motion.div>

        {/* Row 4: Sales Forecast, Category Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div ref={widgetRefs.salesForecast}>
              <SalesForecastWidget />
            </div>
            <div ref={widgetRefs.categoryPerformance}>
              <CategoryPerformanceWidget />
            </div>
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

export default RetailDashboard;