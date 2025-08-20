import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AccountDeletionAnalysis {
  success: boolean;
  account_info: {
    id: string;
    code: string;
    name: string;
    type: string;
    is_system: boolean;
    is_active: boolean;
  };
  dependencies: Array<{
    table_name: string;
    count: number;
    description: string;
    action: string;
  }>;
  total_dependencies: number;
  can_delete: boolean;
  error?: string;
  message?: string;
  linked_tables?: string[];
  table_counts?: Record<string, number>;
  child_accounts_count?: number;
}

// Aliases for compatibility
export type DeletionAnalysis = AccountDeletionAnalysis;

export interface DeletionOptions {
  deletionMode?: DeletionMode;
  transferToAccountId?: string;
  force_delete?: boolean;
  transfer_to_account_id?: string;
}

export interface AccountDeletionResult {
  success: boolean;
  deletion_log_id?: string;
  account_info?: {
    code: string;
    name: string;
  };
  operation?: {
    action: string;
    message: string;
    affected_records?: Record<string, number>;
  };
  error?: string;
}

export type DeletionMode = 'soft' | 'transfer' | 'force';

/**
 * Hook لتحليل التبعيات قبل حذف الحساب
 */
export const useAnalyzeAccountDependencies = () => {
  return useMutation({
    mutationFn: async (accountId: string): Promise<AccountDeletionAnalysis> => {
      console.log('🔍 [ACCOUNT_DELETION] تحليل تبعيات الحساب:', accountId);
      
      const { data, error } = await supabase.rpc('analyze_account_dependencies' as any, {
        account_id_param: accountId
      });
      
      if (error) {
        console.error('❌ [ACCOUNT_DELETION] خطأ في تحليل التبعيات:', error);
        throw new Error(error.message);
      }
      
      console.log('✅ [ACCOUNT_DELETION] نتائج التحليل:', data);
      return data as AccountDeletionAnalysis;
    },
    onError: (error) => {
      console.error('❌ [ACCOUNT_DELETION] فشل تحليل التبعيات:', error);
      toast.error('خطأ في تحليل الحساب: ' + error.message);
    }
  });
};

/**
 * Hook لحذف الحساب بشكل شامل
 */
export const useComprehensiveAccountDeletion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      accountId,
      deletionMode = 'soft',
      transferToAccountId,
      options,
    }: {
      accountId: string;
      deletionMode?: DeletionMode;
      transferToAccountId?: string;
      options?: DeletionOptions;
    }): Promise<AccountDeletionResult> => {
      console.log('🗑️ [ACCOUNT_DELETION] بدء عملية الحذف:', {
        accountId,
        deletionMode,
        transferToAccountId,
        userId: user?.id
      });
      
      const { data, error } = await supabase.rpc('comprehensive_delete_account' as any, {
        account_id_param: accountId,
        deletion_mode: deletionMode,
        transfer_to_account_id: transferToAccountId,
        user_id_param: user?.id
      });
      
      if (error) {
        console.error('❌ [ACCOUNT_DELETION] خطأ في الحذف:', error);
        throw new Error(error.message);
      }
      
      const result = data as AccountDeletionResult;
      if (!result.success) {
        console.error('❌ [ACCOUNT_DELETION] فشل العملية:', result.error);
        
        // Provide more specific error messages
        let errorMessage = result.error || 'فشل في حذف الحساب';
        
        if (data?.account_info?.is_system) {
          errorMessage = 'لا يمكن حذف الحسابات النظامية. هذه الحسابات مطلوبة لسير العمل الطبيعي للنظام.';
        } else if (data?.dependencies_count > 0) {
          const dependenciesCount = data.dependencies_count;
          const affectedTables = data.affected_tables || [];
          const tableNames = affectedTables.map((table: any) => {
            switch(table.table_name) {
              case 'journal_entry_lines': return 'قيود اليومية';
              case 'budget_items': return 'بنود الميزانية';
              case 'chart_of_accounts': return 'حسابات فرعية';
              case 'banks': return 'حسابات بنكية';
              default: return table.table_name;
            }
          }).join('، ');
          
          errorMessage = `لا يمكن حذف الحساب لوجود ${dependenciesCount} سجل مرتبط في: ${tableNames}. يرجى نقل البيانات أو استخدام خيار النقل أولاً.`;
        }
        
        throw new Error(errorMessage);
      }
      
      console.log('✅ [ACCOUNT_DELETION] نجح الحذف:', result);
      return result;
    },
    onSuccess: (result) => {
      // تحديث جميع الاستعلامات المرتبطة
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      
      // عرض رسالة النجاح
      const operation = result.operation;
      if (operation) {
        toast.success(operation.message);
        
        // عرض تفاصيل إضافية إذا كانت متوفرة
        if (operation.affected_records) {
          const affectedCount = Object.values(operation.affected_records).reduce((sum: number, count) => sum + (count as number), 0);
          if (affectedCount > 0) {
            toast.info(`تم التعامل مع ${affectedCount} سجل مرتبط`);
          }
        }
      } else {
        toast.success('تم حذف الحساب بنجاح');
      }
    },
    onError: (error) => {
      console.error('❌ [ACCOUNT_DELETION] فشل الحذف:', error);
      toast.error('خطأ في حذف الحساب: ' + error.message);
    }
  });
};

