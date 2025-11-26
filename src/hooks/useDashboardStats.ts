import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleConfig } from '@/modules/core/hooks';
import { apiClient } from '@/lib/api/client';

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

// Track backend availability
let backendAvailable: boolean | null = null;

async function checkBackendAvailability(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  try {
    backendAvailable = await apiClient.healthCheck();
    console.log(`[useDashboardStats] Backend ${backendAvailable ? '✅ available with Redis caching' : '❌ unavailable'}`);
  } catch {
    backendAvailable = false;
  }
  // Re-check every 5 minutes
  setTimeout(() => { backendAvailable = null; }, 5 * 60 * 1000);
  return backendAvailable;
}

export const useDashboardStats = () => {
  const { user } = useAuth();
  const { moduleContext } = useModuleConfig();
  
  return useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user?.id) {
        return {
          totalCustomers: 0,
          monthlyRevenue: 0,
          customersChange: '+0',
          revenueChange: '+0%'
        };
      }

      // 🚀 TRY BACKEND API FIRST (with Redis caching)
      const isBackendUp = await checkBackendAvailability();
      if (isBackendUp) {
        try {
          const response = await apiClient.get<DashboardStats>('/api/dashboard/stats');
          if (response.success && response.data) {
            console.log(`[useDashboardStats] ⚡ Data from backend API ${response.cached ? '(CACHED - instant)' : '(fresh)'}`);
            return response.data;
          }
        } catch (error) {
          console.warn('[useDashboardStats] Backend API failed, falling back to Supabase:', error);
        }
      }

      // 📊 FALLBACK: Direct Supabase queries (original logic)
      console.log('[useDashboardStats] Using Supabase direct queries');

      // جلب company_id من جدول profiles
      let company_id: string;
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData?.company_id) {
        console.warn('[useDashboardStats] No company_id in profiles, trying employees table', { profileError, user_id: user.id });
        
        // Try fallback to employees table
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (employeeError || !employeeData?.company_id) {
          console.error('[useDashboardStats] No company_id found in employees either', { employeeError, user_id: user.id });
          
          // Return empty stats instead of throwing error
          return {
            totalCustomers: 0,
            monthlyRevenue: 0,
            customersChange: '+0',
            revenueChange: '+0%'
          };
        }
        
        company_id = employeeData.company_id;
        console.log('[useDashboardStats] Found company_id from employees table:', company_id);
      } else {
        company_id = profileData.company_id;
        console.log('[useDashboardStats] Found company_id from profiles table:', company_id);
      }

      // إصلاح: جلب البيانات حتى لو لم يتوفر moduleContext بعد
      const isVehiclesEnabled = moduleContext?.activeModules?.includes('vehicles') ?? true;
      const isPropertiesEnabled = moduleContext?.activeModules?.includes('properties') ?? false;

      let vehiclesCount = 0;
      let activeVehiclesCount = 0;
      let contractsCount = 0;
      let totalContractsCount = 0;
      let propertiesCount = 0;
      let propertyOwnersCount = 0;
      let previousMonthContracts = 0;
      let previousMonthCustomers = 0;
      let previousMonthRevenue = 0;
      let previousMonthVehicles = 0;

      // حساب تواريخ الشهر السابق للاستخدام في المقارنات
      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const firstDayPrevMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
      const lastDayPrevMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);

      // ⚡ PERFORMANCE OPTIMIZATION: Run all count queries in parallel
      const countQueries = [];
      
      // Vehicles queries (if enabled)
      if (isVehiclesEnabled) {
        countQueries.push(
          supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true),
          supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', company_id),
          supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', company_id).lte('created_at', lastDayPrevMonth.toISOString()),
          supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', company_id).eq('status', 'active'),
          supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', company_id),
          supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', company_id).eq('status', 'active').lte('start_date', lastDayPrevMonth.toISOString().split('T')[0]).or(`end_date.gte.${lastDayPrevMonth.toISOString().split('T')[0]},end_date.is.null`)
        );
      }
      
      // Properties queries (if enabled)
      if (isPropertiesEnabled) {
        countQueries.push(
          supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true),
          supabase.from('property_owners').select('*', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true)
        );
      }
      
      // Customers queries (always run)
      countQueries.push(
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true),
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true).lte('created_at', lastDayPrevMonth.toISOString())
      );
      
      // Execute all count queries in parallel
      const results = await Promise.all(countQueries);
      
      // Parse results based on which modules are enabled
      let resultIndex = 0;
      
      if (isVehiclesEnabled) {
        activeVehiclesCount = results[resultIndex++].count || 0;
        vehiclesCount = results[resultIndex++].count || 0;
        previousMonthVehicles = results[resultIndex++].count || 0;
        contractsCount = results[resultIndex++].count || 0;
        totalContractsCount = results[resultIndex++].count || 0;
        previousMonthContracts = results[resultIndex++].count || 0;
      }
      
      if (isPropertiesEnabled) {
        propertiesCount = results[resultIndex++].count || 0;
        propertyOwnersCount = results[resultIndex++].count || 0;
      }
      
      const customersCount = results[resultIndex++].count || 0;
      previousMonthCustomers = results[resultIndex++].count || 0;

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
          .eq('company_id', company_id)
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
          .eq('company_id', company_id)
          .eq('status', 'active')
          .lte('start_date', lastDayPrevMonth.toISOString().split('T')[0]);

        const activeInPrevMonth = prevMonthContracts?.filter(contract => {
          if (!contract.end_date) return true;
          return new Date(contract.end_date) >= firstDayPrevMonth;
        }) || [];

        previousMonthRevenue = activeInPrevMonth.reduce((sum, contract) => sum + (contract.monthly_amount || 0), 0);
      }

      // Property rental revenue (if properties module enabled)
      // حساب إجمالي الإيجار الشهري لجميع عقود العقارات النشطة في الشهر الحالي
      if (isPropertiesEnabled) {
        const { data: propertyContracts } = await supabase
          .from('property_contracts')
          .select('rental_amount, status, start_date, end_date')
          .eq('company_id', company_id)
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
          .eq('company_id', company_id)
          .eq('status', 'active')
          .lte('start_date', lastDayPrevMonth.toISOString().split('T')[0]);

        const prevActiveInMonth = prevPropertyContracts?.filter(contract => {
          if (!contract.end_date) return true;
          return new Date(contract.end_date) >= firstDayPrevMonth;
        }) || [];

        const prevPropertyRevenue = prevActiveInMonth.reduce((sum, contract) => sum + (contract.rental_amount || 0), 0);
        previousMonthRevenue += prevPropertyRevenue;
      }

      // Calculate changes
      const customersChange = (customersCount || 0) - previousMonthCustomers;
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

      // Customer satisfaction rate (based on repeat customers)
      // Calculate based on customers who have more than one contract (repeat customers)
      let customerSatisfactionRate = 0;
      if (isVehiclesEnabled && (customersCount || 0) > 0) {
        const { data: repeatCustomersData } = await supabase
          .from('contracts')
          .select('customer_id')
          .eq('company_id', company_id);
        
        // Count unique customers with more than one contract
        const customerContractCounts = repeatCustomersData?.reduce((acc, contract) => {
          acc[contract.customer_id] = (acc[contract.customer_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};
        
        const repeatCustomersCount = Object.values(customerContractCounts).filter(count => count > 1).length;
        
        // Calculate satisfaction rate based on repeat customers (more realistic)
        // Cap at 95% to be conservative
        customerSatisfactionRate = Math.min(
          Math.round((repeatCustomersCount / (customersCount || 1)) * 100),
          95
        );
      }

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
        
        // Calculate vehicles change percentage
        const vehiclesChange = vehiclesCount - previousMonthVehicles;
        const vehiclesChangePercent = previousMonthVehicles > 0
          ? Math.round((vehiclesChange / previousMonthVehicles) * 100)
          : 0;
        stats.vehiclesChange = vehiclesChangePercent > 0 
          ? `+${vehiclesChangePercent}%` 
          : `${vehiclesChangePercent}%`;
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
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
};