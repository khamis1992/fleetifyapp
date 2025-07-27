import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedDashboardStats } from '@/hooks/useEnhancedDashboardStats';
import { useEnhancedRecentActivities } from '@/hooks/useEnhancedRecentActivities';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import { AnimatedDashboardBackground } from '@/components/dashboard/AnimatedDashboardBackground';
import { Enhanced3DStatsGrid } from '@/components/dashboard/Enhanced3DStatsGrid';
import { ParallaxRecentActivities } from '@/components/dashboard/ParallaxRecentActivities';
import { InteractiveDashboardCard } from '@/components/dashboard/InteractiveDashboardCard';
import { SmartAlertsPanel } from '@/components/dashboard/SmartAlertsPanel';
import { FinancialOverviewCard } from '@/components/dashboard/FinancialOverviewCard';
import { 
  Car, 
  FileText, 
  Users, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Plus,
  Activity,
  ArrowRight,
  Zap,
  Sparkles
} from 'lucide-react';

// Helper function to get icon component by name
const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, any> = {
    FileText,
    AlertTriangle,
    Users,
    Activity
  };
  return iconMap[iconName] || Activity;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: enhancedStats, isLoading: statsLoading } = useEnhancedDashboardStats();
  const { data: recentActivities, isLoading: activitiesLoading } = useEnhancedRecentActivities();
  const { data: smartAlerts, isLoading: alertsLoading } = useSmartAlerts();
  const { data: financialOverview, isLoading: financialLoading } = useFinancialOverview();

  // Check if this is a new company with no data
  const isNewCompany = !statsLoading && enhancedStats && 
    enhancedStats.totalVehicles === 0 && 
    enhancedStats.totalCustomers === 0 && 
    enhancedStats.activeContracts === 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 18) return "مساء الخير";
    return "مساء الخير";
  };


  return (
    <>
      <AnimatedDashboardBackground />
      <div className="relative z-10 space-y-8">
        {/* Enhanced Hero Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card/80 via-card/60 to-background/80 border border-primary/20 backdrop-blur-xl shadow-2xl"
        >
          {/* Dynamic background elements */}
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                'radial-gradient(circle at 20% 50%, hsl(var(--primary))/20, transparent 50%)',
                'radial-gradient(circle at 80% 50%, hsl(var(--accent))/20, transparent 50%)',
                'radial-gradient(circle at 50% 20%, hsl(var(--primary))/20, transparent 50%)',
              ],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          
          {/* Floating particles */}
          <div className="absolute inset-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-primary/30 rounded-full"
                animate={{
                  x: [0, 100, 0],
                  y: [0, -50, 0],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 8 + i * 2,
                  repeat: Infinity,
                  delay: i * 2,
                  ease: 'easeInOut',
                }}
                style={{
                  left: `${20 + i * 30}%`,
                  top: `${50 + i * 10}%`,
                }}
              />
            ))}
          </div>

          <div className="relative p-8">
            <div className="flex justify-between items-start">
              <div className="space-y-6 flex-1">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-2 rounded-full border border-primary/20"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">لوحة تحكم متقدمة</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <p className="text-xl text-muted-foreground font-medium mb-2">
                    {getGreeting()}، {user?.profile?.first_name_ar || user?.profile?.first_name || user?.email?.split('@')[0] || 'الضيف'}! 👋
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-primary/90 to-accent bg-clip-text text-transparent leading-tight">
                    لوحة التحكم
                  </h1>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <p className="text-muted-foreground text-xl max-w-2xl leading-relaxed">
                    نظرة شاملة على أداء شركتك وآخر التطورات في نظام إدارة الأسطول
                  </p>
                </motion.div>
              </div>

              {/* Interactive 3D Element */}
              <motion.div 
                className="hidden lg:block relative"
                initial={{ opacity: 0, scale: 0.8, rotateY: -45 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ duration: 1, delay: 0.6 }}
              >
                <motion.div
                  className="relative"
                  animate={{ 
                    rotateY: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 20, 
                    repeat: Infinity, 
                    ease: 'linear'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-3xl"></div>
                  <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm rounded-full p-12 border border-primary/30">
                    <Activity className="h-16 w-16 text-primary" />
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced 3D Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Enhanced3DStatsGrid stats={enhancedStats} loading={statsLoading} />
        </motion.div>

        {/* Main Content Grid with Parallax Effects */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          {/* Enhanced Recent Activities with Parallax */}
          <div className="lg:col-span-2">
            <ParallaxRecentActivities 
              activities={recentActivities} 
              loading={activitiesLoading} 
            />
          </div>

          {/* Enhanced Sidebar with Interactive Cards */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              <InteractiveDashboardCard
                title="التنبيهات الذكية"
                description="تنبيهات مهمة تحتاج لانتباهك"
                icon={AlertTriangle}
                glowColor="hsl(var(--warning))"
                gradient
              >
                <SmartAlertsPanel alerts={smartAlerts || []} loading={alertsLoading} />
              </InteractiveDashboardCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.4 }}
            >
              <InteractiveDashboardCard
                title="النظرة المالية"
                description="ملخص الوضع المالي للشركة"
                icon={DollarSign}
                glowColor="hsl(var(--success))"
                gradient
              >
                <FinancialOverviewCard data={financialOverview} loading={financialLoading} />
              </InteractiveDashboardCard>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Dashboard;