import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VehicleReturnForm {
  id: string;
  company_id: string;
  dispatch_permit_id: string;
  vehicle_id: string;
  returned_by: string;
  return_date: string;
  return_odometer_reading?: number;
  fuel_level_percentage: number;
  vehicle_condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  damages_reported?: string;
  notes?: string;
  return_location?: string;
  items_returned: string[];
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateVehicleReturnData {
  dispatch_permit_id: string;
  vehicle_id: string;
  return_odometer_reading?: number;
  fuel_level_percentage: number;
  vehicle_condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  damages_reported?: string;
  notes?: string;
  return_location?: string;
  items_returned: string[];
}

export const useVehicleReturnByPermit = (permitId: string) => {
  return useQuery({
    queryKey: ["vehicle-return", permitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_return_forms")
        .select("*")
        .eq("dispatch_permit_id", permitId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as VehicleReturnForm | null;
    },
    enabled: !!permitId,
  });
};

export const useCreateVehicleReturn = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateVehicleReturnData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error("No authenticated user");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.user.id)
        .single();

      if (!profile) throw new Error("User profile not found");

      const { data: result, error } = await supabase
        .from("vehicle_return_forms")
        .insert({
          ...data,
          company_id: profile.company_id,
          returned_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result as VehicleReturnForm;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-return"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-return", data.dispatch_permit_id] });
      toast({
        title: "Success",
        description: "Vehicle return form submitted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit vehicle return form",
        variant: "destructive",
      });
      console.error("Failed to create vehicle return:", error);
    },
  });
};

export const useUpdateVehicleReturn = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateVehicleReturnData> }) => {
      const { data: result, error } = await supabase
        .from("vehicle_return_forms")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as VehicleReturnForm;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-return"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-return", data.dispatch_permit_id] });
      toast({
        title: "Success",
        description: "Vehicle return form updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update vehicle return form",
        variant: "destructive",
      });
      console.error("Failed to update vehicle return:", error);
    },
  });
};

export const useApproveVehicleReturn = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (returnId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error("No authenticated user");

      const { data: result, error } = await supabase
        .from("vehicle_return_forms")
        .update({
          status: 'approved',
          approved_by: user.user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", returnId)
        .select()
        .single();

      if (error) throw error;
      return result as VehicleReturnForm;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-return"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-return", data.dispatch_permit_id] });
      toast({
        title: "Success",
        description: "Vehicle return approved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve vehicle return",
        variant: "destructive",
      });
      console.error("Failed to approve vehicle return:", error);
    },
  });
};