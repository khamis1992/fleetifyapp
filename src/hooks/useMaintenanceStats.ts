/**
 * Hook لجلب إحصائيات الصيانة الشاملة
 * PERFORMANCE OPTIMIZED: Uses database aggregation instead of fetching all records
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MaintenanceStats {
  // إحصائيات الحالة
  totalRecords: number;
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  cancelledCount: number;

  // إحصائيات هذا الشهر
  completedThisMonth: number;
  costThisMonth: number;

  // إحصائيات النوع
  routineCount: number;
  repairCount: number;
  emergencyCount: number;
  preventiveCount: number;

  // التكاليف
  totalCost: number;
  averageCost: number;
  estimatedPendingCost: number;

  // الأداء
  completionRate: number; // معدل الإنجاز
  averageCompletionDays: number; // متوسط أيام الإنجاز

  // المركبات
  vehiclesInMaintenance: number;

  // تنبيهات
  overdueCount: number; // صيانة متأخرة
  urgentCount: number; // عاجلة
  upcomingScheduled: number; // مجدولة قادمة

  // التقارير الشهرية
  monthlyTrend: {
    month: string;
    count: number;
    cost: number;
  }[];
}

export const useMaintenanceStats = () => {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['maintenance-stats', companyId],
    queryFn: async (): Promise<MaintenanceStats> => {
      if (!companyId) {
        throw new Error('Company ID not found');
      }

      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const todayStr = today.toISOString().split('T')[0];
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0];

      // PARALLEL QUERIES: Execute all queries at once instead of sequentially
      const [
        statusCountsResult,
        typeCountsResult,
        thisMonthStatsResult,
        costStatsResult,
        vehiclesInMaintenanceResult,
        alertsResult,
        monthlyTrendResult
      ] = await Promise.all([
        // 1. Status counts using aggregation
        supabase
          .from('vehicle_maintenance')
          .select('status')
          .eq('company_id', companyId),

        // 2. Type counts using aggregation
        supabase
          .from('vehicle_maintenance')
          .select('maintenance_type')
          .eq('company_id', companyId),

        // 3. This month's completed and cost
        supabase
          .from('vehicle_maintenance')
          .select('status, actual_cost, estimated_cost, created_at')
          .eq('company_id', companyId)
          .gte('created_at', new Date(currentYear, currentMonth, 1).toISOString())
          .lte('created_at', new Date(currentYear, currentMonth + 1, 0).toISOString()),

        // 4. Cost statistics (completed and pending)
        supabase
          .from('vehicle_maintenance')
          .select('status, actual_cost, estimated_cost, scheduled_date, completed_date')
          .eq('company_id', companyId),

        // 5. Vehicles in maintenance count
        supabase
          .from('vehicles')
          .select('id')
          .eq('company_id', companyId)
          .eq('status', 'maintenance'),

        // 6. Alerts data (overdue, urgent, upcoming)
        supabase
          .from('vehicle_maintenance')
          .select('id, status, scheduled_date, priority, created_at')
          .eq('company_id', companyId),

        // 7. Monthly trend (last 6 months) - fetch minimal data
        supabase
          .from('vehicle_maintenance')
          .select('created_at, actual_cost, estimated_cost')
          .eq('company_id', companyId)
          .gte('created_at', new Date(currentYear, currentMonth - 5, 1).toISOString())
          .order('created_at', { ascending: true }),
      ]);

      // Process status counts
      const statusCounts = (statusCountsResult.data || []).reduce((acc, r) => {
        acc[r.status || 'unknown'] = (acc[r.status || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const pendingCount = statusCounts['pending'] || 0;
      const inProgressCount = statusCounts['in_progress'] || 0;
      const completedCount = statusCounts['completed'] || 0;
      const cancelledCount = statusCounts['cancelled'] || 0;
      const totalRecords = statusCountsResult.data?.length || 0;

      // Process type counts
      const typeCounts = (typeCountsResult.data || []).reduce((acc, r) => {
        acc[r.maintenance_type || 'unknown'] = (acc[r.maintenance_type || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const routineCount = typeCounts['routine'] || 0;
      const repairCount = typeCounts['repair'] || 0;
      const emergencyCount = typeCounts['emergency'] || 0;
      const preventiveCount = typeCounts['preventive'] || 0;

      // Process this month stats
      const thisMonthRecords = thisMonthStatsResult.data || [];
      const completedThisMonth = thisMonthRecords.filter(r => r.status === 'completed').length;
      const costThisMonth = thisMonthRecords.reduce(
        (sum, r) => sum + (Number(r.actual_cost) || Number(r.estimated_cost) || 0),
        0
      );

      // Process cost stats
      const costRecords = costStatsResult.data || [];
      const completedRecords = costRecords.filter(r => r.status === 'completed');
      const totalCost = completedRecords.reduce(
        (sum, r) => sum + (Number(r.actual_cost) || 0),
        0
      );
      const averageCost = completedRecords.length > 0
        ? Math.round(totalCost / completedRecords.length)
        : 0;

      const pendingRecords = costRecords.filter(r => r.status === 'pending' || r.status === 'in_progress');
      const estimatedPendingCost = pendingRecords.reduce(
        (sum, r) => sum + (Number(r.estimated_cost) || 0),
        0
      );

      // Calculate average completion days
      let totalDays = 0;
      let completedWithDates = 0;
      completedRecords.forEach(r => {
        if (r.scheduled_date && r.completed_date) {
          const start = new Date(r.scheduled_date);
          const end = new Date(r.completed_date);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 0) {
            totalDays += days;
            completedWithDates++;
          }
        }
      });
      const averageCompletionDays = completedWithDates > 0
        ? Math.round(totalDays / completedWithDates)
        : 0;

      // Vehicles in maintenance
      const vehiclesInMaintenance = vehiclesInMaintenanceResult.data?.length || 0;

      // Process alerts
      const alertsRecords = alertsResult.data || [];
      const overdueCount = alertsRecords.filter(r => {
        if (r.status === 'completed' || r.status === 'cancelled') return false;
        if (!r.scheduled_date) return false;
        const scheduled = new Date(r.scheduled_date);
        return scheduled < today;
      }).length;

      const urgentCount = alertsRecords.filter(
        r => r.priority === 'urgent' && r.status !== 'completed' && r.status !== 'cancelled'
      ).length;

      const upcomingScheduled = alertsRecords.filter(r => {
        if (r.status !== 'pending') return false;
        if (!r.scheduled_date) return false;
        const scheduled = new Date(r.scheduled_date);
        return scheduled >= today && scheduled <= sevenDaysLater;
      }).length;

      // Process monthly trend
      const monthlyTrendMap = new Map<string, { count: number; cost: number }>();
      (monthlyTrendResult.data || []).forEach(r => {
        if (!r.created_at) return;
        const date = new Date(r.created_at);
        const monthKey = date.toLocaleDateString('ar-SA', { month: 'short' });
        const existing = monthlyTrendMap.get(monthKey) || { count: 0, cost: 0 };
        monthlyTrendMap.set(monthKey, {
          count: existing.count + 1,
          cost: existing.cost + (Number(r.actual_cost) || Number(r.estimated_cost) || 0),
        });
      });

      // Generate last 6 months trend
      const monthlyTrend: { month: string; count: number; cost: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const monthName = date.toLocaleDateString('ar-SA', { month: 'short' });
        const data = monthlyTrendMap.get(monthName) || { count: 0, cost: 0 };
        monthlyTrend.push({
          month: monthName,
          count: data.count,
          cost: data.cost,
        });
      }

      const completionRate = totalRecords > 0
        ? Math.round((completedCount / totalRecords) * 100)
        : 0;

      return {
        totalRecords,
        pendingCount,
        inProgressCount,
        completedCount,
        cancelledCount,
        completedThisMonth,
        costThisMonth,
        routineCount,
        repairCount,
        emergencyCount,
        preventiveCount,
        totalCost,
        averageCost,
        estimatedPendingCost,
        completionRate,
        averageCompletionDays,
        vehiclesInMaintenance,
        overdueCount,
        urgentCount,
        upcomingScheduled,
        monthlyTrend,
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes - increased for better performance
    gcTime: 10 * 60 * 1000, // 10 minutes cache - increased
    refetchOnWindowFocus: false, // Disable refetch on window focus for better performance
  });
};
