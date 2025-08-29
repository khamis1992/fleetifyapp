import React, { memo, useMemo, Suspense } from 'react';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { useOptimizedDashboardStats } from '@/hooks/useOptimizedDashboardStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy components
const LazyChart = React.lazy(() => import('@/components/charts/RevenueChart'));
const LazyThreeScene = React.lazy(() => 
  import('@/components/landing/AnimatedBackground').then(module => ({ default: module.AnimatedBackground }))
);

// Memoized stat card to prevent unnecessary re-renders
const StatCard = memo(({ 
  title, 
  value, 
  change, 
  icon: Icon 
}: { 
  title: string; 
  value: string | number; 
  change?: string; 
  icon?: any;
}) => (
  <Card className="stat-card">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <p className="text-xs text-muted-foreground">{change}</p>
      )}
    </CardContent>
  </Card>
));

StatCard.displayName = 'StatCard';

// Memoized stats grid
const StatsGrid = memo(({ stats }: { stats: any }) => {
  const statItems = useMemo(() => [
    {
      title: 'إجمالي المركبات',
      value: stats.totalVehicles,
      change: `+${stats.vehicleGrowth}% من الشهر الماضي`
    },
    {
      title: 'العقود النشطة',
      value: stats.activeContracts,
      change: `+${stats.contractGrowth}% من الشهر الماضي`
    },
    {
      title: 'الإيرادات الشهرية',
      value: `${stats.monthlyRevenue} د.ك`,
      change: `+${stats.revenueGrowth}% من الشهر الماضي`
    },
    {
      title: 'معدل الاستخدام',
      value: `${stats.fleetUtilization}%`,
      change: `${stats.utilizationChange}% من الأسبوع الماضي`
    }
  ], [stats]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          change={stat.change}
        />
      ))}
    </div>
  );
});

StatsGrid.displayName = 'StatsGrid';

// Optimized dashboard component with performance enhancements
export const OptimizedDashboard = memo(() => {
  const { data: stats, isLoading, error } = useOptimizedDashboardStats();

  // Memoize expensive calculations
  const chartData = useMemo(() => {
    if (!stats) return [];
    
    return Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2024, i).toLocaleDateString('ar-SA', { month: 'short' }),
      revenue: stats.monthlyRevenue * (0.8 + Math.random() * 0.4),
      contracts: stats.activeContracts * (0.7 + Math.random() * 0.6)
    }));
  }, [stats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-[140px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[100px]" />
                <Skeleton className="h-3 w-[120px] mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-muted-foreground">يرجى المحاولة مرة أخرى لاحقاً</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid - Memoized for performance */}
      <StatsGrid stats={stats} />
      
      {/* Charts Section with Lazy Loading */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>الإيرادات الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-[250px]" />}>
              <LazyChart data={chartData} />
            </Suspense>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>نظرة عامة على الأسطول</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] relative overflow-hidden rounded-lg">
              <Suspense fallback={<Skeleton className="h-full" />}>
                <LazyThreeScene />
              </Suspense>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

OptimizedDashboard.displayName = 'OptimizedDashboard';