/**
 * Hook لفحص سلامة البيانات بعد عمليات الحذف
 */
export const useVerifyAccountIntegrity = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (): Promise<any> => {
      const companyId = user?.profile?.company_id;
      if (!companyId) {
        throw new Error('معرف الشركة غير متوفر');
      }
      
      console.log('🔍 [ACCOUNT_INTEGRITY] فحص سلامة البيانات للشركة:', companyId);
      
      const { data, error } = await supabase.rpc('verify_account_deletion_integrity' as any, {
        company_id_param: companyId
      });
      
      if (error) {
        console.error('❌ [ACCOUNT_INTEGRITY] خطأ في فحص السلامة:', error);
        throw new Error(error.message);
      }
      
      console.log('✅ [ACCOUNT_INTEGRITY] نتائج فحص السلامة:', data);
      return data;
    },
    onSuccess: (result) => {
      if (result.integrity_status === 'clean') {
        toast.success('جميع البيانات سليمة ولا توجد مشاكل');
      } else {
        toast.warning(`تم العثور على ${result.issues_found} مشكلة في البيانات`);
      }
    },
    onError: (error) => {
      console.error('❌ [ACCOUNT_INTEGRITY] فشل فحص السلامة:', error);
      toast.error('خطأ في فحص سلامة البيانات: ' + error.message);
    }
  });
};

/**
 * Hook لتنظيف البيانات المعلقة
 */
export const useCleanupOrphanedReferences = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (): Promise<any> => {
      const companyId = user?.profile?.company_id;
      if (!companyId) {
        throw new Error('معرف الشركة غير متوفر');
      }
      
      console.log('🧹 [ACCOUNT_CLEANUP] بدء تنظيف البيانات المعلقة للشركة:', companyId);
      
      const { data, error } = await supabase.rpc('cleanup_orphaned_account_references' as any, {
        company_id_param: companyId
      });
      
      if (error) {
        console.error('❌ [ACCOUNT_CLEANUP] خطأ في التنظيف:', error);
        throw new Error(error.message);
      }
      
      console.log('✅ [ACCOUNT_CLEANUP] نتائج التنظيف:', data);
      return data;
    },
    onSuccess: (result) => {
      // تحديث جميع الاستعلامات المرتبطة
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      toast.success(result.message);
      
      // عرض تفاصيل التنظيف
      const cleanedRecords = result.cleaned_records;
      if (cleanedRecords) {
        const totalCleaned = Object.values(cleanedRecords).reduce((sum: number, count) => sum + (typeof count === 'number' ? count : 0), 0);
        if (typeof totalCleaned === 'number' && totalCleaned > 0) {
          toast.info(`تم تنظيف ${totalCleaned} سجل معلق`);
        }
      }
    },
    onError: (error) => {
      console.error('❌ [ACCOUNT_CLEANUP] فشل التنظيف:', error);
      toast.error('خطأ في تنظيف البيانات: ' + error.message);
    }
  });
};

