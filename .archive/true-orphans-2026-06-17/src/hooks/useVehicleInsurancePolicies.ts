import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface VehicleInsurancePolicy {
  id: string;
  company_id: string;
  vehicle_id: string;
  policy_type: 'third_party' | 'comprehensive' | 'collision' | 'theft';
  insurance_company: string;
  policy_number: string;
  coverage_amount: number;
  deductible_amount: number;
  premium_amount: number;
  premium_frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  effective_date: string;
  expiry_date: string;
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
  coverage_details: Record<string, any>;
  documents: any[];
  is_active: boolean;
  auto_renew: boolean;
  renewal_notice_days: number;
  created_at: string;
  updated_at: string;
}

export const useVehicleInsurancePolicies = (vehicleId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['vehicle-insurance-policies', user?.profile?.company_id, vehicleId],
    queryFn: async (): Promise<VehicleInsurancePolicy[]> => {
      if (!user?.profile?.company_id) return [];
      
      let query = supabase
        .from('vehicle_insurance_policies')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .order('expiry_date', { ascending: true });
      
      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as VehicleInsurancePolicy[];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useCreateVehicleInsurancePolicy = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (policyData: Omit<VehicleInsurancePolicy, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!user?.profile?.company_id) throw new Error('No company ID');
      
      const { data, error } = await supabase
        .from('vehicle_insurance_policies')
        .insert({
          ...policyData,
          company_id: user.profile.company_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurance-policies'] });
      toast({
        title: "تم إضافة بوليصة التأمين بنجاح",
        description: "تم حفظ بيانات التأمين الجديدة",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في إضافة بوليصة التأمين",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateVehicleInsurancePolicy = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleInsurancePolicy> }) => {
      const { data: updated, error } = await supabase
        .from('vehicle_insurance_policies')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurance-policies'] });
      toast({
        title: "تم تحديث بوليصة التأمين بنجاح",
        description: "تم حفظ التغييرات",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تحديث بوليصة التأمين",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};