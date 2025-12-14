/**
 * Hook لجلب تفاصيل مركبة واحدة بشكل شامل
 * يستخدم في VehicleSidePanel
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VehicleContract {
  id: string;
  contract_number: string;
  customer_name: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  status: string;
}

interface MaintenanceRecord {
  id: string;
  maintenance_type: string;
  description: string;
  scheduled_date: string;
  completed_date: string | null;
  actual_cost: number;
  status: string;
  priority: string;
}

interface PenaltyRecord {
  id: string;
  penalty_number: string;
  violation_type: string;
  penalty_date: string;
  amount: number;
  status: string;
  payment_status: string;
}

interface VehicleDetailsData {
  // بيانات المركبة الأساسية
  vehicle: {
    id: string;
    plate_number: string;
    make: string;
    model: string;
    year: number;
    color: string;
    status: string;
    vin: string;
    current_mileage: number;
    fuel_level: number;
    location: string;
    daily_rate: number;
    weekly_rate: number;
    monthly_rate: number;
    images: string[];
  } | null;
  
  // العقد النشط
  activeContract: VehicleContract | null;
  
  // سجل العقود
  contractHistory: VehicleContract[];
  
  // سجل الصيانة
  maintenanceHistory: MaintenanceRecord[];
  
  // المخالفات
  penalties: PenaltyRecord[];
  
  // إحصائيات
  stats: {
    totalContracts: number;
    totalRevenue: number;
    totalMaintenanceCost: number;
    totalPenalties: number;
    pendingPenaltiesAmount: number;
  };
  
  // التنبيهات
  alerts: {
    insuranceExpiry: string | null;
    registrationExpiry: string | null;
    nextServiceDue: string | null;
    isInsuranceExpired: boolean;
    isRegistrationExpired: boolean;
    isServiceOverdue: boolean;
  };
  
  // نقاط صحة المركبة
  vehicleHealthScore: number;
}

export const useVehicleDetails = (vehicleId: string | null) => {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['vehicle-details', vehicleId],
    queryFn: async (): Promise<VehicleDetailsData> => {
      if (!vehicleId || !companyId) {
        throw new Error('Vehicle ID or Company ID not found');
      }

      // جلب بيانات المركبة
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .eq('company_id', companyId)
        .maybeSingle();

      // إذا لم يتم العثور على المركبة، نعيد بيانات فارغة
      if (vehicleError) {
        console.error('Error fetching vehicle:', vehicleError);
        throw vehicleError;
      }

      if (!vehicleData) {
        // المركبة غير موجودة - نعيد بيانات فارغة بدلاً من رمي خطأ
        return {
          vehicle: null,
          activeContract: null,
          contractHistory: [],
          maintenanceHistory: [],
          penalties: [],
          stats: {
            totalContracts: 0,
            totalRevenue: 0,
            totalMaintenanceCost: 0,
            totalPenalties: 0,
            pendingPenaltiesAmount: 0,
          },
          alerts: {
            insuranceExpiry: null,
            registrationExpiry: null,
            nextServiceDue: null,
            isInsuranceExpired: false,
            isRegistrationExpired: false,
            isServiceOverdue: false,
          },
          vehicleHealthScore: 0,
        };
      }

      // جلب العقود (left join مع customers)
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          start_date,
          end_date,
          monthly_amount,
          status,
          customers(full_name)
        `)
        .eq('vehicle_id', vehicleId)
        .eq('company_id', companyId)
        .order('start_date', { ascending: false });

      // لا نرمي خطأ للعقود - قد لا تكون موجودة

      const contractHistory: VehicleContract[] = contracts?.map(c => ({
        id: c.id,
        contract_number: c.contract_number || '',
        customer_name: (c.customers as any)?.full_name || 'غير محدد',
        start_date: c.start_date,
        end_date: c.end_date,
        monthly_amount: Number(c.monthly_amount) || 0,
        status: c.status || 'unknown',
      })) || [];

      const activeContract = contractHistory.find(c => c.status === 'active') || null;

      // جلب سجل الصيانة
      const { data: maintenance, error: maintenanceError } = await supabase
        .from('vehicle_maintenance')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('company_id', companyId)
        .order('scheduled_date', { ascending: false })
        .limit(10);

      const maintenanceHistory: MaintenanceRecord[] = maintenance?.map(m => ({
        id: m.id,
        maintenance_type: m.maintenance_type || '',
        description: m.description || '',
        scheduled_date: m.scheduled_date,
        completed_date: m.completed_date,
        actual_cost: Number(m.actual_cost) || 0,
        status: m.status || 'unknown',
        priority: m.priority || 'low',
      })) || [];

      // جلب المخالفات
      const { data: penaltiesData, error: penaltiesError } = await supabase
        .from('penalties')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('company_id', companyId)
        .order('penalty_date', { ascending: false })
        .limit(10);

      const penalties: PenaltyRecord[] = penaltiesData?.map(p => ({
        id: p.id,
        penalty_number: p.penalty_number || '',
        violation_type: p.violation_type || '',
        penalty_date: p.penalty_date,
        amount: Number(p.amount) || 0,
        status: p.status || 'unknown',
        payment_status: p.payment_status || 'pending',
      })) || [];

      // حساب الإحصائيات
      const totalContracts = contractHistory.length;
      const totalRevenue = contractHistory.reduce((sum, c) => {
        const months = c.end_date && c.start_date
          ? Math.max(1, Math.ceil((new Date(c.end_date).getTime() - new Date(c.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30)))
          : 1;
        return sum + (c.monthly_amount * months);
      }, 0);
      const totalMaintenanceCost = maintenanceHistory.reduce((sum, m) => sum + m.actual_cost, 0);
      const totalPenalties = penalties.length;
      const pendingPenaltiesAmount = penalties
        .filter(p => p.payment_status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);

      // حساب التنبيهات
      const today = new Date();
      const insuranceExpiry = vehicleData?.insurance_expiry || null;
      const registrationExpiry = vehicleData?.registration_expiry || null;
      const nextServiceDue = vehicleData?.next_service_due || null;

      const isInsuranceExpired = insuranceExpiry ? new Date(insuranceExpiry) <= today : false;
      const isRegistrationExpired = registrationExpiry ? new Date(registrationExpiry) <= today : false;
      const isServiceOverdue = nextServiceDue ? new Date(nextServiceDue) <= today : false;

      // حساب نقاط صحة المركبة (0-100)
      let healthScore = 100;
      
      // خصم للتأمين المنتهي
      if (isInsuranceExpired) healthScore -= 25;
      else if (insuranceExpiry) {
        const daysUntilExpiry = Math.ceil((new Date(insuranceExpiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30) healthScore -= 10;
      }
      
      // خصم للفحص الدوري
      if (isRegistrationExpired) healthScore -= 25;
      else if (registrationExpiry) {
        const daysUntilExpiry = Math.ceil((new Date(registrationExpiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30) healthScore -= 10;
      }
      
      // خصم للصيانة المتأخرة
      if (isServiceOverdue) healthScore -= 20;
      
      // خصم للمخالفات المعلقة
      if (pendingPenaltiesAmount > 0) healthScore -= Math.min(15, Math.ceil(pendingPenaltiesAmount / 500));
      
      // خصم للحالة
      if (vehicleData?.status === 'maintenance') healthScore -= 10;
      if (vehicleData?.status === 'out_of_service') healthScore -= 20;
      if (vehicleData?.status === 'accident') healthScore -= 30;

      const vehicleHealthScore = Math.max(0, Math.round(healthScore));

      return {
        vehicle: vehicleData ? {
          id: vehicleData.id,
          plate_number: vehicleData.plate_number || '',
          make: vehicleData.make || '',
          model: vehicleData.model || '',
          year: vehicleData.year || 0,
          color: vehicleData.color || '',
          status: vehicleData.status || 'unknown',
          vin: vehicleData.vin || '',
          current_mileage: Number(vehicleData.current_mileage) || 0,
          fuel_level: vehicleData.fuel_level || 0,
          location: vehicleData.location || '',
          daily_rate: Number(vehicleData.daily_rate) || 0,
          weekly_rate: Number(vehicleData.weekly_rate) || 0,
          monthly_rate: Number(vehicleData.monthly_rate) || 0,
          images: vehicleData.images || [],
        } : null,
        activeContract,
        contractHistory,
        maintenanceHistory,
        penalties,
        stats: {
          totalContracts,
          totalRevenue,
          totalMaintenanceCost,
          totalPenalties,
          pendingPenaltiesAmount,
        },
        alerts: {
          insuranceExpiry,
          registrationExpiry,
          nextServiceDue,
          isInsuranceExpired,
          isRegistrationExpired,
          isServiceOverdue,
        },
        vehicleHealthScore,
      };
    },
    enabled: !!vehicleId && !!companyId,
    staleTime: 2 * 60 * 1000, // 2 دقائق
  });
};

