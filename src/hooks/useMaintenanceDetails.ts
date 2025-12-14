/**
 * Hook لجلب تفاصيل سجل صيانة محدد
 * يستخدم في MaintenanceSidePanel
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MaintenanceDetailsData {
  // بيانات الصيانة الأساسية
  id: string;
  maintenance_number: string | null;
  maintenance_type: string;
  status: string;
  priority: string;
  description: string | null;
  scheduled_date: string | null;
  completion_date: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  technician_name: string | null;
  notes: string | null;
  created_at: string;
  
  // بيانات المركبة
  vehicle: {
    id: string;
    plate_number: string;
    make: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    vin: string | null;
    current_mileage: number | null;
    status: string;
  } | null;
  
  // بيانات المورد
  vendor: {
    id: string;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    rating: number | null;
  } | null;
  
  // سجل الصيانة للمركبة
  vehicleMaintenanceHistory: {
    id: string;
    maintenance_type: string;
    status: string;
    scheduled_date: string | null;
    actual_cost: number | null;
    completion_date: string | null;
  }[];
  
  // إحصائيات
  stats: {
    totalMaintenanceForVehicle: number;
    totalCostForVehicle: number;
    lastMaintenanceDate: string | null;
    maintenanceFrequency: number; // عدد الصيانات في السنة
  };
}

export const useMaintenanceDetails = (maintenanceId: string | undefined) => {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['maintenance-details', maintenanceId, companyId],
    queryFn: async (): Promise<MaintenanceDetailsData | null> => {
      if (!maintenanceId || !companyId) {
        return null;
      }

      // جلب بيانات الصيانة مع المركبة
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('vehicle_maintenance')
        .select(`
          *,
          vehicles (
            id,
            plate_number,
            make,
            model,
            year,
            color,
            vin,
            current_mileage,
            status
          )
        `)
        .eq('id', maintenanceId)
        .eq('company_id', companyId)
        .maybeSingle();

      if (maintenanceError) throw maintenanceError;
      if (!maintenanceData) return null;

      // جلب بيانات المورد إذا كان موجوداً
      let vendor = null;
      if (maintenanceData.vendor_id) {
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('id, name, contact_person, phone, email, address, rating')
          .eq('id', maintenanceData.vendor_id)
          .maybeSingle();

        if (!vendorError && vendorData) {
          vendor = vendorData;
        }
      }

      // جلب سجل الصيانة للمركبة
      const vehicleId = maintenanceData.vehicle_id;
      let vehicleMaintenanceHistory: MaintenanceDetailsData['vehicleMaintenanceHistory'] = [];
      let stats: MaintenanceDetailsData['stats'] = {
        totalMaintenanceForVehicle: 0,
        totalCostForVehicle: 0,
        lastMaintenanceDate: null,
        maintenanceFrequency: 0,
      };

      if (vehicleId) {
        const { data: historyData, error: historyError } = await supabase
          .from('vehicle_maintenance')
          .select('id, maintenance_type, status, scheduled_date, actual_cost, completion_date')
          .eq('vehicle_id', vehicleId)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!historyError && historyData) {
          vehicleMaintenanceHistory = historyData;
        }

        // حساب الإحصائيات
        const { data: allHistory, error: allHistoryError } = await supabase
          .from('vehicle_maintenance')
          .select('actual_cost, completion_date, created_at')
          .eq('vehicle_id', vehicleId)
          .eq('company_id', companyId);

        if (!allHistoryError && allHistory) {
          stats.totalMaintenanceForVehicle = allHistory.length;
          stats.totalCostForVehicle = allHistory.reduce(
            (sum, m) => sum + (Number(m.actual_cost) || 0), 0
          );

          // آخر صيانة مكتملة
          const completedMaintenance = allHistory
            .filter(m => m.completion_date)
            .sort((a, b) => new Date(b.completion_date!).getTime() - new Date(a.completion_date!).getTime());
          
          if (completedMaintenance.length > 0) {
            stats.lastMaintenanceDate = completedMaintenance[0].completion_date;
          }

          // حساب معدل الصيانة السنوي
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          const maintenanceLastYear = allHistory.filter(m => {
            const date = new Date(m.created_at);
            return date >= oneYearAgo;
          });
          stats.maintenanceFrequency = maintenanceLastYear.length;
        }
      }

      return {
        id: maintenanceData.id,
        maintenance_number: maintenanceData.maintenance_number,
        maintenance_type: maintenanceData.maintenance_type,
        status: maintenanceData.status,
        priority: maintenanceData.priority,
        description: maintenanceData.description,
        scheduled_date: maintenanceData.scheduled_date,
        completion_date: maintenanceData.completion_date,
        estimated_cost: maintenanceData.estimated_cost,
        actual_cost: maintenanceData.actual_cost,
        technician_name: maintenanceData.technician_name,
        notes: maintenanceData.notes,
        created_at: maintenanceData.created_at,
        vehicle: maintenanceData.vehicles,
        vendor,
        vehicleMaintenanceHistory,
        stats,
      };
    },
    enabled: !!maintenanceId && !!companyId,
    staleTime: 2 * 60 * 1000, // 2 دقائق
  });
};

