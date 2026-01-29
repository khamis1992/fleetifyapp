/**
 * Create Notification Utility
 * دوال مساعدة لإنشاء التنبيهات
 */

import { supabase } from '@/integrations/supabase/client';

interface CreateNotificationParams {
  profileId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  contractId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * Create a notification
 */
export const createNotification = async ({
  profileId,
  type,
  title,
  message,
  link,
  contractId,
  priority = 'normal',
}: CreateNotificationParams) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        userId: profileId, // Using existing schema
        type: type,
        title: title,
        message: message,
        relatedId: contractId || null,
        relatedType: contractId ? 'contract' : null,
        isRead: false,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error };
  }
};

/**
 * Create notification for payment overdue
 */
export const notifyPaymentOverdue = async (
  profileId: string,
  contractNumber: string,
  daysOverdue: number,
  amount: number,
  contractId: string
) => {
  return createNotification({
    profileId,
    type: 'payment_overdue',
    title: `دفعة متأخرة - عقد #${contractNumber}`,
    message: `الدفعة متأخرة منذ ${daysOverdue} يوم. المبلغ: ${amount} ريال`,
    link: `/employee-workspace`,
    contractId,
    priority: daysOverdue > 30 ? 'urgent' : daysOverdue > 7 ? 'high' : 'normal',
  });
};

/**
 * Create notification for contract assigned
 */
export const notifyContractAssigned = async (
  profileId: string,
  contractNumber: string,
  customerName: string,
  contractId: string
) => {
  return createNotification({
    profileId,
    type: 'contract_assigned',
    title: `تم تعيين عقد جديد`,
    message: `تم تعيين عقد #${contractNumber} (${customerName}) لك`,
    link: `/employee-workspace`,
    contractId,
    priority: 'normal',
  });
};

/**
 * Create notification for contract unassigned
 */
export const notifyContractUnassigned = async (
  profileId: string,
  contractNumber: string,
  reason: string
) => {
  return createNotification({
    profileId,
    type: 'contract_unassigned',
    title: `تم إلغاء تعيين عقد`,
    message: `تم إلغاء تعيين عقد #${contractNumber}. السبب: ${reason}`,
    link: `/employee-workspace`,
    priority: 'normal',
  });
};

/**
 * Create notification for followup due today
 */
export const notifyFollowupDueToday = async (
  profileId: string,
  taskTitle: string,
  customerName: string,
  taskId: string
) => {
  return createNotification({
    profileId,
    type: 'followup_due_today',
    title: `متابعة مجدولة اليوم`,
    message: `${taskTitle} - ${customerName}`,
    link: `/employee-workspace`,
    priority: 'high',
  });
};

/**
 * Create notification for contract expiring
 */
export const notifyContractExpiring = async (
  profileId: string,
  contractNumber: string,
  daysUntilExpiry: number,
  contractId: string
) => {
  return createNotification({
    profileId,
    type: daysUntilExpiry <= 7 ? 'contract_expiring_7' : 'contract_expiring_30',
    title: `عقد ينتهي قريباً`,
    message: `عقد #${contractNumber} ينتهي خلال ${daysUntilExpiry} يوم`,
    link: `/employee-workspace`,
    contractId,
    priority: daysUntilExpiry <= 7 ? 'high' : 'normal',
  });
};

/**
 * Create notification for no contact warning
 */
export const notifyNoContact = async (
  profileId: string,
  contractNumber: string,
  daysSinceContact: number,
  contractId: string
) => {
  return createNotification({
    profileId,
    type: 'no_contact_warning',
    title: `لم يتم التواصل مع العميل`,
    message: `لم يتم التواصل مع عميل عقد #${contractNumber} منذ ${daysSinceContact} يوم`,
    link: `/employee-workspace`,
    contractId,
    priority: daysSinceContact > 30 ? 'high' : 'normal',
  });
};

/**
 * Create notification for performance alert
 */
export const notifyPerformanceAlert = async (
  profileId: string,
  performanceScore: number,
  reason: string
) => {
  return createNotification({
    profileId,
    type: 'performance_alert',
    title: `تنبيه أداء`,
    message: `نقاط أدائك: ${performanceScore}%. ${reason}`,
    link: `/employee-workspace`,
    priority: performanceScore < 50 ? 'high' : 'normal',
  });
};
