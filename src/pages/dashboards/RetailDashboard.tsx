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
import { FloatingAIAssistant } from '@/components/ai/FloatingAIAssistant';
import { AIAssistantConfig } from '@/types/ai-assistant';
import { DashboardGrid } from '@/components/ui/responsive-grid';
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, Warehouse } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

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

  // Retail specific stats configuration
  const statsConfig = [
    {
      title: 'إجمالي المنتجات',
      value: String(Math.floor(Math.random() * 500) + 100), // Mock data
      change: '+12%',
      icon: Package,
      trend: 'up' as const,
      description: 'منتج مسجل',
      subtitle: 'كتالوج المنتجات',
      actionText: 'إدارة المنتجات',
      onAction: () => navigate('/products'),
      gradient: true
    },
    {
      title: 'المبيعات اليومية',
      value: String(Math.floor(Math.random() * 50) + 10), // Mock data
      change: '+8%',
      icon: ShoppingCart,
      trend: 'up' as const,
      description: 'معاملة اليوم',
      subtitle: 'المبيعات النشطة',
      actionText: 'تقارير المبيعات',
      onAction: () => navigate('/sales')
    },
    {
      title: 'العملاء النشطين',
      value: String(enhancedStats?.totalCustomers || 0),
      change: String(enhancedStats?.customersChange || '+0%'),
      icon: Users,
      trend: 'up' as const,
      description: 'عميل مسجل',
      subtitle: 'قاعدة العملاء',
      actionText: 'إدارة العملاء',
      onAction: () => navigate('/customers')
    },
    {
      title: 'قيمة المخزون',
      value: formatCurrency(Math.floor(Math.random() * 100000) + 50000), // Mock data
      change: '+3%',
      icon: Warehouse,
      trend: 'up' as const,
      description: 'قيمة إجمالية',
      subtitle: 'إدارة المخزون',
      actionText: 'تقارير المخزون',
      onAction: () => navigate('/inventory')
    },
    {
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
    },
    {
      title: 'معدل النمو',
      value: '+15%',
      change: '+2%',
      icon: TrendingUp,
      trend: 'up' as const,
      description: 'نمو شهري',
      subtitle: 'أداء الأعمال',
      actionText: 'تحليل النمو',
      onAction: () => navigate('/analytics')
    }
  ];

  // AI Assistant configuration for retail
  const dashboardAIConfig: AIAssistantConfig = {
    module: 'dashboard',
    primitives: ['data_analysis', 'content_creation', 'research', 'ideation_strategy'],
    context: {
      stats: enhancedStats,
      activities: enhancedActivities,
      financialData: smartMetricsData,
      userRole: user?.role,
      companyName: browsedCompany?.name || 'المتجر التجاري'
    },
    priority: 'high_value',
    enabledFeatures: [
      {
        id: 'sales_insights',
        name: 'تحليل المبيعات',
        description: 'تحليل ذكي لأداء المبيعات والمنتجات',
        primitive: 'data_analysis',
        taskType: 'analyze_data',
        enabled: true
      },
      {
        id: 'inventory_report',
        name: 'تقارير المخزون',
        description: 'إنشاء تقارير مفصلة عن حالة المخزون',
        primitive: 'content_creation',
        taskType: 'create_report',
        enabled: true
      }
    ]
  };

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

        {/* Floating AI Assistant */}
        <FloatingAIAssistant config={dashboardAIConfig} />
      </div>
    </>
  );
};

export default RetailDashboard;