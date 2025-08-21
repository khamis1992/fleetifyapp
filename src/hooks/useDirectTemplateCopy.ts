import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { useToast } from "./use-toast";
import { useBusinessTypeAccounts, AccountTemplate } from "./useBusinessTypeAccounts";

interface DirectCopyResult {
  success: boolean;
  message: string;
  total_accounts: number;
  copied_accounts: number;
  skipped_accounts: number;
  failed_accounts: number;
  errors: string[];
}

/**
 * Hook لنسخ قوالب الحسابات مباشرة من JavaScript بدلاً من قاعدة البيانات
 */
export const useDirectTemplateCopy = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();
  const { getAccountsByBusinessType } = useBusinessTypeAccounts();

  return useMutation({
    mutationFn: async (businessType: string): Promise<DirectCopyResult> => {
      if (!companyId) {
        throw new Error("معرف الشركة مطلوب");
      }

      console.log('🚀 [DIRECT_COPY] بدء نسخ قالب مباشر:', { businessType, companyId });

      // جلب جميع حسابات القالب من JavaScript
      const templateAccounts = getAccountsByBusinessType(businessType);
      const allAccounts = [
        ...templateAccounts.assets,
        ...templateAccounts.liabilities,
        ...templateAccounts.revenue,
        ...templateAccounts.expenses,
        ...templateAccounts.equity
      ];

      console.log('📊 [DIRECT_COPY] إحصائيات القالب:', {
        assets: templateAccounts.assets.length,
        liabilities: templateAccounts.liabilities.length,
        revenue: templateAccounts.revenue.length,
        expenses: templateAccounts.expenses.length,
        equity: templateAccounts.equity.length,
        total: allAccounts.length
      });

      // جلب الحسابات الموجودة في الشركة
      const { data: existingAccounts, error: fetchError } = await supabase
        .from('chart_of_accounts')
        .select('account_code')
        .eq('company_id', companyId);

      if (fetchError) {
        throw new Error(`خطأ في جلب الحسابات الموجودة: ${fetchError.message}`);
      }

      const existingCodes = new Set(existingAccounts?.map(acc => acc.account_code) || []);
      console.log('📋 [DIRECT_COPY] الحسابات الموجودة:', existingCodes.size);

      let copied_accounts = 0;
      let skipped_accounts = 0;
      let failed_accounts = 0;
      const errors: string[] = [];

      // إنشاء خريطة للحسابات الأب
      const parentMapping = new Map<string, string>();

      // ترتيب الحسابات حسب المستوى لضمان إنشاء الحسابات الأب أولاً
      const sortedAccounts = allAccounts.sort((a, b) => {
        if (a.accountLevel !== b.accountLevel) {
          return a.accountLevel - b.accountLevel;
        }
        return a.code.localeCompare(b.code);
      });

      // نسخ كل حساب
      for (const account of sortedAccounts) {
        try {
          // تحقق من وجود الحساب
          if (existingCodes.has(account.code)) {
            skipped_accounts++;
            console.log(`⏭️ تم تخطي الحساب الموجود: ${account.code}`);
            continue;
          }

          // البحث عن الحساب الأب
          let parent_account_id: string | null = null;
          if (account.parentCode) {
            parent_account_id = parentMapping.get(account.parentCode) || null;
            
            // إذا لم نجد الحساب الأب في الخريطة، ابحث في قاعدة البيانات
            if (!parent_account_id) {
              const { data: parentAccount } = await supabase
                .from('chart_of_accounts')
                .select('id')
                .eq('company_id', companyId)
                .eq('account_code', account.parentCode)
                .single();
              
              if (parentAccount) {
                parent_account_id = parentAccount.id;
                parentMapping.set(account.parentCode, parentAccount.id);
              }
            }
          }

          // إنشاء الحساب
          const { data: newAccount, error: insertError } = await supabase
            .from('chart_of_accounts')
            .insert({
              company_id: companyId,
              account_code: account.code,
              account_name: account.nameEn,
              account_name_ar: account.nameAr,
              account_type: account.accountType,
              balance_type: account.balanceType,
              account_level: account.accountLevel,
              is_header: account.isHeader || false,
              is_system: false,
              description: account.description,
              parent_account_id: parent_account_id,
              current_balance: 0,
              is_active: true
            })
            .select('id')
            .single();

          if (insertError) {
            failed_accounts++;
            errors.push(`${account.code}: ${insertError.message}`);
            console.error(`❌ فشل إنشاء الحساب ${account.code}:`, insertError);
          } else {
            copied_accounts++;
            // حفظ الحساب الجديد في الخريطة للمراجع المستقبلية
            if (newAccount) {
              parentMapping.set(account.code, newAccount.id);
            }
            console.log(`✅ تم إنشاء الحساب: ${account.code} - ${account.nameAr}`);
          }

        } catch (error: any) {
          failed_accounts++;
          errors.push(`${account.code}: ${error.message}`);
          console.error(`❌ خطأ في معالجة الحساب ${account.code}:`, error);
        }
      }

      const result: DirectCopyResult = {
        success: true,
        message: `تم نسخ ${copied_accounts} حساب من أصل ${allAccounts.length}`,
        total_accounts: allAccounts.length,
        copied_accounts,
        skipped_accounts,
        failed_accounts,
        errors: errors.slice(0, 10) // أول 10 أخطاء فقط
      };

      console.log('✅ [DIRECT_COPY] اكتملت عملية النسخ:', result);
      return result;
    },
    onSuccess: (result) => {
      // تحديث الاستعلامات
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["chartOfAccounts"] });

      toast({
        title: "تم نسخ القالب بنجاح",
        description: result.message,
      });

      // إشعارات إضافية
      if (result.skipped_accounts > 0) {
        toast({
          title: "تم تخطي حسابات موجودة",
          description: `تم تخطي ${result.skipped_accounts} حساب موجود مسبقاً`,
        });
      }

      if (result.failed_accounts > 0) {
        toast({
          variant: "destructive",
          title: "فشل في نسخ بعض الحسابات",
          description: `فشل في نسخ ${result.failed_accounts} حساب`,
        });
      }
    },
    onError: (error: any) => {
      console.error('❌ [DIRECT_COPY] فشل النسخ المباشر:', error);
      toast({
        variant: "destructive",
        title: "خطأ في نسخ القالب",
        description: error.message,
      });
    },
  });
};
