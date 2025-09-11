import { useQuery } from '@tanstack/react-query';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';

// Property Report Data Types
export interface PropertyFinancialData {
  totalRevenue: number;
  monthlyRevenue: number;
  totalProfit: number;
  occupancyRate: number;
  averageRent: number;
  totalProperties: number;
  occupiedProperties: number;
  vacantProperties: number;
  overduePyments: number;
  collectionRate: number;
}

export interface PropertyPerformanceData {
  propertyId: string;
  propertyName: string;
  propertyType: string;
  location: string;
  monthlyRent: number;
  actualRevenue: number;
  occupancyDays: number;
  profitMargin: number;
  maintenanceCosts: number;
  roi: number;
  status: 'occupied' | 'vacant' | 'maintenance' | 'available';
}

export interface OccupancyAnalysis {
  month: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  newLeases: number;
  renewals: number;
  terminations: number;
  averageVacancyDays: number;
}

export interface OwnerFinancialStatement {
  ownerId: string;
  ownerName: string;
  totalProperties: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  managementFees: number;
  maintenanceCosts: number;
  propertyTaxes: number;
  insurance: number;
  profitMargin: number;
  properties: Array<{
    propertyId: string;
    propertyName: string;
    monthlyRent: number;
    actualRevenue: number;
    expenses: number;
    netIncome: number;
  }>;
}

export interface TenantAnalysis {
  tenantId: string;
  tenantName: string;
  propertyName: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  totalPaid: number;
  amountDue: number;
  daysOverdue: number;
  paymentHistory: 'excellent' | 'good' | 'poor' | 'defaulted';
  renewalProbability: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PortfolioAnalysis {
  totalValue: number;
  totalRevenue: number;
  totalExpenses: number;
  netOperatingIncome: number;
  averageCapRate: number;
  averageOccupancy: number;
  propertyTypeDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
    avgRent: number;
    avgOccupancy: number;
  }>;
  locationAnalysis: Array<{
    location: string;
    propertyCount: number;
    totalRevenue: number;
    avgRent: number;
    occupancyRate: number;
    marketTrend: 'up' | 'down' | 'stable';
  }>;
  maintenanceAnalysis: {
    totalCosts: number;
    averageCostPerUnit: number;
    maintenanceRequestsCount: number;
    averageResponseTime: number;
  };
}

