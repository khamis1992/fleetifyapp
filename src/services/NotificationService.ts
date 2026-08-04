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
import type { Json } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { PaymentMethod } from '@/types/payment-enums';

type NotificationChannelType = 'whatsapp' | 'sms' | 'email' | 'in_app';
type ExternalNotificationChannel = Exclude<NotificationChannelType, 'in_app'>;

export interface NotificationChannel {
  type: NotificationChannelType;
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

interface CustomerRelation {
  first_name: string | null;
  last_name: string | null;
  first_name_ar: string | null;
  last_name_ar: string | null;
  company_name: string | null;
  company_name_ar: string | null;
  phone: string | null;
}

interface VehicleRelation {
  plate_number: string | null;
}

interface ContractRelation {
  contract_number: string;
  monthly_amount: number;
  vehicles: VehicleRelation | VehicleRelation[] | null;
}

interface InvoiceRelation {
  invoice_number: string;
  total_amount: number;
}

interface PaymentReceiptRecord {
  payment_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string | null;
  customers: CustomerRelation | CustomerRelation[] | null;
  contracts: ContractRelation | ContractRelation[] | null;
  invoices: InvoiceRelation | InvoiceRelation[] | null;
}

interface StaffNotificationInput {
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: unknown;
}

const firstRelation = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const toJson = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;

const isNotificationChannelType = (value: string): value is NotificationChannelType =>
  value === 'whatsapp' || value === 'sms' || value === 'email' || value === 'in_app';

export class NotificationService {
  private channelConfig = new Map<string, Map<NotificationChannelType, NotificationChannel>>();
  private readonly configurationsReady: Promise<void>;

  constructor() {
    this.configurationsReady = this.loadChannelConfigurations();
  }

  /**
   * تحميل إعدادات قنوات الإشعارات من قاعدة البيانات
   */
  private async loadChannelConfigurations(): Promise<void> {
    try {
      const { data: configs, error } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      if (configs) {
        configs.forEach(config => {
          if (!isNotificationChannelType(config.channel_type)) return;

          const companyChannels = this.channelConfig.get(config.company_id) ?? new Map();
          companyChannels.set(config.channel_type, {
            type: config.channel_type,
            enabled: config.is_enabled,
            config: (config.config ?? undefined) as NotificationChannel['config']
          });
          this.channelConfig.set(config.company_id, companyChannels);
        });

        logger.info('Loaded notification channel configurations', {
          companies: configs.length
        });
      }
    } catch (error) {
      logger.error('Failed to load notification configurations', error);
    }
  }

