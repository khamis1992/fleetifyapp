/**
 * Employee Quick Stats Component
 * بطاقات الإحصائيات السريعة للموظف
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  DollarSign, 
  CheckCircle, 
  Star,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { EmployeePerformance, EmployeePerformanceGrade } from '@/types/employee-workspace.types';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { Skeleton } from '@/components/ui/skeleton';

interface EmployeeQuickStatsProps {
  contractStats: {
    totalContracts: number;
    activeContracts: number;
    contractsWithBalance: number;
    totalBalanceDue: number;
    priorityCount: number;
  };
  taskStats: {
    totalTasks: number;
    todayTasks: number;
    overdueTasks: number;
    completedTasks: number;
    completionRate: number;
  };
  performance: EmployeePerformance | null | undefined;
  performanceGrade: EmployeePerformanceGrade | null;
  isLoading: boolean;
}

export const EmployeeQuickStats: React.FC<EmployeeQuickStatsProps> = ({
  contractStats,
  taskStats,
  performance,
  performanceGrade,
  isLoading
}) => {
  const { formatCurrency } = useCurrencyFormatter();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: 'عقودي',
      value: contractStats.totalContracts,
      subtitle: `${contractStats.activeContracts} نشط`,
      icon: FileText,
      color: 'blue',
      badge: contractStats.priorityCount > 0 ? {
        text: `${contractStats.priorityCount} يحتاج متابعة`,
        variant: 'destructive' as const
      } : null
    },
    {
      title: 'المستحق',
      value: formatCurrency(contractStats.totalBalanceDue),
      subtitle: `${contractStats.contractsWithBalance} عقد`,
      icon: DollarSign,
      color: contractStats.totalBalanceDue > 0 ? 'red' : 'green',
      badge: contractStats.totalBalanceDue > 0 ? {
        text: 'متأخر',
        variant: 'destructive' as const
      } : null
    },
    {
      title: 'المهام',
      value: `${taskStats.todayTasks}/${taskStats.totalTasks}`,
      subtitle: `${taskStats.completionRate}% مكتمل`,
      icon: CheckCircle,
      color: taskStats.overdueTasks > 0 ? 'orange' : 'green',
      badge: taskStats.overdueTasks > 0 ? {
        text: `${taskStats.overdueTasks} متأخرة`,
        variant: 'destructive' as const
      } : null
    },
    {
      title: 'نقاطي',
      value: performance ? Math.round(performance.performance_score) : 0,
      subtitle: performanceGrade ? performanceGrade.label_ar : 'لا يوجد',
      icon: Star,
      color: performanceGrade?.color || 'gray',
      badge: performanceGrade ? {
        text: performanceGrade.grade,
        variant: 'default' as const
      } : null
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const colorClasses = {
          blue: 'bg-blue-100 text-blue-600',
          red: 'bg-red-100 text-red-600',
          green: 'bg-green-100 text-green-600',
          orange: 'bg-orange-100 text-orange-600',
          yellow: 'bg-yellow-100 text-yellow-600',
          gray: 'bg-gray-100 text-gray-600'
        };

        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stat.subtitle}
                  </p>
                  {stat.badge && (
                    <Badge 
                      variant={stat.badge.variant} 
                      className="mt-2"
                    >
                      {stat.badge.text}
                    </Badge>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
