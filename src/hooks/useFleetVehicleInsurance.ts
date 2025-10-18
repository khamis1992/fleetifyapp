import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface FleetVehicleInsurance {
  id: string;
  company_id: string;
  vehicle_id: string;
  insurance_company: string;
  insurance_company_ar?: string;
  policy_number: string;
  policy_type: string;
  start_date: string;
  end_date: string;
  premium_amount: number;
  coverage_amount?: number;
  deductible_amount?: number;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  policy_document_url?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useFleetVehicleInsurance = (vehicleId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['fleet-vehicle-insurance', vehicleId],
    queryFn: async (): Promise<FleetVehicleInsurance[]> => {
      if (!user?.profile?.company_id || !vehicleId) {
        return [];
      }

      const { data, error } = await supabase
        .from('fleet_vehicle_insurance')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .eq('vehicle_id', vehicleId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching fleet vehicle insurance:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id && !!vehicleId,
  });
};

export const useCreateFleetVehicleInsurance = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (insuranceData: Omit<FleetVehicleInsurance, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('fleet_vehicle_insurance')
        .insert([{
          ...insuranceData,
          company_id: user.profile.company_id,
        }])
        .select();

      if (error) {
        console.error('Error creating fleet vehicle insurance:', error);
        throw error;
      }

      return data[0];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicle-insurance'] });
      toast({
        title: "تم إضافة التأمين",
        description: "تم حفظ بيانات التأمين بنجاح.",
      });
    },
    onError: (error) => {
      console.error('Error creating fleet vehicle insurance:', error);
      toast({
        title: "خطأ في إضافة التأمين",
        description: "حدث خطأ أثناء حفظ بيانات التأمين.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateFleetVehicleInsurance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FleetVehicleInsurance> }) => {
      const { data: result, error } = await supabase
        .from('fleet_vehicle_insurance')
        .update(data)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating fleet vehicle insurance:', error);
        throw error;
      }

      return result[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicle-insurance'] });
      toast({
        title: "تم تحديث التأمين",
        description: "تم تحديث بيانات التأمين بنجاح.",
      });
    },
    onError: (error) => {
      console.error('Error updating fleet vehicle insurance:', error);
      toast({
        title: "خطأ في تحديث التأمين",
        description: "حدث خطأ أثناء تحديث بيانات التأمين.",
        variant: "destructive",
      });
    },
  });
};