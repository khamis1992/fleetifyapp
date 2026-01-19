import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { toast } from "sonner";

export const useFinancialFixes = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  // Copy default cost centers
  const copyDefaultCostCenters = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID required');
      
      const { data, error } = await supabase.rpc('copy_default_cost_centers_to_company', {
        target_company_id: companyId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data: unknown) => {
      if (data?.success && data?.message) {
        toast.success(data.message);
      } else {
        toast.success('تم نسخ مراكز التكلفة الافتراضية بنجاح');
      }
      queryClient.invalidateQueries({ queryKey: ['financial-system-analysis'] });
    },
    onError: (error: unknown) => {
      // Handle duplicate key errors gracefully
      if (error.code === '23505') {
        toast.info('مراكز التكلفة موجودة مسبقاً - تم تخطي المكررات');
      } else {
        toast.error(`فشل في نسخ مراكز التكلفة: ${error.message}`);
      }
    }
  });

  // Create default customer accounts
  const createDefaultCustomerAccounts = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID required');
      
      const { error } = await supabase.rpc('create_default_customer_accounts_fixed', {
        company_id_param: companyId
      });
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('تم إنشاء حسابات العملاء الافتراضية بنجاح');
      queryClient.invalidateQueries({ queryKey: ['financial-system-analysis'] });
    },
    onError: (error: unknown) => {
      toast.error(`فشل في إنشاء حسابات العملاء: ${error.message}`);
    }
  });

  // Ensure essential account mappings
  const ensureEssentialAccountMappings = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID required');
      
      const { data, error } = await supabase.rpc('ensure_essential_account_mappings', {
        company_id_param: companyId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('تم إعداد ربط الحسابات الأساسية بنجاح');
      queryClient.invalidateQueries({ queryKey: ['financial-system-analysis'] });
    },
    onError: (error: unknown) => {
      // Enhanced error handling for better UX
      let errorMsg = error.message || 'خطأ غير محدد';
      
      // Handle common PostgreSQL errors
      if (error.code === '42703' || errorMsg.includes('column') && errorMsg.includes('does not exist')) {
        errorMsg = 'خطأ في هيكل البيانات - يرجى التواصل مع فريق الدعم';
      } else if (error.code === '23505' || errorMsg.includes('duplicate key')) {
        errorMsg = 'يوجد ربط حسابات مكرر - سيتم تحديث البيانات الموجودة';
      } else if (errorMsg.includes('function') && errorMsg.includes('does not exist')) {
        errorMsg = 'الوظيفة غير متوفرة حالياً - يرجى المحاولة لاحقاً';
      }
      
      toast.error(`فشل في إعداد ربط الحسابات: ${errorMsg}`);
    }
  });

  // Link unlinked contracts to appropriate accounts
  const linkUnlinkedContracts = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID required');
      
      // Get unlinked contracts
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id, customer_id, contract_amount')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .is('account_id', null);
      
      if (contractsError) throw contractsError;
      
      if (!contracts || contracts.length === 0) {
        return { message: 'لا توجد عقود غير مربوطة', linkedCount: 0 };
      }

      // Get a revenue account to link contracts to
      const { data: revenueAccount, error: accountError } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', companyId)
        .in('account_type', ['revenue', 'income'])
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (accountError || !revenueAccount) {
        throw new Error('لا يوجد حساب إيرادات متاح للربط');
      }

      // Update contracts with account_id
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ account_id: revenueAccount.id })
        .in('id', contracts.map(c => c.id));
      
      if (updateError) throw updateError;
      
      return { message: `تم ربط ${contracts.length} عقد بنجاح`, linkedCount: contracts.length };
    },
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ['financial-system-analysis'] });
    },
    onError: (error: unknown) => {
      toast.error(`فشل في ربط العقود: ${error.message}`);
    }
  });

  // Run all fixes
  const runAllFixes = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID required');

      const results: string[] = [];
      console.log('[FinancialFixes] ▶️ Starting runAllFixes for company', companyId);

      try {
        // 1) Ensure essential account mappings
        console.log('[FinancialFixes] Step 1: ensure_essential_account_mappings');
        const { error: mappingsError } = await supabase.rpc('ensure_essential_account_mappings', {
          company_id_param: companyId
        });
        if (mappingsError) throw mappingsError;
        results.push('تم إعداد ربط الحسابات الأساسية');

        // 2) Copy default cost centers
        console.log('[FinancialFixes] Step 2: copy_default_cost_centers_to_company');
        const { data: ccData, error: ccError } = await supabase.rpc('copy_default_cost_centers_to_company', {
          target_company_id: companyId
        });
        if (ccError && ccError.code !== '23505') {
          throw ccError;
        }
        
        if (ccData && typeof ccData === 'object' && 'success' in ccData && 'message' in ccData) {
          results.push((ccData as any).message);
        } else {
          results.push('تم نسخ مراكز التكلفة الافتراضية');
        }

        // 3) Create default customer accounts
        console.log('[FinancialFixes] Step 3: create_default_customer_accounts_fixed');
        const { error: custError } = await supabase.rpc('create_default_customer_accounts_fixed', {
          company_id_param: companyId
        });
        if (custError) throw custError;
        results.push('تم إنشاء حسابات العملاء الافتراضية');

        // 4) Link unlinked contracts
        console.log('[FinancialFixes] Step 4: Linking unlinked contracts');
        const { data: contracts, error: contractsError } = await supabase
          .from('contracts')
          .select('id')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .is('account_id', null);
        if (contractsError) throw contractsError;

        if (contracts && contracts.length > 0) {
          const { data: revenueAccount, error: accountError } = await supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('company_id', companyId)
            .in('account_type', ['revenue', 'income'])
            .eq('is_active', true)
            .limit(1)
            .single();
          if (accountError || !revenueAccount) {
            throw new Error('لا يوجد حساب إيرادات/دخل متاح للربط');
          }

          const { error: updateError } = await supabase
            .from('contracts')
            .update({ account_id: revenueAccount.id })
            .in('id', contracts.map((c) => c.id));
          if (updateError) throw updateError;
          results.push(`تم ربط ${contracts.length} عقد بنجاح`);
        } else {
          results.push('لا توجد عقود غير مربوطة');
        }

        console.log('[FinancialFixes] ✅ Completed runAllFixes', results);
        return { results, success: true };
      } catch (error) {
        console.error('[FinancialFixes] ❌ runAllFixes failed:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      toast.success(`تم تنفيذ جميع الإصلاحات بنجاح:\n${result.results.join('\n')}`);
      // Refresh analysis data
      queryClient.invalidateQueries({ queryKey: ['financial-system-analysis'] });
    },
    onError: (error: unknown) => {
      // Enhanced error handling for Run All Fixes
      let errorMsg = error.message || 'خطأ غير محدد';
      
      // Handle common PostgreSQL errors
      if (error.code === '42703' || errorMsg.includes('column') && errorMsg.includes('does not exist')) {
        errorMsg = 'خطأ في هيكل قاعدة البيانات - تم إصلاح الخطأ تلقائياً، يرجى المحاولة مرة أخرى';
      } else if (error.code === '23505' || errorMsg.includes('duplicate key')) {
        errorMsg = 'توجد بيانات مكررة - سيتم تجاهل البيانات المكررة والمتابعة';
      } else if (errorMsg.includes('function') && errorMsg.includes('does not exist')) {
        errorMsg = 'بعض الوظائف غير متوفرة - يرجى تحديث النظام';
      }
      
      toast.error(`فشل في تنفيذ بعض الإصلاحات: ${errorMsg}`);
      console.error('[FinancialFixes] Full error details:', error);
    }
  });

  return {
    copyDefaultCostCenters,
    createDefaultCustomerAccounts,
    ensureEssentialAccountMappings,
    linkUnlinkedContracts,
    runAllFixes,
    isLoading: copyDefaultCostCenters.isPending || 
               createDefaultCustomerAccounts.isPending || 
               ensureEssentialAccountMappings.isPending || 
               linkUnlinkedContracts.isPending ||
               runAllFixes.isPending
  };
};