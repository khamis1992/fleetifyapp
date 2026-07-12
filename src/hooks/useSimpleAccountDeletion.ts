import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SimpleDeletionMode = 'soft';

export interface SimpleAccountAnalysis {
  success: boolean;
  account_info: {
    id: string;
    code: string;
    name: string;
    type: string;
    is_system: boolean;
  };
  has_journal_entries: boolean;
  has_child_accounts: boolean;
  has_fixed_assets: boolean;
  journal_entries_count: number;
  child_accounts_count: number;
  fixed_assets_count: number;
  can_delete_safely: boolean;
  error?: string;
}

export interface SimpleDeletionResult {
  success: boolean;
  message: string;
  error?: string;
}

export const useSimpleAccountAnalysis = () => {
  return useMutation({
    mutationFn: async (accountId: string): Promise<SimpleAccountAnalysis> => {
      const { data: account, error: accountError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type, is_system')
        .eq('id', accountId)
        .single();

      if (accountError || !account) {
        throw new Error('الحساب غير موجود');
      }

      const [journalResult, childrenResult, assetsResult] = await Promise.all([
        supabase
          .from('journal_entry_lines')
          .select('*', { count: 'exact', head: true })
          .eq('account_id', accountId),
        supabase
          .from('chart_of_accounts')
          .select('*', { count: 'exact', head: true })
          .eq('parent_account_id', accountId)
          .eq('is_active', true),
        supabase
          .from('fixed_assets')
          .select('*', { count: 'exact', head: true })
          .or(`asset_account_id.eq.${accountId},depreciation_account_id.eq.${accountId}`),
      ]);

      if (journalResult.error) throw journalResult.error;
      if (childrenResult.error) throw childrenResult.error;
      if (assetsResult.error) throw assetsResult.error;

      const journalCount = journalResult.count || 0;
      const childCount = childrenResult.count || 0;
      const assetsCount = assetsResult.count || 0;

      return {
        success: true,
        account_info: {
          id: account.id,
          code: account.account_code,
          name: account.account_name,
          type: account.account_type,
          is_system: account.is_system,
        },
        has_journal_entries: journalCount > 0,
        has_child_accounts: childCount > 0,
        has_fixed_assets: assetsCount > 0,
        journal_entries_count: journalCount,
        child_accounts_count: childCount,
        fixed_assets_count: assetsCount,
        can_delete_safely: false,
      };
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحليل الحساب: ${error.message}`);
    },
  });
};

export const useSimpleAccountDeletion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      deletionMode = 'soft',
    }: {
      accountId: string;
      deletionMode?: SimpleDeletionMode;
      transferToAccountId?: string;
    }): Promise<SimpleDeletionResult> => {
      if (deletionMode !== 'soft') {
        throw new Error('تم إيقاف النقل والحذف القسري لحماية القيود والتاريخ المالي.');
      }

      const { data: account, error: accountError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, is_system, is_active')
        .eq('id', accountId)
        .single();

      if (accountError || !account) {
        throw new Error('الحساب غير موجود');
      }
      if (account.is_system) {
        throw new Error('لا يمكن تعطيل حساب نظامي.');
      }
      if (!account.is_active) {
        return {
          success: true,
          message: `الحساب ${account.account_code} معطل بالفعل`,
        };
      }

      const { data: disabled, error } = await supabase.rpc('soft_delete_account', {
        account_id_param: accountId,
      });

      if (error) {
        throw new Error(`تعذر تعطيل الحساب: ${error.message}`);
      }
      if (!disabled) {
        throw new Error('لم يتم تعطيل الحساب. تحقق من الصلاحيات ثم أعد المحاولة.');
      }

      return {
        success: true,
        message: `تم تعطيل الحساب ${account.account_code} مع الحفاظ على جميع القيود والروابط المالية`,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تعطيل الحساب: ${error.message}`);
    },
  });
};
