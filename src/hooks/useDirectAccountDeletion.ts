import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hook مبسط جداً لحذف جميع الحسابات بدون تعقيدات
 */
export const useDirectBulkAccountDeletion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      forceDeleteSystem = false
    }: {
      forceDeleteSystem?: boolean;
    } = {}) => {
      const companyId = user?.profile?.company_id;
      if (!companyId) {
        throw new Error('معرف الشركة غير متوفر');
      }
      
      console.log('🗑️ [DIRECT_DELETE] بدء الحذف المباشر للحسابات:', {
        companyId,
        forceDeleteSystem
      });
      
      let deletedCount = 0;
      let deactivatedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      // جلب جميع الحسابات
      const { data: accounts, error: fetchError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, is_system')
        .eq('company_id', companyId)
        .order('is_system', { ascending: true }); // الحسابات العادية أولاً
      
      if (fetchError) {
        throw new Error('فشل في جلب الحسابات: ' + fetchError.message);
      }
      
      if (!accounts || accounts.length === 0) {
        return {
          success: true,
          message: 'لا توجد حسابات للحذف',
          deleted_count: 0,
          deactivated_count: 0,
          error_count: 0
        };
      }
      
      console.log(`🔍 [DIRECT_DELETE] وجد ${accounts.length} حساب للمعالجة`);
      
      // معالجة كل حساب على حدة
      for (const account of accounts) {
        try {
          // فحص وجود معاملات
          const { count: transactionCount } = await supabase
            .from('journal_entry_lines')
            .select('*', { count: 'exact', head: true })
            .eq('account_id', account.id);
          
          const hasTransactions = (transactionCount || 0) > 0;
          
          if (account.is_system && !forceDeleteSystem) {
            // إلغاء تفعيل الحسابات النظامية
            const { error } = await supabase
              .from('chart_of_accounts')
              .update({ is_active: false })
              .eq('id', account.id);
            
            if (error) {
              errors.push(`${account.account_code}: ${error.message}`);
              errorCount++;
            } else {
              deactivatedCount++;
            }
            
          } else if (hasTransactions) {
            // إلغاء تفعيل الحسابات التي لها معاملات
            const { error } = await supabase
              .from('chart_of_accounts')
              .update({ is_active: false })
              .eq('id', account.id);
            
            if (error) {
              errors.push(`${account.account_code}: ${error.message}`);
              errorCount++;
            } else {
              deactivatedCount++;
            }
            
          } else {
            // حذف الحسابات التي لا تحتوي على معاملات
            
            // أولاً: تنظيف أي مراجع محتملة
            try {
              // تنظيف العقود
              await supabase
                .from('contracts')
                .update({ account_id: null })
                .eq('account_id', account.id);
            } catch (e) {
              // تجاهل الخطأ إذا كان العمود غير موجود
            }
            
            try {
              // تنظيف المدفوعات
              await supabase
                .from('payments')
                .update({ account_id: null })
                .eq('account_id', account.id);
            } catch (e) {
              // تجاهل الخطأ إذا كان العمود غير موجود
            }
            
            // ثانياً: حذف الحساب
            const { error } = await supabase
              .from('chart_of_accounts')
              .delete()
              .eq('id', account.id);
            
            if (error) {
              errors.push(`${account.account_code}: ${error.message}`);
              errorCount++;
            } else {
              deletedCount++;
            }
          }
          
        } catch (error: any) {
          console.error(`❌ [DIRECT_DELETE] خطأ في معالجة الحساب ${account.account_code}:`, error);
          errors.push(`${account.account_code}: ${error.message}`);
          errorCount++;
        }
        
        // تحديث التقدم
        const progress = Math.round(((deletedCount + deactivatedCount + errorCount) / accounts.length) * 100);
        console.log(`📊 [DIRECT_DELETE] التقدم: ${progress}%`);
      }
      
      const totalProcessed = deletedCount + deactivatedCount + errorCount;
      const message = `تمت معالجة ${totalProcessed} حساب: ${deletedCount} تم حذفها، ${deactivatedCount} تم إلغاء تفعيلها، ${errorCount} فشل`;
      
      console.log('✅ [DIRECT_DELETE] اكتملت العملية:', {
        deletedCount,
        deactivatedCount,
        errorCount,
        totalProcessed
      });
      
      return {
        success: true,
        message,
        deleted_count: deletedCount,
        deactivated_count: deactivatedCount,
        error_count: errorCount,
        total_processed: totalProcessed,
        errors: errors.slice(0, 10) // أول 10 أخطاء فقط
      };
    },
    onSuccess: (result) => {
      // تحديث جميع الاستعلامات
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      
      toast.success(result.message);
      
      if (result.error_count > 0) {
        toast.warning(`فشل في معالجة ${result.error_count} حساب`);
      }
    },
    onError: (error) => {
      console.error('❌ [DIRECT_DELETE] فشل الحذف المباشر:', error);
      toast.error('خطأ في حذف الحسابات: ' + error.message);
    }
  });
};

