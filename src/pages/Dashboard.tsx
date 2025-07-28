import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedDashboardStats } from '@/hooks/useOptimizedDashboardStats';
import { useOptimizedRecentActivities } from '@/hooks/useOptimizedRecentActivities';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { useRealTimeAlerts } from '@/hooks/useRealTimeAlerts';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import ProfessionalBackground from '@/components/dashboard/ProfessionalBackground';
import ModernStatsCard from '@/components/dashboard/ModernStatsCard';
import CleanActivityFeed from '@/components/dashboard/CleanActivityFeed';
import SmartMetricsPanel from '@/components/dashboard/SmartMetricsPanel';
import { EnhancedAlertsSystem } from '@/components/dashboard/EnhancedAlertsSystem';
import { AlertsNotificationBell } from '@/components/dashboard/AlertsNotificationBell';
import { Car, Users, FileText, DollarSign, TrendingUp, AlertTriangle, Target, Zap } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: enhancedStats, isLoading: statsLoading } = useOptimizedDashboardStats();
  const { data: recentActivities, isLoading: activitiesLoading } = useOptimizedRecentActivities();
  const { data: smartAlerts, isLoading: alertsLoading } = useSmartAlerts();
  const { alerts: realTimeAlerts, totalAlerts, isLoading: realTimeLoading } = useRealTimeAlerts();
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

  // Convert real-time alerts to the format expected by EnhancedAlertsSystem
  const hasAlerts = totalAlerts > 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 18) return "مساء الخير";
    return "مساء الخير";
  };

  // Modern stats configuration
  const statsConfig = [
    {
      title: 'إجمالي المركبات',
      value: String(enhancedStats?.totalVehicles || 0),
      change: String(enhancedStats?.vehiclesChange || '+0%'),
      icon: Car,
      trend: 'up' as const,
      description: 'مركبة في الأسطول'
    },
    {
      title: 'العملاء النشطين',
      value: String(enhancedStats?.totalCustomers || 0),
      change: String(enhancedStats?.customersChange || '+0%'),
      icon: Users,
      trend: 'up' as const,
      description: 'عميل مسجل'
    },
    {
      title: 'العقود النشطة',
      value: String(enhancedStats?.activeContracts || 0),
      change: String(enhancedStats?.contractsChange || '+0%'),
      icon: FileText,
      trend: 'neutral' as const,
      description: 'عقد ساري المفعول'
    },
    {
      title: 'الإيرادات الشهرية',
      value: `${enhancedStats?.monthlyRevenue || 0} د.ك`,
      change: String(enhancedStats?.revenueChange || '+0%'),
      icon: DollarSign,
      trend: 'up' as const,
      description: 'هذا الشهر'
    }
  ];

  return (
    <>
      <ProfessionalBackground />
      <div className="relative z-10 space-y-8">
        {/* Professional Hero Section with Alerts Bell */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                {getGreeting()}, {user?.profile?.first_name_ar || user?.profile?.first_name || 'أهلاً وسهلاً'}
              </h1>
              <p className="text-lg text-muted-foreground">نظرة عامة على أداء شركتك اليوم</p>
            </div>
            <div className="flex items-center gap-4">
              <AlertsNotificationBell />
              {hasAlerts && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-sm text-muted-foreground"
                >
                  {totalAlerts} تنبيه جديد
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Modern Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsConfig.map((stat, index) => (
            <ModernStatsCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              change={stat.change}
              icon={stat.icon}
              trend={stat.trend}
              description={stat.description}
              index={index}
            />
          ))}
        </div>

        {/* Enhanced Alerts and Performance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Enhanced Alerts System */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="lg:col-span-2"
          >
            <EnhancedAlertsSystem />
          </motion.div>

          {/* Sidebar Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <SmartMetricsPanel 
              financialData={smartMetricsData} 
              loading={financialLoading} 
            />
          </motion.div>
        </div>

        {/* Recent Activities Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <CleanActivityFeed 
            activities={recentActivities} 
            loading={activitiesLoading} 
          />
        </motion.div>
      </div>
    </>
  );
};

export default Dashboard;