import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DelinquentCustomer } from "./useDelinquentCustomers";

// Currency configurations
const CURRENCY_NAMES: Record<string, string> = {
  'KWD': 'دينار كويتي',
  'QAR': 'ريال قطري',
  'SAR': 'ريال سعودي',
  'AED': 'درهم إماراتي',
  'OMR': 'ريال عماني',
  'BHD': 'دينار بحريني',
  'USD': 'دولار أمريكي',
  'EUR': 'يورو',
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

interface CompanyInfo {
  name_ar: string;
  phone: string;
  email: string;
  address: string;
  commercial_register: string;
  currency: string;
}

interface WarningData {
  documentNumber: string;
  date: string;
  deadlineDate: string;
  customer: DelinquentCustomer;
  company: CompanyInfo;
  currency: string;
  currencyName: string;
  deadlineDays: number;
  includeBlacklistThreat: boolean;
  additionalNotes?: string;
}

/**
 * قالب الإنذار الأولي (تنبيه)
 */
function generateInitialWarningTemplate(data: WarningData): string {
  const { documentNumber, date, deadlineDate, customer, company, currency, currencyName, deadlineDays } = data;
  
  return `
══════════════════════════════════════════════════════════════════
                         تنبيه أولي بالسداد
══════════════════════════════════════════════════════════════════

رقم الوثيقة: ${documentNumber}
التاريخ: ${date}

من: ${company.name_ar}
     ${company.address}
     هاتف: ${company.phone}
     بريد: ${company.email}

إلى السيد/السيدة: ${customer.customer_name}
رقم العميل: ${customer.customer_code}
${customer.phone ? `هاتف: ${customer.phone}` : ''}

══════════════════════════════════════════════════════════════════
                         الموضوع: تنبيه ودي بسداد المستحقات
══════════════════════════════════════════════════════════════════

تحية طيبة وبعد،

نود تذكيركم بوجود مستحقات مالية متأخرة تتعلق بعقد الإيجار رقم (${customer.contract_number}) 
للمركبة ذات اللوحة (${customer.vehicle_plate || 'غير محدد'}).

┌─────────────────────────────────────────────────────────────────┐
│                      تفاصيل المستحقات                          │
├─────────────────────────────────────────────────────────────────┤
│  الإيجارات المتأخرة:          ${customer.overdue_amount.toLocaleString()} ${currency}
│  غرامات التأخير:              ${customer.late_penalty.toLocaleString()} ${currency}
│  المخالفات المرورية:          ${customer.violations_amount.toLocaleString()} ${currency} (${customer.violations_count} مخالفة)
├─────────────────────────────────────────────────────────────────┤
│  الإجمالي المستحق:            ${customer.total_debt.toLocaleString()} ${currencyName}
│  أيام التأخير:                ${customer.days_overdue} يوم
└─────────────────────────────────────────────────────────────────┘

نأمل منكم التكرم بسداد المبلغ المستحق خلال (${deadlineDays}) أيام من تاريخ هذا التنبيه،
أي في موعد أقصاه: ${deadlineDate}

للاستفسار أو ترتيب جدول سداد، يرجى التواصل معنا على:
- هاتف: ${company.phone}
- بريد إلكتروني: ${company.email}

نقدر تعاونكم المستمر ونتطلع لاستمرار العلاقة الطيبة معكم.

مع خالص التحية والتقدير،

${company.name_ar}
إدارة التحصيل

══════════════════════════════════════════════════════════════════
`.trim();
}

/**
 * قالب الإنذار الرسمي
 */
function generateFormalWarningTemplate(data: WarningData): string {
  const { documentNumber, date, deadlineDate, customer, company, currency, currencyName, deadlineDays, includeBlacklistThreat } = data;
  
  return `
══════════════════════════════════════════════════════════════════
                      إنذار رسمي بالسداد
══════════════════════════════════════════════════════════════════

رقم الإنذار: ${documentNumber}
التاريخ: ${date}
الحالة: عاجل

══════════════════════════════════════════════════════════════════

من: ${company.name_ar}
     السجل التجاري: ${company.commercial_register}
     ${company.address}
     هاتف: ${company.phone} | بريد: ${company.email}

إلى السيد/السيدة: ${customer.customer_name}
رقم العميل: ${customer.customer_code}
${customer.phone ? `هاتف: ${customer.phone}` : ''}
${customer.email ? `بريد: ${customer.email}` : ''}

══════════════════════════════════════════════════════════════════
         الموضوع: إنذار رسمي بسداد المستحقات المتأخرة
══════════════════════════════════════════════════════════════════

السيد/السيدة ${customer.customer_name} المحترم/ة،

السلام عليكم ورحمة الله وبركاته،

بالإشارة إلى عقد الإيجار المبرم بيننا والمرقم (${customer.contract_number}) 
والخاص بالمركبة ذات اللوحة رقم (${customer.vehicle_plate || 'غير محدد'})،

نفيدكم بأنه قد تراكمت عليكم مستحقات مالية متأخرة السداد وفقاً للتفصيل التالي:

┌─────────────────────────────────────────────────────────────────┐
│                    بيان المستحقات المالية                       │
├────────────────────────────────┬────────────────────────────────┤
│  البند                         │  المبلغ                        │
├────────────────────────────────┼────────────────────────────────┤
│  الإيجارات الشهرية المتأخرة    │  ${customer.overdue_amount.toLocaleString()} ${currency}              │
│  غرامات التأخير (0.1% يومياً)  │  ${customer.late_penalty.toLocaleString()} ${currency}              │
│  المخالفات المرورية            │  ${customer.violations_amount.toLocaleString()} ${currency} (${customer.violations_count} مخالفة)    │
├────────────────────────────────┼────────────────────────────────┤
│  الإجمالي المستحق              │  ${customer.total_debt.toLocaleString()} ${currencyName}         │
└────────────────────────────────┴────────────────────────────────┘

   ⚠️  مدة التأخير: ${customer.days_overdue} يوم
   ⚠️  درجة المخاطر: ${customer.risk_score}/100

══════════════════════════════════════════════════════════════════
                         المهلة النهائية
══════════════════════════════════════════════════════════════════

نمهلكم مدة (${deadlineDays}) أيام من تاريخ هذا الإنذار لسداد كامل المبلغ المستحق،
وذلك في موعد أقصاه:

                    ★★★ ${deadlineDate} ★★★

══════════════════════════════════════════════════════════════════
                الإجراءات في حال عدم السداد
══════════════════════════════════════════════════════════════════

في حال عدم السداد خلال المهلة المحددة، سنضطر لاتخاذ الإجراءات التالية:

1. رفع دعوى قضائية لتحصيل المستحقات أمام المحاكم المختصة
2. تحميلكم كافة المصاريف القانونية والقضائية
3. المطالبة بالتعويضات المناسبة عن الأضرار
${includeBlacklistThreat ? '4. إضافة اسمكم إلى القائمة السوداء لشركات التأجير في الدولة' : ''}
${includeBlacklistThreat ? '5. إبلاغ الجهات الائتمانية المختصة' : ''}

══════════════════════════════════════════════════════════════════
                      دعوة للتواصل
══════════════════════════════════════════════════════════════════

نحرص على حل هذا الأمر ودياً، ونرحب بتواصلكم معنا لترتيب جدول سداد مناسب.

للتواصل:
- هاتف: ${company.phone}
- بريد إلكتروني: ${company.email}
- العنوان: ${company.address}

هذا الإنذار يعتبر حجة قانونية أمام الجهات المختصة.

مع التحية،

_______________________
${company.name_ar}
إدارة الشؤون القانونية والتحصيل
التاريخ: ${date}

══════════════════════════════════════════════════════════════════
`.trim();
}

/**
 * قالب الإنذار النهائي (ما قبل القضية)
 */
function generateFinalWarningTemplate(data: WarningData): string {
  const { documentNumber, date, deadlineDate, customer, company, currency, currencyName, deadlineDays } = data;
  
  return `
██████████████████████████████████████████████████████████████████
█                                                                █
█                    ⚠️  إنذار نهائي  ⚠️                        █
█                    قبل اتخاذ الإجراءات القانونية               █
█                                                                █
██████████████████████████████████████████████████████████████████

رقم الإنذار: ${documentNumber}
التاريخ: ${date}
الحالة: ⚠️ عاجل جداً - نهائي ⚠️

══════════════════════════════════════════════════════════════════

من: ${company.name_ar}
     السجل التجاري: ${company.commercial_register}
     ${company.address}
     هاتف: ${company.phone} | بريد: ${company.email}

إلى السيد/السيدة: ${customer.customer_name}
رقم العميل: ${customer.customer_code}
${customer.phone ? `هاتف: ${customer.phone}` : ''}

══════════════════════════════════════════════════════════════════
   ⛔ الموضوع: إنذار نهائي قبل رفع الدعوى القضائية ⛔
══════════════════════════════════════════════════════════════════

السيد/السيدة ${customer.customer_name}،

بالإشارة إلى الإنذارات السابقة المرسلة إليكم بخصوص المستحقات المتأخرة،
والتي لم يتم الاستجابة لها حتى تاريخه،

نفيدكم بأن هذا هو الإنذار الأخير قبل اتخاذ الإجراءات القانونية.

══════════════════════════════════════════════════════════════════
                    ⚠️ المستحقات المتراكمة ⚠️
══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│  رقم العقد: ${customer.contract_number}
│  لوحة المركبة: ${customer.vehicle_plate || 'غير محدد'}
│  
│  ═══════════════════════════════════════════════════════════════
│  
│  الإيجارات المتأخرة:          ${customer.overdue_amount.toLocaleString()} ${currency}
│  غرامات التأخير المتراكمة:    ${customer.late_penalty.toLocaleString()} ${currency}
│  المخالفات المرورية:          ${customer.violations_amount.toLocaleString()} ${currency}
│  
│  ═══════════════════════════════════════════════════════════════
│  
│  ⚠️ الإجمالي المستحق:         ${customer.total_debt.toLocaleString()} ${currencyName}
│  ⚠️ مدة التأخير:              ${customer.days_overdue} يوم
│  ⚠️ درجة المخاطر:             ${customer.risk_score}/100 (حرج)
│  
└─────────────────────────────────────────────────────────────────┘

██████████████████████████████████████████████████████████████████
█                     ⏰ المهلة الأخيرة ⏰                        █
██████████████████████████████████████████████████████████████████

                نمهلكم (${deadlineDays}) أيام فقط

              الموعد النهائي: ${deadlineDate}

██████████████████████████████████████████████████████████████████

══════════════════════════════════════════════════════════════════
            ⛔ الإجراءات التي سيتم اتخاذها فوراً ⛔
══════════════════════════════════════════════════════════════════

في حال عدم السداد بحلول الموعد المحدد أعلاه، سيتم:

1. ✗ رفع دعوى قضائية فورية أمام المحاكم المختصة
2. ✗ المطالبة بكامل المستحقات + المصاريف القانونية (10% من المبلغ)
3. ✗ المطالبة برسوم المحكمة والتنفيذ
4. ✗ إضافة اسمكم للقائمة السوداء في جميع شركات التأجير
5. ✗ إبلاغ مؤسسات الائتمان والتصنيف الائتماني
6. ✗ اتخاذ كافة الإجراءات القانونية المتاحة

══════════════════════════════════════════════════════════════════
                      الفرصة الأخيرة
══════════════════════════════════════════════════════════════════

هذه فرصتكم الأخيرة لتسوية هذا الأمر ودياً.
للتواصل الفوري:

📞 هاتف: ${company.phone}
📧 بريد: ${company.email}
📍 العنوان: ${company.address}

══════════════════════════════════════════════════════════════════

هذا الإنذار يعد حجة قانونية رسمية ويحق لنا استخدامه
أمام جميع الجهات القضائية والرسمية.

صدر بتاريخ: ${date}

_______________________
${company.name_ar}
الإدارة القانونية

██████████████████████████████████████████████████████████████████
`.trim();
}

/**
 * توليد الإنذار من القالب المناسب
 */
function generateWarningFromTemplate(
  warningLevel: 'initial' | 'formal' | 'final',
  data: WarningData
): string {
  switch (warningLevel) {
    case 'initial':
      return generateInitialWarningTemplate(data);
    case 'final':
      return generateFinalWarningTemplate(data);
    case 'formal':
    default:
      return generateFormalWarningTemplate(data);
  }
}

/**
 * Hook for generating legal warnings using templates (fast & reliable)
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
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('فشل في جلب بيانات المستخدم');
      }

      // Get company information
      const { data: company } = await supabase
        .from('companies')
        .select('name_ar, name, phone, email, address, commercial_register, currency')
        .eq('id', profile.company_id)
        .single();
      
      const companyCurrency = (company?.currency || 'QAR').toUpperCase();
      const currencyName = CURRENCY_NAMES[companyCurrency] || 'ريال قطري';

      // Generate document number
      const timestamp = Date.now().toString().slice(-6);
      const documentNumber = `WRN-${new Date().getFullYear()}-${timestamp}`;

      // Calculate dates
      const today = new Date();
      const deadline = new Date(today);
      deadline.setDate(deadline.getDate() + deadlineDays);

      const dateFormatter = new Intl.DateTimeFormat('ar-QA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });

      // Determine warning level based on risk score
      let warningLevel: 'initial' | 'formal' | 'final' = warningType;
      if (delinquentCustomer.risk_score >= 85 || delinquentCustomer.days_overdue > 120) {
        warningLevel = 'final';
      } else if (delinquentCustomer.risk_score >= 70 || delinquentCustomer.days_overdue > 90) {
        warningLevel = 'formal';
      }

      // Prepare template data
      const templateData: WarningData = {
        documentNumber,
        date: dateFormatter.format(today),
        deadlineDate: dateFormatter.format(deadline),
        customer: delinquentCustomer,
        company: {
          name_ar: company?.name_ar || 'شركة العراف لتأجير السيارات',
          phone: company?.phone || '',
          email: company?.email || '',
          address: company?.address || '',
          commercial_register: company?.commercial_register || '',
          currency: companyCurrency
        },
        currency: companyCurrency,
        currencyName,
        deadlineDays,
        includeBlacklistThreat,
        additionalNotes
      };

      // Generate content from template (instant!)
      const generatedContent = generateWarningFromTemplate(warningLevel, templateData);

      // Get urgency text for title
      const urgencyTexts = {
        initial: 'تنبيه أولي',
        formal: 'إنذار رسمي',
        final: 'إنذار نهائي'
      };

      // Save to legal_documents table
      const { data: document, error: docError } = await supabase
        .from('legal_documents')
        .insert({
          company_id: profile.company_id,
          customer_id: delinquentCustomer.customer_id,
          document_number: documentNumber,
          document_type: 'legal_warning',
          document_title: `${urgencyTexts[warningLevel]} - ${delinquentCustomer.customer_name}`,
          content: generatedContent,
          country_law: 'qatar',
          status: 'draft',
          created_by: user.id,
          metadata: {
            template_type: warningLevel,
            delinquent_data: {
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
            generation_method: 'template',
            generated_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (docError) {
        console.error('Document save error:', docError);
        throw new Error('فشل في حفظ الوثيقة');
      }

      return {
        id: document.id,
        document_number: documentNumber,
        content: generatedContent,
        customer_id: delinquentCustomer.customer_id,
        customer_name: delinquentCustomer.customer_name,
        warning_type: warningLevel.toUpperCase(),
        created_at: document.created_at
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      
      toast.success('تم إنشاء الإنذار القانوني بنجاح ⚡', {
        description: `رقم الوثيقة: ${data.document_number}`,
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error('Error generating legal warning:', error);
      toast.error('حدث خطأ أثناء إنشاء الإنذار', {
        description: error.message || 'يرجى المحاولة مرة أخرى',
      });
    },
  });
};

/**
 * Hook for bulk warning generation
 */
export const useBulkGenerateLegalWarnings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { warnings: GeneratedWarning[] }) => {
      return params.warnings;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      toast.success(`تم إنشاء ${data.length} إنذار بنجاح ⚡`);
    },
    onError: (error: Error) => {
      console.error('Error in bulk warning generation:', error);
      toast.error('حدث خطأ أثناء العملية الجماعية');
    },
  });
};
