import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { TrafficViolation } from './useTrafficViolations';
import { formatPhoneForWhatsApp } from '@/lib/phone';

interface WhatsAppRecipient {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  role: string;
  reportTypes: string[];
  alertTypes: string[];
}

interface SendViolationNotificationParams {
  violation: TrafficViolation;
  notificationType: 'new_violation' | 'payment_reminder' | 'escalation_warning';
  additionalRecipients?: string[]; // Additional phone numbers
}

// Format phone number for WhatsApp
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  // If starts with 0 and is a Qatar number, add country code
  if (cleaned.startsWith('0') && cleaned.length === 8) {
    cleaned = '974' + cleaned.substring(1);
  }
  
  // If doesn't start with country code, assume Qatar
  if (cleaned.length === 8) {
    cleaned = '974' + cleaned;
  }
  
  return cleaned;
}

// Get formatted currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount) + ' ر.ق';
}

// Hook: Send WhatsApp notification for traffic violation
export function useSendViolationWhatsAppNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      violation,
      notificationType,
      additionalRecipients = [],
    }: SendViolationNotificationParams) => {
      const companyId = user?.profile?.company_id;
      if (!companyId) {
        return { success: false, reason: 'no_company', sent: 0, failed: 0 };
      }

      // 1. Get WhatsApp settings and recipients from the report system
      const { data: whatsappSettings, error: settingsError } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (settingsError || !whatsappSettings?.is_connected) {
        console.warn('WhatsApp not connected');
        return { success: false, reason: 'whatsapp_not_connected', sent: 0, failed: 0 };
      }

      // Parse recipients from settings
      const recipients: WhatsAppRecipient[] = whatsappSettings.recipients || [];
      
      // Filter active recipients who should receive alerts
      const alertRecipients = recipients.filter(r => 
        r.isActive && 
        r.alertTypes?.includes('payment_overdue') // Use payment_overdue as traffic violation alert type
      );

      // Collect all phone numbers to send to
      const phoneNumbers = new Set<string>();
      
      // Add customer phone if available
      if (violation.customers?.phone) {
        phoneNumbers.add(formatPhoneNumber(violation.customers.phone));
      }
      
      // Add report system recipients
      alertRecipients.forEach(r => {
        if (r.phone) {
          phoneNumbers.add(formatPhoneNumber(r.phone));
        }
      });
      
      // Add additional recipients
      additionalRecipients.forEach(phone => {
        if (phone) {
          phoneNumbers.add(formatPhoneNumber(phone));
        }
      });

      if (phoneNumbers.size === 0) {
        return { success: false, reason: 'no_recipients', sent: 0, failed: 0 };
      }

      // 2. Prepare message based on notification type
      const customerName = violation.customers 
        ? `${violation.customers.first_name || ''} ${violation.customers.last_name || ''}`.trim() || 'العميل'
        : 'العميل';
      
      const vehicleInfo = violation.vehicles
        ? `${violation.vehicles.make} ${violation.vehicles.model} - ${violation.vehicles.plate_number}`
        : violation.vehicle_plate || 'غير محدد';

      let message = '';

      switch (notificationType) {
        case 'new_violation':
          message = `🚦 *إشعار مخالفة مرورية جديدة*

مرحباً ${customerName} 👋

تم تسجيل مخالفة مرورية جديدة على المركبة المؤجرة لكم.

*تفاصيل المخالفة:*
• رقم المخالفة: ${violation.penalty_number}
• نوع المخالفة: ${violation.violation_type || 'غير محدد'}
• التاريخ: ${violation.penalty_date ? format(new Date(violation.penalty_date), 'dd/MM/yyyy') : '-'}
• المركبة: ${vehicleInfo}
• المبلغ: ${formatCurrency(violation.amount || 0)}
${violation.location ? `• الموقع: ${violation.location}` : ''}

يرجى التواصل معنا لتسوية المخالفة.

_شركة العراف لتأجير السيارات_`.trim();
          break;

        case 'payment_reminder':
          message = `⏰ *تذكير بسداد مخالفة مرورية*

مرحباً ${customerName}،

نذكركم بوجود مخالفة مرورية غير مسددة:

• رقم المخالفة: ${violation.penalty_number}
• المبلغ المستحق: ${formatCurrency(violation.amount || 0)}
• المركبة: ${vehicleInfo}

يرجى المبادرة بالسداد لتجنب أي إجراءات إضافية.

للاستفسار: تواصل معنا

_شركة العراف لتأجير السيارات_`.trim();
          break;

        case 'escalation_warning':
          message = `⚠️ *إشعار هام - مخالفة متأخرة*

عزيزي ${customerName}،

نود إعلامكم أن المخالفة التالية متأخرة السداد ومعرضة للتحويل للشؤون القانونية:

• رقم المخالفة: ${violation.penalty_number}
• المبلغ المستحق: ${formatCurrency(violation.amount || 0)}
• المركبة: ${vehicleInfo}

نرجو سرعة التسوية لتجنب الإجراءات القانونية.

_شركة العراف لتأجير السيارات_`.trim();
          break;
      }

      // 3. Send messages to all recipients
      let sentCount = 0;
      let failedCount = 0;

      for (const phone of phoneNumbers) {
        try {
          const { error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
            body: {
              to: phone,
              message,
              companyId,
            },
          });

          if (!sendError) {
            sentCount++;
            
            // Log the message
            await supabase.from('whatsapp_message_logs').insert({
              company_id: companyId,
              recipient_phone: phone,
              message_type: `violation_${notificationType}`,
              message_content: message,
              status: 'sent',
              sent_at: new Date().toISOString(),
            });
          } else {
            failedCount++;
            console.error(`Failed to send to ${phone}:`, sendError);
          }
        } catch (e) {
          failedCount++;
          console.error(`Error sending to ${phone}:`, e);
        }
      }

      return { 
        success: sentCount > 0, 
        sent: sentCount, 
        failed: failedCount,
        total: phoneNumbers.size 
      };
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`تم إرسال ${result.sent} إشعار عبر WhatsApp`);
        queryClient.invalidateQueries({ queryKey: ['whatsapp-message-logs'] });
      } else if (result.reason === 'whatsapp_not_connected') {
        toast.error('خدمة WhatsApp غير متصلة', {
          description: 'يرجى تفعيل الخدمة من الإعدادات'
        });
      } else if (result.reason === 'no_recipients') {
        toast.warning('لا يوجد مستلمين للإشعار');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'فشل إرسال إشعار WhatsApp');
    },
  });
}

