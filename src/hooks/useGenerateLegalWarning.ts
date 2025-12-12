import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DelinquentCustomer } from "./useDelinquentCustomers";

// Currency configurations for different countries
const CURRENCY_NAMES: Record<string, { ar: string; en: string }> = {
  'KWD': { ar: 'دينار كويتي', en: 'Kuwaiti Dinar' },
  'QAR': { ar: 'ريال قطري', en: 'Qatari Riyal' },
  'SAR': { ar: 'ريال سعودي', en: 'Saudi Riyal' },
  'AED': { ar: 'درهم إماراتي', en: 'UAE Dirham' },
  'OMR': { ar: 'ريال عماني', en: 'Omani Rial' },
  'BHD': { ar: 'دينار بحريني', en: 'Bahraini Dinar' },
  'USD': { ar: 'دولار أمريكي', en: 'US Dollar' },
  'EUR': { ar: 'يورو', en: 'Euro' },
};

const CURRENCY_LOCALES: Record<string, string> = {
  'KWD': 'ar-KW',
  'QAR': 'ar-QA',
  'SAR': 'ar-SA',
  'AED': 'ar-AE',
  'OMR': 'ar-OM',
  'BHD': 'ar-BH',
  'USD': 'en-US',
  'EUR': 'de-DE',
};

export interface GenerateWarningParams {
  delinquentCustomer: DelinquentCustomer;
  warningType?: 'initial' | 'formal' | 'final';
  deadlineDays?: number;
  includeBlacklistThreat?: boolean;
  additionalNotes?: string;
}

export interface GeneratedWarning {
  id: string;
  document_number: string;
  content: string;
  customer_id: string;
  customer_name: string;
  warning_type: string;
  created_at: string;
}

/**
 * Hook for generating AI-powered legal warnings for delinquent customers
 * Integrates with the Advanced Smart Legal Advisor v2.0.0
 */
