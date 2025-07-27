import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FleetAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  totalMaintenanceCost: number;
  monthlyMaintenanceCost: number;
  averageUtilization: number;
  averageDailyRate: number;
  totalContracts: number;
  activeContracts: number;
  maintenanceScheduled: number;
  maintenanceOverdue: number;
  fuelEfficiency: number;
  averageAge: number;
  depreciationRate: number;
  insuranceCoverage: number;
  vehiclesByCategory: Array<{
    category: string;
    count: number;
    revenue: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    contracts: number;
  }>;
  maintenanceTrends: Array<{
    month: string;
    cost: number;
    count: number;
  }>;
  utilizationByVehicle: Array<{
    vehicleId: string;
    plateNumber: string;
    utilization: number;
    revenue: number;
  }>;
}

export const useFleetAnalytics = (companyId?: string) => {
  const { user } = useAuth();
  const targetCompanyId = companyId || user?.profile?.company_id;

  return useQuery({
    queryKey: ['fleet-analytics', targetCompanyId],
    queryFn: async (): Promise<FleetAnalytics> => {
      if (!targetCompanyId) {
        return {
          totalRevenue: 0,
          monthlyRevenue: 0,
          totalMaintenanceCost: 0,
          monthlyMaintenanceCost: 0,
          averageUtilization: 0,
          averageDailyRate: 0,
          totalContracts: 0,
          activeContracts: 0,
          maintenanceScheduled: 0,
          maintenanceOverdue: 0,
          fuelEfficiency: 0,
          averageAge: 0,
          depreciationRate: 0,
          insuranceCoverage: 0,
          vehiclesByCategory: [],
          revenueByMonth: [],
          maintenanceTrends: [],
          utilizationByVehicle: []
        };
      }

      try {
        // Get vehicles data
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('*')
          .eq('company_id', targetCompanyId)
          .eq('is_active', true);

        // Get contracts data
        const { data: contracts } = await supabase
          .from('contracts')
          .select('*')
          .eq('company_id', targetCompanyId);

        // Get maintenance data
        const { data: maintenance } = await supabase
          .from('vehicle_maintenance')
          .select('*')
          .eq('company_id', targetCompanyId);

        // Calculate analytics
        const totalVehicles = vehicles?.length || 0;
        const activeContracts = contracts?.filter(c => c.status === 'active').length || 0;
        const totalRevenue = contracts?.reduce((sum, c) => sum + (c.contract_amount || 0), 0) || 0;
        
        // Monthly revenue (current month)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyRevenue = contracts?.filter(c => {
          const contractDate = new Date(c.contract_date);
          return contractDate.getMonth() === currentMonth && contractDate.getFullYear() === currentYear;
        }).reduce((sum, c) => sum + (c.monthly_amount || 0), 0) || 0;

        // Maintenance costs
        const totalMaintenanceCost = maintenance?.reduce((sum, m) => sum + (m.actual_cost || 0), 0) || 0;
        const monthlyMaintenanceCost = maintenance?.filter(m => {
          const maintenanceDate = new Date(m.completed_date || m.created_at);
          return maintenanceDate.getMonth() === currentMonth && maintenanceDate.getFullYear() === currentYear;
        }).reduce((sum, m) => sum + (m.actual_cost || 0), 0) || 0;

        // Utilization rate
        const rentedVehicles = vehicles?.filter(v => v.status === 'rented').length || 0;
        const averageUtilization = totalVehicles > 0 ? (rentedVehicles / totalVehicles) * 100 : 0;

        // Average daily rate
        const averageDailyRate = vehicles?.reduce((sum, v) => sum + (v.daily_rate || 0), 0) / totalVehicles || 0;

        // Vehicle age calculation
        const currentYearNum = new Date().getFullYear();
        const averageAge = vehicles?.reduce((sum, v) => sum + (currentYearNum - (v.year || currentYearNum)), 0) / totalVehicles || 0;

        // Maintenance scheduled and overdue
        const today = new Date();
        const maintenanceScheduled = maintenance?.filter(m => 
          m.status === 'pending' && new Date(m.scheduled_date || '') >= today
        ).length || 0;
        
        const maintenanceOverdue = maintenance?.filter(m => 
          m.status === 'pending' && new Date(m.scheduled_date || '') < today
        ).length || 0;

        // Insurance coverage
        const insuredVehicles = vehicles?.filter(v => 
          v.insurance_end_date && new Date(v.insurance_end_date) > today
        ).length || 0;
        const insuranceCoverage = totalVehicles > 0 ? (insuredVehicles / totalVehicles) * 100 : 0;

        // Revenue by month (last 12 months)
        const revenueByMonth = [];
        for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const month = date.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' });
          
          const monthRevenue = contracts?.filter(c => {
            const contractDate = new Date(c.contract_date);
            return contractDate.getMonth() === date.getMonth() && 
                   contractDate.getFullYear() === date.getFullYear();
          }).reduce((sum, c) => sum + (c.monthly_amount || 0), 0) || 0;

          const monthContracts = contracts?.filter(c => {
            const contractDate = new Date(c.contract_date);
            return contractDate.getMonth() === date.getMonth() && 
                   contractDate.getFullYear() === date.getFullYear();
          }).length || 0;

          revenueByMonth.push({
            month,
            revenue: monthRevenue,
            contracts: monthContracts
          });
        }

        // Maintenance trends (last 12 months)
        const maintenanceTrends = [];
        for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const month = date.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' });
          
          const monthMaintenance = maintenance?.filter(m => {
            const maintenanceDate = new Date(m.completed_date || m.created_at);
            return maintenanceDate.getMonth() === date.getMonth() && 
                   maintenanceDate.getFullYear() === date.getFullYear();
          }) || [];

          maintenanceTrends.push({
            month,
            cost: monthMaintenance.reduce((sum, m) => sum + (m.actual_cost || 0), 0),
            count: monthMaintenance.length
          });
        }

        // Utilization by vehicle
        const utilizationByVehicle = vehicles?.map(v => {
          const vehicleContracts = contracts?.filter(c => c.vehicle_id === v.id) || [];
          const totalContractDays = vehicleContracts.reduce((sum, c) => {
            const start = new Date(c.start_date);
            const end = new Date(c.end_date);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0);
          
          const daysInYear = 365;
          const utilization = (totalContractDays / daysInYear) * 100;
          const revenue = vehicleContracts.reduce((sum, c) => sum + (c.contract_amount || 0), 0);

          return {
            vehicleId: v.id,
            plateNumber: v.plate_number,
            utilization: Math.min(utilization, 100),
            revenue
          };
        }) || [];

        return {
          totalRevenue,
          monthlyRevenue,
          totalMaintenanceCost,
          monthlyMaintenanceCost,
          averageUtilization,
          averageDailyRate,
          totalContracts: contracts?.length || 0,
          activeContracts,
          maintenanceScheduled,
          maintenanceOverdue,
          fuelEfficiency: 0, // This would need fuel consumption data
          averageAge,
          depreciationRate: 0, // This would need depreciation calculation
          insuranceCoverage,
          vehiclesByCategory: [], // This would need category grouping
          revenueByMonth,
          maintenanceTrends,
          utilizationByVehicle
        };
      } catch (error) {
        console.error('Error fetching fleet analytics:', error);
        throw error;
      }
    },
    enabled: !!targetCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};