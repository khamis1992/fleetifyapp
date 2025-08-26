
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

interface AccountMovementSettings {
  id: string;
  company_id: string;
  auto_create_movements: boolean;
  default_movement_type: string;
  require_approval: boolean;
  approval_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useAccountMovementSettings = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['account-movement-settings', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('No company ID');

      const { data, error } = await supabase
        .from('account_movement_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      // Return default settings if none exist
      return data || {
        auto_create_movements: true,
        default_movement_type: 'journal_entry',
        require_approval: false,
        approval_threshold: 1000,
        is_active: true,
      };
    },
    enabled: !!companyId,
  });
};

export const useUpdateAccountMovementSettings = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Partial<AccountMovementSettings>) => {
      if (!companyId) throw new Error('No company ID');

      const { data, error } = await supabase
        .from('account_movement_settings')
        .upsert({
          company_id: companyId,
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-movement-settings'] });
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات حركة الحسابات بنجاح',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ في الحفظ',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
