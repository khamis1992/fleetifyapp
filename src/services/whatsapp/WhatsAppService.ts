/**
 * خدمة واتساب باستخدام Ultramsg
 * WhatsApp Service using Ultramsg API
 */

import type { 
  UltramsgConfig, 
  UltramsgResponse, 
  WhatsAppRecipient,
  MessageStatus 
} from './types';

class WhatsAppService {
  private config: UltramsgConfig | null = null;
  private baseUrl = 'https://api.ultramsg.com';

  /**
   * تهيئة الخدمة بإعدادات Ultramsg
   */
  initialize(config: UltramsgConfig): void {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || this.baseUrl,
    };
  }

  /**
   * التحقق من تهيئة الخدمة
   */
  private ensureInitialized(): void {
    if (!this.config) {
      throw new Error('WhatsApp service not initialized. Call initialize() first.');
    }
  }

  /**
   * التحقق من حالة التهيئة
   */
  isInitialized(): boolean {
    return this.config !== null;
  }

  /**
   * تنسيق رقم الهاتف للواتساب
   */
  private formatPhoneNumber(phone: string): string {
    // إزالة المسافات والرموز
    let formatted = phone.replace(/[\s\-\(\)]/g, '');
    
    // إذا بدأ بـ 00 نستبدله بـ +
    if (formatted.startsWith('00')) {
      formatted = '+' + formatted.slice(2);
    }
    
    // إذا لم يبدأ بـ + نضيفها (بافتراض رقم قطري)
    if (!formatted.startsWith('+')) {
      // إذا بدأ بـ 974 نضيف +
      if (formatted.startsWith('974')) {
        formatted = '+' + formatted;
      } else {
        // نفترض رقم قطري
        formatted = '+974' + formatted;
      }
    }
    
    return formatted;
  }

  /**
   * إرسال رسالة نصية
   */
  async sendTextMessage(
    phone: string, 
    message: string
  ): Promise<UltramsgResponse> {
    this.ensureInitialized();
    
    const formattedPhone = this.formatPhoneNumber(phone);
    
    try {
      const response = await fetch(
        `${this.config!.baseUrl}/${this.config!.instanceId}/messages/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: this.config!.token,
            to: formattedPhone,
            body: message,
          }),
        }
      );

      const data = await response.json();
      
      if (data.sent === 'true' || data.sent === true) {
        return {
          sent: true,
          id: data.id,
          message: 'Message sent successfully',
        };
      } else {
        return {
          sent: false,
          error: data.error || 'Failed to send message',
        };
      }
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return {
        sent: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * إرسال رسالة مع صورة
   */
  async sendImageMessage(
    phone: string,
    imageUrl: string,
    caption?: string
  ): Promise<UltramsgResponse> {
    this.ensureInitialized();
    
    const formattedPhone = this.formatPhoneNumber(phone);
    
    try {
      const response = await fetch(
        `${this.config!.baseUrl}/${this.config!.instanceId}/messages/image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: this.config!.token,
            to: formattedPhone,
            image: imageUrl,
            caption: caption || '',
          }),
        }
      );

      const data = await response.json();
      
      return {
        sent: data.sent === 'true' || data.sent === true,
        id: data.id,
        error: data.error,
      };
    } catch (error) {
      return {
        sent: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * إرسال مستند PDF
   */
  async sendDocumentMessage(
    phone: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<UltramsgResponse> {
    this.ensureInitialized();
    
    const formattedPhone = this.formatPhoneNumber(phone);
    
    try {
      const response = await fetch(
        `${this.config!.baseUrl}/${this.config!.instanceId}/messages/document`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: this.config!.token,
            to: formattedPhone,
            document: documentUrl,
            filename: filename,
            caption: caption || '',
          }),
        }
      );

      const data = await response.json();
      
      return {
        sent: data.sent === 'true' || data.sent === true,
        id: data.id,
        error: data.error,
      };
    } catch (error) {
      return {
        sent: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * إرسال رسالة لمجموعة من المستلمين
   */
  async sendBulkMessage(
    recipients: WhatsAppRecipient[],
    message: string
  ): Promise<Map<string, UltramsgResponse>> {
    const results = new Map<string, UltramsgResponse>();
    
    // إرسال بالتتابع مع تأخير لتجنب الحظر
    for (const recipient of recipients) {
      if (!recipient.isActive) continue;
      
      const result = await this.sendTextMessage(recipient.phone, message);
      results.set(recipient.id, result);
      
      // تأخير 1 ثانية بين الرسائل
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  /**
   * التحقق من حالة الرقم (مسجل في واتساب أم لا)
   */
  async checkNumberStatus(phone: string): Promise<{
    valid: boolean;
    registered: boolean;
  }> {
    this.ensureInitialized();
    
    const formattedPhone = this.formatPhoneNumber(phone);
    
    try {
      const response = await fetch(
        `${this.config!.baseUrl}/${this.config!.instanceId}/contacts/check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: this.config!.token,
            chatId: formattedPhone.replace('+', '') + '@c.us',
          }),
        }
      );

      const data = await response.json();
      
      return {
        valid: true,
        registered: data.status === 'valid',
      };
    } catch (error) {
      return {
        valid: false,
        registered: false,
      };
    }
  }

  /**
   * الحصول على حالة الاتصال
   */
  async getConnectionStatus(): Promise<{
    connected: boolean;
    phone?: string;
  }> {
    this.ensureInitialized();
    
    try {
      const response = await fetch(
        `${this.config!.baseUrl}/${this.config!.instanceId}/instance/status?token=${this.config!.token}`
      );

      const data = await response.json();
      
      return {
        connected: data.status?.accountStatus?.status === 'authenticated',
        phone: data.status?.accountStatus?.pushname,
      };
    } catch (error) {
      return {
        connected: false,
      };
    }
  }

  /**
   * إرسال رسالة اختبار
   */
  async sendTestMessage(phone: string): Promise<UltramsgResponse> {
    const testMessage = `
✅ *رسالة اختبار من Fleetify*

هذه رسالة اختبار للتأكد من إعدادات واتساب.
تم الإرسال بنجاح! 🎉

━━━━━━━━━━━━━━━━━━━
🕐 الوقت: ${new Date().toLocaleString('ar-QA')}
━━━━━━━━━━━━━━━━━━━
    `.trim();
    
    return this.sendTextMessage(phone, testMessage);
  }
}

// تصدير instance واحدة
export const whatsAppService = new WhatsAppService();

export default WhatsAppService;

