import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Users, DollarSign, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import { SystemStats } from '@/hooks/useSuperAdminData';

interface SystemStatsCardsProps {
  stats: SystemStats;
  loading: boolean;
}

export const SystemStatsCards: React.FC<SystemStatsCardsProps> = ({ stats, loading }) => {
  const statsData = [
    {
      title: 'إجمالي الشركات',
      value: loading ? '...' : stats.totalCompanies.toString(),
      change: '+12%',
      icon: Building2,
      trend: 'up' as const,
      description: 'شركة مسجلة'
    },
    {
      title: 'المستخدمين النشطين',
      value: loading ? '...' : stats.totalUsers.toString(),
      change: '+23%',
      icon: Users,
      trend: 'up' as const,
      description: 'مستخدم نشط'
    },
    {
      title: 'إجمالي الإيرادات',
      value: loading ? '...' : `${stats.totalRevenue.toFixed(0)} د.ك`,
      change: '+18%',
      icon: DollarSign,
      trend: 'up' as const,
      description: 'إجمالي الإيرادات'
    },
    {
      title: 'استخدام النظام',
      value: loading ? '...' : `${stats.systemUsage}%`,
      change: '+5%',
      icon: Activity,
      trend: 'up' as const,
      description: 'معدل الاستخدام'
    },
    {
      title: 'المدفوعات المعلقة',
      value: loading ? '...' : stats.pendingPayments.toString(),
      change: '-8%',
      icon: AlertTriangle,
      trend: 'down' as const,
      description: 'دفعة معلقة'
    },
    {
      title: 'الشركات النشطة',
      value: loading ? '...' : stats.activeCompanies.toString(),
      change: '+15%',
      icon: TrendingUp,
      trend: 'up' as const,
      description: 'شركة نشطة'
    }
  ];

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return 'text-green-600 bg-green-50';
      case 'down': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statsData.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
        >
          <Card className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                </div>
                
                <div className="text-left">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor(stat.trend)}`}>
                    <TrendingUp className={`h-3 w-3 ${stat.trend === 'down' ? 'rotate-180' : ''}`} />
                    {stat.change}
                  </div>
                </div>
              </div>

              {/* Progress indicator */}
              <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '70%' }}
                  transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};