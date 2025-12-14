import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, startOfMonth, endOfMonth, format } from 'date-fns';

export interface TrafficViolationStats {
  // الإحصائيات الأساسية
  totalViolations: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  partiallyPaidAmount: number;
  
  // حسب الحالة
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
  
  // حسب حالة الدفع
  paidCount: number;
  unpaidCount: number;
  partiallyPaidCount: number;
  
  // الإحصائيات الزمنية
  thisMonthCount: number;
  thisMonthAmount: number;
  lastMonthCount: number;
  lastMonthAmount: number;
  last30DaysCount: number;
  
  // التنبيهات
  overdueViolations: number; // مخالفات قديمة > 30 يوم
  highValueViolations: number; // مخالفات > 500 ر.ق
  repeatedVehicles: number; // مركبات متكررة
  repeatedCustomers: number; // عملاء متكررين
  
  // مؤشر الصحة
  violationsHealthScore: number;
  
  // إحصائيات إضافية
  averageViolationAmount: number;
  collectionRate: number;
  
  // أكثر المركبات مخالفات
  topViolatingVehicles: Array<{
    vehicle_id: string;
    plate_number: string;
    make: string;
    model: string;
    count: number;
    totalAmount: number;
  }>;
  
  // أكثر أنواع المخالفات
  violationsByType: Array<{
    type: string;
    count: number;
    totalAmount: number;
  }>;
}

