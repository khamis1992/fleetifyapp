import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BulkDeletionPreview {
  success: boolean;
  total_accounts: number;
  system_accounts: number;
  regular_accounts: number;
  will_be_deleted: number;
  will_be_deactivated: number;
  sample_accounts: Array<{
    account_code: string;
    account_name: string;
    action: string;
  }>;
  system_accounts_sample: Array<{
    account_code: string;
    account_name: string;
    action: string;
  }>;
  warning_message: string;
  error?: string;
}

export interface BulkDeletionResult {
  success: boolean;
  message: string;
  deleted_count: number;
  deactivated_count: number;
  failed_count: number;
  total_processed: number;
  success_details: Array<{
    account_code: string;
    account_name: string;
    action: string;
    reason: string;
  }>;
  error_details: Array<{
    account_code: string;
    account_name: string;
    error: string;
  }>;
  operation_duration: string;
  error?: string;
}

/**
 * Hook لمعاينة حذف جميع الحسابات
 */
export const useGetBulkDeletionPreview = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      forceDeleteSystem = false 
    }: { 
      forceDeleteSystem?: boolean 
    } = {}): Promise<BulkDeletionPreview> => {
      const companyId = user?.profile?.company_id;
      if (!companyId) {
        throw new Error('معرف الشركة غير متوفر');
      }
      
      console.log('📊 [BULK_PREVIEW] جلب معاينة حذف جميع الحسابات:', {
        companyId,
        forceDeleteSystem
      });
      
      const { data, error } = await supabase.rpc('get_all_accounts_deletion_preview', {
        target_company_id: companyId,
        force_delete_system: forceDeleteSystem
      });
      
      if (error) {
        console.error('❌ [BULK_PREVIEW] خطأ في المعاينة:', error);
        throw new Error(error.message);
      }
      
      const result = data as unknown as BulkDeletionPreview;
      if (!result.success) {
        console.error('❌ [BULK_PREVIEW] فشل المعاينة:', result.error);
        throw new Error(result.error);
      }
      
      console.log('✅ [BULK_PREVIEW] نجحت المعاينة:', result);
      return result;
    },
    onError: (error) => {
      console.error('❌ [BULK_PREVIEW] فشل hook المعاينة:', error);
      toast.error('خطأ في معاينة الحذف: ' + error.message);
    }
  });
};

/**
 * Hook لحذف جميع الحسابات
 */
export const useBulkAccountDeletion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      confirmationText,
      forceDeleteSystem = false
    }: {
      confirmationText: string;
      forceDeleteSystem?: boolean;
    }): Promise<BulkDeletionResult> => {
      const companyId = user?.profile?.company_id;
      if (!companyId) {
        throw new Error('معرف الشركة غير متوفر');
      }
      
      // التحقق من نص التأكيد
      if (confirmationText !== 'DELETE ALL ACCOUNTS PERMANENTLY') {
        throw new Error('نص التأكيد غير صحيح');
      }
      
      console.log('🗑️ [BULK_DELETE] بدء حذف جميع الحسابات:', {
        companyId,
        forceDeleteSystem,
        userId: user?.id
      });
      
      const { data, error } = await supabase.rpc('bulk_delete_company_accounts', {
        target_company_id: companyId,
        include_system_accounts: forceDeleteSystem,
        deletion_reason: `Bulk deletion by user ${user?.id} at ${new Date().toISOString()}`
      });
      
      if (error) {
        console.error('❌ [BULK_DELETE] خطأ في RPC:', error);
        throw new Error(error.message);
      }
      
      const result = data as unknown as BulkDeletionResult;
      if (!result.success) {
        console.error('❌ [BULK_DELETE] فشل العملية:', result.error);
        throw new Error(result.error);
      }
      
      console.log('✅ [BULK_DELETE] نجح الحذف الجماعي:', result);
      return result;
    },
    onSuccess: (result) => {
      // تحديث جميع الاستعلامات المرتبطة
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      toast.success(result.message);
      
      // عرض تفاصيل إضافية
      if (result.deleted_count > 0) {
        toast.info(`تم حذف ${result.deleted_count} حساب نهائياً`);
      }
      if (result.deactivated_count > 0) {
        toast.info(`تم إلغاء تفعيل ${result.deactivated_count} حساب`);
      }
      if (result.failed_count > 0) {
        toast.warning(`فشل في معالجة ${result.failed_count} حساب`);
      }
    },
    onError: (error) => {
      console.error('❌ [BULK_DELETE] فشل hook الحذف:', error);
      toast.error('خطأ في حذف جميع الحسابات: ' + error.message);
    }
  });
};
