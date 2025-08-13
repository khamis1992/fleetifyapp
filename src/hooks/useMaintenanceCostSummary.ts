import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";

export interface MaintenanceCostSummary {
  company_id: string;
  vehicle_id: string;
  make: string;
  model: string;
  plate_number: string;
  total_maintenance_count: number;
  completed_maintenance_count: number;
  total_maintenance_cost: number;
  total_tax_amount: number;
  total_cost_with_tax: number;
  average_maintenance_cost: number;
  last_maintenance_date: string | null;
}

export const useMaintenanceCostSummary = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ["maintenance-cost-summary", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("maintenance_cost_summary")
        .select("*")
        .eq("company_id", companyId)
        .order("total_cost_with_tax", { ascending: false });

      if (error) throw error;
      return data as MaintenanceCostSummary[];
    },
    enabled: !!companyId,
  });
};

export const useVehicleMaintenanceCosts = (vehicleId?: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ["vehicle-maintenance-costs", companyId, vehicleId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");

      let query = supabase
        .from("maintenance_cost_summary")
        .select("*")
        .eq("company_id", companyId);

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId);
      }

      const { data, error } = await query.order("last_maintenance_date", { ascending: false });

      if (error) throw error;
      return data as MaintenanceCostSummary[];
    },
    enabled: !!companyId,
  });
};