export const useGenerateLegalWarning = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateWarningParams): Promise<GeneratedWarning> => {
      if (!user?.id) throw new Error('User not authenticated');

      const {
        delinquentCustomer,
        warningType = 'formal',
        deadlineDays = 7,
        includeBlacklistThreat = true,
        additionalNotes
      } = params;

      // Get user's company
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('فشل في جلب بيانات المستخدم');
      }

      if (!profile?.company_id) {
        console.error('No company_id in profile:', profile);
        throw new Error('لم يتم تحديد الشركة للمستخدم');
      }

      // Get company information including currency
      const { data: company } = await supabase
        .from('companies')
        .select('name_ar, name, phone, email, address, commercial_register, currency')
        .eq('id', profile.company_id)
        .single();
      
      // Get company currency with fallback to KWD
      const companyCurrency = (company?.currency || 'KWD').toUpperCase();
      const currencyName = CURRENCY_NAMES[companyCurrency] || CURRENCY_NAMES['KWD'];
      const currencyLocale = CURRENCY_LOCALES[companyCurrency] || CURRENCY_LOCALES['KWD'];

      // Generate document number
      const docNumberPrefix = 'WRN';
      const timestamp = Date.now().toString().slice(-6);
      const documentNumber = `${docNumberPrefix}-${new Date().getFullYear()}-${timestamp}`;

      // Determine warning level based on delinquent customer data
      let warningLevel: string;
      let urgencyText: string;
      
      if (delinquentCustomer.risk_score >= 85 || delinquentCustomer.days_overdue > 120) {
        warningLevel = 'FINAL_WARNING';
        urgencyText = 'إنذار نهائي - عاجل جداً';
      } else if (delinquentCustomer.risk_score >= 70 || delinquentCustomer.days_overdue > 90) {
        warningLevel = 'FORMAL_NOTICE';
        urgencyText = 'إنذار رسمي - عاجل';
      } else {
        warningLevel = 'INITIAL_WARNING';
        urgencyText = 'تنبيه أولي';
      }

      // Build AI prompt for generating the legal warning with company currency
      const aiPrompt = `
أنت مستشار قانوني متخصص في القانون. أنشئ إنذاراً قانونياً رسمياً ومهنياً باللغة العربية للعميل التالي:

معلومات الشركة:
- اسم الشركة: ${company?.name_ar || 'شركة فليتفاي'}
- السجل التجاري: ${company?.commercial_register || ''}
- الهاتف: ${company?.phone || ''}
- البريد: ${company?.email || ''}
- العنوان: ${company?.address || ''}
- العملة المستخدمة: ${companyCurrency}

معلومات العميل المتعثر:
- الاسم: ${delinquentCustomer.customer_name}
- رقم العميل: ${delinquentCustomer.customer_code}
- رقم العقد: ${delinquentCustomer.contract_number}
- رقم المركبة: ${delinquentCustomer.vehicle_plate || 'غير محدد'}
- الهاتف: ${delinquentCustomer.phone || 'غير محدد'}
- البريد: ${delinquentCustomer.email || 'غير محدد'}

تفاصيل المديونية:
- عدد الأشهر المتأخرة: ${delinquentCustomer.months_unpaid} شهر
- إجمالي الإيجارات المستحقة: ${delinquentCustomer.overdue_amount.toLocaleString(currencyLocale)} ${companyCurrency} (${currencyName.ar})
- غرامات التأخير (0.1% يومياً): ${delinquentCustomer.late_penalty.toLocaleString(currencyLocale)} ${companyCurrency} (${currencyName.ar})
- مخالفات مرورية غير مسددة: ${delinquentCustomer.violations_amount.toLocaleString(currencyLocale)} ${companyCurrency} (${currencyName.ar}) (${delinquentCustomer.violations_count} مخالفة)
- **الإجمالي الكلي المستحق: ${delinquentCustomer.total_debt.toLocaleString(currencyLocale)} ${companyCurrency} (${currencyName.ar})**

معلومات التأخير:
- عدد الأيام المتأخرة: ${delinquentCustomer.days_overdue} يوم
- درجة المخاطر: ${delinquentCustomer.risk_score}/100 (${delinquentCustomer.risk_level})
- تاريخ آخر دفعة: ${delinquentCustomer.last_payment_date ? new Date(delinquentCustomer.last_payment_date).toLocaleDateString('ar') : 'لا يوجد'}
- مبلغ آخر دفعة: ${delinquentCustomer.last_payment_amount.toLocaleString(currencyLocale)} ${companyCurrency} (${currencyName.ar})

السجل القانوني:
- قضايا قانونية سابقة: ${delinquentCustomer.has_previous_legal_cases ? `نعم (${delinquentCustomer.previous_legal_cases_count} قضية)` : 'لا'}
- مدرج في القائمة السوداء: ${delinquentCustomer.is_blacklisted ? 'نعم' : 'لا'}

مواصفات الإنذار المطلوب:
- نوع الإنذار: ${urgencyText}
- مستوى الإنذار: ${warningLevel}
- المهلة النهائية للسداد: ${deadlineDays} أيام من تاريخ استلام الإنذار
- تضمين تهديد بالإضافة للقائمة السوداء: ${includeBlacklistThreat ? 'نعم' : 'لا'}
${additionalNotes ? `- ملاحظات إضافية: ${additionalNotes}` : ''}

المطلوب:
أنشئ إنذاراً قانونياً رسمياً يتضمن:

1. **رأس الوثيقة:**
   - نوع الوثيقة: "${urgencyText}"
   - رقم الوثيقة: ${documentNumber}
   - التاريخ: ${new Date().toLocaleDateString('ar-KW')}

2. **مقدمة رسمية:**
   - مخاطبة العميل بشكل رسمي ومحترم
   - الإشارة إلى عقد الإيجار ورقمه وتاريخه

3. **تفاصيل المديونية:**
   - جدول واضح بالمبالغ المستحقة
   - تفصيل الإيجارات الشهرية المتأخرة
   - غرامات التأخير وطريقة حسابها
   - المخالفات المرورية
   - الإجمالي النهائي

4. **المهلة النهائية:**
   - تحديد مهلة ${deadlineDays} أيام للسداد الكامل
   - تحديد تاريخ انتهاء المهلة بوضوح

5. **الإجراءات القانونية المحتملة:**
   - رفع دعوى قضائية لتحصيل المستحقات
   - تحميل العميل المصاريف القانونية (10% من المبلغ)
   - تحميل العميل رسوم المحكمة (1% من المبلغ)
   - المطالبة بالتعويضات المناسبة
   ${includeBlacklistThreat ? '- إضافة العميل إلى القائمة السوداء لشركات التأجير في الكويت' : ''}
   - الإبلاغ عن المديونية للجهات الائتمانية

6. **دعوة للحوار:**
   - إمكانية التواصل لترتيب جدول سداد
   - أرقام الاتصال للتواصل

7. **الختام:**
   - توقيع رسمي
   - ختم الشركة
   - اسم المسؤول

**مهم جداً:**
- استخدم لغة قانونية رسمية ومهنية
- كن حازماً لكن محترماً
- أشر إلى المواد القانونية ذات الصلة في القانون الكويتي
- استخدم تنسيق واضح ومنظم
- تأكد من أن الوثيقة قابلة للطباعة والاستخدام مباشرة

أنشئ الإنذار كاملاً الآن:
`.trim();

      // Z.AI GLM-4.6 API Configuration (same as AI Chat Assistant)
      const ZAI_API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
      const ZAI_API_KEY = '136e9f29ddd445c0a5287440f6ab13e0.DSO2qKJ4AiP1SRrH';
      const MODEL = 'glm-4.6';

      // Call Z.AI GLM-4.6 API
      const aiResponse = await fetch(ZAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ZAI_API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: 'أنت مستشار قانوني متخصص في القانون القطري وقوانين التأجير والليموزين في دول الخليج. تتمتع بخبرة 20 عاماً في صياغة الوثائق القانونية والإنذارات الرسمية.'
            },
            {
              role: 'user',
              content: aiPrompt
            }
          ],
          temperature: 0.3, // Low temperature for consistent, formal output
          max_tokens: 2000,
          top_p: 0.9
        })
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({}));
        throw new Error(`GLM-4.6 API Error: ${errorData.error?.message || aiResponse.statusText || 'Unknown error'}`);
      }

      const aiData = await aiResponse.json();
      // GLM-4.6 may return content in 'reasoning_content' field for reasoning models
      const messageData = aiData.choices[0]?.message;
      const generatedContent = messageData?.content || messageData?.reasoning_content;

      if (!generatedContent) {
        console.error('AI Response:', JSON.stringify(aiData));
        throw new Error('لم يتم إنشاء محتوى من GLM-4.6 AI');
      }

      // Calculate usage (Z.AI provides similar usage stats)
      const tokensUsed = aiData.usage?.total_tokens || 0;
      const estimatedCost = 0; // Z.AI pricing is different, set to 0 for now

      // Save to legal_documents table
      const { data: document, error: docError } = await supabase
        .from('legal_documents')
        .insert({
          company_id: profile.company_id,
          customer_id: delinquentCustomer.customer_id,
          document_number: documentNumber,
          document_type: 'legal_warning',
          document_title: `${urgencyText} - ${delinquentCustomer.customer_name}`,
          content: generatedContent,
          country_law: 'kuwait',
          status: 'draft',
          created_by: user.id,
          metadata: {
            delinquent_data: {
              months_unpaid: delinquentCustomer.months_unpaid,
              overdue_amount: delinquentCustomer.overdue_amount,
              late_penalty: delinquentCustomer.late_penalty,
              violations_amount: delinquentCustomer.violations_amount,
              total_debt: delinquentCustomer.total_debt,
              days_overdue: delinquentCustomer.days_overdue,
              risk_score: delinquentCustomer.risk_score
            },
            warning_params: {
              warning_type: warningType,
              warning_level: warningLevel,
              deadline_days: deadlineDays,
              include_blacklist_threat: includeBlacklistThreat
            },
            ai_generation: {
              tokens_used: tokensUsed,
              estimated_cost: estimatedCost,
              model: 'glm-4.6',
              generated_at: new Date().toISOString()
            }
          }
        })
        .select()
        .single();

      if (docError) throw docError;

      // Log consultation to legal_consultations table
      await supabase
        .from('legal_consultations')
        .insert({
          company_id: profile.company_id,
          customer_id: delinquentCustomer.customer_id,
          query: `إنشاء ${urgencyText} للعميل ${delinquentCustomer.customer_name}`,
          response: `تم إنشاء الإنذار القانوني بنجاح. رقم الوثيقة: ${documentNumber}`,
          query_type: 'document_generation',
          country: 'kuwait',
          tokens_used: tokensUsed,
          response_time: 0, // Will be calculated if needed
          cost: estimatedCost,
          created_by: user.id
        });

      return {
        id: document.id,
        document_number: documentNumber,
        content: generatedContent,
        customer_id: delinquentCustomer.customer_id,
        customer_name: delinquentCustomer.customer_name,
        warning_type: warningLevel,
        created_at: document.created_at
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      queryClient.invalidateQueries({ queryKey: ['legal-consultations'] });
      
      toast.success('تم إنشاء الإنذار القانوني بنجاح', {
        description: `رقم الوثيقة: ${data.document_number}`,
        duration: 5000,
      });
    },
    onError: (error) => {
      console.error('Error generating legal warning:', error);
      toast.error('حدث خطأ أثناء إنشاء الإنذار القانوني', {
        description: error.message || 'يرجى المحاولة مرة أخرى',
      });
    },
  });
};

/**
 * Hook for bulk warning generation (multiple customers at once)
 * Note: This hook returns the mutation, which should be called sequentially
 * for each customer to avoid violating React's Rules of Hooks
 */
export const useBulkGenerateLegalWarnings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      warnings: GeneratedWarning[];
    }) => {
      // This is just for invalidating queries after bulk operations
      // The actual generation should be done by calling useGenerateLegalWarning
      // multiple times in the component
      return params.warnings;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      queryClient.invalidateQueries({ queryKey: ['legal-consultations'] });

      toast.success(`تم إنشاء ${data.length} إنذار قانوني بنجاح`, {
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      console.error('Error in bulk warning generation:', error);
      toast.error('حدث خطأ أثناء العملية الجماعية');
    },
  });
};
