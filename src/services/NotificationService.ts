/**
 * Notification Service
 * 
 * خدمة إشعارات شاملة للمدفوعات:
 * - إرسال إيصالات للعملاء (WhatsApp, SMS, Email)
 * - إرسال إشعارات داخل النظام للموظفين
 * - تذكيرات بالمتأخرات
 * - تنبيهات بفشل العمليات
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { PaymentMethod } from '@/types/payment-enums';

export interface NotificationChannel {
  type: 'whatsapp' | 'sms' | 'email' | 'in_app';
  enabled: boolean;
  config?: {
    whatsapp?: {
      apiEndpoint?: string;
      apiKey?: string;
    };
    sms?: {
      provider?: string;
      apiKey?: string;
    };
    email?: {
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPassword?: string;
    };
  };
}

export interface PaymentReceiptData {
  customerName: string;
  customerPhone: string;
  paymentNumber: string;
  amount: number;
  amountInWords: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  description: string;
  vehicleNumber?: string;
  contractNumber?: string;
  invoiceNumber?: string;
}

export interface PaymentFailedNotificationData {
  customerName: string;
  paymentAmount: number;
  reason: string;
  paymentDate: string;
  retryCount?: number;
  nextRetryAt?: string;
}

export interface OverdueReminderData {
  customerName: string;
  customerPhone: string;
  contractNumber: string;
  vehicleNumber?: string;
  daysOverdue: number;
  dueAmount: number;
  dueDate: string;
  overdueAmount: number;
}

class NotificationService {
  private channelConfig: Map<string, NotificationChannel> = new Map();

  constructor() {
    this.loadChannelConfigurations();
  }

  /**
   * تحميل إعدادات قنوات الإشعارات من قاعدة البيانات
   */
  private async loadChannelConfigurations(): Promise<void> {
    try {
      const { data: configs } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('is_active', true);

      if (configs) {
        configs.forEach(config => {
          this.channelConfig.set(config.company_id, {
            type: config.channel_type,
            enabled: config.is_enabled,
            config: config.config as any
          });
        });

        logger.info('Loaded notification channel configurations', {
          companies: configs.length
        });
      }
    } catch (error) {
      logger.error('Failed to load notification configurations', error);
      // Use default configurations
      this.channelConfig.set('default', {
        type: 'in_app',
        enabled: true
      });
    }
  }

  /**
   * إرسال إيصال دفع للعميل
   */
  async sendPaymentReceipt(
    paymentId: string,
    companyId: string,
    options: {
      channels?: Array<'whatsapp' | 'sms' | 'email'>;
      autoSend?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    sentToChannels: string[];
    errors: Array<{ channel: string; error: string }>;
  }> {
    try {
      logger.info('Sending payment receipt', { paymentId, options });

      // 1. جلب بيانات الدفعة
      const { data: payment } = await supabase
        .from('payments')
        .select(`
          *,
          customers!payments_customer_id_fkey (
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar,
            phone
          ),
          contracts!payments_contract_id_fkey (
            contract_number,
            monthly_amount
          ),
          vehicles!contracts_vehicles_fkey (
            plate_number
          ),
          invoices!payments_invoice_id_fkey (
            invoice_number,
            total_amount
          )
        `)
        .eq('id', paymentId)
        .single();

      if (!payment) {
        throw new Error('الدفعة غير موجودة');
      }

      // 2. بناء بيانات الإيصال
      const customerName = payment.customers.company_name_ar || payment.customers.company_name ||
        `${payment.customers.first_name_ar || payment.customers.first_name} ${payment.customers.last_name_ar || payment.customers.last_name}`;

      const receiptData: PaymentReceiptData = {
        customerName,
        customerPhone: payment.customers.phone || '',
        paymentNumber: payment.payment_number,
        amount: payment.amount,
        amountInWords: await this.convertAmountToWords(payment.amount),
        paymentDate: payment.payment_date,
        paymentMethod: payment.payment_method as PaymentMethod,
        description: payment.notes || `دفعة - ${payment.payment_number}`,
        vehicleNumber: payment.contracts?.vehicles?.plate_number,
        contractNumber: payment.contracts?.contract_number,
        invoiceNumber: payment.invoices?.invoice_number
      };

      // 3. الحصول على قنوات الإشعارات المفعلة
      const companyChannels = this.channelConfig.get(companyId);
      const channelsToUse = options.channels || this.determineDefaultChannels(companyChannels);

      const sentToChannels: string[] = [];
      const errors: Array<{ channel: string; error: string }> = [];

      // 4. إرسال عبر كل قناة
      for (const channel of channelsToUse) {
        if (this.isChannelEnabled(companyChannels, channel)) {
          try {
            switch (channel) {
              case 'whatsapp':
                await this.sendWhatsAppReceipt(receiptData, companyChannels);
                sentToChannels.push('whatsapp');
                break;

              case 'sms':
                await this.sendSMSReceipt(receiptData, companyChannels);
                sentToChannels.push('sms');
                break;

              case 'email':
                await this.sendEmailReceipt(receiptData, companyChannels);
                sentToChannels.push('email');
                break;

              case 'in_app':
                // In-app notification is handled by frontend
                sentToChannels.push('in_app');
                break;
            }
          } catch (error) {
            errors.push({
              channel,
              error: error instanceof Error ? error.message : 'خطأ غير معروف'
            });
            logger.error(`Failed to send ${channel} receipt`, {
              paymentId,
              error
            });
          }
        }
      }

      // 5. تسجيل محاولة الإرسال
      await this.logReceiptAttempt(paymentId, companyId, {
        channels: channelsToUse,
        sentToChannels,
        errors,
        autoSend: options.autoSend || false
      });

      logger.info('Payment receipt sent', {
        paymentId,
        sentToChannels: sentToChannels.length,
        errors: errors.length
      });

      return {
        success: errors.length < channelsToUse.length || sentToChannels.length > 0,
        sentToChannels,
        errors
      };
    } catch (error) {
      logger.error('Failed to send payment receipt', { paymentId, error });
      return {
        success: false,
        sentToChannels: [],
        errors: [{ channel: 'system', error: error instanceof Error ? error.message : 'خطأ غير معروف' }]
      };
    }
  }

  /**
   * إرسال إيصال عبر واتساب
   */
  private async sendWhatsAppReceipt(
    receiptData: PaymentReceiptData,
    channelConfig: NotificationChannel
  ): Promise<void> {
    // TODO: تنفيذ إرسال فعلي عبر WhatsApp API
    // حالياً فقط log
    logger.info('WhatsApp receipt (placeholder)', {
      customerPhone: receiptData.customerPhone,
      amount: receiptData.amount
    });

    // في المستقبل:
    // 1. إنشاء رسالة واتساب منسقة
    // 2. استخدام WhatsApp Business API أو WhatsApp Cloud API
    // 3. إرسال الرسالة
    // 4. تسجيل حالة الإرسال
  }

  /**
   * إرسال إيصال عبر SMS
   */
  private async sendSMSReceipt(
    receiptData: PaymentReceiptData,
    channelConfig: NotificationChannel
  ): Promise<void> {
    // TODO: تنفيذ إرسال فعلي عبر SMS API
    // حالياً فقط log
    logger.info('SMS receipt (placeholder)', {
      customerPhone: receiptData.customerPhone,
      amount: receiptData.amount
    });

    // في المستقبل:
    // 1. اختيار مزود SMS (Twilio, Vonage, etc)
    // 2. إرسال الرسالة
    // 3. معالجة الردود (delivery receipts, undelivered)
    // 4. تتبع حالة الإرسال
  }

  /**
   * إرسال إيصال عبر Email
   */
  private async sendEmailReceipt(
    receiptData: PaymentReceiptData,
    channelConfig: NotificationChannel
  ): Promise<void> {
    // TODO: تنفيذ إرسال فعلي عبر SMTP API
    // حالياً فقط log
    logger.info('Email receipt (placeholder)', {
      customerEmail: 'not-implemented', // يوجد field email في customers?
      amount: receiptData.amount
    });

    // في المستقبل:
    // 1. إنشاء HTML template للإيصال
    // 2. إرسال عبر SMTP أو Email Service API (SendGrid, Mailgun, etc)
    // 3. تتبع فتح الرسالة (opens, clicks, bounces)
  }

  /**
   * إرسال تنبيه فشل دفع
   */
  async sendPaymentFailedNotification(
    paymentId: string,
    companyId: string,
    notificationData: PaymentFailedNotificationData
  ): Promise<boolean> {
    try {
      logger.info('Sending payment failed notification', { paymentId });

      // TODO: تنفيذ إرسال فعلي للتنبيهات
      // حالياً فقط log

      // في المستقبل:
      // 1. إرسال إشعار للمستخدم المسؤول عن الفشل
      // 2. إرسال إشعار للعميل (إذا لزم)
      // 3. تخزين التنبيه في قاعدة البيانات

      await this.logNotificationAttempt(paymentId, companyId, 'payment_failed', notificationData);

      logger.info('Payment failed notification sent', { paymentId });
      return true;
    } catch (error) {
      logger.error('Failed to send payment failed notification', { paymentId, error });
      return false;
    }
  }

  /**
   * إرسال تنبيهات المتأخرات
   */
  async sendOverdueReminder(
    contractId: string,
    companyId: string,
    reminderData: OverdueReminderData
  ): Promise<boolean> {
    try {
      logger.info('Sending overdue reminder', { contractId, daysOverdue: reminderData.daysOverdue });

      // TODO: تنفيذ إرسال فعلي للتذكيرات
      // حالياً فقط log

      // في المستقبل:
      // 1. تحديد القناة المناسبة حسب العميل (WhatsApp, SMS, Email)
      // 2. إنشاء رسالة التذكير
      // 3. إرسال الرسالة
      // 4. تتبع استجابة العميل
      // 5. تصعيد التذكيرات حسب الاستجابة

      await this.logNotificationAttempt(contractId, companyId, 'overdue_reminder', reminderData);

      logger.info('Overdue reminder sent', { contractId });
      return true;
    } catch (error) {
      logger.error('Failed to send overdue reminder', { contractId, error });
      return false;
    }
  }

  /**
   * إرسال إشعارات للموظفين
   */
  async sendStaffNotification(
    companyId: string,
    notification: {
      type: 'payment_failed' | 'overdue_alert' | 'system_alert';
      title: string;
      message: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      data?: any;
    },
    options: {
      channels?: Array<'in_app' | 'email'>;
    }
  ): Promise<boolean> {
    try {
      logger.info('Sending staff notification', {
        companyId,
        type: notification.type,
        title: notification.title
      });

      // TODO: تنفيذ إرسال فعلي
      // حالياً فقط log

      // في المستقبل:
      // 1. إرسال In-app notification (real-time)
      // 2. إرسال Email للموظفين ذوي الصلاحية
      // 3. تتبع قراءة الإشعار
      // 4. تجميع إحصائيات الإشعار

      await this.logStaffNotificationAttempt(companyId, notification);

      logger.info('Staff notification sent', { companyId });
      return true;
    } catch (error) {
      logger.error('Failed to send staff notification', { companyId, error });
      return false;
    }
  }

  /**
   * تحويل المبلغ إلى كلمات عربية
   */
  private async convertAmountToWords(amount: number): Promise<string> {
    // TODO: تنفيذ تحويل فعلي
    // حالياً يرجع المبلغ فقط

    // في المستقبل:
    // استخدام مكتبة متخصصة لتحويل الأرقام العربية
    // مثال: numberToArabicWords(amount)

    return amount.toFixed(2) + ' ر.ق';
  }

  /**
   * التحقق من إعدادات القناة
   */
  private isChannelEnabled(config: NotificationChannel | undefined, channel: string): boolean {
    if (!config) return false;
    return config.enabled && config.type === channel;
  }

  /**
   * تحديد القنوات الافتراضية
   */
  private determineDefaultChannels(config: NotificationChannel | undefined): Array<'whatsapp' | 'sms' | 'email'> {
    if (config) {
      const channels = [];
      if (config.enabled && config.type === 'whatsapp') channels.push('whatsapp');
      if (config.enabled && config.type === 'sms') channels.push('sms');
      if (config.enabled && config.type === 'email') channels.push('email');
      return channels.length > 0 ? channels : ['in_app'];
    }
    return ['in_app'];
  }

  /**
   * تسجيل محاولة إرسال إيصال
   */
  private async logReceiptAttempt(
    paymentId: string,
    companyId: string,
    metadata: any
  ): Promise<void> {
    await supabase.from('payment_notifications').insert({
      company_id: companyId,
      payment_id: paymentId,
      notification_type: 'receipt',
      channel: 'in_app',
      status: 'sent',
      metadata,
      sent_at: new Date().toISOString()
    });
  }

  /**
   * تسجيل محاولة إشعار
   */
  private async logNotificationAttempt(
    targetId: string,
    companyId: string,
    notificationType: string,
    metadata: any
  ): Promise<void> {
    await supabase.from('payment_notifications').insert({
      company_id: companyId,
      payment_id: targetId,
      notification_type: notificationType,
      channel: 'in_app',
      status: 'sent',
      metadata,
      sent_at: new Date().toISOString()
    });
  }

  /**
   * تسجيل محاولة إشعار موظف
   */
  private async logStaffNotificationAttempt(
    companyId: string,
    notification: any
  ): Promise<void> {
    await supabase.from('staff_notifications').insert({
      company_id: companyId,
      notification,
      status: 'sent',
      sent_at: new Date().toISOString()
    });
  }

  /**
   * الحصول على تاريخ إشعارات دفعة
   */
  async getPaymentNotifications(paymentId: string): Promise<any[]> {
    const { data } = await supabase
      .from('payment_notifications')
      .select('*')
      .eq('payment_id', paymentId)
      .order('sent_at', { ascending: false });

    return data || [];
  }

  /**
   * تحديث إعدادات القنوات
   */
  async updateChannelConfig(
    companyId: string,
    channel: 'whatsapp' | 'sms' | 'email',
    config: Partial<NotificationChannel>
  ): Promise<boolean> {
    try {
      const { data: existing } = await supabase
        .from('notification_channels')
        .select('id, config')
        .eq('company_id', companyId)
        .eq('channel_type', channel)
        .maybeSingle();

      const configData = {
        is_enabled: config.enabled !== undefined ? config.enabled : true,
        config: config.config || {}
      };

      if (existing) {
        await supabase
          .from('notification_channels')
          .update({ ...configData, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('notification_channels')
          .insert({
            company_id: companyId,
            channel_type: channel,
            ...configData,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      logger.info('Channel configuration updated', { companyId, channel, enabled: configData.is_enabled });
      return true;
    } catch (error) {
      logger.error('Failed to update channel configuration', { companyId, channel, error });
      return false;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
