/**
 * Hook for manually sending WhatsApp payment reminders
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Contract {
  id: string;
  contract_number: string;
  customer_name?: string;
  customer_phone?: string;
  monthly_rent?: number;
}

interface SendManualRemindersParams {
  contracts: Contract[];
  reminderType?: 'pre_due' | 'due_date' | 'overdue' | 'escalation' | 'general';
  customMessage?: string;
}

/**
 * Hook to manually send WhatsApp reminders to customers
 */
export const useSendManualReminders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contracts, reminderType = 'general', customMessage }: SendManualRemindersParams) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      let successCount = 0;
      let failedCount = 0;
      const results = [];

      for (const contract of contracts) {
        try {
          // Get or find invoice for this contract
          const { data: invoice } = await supabase
            .from('invoices')
            .select('id, invoice_number, total_amount, due_date, customer_id')
            .eq('company_id', profile.company_id)
            .eq('contract_id', contract.id)
            .eq('payment_status', 'unpaid')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!invoice) {
            console.warn(`No unpaid invoice found for contract ${contract.contract_number}`);
            failedCount++;
            continue;
          }

          if (!invoice.customer_id) {
            console.warn(`No customer linked to invoice ${invoice.invoice_number}`);
            failedCount++;
            continue;
          }

          // Get customer details
          const { data: customer } = await supabase
            .from('customers')
            .select('id, phone, first_name, first_name_ar, last_name, last_name_ar')
            .eq('id', invoice.customer_id)
            .single();

          if (!customer?.phone) {
            console.warn(`No phone number for customer in contract ${contract.contract_number}`);
            failedCount++;
            continue;
          }

          // Prepare message template
          let messageTemplate = customMessage;
          
          if (!messageTemplate) {
            // Use default templates based on reminder type
            switch (reminderType) {
              case 'pre_due':
                messageTemplate = `مرحباً ${customer.first_name_ar || customer.first_name} 👋\n\nتذكير ودي: فاتورتك رقم ${invoice.invoice_number} بمبلغ ${invoice.total_amount} ر.ق ستستحق قريباً.\n\nشكراً لتعاونكم 🙏`;
                break;
              case 'due_date':
                messageTemplate = `عزيزي العميل ${customer.first_name_ar || customer.first_name} 👋\n\nتذكير: فاتورتك رقم ${invoice.invoice_number} بمبلغ ${invoice.total_amount} ر.ق مستحقة اليوم.\n\nنأمل سرعة السداد. شكراً 🙏`;
                break;
              case 'overdue':
                messageTemplate = `عزيزي العميل ${customer.first_name_ar || customer.first_name} ⚠️\n\nتنبيه هام: فاتورتك رقم ${invoice.invoice_number} متأخرة. المبلغ: ${invoice.total_amount} ر.ق + غرامات التأخير.\n\nيرجى السداد فوراً لتجنب الإجراءات القانونية. 🚨`;
                break;
              case 'escalation':
                messageTemplate = `عزيزي العميل ${customer.first_name_ar || customer.first_name} 🚨\n\nإنذار نهائي: فاتورتك رقم ${invoice.invoice_number} متأخرة بشكل كبير.\n\nسيتم اتخاذ إجراءات قانونية خلال 48 ساعة في حالة عدم السداد.\n\nالمبلغ المستحق: ${invoice.total_amount} ر.ق`;
                break;
              default:
                messageTemplate = `مرحباً ${customer.first_name_ar || customer.first_name} 👋\n\nتذكير: عقدك رقم ${contract.contract_number} يحتاج متابعة.\n\nللاستفسار تواصل معنا. شكراً 🙏`;
            }
          }

          // Create reminder schedule record
          const { data: reminder, error: reminderError } = await supabase
            .from('reminder_schedules')
            .insert({
              company_id: profile.company_id,
              invoice_id: invoice.id,
              customer_id: invoice.customer_id,
              reminder_type: reminderType,
              scheduled_date: new Date().toISOString().split('T')[0],
              scheduled_time: new Date().toTimeString().split(' ')[0],
              phone_number: customer.phone,
              customer_name: customer.first_name_ar || customer.first_name,
              message_template: messageTemplate,
              message_variables: {
                customer_name: customer.first_name_ar || customer.first_name,
                invoice_number: invoice.invoice_number,
                amount: invoice.total_amount,
                contract_number: contract.contract_number,
                due_date: invoice.due_date,
              },
              status: 'queued', // Queue for immediate sending
              sent_by: user.id,
            })
            .select()
            .single();

          if (reminderError) {
            console.error('Error creating reminder:', reminderError);
            failedCount++;
          } else {
            successCount++;
            results.push(reminder);
          }

          // Add small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`Error processing contract ${contract.contract_number}:`, error);
          failedCount++;
        }
      }

      return { successCount, failedCount, total: contracts.length, results };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['reminder-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-reminders'] });

      if (result.successCount > 0) {
        toast.success(
          `تم جدولة ${result.successCount} تذكير بنجاح`,
          {
            description: 'سيتم إرسال التذكيرات عبر واتساب قريباً',
          }
        );
      }

      if (result.failedCount > 0) {
        toast.warning(
          `فشل ${result.failedCount} من ${result.total}`,
          {
            description: 'بعض العقود لا تحتوي على فواتير أو أرقام هواتف',
          }
        );
      }
    },
    onError: (error: unknown) => {
      console.error('Error sending reminders:', error);
      toast.error('حدث خطأ أثناء إرسال التذكيرات');
    },
  });
};