/**
 * Hook مبسط لمعاينة الحذف
 */
export const useDirectDeletionPreview = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      forceDeleteSystem = false
    }: {
      forceDeleteSystem?: boolean;
    } = {}) => {
      const companyId = user?.profile?.company_id;
      if (!companyId) {
        throw new Error('معرف الشركة غير متوفر');
      }
      
      console.log('📊 [DIRECT_PREVIEW] معاينة مباشرة للحذف:', {
        companyId,
        forceDeleteSystem
      });
      
      // جلب إحصائيات الحسابات
      const { data: allAccounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, is_system')
        .eq('company_id', companyId);
      
      if (accountsError) {
        throw new Error('فشل في جلب الحسابات: ' + accountsError.message);
      }
      
      const totalAccounts = allAccounts?.length || 0;
      const systemAccounts = allAccounts?.filter(acc => acc.is_system).length || 0;
      const regularAccounts = totalAccounts - systemAccounts;
      
      // فحص الحسابات التي لها معاملات
      const { data: accountsWithTransactions } = await supabase
        .from('journal_entry_lines')
        .select('account_id')
        .in('account_id', allAccounts?.map(acc => acc.id) || []);
      
      const uniqueAccountsWithTransactions = new Set(accountsWithTransactions?.map(jel => jel.account_id) || []);
      const accountsWithTransactionsCount = uniqueAccountsWithTransactions.size;
      const accountsWithoutTransactions = totalAccounts - accountsWithTransactionsCount;
      
      // تحديد ما سيحدث
      let willBeDeleted = 0;
      let willBeDeactivated = 0;
      
      if (forceDeleteSystem) {
        willBeDeleted = accountsWithoutTransactions;
        willBeDeactivated = accountsWithTransactionsCount;
      } else {
        willBeDeleted = Math.max(0, accountsWithoutTransactions - systemAccounts);
        willBeDeactivated = accountsWithTransactionsCount + systemAccounts;
      }
      
      // عينة من الحسابات
      const sampleAccounts = allAccounts?.slice(0, 10).map(acc => ({
        account_code: acc.account_code,
        account_name: acc.account_name,
        action: uniqueAccountsWithTransactions.has(acc.id) ? 'will_be_deactivated' : 'will_be_deleted'
      })) || [];
      
      const systemAccountsSample = allAccounts?.filter(acc => acc.is_system).slice(0, 5).map(acc => ({
        account_code: acc.account_code,
        account_name: acc.account_name,
        action: forceDeleteSystem ? 'will_be_force_deleted' : 'will_be_deactivated'
      })) || [];
      
      return {
        success: true,
        total_accounts: totalAccounts,
        system_accounts: systemAccounts,
        regular_accounts: regularAccounts,
        will_be_deleted: willBeDeleted,
        will_be_deactivated: willBeDeactivated,
        sample_accounts: sampleAccounts,
        system_accounts_sample: systemAccountsSample,
        warning_message: systemAccounts > 0 && !forceDeleteSystem 
          ? 'الحسابات النظامية سيتم إلغاء تفعيلها فقط لحماية النظام'
          : 'جميع الحسابات ستتم معالجتها حسب حالتها'
      };
    },
    onError: (error) => {
      console.error('❌ [DIRECT_PREVIEW] فشل المعاينة المباشرة:', error);
      toast.error('خطأ في معاينة الحذف: ' + error.message);
    }
  });
};
