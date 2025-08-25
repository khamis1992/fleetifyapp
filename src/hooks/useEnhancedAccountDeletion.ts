import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EnhancedDeletionOptions {
  includeSystemAccounts: boolean;
  includeInactiveAccounts: boolean;
  forceCompleteReset: boolean;
  deletionReason?: string;
}

export interface EnhancedDeletionResult {
  success: boolean;
  message: string;
  deleted_count: number;
  system_deleted_count: number;
  inactive_deleted_count: number;
  deactivated_count: number;
  failed_count: number;
  total_processed: number;
  success_details: Array<{
    account_code: string;
    account_name: string;
    action: string;
    reason: string;
    is_system: boolean;
  }>;
  error_details: Array<{
    account_code: string;
    account_name: string;
    error: string;
    is_system: boolean;
  }>;
  operation_duration: string;
  settings_used: {
    include_system_accounts: boolean;
    include_inactive_accounts: boolean;
    force_complete_reset: boolean;
  };
}

export const useEnhancedAccountDeletion = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: EnhancedDeletionOptions): Promise<EnhancedDeletionResult> => {
      const { data, error } = await supabase.rpc('enhanced_complete_account_deletion', {
        target_company_id: undefined, // Will be determined by RLS
        include_system_accounts: options.includeSystemAccounts,
        include_inactive_accounts: options.includeInactiveAccounts,
        force_complete_reset: options.forceCompleteReset,
        deletion_reason: options.deletionReason || 'Enhanced bulk deletion'
      });

      if (error) {
        console.error('Error in enhanced account deletion:', error);
        throw new Error(error.message || 'فشل في حذف الحسابات');
      }

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || result?.message || 'فشل في العملية');
      }

      return result as EnhancedDeletionResult;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['deletion-preview'] });

      // Show detailed success message
      const totalDeleted = data.deleted_count + data.system_deleted_count + data.inactive_deleted_count;
      
      toast({
        title: "تم تنفيذ العملية بنجاح",
        description: `تم حذف ${totalDeleted} حساب (${data.system_deleted_count} نظامية، ${data.inactive_deleted_count} غير نشطة) وإلغاء تفعيل ${data.deactivated_count} حساب`,
        variant: "default",
      });

      // Show warnings if any accounts failed
      if (data.failed_count > 0) {
        toast({
          title: "تحذير",
          description: `فشل في معالجة ${data.failed_count} حساب. راجع التفاصيل في النتائج.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error('Enhanced deletion error:', error);
      toast({
        title: "خطأ في حذف الحسابات",
        description: error.message || "حدث خطأ أثناء حذف الحسابات",
        variant: "destructive",
      });
    },
  });
};

export const useAccountDeletionPreview = () => {
  return useMutation({
    mutationFn: async (options: Partial<EnhancedDeletionOptions>) => {
      const { data, error } = await supabase.rpc('get_enhanced_accounts_deletion_preview', {
        target_company_id: undefined, // Will be determined by RLS
        force_delete_system: options.includeSystemAccounts || false
      });

      if (error) {
        console.error('Error in deletion preview:', error);
        throw new Error(error.message || 'فشل في معاينة الحذف');
      }

      return data as any;
    },
  });
};

// Legacy exports for backward compatibility - these will be deprecated
export type DeletionAnalysis = any;
export type DeletionOptions = {
  force_delete?: boolean;
  transfer_to_account_id?: string;
  includeSystemAccounts?: boolean;
  includeInactiveAccounts?: boolean;
  forceCompleteReset?: boolean;
  deletionReason?: string;
};

export const useAccountDeletionLog = () => ({ 
  data: [], 
  isLoading: false,
  mutate: () => {},
  isPending: false,
  error: null
});

export const useAnalyzeAccountDependencies = () => ({ 
  mutate: () => {}, 
  isPending: false,
  data: null,
  error: null
});

export const useComprehensiveAccountDeletion = () => {
  const enhancedMutation = useEnhancedAccountDeletion();
  
  return {
    ...enhancedMutation,
    analyzeAccount: () => {},
    deleteAccount: enhancedMutation.mutate,
    isAnalyzing: false,
    isDeleting: enhancedMutation.isPending,
    analysisData: null,
    analysisError: null,
    deletionError: enhancedMutation.error
  };
};

export const formatDeletionConfirmation = () => '';
export const determineDeletionStrategy = () => 'delete';
export type AccountDeletionAnalysis = any;
export type DeletionMode = 'delete' | 'deactivate' | 'soft' | 'transfer' | 'force';