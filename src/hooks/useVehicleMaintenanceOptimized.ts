import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface VehicleMaintenanceOptimized {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  description?: string;
  scheduled_date?: string;
  completed_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_cost?: number;
  actual_cost?: number;
  maintenance_number?: string;
  created_at: string;
  updated_at: string;
  // Optimized vehicle data - only what we need for display
  vehicle: {
    plate_number: string;
    make: string;
    model: string;
  };
}

// Optimized hook for maintenance page with pagination and limited data
export const useVehicleMaintenanceOptimized = (
  vehicleId?: string, 
  status?: string,
  limit: number = 50,
  offset: number = 0
) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["vehicle-maintenance-optimized", vehicleId, status, user?.profile?.company_id, limit, offset],
    queryFn: async () => {
      if (!user?.profile?.company_id) return { data: [], count: 0 };
      
      let query = supabase
        .from("vehicle_maintenance")
        .select(`
          id,
          vehicle_id,
          maintenance_type,
          description,
          scheduled_date,
          completed_date,
          status,
          priority,
          estimated_cost,
          actual_cost,
          maintenance_number,
          created_at,
          updated_at,
          vehicles(plate_number, make, model)
        `, { count: 'exact' })
        .eq("company_id", user.profile.company_id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId);
      }

      if (status && status !== 'all') {
        query = query.eq("status", status as 'pending' | 'in_progress' | 'completed' | 'cancelled');
      }

      const { data, error, count } = await query;

      if (error) throw error;
      
      // Transform data to match our interface
      const transformedData = data?.map(item => {
        const vehicle = Array.isArray(item.vehicles) ? item.vehicles[0] : item.vehicles;
        return {
          ...item,
          vehicle: vehicle || { plate_number: 'N/A', make: 'N/A', model: 'N/A' }
        };
      }) as VehicleMaintenanceOptimized[];

      return { data: transformedData || [], count: count || 0 };
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

// Optimized hook for maintenance overview/stats - separate from detailed data
export const useMaintenanceStats = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["maintenance-stats", user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        total_cost_month: 0
      };

      // Get counts by status
      const { data: statusCounts } = await supabase
        .from("vehicle_maintenance")
        .select("status")
        .eq("company_id", user.profile.company_id);

      // Get monthly costs (completed maintenance only)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyCosts } = await supabase
        .from("vehicle_maintenance")
        .select("actual_cost")
        .eq("company_id", user.profile.company_id)
        .eq("status", "completed")
        .gte("completed_date", startOfMonth.toISOString())
        .not("actual_cost", "is", null);

      const stats = {
        pending: statusCounts?.filter(m => m.status === 'pending').length || 0,
        in_progress: statusCounts?.filter(m => m.status === 'in_progress').length || 0,
        completed: statusCounts?.filter(m => m.status === 'completed').length || 0,
        cancelled: statusCounts?.filter(m => m.status === 'cancelled').length || 0,
        total_cost_month: monthlyCosts?.reduce((sum, m) => sum + (m.actual_cost || 0), 0) || 0
      };

      return stats;
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 2 * 60 * 1000, // 2 minutes cache for stats
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
};

// Existing create mutation can be reused
export const useCreateVehicleMaintenance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (maintenanceData: any) => {
      // Generate maintenance number
      const { data: maintenanceNumber, error: numberError } = await supabase
        .rpc('generate_maintenance_number', { company_id_param: maintenanceData.company_id });

      if (numberError) throw numberError;

      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .insert([{ 
          ...maintenanceData, 
          maintenance_number: maintenanceNumber,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate both optimized and stats queries
      queryClient.invalidateQueries({ queryKey: ["vehicle-maintenance-optimized"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-stats"] });
      queryClient.invalidateQueries({ queryKey: ["smart-alerts"] });
      toast({
        title: "Success",
        description: "Vehicle maintenance scheduled successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to schedule maintenance",
        variant: "destructive",
      });
    }
  });
};
