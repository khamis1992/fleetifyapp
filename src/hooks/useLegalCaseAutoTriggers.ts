import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AutoCreateTriggerConfig {
  id?: string;
  company_id: string;
  enable_overdue_invoice_trigger: boolean;
  overdue_days_threshold: number;
  enable_overdue_amount_trigger: boolean;
  overdue_amount_threshold: number;
  enable_broken_promises_trigger: boolean;
  broken_promises_count: number;
  auto_case_priority: 'low' | 'medium' | 'high' | 'urgent';
  auto_case_type: string;
  notify_on_auto_create: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useLegalCaseAutoTriggers = (companyId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get current config
  const { data: config, isLoading, error } = useQuery({
    queryKey: ['legal-case-auto-triggers', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_case_auto_triggers')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data as AutoCreateTriggerConfig | null;
    },
    enabled: !!companyId,
  });

  // Save/Update config
  const saveConfig = useMutation({
    mutationFn: async (newConfig: Omit<AutoCreateTriggerConfig, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!user) throw new Error('User not authenticated');

      // Check if config exists
      const { data: existing } = await supabase
        .from('legal_case_auto_triggers')
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle();

      if (existing) {
        // Update existing config
        const { data, error } = await supabase
          .from('legal_case_auto_triggers')
          .update({
            ...newConfig,
            updated_by: user.id,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as AutoCreateTriggerConfig;
      } else {
        // Insert new config
        const { data, error } = await supabase
          .from('legal_case_auto_triggers')
          .insert({
            ...newConfig,
            company_id: companyId,
            created_by: user.id,
            updated_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data as AutoCreateTriggerConfig;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-case-auto-triggers', companyId] });
      toast.success('تم حفظ إعدادات الإنشاء التلقائي بنجاح');
    },
    onError: (error: any) => {
      console.error('Error saving auto-create triggers:', error);
      toast.error('فشل حفظ الإعدادات. يرجى المحاولة مرة أخرى.');
    },
  });

  // Delete config
  const deleteConfig = useMutation({
    mutationFn: async () => {
      if (!config?.id) throw new Error('No config to delete');

      const { error } = await supabase
        .from('legal_case_auto_triggers')
        .delete()
        .eq('id', config.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-case-auto-triggers', companyId] });
      toast.success('تم حذف الإعدادات بنجاح');
    },
    onError: (error: any) => {
      console.error('Error deleting auto-create triggers:', error);
      toast.error('فشل حذف الإعدادات. يرجى المحاولة مرة أخرى.');
    },
  });

  return {
    config,
    isLoading,
    error,
    saveConfig,
    deleteConfig,
  };
};

export default useLegalCaseAutoTriggers;
