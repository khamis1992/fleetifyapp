import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { useToast } from "./use-toast";
import { useBusinessTypeAccounts, AccountTemplate } from "./useBusinessTypeAccounts";
import { getCarRentalTemplate, getCarRentalTemplateCount } from "./useCarRentalTemplate";

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

      // جلب جميع حسابات القالب - استخدام القالب الكامل لتأجير السيارات
      let allAccounts;
      
      if (businessType === 'car_rental') {
        try {
          console.log('🚗 [DIRECT_COPY] جلب القالب الكامل من JSON...');
          const response = await fetch('/car_rental_complete_template.json');
          console.log('📡 [DIRECT_COPY] استجابة الخادم:', response.status, response.statusText);
          
          if (!response.ok) {
            throw new Error(`فشل في تحميل القالب: ${response.status} ${response.statusText}`);
          }
          
          const templateData = await response.json();
          console.log('📊 [DIRECT_COPY] بيانات القالب المُحملة:', {
            hasMetadata: !!templateData.template_metadata,
            hasAccounts: !!templateData.chart_of_accounts,
            accountsCount: templateData.chart_of_accounts?.length || 0
          });
          
          allAccounts = templateData.chart_of_accounts || [];
          
          if (allAccounts.length === 0) {
            throw new Error('قائمة الحسابات فارغة في القالب');
          }
          
          console.log('✅ [DIRECT_COPY] تم جلب القالب الكامل بنجاح:', {
            total_accounts: allAccounts.length,
            sample_accounts: allAccounts.slice(0, 3).map(acc => ({ 
              code: acc.code, 
              name: acc.name_ar,
              level: acc.level
            }))
          });
        } catch (error) {
          console.error('❌ [DIRECT_COPY] خطأ في جلب القالب الكامل:', error);
          throw new Error(`فشل في تحميل القالب الكامل: ${error.message}`);
        }
      } else {
        // استخدام القالب الافتراضي للأنواع الأخرى
        const templateAccounts = getAccountsByBusinessType(businessType);
        allAccounts = [
          ...templateAccounts.assets,
          ...templateAccounts.liabilities,
          ...templateAccounts.revenue,
          ...templateAccounts.expenses,
          ...templateAccounts.equity
        ];
      }

      if (allAccounts.length === 0) {
        throw new Error('القالب فارغ أو غير متوفر');
      }

      console.log('📊 [DIRECT_COPY] إحصائيات القالب:', {
        total: allAccounts.length,
        sample: allAccounts.slice(0, 3).map(acc => ({
          code: acc.code || acc.account_code,
          name: acc.name_ar || acc.nameAr,
          type: acc.account_type || acc.accountType
        }))
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
        const levelA = a.level || a.accountLevel;
        const levelB = b.level || b.accountLevel;
        const codeA = a.code || a.account_code;
        const codeB = b.code || b.account_code;
        
        if (levelA !== levelB) {
          return levelA - levelB;
        }
        return codeA.localeCompare(codeB);
      });

      // نسخ كل حساب
      for (const account of sortedAccounts) {
        try {
          // التعامل مع تنسيق القالب الجديد والقديم
          const accountCode = account.code || account.account_code;
          const nameAr = account.name_ar || account.nameAr;
          const nameEn = account.name_en || account.nameEn;
          const accountType = account.account_type || account.accountType;
          const level = account.level || account.accountLevel;
          const balanceType = account.balance_type || account.balanceType;
          const parentCode = account.parent_code || account.parentCode;
          const isHeader = account.is_header ?? account.isHeader ?? false;
          const description = account.description || '';

          // تحقق من وجود الحساب
          if (existingCodes.has(accountCode)) {
            skipped_accounts++;
            console.log(`⏭️ تم تخطي الحساب الموجود: ${accountCode}`);
            continue;
          }

          // البحث عن الحساب الأب
          let parent_account_id: string | null = null;
          if (parentCode) {
            parent_account_id = parentMapping.get(parentCode) || null;
            
            // إذا لم نجد الحساب الأب في الخريطة، ابحث في قاعدة البيانات
            if (!parent_account_id) {
              const { data: parentAccount } = await supabase
                .from('chart_of_accounts')
                .select('id')
                .eq('company_id', companyId)
                .eq('account_code', parentCode)
                .single();
              
              if (parentAccount) {
                parent_account_id = parentAccount.id;
                parentMapping.set(parentCode, parentAccount.id);
              }
            }
          }

          console.log(`📝 [DIRECT_COPY] إنشاء الحساب: ${accountCode} - ${nameAr} (نوع: ${accountType})`);

          // إنشاء الحساب
          const { data: newAccount, error: insertError } = await supabase
            .from('chart_of_accounts')
            .insert({
              company_id: companyId,
              account_code: accountCode,
              account_name: nameEn,
              account_name_ar: nameAr,
              account_type: accountType,
              balance_type: balanceType,
              account_level: level,
              is_header: isHeader,
              is_system: false,
              description: description,
              parent_account_id: parent_account_id,
              current_balance: 0,
              is_active: true
            })
            .select('id')
            .single();

          if (insertError) {
            failed_accounts++;
            errors.push(`${accountCode}: ${insertError.message}`);
            console.error(`❌ فشل إنشاء الحساب ${accountCode}:`, insertError);
          } else {
            copied_accounts++;
            // حفظ الحساب الجديد في الخريطة للمراجع المستقبلية
            if (newAccount) {
              parentMapping.set(accountCode, newAccount.id);
            }
            console.log(`✅ تم إنشاء الحساب: ${accountCode} - ${nameAr}`);
          }

        } catch (error: any) {
          failed_accounts++;
          const accountCode = account.code || account.account_code;
          errors.push(`${accountCode}: ${error.message}`);
          console.error(`❌ خطأ في معالجة الحساب ${accountCode}:`, error);
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
      
      // تشخيص إضافي مفصل
      if (failed_accounts > 0) {
        console.error('❌ [DIRECT_COPY] الأخطاء:', errors.slice(0, 5));
      }
      
      if (copied_accounts < allAccounts.length / 2) {
        console.warn('⚠️ [DIRECT_COPY] تم نسخ أقل من نصف الحسابات. قد تكون هناك مشكلة.');
      }
      
      return result;
    },
    onMutate: (businessType) => {
      // Log only, no toast to avoid notification spam
      console.log('🚀 [DIRECT_COPY] تم استدعاء النسخ المباشر للقالب:', businessType);
    },
    onSuccess: (result) => {
      // تحديث الاستعلامات
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["chartOfAccounts"] });

      // تنبيه شامل واحد بدلاً من تنبيهات متعددة
      const statusMessage = result.skipped_accounts > 0 || result.failed_accounts > 0 
        ? `${result.message} (متخطاة: ${result.skipped_accounts}, فاشلة: ${result.failed_accounts})`
        : result.message;

      toast({
        title: "✅ تم نسخ القالب بنجاح",
        description: statusMessage,
        variant: result.failed_accounts > 0 ? "destructive" : "default"
      });
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
