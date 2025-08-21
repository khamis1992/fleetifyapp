import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';

export interface BulkDeletionResult {
  success: boolean;
  message: string;
  deleted_count: number;
  deactivated_count: number;
  failed_count: number;
  total_processed: number;
  operation_duration: string;
  error?: string;
}

/**
 * Hook لمعاينة الحذف الجماعي
 */
export const useDirectDeletionPreview = () => {
  const { companyId } = useUnifiedCompanyAccess();
  
  return useMutation({
    mutationFn: async () => {
      if (!companyId) {
        throw new Error('معرف الشركة غير متوفر');
      }
      
      console.log('🔍 [DELETION_PREVIEW] معاينة الحسابات للشركة:', {
        companyId,
        companyIdType: typeof companyId,
        companyIdLength: companyId?.length
      });
      
      // جلب جميع الحسابات النشطة (نفس منطق useChartOfAccounts)
      let query = supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, is_system, is_active, company_id')
        .eq('company_id', companyId);

      // تصفية الحسابات النشطة فقط
      query = query.eq('is_active', true);

      const { data: allAccounts, error: fetchError } = await query.order('account_code');
      
      if (fetchError) {
        console.error('❌ [DELETION_PREVIEW] خطأ في جلب الحسابات:', fetchError);
        throw fetchError;
      }
      
      console.log('📊 [DELETION_PREVIEW] الحسابات المتاحة:', {
        total: allAccounts?.length || 0,
        systemAccounts: allAccounts?.filter(acc => acc.is_system).length || 0,
        regularAccounts: allAccounts?.filter(acc => !acc.is_system).length || 0,
        sampleAccounts: allAccounts?.slice(0, 5)
      });
      
      return {
        total_accounts: allAccounts?.length || 0,
        system_accounts: allAccounts?.filter(acc => acc.is_system).length || 0,
        regular_accounts: allAccounts?.filter(acc => !acc.is_system).length || 0,
        accounts: allAccounts || []
      };
    }
  });
};

/**
 * Hook موحد لحذف جميع الحسابات باستخدام comprehensive_delete_account
 */
export const useDirectBulkAccountDeletion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();
  
  return useMutation({
    mutationFn: async ({
      confirmationText,
      forceDeleteSystem = false,
      deletionMode = 'soft'
    }: {
      confirmationText: string;
      forceDeleteSystem?: boolean;
      deletionMode?: 'soft' | 'auto' | 'force';
    }): Promise<BulkDeletionResult> => {
      if (!companyId) {
        throw new Error('معرف الشركة غير متوفر');
      }
      
      // التحقق من نص التأكيد
      if (confirmationText !== 'DELETE ALL ACCOUNTS PERMANENTLY') {
        throw new Error('نص التأكيد غير صحيح');
      }
      
      console.log('🗑️ [BULK_DELETE] بدء حذف جميع الحسابات:', {
        companyId,
        userProfileCompanyId: user?.profile?.company_id,
        forceDeleteSystem,
        userId: user?.id,
        deletionMode,
        userRoles: user?.roles
      });
      
      const startTime = Date.now();
      
      // جلب جميع الحسابات مع تشخيص مفصل (نفس منطق useChartOfAccounts)
      console.log('📋 [BULK_DELETE] جلب الحسابات من الشركة:', companyId);
      
      let query = supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, is_system, is_active, company_id')
        .eq('company_id', companyId);

      // تصفية الحسابات النشطة فقط
      query = query.eq('is_active', true);

      const { data: accounts, error: fetchError } = await query.order('account_code');
      
      console.log('📋 [BULK_DELETE] نتيجة جلب الحسابات:', {
        accountsCount: accounts?.length || 0,
        accounts: accounts?.slice(0, 3), // أول 3 حسابات للمراجعة
        fetchError
      });
      
      if (fetchError) {
        throw new Error(`خطأ في جلب الحسابات: ${fetchError.message}`);
      }
      
      if (!accounts || accounts.length === 0) {
        return {
          success: true,
          message: 'لا توجد حسابات نشطة للحذف',
          deleted_count: 0,
          deactivated_count: 0,
          failed_count: 0,
          total_processed: 0,
          operation_duration: '0ms'
        };
      }
      
      // فلترة الحسابات حسب خيار forceDeleteSystem
      const accountsToProcess = forceDeleteSystem 
        ? accounts 
        : accounts.filter(account => !account.is_system);
      
      console.log('🚀 [BULK_DELETE] استخدام الدالة المصححة للحذف الجماعي');
      
      // استخدام الدالة المصححة للحذف الجماعي
      const { data: bulkResult, error: bulkError } = await supabase.rpc('direct_delete_all_accounts', {
        target_company_id: companyId,
        include_system_accounts: forceDeleteSystem
      });
      
      if (bulkError) {
        console.error('❌ [BULK_DELETE] خطأ في الدالة المصححة:', bulkError);
        throw new Error(`خطأ في حذف جميع الحسابات: ${bulkError.message}`);
      }
      
      console.log('📊 [BULK_DELETE] نتيجة الدالة المصححة:', bulkResult);
      
      const bulkData = bulkResult as any;
      
      if (!bulkData.success) {
        throw new Error(bulkData.error || 'فشل في حذف الحسابات');
      }
      
      const deleted_count = bulkData.deleted_count || 0;
      const deactivated_count = bulkData.deactivated_count || 0;
      const failed_count = bulkData.failed_count || 0;
      
      const endTime = Date.now();
      const duration = `${endTime - startTime}ms`;
      
      const result: BulkDeletionResult = {
        success: true,
        message: bulkData.message || `تم معالجة ${bulkData.total_processed || 0} حساب بنجاح`,
        deleted_count,
        deactivated_count,
        failed_count,
        total_processed: bulkData.total_processed || 0,
        operation_duration: duration
      };
      
      console.log('✅ [BULK_DELETE] اكتمل الحذف الجماعي:', result);
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


