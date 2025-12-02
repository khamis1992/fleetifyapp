import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  document_type: string;
  document_name: string;
  document_url?: string;
  issue_date: string;
  expiry_date: string;
  issuing_authority?: string;
  document_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Hook to get vehicle registration specifically
export const useVehicleRegistration = (vehicleId: string) => {
  return useQuery({
    queryKey: ['vehicle-registration', vehicleId],
    queryFn: async (): Promise<VehicleDocument[]> => {
      if (!vehicleId) {
        return [];
      }

      const { data, error } = await supabase
        .from('vehicle_documents')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('document_type', 'registration')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vehicle registration:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!vehicleId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Hook to create vehicle registration
export const useCreateVehicleRegistration = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<VehicleDocument, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('vehicle_documents')
        .insert({
          ...data,
          document_type: 'registration',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating vehicle registration:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-registration'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-insurance-registration-report'] });
      toast({
        title: "تم إضافة الاستمارة",
        description: "تم حفظ بيانات الاستمارة بنجاح.",
      });
    },
    onError: (error) => {
      console.error('Error creating vehicle registration:', error);
      toast({
        title: "خطأ في إضافة الاستمارة",
        description: "حدث خطأ أثناء حفظ بيانات الاستمارة.",
        variant: "destructive",
      });
    },
  });
};

// Hook to update vehicle registration
export const useUpdateVehicleRegistration = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleDocument> }) => {
      const { data: result, error } = await supabase
        .from('vehicle_documents')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating vehicle registration:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-registration'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-insurance-registration-report'] });
      toast({
        title: "تم تحديث الاستمارة",
        description: "تم تحديث بيانات الاستمارة بنجاح.",
      });
    },
    onError: (error) => {
      console.error('Error updating vehicle registration:', error);
      toast({
        title: "خطأ في تحديث الاستمارة",
        description: "حدث خطأ أثناء تحديث بيانات الاستمارة.",
        variant: "destructive",
      });
    },
  });
};

