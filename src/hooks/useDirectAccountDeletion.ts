import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
 * Hook موحد لحذف جميع الحسابات باستخدام comprehensive_delete_account
 */
export const useDirectBulkAccountDeletion = () => {
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
      
      const startTime = Date.now();
      
      // جلب جميع الحسابات
      const { data: accounts, error: fetchError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, is_system')
        .eq('company_id', companyId)
        .eq('is_active', true);
      
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
      
      let deleted_count = 0;
      let deactivated_count = 0;
      let failed_count = 0;
      
      // حذف كل حساب باستخدام comprehensive_delete_account
      for (const account of accountsToProcess) {
        try {
          const { data, error } = await supabase.rpc('comprehensive_delete_account', {
            account_id_param: account.id,
            deletion_mode: 'auto'
          });
          
          if (error) {
            console.error(`❌ فشل حذف الحساب ${account.account_code}:`, error);
            failed_count++;
          } else if (data && typeof data === 'object' && 'action' in data) {
            const result = data as any;
            if (result.action === 'deleted') {
              deleted_count++;
            } else if (result.action === 'deactivated') {
              deactivated_count++;
            }
            console.log(`✅ تم معالجة الحساب ${account.account_code}: ${result.action}`);
          }
        } catch (err) {
          console.error(`❌ خطأ في معالجة الحساب ${account.account_code}:`, err);
          failed_count++;
        }
      }
      
      const endTime = Date.now();
      const duration = `${endTime - startTime}ms`;
      
      const result: BulkDeletionResult = {
        success: true,
        message: `تم معالجة ${accountsToProcess.length} حساب بنجاح`,
        deleted_count,
        deactivated_count,
        failed_count,
        total_processed: accountsToProcess.length,
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

/**
 * Hook لمعاينة حذف جميع الحسابات
 */
export const useDirectDeletionPreview = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      forceDeleteSystem = false 
    }: { 
      forceDeleteSystem?: boolean 
    } = {}) => {
      const companyId = user?.profile?.company_id;
      if (!companyId) {
        throw new Error('معرف الشركة غير متوفر');
      }
      
      console.log('📊 [BULK_PREVIEW] جلب معاينة حذف جميع الحسابات:', {
        companyId,
        forceDeleteSystem
      });
      
      // جلب جميع الحسابات النشطة
      const { data: accounts, error } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, is_system')
        .eq('company_id', companyId)
        .eq('is_active', true);
      
      if (error) {
        throw new Error(`خطأ في جلب الحسابات: ${error.message}`);
      }
      
      if (!accounts) {
        return {
          success: true,
          total_accounts: 0,
          system_accounts: 0,
          regular_accounts: 0,
          will_be_deleted: 0,
          will_be_deactivated: 0,
          sample_accounts: [],
          system_accounts_sample: [],
          warning_message: 'لا توجد حسابات نشطة'
        };
      }
      
      const systemAccounts = accounts.filter(acc => acc.is_system);
      const regularAccounts = accounts.filter(acc => !acc.is_system);
      
      const accountsToProcess = forceDeleteSystem ? accounts : regularAccounts;
      
      return {
        success: true,
        total_accounts: accounts.length,
        system_accounts: systemAccounts.length,
        regular_accounts: regularAccounts.length,
        will_be_deleted: accountsToProcess.length,
        will_be_deactivated: 0, // سيتم تحديد هذا أثناء العملية الفعلية
        sample_accounts: accountsToProcess.slice(0, 5).map(acc => ({
          account_code: acc.account_code,
          account_name: acc.account_name,
          action: 'سيتم المعالجة'
        })),
        system_accounts_sample: systemAccounts.slice(0, 5).map(acc => ({
          account_code: acc.account_code,
          account_name: acc.account_name,
          action: forceDeleteSystem ? 'سيتم المعالجة' : 'سيتم التجاهل'
        })),
        warning_message: forceDeleteSystem 
          ? 'تحذير: سيتم حذف جميع الحسابات بما في ذلك حسابات النظام!'
          : 'سيتم حذف الحسابات العادية فقط. حسابات النظام محمية.'
      };
    },
    onError: (error) => {
      console.error('❌ [BULK_PREVIEW] فشل hook المعاينة:', error);
      toast.error('خطأ في معاينة الحذف: ' + error.message);
    }
  });
};
