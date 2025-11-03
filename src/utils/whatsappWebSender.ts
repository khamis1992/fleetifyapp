/**
 * WhatsApp Web Sender Utility
 * ============================
 * Purpose: Send WhatsApp messages directly from browser using WhatsApp Web API
 * Type: Client-side solution (no backend needed)
 * Advantage: Works immediately without Ultramsg or Edge Functions
 * Limitation: Opens WhatsApp Web tabs for each message
 */

interface SendWhatsAppParams {
  phone: string;
  message: string;
  customerName?: string;
}

/**
 * Format phone number for WhatsApp Web
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
 * Send single WhatsApp message via WhatsApp Web
 * Opens WhatsApp Web in new tab with pre-filled message
 */
export const sendWhatsAppMessage = ({ phone, message, customerName }: SendWhatsAppParams): void => {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
  
  // Open in new tab
  window.open(whatsappUrl, '_blank');
  
  console.log(`📤 WhatsApp Web opened for ${customerName || phone}:`, {
    originalPhone: phone,
    formattedPhone,
    messageLength: message.length,
  });
};

/**
 * Send multiple WhatsApp messages with delay
 * Opens tabs sequentially with delay to avoid overwhelming the browser
 */
export const sendBulkWhatsAppMessages = async (
  messages: SendWhatsAppParams[],
  delayMs: number = 2000
): Promise<{ sent: number; total: number }> => {
  let sentCount = 0;
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    try {
      sendWhatsAppMessage(msg);
      sentCount++;
      
      // Log progress
      console.log(`📨 Progress: ${i + 1}/${messages.length} - ${msg.customerName || msg.phone}`);
      
      // Wait before next message (except for last one)
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`❌ Failed to open WhatsApp for ${msg.customerName || msg.phone}:`, error);
    }
  }
  
  return {
    sent: sentCount,
    total: messages.length,
  };
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

