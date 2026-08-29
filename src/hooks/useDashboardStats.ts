import { useRef } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStableCompanyId } from '@/contexts/CompanyContext';
import { useModuleConfig } from '@/modules/core/hooks';
import { apiClient } from '@/lib/api/client';
import { MobileDebugger } from '@/lib/mobileDebug';

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
  const { user, loading: authLoading } = useAuth();
  const { moduleContext } = useModuleConfig();

  // Get company_id from either profile or company object
  const rawCompanyId = user?.profile?.company_id || user?.company?.id;
  
  // CRITICAL FIX: Use stable company ID from CompanyContext (persists across navigation)
  // as primary fallback, then local ref as last resort.
  const contextStableId = useStableCompanyId();
  const stableCompanyIdRef = useRef<string | null>(null);
  if (rawCompanyId) stableCompanyIdRef.current = rawCompanyId;
  const companyId = rawCompanyId || contextStableId || stableCompanyIdRef.current;
  
  // إعادة المحاولة عندما يتوفر company_id (قد يتأخر عن authLoading)
  const isReady = !authLoading && !!user?.id && !!companyId;
  
  // تتبع حالة تحميل الملف الشخصي - company_id قد يتأخر عن authLoading
  const profileLoaded = !!user?.profile?.company_id || !!user?.company?.id;

  return useQuery({
    queryKey: ['dashboard-stats', user?.id, companyId, profileLoaded, moduleContext?.activeModules],
    queryFn: async ({ signal }: { signal?: AbortSignal }): Promise<DashboardStats> => {
      if (!user?.id || !companyId) {
        console.warn('[useDashboardStats] Missing user or company_id:', { 
          userId: user?.id, 
          companyId,
          hasProfile: !!user?.profile,
          hasCompany: !!user?.company
        });
        return {
          totalCustomers: 0,
          monthlyRevenue: 0,
          customersChange: '+0',
          revenueChange: '+0%'
        };
      }

      // 🚀 TRY BACKEND API FIRST (with Redis caching) - only if explicitly enabled
      const useBackendApi = import.meta.env.VITE_USE_BACKEND_API === 'true';
      if (useBackendApi) {
        const isBackendUp = await checkBackendAvailability();
        if (isBackendUp) {
          try {
            const response = await apiClient.get<DashboardStats>('/api/dashboard/stats');
            if (response.success && response.data) {
              console.log(`[useDashboardStats] ⚡ Data from backend API ${response.cached ? '(CACHED - instant)' : '(fresh)'}`);
              return response.data;
            }
          } catch (error) {
            // Silently fallback to Supabase - no need to warn for expected behavior
            console.debug('[useDashboardStats] Backend API unavailable, using Supabase');
          }
        }
      }

      // 📊 Direct Supabase queries
      // Use company_id from user context (already loaded by AuthContext)
      const company_id = companyId;
      
      console.log('[useDashboardStats] Using company_id from user context:', company_id);

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
          supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true).abortSignal(signal!),
          supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', company_id).abortSignal(signal!),
          supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true).lte('created_at', lastDayPrevMonth.toISOString()).abortSignal(signal!),
          supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', company_id).eq('status', 'active').abortSignal(signal!),
          supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', company_id).abortSignal(signal!),
          supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', company_id).eq('status', 'active').lte('start_date', lastDayPrevMonth.toISOString().split('T')[0]).or(`end_date.gte.${lastDayPrevMonth.toISOString().split('T')[0]},end_date.is.null`).abortSignal(signal!)
        );
      }

      // Properties queries (if enabled)
      if (isPropertiesEnabled) {
        countQueries.push(
          supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', company_id).abortSignal(signal!),
          supabase.from('property_owners').select('*', { count: 'exact', head: true }).eq('company_id', company_id).abortSignal(signal!)
        );
      }

      // Customers queries (always run)
      countQueries.push(
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true).abortSignal(signal!),
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true).lte('created_at', lastDayPrevMonth.toISOString()).abortSignal(signal!)
      );
      
      // Execute all count queries in parallel
      let results;
      try {
        results = await Promise.all(countQueries);
        console.log('[useDashboardStats] Query results:', {
          activeVehiclesCount: results[0]?.count,
          vehiclesCount: results[1]?.count,
          previousMonthVehicles: results[2]?.count,
          contractsCount: results[3]?.count,
          totalContractsCount: results[4]?.count,
          previousMonthContracts: results[5]?.count,
          customersCount: results[6]?.count,
        });
      } catch (error) {
        console.error('[useDashboardStats] Query error:', error);
        throw error;
      }
      
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
      // ✅ تحسين: حساب الإيرادات الفعلية من المدفوعات المستلمة (موحد مع التقارير المالية)
      if (isVehiclesEnabled) {
        // الإيرادات الفعلية = المدفوعات المستلمة في الشهر الحالي
        const { data: currentMonthPayments } = await supabase
          .from('payments')
          .select('amount, payment_status')
          .eq('company_id', company_id)
          .in('payment_status', ['completed', 'paid', 'confirmed'])
          .gte('payment_date', firstDayOfMonth.toISOString().split('T')[0])
          .lte('payment_date', lastDayOfMonth.toISOString().split('T')[0])
          .abortSignal(signal!);

        monthlyRevenue = currentMonthPayments?.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) || 0;

        // إذا لم توجد مدفوعات، نحاول من الفواتير المدفوعة
        if (monthlyRevenue === 0) {
          const { data: paidInvoices } = await supabase
            .from('invoices')
            .select('total_amount')
            .eq('company_id', company_id)
            .eq('payment_status', 'paid')
            .gte('invoice_date', firstDayOfMonth.toISOString().split('T')[0])
            .lte('invoice_date', lastDayOfMonth.toISOString().split('T')[0])
            .abortSignal(signal!);

          monthlyRevenue = paidInvoices?.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0;
        }

        // حساب إيرادات الشهر السابق للمقارنة
        const { data: prevMonthPayments } = await supabase
          .from('payments')
          .select('amount, payment_status')
          .eq('company_id', company_id)
          .in('payment_status', ['completed', 'paid', 'confirmed'])
          .gte('payment_date', firstDayPrevMonth.toISOString().split('T')[0])
          .lte('payment_date', lastDayPrevMonth.toISOString().split('T')[0])
          .abortSignal(signal!);

        previousMonthRevenue = prevMonthPayments?.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) || 0;

        // إذا لم توجد مدفوعات في الشهر السابق، نحاول من الفواتير
        if (previousMonthRevenue === 0) {
          const { data: prevPaidInvoices } = await supabase
            .from('invoices')
            .select('total_amount')
            .eq('company_id', company_id)
            .eq('payment_status', 'paid')
            .gte('invoice_date', firstDayPrevMonth.toISOString().split('T')[0])
            .lte('invoice_date', lastDayPrevMonth.toISOString().split('T')[0])
            .abortSignal(signal!);

          previousMonthRevenue = prevPaidInvoices?.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0;
        }
      }

      // Property rental revenue (if properties module enabled)
      // ✅ تحسين: حساب الإيرادات الفعلية من مدفوعات العقارات
      if (isPropertiesEnabled) {
        const { data: propertyPayments } = await supabase
          .from('property_payments')
          .select('amount, status')
          .eq('company_id', company_id)
          .in('status', ['completed', 'paid', 'confirmed'])
          .gte('payment_date', firstDayOfMonth.toISOString().split('T')[0])
          .lte('payment_date', lastDayOfMonth.toISOString().split('T')[0])
          .abortSignal(signal!);

        propertyRevenue = propertyPayments?.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) || 0;
        monthlyRevenue += propertyRevenue;

        // حساب إيرادات العقارات للشهر السابق
        const { data: prevPropertyPayments } = await supabase
          .from('property_payments')
          .select('amount, status')
          .eq('company_id', company_id)
          .in('status', ['completed', 'paid', 'confirmed'])
          .gte('payment_date', firstDayPrevMonth.toISOString().split('T')[0])
          .lte('payment_date', lastDayPrevMonth.toISOString().split('T')[0])
          .abortSignal(signal!);

        const prevPropertyRevenue = prevPropertyPayments?.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) || 0;
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
          .eq('company_id', company_id)
          .abortSignal(signal!);
        
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
    enabled: isReady, // CRITICAL: Only run when we have user, company_id, and auth is loaded
    staleTime: 30 * 1000, // 30 seconds - shorter cache to ensure fresh data after page refresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false, // Don't refetch on window focus for dashboard stats
    refetchOnMount: true, // Refetch on mount if data is stale
    placeholderData: keepPreviousData,
  });
};
