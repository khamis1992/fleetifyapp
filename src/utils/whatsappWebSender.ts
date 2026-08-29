import { supabase } from '@/integrations/supabase/client';

export interface SendWhatsAppParams {
  phone: string;
  message: string;
  customerName?: string;
  companyId: string;
  purpose:
    | 'legal_case_notice'
    | 'traffic_violation_reminder'
    | 'verification_task'
    | 'verification_complete'
    | 'payment_reminder_manual'
    | 'payment_reminder_test';
  entityType: 'legal_case' | 'customer' | 'employee' | 'verification_task' | 'contract' | 'company';
  entityId: string;
  requestId?: string;
}

export const formatPhoneForWhatsApp = (phone: string): string => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  if (!cleaned.startsWith('974') && cleaned.length === 8) cleaned = '974' + cleaned;
  return cleaned;
};

export const sendWhatsAppMessage = async ({
  phone,
  message,
  companyId,
  purpose,
  entityType,
  entityId,
  requestId = crypto.randomUUID(),
}: SendWhatsAppParams): Promise<{ success: boolean; error?: string; messageId?: string }> => {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  if (!/^974[3-7]\d{7}$/.test(formattedPhone)) {
    return { success: false, error: 'رقم الهاتف غير صحيح' };
  }
  if (!companyId || !purpose || !entityType || !entityId || !message.trim()) {
    return { success: false, error: 'بيانات أمر الإرسال غير مكتملة' };
  }
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp-reminders', {
      body: {
        phone: formattedPhone,
        message,
        companyId,
        purpose,
        entityType,
        entityId,
        requestId,
      },
    });
    if (error || !data?.success) {
      return { success: false, error: data?.error || error?.message || 'فشل في إرسال الرسالة' };
    }
    return { success: true, messageId: data.messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ في الاتصال',
    };
  }
};

export const sendWhatsAppDocument = async (): Promise<{
  success: boolean;
  error?: string;
  messageId?: string;
}> => ({
  success: false,
  error: 'إرسال مستندات واتساب القديم متوقف حتى توفير مسار تسليم مدقق وخاص.',
});

export const sendWhatsAppImage = async (): Promise<{
  success: boolean;
  error?: string;
  messageId?: string;
}> => ({
  success: false,
  error: 'إرسال صور واتساب القديم متوقف حتى توفير مسار تسليم مدقق وخاص.',
});

