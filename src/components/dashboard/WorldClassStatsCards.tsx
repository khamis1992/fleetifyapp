import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Car, FileText, Users, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  progress?: number;
  progressLabel?: string;
  icon: React.ReactNode;
  gradient: string;
  delay: number;
}

// Memoized StatCard component to prevent unnecessary re-renders
const StatCard = React.memo<StatCardProps>(({
  title,
  value,
  change,
  progress,
  progressLabel,
  icon,
  gradient,
  delay
}) => {
  const isPositive = change?.startsWith('+');
  
  return (
    <motion.div
      className="group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -4 }}
    >
      <div className="glass-card hover-lift rounded-2xl p-6 relative overflow-hidden">
        {/* Background Glow */}
        <div className={`absolute -bottom-8 -left-8 w-32 h-32 ${gradient} rounded-full blur-2xl`}></div>
        
        <div className="relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className={`p-4 bg-gradient-to-br ${gradient} rounded-2xl shadow-lg group-hover:scale-110 transition-transform`}>
              {icon}
            </div>
            {change && (
              <span className={`badge-premium ${isPositive ? 'badge-success' : 'badge-destructive'}`}>
                {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {change}
              </span>
            )}
          </div>
          
          {/* Content */}
          <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
          <p className="text-4xl font-bold number-display mb-2">{value}</p>
          
          {/* Progress Bar */}
          {progress !== undefined && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500">{progressLabel}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

StatCard.displayName = 'StatCard';

export const WorldClassStatsCards: React.FC = () => {
  const { data: stats, isLoading, error } = useDashboardStats();
  const { formatCurrency } = useCurrencyFormatter();

  // Memoize formatted revenue to prevent recalculation on every render
  const formattedRevenue = useMemo(() => {
    if (!stats?.monthlyRevenue) return '0';
    try {
      return formatCurrency(stats.monthlyRevenue).replace('.00', '');
    } catch (error) {
      console.error('[WorldClassStatsCards] Error formatting currency:', error);
      return '0';
    }
  }, [stats?.monthlyRevenue, formatCurrency]);

  // Memoize card data to prevent recreation on every render
  const cardData = useMemo(() => [
    {
      title: "إجمالي المركبات",
      value: stats?.totalVehicles || 0,
      change: stats?.vehiclesChange,
      progress: stats?.vehicleActivityRate || 0,
      progressLabel: `${stats?.activeVehicles || 0} نشط`,
      icon: <Car className="w-7 h-7 text-white" />,
      gradient: "from-red-500 to-red-600",
      delay: 0
    },
    {
      title: "العقود النشطة",
      value: stats?.activeContracts || 0,
      change: stats?.contractsChange,
      progress: stats?.contractCompletionRate || 0,
      progressLabel: `${stats?.contractCompletionRate || 0}% من الإجمالي`,
      icon: <FileText className="w-7 h-7 text-white" />,
      gradient: "from-orange-500 to-orange-600",
      delay: 0.1
    },
    {
      title: "إجمالي العملاء",
      value: stats?.totalCustomers || 0,
      change: stats?.customersChange,
      progress: stats?.customerSatisfactionRate || 0,
      progressLabel: `${stats?.customerSatisfactionRate || 0}% رضا`,
      icon: <Users className="w-7 h-7 text-white" />,
      gradient: "from-red-400 to-orange-500",
      delay: 0.2
    },
    {
      title: "إيرادات الشهر الحالي",
      value: formattedRevenue,
      change: stats?.revenueChange,
      progress: undefined,
      icon: <TrendingUp className="w-7 h-7 text-white" />,
      gradient: "from-orange-600 to-red-600",
      delay: 0.3
    }
  ], [stats, formattedRevenue]);

  if (isLoading) {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
            <div className="h-16 w-16 bg-gray-200 rounded-2xl mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ))}
      </section>
    );
  }
  
  // Show stats even if there's an error (with default values)
  if (error) {
    console.error('[WorldClassStatsCards] Error loading stats:', error);
    // Continue to render with empty/default stats
  }

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cardData.map((card, index) => (
        <StatCard key={index} {...card} />
      ))}
    </section>
  );
};
