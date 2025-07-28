import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DispatchPermit {
  id: string;
  company_id: string;
  permit_number: string;
  vehicle_id: string;
  requested_by: string;
  approved_by?: string | null;
  request_type: string;
  purpose: string;
  purpose_ar?: string | null;
  destination: string;
  destination_ar?: string | null;
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  estimated_km?: number | null;
  actual_km?: number | null;
  fuel_allowance?: number | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_license?: string | null;
  status: string;
  priority: string;
  notes?: string | null;
  rejection_reason?: string | null;
  approval_signature?: string | null;
  completion_notes?: string | null;
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
  completed_at?: string | null;
  vehicle?: {
    plate_number: string;
    make: string;
    model: string;
  } | null;
  requester?: {
    first_name: string;
    last_name: string;
    first_name_ar?: string | null;
    last_name_ar?: string | null;
  } | null;
  approver?: {
    first_name: string;
    last_name: string;
    first_name_ar?: string | null;
    last_name_ar?: string | null;
  } | null;
}

export interface CreateDispatchPermitData {
  vehicle_id: string;
  request_type: string;
  purpose: string;
  purpose_ar?: string;
  destination: string;
  destination_ar?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  estimated_km?: number;
  fuel_allowance?: number;
  driver_name?: string;
  driver_phone?: string;
  driver_license?: string;
  priority?: string;
  notes?: string;
}

export const useDispatchPermits = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['dispatch-permits', user?.profile?.company_id],
    queryFn: async (): Promise<DispatchPermit[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('vehicle_dispatch_permits')
        .select(`
          *,
          vehicle:vehicles!vehicle_id(plate_number, make, model),
          requester:profiles!requested_by(first_name, last_name, first_name_ar, last_name_ar),
          approver:profiles!approved_by(first_name, last_name, first_name_ar, last_name_ar)
        `)
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dispatch permits:', error);
        throw error;
      }

      return (data as any[]) || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useCreateDispatchPermit = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permitData: CreateDispatchPermitData) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      // Generate permit number
      const { data: permitNumber, error: numberError } = await supabase
        .rpc('generate_dispatch_permit_number', {
          company_id_param: user.profile.company_id
        });

      if (numberError) {
        throw numberError;
      }

      const { data, error } = await supabase
        .from('vehicle_dispatch_permits')
        .insert({
          ...permitData,
          company_id: user.profile.company_id,
          permit_number: permitNumber,
          requested_by: user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-permits'] });
    },
  });
};

export const useUpdateDispatchPermit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DispatchPermit> }) => {
      const { data, error } = await supabase
        .from('vehicle_dispatch_permits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-permits'] });
    },
  });
};

export const useUpdatePermitStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      permitId, 
      status, 
      reason, 
      location, 
      odometerReading 
    }: { 
      permitId: string; 
      status: string; 
      reason?: string;
      location?: string;
      odometerReading?: number;
    }) => {
      const { error } = await supabase
        .rpc('update_dispatch_permit_status', {
          permit_id_param: permitId,
          new_status: status,
          change_reason: reason,
          location,
          odometer_reading: odometerReading
        });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-permits'] });
    },
  });
};