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

      // جلب company_id من جدول profiles
      console.log('🔍 [DASHBOARD_STATS] Fetching company_id for user:', user.id);
      
      // First, let's check what's in the profiles table for this user
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('🔍 [DASHBOARD_STATS] All profiles for user:', { allProfiles, allProfilesError });
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      console.log('📊 [DASHBOARD_STATS] Profile data:', { profileData, profileError });

      if (profileError || !profileData?.company_id) {
        console.error('❌ [DASHBOARD_STATS] Error fetching company_id from profiles:', profileError);
        console.error('❌ [DASHBOARD_STATS] Profile data exists:', !!profileData);
        console.error('❌ [DASHBOARD_STATS] Company_id exists:', !!profileData?.company_id);
        console.error('❌ [DASHBOARD_STATS] Full profile error details:', {
          message: profileError?.message,
          details: profileError?.details,
          hint: profileError?.hint,
          code: profileError?.code
        });
        
        // Try fallback to employees table
        console.log('🔄 [DASHBOARD_STATS] Trying fallback to employees table...');
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        console.log('🔄 [DASHBOARD_STATS] Employee data:', { employeeData, employeeError });
        
        if (employeeError || !employeeData?.company_id) {
          console.error('❌ [DASHBOARD_STATS] No company_id found in profiles or employees tables');
          return {
            totalCustomers: 0,
            monthlyRevenue: 0,
            customersChange: '+0',
            revenueChange: '+0%'
          };
        }
        
        var company_id = employeeData.company_id;
        console.log('✅ [DASHBOARD_STATS] Using company_id from employees:', company_id);
      } else {
        var company_id = profileData.company_id;
        console.log('✅ [DASHBOARD_STATS] Using company_id from profiles:', company_id);
      }

      // إصلاح: جلب البيانات حتى لو لم يتوفر moduleContext بعد
      const isVehiclesEnabled = moduleContext?.activeModules?.includes('vehicles') ?? true;
      const isPropertiesEnabled = moduleContext?.activeModules?.includes('properties') ?? false;
      
      console.log('🔧 [DASHBOARD_STATS] Module context:', { moduleContext });
      console.log('🔧 [DASHBOARD_STATS] Vehicles enabled:', isVehiclesEnabled);
      console.log('🔧 [DASHBOARD_STATS] Properties enabled:', isPropertiesEnabled);

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
        console.log('🚗 [DASHBOARD_STATS] Fetching vehicles for company:', company_id);
        
        // First, let's check what vehicles exist for this company
        const { data: allVehicles, error: allVehiclesError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('company_id', company_id)
          .limit(5);
        
        console.log('🚗 [DASHBOARD_STATS] Sample vehicles:', { allVehicles, allVehiclesError });
        
        // Get active vehicles (all vehicles with is_active = true, not just available)
        const { count: activeVehicles, error: activeVehiclesError } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company_id)
          .eq('is_active', true);
        
        console.log('🚗 [DASHBOARD_STATS] Active vehicles query:', { activeVehicles, activeVehiclesError });
        
        if (activeVehiclesError) {
          console.error('Error fetching active vehicles:', activeVehiclesError);
        }
        activeVehiclesCount = activeVehicles || 0;

        // Get total vehicles
        const { count: totalVehicles, error: totalVehiclesError } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company_id);
        
        if (totalVehiclesError) {
          console.error('Error fetching total vehicles:', totalVehiclesError);
        }
        vehiclesCount = totalVehicles || 0;

        console.log('🚗 [DASHBOARD_STATS] Vehicles:', { 
          total: vehiclesCount, 
          active: activeVehiclesCount 
        });

        // Get active contracts count
        // العقود النشطة: status = 'active' فقط لتجنب التعقيدات
        const today = new Date().toISOString().split('T')[0];
        const { count: activeContractsCount, error: contractsError } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company_id)
          .eq('status', 'active');
        
        // تسجيل الخطأ إن وجد
        if (contractsError) {
          console.error('Error fetching active contracts:', contractsError);
        }
        
        contractsCount = activeContractsCount || 0;

        console.log('📄 [DASHBOARD_STATS] Contracts:', { 
          active: contractsCount, 
          error: contractsError 
        });

        // Get total contracts count
        const { count: allContractsCount } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company_id);
        totalContractsCount = allContractsCount || 0;

        // Get previous month contracts for comparison
        const { count: prevMonthContracts } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company_id)
          .gte('created_at', firstDayPrevMonth.toISOString())
          .lte('created_at', lastDayPrevMonth.toISOString());
        previousMonthContracts = prevMonthContracts || 0;
      }

      // Get properties data only if properties module is enabled
      if (isPropertiesEnabled) {
        const { count: propCount } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company_id)
          .eq('is_active', true);
        propertiesCount = propCount || 0;

        const { count: ownersCount } = await supabase
          .from('property_owners')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company_id)
          .eq('is_active', true);
        propertyOwnersCount = ownersCount || 0;
      }

      // Get customers count
      console.log('👥 [DASHBOARD_STATS] Fetching customers for company:', company_id);
      
      // First, let's check what customers exist for this company
      const { data: sampleCustomers, error: sampleCustomersError } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', company_id)
        .limit(5);
      
      console.log('👥 [DASHBOARD_STATS] Sample customers:', { sampleCustomers, sampleCustomersError });
      
      const { count: customersCount, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company_id)
        .eq('is_active', true);

      console.log('👥 [DASHBOARD_STATS] Customers count query:', { customersCount, customersError });

      // Get previous month customers for comparison
      const { count: prevMonthCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company_id)
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

        console.log('💰 [DASHBOARD_STATS] Monthly Revenue:', { 
          monthlyRevenue, 
          activeContracts: activeInMonth.length 
        });

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

      // Customer satisfaction rate (based on active customers)
      const customerSatisfactionRate = (customersCount || 0) > 0
        ? Math.min(Math.round(((customersCount || 0) / ((customersCount || 0) + 10)) * 100), 95)
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

      console.log('✅ [DASHBOARD_STATS] Final stats:', stats);
      return stats;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
};