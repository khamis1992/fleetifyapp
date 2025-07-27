import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedDashboardStats } from '@/hooks/useEnhancedDashboardStats';
import { useEnhancedRecentActivities } from '@/hooks/useEnhancedRecentActivities';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import ModernBackground from '@/components/dashboard/ModernBackground';
import ExecutiveDashboardCard from '@/components/dashboard/ExecutiveDashboardCard';
import AdminMetricsGrid from '@/components/dashboard/AdminMetricsGrid';
import SmartInsightsPanel from '@/components/dashboard/SmartInsightsPanel';
import QuickActionsPanel from '@/components/dashboard/QuickActionsPanel';
import CleanActivityFeed from '@/components/dashboard/CleanActivityFeed';
import { Car, Users, FileText, DollarSign, TrendingUp, AlertTriangle, Target, Zap, Crown, Shield } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: enhancedStats, isLoading: statsLoading } = useEnhancedDashboardStats();
  const { data: recentActivities, isLoading: activitiesLoading } = useEnhancedRecentActivities();
  const { data: smartAlerts, isLoading: alertsLoading } = useSmartAlerts();
  const { data: financialOverview, isLoading: financialLoading } = useFinancialOverview();

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

  // Convert smart alerts to the format expected by MinimalAlertSystem
  const convertedAlerts = smartAlerts?.map(alert => ({
    id: alert.id,
    title: alert.title,
    message: alert.message,
    type: alert.type,
    priority: alert.priority,
    timestamp: new Date(alert.created_at).toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    action: alert.action ? {
      label: alert.action,
      onClick: () => window.location.href = alert.actionUrl || '#'
    } : undefined
  })) || [];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 18) return "مساء الخير";
    return "مساء الخير";
  };

  // Executive KPI Configuration
  const executiveKPIs = [
    {
      title: 'إجمالي المركبات',
      value: String(enhancedStats?.totalVehicles || 0),
      change: String(enhancedStats?.vehiclesChange || '+0%'),
      changeType: 'positive' as const,
      icon: Car,
      trend: 'up' as const,
      description: 'مركبة في الأسطول النشط'
    },
    {
      title: 'العملاء النشطين',
      value: String(enhancedStats?.totalCustomers || 0),
      change: String(enhancedStats?.customersChange || '+0%'),
      changeType: 'positive' as const,
      icon: Users,
      trend: 'up' as const,
      description: 'عميل مسجل ونشط'
    },
    {
      title: 'العقود النشطة',
      value: String(enhancedStats?.activeContracts || 0),
      change: String(enhancedStats?.contractsChange || '+0%'),
      changeType: 'neutral' as const,
      icon: FileText,
      trend: 'neutral' as const,
      description: 'عقد ساري المفعول'
    },
    {
      title: 'الإيرادات الشهرية',
      value: `${enhancedStats?.monthlyRevenue || 0} د.ك`,
      change: String(enhancedStats?.revenueChange || '+0%'),
      changeType: 'positive' as const,
      icon: DollarSign,
      trend: 'up' as const,
      description: 'الأداء المالي الحالي'
    }
  ];

  return (
    <>
      <ModernBackground />
      <div className="relative z-10 space-y-8">
        {/* Executive Command Center Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-glass backdrop-blur-sm border-0 rounded-2xl p-8 shadow-glass"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-3 rounded-xl bg-gradient-executive text-primary-foreground shadow-glow">
                    <Crown size={24} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-primary" />
                    <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                      لوحة التحكم التنفيذية
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h1 className="text-5xl font-bold text-foreground mb-3 arabic-heading-lg">
                  {getGreeting()}، {user?.profile?.first_name_ar || user?.profile?.first_name || 'المدير التنفيذي'}
                </h1>
                <p className="text-muted-foreground text-xl arabic-body-lg">
                  إدارة استراتيجية شاملة لعمليات الشركة والمؤشرات الرئيسية
                </p>
              </div>
            </div>
            
            <motion.div
              className="hidden lg:flex items-center gap-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="text-right">
                <div className="text-sm text-muted-foreground">آخر تحديث</div>
                <div className="text-lg font-semibold text-foreground">
                  {new Date().toLocaleDateString('ar-EG', { 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 15, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
              >
                <div className="w-20 h-20 bg-gradient-executive text-primary-foreground rounded-2xl flex items-center justify-center shadow-glow">
                  <Zap size={36} />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Executive KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {executiveKPIs.map((kpi, index) => (
            <ExecutiveDashboardCard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              change={kpi.change}
              changeType={kpi.changeType}
              icon={kpi.icon}
              trend={kpi.trend}
              description={kpi.description}
              index={index}
            />
          ))}
        </div>

        {/* Advanced Analytics Grid */}
        <div className="space-y-8">
          <AdminMetricsGrid 
            metrics={[]}
            loading={statsLoading} 
          />
        </div>

        {/* Strategic Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Analytics Panel */}
          <div className="lg:col-span-3 space-y-6">
            <CleanActivityFeed 
              activities={recentActivities} 
              loading={activitiesLoading} 
            />
          </div>

          {/* Executive Sidebar */}
          <div className="space-y-6">
            <QuickActionsPanel 
              actions={[]}
              loading={false} 
            />
            
            <SmartInsightsPanel 
              insights={[]} 
              loading={alertsLoading} 
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;