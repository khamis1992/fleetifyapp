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
import { Car, Users, FileText, DollarSign, TrendingUp, AlertTriangle, Target, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

// Import responsive components
import { ResponsiveGrid } from '@/components/responsive/ResponsiveGrid';
import { AdaptiveCard } from '@/components/responsive/AdaptiveCard';
import { useResponsiveBreakpoint } from '@/hooks/use-mobile';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { cn } from '@/lib/utils';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { isBrowsingMode, browsedCompany } = useUnifiedCompanyAccess();
  const { exitBrowseMode } = useCompanyContext();
  const { data: enhancedStats, isLoading: statsLoading } = useOptimizedDashboardStats();
  const { data: recentActivities, isLoading: activitiesLoading } = useOptimizedRecentActivities();
  const { data: financialOverview, isLoading: financialLoading } = useFinancialOverview();
  const { formatCurrency } = useCurrencyFormatter();
  const navigate = useNavigate();
  
  // Responsive hooks
  const { isMobile, isTablet, isDesktop } = useResponsiveBreakpoint();
  const { 
    columns, 
    spacing, 
    contentDensity,
    animationStyle,
    viewMode 
  } = useAdaptiveLayout({
    contentDensity: 'comfortable',
    enableAnimations: true
  });

  // Convert financial overview data to the format expected by SmartMetricsPanel
  const smartMetricsData = financialOverview ? {
    totalRevenue: financialOverview.totalRevenue || 0,
    monthlyRevenue: financialOverview.monthlyTrend?.[financialOverview.monthlyTrend.length - 1]?.revenue || 0,
    totalProfit: financialOverview.netIncome || 0,
    profitMargin: financialOverview.profitMargin || 0,
    monthlyGrowth: 0, // Calculate based on monthly trend if needed
    activeContracts: 0, // This would need to come from a different source
    pendingPayments: 0, // This would need to come from a different source
    overduePayments: 0, // This would need to come from a different source
  } : undefined;

  // Convert activities to enhanced format with fallback data
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


  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 18) return "مساء الخير";
    return "مساء الخير";
  };

  // Enhanced stats configuration with actions
  const statsConfig = [
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
      title: 'العقود النشطة',
      value: String(enhancedStats?.activeContracts || 0),
      change: String(enhancedStats?.contractsChange || '+0%'),
      icon: FileText,
      trend: 'neutral' as const,
      description: 'عقد ساري المفعول',
      subtitle: 'العقود الجارية',
      actionText: 'إدارة العقود',
      onAction: () => navigate('/contracts')
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
    }
  ];

  // إعداد المساعد الذكي للوحة التحكم
  const dashboardAIConfig: AIAssistantConfig = {
    module: 'dashboard',
    primitives: ['data_analysis', 'content_creation', 'research', 'ideation_strategy'],
    context: {
      stats: enhancedStats,
      activities: enhancedActivities,
      financialData: smartMetricsData,
      userRole: user?.role,
      companyName: browsedCompany?.name || 'شركتك'
    },
    priority: 'high_value',
    enabledFeatures: [
      {
        id: 'dashboard_insights',
        name: 'تحليل لوحة التحكم',
        description: 'تحليل ذكي للإحصائيات والبيانات المعروضة',
        primitive: 'data_analysis',
        taskType: 'analyze_data',
        enabled: true
      },
      {
        id: 'create_report',
        name: 'إنشاء التقارير',
        description: 'إنشاء تقارير مخصصة بناءً على البيانات',
        primitive: 'content_creation',
        taskType: 'create_report',
        enabled: true
      },
      {
        id: 'suggest_actions',
        name: 'اقتراح الإجراءات',
        description: 'اقتراح إجراءات لتحسين الأداء',
        primitive: 'ideation_strategy',
        taskType: 'suggest_action',
        enabled: true
      },
      {
        id: 'optimize_workflow',
        name: 'تحسين سير العمل',
        description: 'تحليل وتحسين العمليات الحالية',
        primitive: 'automation',
        taskType: 'optimize_workflow',
        enabled: true
      }
    ]
  };

  return (
    <>
      <ProfessionalBackground />
      <div className={cn(
        "relative z-10",
        spacing
      )}>
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <EnhancedDashboardHeader
            isBrowsingMode={isBrowsingMode}
            browsedCompany={browsedCompany}
            onExitBrowseMode={exitBrowseMode}
          />
        </motion.div>

        {/* Enhanced Stats Grid - Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ResponsiveGrid
            columns={columns.stats}
            gap={isMobile ? 4 : 6}
            className="mb-6"
          >
            {statsConfig.map((stat, index) => (
              <AdaptiveCard
                key={stat.title}
                variant={isMobile ? 'compact' : 'default'}
                interactive={true}
                className={cn(
                  "transition-all duration-200",
                  animationStyle
                )}
              >
                <EnhancedStatsCard
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
              </AdaptiveCard>
            ))}
          </ResponsiveGrid>
        </motion.div>

        {/* Quick Actions Panel - Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-6"
        >
          <AdaptiveCard
            variant={isMobile ? 'compact' : 'default'}
            className={cn(
              "transition-all duration-200",
              animationStyle
            )}
          >
            <QuickActionsDashboard />
          </AdaptiveCard>
        </motion.div>

        {/* Main Content Grid - Adaptive Layout */}
        <ResponsiveGrid
          columns={isMobile ? 1 : isTablet ? 1 : 3}
          gap={isMobile ? 4 : 6}
          className="items-start"
        >
          {/* Enhanced Activity Feed */}
          <div className={cn(
            isMobile ? "col-span-1" : isTablet ? "col-span-1" : "col-span-2"
          )}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <AdaptiveCard
                variant={isMobile ? 'compact' : 'default'}
                className={cn(
                  "h-full transition-all duration-200",
                  animationStyle
                )}
              >
                <EnhancedActivityFeed
                  activities={enhancedActivities}
                  loading={activitiesLoading}
                  title="النشاطات الأخيرة"
                  onRefresh={() => window.location.reload()}
                  showFilters={!isMobile}
                />
              </AdaptiveCard>
            </motion.div>
          </div>

          {/* Enhanced Sidebar - Responsive */}
          <div className="col-span-1">
            <motion.div
              initial={{ opacity: 0, x: isMobile ? 0 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className={cn(
                isMobile ? "space-y-4" : "space-y-6"
              )}
            >
              {/* Smart Metrics Panel */}
              <AdaptiveCard
                variant={isMobile ? 'compact' : 'default'}
                className={cn(
                  "transition-all duration-200",
                  animationStyle
                )}
              >
                <SmartMetricsPanel 
                  financialData={smartMetricsData} 
                  loading={financialLoading} 
                />
              </AdaptiveCard>

              {/* Document Expiry Alerts */}
              <AdaptiveCard
                variant={isMobile ? 'compact' : 'default'}
                className={cn(
                  "transition-all duration-200",
                  animationStyle
                )}
              >
                <DocumentExpiryAlerts />
              </AdaptiveCard>
            </motion.div>
          </div>
        </ResponsiveGrid>

        {/* Floating AI Assistant - Positioned for mobile */}
        <FloatingAIAssistant 
          config={dashboardAIConfig}
          className={cn(
            isMobile ? "bottom-24 right-4" : "bottom-6 right-6"
          )}
        />
      </div>
    </>
  );
};

export default Dashboard;