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

// Z.AI API Configuration - Same as AIChatAssistant
const ZAI_API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const ZAI_API_KEY = '136e9f29ddd445c0a5287440f6ab13e0.DSO2qKJ4AiP1SRrH';
const MODEL = 'glm-4.6';

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
 * Helper function to call Z.AI API with streaming (same as AIChatAssistant)
 */
async function callZAIWithStreaming(
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal
): Promise<string> {
  const requestBody = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    stream: true,
    max_tokens: 3000,
  };

  const headers = {
    'Content-Type': 'application/json',
    'Accept-Language': 'en-US,en',
    'Authorization': `Bearer ${ZAI_API_KEY}`,
  };

  console.log('🤖 [LegalWarning] Starting Z.AI API call...');

  const response = await fetch(ZAI_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ [LegalWarning] API Error:', response.status, errorText);
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  console.log('✅ [LegalWarning] API responded, reading stream...');

  // Handle streaming response - same as AIChatAssistant
  const reader = response.body?.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedContent = '';

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data:')) {
          const jsonStr = trimmedLine.slice(5).trim();
          if (jsonStr === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulatedContent += delta;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  console.log('✅ [LegalWarning] Stream complete, content length:', accumulatedContent.length);
  return accumulatedContent;
}

/**
 * Hook for generating AI-powered legal warnings for delinquent customers
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
      
      // Get company currency with fallback to QAR
      const companyCurrency = (company?.currency || 'QAR').toUpperCase();
      const currencyName = CURRENCY_NAMES[companyCurrency] || CURRENCY_NAMES['QAR'];
      const currencyLocale = CURRENCY_LOCALES[companyCurrency] || CURRENCY_LOCALES['QAR'];

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

      // System prompt for legal advisor
      const systemPrompt = 'أنت مستشار قانوني متخصص في القانون القطري وقوانين التأجير والليموزين في دول الخليج. تتمتع بخبرة 20 عاماً في صياغة الوثائق القانونية والإنذارات الرسمية. أنشئ الإنذار القانوني مباشرة بدون شرح أو تعليقات إضافية.';

      // Build AI prompt
      const aiPrompt = `
أنشئ إنذاراً قانونياً رسمياً ومهنياً باللغة العربية للعميل التالي:

معلومات الشركة:
- اسم الشركة: ${company?.name_ar || 'شركة العراف لتأجير السيارات'}
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

تفاصيل المديونية:
- إجمالي الإيجارات المستحقة: ${delinquentCustomer.overdue_amount.toLocaleString(currencyLocale)} ${companyCurrency}
- غرامات التأخير: ${delinquentCustomer.late_penalty.toLocaleString(currencyLocale)} ${companyCurrency}
- مخالفات مرورية: ${delinquentCustomer.violations_amount.toLocaleString(currencyLocale)} ${companyCurrency}
- **الإجمالي المستحق: ${delinquentCustomer.total_debt.toLocaleString(currencyLocale)} ${companyCurrency}**

معلومات التأخير:
- عدد الأيام المتأخرة: ${delinquentCustomer.days_overdue} يوم
- درجة المخاطر: ${delinquentCustomer.risk_score}/100

مواصفات الإنذار:
- نوع الإنذار: ${urgencyText}
- رقم الوثيقة: ${documentNumber}
- التاريخ: ${new Date().toLocaleDateString('ar-QA')}
- المهلة النهائية: ${deadlineDays} أيام
${includeBlacklistThreat ? '- تضمين تهديد بالقائمة السوداء: نعم' : ''}
${additionalNotes ? `- ملاحظات: ${additionalNotes}` : ''}

أنشئ إنذاراً قانونياً رسمياً يتضمن:
1. رأس الوثيقة مع رقم الإنذار والتاريخ
2. مخاطبة رسمية للعميل
3. تفاصيل المديونية بجدول واضح
4. المهلة النهائية للسداد
5. الإجراءات القانونية في حال عدم السداد
6. دعوة للتواصل لترتيب السداد
7. ختام رسمي مع التوقيع

استخدم لغة قانونية رسمية ومهنية.
`.trim();

      // Create AbortController with timeout (60 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let generatedContent: string;
      try {
        generatedContent = await callZAIWithStreaming(systemPrompt, aiPrompt, controller.signal);
      } catch (err) {
        clearTimeout(timeoutId);
        if ((err as Error).name === 'AbortError') {
          throw new Error('انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.');
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!generatedContent) {
        throw new Error('لم يتم إنشاء محتوى من الذكاء الاصطناعي');
      }

      // Estimate tokens from content length
      const tokensUsed = Math.ceil(generatedContent.length / 4);

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
          country_law: 'qatar',
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
              model: 'glm-4.6',
              generated_at: new Date().toISOString()
            }
          }
        })
        .select()
        .single();

      if (docError) {
        console.error('Document save error:', docError);
        throw new Error('فشل في حفظ الوثيقة');
      }

      // Log consultation to legal_consultations table
      await supabase
        .from('legal_consultations')
        .insert({
          company_id: profile.company_id,
          customer_id: delinquentCustomer.customer_id,
          query: `إنشاء ${urgencyText} للعميل ${delinquentCustomer.customer_name}`,
          response: `تم إنشاء الإنذار القانوني بنجاح. رقم الوثيقة: ${documentNumber}`,
          query_type: 'document_generation',
          country: 'qatar',
          tokens_used: tokensUsed,
          response_time_ms: 0,
          cost_usd: 0
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
 */
export const useBulkGenerateLegalWarnings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { warnings: GeneratedWarning[] }) => {
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
