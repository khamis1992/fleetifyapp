/**
 * Traffic Violation Notification System
 * نظام إشعارات المخالفات المرورية
 * 
 * Handles automatic notifications to customers and managers when traffic violations are registered
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useQueryClient } from '@tanstack/react-query';

// Types for notification data
export interface ViolationNotificationData {
  violationId?: string;
  violationNumber: string;
  violationDate: string;
  violationType: string;
  fineAmount: number;
  vehiclePlateNumber: string;
  vehicleMake?: string;
  vehicleModel?: string;
  location?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  contractId?: string;
  contractNumber?: string;
}

export interface NotificationSettings {
  notifyCustomerBySystem: boolean;
  notifyCustomerByWhatsApp: boolean;
  notifyCustomerByEmail: boolean;
  notifyManagers: boolean;
  notifyFleetManager: boolean;
  includePaymentLink: boolean;
}

export interface NotificationResult {
  success: boolean;
  systemNotifications: number;
  whatsappNotifications: number;
  emailNotifications: number;
  errors: string[];
}

const DEFAULT_SETTINGS: NotificationSettings = {
  notifyCustomerBySystem: true,
  notifyCustomerByWhatsApp: false,
  notifyCustomerByEmail: false,
  notifyManagers: true,
  notifyFleetManager: true,
  includePaymentLink: false,
};

/**
 * Hook for sending violation notifications
 */
