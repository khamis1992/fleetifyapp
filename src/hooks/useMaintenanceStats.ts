/**
 * Hook لجلب إحصائيات الصيانة الشاملة
 * يستخدم في MaintenanceSmartDashboard
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

      // جلب جميع سجلات الصيانة
      const { data: maintenanceRecords, error: maintenanceError } = await supabase
        .from('vehicle_maintenance')
        .select('*')
        .eq('company_id', companyId);

      if (maintenanceError) throw maintenanceError;

      const records = maintenanceRecords || [];
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // إحصائيات الحالة
      const statusCounts = records.reduce((acc, r) => {
        acc[r.status || 'unknown'] = (acc[r.status || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const pendingCount = statusCounts['pending'] || 0;
      const inProgressCount = statusCounts['in_progress'] || 0;
      const completedCount = statusCounts['completed'] || 0;
      const cancelledCount = statusCounts['cancelled'] || 0;

      // إحصائيات النوع
      const typeCounts = records.reduce((acc, r) => {
        acc[r.maintenance_type || 'unknown'] = (acc[r.maintenance_type || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // إحصائيات هذا الشهر
      const thisMonthRecords = records.filter(r => {
        if (!r.created_at) return false;
        const date = new Date(r.created_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });

      const completedThisMonth = thisMonthRecords.filter(r => r.status === 'completed').length;
      const costThisMonth = thisMonthRecords.reduce(
        (sum, r) => sum + (Number(r.actual_cost) || Number(r.estimated_cost) || 0), 0
      );

      // التكاليف
      const completedRecords = records.filter(r => r.status === 'completed');
      const totalCost = completedRecords.reduce(
        (sum, r) => sum + (Number(r.actual_cost) || 0), 0
      );
      const averageCost = completedRecords.length > 0 
        ? Math.round(totalCost / completedRecords.length) 
        : 0;

      const pendingRecords = records.filter(r => r.status === 'pending' || r.status === 'in_progress');
      const estimatedPendingCost = pendingRecords.reduce(
        (sum, r) => sum + (Number(r.estimated_cost) || 0), 0
      );

      // الأداء
      const completionRate = records.length > 0 
        ? Math.round((completedCount / records.length) * 100) 
        : 0;

      // حساب متوسط أيام الإنجاز
      let totalDays = 0;
      let completedWithDates = 0;
      completedRecords.forEach(r => {
        if (r.scheduled_date && r.completion_date) {
          const start = new Date(r.scheduled_date);
          const end = new Date(r.completion_date);
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

      // جلب عدد المركبات في الصيانة
      const { data: vehiclesInMaintenanceData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'maintenance');

      const vehiclesInMaintenance = vehiclesInMaintenanceData?.length || 0;

      // تنبيهات
      const overdueCount = records.filter(r => {
        if (r.status === 'completed' || r.status === 'cancelled') return false;
        if (!r.scheduled_date) return false;
        const scheduled = new Date(r.scheduled_date);
        return scheduled < today;
      }).length;

      const urgentCount = records.filter(
        r => r.priority === 'urgent' && r.status !== 'completed' && r.status !== 'cancelled'
      ).length;

      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      
      const upcomingScheduled = records.filter(r => {
        if (r.status !== 'pending') return false;
        if (!r.scheduled_date) return false;
        const scheduled = new Date(r.scheduled_date);
        return scheduled >= today && scheduled <= sevenDaysLater;
      }).length;

      // التقارير الشهرية (آخر 6 أشهر)
      const monthlyTrend: { month: string; count: number; cost: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const monthName = date.toLocaleDateString('ar-SA', { month: 'short' });
        const monthRecords = records.filter(r => {
          if (!r.created_at) return false;
          const d = new Date(r.created_at);
          return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
        });
        monthlyTrend.push({
          month: monthName,
          count: monthRecords.length,
          cost: monthRecords.reduce(
            (sum, r) => sum + (Number(r.actual_cost) || Number(r.estimated_cost) || 0), 0
          ),
        });
      }

      return {
        totalRecords: records.length,
        pendingCount,
        inProgressCount,
        completedCount,
        cancelledCount,
        completedThisMonth,
        costThisMonth,
        routineCount: typeCounts['routine'] || 0,
        repairCount: typeCounts['repair'] || 0,
        emergencyCount: typeCounts['emergency'] || 0,
        preventiveCount: typeCounts['preventive'] || 0,
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
    staleTime: 3 * 60 * 1000, // 3 دقائق
  });
};

