import React from 'react';
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
      title: 'Total Companies',
      value: loading ? '...' : stats.totalCompanies.toString(),
      change: '+12%',
      icon: Building2,
      color: 'from-blue-500 to-blue-600',
      bgPattern: 'from-blue-50 to-blue-100'
    },
    {
      title: 'Active Users',
      value: loading ? '...' : stats.totalUsers.toString(),
      change: '+23%',
      icon: Users,
      color: 'from-green-500 to-green-600',
      bgPattern: 'from-green-50 to-green-100'
    },
    {
      title: 'Total Revenue',
      value: loading ? '...' : `${stats.totalRevenue.toFixed(0)} KWD`,
      change: '+18%',
      icon: DollarSign,
      color: 'from-purple-500 to-purple-600',
      bgPattern: 'from-purple-50 to-purple-100'
    },
    {
      title: 'System Usage',
      value: loading ? '...' : `${stats.systemUsage}%`,
      change: '+5%',
      icon: Activity,
      color: 'from-orange-500 to-orange-600',
      bgPattern: 'from-orange-50 to-orange-100'
    },
    {
      title: 'Pending Payments',
      value: loading ? '...' : stats.pendingPayments.toString(),
      change: '-8%',
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      bgPattern: 'from-red-50 to-red-100'
    },
    {
      title: 'Active Companies',
      value: loading ? '...' : stats.activeCompanies.toString(),
      change: '+15%',
      icon: TrendingUp,
      color: 'from-teal-500 to-teal-600',
      bgPattern: 'from-teal-50 to-teal-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statsData.map((stat, index) => (
        <Card 
          key={index} 
          className="group border-0 bg-gradient-to-br from-background to-background/50 backdrop-blur-sm shadow-card hover:shadow-elevated transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 overflow-hidden"
        >
          <CardContent className="p-0">
            <div className="p-6 relative">
              {/* Background Pattern */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgPattern} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-3 tracking-wide">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                    {stat.value}
                  </p>
                  <div className="flex items-center">
                    <div className="flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded-full text-xs font-semibold">
                      <TrendingUp className="h-3 w-3" />
                      {stat.change}
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                    <stat.icon className="h-7 w-7 text-white drop-shadow-sm" />
                  </div>
                  <div className={`absolute inset-0 p-4 rounded-2xl bg-gradient-to-br ${stat.color} opacity-20 blur-xl group-hover:opacity-40 transition-all duration-300`}>
                    <stat.icon className="h-7 w-7 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Bottom Accent Line */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};