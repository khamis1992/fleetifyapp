import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Users, DollarSign, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import { SystemStats } from '@/hooks/useSuperAdminData';
import { StatCardNumber } from '@/components/ui/NumberDisplay';

interface SystemStatsCardsProps {
  stats: SystemStats;
  loading: boolean;
}

export const SystemStatsCards: React.FC<SystemStatsCardsProps> = ({ stats, loading }) => {
  const statsData = [
    {
      title: 'إجمالي الشركات',
      value: loading ? '...' : stats.totalCompanies.toString(),
      icon: Building2,
      description: 'شركة مسجلة'
    },
    {
      title: 'إجمالي المستخدمين',
      value: loading ? '...' : stats.totalUsers.toString(),
      icon: Users,
      description: 'مستخدم مسجل'
    },
    {
      title: 'إجمالي الإيرادات',
      value: loading ? '...' : `${stats.totalRevenue.toFixed(0)} ر.ق`,
      icon: DollarSign,
      description: 'إجمالي الإيرادات'
    },
    {
      title: 'نسبة الشركات النشطة',
      value: loading ? '...' : `${stats.activeCompanyRate}%`,
      icon: Activity,
      description: 'من إجمالي الشركات'
    },
    {
      title: 'المدفوعات المعلقة',
      value: loading ? '...' : stats.pendingPayments.toString(),
      icon: AlertTriangle,
      description: 'دفعة معلقة'
    },
    {
      title: 'الشركات النشطة',
      value: loading ? '...' : stats.activeCompanies.toString(),
      icon: TrendingUp,
      description: 'شركة نشطة'
    }
  ];

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
                    <StatCardNumber 
                      value={stat.value} 
                      className="text-foreground"
                    />
                    <p className="text-sm text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                </div>
                
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