// Main Property Reports Hook
export const usePropertyReports = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['property-reports-summary']),
    queryFn: async (): Promise<{
      financial: PropertyFinancialData;
      performance: PropertyPerformanceData[];
      occupancy: OccupancyAnalysis[];
      owners: OwnerFinancialStatement[];
      tenants: TenantAnalysis[];
      portfolio: PortfolioAnalysis;
    }> => {
      if (!companyId) throw new Error('Company ID is required');

      // Fetch all necessary data in parallel
      const [
        propertiesData,
        contractsData,
        paymentsData,
        ownersData,
        maintenanceData
      ] = await Promise.all([
        supabase.from('properties').select('*').eq('company_id', companyId),
        supabase.from('property_contracts').select(`
          *,
          properties(id, property_name, property_type, address, monthly_rent),
          property_owners(owner_name),
          tenants(first_name, last_name, phone, email)
        `).eq('company_id', companyId),
        supabase.from('property_payments').select(`
          *,
          property_contracts(id, properties(property_name))
        `).eq('company_id', companyId),
        supabase.from('property_owners').select('*').eq('company_id', companyId),
        // Mock maintenance data since table doesn't exist yet
        Promise.resolve({ data: [], error: null })
      ]);

      // Process financial data
      const totalRevenue = paymentsData.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const currentDate = new Date();
      const monthlyRevenue = paymentsData.data?.filter(payment => {
        const paymentDate = new Date(payment.payment_date);
        return paymentDate.getMonth() === currentDate.getMonth() && 
               paymentDate.getFullYear() === currentDate.getFullYear();
      }).reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      const totalProperties = propertiesData.data?.length || 0;
      const occupiedProperties = contractsData.data?.filter(contract => 
        contract.status === 'active'
      ).length || 0;
      const vacantProperties = totalProperties - occupiedProperties;
      const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;

      const averageRent = contractsData.data?.reduce((sum, contract) => 
        sum + (contract.rental_amount || 0), 0) / Math.max(contractsData.data?.length || 1, 1);

      const financial: PropertyFinancialData = {
        totalRevenue,
        monthlyRevenue,
        totalProfit: totalRevenue * 0.7, // Mock calculation
        occupancyRate,
        averageRent,
        totalProperties,
        occupiedProperties,
        vacantProperties,
        overduePyments: 0, // TODO: Calculate actual overdue payments
        collectionRate: 95 // Mock value
      };

      // Process performance data
      const performance: PropertyPerformanceData[] = propertiesData.data?.map(property => {
        const propertyContracts = contractsData.data?.filter(contract => 
          contract.property_id === property.id
        ) || [];
        
        const monthlyRent = propertyContracts.reduce((sum, contract) => 
          sum + (contract.rental_amount || 0), 0);
        
        const actualRevenue = paymentsData.data?.filter(payment =>
          propertyContracts.some(contract => contract.id === payment.property_contract_id)
        ).reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

        return {
          propertyId: property.id,
          propertyName: property.property_name || 'عقار غير محدد',
          propertyType: property.property_type || 'غير محدد',
          location: property.address || 'غير محدد',
          monthlyRent,
          actualRevenue,
          occupancyDays: 365, // Mock value
          profitMargin: (actualRevenue - (actualRevenue * 0.3)) / actualRevenue * 100,
          maintenanceCosts: 0, // TODO: Calculate from maintenance data
          roi: 12, // Mock value
          status: propertyContracts.length > 0 ? 'occupied' : 'vacant' as any
        };
      }) || [];

      // Mock data for other sections (can be implemented later)
      const occupancy: OccupancyAnalysis[] = [];
      const owners: OwnerFinancialStatement[] = [];
      const tenants: TenantAnalysis[] = [];
      const portfolio: PortfolioAnalysis = {
        totalValue: 0,
        totalRevenue,
        totalExpenses: 0,
        netOperatingIncome: 0,
        averageCapRate: 0,
        averageOccupancy: occupancyRate,
        propertyTypeDistribution: [],
        locationAnalysis: [],
        maintenanceAnalysis: {
          totalCosts: 0,
          averageCostPerUnit: 0,
          maintenanceRequestsCount: 0,
          averageResponseTime: 0
        }
      };

      return {
        financial,
        performance,
        occupancy,
        owners,
        tenants,
        portfolio
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Individual report hooks
export const usePropertyFinancialReport = (startDate?: string, endDate?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['property-financial-report', startDate, endDate]),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');

      let query = supabase
        .from('property_payments')
        .select(`
          *,
          property_contracts(
            id,
            rental_amount,
            properties(property_name, property_type, location)
          )
        `)
        .eq('company_id', companyId);

      if (startDate) query = query.gte('payment_date', startDate);
      if (endDate) query = query.lte('payment_date', endDate);

      const { data, error } = await query;
      if (error) throw error;

      // Process financial data
      const totalRevenue = data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const avgRent = data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) / Math.max(data?.length || 1, 1);
      
      return {
        totalRevenue,
        avgRent,
        paymentsCount: data?.length || 0,
        data: data || []
      };
    },
    enabled: !!companyId
  });
};

export const usePropertyOccupancyReport = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['property-occupancy-report']),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');

      const [propertiesResult, contractsResult] = await Promise.all([
        supabase.from('properties').select('*').eq('company_id', companyId),
        supabase.from('property_contracts').select(`
          *,
          properties(property_name, property_type)
        `).eq('company_id', companyId)
      ]);

      const totalProperties = propertiesResult.data?.length || 0;
      const activeContracts = contractsResult.data?.filter(contract => 
        contract.status === 'active'
      ).length || 0;
      
      const occupancyRate = totalProperties > 0 ? (activeContracts / totalProperties) * 100 : 0;

      return {
        totalProperties,
        occupiedProperties: activeContracts,
        vacantProperties: totalProperties - activeContracts,
        occupancyRate,
        properties: propertiesResult.data || [],
        contracts: contractsResult.data || []
      };
    },
    enabled: !!companyId
  });
};

export const usePropertyPortfolioReport = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['property-portfolio-report']),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');

      const [propertiesResult, contractsResult, paymentsResult] = await Promise.all([
        supabase.from('properties').select('*').eq('company_id', companyId),
        supabase.from('property_contracts').select('*').eq('company_id', companyId),
        supabase.from('property_payments').select('*').eq('company_id', companyId)
      ]);

      const totalRevenue = paymentsResult.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const propertyCount = propertiesResult.data?.length || 0;
      const activeContracts = contractsResult.data?.filter(contract => contract.status === 'active').length || 0;

      // Group by property type
      const typeDistribution = propertiesResult.data?.reduce((acc, property) => {
        const type = property.property_type || 'غير محدد';
        if (!acc[type]) {
          acc[type] = { count: 0, totalRevenue: 0 };
        }
        acc[type].count++;
        return acc;
      }, {} as Record<string, { count: number; totalRevenue: number }>) || {};

      return {
        totalValue: totalRevenue * 12, // Mock calculation
        totalRevenue,
        propertyCount,
        activeContracts,
        occupancyRate: propertyCount > 0 ? (activeContracts / propertyCount) * 100 : 0,
        typeDistribution,
        properties: propertiesResult.data || []
      };
    },
    enabled: !!companyId
  });
};