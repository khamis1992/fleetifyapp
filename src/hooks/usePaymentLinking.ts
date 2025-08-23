import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface PaymentLinkingData {
  paymentId: string;
  customerId?: string;
  shouldCreateInvoice: boolean;
  invoiceData?: {
    invoice_number?: string;
    due_date?: string;
    notes?: string;
  };
}

export const useLinkPaymentToCustomer = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId, user } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (data: PaymentLinkingData) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');
      if (!companyId) throw new Error('لم يتم العثور على الشركة');

      const { paymentId, customerId, shouldCreateInvoice, invoiceData } = data;

      // Get payment details
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('company_id', companyId)
        .single();

      if (paymentError) throw paymentError;

      let invoiceId = null;

      // Create invoice if requested
      if (shouldCreateInvoice && customerId) {
        // Generate invoice number
        const { data: existingInvoices } = await supabase
          .from('invoices')
          .select('id')
          .eq('company_id', companyId)
          .eq('invoice_date', new Date().toISOString().split('T')[0]);

        const invoiceNumber = invoiceData?.invoice_number || 
          `INV-${new Date().getFullYear()}-${String(existingInvoices?.length + 1 || 1).padStart(4, '0')}`;

        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            company_id: companyId,
            customer_id: customerId,
            invoice_number: invoiceNumber,
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: invoiceData?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            invoice_type: 'standard',
            subtotal: payment.amount,
            total_amount: payment.amount,
            status: 'sent',
            payment_status: 'paid',
            paid_amount: payment.amount,
            balance_due: 0,
            notes: invoiceData?.notes || `فاتورة مُنشأة تلقائياً للدفعة ${payment.payment_number}`,
            created_by: user.id
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        invoiceId = invoice.id;

        // Create invoice item
        await supabase
          .from('invoice_items')
          .insert({
            invoice_id: invoice.id,
            item_description: `خدمة مدفوعة - دفعة رقم ${payment.payment_number}`,
            line_number: 1,
            quantity: 1,
            unit_price: payment.amount,
            line_total: payment.amount
          });
      }

      // Update payment with customer and invoice links
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (customerId) {
        updateData.customer_id = customerId;
      }

      if (invoiceId) {
        updateData.invoice_id = invoiceId;
      }

      const { error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId)
        .eq('company_id', companyId);

      if (updateError) throw updateError;

      return {
        payment,
        invoice: invoiceId ? { id: invoiceId } : null,
        customer: customerId
      };
    },
    onSuccess: (data) => {
      toast({
        title: "تم ربط الدفعة بنجاح",
        description: data.invoice 
          ? "تم ربط الدفعة بالعميل وإنشاء الفاتورة"
          : "تم ربط الدفعة بالعميل",
      });
      
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
    },
    onError: (error) => {
      console.error('Error linking payment:', error);
      toast({
        title: "خطأ في ربط الدفعة",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useBulkLinkPayments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId, user } = useUnifiedCompanyAccess();
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  return useMutation({
    mutationFn: async (linkingData: PaymentLinkingData[]) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');
      if (!companyId) throw new Error('لم يتم العثور على الشركة');

      setProgress({ current: 0, total: linkingData.length });
      const results = [];

      for (let i = 0; i < linkingData.length; i++) {
        const data = linkingData[i];
        setProgress({ current: i + 1, total: linkingData.length });

        try {
          // Process each payment linking
          const { paymentId, customerId, shouldCreateInvoice, invoiceData } = data;

          const updateData: any = {
            updated_at: new Date().toISOString()
          };

          if (customerId) {
            updateData.customer_id = customerId;

            // Create invoice if requested
            if (shouldCreateInvoice) {
              const { data: payment } = await supabase
                .from('payments')
                .select('*')
                .eq('id', paymentId)
                .single();

              if (payment) {
                const invoiceNumber = `INV-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`;

                const { data: invoice } = await supabase
                  .from('invoices')
                  .insert({
                    company_id: companyId,
                    customer_id: customerId,
                    invoice_number: invoiceNumber,
                    invoice_date: new Date().toISOString().split('T')[0],
                    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    invoice_type: 'standard',
                    subtotal: payment.amount,
                    total_amount: payment.amount,
                    status: 'sent',
                    payment_status: 'paid',
                    paid_amount: payment.amount,
                    balance_due: 0,
                    notes: invoiceData?.notes || `فاتورة مُنشأة تلقائياً للدفعة ${payment.payment_number}`,
                    created_by: user.id
                  })
                  .select()
                  .single();

                if (invoice) {
                  updateData.invoice_id = invoice.id;
                  
                  await supabase
                    .from('invoice_items')
                    .insert({
                      invoice_id: invoice.id,
                      item_description: `خدمة مدفوعة - دفعة رقم ${payment.payment_number}`,
                      line_number: 1,
                      quantity: 1,
                      unit_price: payment.amount,
                      line_total: payment.amount
                    });
                }
              }
            }
          }

          await supabase
            .from('payments')
            .update(updateData)
            .eq('id', paymentId)
            .eq('company_id', companyId);

          results.push({ success: true, paymentId });
        } catch (error) {
          results.push({ success: false, paymentId: data.paymentId, error: error.message });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      toast({
        title: "تم الانتهاء من ربط المدفوعات",
        description: `تم ربط ${successCount} دفعة بنجاح${failCount > 0 ? `، فشل في ${failCount} دفعة` : ''}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setProgress({ current: 0, total: 0 });
    },
    onError: (error) => {
      console.error('Error in bulk linking:', error);
      toast({
        title: "خطأ في ربط المدفوعات",
        description: error.message,
        variant: "destructive",
      });
      setProgress({ current: 0, total: 0 });
    },
  });
};

export const useUnlinkedPayments = () => {
  const { companyId, user } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['unlinked-payments', companyId],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');
      if (!companyId) throw new Error('لم يتم العثور على الشركة');

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('company_id', companyId)
        .is('customer_id', null)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!companyId,
  });
};