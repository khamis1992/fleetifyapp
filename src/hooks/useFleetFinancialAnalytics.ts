import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";

export interface FleetFinancialData {
  vehicle_id: string;
  vehicle_number: string;
  vehicle_status: string;
  total_maintenance_cost: number;
  total_fuel_cost: number;
  total_insurance_cost: number;
  total_operating_cost: number;
  accumulated_depreciation: number;
  purchase_price: number;
  book_value: number;
  revenue_generated: number;
  net_profit: number;
  roi_percentage: number;
}

export interface MaintenanceFinancialData {
  maintenance_id: string;
  maintenance_number: string;
  vehicle_number: string;
  maintenance_type: string;
  actual_cost: number;
  journal_entry_id: string | null;
  status: string;
  completed_date: string;
}

export interface DepreciationResult {
  vehicle_id: string;
  vehicle_number: string;
  monthly_depreciation: number;
  accumulated_depreciation: number;
  journal_entry_id: string;
}

export interface FleetFinancialSummary {
  totalMaintenanceCost: number;
  totalFuelCost: number;
  totalInsuranceCost: number;
  totalOperatingCost: number;
  totalAccumulatedDepreciation: number;
  totalPurchasePrice: number;
  vehicleCount: number;
  totalBookValue: number;
  averageOperatingCost: number;
}

// Fleet Financial Overview
export const useFleetFinancialOverview = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ["fleet-financial-overview", companyId],
    queryFn: async (): Promise<FleetFinancialData[]> => {
      const { data, error } = await supabase
        .from("vehicles")
        .select(`
          id,
          plate_number,
          status,
          total_maintenance_cost,
          total_insurance_cost,
          total_operating_cost,
          accumulated_depreciation,
          purchase_cost
        `)
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (error) throw error;

      // Calculate book value and other financial metrics
      return data.map(vehicle => {
        const bookValue = (vehicle.purchase_cost || 0) - (vehicle.accumulated_depreciation || 0);
        const totalOperatingCost = vehicle.total_operating_cost || 0;
        
        // Get revenue from contracts for this vehicle
        // This would need to be enhanced to include actual revenue calculation
        const revenueGenerated = 0; // Placeholder
        const netProfit = revenueGenerated - totalOperatingCost;
        const roiPercentage = vehicle.purchase_cost > 0 ? (netProfit / vehicle.purchase_cost) * 100 : 0;

        return {
          vehicle_id: vehicle.id,
          vehicle_number: vehicle.plate_number,
          vehicle_status: vehicle.status,
          total_maintenance_cost: vehicle.total_maintenance_cost || 0,
          total_fuel_cost: 0, // Will be calculated separately
          total_insurance_cost: vehicle.total_insurance_cost || 0,
          total_operating_cost: totalOperatingCost,
          accumulated_depreciation: vehicle.accumulated_depreciation || 0,
          purchase_price: vehicle.purchase_cost || 0,
          book_value: bookValue,
          revenue_generated: revenueGenerated,
          net_profit: netProfit,
          roi_percentage: roiPercentage
        };
      });
    },
    enabled: !!companyId,
  });
};

// Maintenance Financial Integration
export const useMaintenanceFinancialData = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ["maintenance-financial-data", companyId],
    queryFn: async (): Promise<MaintenanceFinancialData[]> => {
      // First get maintenance records
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from("vehicle_maintenance")
        .select(`
          id,
          maintenance_number,
          maintenance_type,
          actual_cost,
          journal_entry_id,
          status,
          completed_date,
          vehicle_id
        `)
        .eq("company_id", companyId)
        .not("actual_cost", "is", null)
        .order("completed_date", { ascending: false });

      if (maintenanceError) throw maintenanceError;

      // Get vehicle numbers separately
      const vehicleIds = [...new Set(maintenanceData.map(m => m.vehicle_id))];
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id, plate_number")
        .in("id", vehicleIds);

      if (vehiclesError) throw vehiclesError;

      const vehicleMap = new Map(vehiclesData.map(v => [v.id, v.plate_number]));

      return maintenanceData.map(maintenance => ({
        maintenance_id: maintenance.id,
        maintenance_number: maintenance.maintenance_number,
        vehicle_number: vehicleMap.get(maintenance.vehicle_id) || "Unknown",
        maintenance_type: maintenance.maintenance_type,
        actual_cost: maintenance.actual_cost || 0,
        journal_entry_id: maintenance.journal_entry_id,
        status: maintenance.status,
        completed_date: maintenance.completed_date
      }));
    },
    enabled: !!companyId,
  });
};

// Process Vehicle Depreciation
export const useProcessVehicleDepreciation = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (depreciationDate?: string): Promise<DepreciationResult[]> => {
      const { data, error } = await supabase.rpc("process_vehicle_depreciation_monthly", {
        company_id_param: companyId,
        depreciation_date_param: depreciationDate || new Date().toISOString().split('T')[0]
      });

      if (error) throw error;
      return data || [];
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["fleet-financial-overview"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
    },
  });
};

// Update Vehicle Costs
export const useUpdateVehicleCosts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await supabase.rpc("calculate_vehicle_total_costs", {
        vehicle_id_param: vehicleId
      });

      if (error) throw error;
      return vehicleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-financial-overview"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
};

// Fleet Financial Summary Statistics
export const useFleetFinancialSummary = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ["fleet-financial-summary", companyId],
    queryFn: async (): Promise<FleetFinancialSummary> => {
      const { data, error } = await supabase
        .from("vehicles")
        .select(`
          total_maintenance_cost,
          total_insurance_cost,
          total_operating_cost,
          accumulated_depreciation,
          purchase_cost
        `)
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (error) throw error;

      const summary = data.reduce((acc, vehicle) => {
        acc.totalMaintenanceCost += vehicle.total_maintenance_cost || 0;
        acc.totalFuelCost += 0; // Will be calculated separately
        acc.totalInsuranceCost += vehicle.total_insurance_cost || 0;
        acc.totalOperatingCost += vehicle.total_operating_cost || 0;
        acc.totalAccumulatedDepreciation += vehicle.accumulated_depreciation || 0;
        acc.totalPurchasePrice += vehicle.purchase_cost || 0;
        acc.vehicleCount += 1;
        return acc;
      }, {
        totalMaintenanceCost: 0,
        totalFuelCost: 0,
        totalInsuranceCost: 0,
        totalOperatingCost: 0,
        totalAccumulatedDepreciation: 0,
        totalPurchasePrice: 0,
        vehicleCount: 0,
        totalBookValue: 0,
        averageOperatingCost: 0
      });

      summary.totalBookValue = summary.totalPurchasePrice - summary.totalAccumulatedDepreciation;
      summary.averageOperatingCost = summary.vehicleCount > 0 ? summary.totalOperatingCost / summary.vehicleCount : 0;

      return summary;
    },
    enabled: !!companyId,
  });
};