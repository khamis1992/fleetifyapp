import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  FileText, 
  Users, 
  DollarSign,
  UserCheck,
  Wrench,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { EnhancedDashboardStats } from '@/hooks/useEnhancedDashboardStats';

interface EnhancedStatsGridProps {
  stats: EnhancedDashboardStats;
  loading?: boolean;
}

export const EnhancedStatsGrid: React.FC<EnhancedStatsGridProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="group border-0 bg-gradient-to-br from-background to-background/50 backdrop-blur-sm shadow-card">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-20 mb-3"></div>
                <div className="h-8 bg-muted rounded w-16 mb-3"></div>
                <div className="h-4 bg-muted rounded w-12"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => `${amount.toFixed(0)} د.ك`;
  const formatPercentage = (percentage: number) => `${percentage.toFixed(1)}%`;

  const getChangeIcon = (change: number) => {
    if (change > 0) return TrendingUp;
    if (change < 0) return TrendingDown;
    return Minus;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-success bg-success/10';
    if (change < 0) return 'text-destructive bg-destructive/10';
    return 'text-muted-foreground bg-muted/10';
  };

  const statsData = [
    {
      title: 'إجمالي الأسطول',
      value: stats.totalVehicles.toString(),
      change: stats.vehiclesChangeText,
      changeValue: stats.vehiclesChange,
      icon: Car,
      color: 'from-blue-500 to-blue-600',
      description: `معدل الاستغلال ${formatPercentage(stats.fleetUtilization)}`
    },
    {
      title: 'العقود النشطة',
      value: stats.activeContracts.toString(),
      change: stats.contractsChangeText,
      changeValue: stats.contractsChange,
      icon: FileText,
      color: 'from-green-500 to-green-600',
      description: `متوسط القيمة ${formatCurrency(stats.averageContractValue)}`
    },
    {
      title: 'العملاء',
      value: stats.totalCustomers.toString(),
      change: stats.customersChangeText,
      changeValue: stats.customersChange,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      description: `معدل النمو ${formatPercentage(stats.customerGrowthRate)}`
    },
    {
      title: 'الإيرادات الشهرية',
      value: formatCurrency(stats.monthlyRevenue),
      change: stats.revenueChangeText,
      changeValue: stats.revenueChange,
      icon: DollarSign,
      color: 'from-amber-500 to-amber-600',
      description: `هامش الربح ${formatPercentage(stats.profitMargin)}`
    },
    {
      title: 'الموظفون',
      value: stats.totalEmployees.toString(),
      change: stats.employeesChangeText,
      changeValue: stats.employeesChange,
      icon: UserCheck,
      color: 'from-indigo-500 to-indigo-600',
      description: 'إدارة الموارد البشرية'
    },
    {
      title: 'طلبات الصيانة',
      value: stats.maintenanceRequests.toString(),
      change: stats.maintenanceRequests > 5 ? 'مرتفع' : 'طبيعي',
      changeValue: 0,
      icon: Wrench,
      color: 'from-orange-500 to-orange-600',
      description: 'صيانة دورية ووقائية'
    },
    {
      title: 'المدفوعات المعلقة',
      value: formatCurrency(stats.pendingPayments),
      change: stats.pendingPayments > 1000 ? 'يحتاج متابعة' : 'طبيعي',
      changeValue: 0,
      icon: Clock,
      color: 'from-red-500 to-red-600',
      description: 'إدارة التدفق النقدي'
    },
    {
      title: 'عقود تنتهي قريباً',
      value: stats.expiringContracts.toString(),
      change: stats.expiringContracts > 5 ? 'يحتاج تجديد' : 'طبيعي',
      changeValue: 0,
      icon: FileText,
      color: 'from-teal-500 to-teal-600',
      description: 'تتبع انتهاء العقود'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => {
        const ChangeIcon = getChangeIcon(stat.changeValue);
        const changeColor = getChangeColor(stat.changeValue);
        
        return (
          <Card 
            key={index} 
            className="group border-0 bg-gradient-to-br from-background to-background/50 backdrop-blur-sm shadow-card hover:shadow-elevated transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1"
          >
            <CardContent className="p-0 overflow-hidden">
              <div className="p-6 relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-2 tracking-wide">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {stat.description}
                    </p>
                    <div className="flex items-center">
                      <Badge className={`text-xs px-2 py-1 ${changeColor}`}>
                        <ChangeIcon className="h-3 w-3 mr-1" />
                        {stat.change}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                      <stat.icon className="h-6 w-6 text-white drop-shadow-sm" />
                    </div>
                    <div className={`absolute inset-0 p-4 rounded-2xl bg-gradient-to-br ${stat.color} opacity-20 blur-xl group-hover:opacity-40 transition-all duration-300`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                
                {/* Bottom Accent Line */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};