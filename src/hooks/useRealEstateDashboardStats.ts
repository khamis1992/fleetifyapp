import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { PropertyStats } from '@/modules/properties/types';

export interface RealEstateDashboardStats extends PropertyStats {
  // إحصائيات إضافية خاصة بالعقارات
  total_owners: number;
  total_tenants: number;
  active_contracts: number;
  expiring_contracts: number;
  monthly_revenue: number;
  yearly_revenue: number;
  pending_payments: number;
  overdue_payments: number;
  maintenance_requests: number;
  
  // مؤشرات الأداء
  average_contract_duration: number;
  renewal_rate: number;
  
  // بيانات للرسوم البيانية
  revenue_trend: Array<{ month: string; revenue: number }>;
  occupancy_trend: Array<{ month: string; occupancy: number }>;
}

export const useRealEstateDashboardStats = () => {
  const { companyId, filter, hasGlobalAccess, getQueryKey } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: getQueryKey(['real-estate-dashboard-stats']),
    queryFn: async (): Promise<RealEstateDashboardStats> => {
      if (!companyId && !hasGlobalAccess) {
        return getEmptyRealEstateStats();
      }

      const targetCompanyId = filter.company_id || companyId;
      if (!targetCompanyId && !hasGlobalAccess) {
        return getEmptyRealEstateStats();
      }

      return await fetchRealEstateStats(targetCompanyId, hasGlobalAccess);
    },
    enabled: !!(companyId || hasGlobalAccess),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

async function fetchRealEstateStats(
  companyId: string | undefined, 
  hasGlobalAccess: boolean = false
): Promise<RealEstateDashboardStats> {
  
  // إضافة timeout للاستعلامات لتجنب التحميل اللانهائي
  const QUERY_TIMEOUT = 10000; // 10 ثوان
  
  // Helper function to build query with company filtering
  const buildQuery = (baseQuery: any) => {
    if (companyId && !hasGlobalAccess) {
      return baseQuery.eq('company_id', companyId);
    } else if (companyId && hasGlobalAccess) {
      return baseQuery.eq('company_id', companyId);
    }
    // For super_admin without specific company filter, return all
    return baseQuery;
  };

  try {
    // تنفيذ الاستعلامات مع timeout - GRACEFUL ERROR HANDLING
    const safeQuery = async (query: any) => {
      try {
        const result = await query;
        return result.error ? { data: null, count: 0, error: result.error } : result;
      } catch (err) {
        console.warn('Query failed:', err);
        return { data: null, count: 0, error: err };
      }
    };

    const queryPromise = Promise.all([
      // Properties data with status breakdown
      safeQuery(buildQuery(supabase.from('properties').select('*')).eq('is_active', true)),
      
      // Property owners count
      safeQuery(buildQuery(supabase.from('property_owners').select('*', { count: 'exact', head: true })).eq('is_active', true)),
      
      // Property tenants count (using customers as tenants)
      safeQuery(buildQuery(supabase.from('customers').select('*', { count: 'exact', head: true })).eq('is_active', true)),
      
      // Property contracts data
      safeQuery(buildQuery(supabase.from('property_contracts').select('*')).eq('is_active', true)),
      
      // Property payments data (using property_payments table - NOT payments)
      safeQuery(buildQuery(supabase.from('property_payments').select('*'))),
      
      // Revenue from active contracts
      safeQuery(buildQuery(supabase.from('property_contracts').select('rental_amount')).eq('status', 'active').eq('is_active', true))
    ]);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT);
    });

    const [
      propertiesResult,
      ownersResult,
      tenantsResult,
      contractsResult,
      paymentsResult,
      revenueResult
    ] = await Promise.race([queryPromise, timeoutPromise]) as any[];

    // Process properties data
    const properties = propertiesResult.data || [];
    const total_properties = properties.length;
    const available_properties = properties.filter(p => p.property_status === 'available').length;
    const rented_properties = properties.filter(p => p.property_status === 'rented').length;
    const for_sale_properties = properties.filter(p => p.property_status === 'for_sale').length;
    const maintenance_properties = properties.filter(p => p.property_status === 'maintenance').length;

    // Process contracts data
    const contracts = contractsResult.data || [];
    const activeContracts = contracts.filter(c => c.status === 'active').length;
    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const expiringContracts = contracts.filter(c => 
      c.status === 'active' && 
      c.end_date && 
      new Date(c.end_date) <= nextMonth
    ).length;

    // Process payments data
    const payments = paymentsResult.data || [];
    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const overduePayments = payments.filter(p => p.status === 'overdue').length;

    // Calculate revenue metrics
    const monthlyRevenue = revenueResult.data?.reduce((sum, contract) => 
      sum + (contract.rental_amount || 0), 0) || 0;
    const yearlyRevenue = monthlyRevenue * 12;

    // Calculate total monthly rent from properties
    const totalMonthlyRent = properties.reduce((sum, property) => 
      sum + (property.rental_price || 0), 0);

    // Calculate occupancy rate
    const occupancyRate = total_properties > 0 ? (rented_properties / total_properties) * 100 : 0;

    // Calculate average rent per sqm
    const totalArea = properties.reduce((sum, property) => sum + (property.area_sqm || 0), 0);
    const averageRentPerSqm = totalArea > 0 ? totalMonthlyRent / totalArea : 0;

    // Group properties by type
    const propertiesByType = properties.reduce((acc, property) => {
      const type = property.property_type || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group properties by area (simplified - using first part of address)
    const propertiesByArea = properties.reduce((acc, property) => {
      const area = property.address?.split(',')[0]?.trim() || 'غير محدد';
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Generate trend data (mock for now - in real implementation, you'd query historical data)
    const revenueTrend = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: date.toLocaleDateString('ar-SA', { month: 'short' }),
        revenue: monthlyRevenue * (0.8 + Math.random() * 0.4) // Mock variation
      };
    });

    const occupancyTrend = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: date.toLocaleDateString('ar-SA', { month: 'short' }),
        occupancy: occupancyRate * (0.9 + Math.random() * 0.2) // Mock variation
      };
    });

    return {
      // Basic property stats
      total_properties,
      available_properties,
      rented_properties,
      for_sale_properties,
      maintenance_properties,
      total_monthly_rent: totalMonthlyRent,
      total_yearly_rent: yearlyRevenue,
      occupancy_rate: occupancyRate,
      average_rent_per_sqm: averageRentPerSqm,
      properties_by_type: propertiesByType,
      properties_by_area: propertiesByArea,

      // Extended stats
      total_owners: ownersResult.count || 0,
      total_tenants: tenantsResult.count || 0,
      active_contracts: activeContracts,
      expiring_contracts: expiringContracts,
      monthly_revenue: monthlyRevenue,
      yearly_revenue: yearlyRevenue,
      pending_payments: pendingPayments,
      overdue_payments: overduePayments,
      maintenance_requests: maintenance_properties,

      // Performance indicators
      average_contract_duration: 12, // Mock value
      renewal_rate: 85, // Mock value

      // Trend data
      revenue_trend: revenueTrend,
      occupancy_trend: occupancyTrend
    };

  } catch (error) {
    console.error('Error fetching real estate stats:', error);
    return getEmptyRealEstateStats();
  }
}

function getEmptyRealEstateStats(): RealEstateDashboardStats {
  return {
    total_properties: 0,
    available_properties: 0,
    rented_properties: 0,
    for_sale_properties: 0,
    maintenance_properties: 0,
    total_monthly_rent: 0,
    total_yearly_rent: 0,
    occupancy_rate: 0,
    average_rent_per_sqm: 0,
    properties_by_type: {
      residential: 0,
      commercial: 0,
      industrial: 0,
      land: 0,
      warehouse: 0,
      office: 0,
      retail: 0,
      villa: 0,
      apartment: 0,
      building: 0
    },
    properties_by_area: {},
    
    total_owners: 0,
    total_tenants: 0,
    active_contracts: 0,
    expiring_contracts: 0,
    monthly_revenue: 0,
    yearly_revenue: 0,
    pending_payments: 0,
    overdue_payments: 0,
    maintenance_requests: 0,
    
    average_contract_duration: 0,
    renewal_rate: 0,
    
    revenue_trend: [],
    occupancy_trend: []
  };
}