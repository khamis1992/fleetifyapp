import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useRealEstateDashboardStats } from '@/hooks/useRealEstateDashboardStats';
import { useOptimizedRecentActivities } from '@/hooks/useOptimizedRecentActivities';
import { useRealEstateKPIs } from '@/hooks/useRealEstateKPIs';
import { usePropertyAlerts } from '@/hooks/usePropertyAlerts';

import ProfessionalBackground from '@/components/dashboard/ProfessionalBackground';
import EnhancedDashboardHeader from '@/components/dashboard/EnhancedDashboardHeader';
import RealEstateStatsGrid from '@/components/real-estate/RealEstateStatsGrid';
import PropertyCalendarWidget from '@/components/real-estate/PropertyCalendarWidget';
import FinancialAnalyticsPanel from '@/components/real-estate/FinancialAnalyticsPanel';
import RealEstateKPIDashboard from '@/components/real-estate/RealEstateKPIDashboard';
import PropertyPerformanceChart from '@/components/real-estate/PropertyPerformanceChart';
import RealEstateQuickActions from '@/components/dashboard/RealEstateQuickActions';
import EnhancedActivityFeed from '@/components/dashboard/EnhancedActivityFeed';
import RealEstateEmptyState from '@/components/dashboard/RealEstateEmptyState';

const NewRealEstateDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isBrowsingMode, browsedCompany } = useUnifiedCompanyAccess();
  const { exitBrowseMode } = useCompanyContext();
  
  // Data hooks
  const { data: realEstateStats, isLoading: statsLoading } = useRealEstateDashboardStats();
  const { data: recentActivities, isLoading: activitiesLoading } = useOptimizedRecentActivities();
  const { data: kpiData, isLoading: kpiLoading } = useRealEstateKPIs();
  const { data: alerts } = usePropertyAlerts();

  const hasNoData = realEstateStats && realEstateStats.total_properties === 0 && !statsLoading;
  const companyName = browsedCompany?.name || user?.company?.name || "شركتك";

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
      <div className="relative z-10 space-y-8">
        {/* Enhanced Header */}
        <EnhancedDashboardHeader
          isBrowsingMode={isBrowsingMode}
          browsedCompany={browsedCompany}
          onExitBrowseMode={exitBrowseMode}
        />

        {/* Enhanced Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <RealEstateStatsGrid 
            stats={realEstateStats}
            alerts={alerts}
            isLoading={statsLoading}
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <RealEstateQuickActions />
        </motion.div>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Column - KPIs and Performance */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="xl:col-span-8 space-y-6"
          >
            {/* KPI Dashboard */}
            <RealEstateKPIDashboard 
              data={kpiData}
              isLoading={kpiLoading}
            />
            
            {/* Property Performance Chart */}
            <PropertyPerformanceChart 
              stats={realEstateStats}
              isLoading={statsLoading}
            />
          </motion.div>

          {/* Right Column - Calendar and Analytics */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="xl:col-span-4 space-y-6"
          >
            {/* Property Calendar Widget */}
            <PropertyCalendarWidget />
            
            {/* Financial Analytics Panel */}
            <FinancialAnalyticsPanel 
              stats={realEstateStats}
              isLoading={statsLoading}
            />
          </motion.div>
        </div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <EnhancedActivityFeed
            activities={enhancedActivities}
            loading={activitiesLoading}
            title="النشاطات الأخيرة"
            onRefresh={() => window.location.reload()}
            showFilters={true}
          />
        </motion.div>
      </div>
    </>
  );
};

export default NewRealEstateDashboard;