// Hook: Send bulk reminders for unpaid violations
export function useSendBulkViolationReminders() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (options?: { daysOverdue?: number }) => {
      const { daysOverdue = 7 } = options || {};
      const companyId = user?.profile?.company_id;
      
      if (!companyId) {
        throw new Error('لم يتم تحديد الشركة');
      }

      // Get unpaid violations older than specified days
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysOverdue);

      const { data: unpaidViolations, error } = await supabase
        .from('penalties')
        .select(`
          id,
          penalty_number,
          violation_type,
          penalty_date,
          amount,
          location,
          vehicle_plate,
          vehicle_id,
          customer_id,
          vehicles (
            id,
            plate_number,
            make,
            model
          ),
          customers (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('company_id', companyId)
        .eq('payment_status', 'unpaid')
        .lte('penalty_date', targetDate.toISOString());

      if (error) throw error;

      // Get WhatsApp settings
      const { data: whatsappSettings, error: settingsError } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (settingsError || !whatsappSettings?.is_connected) {
        throw new Error('خدمة WhatsApp غير متصلة');
      }

      let sentCount = 0;
      let failedCount = 0;

      for (const violation of unpaidViolations || []) {
        if (!violation.customers?.phone) continue;

        const phone = formatPhoneNumber(violation.customers.phone);
        const customerName = `${violation.customers.first_name || ''} ${violation.customers.last_name || ''}`.trim() || 'العميل';
        const vehicleInfo = violation.vehicles
          ? `${violation.vehicles.make} ${violation.vehicles.model} - ${violation.vehicles.plate_number}`
          : violation.vehicle_plate || 'غير محدد';

        const message = `⏰ *تذكير بسداد مخالفة مرورية*

مرحباً ${customerName}،

نذكركم بوجود مخالفة مرورية غير مسددة:

• رقم المخالفة: ${violation.penalty_number}
• المبلغ المستحق: ${formatCurrency(violation.amount || 0)}
• المركبة: ${vehicleInfo}

يرجى المبادرة بالسداد.

_شركة العراف لتأجير السيارات_`.trim();

        try {
          const { error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
            body: {
              to: phone,
              message,
              companyId,
            },
          });

          if (!sendError) {
            sentCount++;
            
            await supabase.from('whatsapp_message_logs').insert({
              company_id: companyId,
              recipient_phone: phone,
              message_type: 'violation_payment_reminder',
              message_content: message,
              status: 'sent',
              sent_at: new Date().toISOString(),
            });
          } else {
            failedCount++;
          }
        } catch (e) {
          failedCount++;
        }
      }

      return { 
        sentCount, 
        failedCount, 
        total: unpaidViolations?.length || 0 
      };
    },
    onSuccess: (result) => {
      if (result.sentCount > 0) {
        toast.success(`تم إرسال ${result.sentCount} تذكير`);
      }
      if (result.failedCount > 0) {
        toast.warning(`فشل إرسال ${result.failedCount} تذكير`);
      }
      queryClient.invalidateQueries({ queryKey: ['whatsapp-message-logs'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook: Check if WhatsApp is connected
export function useWhatsAppConnectionStatus() {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return {
    checkConnection: async (): Promise<boolean> => {
      if (!companyId) return false;

      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('is_connected')
        .eq('company_id', companyId)
        .single();

      return !error && data?.is_connected === true;
    }
  };
}

