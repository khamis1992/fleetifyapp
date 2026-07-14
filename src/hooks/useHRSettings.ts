import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface HRSettings {
  id?: string;
  company_id: string;
  // Attendance settings
  daily_working_hours: number;
  working_days_per_week: number;
  work_start_time: string;
  work_end_time: string;
  auto_calculate_overtime: boolean;
  allow_negative_balance: boolean;
  late_threshold_minutes: number;
  // Payroll settings
  overtime_rate_percentage: number;
  late_penalty_per_hour: number;
  social_security_rate: number;
  tax_rate: number;
  payroll_frequency: string;
  pay_date: number;
  // System settings
  require_manager_approval: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
}

export const useHRSettings = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  // Fetch HR settings
  const {
    data: settings,
    isLoading,
    error
  } = useQuery({
    queryKey: ['hr-settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('hr_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    },
    enabled: !!companyId,
  });

  // Update HR settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<HRSettings>) => {
      if (!companyId) throw new Error('Company not found');
      const { company_id: _companyId, ...safeUpdates } = updates;

      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from('hr_settings')
        .select('id')
        .eq('company_id', companyId)
        .single();

      if (existingSettings) {
        // Update existing settings
        const { data, error } = await supabase
          .from('hr_settings')
          .update(safeUpdates)
          .eq('company_id', companyId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('hr_settings')
          .insert({
            company_id: companyId,
            ...safeUpdates
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-settings', companyId] });
      toast.success('تم حفظ إعدادات الموارد البشرية بنجاح');
    },
    onError: (error) => {
      console.error('Error updating HR settings:', error);
      toast.error('فشل في حفظ الإعدادات');
    }
  });

  // Fetch leave types
  const {
    data: leaveTypes,
    isLoading: leaveTypesLoading
  } = useQuery({
    queryKey: ['leave-types', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('company_id', companyId)
        .order('type_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Create leave type
  const createLeaveTypeMutation = useMutation({
    mutationFn: async (leaveType: {
      type_name: string;
      type_name_ar?: string;
      max_days_per_year: number;
      requires_approval?: boolean;
      description?: string;
    }) => {
      if (!companyId) throw new Error('Company not found');

      const { data, error } = await supabase
        .from('leave_types')
        .insert({
          ...leaveType,
          company_id: companyId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types', companyId] });
      toast.success('تم إنشاء نوع الإجازة بنجاح');
    },
    onError: (error) => {
      console.error('Error creating leave type:', error);
      toast.error('فشل في إنشاء نوع الإجازة');
    }
  });

  // Update leave type
  const updateLeaveTypeMutation = useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: {
        type_name?: string;
        type_name_ar?: string;
        max_days_per_year?: number;
        requires_approval?: boolean;
        description?: string;
        is_active?: boolean;
      }
    }) => {
      if (!companyId) throw new Error('Company not found');
      const { data, error } = await supabase
        .from('leave_types')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types', companyId] });
      toast.success('تم تحديث نوع الإجازة بنجاح');
    },
    onError: (error) => {
      console.error('Error updating leave type:', error);
      toast.error('فشل في تحديث نوع الإجازة');
    }
  });

  // Delete leave type
  const deleteLeaveTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) throw new Error('Company not found');
      const { error } = await supabase
        .from('leave_types')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)
        .select('id')
        .single();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types', companyId] });
      toast.success('تم حذف نوع الإجازة بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting leave type:', error);
      toast.error('فشل في حذف نوع الإجازة');
    }
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
    
    // Leave types management
    leaveTypes,
    leaveTypesLoading,
    createLeaveType: createLeaveTypeMutation.mutate,
    updateLeaveType: updateLeaveTypeMutation.mutate,
    deleteLeaveType: deleteLeaveTypeMutation.mutate,
    isCreatingLeaveType: createLeaveTypeMutation.isPending,
    isUpdatingLeaveType: updateLeaveTypeMutation.isPending,
    isDeletingLeaveType: deleteLeaveTypeMutation.isPending
  };
};
