import { motion } from 'framer-motion';
import { InteractiveDashboardCard } from './InteractiveDashboardCard';
import { EnhancedDashboardStats } from '@/hooks/useEnhancedDashboardStats';
import { 
  Car, 
  FileText, 
  Users, 
  DollarSign,
  TrendingUp,
  BarChart3,
  Activity,
  Clock,
  Target,
  Award,
  Zap,
  Shield
} from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { StatCardNumber } from '@/components/ui/NumberDisplay';

interface Enhanced3DStatsGridProps {
  stats?: EnhancedDashboardStats;
  loading?: boolean;
}

export function Enhanced3DStatsGrid({ stats, loading }: Enhanced3DStatsGridProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="h-32 bg-muted rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: 'إجمالي المركبات',
      value: stats.totalVehicles.toString(),
      change: stats.vehiclesChange,
      changeLabel: 'هذا الشهر',
      icon: Car,
      color: 'hsl(var(--primary))',
      gradient: true,
      description: 'إجمالي المركبات في الأسطول'
    },
    {
      title: 'العقود النشطة',
      value: stats.activeContracts.toString(),
      change: stats.contractsChange,
      changeLabel: 'نمو',
      icon: FileText,
      color: 'hsl(var(--success))',
      gradient: true,
      description: 'العقود الجارية حالياً'
    },
    {
      title: 'إجمالي العملاء',
      value: stats.totalCustomers.toString(),
      change: stats.customersChange,
      changeLabel: 'عملاء جدد',
      icon: Users,
      color: 'hsl(var(--accent))',
      gradient: true,
      description: 'قاعدة العملاء الإجمالية'
    },
    {
      title: 'الإيرادات الشهرية',
      value: useCurrencyFormatter().formatCurrency(stats.monthlyRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      change: stats.revenueChange,
      changeLabel: 'مقارنة بالشهر الماضي',
      icon: DollarSign,
      color: 'hsl(var(--warning))',
      gradient: true,
      description: 'إيرادات الشهر الحالي'
    },
    {
      title: 'معدل الاستخدام',
      value: `${stats.fleetUtilization}%`,
      change: Math.round(stats.profitMargin),
      changeLabel: 'كفاءة',
      icon: BarChart3,
      color: 'hsl(var(--destructive))',
      description: 'معدل استخدام الأسطول'
    },
    {
      title: 'النشاط اليومي',
      value: stats.totalEmployees.toString(),
      change: stats.employeesChange,
      changeLabel: 'موظف نشط',
      icon: Activity,
      color: 'hsl(var(--primary))',
      description: 'الموظفون النشطون اليوم'
    },
    {
      title: 'وقت التشغيل',
      value: `${stats.fleetUtilization}%`,
      change: 98,
      changeLabel: 'موثوقية',
      icon: Clock,
      color: 'hsl(var(--success))',
      description: 'وقت تشغيل النظام'
    },
    {
      title: 'درجة الأداء',
      value: `${Math.round(stats.profitMargin)}%`,
      change: 15,
      changeLabel: 'تحسن',
      icon: Award,
      color: 'hsl(var(--accent))',
      description: 'مؤشر الأداء العام'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0, rotateX: -15 },
    visible: {
      y: 0,
      opacity: 1,
      rotateX: 0,
      transition: {
        duration: 0.6,
        type: 'spring' as const,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {statsData.map((stat, index) => (
        <motion.div key={stat.title} variants={itemVariants}>
          <InteractiveDashboardCard
            title={stat.title}
            description={stat.description}
            icon={stat.icon}
            glowColor={stat.color}
            gradient={stat.gradient}
            stats={{
              value: stat.value,
              change: stat.change,
              changeLabel: stat.changeLabel,
            }}
            className="h-full"
          >
            {/* Additional animated content */}
            <motion.div
              className="mt-4 p-3 bg-gradient-to-r from-muted/50 to-transparent rounded-lg"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`h-4 w-4 ${
                    stat.change >= 0 ? 'text-success' : 'text-destructive'
                  }`} />
                  <span className="text-sm text-muted-foreground">الاتجاه</span>
                </div>
                <motion.div
                  className="w-16 h-1 bg-muted rounded-full overflow-hidden"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1, delay: index * 0.2 }}
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '0%' }}
                    transition={{ duration: 1.5, delay: index * 0.2 }}
                  />
                </motion.div>
              </div>
            </motion.div>
          </InteractiveDashboardCard>
        </motion.div>
      ))}
    </motion.div>
  );
}