export const sendBulkWhatsAppMessages = async (
  messages: SendWhatsAppParams[],
  delayMs = 2000,
): Promise<{ sent: number; failed: number; total: number; errors: string[] }> => {
  let sent = 0;
  const errors: string[] = [];
  for (let index = 0; index < messages.length; index += 1) {
    const result = await sendWhatsAppMessage(messages[index]);
    if (result.success) sent += 1;
    else errors.push(`${messages[index].customerName || 'المستلم'}: ${result.error || 'فشل الإرسال'}`);
    if (index < messages.length - 1 && delayMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
  }
  return { sent, failed: messages.length - sent, total: messages.length, errors };
};

export const generateWhatsAppMessage = (
  template: string,
  variables: {
    customerName?: string;
    contractNumber?: string;
    invoiceNumber?: string;
    amount?: number;
    dueDate?: string;
    companyName?: string;
  }
): string => {
  let message = template;
  
  // Replace variables
  if (variables.customerName) {
    message = message.replace(/\{customerName\}/g, variables.customerName);
  }
  if (variables.contractNumber) {
    message = message.replace(/\{contractNumber\}/g, variables.contractNumber);
  }
  if (variables.invoiceNumber) {
    message = message.replace(/\{invoiceNumber\}/g, variables.invoiceNumber);
  }
  if (variables.amount) {
    message = message.replace(/\{amount\}/g, variables.amount.toString());
  }
  if (variables.dueDate) {
    message = message.replace(/\{dueDate\}/g, variables.dueDate);
  }
  if (variables.companyName) {
    message = message.replace(/\{companyName\}/g, variables.companyName);
  }
  
  return message;
};

/**
 * Company name for messages
 */
const COMPANY_NAME = 'شركة العراف لتأجير السيارات';

/**
 * Daily late fee amount in QAR
 */
const DAILY_LATE_FEE = 120;

/**
 * Default message templates - Professional Arabic templates
 * Schedule:
 * - Day 28: Pre-due reminder (3 days before due date on 1st)
 * - Day 2: Overdue + late fee notice
 * - Day 5: Final warning
 * - Day 10: Legal action notice
 */
export const defaultTemplates = {
  // تذكير عام
  general: (name: string, contractNumber: string) => 
`السلام عليكم ورحمة الله وبركاته

${name} الكريم،

نتمنى أن تكونوا بخير وعافية.

هذه رسالة تذكيرية بخصوص عقدكم رقم: ${contractNumber}

نحن في ${COMPANY_NAME} نقدّر تعاملكم الكريم معنا، ونحرص على تقديم أفضل الخدمات لكم.

في حال وجود أي استفسار، يسعدنا تواصلكم معنا.

مع خالص التحية والتقدير،
${COMPANY_NAME}`,

  // يوم 28 - تذكير مسبق (قبل الاستحقاق بـ 3 أيام)
  pre_due: (name: string, invoiceNumber: string, amount: number, dueDate: string) =>
`السلام عليكم ورحمة الله وبركاته

${name} الكريم،

نود تذكيركم بأن موعد سداد الإيجار الشهري سيحين يوم 1 من الشهر القادم.

━━━━━━━━━━━━━━━━━━
📋 رقم العقد: ${invoiceNumber}
💰 المبلغ المستحق: ${amount.toLocaleString()} ر.ق
📅 تاريخ الاستحقاق: اليوم الأول من الشهر
━━━━━━━━━━━━━━━━━━

⚠️ تنويه هام:
في حال التأخر عن السداد، سيتم احتساب غرامة تأخير بقيمة ${DAILY_LATE_FEE} ر.ق عن كل يوم تأخير.

نأمل منكم التكرم بترتيب السداد في الموعد المحدد لتجنب أي رسوم إضافية.

شاكرين لكم حسن تعاونكم،
${COMPANY_NAME}`,

  // يوم 2 - إشعار تأخر مع غرامة
  due_date: (name: string, invoiceNumber: string, amount: number) =>
`السلام عليكم ورحمة الله وبركاته

${name} الكريم،

⚠️ إشعار تأخر سداد

نفيدكم بأنه لم يتم سداد قيمة الإيجار المستحق في موعده.

━━━━━━━━━━━━━━━━━━
📋 رقم العقد: ${invoiceNumber}
💰 المبلغ الأصلي: ${amount.toLocaleString()} ر.ق
⏰ الحالة: متأخر عن السداد
━━━━━━━━━━━━━━━━━━

🔴 تم تطبيق غرامة التأخير:
• غرامة يومية: ${DAILY_LATE_FEE} ر.ق عن كل يوم تأخير
• تبدأ الغرامة من تاريخ الاستحقاق (يوم 1)

يرجى تسوية قيمة الإيجار في أقرب وقت ممكن لتجنب تراكم غرامات التأخير.

للتواصل والسداد:
${COMPANY_NAME}`,

  // يوم 5 - إنذار نهائي
  overdue: (name: string, invoiceNumber: string, amount: number) =>
`السلام عليكم ورحمة الله وبركاته

${name} الكريم،

🚨 إنذار نهائي

بالإشارة إلى رسائلنا السابقة بخصوص الإيجار المتأخر، وحيث لم يتم السداد حتى تاريخه:

━━━━━━━━━━━━━━━━━━
📋 رقم العقد: ${invoiceNumber}
💰 المبلغ الأصلي: ${amount.toLocaleString()} ر.ق
💸 غرامة التأخير: ${DAILY_LATE_FEE * 5} ر.ق (5 أيام × ${DAILY_LATE_FEE})
💵 الإجمالي المستحق: ${(amount + DAILY_LATE_FEE * 5).toLocaleString()} ر.ق
⚠️ الحالة: إنذار نهائي
━━━━━━━━━━━━━━━━━━

⚠️ تنبيه هام:
في حال عدم السداد خلال 5 أيام من تاريخ هذه الرسالة:
• سيتم تحويل الملف للشؤون القانونية
• سيتم اتخاذ الإجراءات القانونية اللازمة
• ستتحمل كافة التكاليف القانونية الإضافية

نأمل تفادي هذه الإجراءات بالتواصل الفوري معنا.

${COMPANY_NAME}
قسم التحصيل`,

  // يوم 10 - إشعار الإجراءات القانونية
  escalation: (name: string, invoiceNumber: string, amount: number) =>
`السلام عليكم ورحمة الله وبركاته

${name} الكريم،

⚖️ إشعار اتخاذ إجراءات قانونية

نفيدكم بأنه نظراً لعدم الاستجابة لمراسلاتنا المتكررة بخصوص المبالغ المتأخرة:

━━━━━━━━━━━━━━━━━━
📋 رقم العقد: ${invoiceNumber}
💰 المبلغ الأصلي: ${amount.toLocaleString()} ر.ق
💸 غرامة التأخير: ${DAILY_LATE_FEE * 10} ر.ق (10 أيام × ${DAILY_LATE_FEE})
💵 الإجمالي المستحق: ${(amount + DAILY_LATE_FEE * 10).toLocaleString()} ر.ق
━━━━━━━━━━━━━━━━━━

🔴 تم اتخاذ الإجراءات القانونية التالية:
• تحويل الملف للشؤون القانونية ✓
• إعداد ملف الدعوى القضائية ✓
• التنسيق مع الجهات المختصة ✓

📌 ملاحظة:
• ستتحمل كافة التكاليف القانونية وأتعاب المحاماة
• سيتم المطالبة بكامل المستحقات والغرامات
• قد يؤثر ذلك على سجلك الائتماني

في حال الرغبة بالتسوية الودية، يرجى التواصل الفوري معنا.

${COMPANY_NAME}
الشؤون القانونية`,
};