/**
 * Hook لاسترجاع سجل حذف الحسابات
 */
export const useAccountDeletionLog = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (limit: number = 50): Promise<any[]> => {
      const companyId = user?.profile?.company_id;
      if (!companyId) {
        throw new Error('معرف الشركة غير متوفر');
      }
      
      const { data, error } = await supabase
        .from('account_deletion_log')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('❌ [ACCOUNT_LOG] خطأ في جلب سجل الحذف:', error);
        throw new Error(error.message);
      }
      
      return data || [];
    },
    onError: (error) => {
      console.error('❌ [ACCOUNT_LOG] فشل جلب السجل:', error);
      toast.error('خطأ في جلب سجل الحذف: ' + error.message);
    }
  });
};

/**
 * دالة مساعدة لتحديد نوع الحذف المناسب
 */
export const determineDeletionStrategy = (analysis: AccountDeletionAnalysis): {
  recommendedMode: DeletionMode;
  requiresTransfer: boolean;
  warningMessage?: string;
} => {
  // التحقق من صحة البيانات
  if (!analysis || !analysis.account_info) {
    return {
      recommendedMode: 'soft',
      requiresTransfer: false,
      warningMessage: 'لا يمكن تحديد الاستراتيجية المناسبة - سيتم إلغاء التفعيل فقط'
    };
  }

  // إذا كان حساب نظامي
  if (analysis.account_info.is_system) {
    return {
      recommendedMode: 'soft',
      requiresTransfer: false,
      warningMessage: 'هذا حساب نظامي - يُنصح بإلغاء التفعيل فقط'
    };
  }
  
  // إذا لم توجد تبعيات
  if (!analysis.total_dependencies || analysis.total_dependencies === 0) {
    return {
      recommendedMode: 'force',
      requiresTransfer: false
    };
  }
  
  // إذا وجدت قيود محاسبية
  const hasJournalEntries = analysis.dependencies?.some(dep => dep.table_name === 'journal_entry_lines');
  if (hasJournalEntries) {
    return {
      recommendedMode: 'transfer',
      requiresTransfer: true,
      warningMessage: 'يحتوي الحساب على قيود محاسبية - يجب نقلها إلى حساب آخر'
    };
  }
  
  // حالات أخرى
  return {
    recommendedMode: 'transfer',
    requiresTransfer: true,
    warningMessage: 'يحتوي الحساب على بيانات مرتبطة - يُنصح بنقلها'
  };
};

/**
 * دالة مساعدة لتنسيق رسائل التأكيد
 */
export const formatDeletionConfirmation = (
  analysis: AccountDeletionAnalysis,
  mode: DeletionMode,
  transferAccountName?: string
): string => {
  const accountName = `${analysis.account_info.code} - ${analysis.account_info.name}`;
  
  switch (mode) {
    case 'soft':
      return `هل تريد إلغاء تفعيل الحساب "${accountName}"؟\n\nسيتم إخفاء الحساب من القوائم لكن البيانات المرتبطة ستبقى كما هي.`;
      
    case 'transfer':
      return `هل تريد نقل جميع البيانات إلى "${transferAccountName}" ثم حذف الحساب "${accountName}"؟\n\nسيتم نقل ${analysis.total_dependencies} سجل مرتبط.`;
      
    case 'force':
      return `⚠️ تحذير: هل تريد حذف الحساب "${accountName}" قسرياً؟\n\nسيتم حذف أو إلغاء ربط جميع البيانات المرتبطة (${analysis.total_dependencies} سجل).\n\nهذا الإجراء لا يمكن التراجع عنه!`;
      
    default:
      return `هل تريد حذف الحساب "${accountName}"؟`;
  }
};

