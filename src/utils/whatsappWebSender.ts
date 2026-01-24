/**
 * WhatsApp Sender Utility with Ultramsg API
 * ==========================================
 * Purpose: Send WhatsApp messages via Ultramsg API
 * API Documentation: https://docs.ultramsg.com/
 * Dashboard: https://user.ultramsg.com/
 */

interface SendWhatsAppParams {
  phone: string;
  message: string;
  customerName?: string;
}

interface UltramsgConfig {
  instanceId: string;
  token: string;
}

interface UltramsgResponse {
  sent: string;
  message: string;
  id?: string;
  error?: string;
}

// ============================================
// ULTRAMSG FIXED CONFIGURATION - DO NOT CHANGE
// ============================================
const ULTRAMSG_INSTANCE_ID = 'instance148672';
const ULTRAMSG_TOKEN = 'rls3i8flwugsei1j';

// ============================================
// DEBUG: Enable console logging for WhatsApp operations
// ============================================
const ENABLE_DEBUG_LOGS = true;

/**
 * Get Ultramsg configuration (fixed values)
 */
export const getUltramsgConfig = (): UltramsgConfig => {
  return {
    instanceId: ULTRAMSG_INSTANCE_ID,
    token: ULTRAMSG_TOKEN,
  };
};

// ... existing code ...

/**
 * Format phone number for WhatsApp
 * Removes all non-digit characters and ensures international format
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 00, remove it
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  // If doesn't start with country code, assume Qatar (974)
  if (!cleaned.startsWith('974') && cleaned.length === 8) {
    cleaned = '974' + cleaned;
  }
  
  return cleaned;
};

/**
 * Send single WhatsApp message via Ultramsg API
 * https://docs.ultramsg.com/api/post/messages/chat
 */
export const sendWhatsAppMessage = async ({ phone, message, customerName }: SendWhatsAppParams): Promise<{
  success: boolean;
  error?: string;
  messageId?: string;
}> => {
  const config = getUltramsgConfig();
  
  if (!config?.instanceId || !config?.token) {
    console.error('❌ Ultramsg not configured. Please set Instance ID and Token.');
    return { 
      success: false, 
      error: 'Ultramsg غير مُعد. يرجى إدخال Instance ID و Token في الإعدادات.' 
    };
  }

  const formattedPhone = formatPhoneForWhatsApp(phone);
  
  if (ENABLE_DEBUG_LOGS) {
    console.log(`🚀 [WHATSAPP] Attempting to send to ${formattedPhone} (${customerName})`);
    console.log(`📝 [WHATSAPP] Message length: ${message.length}`);
  }

  if (!formattedPhone || formattedPhone.length < 8) {
    console.error(`❌ [WHATSAPP] Invalid phone number: ${phone} -> ${formattedPhone}`);
    return { success: false, error: 'رقم الهاتف غير صحيح' };
  }
  
  try {
    const url = `https://api.ultramsg.com/${config.instanceId}/messages/chat`;
    const body = new URLSearchParams({
      token: config.token,
      to: formattedPhone,
      body: message,
    });

    if (ENABLE_DEBUG_LOGS) {
      console.log(`🌐 [WHATSAPP] POST ${url}`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
    });

    const data: UltramsgResponse = await response.json();
    
    if (ENABLE_DEBUG_LOGS) {
      console.log(`📩 [WHATSAPP] Response:`, data);
    }

    if (data.sent === 'true' || data.sent === true as any) {
      console.log(`✅ [WHATSAPP] Message sent to ${customerName || phone}:`, {
        messageId: data.id,
        phone: formattedPhone,
      });
      return { success: true, messageId: data.id };
    } else {
      console.error(`❌ [WHATSAPP] Failed to send to ${customerName || phone}:`, data);
      return { 
        success: false, 
        error: data.error || data.message || 'فشل في إرسال الرسالة' 
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'خطأ في الاتصال';
    console.error(`❌ [WHATSAPP] Network error sending to ${customerName || phone}:`, error);
    return { success: false, error: errorMessage };
  }
};

/**
 * Send multiple WhatsApp messages with delay
 */
export const sendBulkWhatsAppMessages = async (
  messages: SendWhatsAppParams[],
  delayMs: number = 2000
): Promise<{ sent: number; failed: number; total: number; errors: string[] }> => {
  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    try {
      const result = await sendWhatsAppMessage(msg);
      
      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
        errors.push(`${msg.customerName || msg.phone}: ${result.error}`);
      }
      
      // Log progress
      console.log(`📨 Progress: ${i + 1}/${messages.length} - ${msg.customerName || msg.phone} - ${result.success ? '✅' : '❌'}`);
      
      // Wait before next message (except for last one)
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      failedCount++;
      const errorMsg = error instanceof Error ? error.message : 'خطأ غير معروف';
      errors.push(`${msg.customerName || msg.phone}: ${errorMsg}`);
      console.error(`❌ Failed to send to ${msg.customerName || msg.phone}:`, error);
    }
  }
  
  return {
    sent: sentCount,
    failed: failedCount,
    total: messages.length,
    errors,
  };
};

/**
 * Test Ultramsg connection by sending a test message
 */
export const testUltramsgConnection = async (testPhone: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  return sendWhatsAppMessage({
    phone: testPhone,
    message: '✅ رسالة اختبار من نظام Fleetify - الاتصال يعمل بنجاح!',
    customerName: 'Test',
  });
};

/**
 * Generate WhatsApp message from template and contract data
 */
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
