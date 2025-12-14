import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SendTaskNotificationParams {
  taskId: string;
  recipientUserId: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate?: string;
  priority: string;
  notificationType: 'assignment' | 'due_reminder' | 'status_change';
}

interface WhatsAppMessage {
  to: string;
  template?: string;
  message?: string;
  components?: any[];
}

// Hook: Send WhatsApp Task Notification
export function useSendTaskWhatsAppNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      taskId,
      recipientUserId,
      taskTitle,
      taskDescription,
      dueDate,
      priority,
      notificationType,
    }: SendTaskNotificationParams) => {
      // 1. Get recipient's phone number
      const { data: recipientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('phone, first_name_ar, first_name')
        .eq('id', recipientUserId)
        .single();

      if (profileError || !recipientProfile?.phone) {
        console.warn('Could not find recipient phone number');
        return { success: false, reason: 'no_phone' };
      }

      // 2. Get company's WhatsApp settings
      const companyId = user?.profile?.company_id;
      if (!companyId) {
        return { success: false, reason: 'no_company' };
      }

      const { data: whatsappSettings, error: settingsError } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (settingsError || !whatsappSettings?.is_connected) {
        console.warn('WhatsApp not connected');
        return { success: false, reason: 'whatsapp_not_connected' };
      }

      // 3. Prepare message based on notification type
      const recipientName = recipientProfile.first_name_ar || recipientProfile.first_name || 'الموظف';
      let message = '';

      switch (notificationType) {
        case 'assignment':
          message = `مرحباً ${recipientName}،\n\n` +
            `📋 *تم إسناد مهمة جديدة إليك*\n\n` +
            `📌 العنوان: ${taskTitle}\n` +
            (taskDescription ? `📝 الوصف: ${taskDescription}\n` : '') +
            (dueDate ? `⏰ تاريخ الاستحقاق: ${new Date(dueDate).toLocaleDateString('en-US')}\n` : '') +
            `🎯 الأولوية: ${getPriorityLabel(priority)}\n\n` +
            `يرجى متابعة المهمة في نظام إدارة المهام.\n\n` +
            `مع تحياتنا 🚗\nفريق العمل`;
          break;

        case 'due_reminder':
          message = `تذكير: مهمتك "${taskTitle}" قريبة من موعد التسليم!\n` +
            `📅 تاريخ الاستحقاق: ${dueDate ? new Date(dueDate).toLocaleDateString('en-US') : 'غير محدد'}\n` +
            `يرجى إكمالها في الوقت المحدد.`;
          break;

        case 'status_change':
          message = `تم تحديث حالة المهمة "${taskTitle}".\n` +
            `يرجى مراجعة التفاصيل في النظام.`;
          break;
      }

      // 4. Send WhatsApp message using Edge Function
      try {
        const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            to: formatPhoneNumber(recipientProfile.phone),
            message,
            companyId,
          },
        });

        if (sendError) {
          console.error('Failed to send WhatsApp message:', sendError);
          return { success: false, reason: 'send_failed' };
        }

        // 5. Update task notification record
        await supabase
          .from('task_notifications')
          .update({
            whatsapp_sent: true,
            whatsapp_sent_at: new Date().toISOString(),
          })
          .eq('task_id', taskId)
          .eq('user_id', recipientUserId)
          .eq('type', notificationType);

        // 6. Update task record
        await supabase
          .from('tasks')
          .update({
            whatsapp_notification_sent: true,
            whatsapp_sent_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        return { success: true };
      } catch (error) {
        console.error('Error sending WhatsApp notification:', error);
        return { success: false, reason: 'exception' };
      }
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تم إرسال إشعار WhatsApp بنجاح');
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['task-notifications'] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'فشل إرسال إشعار WhatsApp');
    },
  });
}

// Hook: Send bulk task reminders
export function useSendBulkTaskReminders() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const companyId = user?.profile?.company_id;
      if (!companyId) {
        throw new Error('لم يتم تحديد الشركة');
      }

      // Get tasks due within 24 hours
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: dueTasks, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          due_date,
          priority,
          assigned_to,
          reminder_sent,
          assignee:profiles!tasks_assigned_to_fkey(id, phone, first_name_ar, first_name)
        `)
        .eq('company_id', companyId)
        .eq('reminder_sent', false)
        .not('assigned_to', 'is', null)
        .lte('due_date', tomorrow.toISOString())
        .gt('due_date', new Date().toISOString())
        .not('status', 'in', '("completed","cancelled")');

      if (error) throw error;

      let sentCount = 0;
      let failedCount = 0;

      for (const task of dueTasks || []) {
        const assignee = task.assignee as any;
        if (!assignee?.phone) continue;

        try {
          const message = `⏰ تذكير: المهمة "${task.title}" مستحقة قريباً!\n` +
            `📅 تاريخ الاستحقاق: ${new Date(task.due_date!).toLocaleDateString('en-US')}\n` +
            `🎯 الأولوية: ${getPriorityLabel(task.priority)}\n\n` +
            `يرجى إكمالها في الوقت المحدد.`;

          const { error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
            body: {
              to: formatPhoneNumber(assignee.phone),
              message,
              companyId,
            },
          });

          if (!sendError) {
            // Mark as reminder sent
            await supabase
              .from('tasks')
              .update({ reminder_sent: true })
              .eq('id', task.id);

            // Create notification record
            await supabase.from('task_notifications').insert({
              task_id: task.id,
              user_id: task.assigned_to,
              type: 'due_reminder',
              title: 'تذكير بموعد المهمة',
              message: `المهمة "${task.title}" مستحقة قريباً`,
              whatsapp_sent: true,
              whatsapp_sent_at: new Date().toISOString(),
            });

            sentCount++;
          } else {
            failedCount++;
          }
        } catch (e) {
          failedCount++;
        }
      }

      return { sentCount, failedCount, total: dueTasks?.length || 0 };
    },
    onSuccess: (result) => {
      if (result.sentCount > 0) {
        toast.success(`تم إرسال ${result.sentCount} تذكير بنجاح`);
      }
      if (result.failedCount > 0) {
        toast.warning(`فشل إرسال ${result.failedCount} تذكير`);
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-notifications'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'فشل إرسال التذكيرات');
    },
  });
}

// Helper functions
function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: 'منخفضة ⬇️',
    medium: 'متوسطة ➡️',
    high: 'عالية ⬆️',
    urgent: 'عاجلة 🔴',
  };
  return labels[priority] || priority;
}

function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Add Qatar country code if not present
  if (!cleaned.startsWith('974')) {
    cleaned = '974' + cleaned;
  }

  return cleaned;
}

export default useSendTaskWhatsAppNotification;

