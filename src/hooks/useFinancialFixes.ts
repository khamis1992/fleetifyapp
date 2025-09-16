import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useFinancialFixes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Copy default cost centers
  const copyDefaultCostCenters = useMutation({
    mutationFn: async () => {
      if (!user?.company?.id) throw new Error('Company ID required');
      
      const { error } = await supabase.rpc('copy_default_cost_centers_to_company', {
        target_company_id: user.company.id
      });
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('تم نسخ مراكز التكلفة الافتراضية بنجاح');
      queryClient.invalidateQueries({ queryKey: ['financial-system-analysis'] });
    },
    onError: (error: any) => {
      toast.error(`فشل في نسخ مراكز التكلفة: ${error.message}`);
    }
  });

  // Create default customer accounts
  const createDefaultCustomerAccounts = useMutation({
    mutationFn: async () => {
      if (!user?.company?.id) throw new Error('Company ID required');
      
      const { error } = await supabase.rpc('create_default_customer_accounts_fixed', {
        company_id_param: user.company.id
      });
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('تم إنشاء حسابات العملاء الافتراضية بنجاح');
      queryClient.invalidateQueries({ queryKey: ['financial-system-analysis'] });
    },
    onError: (error: any) => {
      toast.error(`فشل في إنشاء حسابات العملاء: ${error.message}`);
    }
  });

  // Ensure essential account mappings
  const ensureEssentialAccountMappings = useMutation({
    mutationFn: async () => {
      if (!user?.company?.id) throw new Error('Company ID required');
      
      const { data, error } = await supabase.rpc('ensure_essential_account_mappings', {
        company_id_param: user.company.id
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('تم إعداد ربط الحسابات الأساسية بنجاح');
      queryClient.invalidateQueries({ queryKey: ['financial-system-analysis'] });
    },
    onError: (error: any) => {
      toast.error(`فشل في إعداد ربط الحسابات: ${error.message}`);
    }
  });

  // Link unlinked contracts to appropriate accounts
  const linkUnlinkedContracts = useMutation({
    mutationFn: async () => {
      if (!user?.company?.id) throw new Error('Company ID required');
      
      // Get unlinked contracts
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id, customer_id, contract_amount')
        .eq('company_id', user.company.id)
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
        .eq('company_id', user.company.id)
        .eq('account_type', 'revenue')
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
    onError: (error: any) => {
      toast.error(`فشل في ربط العقود: ${error.message}`);
    }
  });

  // Run all fixes
  const runAllFixes = useMutation({
    mutationFn: async () => {
      if (!user?.company?.id) throw new Error('Company ID required');
      
      const results = [];
      
      try {
        // 1. Ensure essential account mappings
        await ensureEssentialAccountMappings.mutateAsync();
        results.push('تم إعداد ربط الحسابات الأساسية');
        
        // 2. Copy default cost centers
        await copyDefaultCostCenters.mutateAsync();
        results.push('تم نسخ مراكز التكلفة الافتراضية');
        
        // 3. Create default customer accounts
        await createDefaultCustomerAccounts.mutateAsync();
        results.push('تم إنشاء حسابات العملاء الافتراضية');
        
        // 4. Link unlinked contracts
        const contractResult = await linkUnlinkedContracts.mutateAsync();
        results.push(contractResult.message);
        
        return { results, success: true };
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (result) => {
      toast.success(`تم تنفيذ جميع الإصلاحات بنجاح:\n${result.results.join('\n')}`);
      queryClient.invalidateQueries({ queryKey: ['financial-system-analysis'] });
    },
    onError: (error: any) => {
      toast.error(`فشل في تنفيذ بعض الإصلاحات: ${error.message}`);
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