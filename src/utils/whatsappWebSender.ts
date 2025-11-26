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

// Storage key for Ultramsg settings
const ULTRAMSG_CONFIG_KEY = 'ultramsg_config';

/**
 * Get Ultramsg configuration from localStorage
 */
export const getUltramsgConfig = (): UltramsgConfig | null => {
  try {
    const config = localStorage.getItem(ULTRAMSG_CONFIG_KEY);
    if (config) {
      return JSON.parse(config);
    }
  } catch (error) {
    console.error('Error reading Ultramsg config:', error);
  }
  return null;
};

/**
 * Save Ultramsg configuration to localStorage
 */
export const saveUltramsgConfig = (config: UltramsgConfig): void => {
  try {
    localStorage.setItem(ULTRAMSG_CONFIG_KEY, JSON.stringify(config));
    console.log('✅ Ultramsg config saved successfully');
  } catch (error) {
    console.error('Error saving Ultramsg config:', error);
  }
};

/**
 * Clear Ultramsg configuration
 */
export const clearUltramsgConfig = (): void => {
  localStorage.removeItem(ULTRAMSG_CONFIG_KEY);
};

/**
 * Check if Ultramsg is configured
 */
export const isUltramsgConfigured = (): boolean => {
  const config = getUltramsgConfig();
  return !!(config?.instanceId && config?.token);
};

/**
 * Format phone number for WhatsApp
 * Removes all non-digit characters and ensures international format
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
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
  
  try {
    const response = await fetch(`https://api.ultramsg.com/${config.instanceId}/messages/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: config.token,
        to: formattedPhone,
        body: message,
      }),
    });

    const data: UltramsgResponse = await response.json();
    
    if (data.sent === 'true' || data.sent === true as any) {
      console.log(`✅ WhatsApp message sent to ${customerName || phone}:`, {
        messageId: data.id,
        phone: formattedPhone,
      });
      return { success: true, messageId: data.id };
    } else {
      console.error(`❌ Failed to send WhatsApp to ${customerName || phone}:`, data);
      return { 
        success: false, 
        error: data.error || data.message || 'فشل في إرسال الرسالة' 
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'خطأ في الاتصال';
    console.error(`❌ Network error sending WhatsApp to ${customerName || phone}:`, error);
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
 * Default message templates
 */
export const defaultTemplates = {
  general: (name: string, contractNumber: string) => 
    `مرحباً ${name} 👋\n\nتذكير ودي بخصوص عقدك رقم ${contractNumber}.\n\nنأمل التواصل في حال وجود أي استفسار.\n\nشكراً لتعاونكم 🙏`,
  
  pre_due: (name: string, invoiceNumber: string, amount: number, dueDate: string) =>
    `مرحباً ${name} 👋\n\nتذكير ودي: فاتورتك رقم ${invoiceNumber} بمبلغ ${amount} ر.ق ستستحق يوم ${dueDate}.\n\nشكراً لتعاونكم 🙏`,
  
  due_date: (name: string, invoiceNumber: string, amount: number) =>
    `عزيزي العميل ${name} 👋\n\nتذكير: فاتورتك رقم ${invoiceNumber} بمبلغ ${amount} ر.ق مستحقة اليوم.\n\nنأمل سرعة السداد. شكراً 🙏`,
  
  overdue: (name: string, invoiceNumber: string, amount: number) =>
    `عزيزي العميل ${name} ⚠️\n\nتنبيه هام: فاتورتك رقم ${invoiceNumber} متأخرة.\nالمبلغ: ${amount} ر.ق + غرامات التأخير.\n\nيرجى السداد فوراً لتجنب الإجراءات القانونية. 🚨`,
  
  escalation: (name: string, invoiceNumber: string, amount: number) =>
    `عزيزي العميل ${name} 🚨\n\nإنذار نهائي: فاتورتك رقم ${invoiceNumber} متأخرة بشكل كبير.\n\nسيتم اتخاذ إجراءات قانونية خلال 48 ساعة في حالة عدم السداد.\n\nالمبلغ المستحق: ${amount} ر.ق`,
};
