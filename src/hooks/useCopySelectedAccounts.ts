import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { useToast } from "./use-toast";
import { AccountTemplate } from "./useTemplateSystem";

export const useCopySelectedAccounts = () => {
  const queryClient = useQueryClient();
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (selectedAccounts: AccountTemplate[]) => {
      if (!companyId) throw new Error("معرف الشركة مطلوب");
      
      validateCompanyAccess(companyId);

      // تحويل الحسابات المحددة إلى أكواد
      const accountCodes = selectedAccounts.map(acc => acc.code);
      
      if (accountCodes.length === 0) {
        throw new Error("لم يتم تحديد أي حسابات");
      }

      console.log('📋 [OLD_COPY_SELECTED] استخدام النسخ المحدد القديم:', {
        accountCodesCount: accountCodes.length,
        selectedAccountsCount: selectedAccounts.length,
        sampleCodes: accountCodes.slice(0, 5)
      });

      // استدعاء الوظيفة الجديدة لنسخ الحسابات المحددة
      const { error } = await supabase.rpc("copy_selected_accounts_to_company", {
        target_company_id: companyId,
        selected_account_codes: accountCodes,
      });

      if (error) throw new Error(`فشل في نسخ الحسابات المحددة: ${error.message}`);

      return { 
        selectedCount: selectedAccounts.length,
        accountCodes 
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
      toast({
        title: "تم نسخ الحسابات المحددة بنجاح",
        description: `تم إضافة ${data.selectedCount} حساب من القالب إلى دليل الحسابات`,
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive", 
        title: "خطأ في نسخ الحسابات",
        description: error.message,
      });
    },
  });
};