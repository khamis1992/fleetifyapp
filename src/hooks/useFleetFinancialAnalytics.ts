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
  totalRevenue: number;
  netProfit: number;
  profitMargin: number;
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

// Validate depreciation prerequisites
export const useValidateDepreciationData = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ["validate-depreciation", companyId],
    queryFn: async () => {
      console.log("🔍 فحص بيانات الاستهلاك للشركة:", companyId);
      
      // Check active vehicles
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id, plate_number, purchase_cost, depreciation_rate, accumulated_depreciation")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (vehiclesError) {
        console.error("❌ خطأ في استعلام المركبات:", vehiclesError);
        throw vehiclesError;
      }

      console.log(`📊 تم العثور على ${vehicles?.length || 0} مركبة نشطة`);

      const validationResult = {
        hasActiveVehicles: vehicles && vehicles.length > 0,
        vehicleCount: vehicles?.length || 0,
        vehiclesWithoutDepreciationRate: vehicles?.filter(v => !v.depreciation_rate).length || 0,
        vehiclesWithoutPurchaseCost: vehicles?.filter(v => !v.purchase_cost).length || 0,
        vehicles: vehicles || []
      };

      console.log("📋 نتائج التحقق:", validationResult);
      return validationResult;
    },
    enabled: !!companyId,
  });
};

// Process Vehicle Depreciation with enhanced error handling
export const useProcessVehicleDepreciation = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (depreciationDate?: string): Promise<DepreciationResult[]> => {
      const dateParam = depreciationDate || new Date().toISOString().split('T')[0];
      
      console.log("🚀 بدء معالجة الاستهلاك...", {
        companyId,
        depreciationDate: dateParam
      });

      // First validate prerequisites
      const { data: vehicles, error: validationError } = await supabase
        .from("vehicles")
        .select("id, plate_number, purchase_cost, depreciation_rate")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (validationError) {
        console.error("❌ خطأ في التحقق من المركبات:", validationError);
        throw new Error(`فشل في التحقق من بيانات المركبات: ${validationError.message}`);
      }

      if (!vehicles || vehicles.length === 0) {
        console.warn("⚠️ لا توجد مركبات نشطة");
        throw new Error("لا توجد مركبات نشطة لمعالجة الاستهلاك");
      }

      const vehiclesWithoutData = vehicles.filter(v => !v.purchase_cost || !v.depreciation_rate);
      if (vehiclesWithoutData.length > 0) {
        console.warn("⚠️ مركبات تفتقر لبيانات الاستهلاك:", vehiclesWithoutData);
        throw new Error(`${vehiclesWithoutData.length} مركبة تفتقر لبيانات سعر الشراء أو معدل الاستهلاك`);
      }

      console.log(`✅ تم التحقق من ${vehicles.length} مركبة، جاهزة للمعالجة`);

      // Process depreciation
      try {
        const { data, error } = await supabase.rpc("process_vehicle_depreciation_monthly", {
          company_id_param: companyId,
          depreciation_date_param: dateParam
        });

        if (error) {
          console.error("❌ خطأ في معالجة الاستهلاك:", error);
          
          // Try fallback to edge function if RPC fails
          console.log("🔄 محاولة استخدام Edge Function كبديل...");
          const fallbackResult = await supabase.functions.invoke('process-monthly-depreciation', {
            body: { 
              company_id: companyId, 
              depreciation_date: dateParam 
            }
          });
          
          if (fallbackResult.error) {
            console.error("❌ فشل Edge Function أيضاً:", fallbackResult.error);
            throw new Error(`فشل في معالجة الاستهلاك: ${error.message}. فشل البديل أيضاً: ${fallbackResult.error.message}`);
          }
          
          console.log("✅ نجح Edge Function");
          return fallbackResult.data?.results || [];
        }

        console.log("✅ تمت معالجة الاستهلاك بنجاح:", data);
        return data || [];
        
      } catch (dbError: any) {
        console.error("❌ خطأ في قاعدة البيانات:", dbError);
        throw new Error(`خطأ في معالجة الاستهلاك: ${dbError.message}`);
      }
    },
    onSuccess: (data) => {
      console.log(`🎉 تم معالجة استهلاك ${data.length} مركبة بنجاح`);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["fleet-financial-overview"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["validate-depreciation"] });
    },
    onError: (error) => {
      console.error("💥 فشل في معالجة الاستهلاك:", error);
    }
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
      // Get vehicle data
      const { data: vehicleData, error: vehicleError } = await supabase
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

      if (vehicleError) throw vehicleError;

      // Get revenue from active contracts
      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select("total_paid, monthly_amount")
        .eq("company_id", companyId)
        .eq("status", "active");

      if (contractError) throw contractError;

      const summary = vehicleData.reduce((acc, vehicle) => {
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
        averageOperatingCost: 0,
        totalRevenue: 0,
        netProfit: 0,
        profitMargin: 0
      });

      // Calculate revenue from contracts
      summary.totalRevenue = contractData.reduce((sum, contract) => sum + (contract.total_paid || 0), 0);
      
      summary.totalBookValue = summary.totalPurchasePrice - summary.totalAccumulatedDepreciation;
      summary.averageOperatingCost = summary.vehicleCount > 0 ? summary.totalOperatingCost / summary.vehicleCount : 0;
      
      // Calculate net profit and margin
      const totalCosts = summary.totalOperatingCost + summary.totalMaintenanceCost;
      summary.netProfit = summary.totalRevenue - totalCosts;
      summary.profitMargin = summary.totalRevenue > 0 ? (summary.netProfit / summary.totalRevenue) * 100 : 0;

      return summary;
    },
    enabled: !!companyId,
  });
};