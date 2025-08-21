import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type SimpleDeletionMode = 'soft' | 'transfer' | 'force';

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
  journal_entries_count: number;
  child_accounts_count: number;
  can_delete_safely: boolean;
  error?: string;
}

export interface SimpleDeletionResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Hook مبسط لتحليل الحساب
 */
export const useSimpleAccountAnalysis = () => {
  return useMutation({
    mutationFn: async (accountId: string): Promise<SimpleAccountAnalysis> => {
      console.log('🔍 [SIMPLE_ANALYSIS] تحليل الحساب:', accountId);
      
      // جلب معلومات الحساب
      const { data: account, error: accountError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type, is_system')
        .eq('id', accountId)
        .single();
      
      if (accountError || !account) {
        throw new Error('الحساب غير موجود');
      }
      
      // فحص القيود المحاسبية
      const { count: journalCount, error: journalError } = await supabase
        .from('journal_entry_lines')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId);
      
      if (journalError) {
        console.warn('تحذير في فحص القيود:', journalError);
      }
      
      // فحص الحسابات الفرعية
      const { count: childCount, error: childError } = await supabase
        .from('chart_of_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('parent_account_id', accountId)
        .eq('is_active', true);
      
      if (childError) {
        console.warn('تحذير في فحص الحسابات الفرعية:', childError);
      }
      
      const hasJournalEntries = (journalCount || 0) > 0;
      const hasChildAccounts = (childCount || 0) > 0;
      
      return {
        success: true,
        account_info: {
          id: account.id,
          code: account.account_code,
          name: account.account_name,
          type: account.account_type,
          is_system: account.is_system
        },
        has_journal_entries: hasJournalEntries,
        has_child_accounts: hasChildAccounts,
        journal_entries_count: journalCount || 0,
        child_accounts_count: childCount || 0,
        can_delete_safely: !hasJournalEntries && !hasChildAccounts && !account.is_system
      };
    },
    onError: (error) => {
      console.error('❌ [SIMPLE_ANALYSIS] فشل التحليل:', error);
      toast.error('خطأ في تحليل الحساب: ' + error.message);
    }
  });
};

/**
 * Hook مبسط لحذف الحساب
 */
export const useSimpleAccountDeletion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      accountId,
      deletionMode = 'soft',
      transferToAccountId
    }: {
      accountId: string;
      deletionMode?: SimpleDeletionMode;
      transferToAccountId?: string;
    }): Promise<SimpleDeletionResult> => {
      console.log('🗑️ [SIMPLE_DELETE] بدء الحذف:', { accountId, deletionMode, transferToAccountId });
      
      // التحقق من صحة المعاملات
      if (deletionMode === 'transfer' && !transferToAccountId) {
        throw new Error('الحساب البديل مطلوب للنقل');
      }
      
      // جلب معلومات الحساب
      const { data: account, error: accountError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, is_system')
        .eq('id', accountId)
        .single();
      
      if (accountError || !account) {
        throw new Error('الحساب غير موجود');
      }
      
      let message = '';
      
      try {
        switch (deletionMode) {
          case 'soft':
            // إلغاء تفعيل فقط
            const { error: softError } = await supabase
              .from('chart_of_accounts')
              .update({ is_active: false })
              .eq('id', accountId);
            
            if (softError) throw softError;
            message = `تم إلغاء تفعيل الحساب ${account.account_code} بنجاح`;
            break;
            
          case 'transfer':
            // نقل البيانات ثم حذف
            if (!transferToAccountId) {
              throw new Error('الحساب البديل مطلوب');
            }
            
            // نقل القيود المحاسبية
            const { error: transferError } = await supabase
              .from('journal_entry_lines')
              .update({ account_id: transferToAccountId })
              .eq('account_id', accountId);
            
            if (transferError) {
              console.warn('تحذير في نقل القيود:', transferError);
            }
            
            // إلغاء تفعيل الحسابات الفرعية
            await supabase
              .from('chart_of_accounts')
              .update({ is_active: false })
              .eq('parent_account_id', accountId);
            
            // حذف الحساب
            const { error: deleteError } = await supabase
              .from('chart_of_accounts')
              .delete()
              .eq('id', accountId);
            
            if (deleteError) throw deleteError;
            message = `تم نقل البيانات وحذف الحساب ${account.account_code} بنجاح`;
            break;
            
          case 'force':
            // حذف قسري
            
            // حذف القيود المحاسبية
            await supabase
              .from('journal_entry_lines')
              .delete()
              .eq('account_id', accountId);
            
            // إلغاء تفعيل الحسابات الفرعية
            await supabase
              .from('chart_of_accounts')
              .update({ is_active: false })
              .eq('parent_account_id', accountId);
            
            // تنظيف المراجع الأخرى
            try {
              // تنظيف العقود
              await supabase
                .from('contracts')
                .update({ account_id: null })
                .eq('account_id', accountId);
            } catch (e) {
              // تجاهل إذا كان العمود غير موجود
            }
            
            try {
              // تنظيف المدفوعات
              await supabase
                .from('payments')
                .update({ account_id: null })
                .eq('account_id', accountId);
            } catch (e) {
              // تجاهل إذا كان العمود غير موجود
            }
            
            // حذف الحساب
            const { error: forceDeleteError } = await supabase
              .from('chart_of_accounts')
              .delete()
              .eq('id', accountId);
            
            if (forceDeleteError) throw forceDeleteError;
            message = `تم حذف الحساب ${account.account_code} وجميع البيانات المرتبطة قسرياً`;
            break;
        }
        
        return {
          success: true,
          message
        };
        
      } catch (error: any) {
        console.error('❌ [SIMPLE_DELETE] خطأ في الحذف:', error);
        throw new Error(error.message || 'فشل في حذف الحساب');
      }
    },
    onSuccess: (result) => {
      // تحديث الاستعلامات
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      
      toast.success(result.message);
    },
    onError: (error) => {
      console.error('❌ [SIMPLE_DELETE] فشل hook الحذف:', error);
      toast.error('خطأ في حذف الحساب: ' + error.message);
    }
  });
};