/**
 * Hook لحذف جميع الحسابات 
 */
export const useDeleteAllAccounts = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      confirmationText, 
      forceDeleteSystem = false 
    }: { 
      confirmationText: string; 
      forceDeleteSystem?: boolean; 
    }) => {
      const companyId = user?.profile?.company_id;
      if (!companyId) throw new Error("معرف الشركة مطلوب");
      
      console.log('🗑️ [DELETE_ALL] Starting delete all accounts with force:', forceDeleteSystem);
      
      const { data, error } = await supabase.rpc('delete_all_accounts', {
        company_id_param: companyId,
        force_delete_system: forceDeleteSystem,
        confirmation_text: confirmationText,
      });

      if (error) {
        console.error('❌ [DELETE_ALL] RPC error:', error);
        throw new Error(`فشل في حذف جميع الحسابات: ${error.message}`);
      }
      
      const result = data as any;
      if (!result?.success) {
        console.error('❌ [DELETE_ALL] Operation failed:', result?.error);
        throw new Error(result?.error || "فشل في حذف جميع الحسابات");
      }
      
      console.log('✅ [DELETE_ALL] Success:', result);
      return result;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      
      const summary = data.summary;
      toast.success(`تم حذف جميع الحسابات بنجاح - ${summary?.total_processed || 0} حساب`);
    },
    onError: (error: any) => {
      console.error('💥 [DELETE_ALL] Mutation error:', error);
      toast.error('خطأ في حذف جميع الحسابات: ' + error.message);
    },
  });
};

/**
 * Hook لمعاينة حذف جميع الحسابات
 */
export const useGetAllAccountsDeletionPreview = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async () => {
      const companyId = user?.profile?.company_id;
      if (!companyId) throw new Error("معرف الشركة مطلوب");
      
      console.log('📊 [PREVIEW_ALL] Getting deletion preview for all accounts');
      
      const { data, error } = await supabase.rpc('get_all_accounts_deletion_preview', {
        company_id_param: companyId
      });

      if (error) {
        console.error('❌ [PREVIEW_ALL] RPC error:', error);
        throw new Error(`فشل في جلب معاينة الحذف: ${error.message}`);
      }
      
      const result = data as any;
      if (!result?.success) {
        console.error('❌ [PREVIEW_ALL] Operation failed:', result?.error);
        throw new Error(result?.error || "فشل في جلب معاينة الحذف");
      }
      
      console.log('✅ [PREVIEW_ALL] Preview loaded:', result);
      return result;
    }
  });
};

/**
 * Main hook that combines all enhanced account deletion functionality
 */
export const useEnhancedAccountDeletion = () => {
  const analyzeDependencies = useAnalyzeAccountDependencies();
  const deleteAccount = useComprehensiveAccountDeletion();
  const verifyIntegrity = useVerifyAccountIntegrity();
  const cleanup = useCleanupOrphanedReferences();
  const getDeletionLog = useAccountDeletionLog();
  const deleteAllAccounts = useDeleteAllAccounts();
  const getAllAccountsDeletionPreview = useGetAllAccountsDeletionPreview();

  return {
    // Analysis methods
    analyzeAccount: analyzeDependencies,
    isAnalyzing: analyzeDependencies.isPending,
    analysisData: analyzeDependencies.data,
    analysisError: analyzeDependencies.error,
    
    // Deletion methods  
    deleteAccount,
    isDeleting: deleteAccount.isPending,
    deletionError: deleteAccount.error,
    
    // Delete all methods
    deleteAllAccounts,
    getAllAccountsDeletionPreview,
    
    // Utility methods
    verifyIntegrity,
    cleanup,
    getDeletionLog,
    determineDeletionStrategy,
    formatDeletionConfirmation,
  };
};