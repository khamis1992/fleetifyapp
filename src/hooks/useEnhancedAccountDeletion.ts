import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DeletionAnalysis {
  success: boolean;
  can_delete: boolean;
  linked_tables: string[];
  table_counts: Record<string, number>;
  account_info: {
    code: string;
    name: string;
    is_system: boolean;
  };
  child_accounts_count: number;
  message?: string;
  error?: string;
}

export interface DeletionOptions {
  force_delete?: boolean;
  transfer_to_account_id?: string;
}

export interface DeletionResult {
  success: boolean;
  action: 'transferred' | 'deleted' | 'deactivated';
  deleted_account?: {
    code: string;
    name: string;
  };
  child_accounts_deleted?: number;
  child_accounts_deactivated?: number;
  transfer_to_account_id?: string;
  error?: string;
}

export const useEnhancedAccountDeletion = () => {
  const queryClient = useQueryClient();

  // Analyze account for deletion (preview)
  const analyzeAccount = useMutation({
    mutationFn: async (accountId: string): Promise<DeletionAnalysis> => {
      console.log('[ENHANCED_DELETION] Analyzing account for deletion:', accountId);
      
      const { data, error } = await supabase.rpc('enhanced_cascade_delete_account', {
        account_id_param: accountId,
        force_delete: false,
        transfer_to_account_id: null
      });

      if (error) {
        console.error('[ENHANCED_DELETION] Analysis error:', error);
        throw error;
      }

      console.log('[ENHANCED_DELETION] Analysis result:', data);
      return data as unknown as DeletionAnalysis;
    },
    onError: (error) => {
      console.error('[ENHANCED_DELETION] Analysis failed:', error);
      toast.error('فشل في تحليل الحساب: ' + error.message);
    }
  });

  // Perform actual deletion
  const deleteAccount = useMutation({
    mutationFn: async ({ 
      accountId, 
      options 
    }: { 
      accountId: string; 
      options: DeletionOptions 
    }): Promise<DeletionResult> => {
      console.log('[ENHANCED_DELETION] Deleting account:', {
        accountId,
        options
      });

      const { data, error } = await supabase.rpc('enhanced_cascade_delete_account', {
        account_id_param: accountId,
        force_delete: options.force_delete || false,
        transfer_to_account_id: options.transfer_to_account_id || null
      });

      if (error) {
        console.error('[ENHANCED_DELETION] Deletion error:', error);
        throw error;
      }

      console.log('[ENHANCED_DELETION] Deletion result:', data);
      return data as unknown as DeletionResult;
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });

      // Check if the operation actually succeeded
      if (result.success) {
        // Show appropriate success message
        const actionMessages = {
          transferred: 'تم نقل بيانات الحساب وحذفه بنجاح',
          deleted: 'تم حذف الحساب وجميع البيانات المرتبطة به',
          deactivated: 'تم إلغاء تفعيل الحساب بنجاح'
        };

        toast.success(actionMessages[result.action] || 'تم تنفيذ العملية بنجاح');
        console.log('[ENHANCED_DELETION] Operation completed successfully:', result);
      } else {
        // Handle the case where the operation returned but failed
        console.error('[ENHANCED_DELETION] Operation failed with result:', result);
        toast.error(result.error || 'فشل في تنفيذ العملية');
        throw new Error(result.error || 'Operation failed');
      }
    },
    onError: (error) => {
      console.error('[ENHANCED_DELETION] Deletion failed:', error);
      toast.error('فشل في حذف الحساب: ' + error.message);
    }
  });

  return {
    analyzeAccount,
    deleteAccount,
    isAnalyzing: analyzeAccount.isPending,
    isDeleting: deleteAccount.isPending,
    analysisData: analyzeAccount.data,
    analysisError: analyzeAccount.error,
    deletionError: deleteAccount.error
  };
};