export function useViolationNotifications() {
  const { companyId, user } = useUnifiedCompanyAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<NotificationResult | null>(null);

  /**
   * Get managers to notify based on roles
   */
  const getManagersToNotify = useCallback(async (): Promise<Array<{ userId: string; role: string; email?: string }>> => {
    if (!companyId) return [];

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          profiles!inner(id, email, first_name, last_name)
        `)
        .eq('company_id', companyId)
        .in('role', ['company_admin', 'manager', 'fleet_manager', 'accountant']);

      if (error) {
        console.error('Error fetching managers:', error);
        return [];
      }

      return (data || []).map((r: any) => ({
        userId: r.user_id,
        role: r.role,
        email: r.profiles?.email,
      }));
    } catch (err) {
      console.error('Error getting managers:', err);
      return [];
    }
  }, [companyId]);

  /**
   * Get customer details for notification
   */
  const getCustomerDetails = useCallback(async (customerId: string): Promise<{
    name: string;
    phone?: string;
    email?: string;
  } | null> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('first_name, last_name, first_name_ar, last_name_ar, phone, alternative_phone, email')
        .eq('id', customerId)
        .single();

      if (error || !data) return null;

      const arabicName = [data.first_name_ar, data.last_name_ar].filter(Boolean).join(' ');
      const englishName = [data.first_name, data.last_name].filter(Boolean).join(' ');
      
      return {
        name: arabicName || englishName || 'عميل',
        phone: data.phone || data.alternative_phone,
        email: data.email,
      };
    } catch (err) {
      console.error('Error fetching customer:', err);
      return null;
    }
  }, []);

  /**
   * Create system notification for a user
   */
  const createSystemNotification = useCallback(async (
    userId: string,
    title: string,
    message: string,
    notificationType: 'info' | 'warning' | 'error' = 'warning',
    relatedId?: string,
    relatedType: string = 'traffic_violation'
  ): Promise<boolean> => {
    if (!companyId) return false;

    try {
      const { error } = await supabase
        .from('user_notifications')
        .insert({
          company_id: companyId,
          user_id: userId,
          title,
          message,
          notification_type: notificationType,
          is_read: false,
          related_id: relatedId,
          related_type: relatedType,
        });

      if (error) {
        console.error('Error creating notification:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error creating system notification:', err);
      return false;
    }
  }, [companyId]);

  /**
   * Format violation message for notifications
   */
  const formatViolationMessage = useCallback((
    violation: ViolationNotificationData,
    isArabic: boolean = true
  ): { title: string; message: string } => {
    if (isArabic) {
      return {
        title: `🚨 مخالفة مرورية جديدة - ${violation.vehiclePlateNumber}`,
        message: `تم تسجيل مخالفة مرورية جديدة:

📋 رقم المخالفة: ${violation.violationNumber}
📅 التاريخ: ${violation.violationDate}
🚗 المركبة: ${violation.vehiclePlateNumber} ${violation.vehicleMake ? `(${violation.vehicleMake} ${violation.vehicleModel || ''})` : ''}
📍 الموقع: ${violation.location || 'غير محدد'}
⚠️ نوع المخالفة: ${violation.violationType}
💰 قيمة الغرامة: ${violation.fineAmount.toLocaleString()} ر.ق

${violation.customerName ? `👤 العميل: ${violation.customerName}` : ''}
${violation.contractNumber ? `📄 رقم العقد: ${violation.contractNumber}` : ''}

يرجى المتابعة وتحصيل المبلغ من العميل.`,
      };
    }

    return {
      title: `🚨 New Traffic Violation - ${violation.vehiclePlateNumber}`,
      message: `A new traffic violation has been registered:

📋 Violation No: ${violation.violationNumber}
📅 Date: ${violation.violationDate}
🚗 Vehicle: ${violation.vehiclePlateNumber} ${violation.vehicleMake ? `(${violation.vehicleMake} ${violation.vehicleModel || ''})` : ''}
📍 Location: ${violation.location || 'Not specified'}
⚠️ Type: ${violation.violationType}
💰 Fine Amount: QAR ${violation.fineAmount.toLocaleString()}

${violation.customerName ? `👤 Customer: ${violation.customerName}` : ''}
${violation.contractNumber ? `📄 Contract: ${violation.contractNumber}` : ''}

Please follow up with the customer for payment.`,
    };
  }, []);

  /**
   * Format customer notification message
   */
  const formatCustomerMessage = useCallback((
    violation: ViolationNotificationData,
    companyName: string = 'شركة تأجير السيارات'
  ): { title: string; message: string; whatsappMessage: string } => {
    const title = `🚨 تنبيه مخالفة مرورية`;
    const message = `عزيزي العميل ${violation.customerName || ''},

نود إبلاغكم بتسجيل مخالفة مرورية على المركبة المستأجرة:

📋 رقم المخالفة: ${violation.violationNumber}
📅 تاريخ المخالفة: ${violation.violationDate}
🚗 رقم اللوحة: ${violation.vehiclePlateNumber}
⚠️ نوع المخالفة: ${violation.violationType}
📍 الموقع: ${violation.location || 'غير محدد'}
💰 قيمة الغرامة: ${violation.fineAmount.toLocaleString()} ر.ق

يرجى التواصل معنا لتسوية المخالفة في أقرب وقت ممكن.

شكراً لتعاونكم.
${companyName}`;

    // WhatsApp message (shorter, formatted for mobile)
    const whatsappMessage = `🚨 *تنبيه مخالفة مرورية*

السلام عليكم ${violation.customerName || ''},

تم تسجيل مخالفة مرورية:
📋 رقم: ${violation.violationNumber}
📅 التاريخ: ${violation.violationDate}
🚗 اللوحة: ${violation.vehiclePlateNumber}
💰 الغرامة: ${violation.fineAmount.toLocaleString()} ر.ق

يرجى التواصل معنا لتسوية المخالفة.

_${companyName}_`;

    return { title, message, whatsappMessage };
  }, []);

  /**
   * Send WhatsApp notification
   */
  const sendWhatsAppNotification = useCallback(async (
    phone: string,
    message: string
  ): Promise<boolean> => {
    // Clean phone number
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Add Qatar country code if not present
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('974')) {
        cleanPhone = '+' + cleanPhone;
      } else {
        cleanPhone = '+974' + cleanPhone;
      }
    }

    // Open WhatsApp with the message
    const whatsappUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(message)}`;
    
    // For now, we just generate the URL - in production, this would use WhatsApp Business API
    console.log('WhatsApp URL generated:', whatsappUrl);
    
    // Store the pending WhatsApp notification for manual sending
    // In a full implementation, this would integrate with WhatsApp Business API
    return true;
  }, []);

  /**
   * Send notifications for a single violation
   */
  const sendViolationNotification = useCallback(async (
    violation: ViolationNotificationData,
    settings: Partial<NotificationSettings> = {}
  ): Promise<NotificationResult> => {
    const config = { ...DEFAULT_SETTINGS, ...settings };
    const result: NotificationResult = {
      success: false,
      systemNotifications: 0,
      whatsappNotifications: 0,
      emailNotifications: 0,
      errors: [],
    };

    setIsSending(true);

    try {
      // Get customer details if not provided
      let customerDetails = {
        name: violation.customerName,
        phone: violation.customerPhone,
        email: violation.customerEmail,
      };

      if (violation.customerId && (!customerDetails.phone || !customerDetails.email)) {
        const details = await getCustomerDetails(violation.customerId);
        if (details) {
          customerDetails = {
            name: customerDetails.name || details.name,
            phone: customerDetails.phone || details.phone,
            email: customerDetails.email || details.email,
          };
        }
      }

      // Update violation data with customer details
      const enrichedViolation = {
        ...violation,
        customerName: customerDetails.name,
        customerPhone: customerDetails.phone,
        customerEmail: customerDetails.email,
      };

      // 1. Notify managers via system notifications
      if (config.notifyManagers || config.notifyFleetManager) {
        const managers = await getManagersToNotify();
        const { title, message } = formatViolationMessage(enrichedViolation, true);

        for (const manager of managers) {
          // Filter by role if needed
          if (!config.notifyManagers && manager.role !== 'fleet_manager') continue;
          if (!config.notifyFleetManager && manager.role === 'fleet_manager') continue;

          const sent = await createSystemNotification(
            manager.userId,
            title,
            message,
            'warning',
            violation.violationId,
            'traffic_violation'
          );

          if (sent) {
            result.systemNotifications++;
          } else {
            result.errors.push(`Failed to notify manager: ${manager.userId}`);
          }
        }
      }

      // 2. Notify customer by system notification (if they have a user account)
      if (config.notifyCustomerBySystem && violation.customerId) {
        // Check if customer has a linked user account
        const { data: customerUser } = await supabase
          .from('profiles')
          .select('id, user_id')
          .eq('customer_id', violation.customerId)
          .maybeSingle();

        if (customerUser?.user_id) {
          const { title, message } = formatCustomerMessage(enrichedViolation);
          const sent = await createSystemNotification(
            customerUser.user_id,
            title,
            message,
            'warning',
            violation.violationId,
            'traffic_violation'
          );

          if (sent) {
            result.systemNotifications++;
          }
        }
      }

      // 3. Prepare WhatsApp notification (opens in new tab for manual sending)
      if (config.notifyCustomerByWhatsApp && customerDetails.phone) {
        const { whatsappMessage } = formatCustomerMessage(enrichedViolation);
        await sendWhatsAppNotification(customerDetails.phone, whatsappMessage);
        result.whatsappNotifications++;
      }

      // 4. Email notifications would be implemented here with an email service
      if (config.notifyCustomerByEmail && customerDetails.email) {
        // TODO: Implement email sending via Supabase Edge Function or external service
        console.log('Email notification pending implementation:', customerDetails.email);
      }

      result.success = result.errors.length === 0;

      // Invalidate notification queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['unified-notification-count'] });

    } catch (error: any) {
      console.error('Error sending violation notifications:', error);
      result.errors.push(error.message || 'Unknown error');
      result.success = false;
    } finally {
      setIsSending(false);
      setLastResult(result);
    }

    return result;
  }, [
    companyId,
    getManagersToNotify,
    getCustomerDetails,
    createSystemNotification,
    formatViolationMessage,
    formatCustomerMessage,
    sendWhatsAppNotification,
    queryClient,
  ]);

  /**
   * Send bulk notifications for multiple violations
   */
  const sendBulkViolationNotifications = useCallback(async (
    violations: ViolationNotificationData[],
    settings: Partial<NotificationSettings> = {}
  ): Promise<NotificationResult> => {
    const config = { ...DEFAULT_SETTINGS, ...settings };
    const result: NotificationResult = {
      success: false,
      systemNotifications: 0,
      whatsappNotifications: 0,
      emailNotifications: 0,
      errors: [],
    };

    setIsSending(true);

    try {
      // Group violations by customer for consolidated notifications
      const violationsByCustomer = new Map<string, ViolationNotificationData[]>();
      
      for (const violation of violations) {
        const customerId = violation.customerId || 'unknown';
        if (!violationsByCustomer.has(customerId)) {
          violationsByCustomer.set(customerId, []);
        }
        violationsByCustomer.get(customerId)!.push(violation);
      }

      // Notify managers with summary
      if (config.notifyManagers || config.notifyFleetManager) {
        const managers = await getManagersToNotify();
        const totalFines = violations.reduce((sum, v) => sum + v.fineAmount, 0);

        const title = `🚨 تم استيراد ${violations.length} مخالفة مرورية جديدة`;
        const message = `تم تسجيل دفعة جديدة من المخالفات المرورية:

📊 عدد المخالفات: ${violations.length}
💰 إجمالي الغرامات: ${totalFines.toLocaleString()} ر.ق
👥 عدد العملاء المتأثرين: ${violationsByCustomer.size}

أبرز المخالفات:
${violations.slice(0, 5).map(v => `• ${v.vehiclePlateNumber}: ${v.violationType} (${v.fineAmount} ر.ق)`).join('\n')}
${violations.length > 5 ? `\n... و${violations.length - 5} مخالفة أخرى` : ''}

يرجى متابعة التحصيل من العملاء.`;

        for (const manager of managers) {
          if (!config.notifyManagers && manager.role !== 'fleet_manager') continue;
          if (!config.notifyFleetManager && manager.role === 'fleet_manager') continue;

          const sent = await createSystemNotification(
            manager.userId,
            title,
            message,
            'warning',
            undefined,
            'traffic_violation_batch'
          );

          if (sent) {
            result.systemNotifications++;
          }
        }
      }

      // Send individual customer notifications
      for (const [customerId, customerViolations] of violationsByCustomer) {
        if (customerId === 'unknown') continue;

        const totalCustomerFines = customerViolations.reduce((sum, v) => sum + v.fineAmount, 0);
        const firstViolation = customerViolations[0];
        
        let customerDetails = await getCustomerDetails(customerId);
        if (!customerDetails) continue;

        // Create consolidated notification message
        const title = `🚨 ${customerViolations.length} مخالفة مرورية جديدة`;
        const message = customerViolations.length === 1
          ? formatCustomerMessage(firstViolation).message
          : `عزيزي العميل ${customerDetails.name},

تم تسجيل ${customerViolations.length} مخالفة مرورية:

${customerViolations.map(v => `• ${v.vehiclePlateNumber}: ${v.violationType} - ${v.fineAmount.toLocaleString()} ر.ق`).join('\n')}

💰 الإجمالي: ${totalCustomerFines.toLocaleString()} ر.ق

يرجى التواصل معنا لتسوية المخالفات.`;

        // WhatsApp for customers
        if (config.notifyCustomerByWhatsApp && customerDetails.phone) {
          const whatsappMessage = customerViolations.length === 1
            ? formatCustomerMessage(firstViolation).whatsappMessage
            : `🚨 *${customerViolations.length} مخالفات مرورية*

السلام عليكم ${customerDetails.name},

تم تسجيل المخالفات التالية:
${customerViolations.slice(0, 3).map(v => `• ${v.vehiclePlateNumber}: ${v.fineAmount.toLocaleString()} ر.ق`).join('\n')}
${customerViolations.length > 3 ? `\n... و${customerViolations.length - 3} مخالفات أخرى` : ''}

💰 *الإجمالي: ${totalCustomerFines.toLocaleString()} ر.ق*

يرجى التواصل معنا.`;

          await sendWhatsAppNotification(customerDetails.phone, whatsappMessage);
          result.whatsappNotifications++;
        }
      }

      result.success = result.errors.length === 0;
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });

    } catch (error: any) {
      console.error('Error sending bulk violation notifications:', error);
      result.errors.push(error.message || 'Unknown error');
      result.success = false;
    } finally {
      setIsSending(false);
      setLastResult(result);
    }

    return result;
  }, [
    getManagersToNotify,
    getCustomerDetails,
    createSystemNotification,
    formatCustomerMessage,
    sendWhatsAppNotification,
    queryClient,
  ]);

  /**
   * Generate WhatsApp link for manual sending
   */
  const generateWhatsAppLink = useCallback((
    phone: string,
    violation: ViolationNotificationData
  ): string => {
    const { whatsappMessage } = formatCustomerMessage(violation);
    
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.startsWith('974') ? '+' + cleanPhone : '+974' + cleanPhone;
    }

    return `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(whatsappMessage)}`;
  }, [formatCustomerMessage]);

  return {
    sendViolationNotification,
    sendBulkViolationNotifications,
    generateWhatsAppLink,
    formatViolationMessage,
    formatCustomerMessage,
    isSending,
    lastResult,
    defaultSettings: DEFAULT_SETTINGS,
  };
}

export default useViolationNotifications;
