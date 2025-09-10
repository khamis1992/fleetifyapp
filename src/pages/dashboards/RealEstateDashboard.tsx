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
import { DashboardGrid } from '@/components/ui/responsive-grid';
import { Home, Users, FileText, DollarSign, UserCheck, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

const RealEstateDashboard: React.FC = () => {
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

  // Real estate specific stats configuration
  const statsConfig = [
    {
      title: 'إجمالي العقارات',
      value: String(enhancedStats?.totalProperties || 0),
      change: String(enhancedStats?.propertiesChange || '+0%'),
      icon: Home,
      trend: 'up' as const,
      description: 'عقار مسجل',
      subtitle: 'محفظة العقارات',
      actionText: 'إدارة العقارات',
      onAction: () => navigate('/properties'),
      gradient: true
    },
    {
      title: 'العقارات المؤجرة',
      value: String(Math.floor((enhancedStats?.totalProperties || 0) * 0.75)), // Mock occupied percentage
      change: '+5%',
      icon: TrendingUp,
      trend: 'up' as const,
      description: 'عقار مؤجر حالياً',
      subtitle: 'معدل الإشغال',
      actionText: 'تقارير الإشغال',
      onAction: () => navigate('/properties')
    },
    {
      title: 'ملاك العقارات',
      value: String(enhancedStats?.totalPropertyOwners || 0),
      change: '+0%',
      icon: UserCheck,
      trend: 'up' as const,
      description: 'مالك مسجل',
      subtitle: 'قاعدة الملاك',
      actionText: 'إدارة الملاك',
      onAction: () => navigate('/property-owners')
    },
    {
      title: 'المستأجرين',
      value: String(enhancedStats?.totalCustomers || 0),
      change: String(enhancedStats?.customersChange || '+0%'),
      icon: Users,
      trend: 'up' as const,
      description: 'مستأجر نشط',
      subtitle: 'قاعدة المستأجرين',
      actionText: 'إدارة المستأجرين',
      onAction: () => navigate('/tenants')
    },
    {
      title: 'إيرادات الإيجار',
      value: formatCurrency(enhancedStats?.monthlyRevenue || 0),
      change: String(enhancedStats?.revenueChange || '+0%'),
      icon: DollarSign,
      trend: 'up' as const,
      description: 'هذا الشهر',
      subtitle: 'الأداء المالي',
      actionText: 'التقارير المالية',
      onAction: () => navigate('/finance'),
      gradient: true
    },
    {
      title: 'عقود الإيجار',
      value: String(enhancedStats?.activeContracts || 0),
      change: String(enhancedStats?.contractsChange || '+0%'),
      icon: FileText,
      trend: 'neutral' as const,
      description: 'عقد ساري المفعول',
      subtitle: 'العقود النشطة',
      actionText: 'إدارة العقود',
      onAction: () => navigate('/contracts')
    }
  ];


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
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <DashboardGrid variant="stats" gap="default">
          {statsConfig.map((stat, index) => (
            <EnhancedStatsCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              change={stat.change}
              icon={stat.icon}
              trend={stat.trend}
              description={stat.description}
              subtitle={stat.subtitle}
              actionText={stat.actionText}
              onAction={stat.onAction}
              gradient={stat.gradient}
              isLoading={statsLoading}
              index={index}
            />
          ))}
          </DashboardGrid>
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

export default RealEstateDashboard;