export const useTrafficViolationStats = () => {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['traffic-violation-stats', companyId],
    queryFn: async (): Promise<TrafficViolationStats> => {
      if (!companyId) {
        throw new Error('Company ID not found');
      }

      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30);
      const startOfThisMonth = startOfMonth(today);
      const endOfThisMonth = endOfMonth(today);
      const startOfLastMonth = startOfMonth(subDays(startOfThisMonth, 1));
      const endOfLastMonth = endOfMonth(subDays(startOfThisMonth, 1));

      // جلب جميع المخالفات
      const { data: violations, error } = await supabase
        .from('penalties')
        .select(`
          id,
          amount,
          status,
          payment_status,
          penalty_date,
          vehicle_id,
          customer_id,
          violation_type,
          created_at,
          vehicles (
            id,
            plate_number,
            make,
            model
          )
        `)
        .eq('company_id', companyId);

      if (error) throw error;

      const allViolations = violations || [];
      
      // الإحصائيات الأساسية
      const totalViolations = allViolations.length;
      const totalAmount = allViolations.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
      
      // حسب حالة الدفع
      const paidViolations = allViolations.filter(v => v.payment_status === 'paid');
      const unpaidViolations = allViolations.filter(v => v.payment_status === 'unpaid');
      const partiallyPaidViolations = allViolations.filter(v => v.payment_status === 'partially_paid');
      
      const paidAmount = paidViolations.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
      const unpaidAmount = unpaidViolations.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
      const partiallyPaidAmount = partiallyPaidViolations.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
      
      // حسب الحالة
      const pendingCount = allViolations.filter(v => v.status === 'pending').length;
      const confirmedCount = allViolations.filter(v => v.status === 'confirmed').length;
      const cancelledCount = allViolations.filter(v => v.status === 'cancelled').length;
      
      // الإحصائيات الزمنية
      const thisMonthViolations = allViolations.filter(v => {
        const date = new Date(v.penalty_date);
        return date >= startOfThisMonth && date <= endOfThisMonth;
      });
      
      const lastMonthViolations = allViolations.filter(v => {
        const date = new Date(v.penalty_date);
        return date >= startOfLastMonth && date <= endOfLastMonth;
      });
      
      const last30DaysViolations = allViolations.filter(v => {
        const date = new Date(v.penalty_date);
        return date >= thirtyDaysAgo;
      });
      
      // التنبيهات
      const overdueViolations = allViolations.filter(v => {
        const date = new Date(v.penalty_date);
        return date < thirtyDaysAgo && v.payment_status === 'unpaid';
      }).length;
      
      const highValueViolations = allViolations.filter(v => 
        (Number(v.amount) || 0) >= 500 && v.payment_status === 'unpaid'
      ).length;
      
      // مركبات متكررة (أكثر من 3 مخالفات)
      const vehicleViolationCounts = allViolations.reduce((acc, v) => {
        if (v.vehicle_id) {
          acc[v.vehicle_id] = (acc[v.vehicle_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      const repeatedVehicles = Object.values(vehicleViolationCounts).filter(count => count > 3).length;
      
      // عملاء متكررين (أكثر من 3 مخالفات)
      const customerViolationCounts = allViolations.reduce((acc, v) => {
        if (v.customer_id) {
          acc[v.customer_id] = (acc[v.customer_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      const repeatedCustomers = Object.values(customerViolationCounts).filter(count => count > 3).length;
      
      // أكثر المركبات مخالفات
      const vehicleStats = allViolations.reduce((acc, v) => {
        if (v.vehicle_id && v.vehicles) {
          if (!acc[v.vehicle_id]) {
            acc[v.vehicle_id] = {
              vehicle_id: v.vehicle_id,
              plate_number: v.vehicles.plate_number || '',
              make: v.vehicles.make || '',
              model: v.vehicles.model || '',
              count: 0,
              totalAmount: 0,
            };
          }
          acc[v.vehicle_id].count++;
          acc[v.vehicle_id].totalAmount += Number(v.amount) || 0;
        }
        return acc;
      }, {} as Record<string, any>);
      
      const topViolatingVehicles = Object.values(vehicleStats)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);
      
      // أكثر أنواع المخالفات
      const typeStats = allViolations.reduce((acc, v) => {
        const type = v.violation_type || 'غير محدد';
        if (!acc[type]) {
          acc[type] = { type, count: 0, totalAmount: 0 };
        }
        acc[type].count++;
        acc[type].totalAmount += Number(v.amount) || 0;
        return acc;
      }, {} as Record<string, any>);
      
      const violationsByType = Object.values(typeStats)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);
      
      // مؤشر الصحة (كلما زادت المخالفات غير المسددة انخفض المؤشر)
      let healthScore = 100;
      healthScore -= Math.min(30, (unpaidViolations.length / Math.max(1, totalViolations)) * 50);
      healthScore -= Math.min(20, overdueViolations * 2);
      healthScore -= Math.min(20, highValueViolations * 3);
      healthScore -= Math.min(15, repeatedVehicles * 5);
      healthScore -= Math.min(15, repeatedCustomers * 5);
      
      const violationsHealthScore = Math.max(0, Math.round(healthScore));
      
      // معدل التحصيل
      const collectionRate = totalAmount > 0 
        ? Math.round((paidAmount / totalAmount) * 100) 
        : 100;
      
      return {
        totalViolations,
        totalAmount,
        paidAmount,
        unpaidAmount,
        partiallyPaidAmount,
        pendingCount,
        confirmedCount,
        cancelledCount,
        paidCount: paidViolations.length,
        unpaidCount: unpaidViolations.length,
        partiallyPaidCount: partiallyPaidViolations.length,
        thisMonthCount: thisMonthViolations.length,
        thisMonthAmount: thisMonthViolations.reduce((sum, v) => sum + (Number(v.amount) || 0), 0),
        lastMonthCount: lastMonthViolations.length,
        lastMonthAmount: lastMonthViolations.reduce((sum, v) => sum + (Number(v.amount) || 0), 0),
        last30DaysCount: last30DaysViolations.length,
        overdueViolations,
        highValueViolations,
        repeatedVehicles,
        repeatedCustomers,
        violationsHealthScore,
        averageViolationAmount: totalViolations > 0 ? Math.round(totalAmount / totalViolations) : 0,
        collectionRate,
        topViolatingVehicles,
        violationsByType,
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
};

