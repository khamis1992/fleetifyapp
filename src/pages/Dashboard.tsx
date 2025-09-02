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
import { Car, Users, FileText, DollarSign, TrendingUp, AlertTriangle, Target, Zap, Bot, BarChart3, Settings, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { AIChatInterface } from '@/components/contracts/AIChatInterface';
import { AIVisualAnalytics } from '@/components/contracts/AIVisualAnalytics';
import { SmartAutomationEngine } from '@/components/contracts/SmartAutomationEngine';
import { PredictiveInsightsEngine } from '@/components/contracts/PredictiveInsightsEngine';
import { Button } from '@/components/ui/button';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { isBrowsingMode, browsedCompany } = useUnifiedCompanyAccess();
  const { exitBrowseMode } = useCompanyContext();
  const { data: enhancedStats, isLoading: statsLoading } = useOptimizedDashboardStats();
  const { data: recentActivities, isLoading: activitiesLoading } = useOptimizedRecentActivities();
  const { data: financialOverview, isLoading: financialLoading } = useFinancialOverview();
  const { formatCurrency } = useCurrencyFormatter();
  const navigate = useNavigate();

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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
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

        {/* Smart AI Components Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mt-12 space-y-8"
      >
        {/* AI Assistant Quick Access */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-card/80 backdrop-blur-sm border rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg"
            onClick={() => navigate('/contracts')}
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">المساعد الذكي</h3>
                <p className="text-sm text-muted-foreground">تحليل ذكي للعقود</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              احصل على تحليلات متقدمة وتوصيات ذكية لإدارة العقود
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-card/80 backdrop-blur-sm border rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg"
            onClick={() => navigate('/contracts')}
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">التحليلات المرئية</h3>
                <p className="text-sm text-muted-foreground">رؤى بصرية متقدمة</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              عرض البيانات والتحليلات بطريقة بصرية تفاعلية
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-card/80 backdrop-blur-sm border rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg"
            onClick={() => navigate('/contracts')}
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">الأتمتة الذكية</h3>
                <p className="text-sm text-muted-foreground">أتمتة المهام</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              أتمتة المهام المتكررة وتحسين سير العمل
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-card/80 backdrop-blur-sm border rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg"
            onClick={() => navigate('/contracts')}
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">التنبؤات الذكية</h3>
                <p className="text-sm text-muted-foreground">توقعات مستقبلية</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              تحليل المخاطر والتنبؤ بالاتجاهات المستقبلية
            </p>
          </motion.div>
        </div>

        {/* Quick Insights Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="bg-card/80 backdrop-blur-sm border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">الرؤى الذكية السريعة</h3>
            <Button variant="outline" size="sm" onClick={() => navigate('/contracts')}>
              عرض المزيد
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-primary/5">
              <div className="text-2xl font-bold text-primary mb-2">
                {enhancedStats?.activeContracts || 0}
              </div>
              <div className="text-sm text-muted-foreground">عقد نشط</div>
              <div className="text-xs text-green-600 mt-1">+5% هذا الشهر</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-blue-500/5">
              <div className="text-2xl font-bold text-blue-600 mb-2">95%</div>
              <div className="text-sm text-muted-foreground">معدل الرضا</div>
              <div className="text-xs text-green-600 mt-1">+2% من الشهر الماضي</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-orange-500/5">
              <div className="text-2xl font-bold text-orange-600 mb-2">3</div>
              <div className="text-sm text-muted-foreground">عقود تحتاج متابعة</div>
              <div className="text-xs text-orange-600 mt-1">تنتهي قريباً</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
      </div>
    </>
  );
};

export default Dashboard;