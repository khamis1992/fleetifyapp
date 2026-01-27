/**
 * Hook لجلب إحصائيات المركبات الشاملة
 * يستخدم في FleetSmartDashboard
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VehicleStats {
  // إحصائيات الأسطول
  totalVehicles: number;
  availableVehicles: number;
  rentedVehicles: number;
  maintenanceVehicles: number;
  outOfServiceVehicles: number;
  reservedVehicles: number; // شارع 52
  reservedEmployeeVehicles: number;
  accidentVehicles: number;
  policeStationVehicles: number;
  stolenVehicles: number;
  municipalityVehicles: number;
  street52Vehicles: number;
  
  // مؤشرات الأداء
  utilizationRate: number; // معدل الإشغال
  averageRevenuePerVehicle: number; // متوسط الإيراد
  totalMonthlyRevenue: number; // إجمالي الإيرادات الشهرية
  
  // التنبيهات
  insuranceExpired: number; // تأمين منتهي
  insuranceExpiringSoon: number; // تأمين ينتهي قريباً
  registrationExpired: number; // فحص دوري منتهي
  registrationExpiringSoon: number; // فحص دوري ينتهي قريباً
  serviceOverdue: number; // صيانة متأخرة
  
  // التكاليف
  totalMaintenanceCost: number;
  totalInsuranceCost: number;
  
  // Fleet Health Score
  fleetHealthScore: number;
}

export const useVehicleStats = () => {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['vehicle-stats', companyId],
    queryFn: async (): Promise<VehicleStats> => {
      if (!companyId) {
        throw new Error('Company ID not found');
      }

      // جلب إحصائيات المركبات حسب الحالة (فقط المركبات النشطة)
      const { data: vehiclesByStatus, error: statusError } = await supabase
        .from('vehicles')
        .select('id, status')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (statusError) throw statusError;

      const statusCounts = vehiclesByStatus?.reduce((acc, v) => {
        acc[v.status || 'unknown'] = (acc[v.status || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      const vehicleIds = vehiclesByStatus?.map(v => v.id) || [];

      const totalVehicles = vehiclesByStatus?.length || 0;
      const availableVehicles = statusCounts['available'] || 0;
      const rentedVehicles = statusCounts['rented'] || 0;
      const maintenanceVehicles = statusCounts['maintenance'] || 0;
      const outOfServiceVehicles = statusCounts['out_of_service'] || 0;
      const accidentVehicles = statusCounts['accident'] || 0;
      const policeStationVehicles = statusCounts['police_station'] || 0;
      const stolenVehicles = statusCounts['stolen'] || 0;
      const municipalityVehicles = statusCounts['municipality'] || 0;
      const street52Vehicles = statusCounts['street_52'] || 0;
      const reservedEmployeeVehicles = statusCounts['reserved_employee'] || 0;
      
      // التوافق مع الكود القديم (reserved كان يشمل street_52)
      const reservedVehicles = statusCounts['reserved'] || 0;

      // معدل الإشغال
      const utilizationRate = totalVehicles > 0 
        ? Math.round((rentedVehicles / totalVehicles) * 100) 
        : 0;

      // جلب العقود النشطة لحساب الإيرادات
      const { data: activeContracts, error: contractsError } = await supabase
        .from('contracts')
        .select('monthly_amount')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (contractsError) throw contractsError;

      const totalMonthlyRevenue = activeContracts?.reduce(
        (sum, c) => sum + (Number(c.monthly_amount) || 0), 0
      ) || 0;

      const averageRevenuePerVehicle = rentedVehicles > 0 
        ? Math.round(totalMonthlyRevenue / rentedVehicles) 
        : 0;

      // جلب تنبيهات التأمين والفحص (فقط المركبات النشطة)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // تصفير الوقت للمقارنة
      const thirtyDaysLater = new Date(today);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      thirtyDaysLater.setHours(23, 59, 59, 999); // نهاية اليوم

      const { data: expiringVehicles, error: expiringError } = await supabase
        .from('vehicles')
        .select('insurance_expiry, registration_expiry, next_service_due')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (expiringError) throw expiringError;

      let insuranceExpired = 0;
      let insuranceExpiringSoon = 0;
      let registrationExpired = 0;
      let registrationExpiringSoon = 0;
      let serviceOverdue = 0;

      expiringVehicles?.forEach(v => {
        // التأمين
        if (v.insurance_expiry) {
          const expiry = new Date(v.insurance_expiry);
          expiry.setHours(0, 0, 0, 0);
          if (expiry < today) {
            // منتهي
            insuranceExpired++;
          } else if (expiry <= thirtyDaysLater) {
            // ينتهي قريباً (خلال 30 يوم)
            insuranceExpiringSoon++;
          }
        }
        
        // الفحص الدوري
        if (v.registration_expiry) {
          const expiry = new Date(v.registration_expiry);
          expiry.setHours(0, 0, 0, 0);
          if (expiry < today) {
            // منتهي
            registrationExpired++;
          } else if (expiry <= thirtyDaysLater) {
            // ينتهي قريباً (خلال 30 يوم)
            registrationExpiringSoon++;
          }
        }
        
        // الصيانة: يجب أن يكون تاريخ الاستحقاق قد مضى
        if (v.next_service_due) {
          const serviceDue = new Date(v.next_service_due);
          serviceDue.setHours(0, 0, 0, 0);
          if (serviceDue < today) {
            serviceOverdue++;
          }
        }
      });

      // جلب تكاليف الصيانة
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('vehicle_maintenance')
        .select('actual_cost')
        .eq('company_id', companyId);

      const totalMaintenanceCost = maintenanceData?.reduce(
        (sum, m) => sum + (Number(m.actual_cost) || 0), 0
      ) || 0;

      // جلب تكاليف التأمين (فقط للمركبات النشطة)
      const { data: insuranceData, error: insuranceError } = await supabase
        .from('vehicle_insurance')
        .select('premium_amount')
        .in('vehicle_id', vehicleIds)
        .eq('is_active', true);

      const totalInsuranceCost = insuranceData?.reduce(
        (sum, i) => sum + (Number(i.premium_amount) || 0), 0
      ) || 0;

      // حساب Fleet Health Score
      const alertsCount = insuranceExpired + insuranceExpiringSoon + registrationExpired + registrationExpiringSoon + serviceOverdue;
      const problemVehicles = maintenanceVehicles + outOfServiceVehicles + accidentVehicles + policeStationVehicles + stolenVehicles;
      
      let healthScore = 100;
      // خصم نقاط للمشاكل
      healthScore -= Math.min(30, alertsCount * 2); // حد أقصى 30 نقطة للتنبيهات
      healthScore -= Math.min(30, (problemVehicles / Math.max(1, totalVehicles)) * 100); // حد أقصى 30 نقطة للمشاكل
      healthScore -= Math.min(20, (1 - utilizationRate / 100) * 20); // حد أقصى 20 نقطة لمعدل الإشغال المنخفض
      
      const fleetHealthScore = Math.max(0, Math.round(healthScore));

      return {
        totalVehicles,
        availableVehicles,
        rentedVehicles,
        maintenanceVehicles,
        outOfServiceVehicles,
        reservedVehicles,
        reservedEmployeeVehicles,
        accidentVehicles,
        policeStationVehicles,
        stolenVehicles,
        municipalityVehicles,
        street52Vehicles,
        utilizationRate,
        averageRevenuePerVehicle,
        totalMonthlyRevenue,
        insuranceExpired,
        insuranceExpiringSoon,
        registrationExpired,
        registrationExpiringSoon,
        serviceOverdue,
        totalMaintenanceCost,
        totalInsuranceCost,
        fleetHealthScore,
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 دقائق
  });
};
