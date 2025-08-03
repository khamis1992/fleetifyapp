import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VehicleConditionReport {
  id: string;
  company_id: string;
  dispatch_permit_id?: string; // Optional for contract reports
  vehicle_id: string;
  inspector_id: string;
  inspection_type: 'pre_dispatch' | 'post_dispatch';
  overall_condition: 'excellent' | 'good' | 'fair' | 'poor';
  mileage_reading?: number;
  fuel_level?: number;
  inspection_date: string;
  notes?: string;
  photos: string[];
  condition_items: Record<string, any>;
  damage_items: any[];
  inspector_signature?: string;
  customer_signature?: string;
  status: 'pending' | 'approved' | 'requires_attention';
  created_at: string;
  updated_at: string;
}

export interface CreateConditionReportData {
  dispatch_permit_id?: string; // Optional for contract reports
  vehicle_id: string;
  inspection_type: 'pre_dispatch' | 'post_dispatch';
  overall_condition: 'excellent' | 'good' | 'fair' | 'poor';
  mileage_reading?: number;
  fuel_level?: number;
  notes?: string;
  condition_items: Record<string, any>;
  damage_items?: any[];
  photos?: string[];
}

export interface UpdateConditionReportData {
  overall_condition?: 'excellent' | 'good' | 'fair' | 'poor';
  mileage_reading?: number;
  fuel_level?: number;
  notes?: string;
  condition_items?: Record<string, any>;
  damage_items?: any[];
  photos?: string[];
  inspector_signature?: string;
  customer_signature?: string;
  status?: 'pending' | 'approved' | 'requires_attention';
}

export const useVehicleConditionReports = (permitId?: string) => {
  return useQuery({
    queryKey: ['vehicle-condition-reports', permitId],
    queryFn: async () => {
      if (!permitId) return [];
      
      const { data, error } = await supabase
        .from('vehicle_condition_reports')
        .select('*')
        .eq('dispatch_permit_id', permitId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching condition reports:', error);
        throw error;
      }

      return (data || []) as VehicleConditionReport[];
    },
    enabled: !!permitId,
  });
};

export const useCreateConditionReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportData: CreateConditionReportData) => {
      // Get user's company_id first
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data, error } = await supabase
        .from('vehicle_condition_reports')
        .insert([{
          ...reportData,
          dispatch_permit_id: reportData.dispatch_permit_id || null,
          company_id: profile?.company_id,
          inspector_id: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating condition report:', error);
        throw error;
      }

      return data as VehicleConditionReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-condition-reports'] });
      toast.success('Vehicle condition report created successfully');
    },
    onError: (error) => {
      console.error('Error creating condition report:', error);
      toast.error('Failed to create condition report');
    },
  });
};

export const useUpdateConditionReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateConditionReportData }) => {
      console.log('Updating condition report:', id, updates);
      
      const { data, error } = await supabase
        .from('vehicle_condition_reports')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating condition report:', error);
        throw error;
      }

      console.log('Update successful:', data);
      return data as VehicleConditionReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-condition-reports'] });
      toast.success('Vehicle condition report updated successfully');
    },
    onError: (error) => {
      console.error('Error updating condition report:', error);
      toast.error('Failed to update condition report');
    },
  });
};

export const useCreateConditionReportForPermit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ permitId, inspectionType = 'pre_dispatch' }: { 
      permitId: string; 
      inspectionType?: 'pre_dispatch' | 'post_dispatch' 
    }) => {
      console.log('Creating condition report for permit:', permitId, inspectionType);
      
      // Use the database function to create the report
      const { data, error } = await supabase
        .rpc('create_condition_report_for_permit', {
          permit_id_param: permitId,
          inspection_type_param: inspectionType
        });

      if (error) {
        console.error('Error creating condition report for permit:', error);
        throw error;
      }

      // Fetch the created report
      const { data: reportData, error: fetchError } = await supabase
        .from('vehicle_condition_reports')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) {
        console.error('Error fetching created report:', fetchError);
        throw fetchError;
      }

      console.log('Created report:', reportData);
      return reportData as VehicleConditionReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-condition-reports'] });
      toast.success('Vehicle condition report created successfully');
    },
    onError: (error) => {
      console.error('Error creating condition report for permit:', error);
      toast.error('Failed to create condition report');
    },
  });
};