import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Interface for vehicle return form data
export interface ContractVehicleReturnForm {
  id?: string;
  contract_id: string;
  vehicle_id: string;
  return_date: string;
  vehicle_condition: 'excellent' | 'good' | 'fair' | 'poor';
  fuel_level: number;
  odometer_reading?: number;
  damages: Array<{
    type: string;
    description: string;
    severity: 'minor' | 'moderate' | 'major';
    cost_estimate?: number;
  }>;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
}

// Interface for creating a new vehicle return
export interface CreateContractVehicleReturnData {
  contract_id: string;
  vehicle_id: string;
  return_date: string;
  vehicle_condition: 'excellent' | 'good' | 'fair' | 'poor';
  fuel_level: number;
  odometer_reading?: number;
  damages?: Array<{
    type: string;
    description: string;
    severity: 'minor' | 'moderate' | 'major';
    cost_estimate?: number;
  }>;
  notes?: string;
}

// Hook to fetch vehicle return by contract ID
export const useContractVehicleReturnByContract = (contractId: string) => {
  return useQuery({
    queryKey: ['contract-vehicle-return', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_vehicle_returns')
        .select('*')
        .eq('contract_id', contractId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      return data;
    },
    enabled: !!contractId,
  });
};

// Hook to create a new contract vehicle return
export const useCreateContractVehicleReturn = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateContractVehicleReturnData) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID not found');
      }

      const { data: returnData, error } = await supabase
        .from('contract_vehicle_returns')
        .insert({
          company_id: user.profile.company_id,
          returned_by: user.id,
          ...data,
          damages: data.damages || [],
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return returnData;
    },
    onSuccess: (data) => {
      toast.success('Vehicle return form created successfully');
      queryClient.invalidateQueries({ queryKey: ['contract-vehicle-return'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (error: Error) => {
      console.error('Error creating vehicle return:', error);
      toast.error('Failed to create vehicle return: ' + error.message);
    },
  });
};

// Hook to update an existing contract vehicle return
export const useUpdateContractVehicleReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ContractVehicleReturnForm> & { id: string }) => {
      const { data: returnData, error } = await supabase
        .from('contract_vehicle_returns')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return returnData;
    },
    onSuccess: (data) => {
      toast.success('Vehicle return updated successfully');
      queryClient.invalidateQueries({ queryKey: ['contract-vehicle-return'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (error: Error) => {
      console.error('Error updating vehicle return:', error);
      toast.error('Failed to update vehicle return: ' + error.message);
    },
  });
};

// Hook to approve a contract vehicle return
export const useApproveContractVehicleReturn = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (returnId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: returnData, error } = await supabase
        .from('contract_vehicle_returns')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', returnId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return returnData;
    },
    onSuccess: (data) => {
      toast.success('Vehicle return approved successfully');
      queryClient.invalidateQueries({ queryKey: ['contract-vehicle-return'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (error: Error) => {
      console.error('Error approving vehicle return:', error);
      toast.error('Failed to approve vehicle return: ' + error.message);
    },
  });
};

// Hook to reject a contract vehicle return
export const useRejectContractVehicleReturn = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ returnId, rejectionReason }: { returnId: string; rejectionReason: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: returnData, error } = await supabase
        .from('contract_vehicle_returns')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', returnId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return returnData;
    },
    onSuccess: (data) => {
      toast.success('Vehicle return rejected');
      queryClient.invalidateQueries({ queryKey: ['contract-vehicle-return'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (error: Error) => {
      console.error('Error rejecting vehicle return:', error);
      toast.error('Failed to reject vehicle return: ' + error.message);
    },
  });
};