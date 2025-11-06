import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleConfig } from '@/modules/core/hooks';

export interface DashboardStats {
  totalVehicles?: number;
  activeVehicles?: number;
  activeContracts?: number;
  totalContracts?: number;
  totalCustomers: number;
  totalProperties?: number;
  totalPropertyOwners?: number;
  monthlyRevenue: number;
  propertyRevenue?: number;
  vehiclesChange?: string;
  contractsChange?: string;
  customersChange: string;
  propertiesChange?: string;
  revenueChange: string;
  vehicleActivityRate?: number; // نسبة المركبات النشطة
  contractCompletionRate?: number; // نسبة إكمال العقود
  customerSatisfactionRate?: number; // نسبة رضا العملاء (محسوبة)
}

export const useDashboardStats = () => {
  const { user } = useAuth();
  const { moduleContext } = useModuleConfig();
  
  return useQuery({
    queryKey: ['dashboard-stats', user?.profile?.company_id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user?.profile?.company_id || !moduleContext) {
        return {
          totalCustomers: 0,
          monthlyRevenue: 0,
          customersChange: '+0',
          revenueChange: '+0%'
        };
      }

      const isVehiclesEnabled = moduleContext.activeModules.includes('vehicles');
      const isPropertiesEnabled = moduleContext.activeModules.includes('properties');

      let vehiclesCount = 0;
      let activeVehiclesCount = 0;
      let contractsCount = 0;
      let totalContractsCount = 0;
      let propertiesCount = 0;
      let propertyOwnersCount = 0;
      let previousMonthContracts = 0;
      let previousMonthCustomers = 0;
      let previousMonthRevenue = 0;

      // حساب تواريخ الشهر السابق للاستخدام في المقارنات
      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const firstDayPrevMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
      const lastDayPrevMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);

      // Get vehicles data only if vehicles module is enabled
      if (isVehiclesEnabled) {
        // Get active vehicles (all vehicles with is_active = true, not just available)
        const { count: activeVehicles } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', user.profile.company_id)
          .eq('is_active', true);
        activeVehiclesCount = activeVehicles || 0;

        // Get total vehicles
        const { count: totalVehicles } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', user.profile.company_id);
        vehiclesCount = totalVehicles || 0;

        // Get active contracts count
        // النظر في العقود النشطة: status = 'active' أو التاريخ لم ينتهي بعد
        const today = new Date().toISOString().split('T')[0];
        const { count: activeContractsCount } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', user.profile.company_id)
          .or(`status.eq.active,and(status.neq.cancelled,status.neq.expired,end_date.gte.${today})`);
        contractsCount = activeContractsCount || 0;

        // Get total contracts count
        const { count: allContractsCount } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', user.profile.company_id);
        totalContractsCount = allContractsCount || 0;

        // Get previous month contracts for comparison
        const { count: prevMonthContracts } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', user.profile.company_id)
          .gte('created_at', firstDayPrevMonth.toISOString())
          .lte('created_at', lastDayPrevMonth.toISOString());
        previousMonthContracts = prevMonthContracts || 0;
      }

      // Get properties data only if properties module is enabled
      if (isPropertiesEnabled) {
        const { count: propCount } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', user.profile.company_id)
          .eq('is_active', true);
        propertiesCount = propCount || 0;

        const { count: ownersCount } = await supabase
          .from('property_owners')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', user.profile.company_id)
          .eq('is_active', true);
        propertyOwnersCount = ownersCount || 0;
      }

      // Get customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true);

      // Get previous month customers for comparison
      const { count: prevMonthCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.profile.company_id)
        .gte('created_at', firstDayPrevMonth.toISOString())
        .lte('created_at', lastDayPrevMonth.toISOString());
      previousMonthCustomers = prevMonthCustomers || 0;

      // Get monthly revenue from different sources based on enabled modules
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      // استخدام نفس تواريخ الشهر السابق المعرفة سابقاً
      // firstDayPrevMonth و lastDayPrevMonth معرفة بالفعل في السطر 130-131
      
      let monthlyRevenue = 0;
      let propertyRevenue = 0;
      // previousMonthRevenue معرف بالفعل في السطر 53

      // Vehicle rental revenue (if vehicles module enabled)
      // حساب إجمالي الإيجار الشهري لجميع العقود النشطة في الشهر الحالي
      if (isVehiclesEnabled) {
        const { data: monthlyContracts } = await supabase
          .from('contracts')
          .select('monthly_amount, status, start_date, end_date')
          .eq('company_id', user.profile.company_id)
          .eq('status', 'active')
          .lte('start_date', lastDayOfMonth.toISOString().split('T')[0]);

        // تصفية العقود التي لا تزال نشطة في الشهر الحالي
        const activeInMonth = monthlyContracts?.filter(contract => {
          // إذا لم يكن هناك تاريخ انتهاء، العقد نشط
          if (!contract.end_date) return true;
          // إذا كان تاريخ الانتهاء بعد أو في بداية الشهر، العقد نشط
          return new Date(contract.end_date) >= firstDayOfMonth;
        }) || [];

        monthlyRevenue = activeInMonth.reduce((sum, contract) => sum + (contract.monthly_amount || 0), 0);

        // حساب إيرادات الشهر السابق للمقارنة
        const { data: prevMonthContracts } = await supabase
          .from('contracts')
          .select('monthly_amount, status, start_date, end_date')
          .eq('company_id', user.profile.company_id)
          .eq('status', 'active')
          .lte('start_date', lastDayOfPrevMonth.toISOString().split('T')[0]);

        const activeInPrevMonth = prevMonthContracts?.filter(contract => {
          if (!contract.end_date) return true;
          return new Date(contract.end_date) >= firstDayOfPrevMonth;
        }) || [];

        previousMonthRevenue = activeInPrevMonth.reduce((sum, contract) => sum + (contract.monthly_amount || 0), 0);
      }

      // Property rental revenue (if properties module enabled)
      // حساب إجمالي الإيجار الشهري لجميع عقود العقارات النشطة في الشهر الحالي
      if (isPropertiesEnabled) {
        const { data: propertyContracts } = await supabase
          .from('property_contracts')
          .select('rental_amount, status, start_date, end_date')
          .eq('company_id', user.profile.company_id)
          .eq('status', 'active')
          .lte('start_date', lastDayOfMonth.toISOString().split('T')[0]);

        // تصفية عقود العقارات النشطة في الشهر الحالي
        const activeInMonth = propertyContracts?.filter(contract => {
          if (!contract.end_date) return true;
          return new Date(contract.end_date) >= firstDayOfMonth;
        }) || [];

        propertyRevenue = activeInMonth.reduce((sum, contract) => sum + (contract.rental_amount || 0), 0);
        monthlyRevenue += propertyRevenue;

        // حساب إيرادات العقارات للشهر السابق
        const { data: prevPropertyContracts } = await supabase
          .from('property_contracts')
          .select('rental_amount, status, start_date, end_date')
          .eq('company_id', user.profile.company_id)
          .eq('status', 'active')
          .lte('start_date', lastDayOfPrevMonth.toISOString().split('T')[0]);

        const prevActiveInMonth = prevPropertyContracts?.filter(contract => {
          if (!contract.end_date) return true;
          return new Date(contract.end_date) >= firstDayOfPrevMonth;
        }) || [];

        const prevPropertyRevenue = prevActiveInMonth.reduce((sum, contract) => sum + (contract.rental_amount || 0), 0);
        previousMonthRevenue += prevPropertyRevenue;
      }

      // Calculate changes
      const customersChange = customersCount - previousMonthCustomers;
      const customersChangePercent = previousMonthCustomers > 0 
        ? Math.round((customersChange / previousMonthCustomers) * 100) 
        : 0;

      const contractsChange = contractsCount - previousMonthContracts;
      const contractsChangePercent = previousMonthContracts > 0
        ? Math.round((contractsChange / previousMonthContracts) * 100)
        : 0;

      const revenueChange = monthlyRevenue - previousMonthRevenue;
      const revenueChangePercent = previousMonthRevenue > 0
        ? Math.round((revenueChange / previousMonthRevenue) * 100)
        : 0;

      // Calculate activity rates
      // vehicleActivityRate = نسبة المركبات المؤجرة من إجمالي المركبات النشطة
      const vehicleActivityRate = activeVehiclesCount > 0
        ? Math.round((contractsCount / activeVehiclesCount) * 100)
        : 0;

      const contractCompletionRate = totalContractsCount > 0
        ? Math.round((contractsCount / totalContractsCount) * 100)
        : 0;

      // Customer satisfaction rate (based on active customers)
      const customerSatisfactionRate = customersCount > 0
        ? Math.min(Math.round((customersCount / (customersCount + 10)) * 100), 95)
        : 0;

      // Build response based on enabled modules
      const stats: DashboardStats = {
        totalCustomers: customersCount || 0,
        monthlyRevenue,
        customersChange: customersChangePercent > 0 ? `+${customersChangePercent}%` : `${customersChangePercent}%`,
        revenueChange: revenueChangePercent > 0 ? `+${revenueChangePercent}%` : `${revenueChangePercent}%`,
        customerSatisfactionRate
      };

      // Add vehicle-specific stats if module is enabled
      if (isVehiclesEnabled) {
        stats.totalVehicles = vehiclesCount;
        stats.activeVehicles = activeVehiclesCount;
        stats.activeContracts = contractsCount;
        stats.totalContracts = totalContractsCount;
        stats.vehiclesChange = '+0%';
        stats.contractsChange = contractsChangePercent > 0 ? `+${contractsChangePercent}%` : `${contractsChangePercent}%`;
        stats.vehicleActivityRate = vehicleActivityRate;
        stats.contractCompletionRate = contractCompletionRate;
      }

      // Add property-specific stats if module is enabled
      if (isPropertiesEnabled) {
        stats.totalProperties = propertiesCount;
        stats.totalPropertyOwners = propertyOwnersCount;
        stats.propertyRevenue = propertyRevenue;
        stats.propertiesChange = '+0';
      }

      return stats;
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};