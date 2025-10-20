import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useOptimizedDashboardStats } from '@/hooks/useOptimizedDashboardStats';
import { useOptimizedRecentActivities } from '@/hooks/useOptimizedRecentActivities';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import { useModuleConfig } from '@/modules/core/hooks';
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
import { Car, Users, FileText, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { FleetAvailabilityWidget } from '@/components/dashboard/car-rental/FleetAvailabilityWidget';
import { RentalAnalyticsWidget } from '@/components/dashboard/car-rental/RentalAnalyticsWidget';
import { MaintenanceScheduleWidget } from '@/components/dashboard/car-rental/MaintenanceScheduleWidget';
import { RentalTimelineWidget } from '@/components/dashboard/car-rental/RentalTimelineWidget';
import { InsuranceAlertsWidget } from '@/components/dashboard/car-rental/InsuranceAlertsWidget';
import { RevenueOptimizationWidget } from '@/components/dashboard/car-rental/RevenueOptimizationWidget';

const CarRentalDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isBrowsingMode, browsedCompany } = useUnifiedCompanyAccess();
  const { exitBrowseMode } = useCompanyContext();
  const { data: enhancedStats, isLoading: statsLoading } = useOptimizedDashboardStats();
  const { data: recentActivities, isLoading: activitiesLoading } = useOptimizedRecentActivities();
  const { data: financialOverview, isLoading: financialLoading } = useFinancialOverview('car_rental');
  const { formatCurrency } = useCurrencyFormatter();
  const { moduleContext } = useModuleConfig();
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

  // Enhanced stats configuration with actions based on enabled modules
  const isVehiclesEnabled = moduleContext?.activeModules.includes('vehicles') || false;
  const isPropertiesEnabled = moduleContext?.activeModules.includes('properties') || false;
  
  const statsConfig = [];

  // Always show customers
  statsConfig.push({
    title: 'العملاء النشطين',
    value: String(enhancedStats?.totalCustomers || 0),
    change: String(enhancedStats?.customersChange || '+0%'),
    icon: Users,
    trend: 'up' as const,
    description: 'عميل مسجل',
    subtitle: 'قاعدة العملاء',
    actionText: 'إدارة المستأجرين',
    onAction: () => navigate('/tenants')
  });

  // Show vehicle stats if vehicles module is enabled
  if (isVehiclesEnabled) {
    statsConfig.push(
      {
        title: 'إجمالي المركبات',
        value: String(enhancedStats?.totalVehicles || 0),
        change: String(enhancedStats?.vehiclesChange || '+0%'),
        icon: Car,
        trend: 'up' as const,
        description: 'مركبة في الأسطول',
        subtitle: 'الأسطول الكامل',
        actionText: 'إدارة الأسطول',
        onAction: () => navigate('/fleet'),
        gradient: true
      },
      {
        title: 'العقود النشطة',
        value: String(enhancedStats?.activeContracts || 0),
        change: String(enhancedStats?.contractsChange || '+0%'),
        icon: FileText,
        trend: 'neutral' as const,
        description: 'عقد ساري المفعول',
        subtitle: 'العقود الجارية',
        actionText: 'إدارة العقود',
        onAction: () => navigate('/contracts')
      }
    );
  }

  // Always show revenue
  statsConfig.push({
    title: 'الإيرادات الشهرية',
    value: formatCurrency(enhancedStats?.monthlyRevenue || 0),
    change: String(enhancedStats?.revenueChange || '+0%'),
    icon: DollarSign,
    trend: 'up' as const,
    description: 'هذا الشهر',
    subtitle: 'الأداء المالي',
    actionText: 'التقارير المالية',
    onAction: () => navigate('/finance'),
    gradient: true
  });


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

        {/* Car Rental Dashboard Widgets - Row 1 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FleetAvailabilityWidget />
            <RentalAnalyticsWidget />
            <MaintenanceScheduleWidget />
          </div>
        </motion.div>

        {/* Car Rental Dashboard Widgets - Row 2 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RevenueOptimizationWidget />
            <InsuranceAlertsWidget />
          </div>
        </motion.div>

        {/* Car Rental Dashboard Widgets - Row 3 (Full Width Timeline) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <RentalTimelineWidget />
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