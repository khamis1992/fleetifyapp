import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useOptimizedDashboardStats } from '@/hooks/useOptimizedDashboardStats';
import { useOptimizedRecentActivities } from '@/hooks/useOptimizedRecentActivities';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import ProfessionalBackground from '@/components/dashboard/ProfessionalBackground';
import EnhancedDashboardHeader from '@/components/dashboard/EnhancedDashboardHeader';
import EnhancedStatsCard from '@/components/dashboard/EnhancedStatsCard';
import QuickActionsDashboard from '@/components/dashboard/QuickActionsDashboard';
import EnhancedActivityFeed from '@/components/dashboard/EnhancedActivityFeed';
import SmartMetricsPanel from '@/components/dashboard/SmartMetricsPanel';
import { DocumentExpiryAlerts } from '@/components/dashboard/DocumentExpiryAlerts';
import { SalesPipelineWidget } from '@/components/dashboard/SalesPipelineWidget';
import { InventoryAlertsWidget } from '@/components/dashboard/InventoryAlertsWidget';
import { VendorPerformanceWidget } from '@/components/dashboard/VendorPerformanceWidget';
import { QuickStatsRow } from '@/components/dashboard/QuickStatsRow';
import { DashboardGrid } from '@/components/ui/responsive-grid';
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, Warehouse } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

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
  const { data: enhancedStats, isLoading: statsLoading } = useOptimizedDashboardStats();
  const { data: recentActivities, isLoading: activitiesLoading } = useOptimizedRecentActivities();
  const { data: financialOverview, isLoading: financialLoading } = useFinancialOverview();
  const { formatCurrency } = useCurrencyFormatter();
  const navigate = useNavigate();

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

  // Remove mock data - use real data from hooks in widgets


  return (
    <>
      <ProfessionalBackground />
      <div className="relative z-10 space-y-8">
        {/* Enhanced Header */}
        <EnhancedDashboardHeader
          isBrowsingMode={isBrowsingMode}
          browsedCompany={browsedCompany}
          onExitBrowseMode={exitBrowseMode}
        />

        {/* Phase 7B Quick Stats Row */}
        <QuickStatsRow />

        {/* Row 2: Sales Analytics, Inventory Levels, Customer Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SalesAnalyticsWidget className="lg:col-span-1" />
            <InventoryLevelsWidget className="lg:col-span-1" />
            <CustomerInsightsWidget className="lg:col-span-1" />
          </div>
        </motion.div>

        {/* Row 3: Top Products, Reorder Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopProductsWidget />
            <ReorderRecommendationsWidget />
          </div>
        </motion.div>

        {/* Row 4: Sales Forecast, Category Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SalesForecastWidget />
            <CategoryPerformanceWidget />
          </div>
        </motion.div>

        {/* Phase 7B Original Widgets (kept for compatibility) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SalesPipelineWidget />
            <InventoryAlertsWidget />
            <VendorPerformanceWidget />
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