  /**
   * إرسال إيصال دفع للعميل
   */
  async sendPaymentReceipt(
    paymentId: string,
    companyId: string,
    options: {
      channels?: ExternalNotificationChannel[];
      autoSend?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    sentToChannels: string[];
    errors: Array<{ channel: string; error: string }>;
  }> {
    try {
      await this.configurationsReady;
      logger.info('Sending payment receipt', { paymentId, options });

      // 1. جلب بيانات الدفعة
      const { data, error: paymentError } = await supabase
        .from('payments')
        .select(`
          payment_number,
          amount,
          payment_date,
          payment_method,
          notes,
          customers!payments_customer_id_fkey (
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar,
            phone
          ),
          contracts!fk_payments_contract_id (
            contract_number,
            monthly_amount,
            vehicles!contracts_vehicle_id_fkey (plate_number)
          ),
          invoices!payments_invoice_id_fkey (
            invoice_number,
            total_amount
          )
        `)
        .eq('id', paymentId)
        .eq('company_id', companyId)
        .maybeSingle();

      if (paymentError) throw paymentError;
      if (!data) {
        throw new Error('الدفعة غير موجودة');
      }

      const payment = data as unknown as PaymentReceiptRecord;
      const customer = firstRelation(payment.customers);
      const contract = firstRelation(payment.contracts);
      const invoice = firstRelation(payment.invoices);
      const vehicle = firstRelation(contract?.vehicles);

      if (!customer) throw new Error('Payment customer data is unavailable');

      // 2. بناء بيانات الإيصال
      const customerName = customer.company_name_ar || customer.company_name ||
        `${customer.first_name_ar || customer.first_name || ''} ${customer.last_name_ar || customer.last_name || ''}`.trim() ||
        'Customer';

      const receiptData: PaymentReceiptData = {
        customerName,
        customerPhone: customer.phone || '',
        paymentNumber: payment.payment_number,
        amount: payment.amount,
        amountInWords: await this.convertAmountToWords(payment.amount),
        paymentDate: payment.payment_date,
        paymentMethod: payment.payment_method as PaymentMethod,
        description: payment.notes || `دفعة - ${payment.payment_number}`,
        vehicleNumber: vehicle?.plate_number || undefined,
        contractNumber: contract?.contract_number,
        invoiceNumber: invoice?.invoice_number
      };

      // 3. الحصول على قنوات الإشعارات المفعلة
      const channelsToUse: NotificationChannelType[] = options.channels
        ? [...options.channels]
        : this.determineDefaultChannels(companyId);

      const sentToChannels: string[] = [];
      const errors: Array<{ channel: string; error: string }> = [];

      // 4. إرسال عبر كل قناة
      for (const channel of channelsToUse) {
        if (!this.isChannelEnabled(companyId, channel)) {
          errors.push({ channel, error: 'Notification channel is not enabled' });
          continue;
        }

        try {
          if (channel === 'whatsapp') {
            await this.sendWhatsAppReceipt(receiptData);
          } else if (channel === 'sms') {
            await this.sendSMSReceipt(receiptData);
          } else if (channel === 'email') {
            await this.sendEmailReceipt(receiptData);
          } else {
            await this.insertStaffNotification(companyId, {
              type: 'payment_receipt',
              title: 'تم استلام دفعة',
              message: `تم استلام دفعة بقيمة ${receiptData.amount} ر.ق - ${receiptData.paymentNumber}`,
              priority: 'low',
              data: { paymentId, receiptData }
            });
          }
          sentToChannels.push(channel);
        } catch (channelError) {
          errors.push({
            channel,
            error: channelError instanceof Error ? channelError.message : 'Unknown notification error'
          });
          logger.error(`Failed to send ${channel} receipt`, {
            paymentId,
            error: channelError
          });
        }
      }

      // 5. تسجيل محاولة الإرسال
      try {
        await this.logNotificationAttempt({
          targetId: paymentId,
          resourceType: 'payment',
          companyId,
          action: 'send_payment_receipt',
          message: `Payment receipt delivery attempted for ${payment.payment_number}`,
          level: errors.length > 0 ? 'warning' : 'info',
          metadata: {
            channels: channelsToUse,
            sentToChannels,
            errors,
            autoSend: options.autoSend ?? false
          }
        });
      } catch (auditError) {
        const errorMessage = auditError instanceof Error ? auditError.message : 'Failed to persist notification audit';
        errors.push({ channel: 'audit', error: errorMessage });
        logger.error('Failed to persist payment receipt audit', { paymentId, error: auditError });
      }

      logger.info('Payment receipt sent', {
        paymentId,
        sentToChannels: sentToChannels.length,
        errors: errors.length
      });

      return {
        success: sentToChannels.length > 0,
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

  private async sendWhatsAppReceipt(receiptData: PaymentReceiptData): Promise<void> {
    if (!receiptData.customerPhone) throw new Error('Customer phone number is missing');
    throw new Error('إرسال إيصالات واتساب من المتصفح معطل حتى ربط أمر خلفي مقيد برقم الدفعة');
  }

  private async sendSMSReceipt(_receiptData: PaymentReceiptData): Promise<void> {
    throw new Error('SMS delivery is not configured');
  }

  private async sendEmailReceipt(_receiptData: PaymentReceiptData): Promise<void> {
    throw new Error('Email delivery is not configured');
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

      await this.insertStaffNotification(companyId, {
        type: 'payment_failed',
        title: 'فشل في معالجة الدفعة',
        message: `فشلت دفعة بقيمة ${notificationData.paymentAmount} ر.ق. السبب: ${notificationData.reason}`,
        priority: 'high',
        data: { paymentId, ...notificationData }
      });

      await this.logNotificationAttempt({
        targetId: paymentId,
        resourceType: 'payment',
        companyId,
        action: 'payment_failed',
        message: `Payment failed: ${notificationData.reason}`,
        level: 'error',
        metadata: notificationData
      });

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

      await this.insertStaffNotification(companyId, {
        type: 'overdue_alert',
        title: 'تذكير بالمتأخرات',
        message: `العميل ${reminderData.customerName} - عقد ${reminderData.contractNumber}: متأخر ${reminderData.daysOverdue} يوم، والمبلغ المتأخر ${reminderData.overdueAmount} ر.ق`,
        priority: reminderData.daysOverdue > 30 ? 'high' : 'medium',
        data: { contractId, ...reminderData }
      });

      await this.logNotificationAttempt({
        targetId: contractId,
        resourceType: 'contract',
        companyId,
        action: 'overdue_reminder',
        message: `Overdue reminder created for contract ${reminderData.contractNumber}`,
        level: 'warning',
        metadata: reminderData
      });

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
    notification: StaffNotificationInput,
    _options: {
      channels?: Array<'in_app' | 'email'>;
    } = {}
  ): Promise<boolean> {
    try {
      logger.info('Sending staff notification', {
        companyId,
        type: notification.type,
        title: notification.title
      });

      await this.insertStaffNotification(companyId, notification);
      await this.logNotificationAttempt({
        companyId,
        resourceType: 'staff_notification',
        action: notification.type,
        message: notification.title,
        level: notification.priority === 'urgent' || notification.priority === 'high' ? 'warning' : 'info',
        metadata: notification
      });

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
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
    if (Number.isInteger(amount) && amount >= 1 && amount <= 10) {
      return `${ones[amount]} ريال قطري`;
    }
    return `${amount.toFixed(2)} ريال قطري`;
  }

  /**
   * التحقق من إعدادات القناة
   */
  private isChannelEnabled(companyId: string, channel: NotificationChannelType): boolean {
    if (channel === 'in_app') return true;
    return this.channelConfig.get(companyId)?.get(channel)?.enabled === true;
  }

  /**
   * تحديد القنوات الافتراضية
   */
  private determineDefaultChannels(companyId: string): NotificationChannelType[] {
    const enabledChannels = [...(this.channelConfig.get(companyId)?.values() ?? [])]
      .filter((channel) => channel.enabled)
      .map((channel) => channel.type);

    return enabledChannels.length > 0 ? enabledChannels : ['in_app'];
  }

  /**
   * تسجيل محاولة إرسال إيصال
   */
  private async insertStaffNotification(
    companyId: string,
    notification: StaffNotificationInput
  ): Promise<void> {
    const { error } = await supabase.from('staff_notifications').insert({
      company_id: companyId,
      notification: toJson(notification),
      priority: notification.priority,
      status: 'unread'
    });

    if (error) throw error;
  }

  /**
   * تسجيل محاولة إشعار
   */
  private async logNotificationAttempt(input: {
    targetId?: string;
    resourceType: string;
    companyId: string;
    action: string;
    message: string;
    level: 'info' | 'warning' | 'error';
    metadata: unknown;
  }): Promise<void> {
    const { error } = await supabase.from('system_logs').insert({
      action: input.action,
      category: 'notification',
      company_id: input.companyId,
      level: input.level,
      message: input.message,
      metadata: toJson(input.metadata),
      resource_id: input.targetId ?? null,
      resource_type: input.resourceType
    });

    if (error) throw error;
  }

  /**
   * تسجيل محاولة إشعار موظف
   */
  async getPaymentNotifications(paymentId: string): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await supabase
      .from('system_logs')
      .select('*')
      .eq('category', 'notification')
      .eq('resource_type', 'payment')
      .eq('resource_id', paymentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Array<Record<string, unknown>>;
  }

  /**
   * تحديث إعدادات القنوات
   */
  async updateChannelConfig(
    companyId: string,
    channel: ExternalNotificationChannel,
    config: Partial<NotificationChannel>
  ): Promise<boolean> {
    try {
      await this.configurationsReady;

      const { data: existing, error: lookupError } = await supabase
        .from('notification_channels')
        .select('id')
        .eq('company_id', companyId)
        .eq('channel_type', channel)
        .maybeSingle();

      if (lookupError) throw lookupError;

      const configData = {
        is_enabled: config.enabled ?? true,
        config: toJson(config.config ?? {}),
        is_active: true,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        const { error } = await supabase
          .from('notification_channels')
          .update(configData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_channels')
          .insert({
            company_id: companyId,
            channel_type: channel,
            ...configData
          });
        if (error) throw error;
      }

      const companyChannels = this.channelConfig.get(companyId) ?? new Map();
      companyChannels.set(channel, {
        type: channel,
        enabled: configData.is_enabled,
        config: config.config
      });
      this.channelConfig.set(companyId, companyChannels);

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
