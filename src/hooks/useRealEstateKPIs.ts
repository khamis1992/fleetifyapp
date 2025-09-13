import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export interface RealEstateKPIs {
  totalRevenue: number;
  revenueGrowth: number;
  occupancyRate: number;
  averageRent: number;
  customerSatisfaction: number;
  maintenanceRequests: number;
  renewalRate: number;
  collectionRate: number;
  profitMargin: number;
  propertyValue: number;
  vacancyDuration: number;
  maintenanceCosts: number;
}

export const useRealEstateKPIs = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: getQueryKey(['real-estate-kpis']),
    queryFn: async (): Promise<RealEstateKPIs> => {
      if (!companyId) {
        return getEmptyKPIs();
      }

      const currentDate = new Date();
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const twoMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1);

      try {
        // Get current month property stats
        const { data: properties } = await supabase
          .from('properties')
          .select('*')
          .eq('company_id', companyId);

        // Get rental payments for current and previous month
        const { data: currentMonthPayments } = await supabase
          .from('property_payments')
          .select('amount, payment_date')
          .eq('company_id', companyId)
          .eq('status', 'paid')
          .gte('payment_date', lastMonth.toISOString().split('T')[0])
          .lt('payment_date', currentDate.toISOString().split('T')[0]);

        const { data: previousMonthPayments } = await supabase
          .from('property_payments')
          .select('amount, payment_date')
          .eq('company_id', companyId)
          .eq('status', 'paid')
          .gte('payment_date', twoMonthsAgo.toISOString().split('T')[0])
          .lt('payment_date', lastMonth.toISOString().split('T')[0]);

        // Get property contracts
        const { data: contracts } = await supabase
          .from('property_contracts')
          .select('*')
          .eq('company_id', companyId)
          .eq('status', 'active');

        // Get maintenance requests (using vehicle_maintenance as substitute)
        const { data: maintenanceRequests } = await supabase
          .from('vehicle_maintenance')
          .select('*')
          .eq('company_id', companyId)
          .gte('created_at', lastMonth.toISOString());

        // Calculate KPIs
        const totalProperties = properties?.length || 0;
        const rentedProperties = properties?.filter(p => p.property_status === 'rented').length || 0;
        const availableProperties = properties?.filter(p => p.property_status === 'available').length || 0;
        
        const occupancyRate = totalProperties > 0 ? (rentedProperties / totalProperties) * 100 : 0;
        
        const currentRevenue = currentMonthPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
        const previousRevenue = previousMonthPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
        
        const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
        
        const averageRent = rentedProperties > 0 ? currentRevenue / rentedProperties : 0;
        
        // Simulated KPIs (in real app, these would be calculated from actual data)
        const customerSatisfaction = 4.2; // Would come from surveys/feedback
        const maintenanceRequestsCount = maintenanceRequests?.length || 0;
        const renewalRate = 78; // Would be calculated from contract renewals
        const collectionRate = 95; // Would be calculated from payment success rate
        const profitMargin = 65; // Would be calculated from revenue vs expenses
        const propertyValue = properties?.length ? properties.length * 250000 : 0; // Average property value estimate
        const vacancyDuration = 25; // Average days vacant
        const maintenanceCosts = 12000; // Monthly maintenance costs

        return {
          totalRevenue: currentRevenue,
          revenueGrowth,
          occupancyRate,
          averageRent,
          customerSatisfaction,
          maintenanceRequests: maintenanceRequestsCount,
          renewalRate,
          collectionRate,
          profitMargin,
          propertyValue,
          vacancyDuration,
          maintenanceCosts
        };

      } catch (error) {
        console.error('Error fetching real estate KPIs:', error);
        return getEmptyKPIs();
      }
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

function getEmptyKPIs(): RealEstateKPIs {
  return {
    totalRevenue: 0,
    revenueGrowth: 0,
    occupancyRate: 0,
    averageRent: 0,
    customerSatisfaction: 0,
    maintenanceRequests: 0,
    renewalRate: 0,
    collectionRate: 0,
    profitMargin: 0,
    propertyValue: 0,
    vacancyDuration: 0,
    maintenanceCosts: 0
  };
}