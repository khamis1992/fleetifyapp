import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useOptimizedRecentActivities } from '@/hooks/useOptimizedRecentActivities';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import EnhancedActivityFeed from './EnhancedActivityFeed';
import SmartMetricsPanel from './SmartMetricsPanel';

/**
 * Dashboard Activity Section Component
 * Separated to improve code splitting and lazy loading
 */
const DashboardActivitySection: React.FC = React.memo(() => {
  const { data: recentActivities, isLoading: activitiesLoading } = useOptimizedRecentActivities();
  const { data: financialOverview, isLoading: financialLoading } = useFinancialOverview('car_rental');
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats();

  // Convert dashboard stats data for SmartMetricsPanel
  const smartMetricsData = useMemo(() => {
    if (!dashboardStats) return undefined;
    
    return {
      totalRevenue: dashboardStats.monthlyRevenue || 0,
      monthlyRevenue: dashboardStats.monthlyRevenue || 0,
      totalProfit: financialOverview?.netIncome || 0,
      profitMargin: financialOverview?.profitMargin || 0,
      monthlyGrowth: parseFloat(dashboardStats.revenueChange?.replace(/[^0-9.-]/g, '') || '0'),
      activeContracts: dashboardStats.activeContracts || 0,
      pendingPayments: 0,
      overduePayments: 0,
    };
  }, [dashboardStats, financialOverview]);

  // Convert activities to enhanced format
  const enhancedActivities = useMemo(() => {
    if (!recentActivities) return [];
    
    return recentActivities.slice(0, 10).map((activity, index) => ({
      id: activity.id || `activity-${index}`,
      type: 'system' as const,
      title: activity.description || 'نشاط جديد',
      description: activity.description || 'لا يوجد وصف',
      user: 'النظام',
      timestamp: new Date(activity.created_at || new Date()),
      status: 'info' as const,
      metadata: {
        'نوع العملية': activity.description || 'غير محدد',
        'الوقت': new Date(activity.created_at || new Date()).toLocaleString('en-US')
      }
    }));
  }, [recentActivities]);

  return (
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
        data-tour="dashboard-metrics"
      >
        <SmartMetricsPanel
          financialData={smartMetricsData}
          loading={statsLoading}
        />
      </motion.div>
    </div>
  );
});

DashboardActivitySection.displayName = 'DashboardActivitySection';

export default DashboardActivitySection;
