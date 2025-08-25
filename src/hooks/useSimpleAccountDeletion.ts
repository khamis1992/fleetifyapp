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
      
      // فحص الأصول الثابتة المرتبطة
      const { count: assetsCount, error: assetsError } = await supabase
        .from('fixed_assets')
        .select('*', { count: 'exact', head: true })
        .or(`asset_account_id.eq.${accountId},depreciation_account_id.eq.${accountId}`);
      
      if (assetsError) {
        console.warn('تحذير في فحص الأصول الثابتة:', assetsError);
      }
      
      const hasJournalEntries = (journalCount || 0) > 0;
      const hasChildAccounts = (childCount || 0) > 0;
      const hasFixedAssets = (assetsCount || 0) > 0;
      
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
        has_fixed_assets: hasFixedAssets,
        journal_entries_count: journalCount || 0,
        child_accounts_count: childCount || 0,
        fixed_assets_count: assetsCount || 0,
        can_delete_safely: !hasJournalEntries && !hasChildAccounts && !hasFixedAssets && !account.is_system
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
      
      // First, check for linked fixed assets
      const { data: linkedAssets, error: checkError } = await supabase
        .from('fixed_assets')
        .select('id, asset_account_id, depreciation_account_id')
        .or(`asset_account_id.eq.${accountId},depreciation_account_id.eq.${accountId}`);

      if (checkError) {
        console.error('Error checking linked assets:', checkError);
        throw new Error('فشل في فحص الأصول الثابتة المرتبطة');
      }

      const assetAccountLinks = linkedAssets?.filter(asset => asset.asset_account_id === accountId) || [];
      const depreciationAccountLinks = linkedAssets?.filter(asset => asset.depreciation_account_id === accountId) || [];
      const totalLinkedAssets = assetAccountLinks.length + depreciationAccountLinks.length;

      try {
        switch (deletionMode) {
          case 'soft':
            // إلغاء تفعيل فقط
            const { error: softError } = await supabase
              .from('chart_of_accounts')
              .update({ is_active: false })
              .eq('id', accountId);
            
            if (softError) throw softError;
            
            message = totalLinkedAssets > 0 
              ? `تم إلغاء تفعيل الحساب ${account.account_code} بنجاح. يوجد ${totalLinkedAssets} أصل ثابت مرتبط`
              : `تم إلغاء تفعيل الحساب ${account.account_code} بنجاح`;
            break;
            
          case 'transfer':
            // نقل البيانات ثم حذف
            if (!transferToAccountId) {
              throw new Error('الحساب البديل مطلوب');
            }
            
            // Verify target account exists and is active
            const { data: targetAccount, error: targetError } = await supabase
              .from('chart_of_accounts')
              .select('id, account_name, is_active')
              .eq('id', transferToAccountId)
              .eq('is_active', true)
              .single();

            if (targetError || !targetAccount) {
              throw new Error('الحساب المستهدف غير موجود أو غير نشط');
            }
            
            // نقل القيود المحاسبية
            const { error: transferError } = await supabase
              .from('journal_entry_lines')
              .update({ account_id: transferToAccountId })
              .eq('account_id', accountId);
            
            if (transferError) {
              console.warn('تحذير في نقل القيود:', transferError);
            }
            
            // نقل الأصول الثابتة - asset accounts
            if (assetAccountLinks.length > 0) {
              const { error: assetError } = await supabase
                .from('fixed_assets')
                .update({ asset_account_id: transferToAccountId })
                .eq('asset_account_id', accountId);
              
              if (assetError) {
                console.error('Error transferring asset accounts:', assetError);
                throw new Error(`فشل في نقل حسابات الأصول: ${assetError.message}`);
              }
            }
            
            // نقل الأصول الثابتة - depreciation accounts  
            if (depreciationAccountLinks.length > 0) {
              const { error: depreciationError } = await supabase
                .from('fixed_assets')
                .update({ depreciation_account_id: transferToAccountId })
                .eq('depreciation_account_id', accountId);
              
              if (depreciationError) {
                console.error('Error transferring depreciation accounts:', depreciationError);
                throw new Error(`فشل في نقل حسابات الإهلاك: ${depreciationError.message}`);
              }
            }
            
            // Verify all transfers completed successfully
            const { data: remainingAssets, error: verifyError } = await supabase
              .from('fixed_assets')
              .select('id')
              .or(`asset_account_id.eq.${accountId},depreciation_account_id.eq.${accountId}`);

            if (verifyError) {
              throw new Error('فشل في التحقق من نقل الأصول الثابتة');
            }

            if (remainingAssets && remainingAssets.length > 0) {
              throw new Error(`لا يزال هناك ${remainingAssets.length} أصل ثابت مرتبط بالحساب`);
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
            
            if (deleteError) {
              console.error('Error deleting account after transfer:', deleteError);
              throw new Error(`فشل في حذف الحساب بعد النقل: ${deleteError.message}`);
            }
            
            message = totalLinkedAssets > 0
              ? `تم نقل ${totalLinkedAssets} أصل ثابت إلى "${targetAccount.account_name}" وحذف الحساب ${account.account_code} بنجاح`
              : `تم نقل البيانات وحذف الحساب ${account.account_code} بنجاح`;
            break;
            
          case 'force':
            // حذف قسري
            
            // حذف القيود المحاسبية
            await supabase
              .from('journal_entry_lines')
              .delete()
              .eq('account_id', accountId);
            
            // تنظيف الأصول الثابتة - asset accounts
            if (assetAccountLinks.length > 0) {
              const { error: assetError } = await supabase
                .from('fixed_assets')
                .update({ asset_account_id: null })
                .eq('asset_account_id', accountId);
              
              if (assetError) {
                console.error('Error clearing asset accounts:', assetError);
                throw new Error(`فشل في مسح حسابات الأصول: ${assetError.message}`);
              }
            }
            
            // تنظيف الأصول الثابتة - depreciation accounts
            if (depreciationAccountLinks.length > 0) {
              const { error: depreciationError } = await supabase
                .from('fixed_assets')
                .update({ depreciation_account_id: null })
                .eq('depreciation_account_id', accountId);
              
              if (depreciationError) {
                console.error('Error clearing depreciation accounts:', depreciationError);
                throw new Error(`فشل في مسح حسابات الإهلاك: ${depreciationError.message}`);
              }
            }
            
            // Verify all references cleared successfully
            const { data: remainingAssetsForce, error: verifyForceError } = await supabase
              .from('fixed_assets')
              .select('id')
              .or(`asset_account_id.eq.${accountId},depreciation_account_id.eq.${accountId}`);

            if (verifyForceError) {
              throw new Error('فشل في التحقق من مسح مراجع الأصول الثابتة');
            }

            if (remainingAssetsForce && remainingAssetsForce.length > 0) {
              throw new Error(`لا يزال هناك ${remainingAssetsForce.length} أصل ثابت مرتبط بالحساب`);
            }
            
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
            
            if (forceDeleteError) {
              console.error('Error force deleting account:', forceDeleteError);
              throw new Error(`فشل في الحذف النهائي للحساب: ${forceDeleteError.message}`);
            }
            
            message = totalLinkedAssets > 0
              ? `تم مسح ${totalLinkedAssets} مرجع للأصول الثابتة وحذف الحساب ${account.account_code} قسرياً`
              : `تم حذف الحساب ${account.account_code} وجميع البيانات المرتبطة قسرياً`;
            break;
        }
        
        return {
          success: true,
          message
        };
        
      } catch (error: any) {
        console.error('❌ [SIMPLE_DELETE] خطأ في الحذف:', error);
        
        // Enhanced error messages for specific cases
        if (error.code === '23503' && error.message.includes('fixed_assets')) {
          throw new Error('لا يمكن حذف الحساب لأنه مرتبط بأصول ثابتة. يرجى استخدام نمط النقل أو الحذف القسري');
        }
        
        if (error.message && typeof error.message === 'string') {
          throw new Error(error.message);
        }
        
        throw new Error('حدث خطأ غير متوقع أثناء حذف الحساب');
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
