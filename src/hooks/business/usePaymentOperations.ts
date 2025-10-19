import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { 
  EnhancedPaymentData,
  PaymentJournalPreview,
  enhancedPaymentSchema,
  paymentJournalPreviewSchema 
} from '@/schemas/payment.schema';

export interface PaymentOperationsOptions {
  autoCreateJournalEntry?: boolean;
  requireApproval?: boolean;
  enableNotifications?: boolean;
  validateBalance?: boolean;
}

interface Payment {
  id: string;
  payment_number?: string;
  payment_type?: string;
  payment_status?: string;
  amount?: number;
  [key: string]: unknown;
}

export const usePaymentOperations = (options: PaymentOperationsOptions = {}) => {
  const { companyId, user } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  const {
    autoCreateJournalEntry = true,
    requireApproval = false,
    enableNotifications = true,
    validateBalance = true
  } = options;

  // Check permissions
  const { hasAccess: canCreatePayments } = usePermissions({
    permissions: ['payments.create'],
    requireCompanyAdmin: false
  });

  const { hasAccess: canApprovePayments } = usePermissions({
    permissions: ['payments.approve'],
    requireCompanyAdmin: true
  });

  // Create payment operation
  const createPayment = useMutation({
    mutationFn: async (data: EnhancedPaymentData) => {
      console.log('💰 [usePaymentOperations] Starting payment creation:', data);

      // Check permissions
      if (!canCreatePayments) {
        throw new Error('ليس لديك صلاحية إنشاء الدفعات');
      }

      // Validate input data
      const validatedData = enhancedPaymentSchema.parse(data);

      // Additional business validations
      await validatePaymentData(validatedData);

      // Check account balance if required
      if (validateBalance && validatedData.type === 'payment') {
        await validateAccountBalance(validatedData);
      }

      // Prepare payment data for database 
      const paymentData = {
        amount: validatedData.amount,
        payment_number: validatedData.payment_number || await generatePaymentNumber(validatedData.type),
        payment_date: validatedData.payment_date,
        payment_method: validatedData.payment_method,
        reference_number: validatedData.reference_number,
        check_number: validatedData.check_number,
        currency: validatedData.currency || 'QAR',
        notes: validatedData.notes,
        payment_type: validatedData.type,
        payment_status: requireApproval ? 'pending' : 'completed',
        company_id: companyId,
        created_by: user?.id,
        // Optional fields based on payment type
        customer_id: validatedData.customer_id,
        vendor_id: validatedData.vendor_id,
        invoice_id: validatedData.invoice_id,
        contract_id: validatedData.contract_id,
        cost_center_id: validatedData.cost_center_id,
        bank_id: validatedData.bank_id,
        account_id: validatedData.account_id,
      };

      // Insert payment
      const { data: insertedPayment, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (error) {
        console.error('❌ [usePaymentOperations] Database error:', error);
        throw error;
      }

      console.log('✅ [usePaymentOperations] Payment created successfully:', insertedPayment);

      // Post-creation operations
      if (autoCreateJournalEntry && insertedPayment.payment_status === 'completed') {
        await createJournalEntry(insertedPayment);
      }

      if (enableNotifications) {
        await sendPaymentNotifications(insertedPayment);
      }

      return insertedPayment;
    },
    onSuccess: (payment) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financial-overview'] });
      
      const paymentType = payment.payment_type === 'receipt' ? 'إيصال القبض' : 'إيصال الصرف';
      toast.success(`تم إنشاء ${paymentType} بنجاح`);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء الدفعة'
      console.error('💥 [usePaymentOperations] Create payment error:', error);
      toast.error(errorMessage);
    }
  });

  // Update payment operation
  const updatePayment = useMutation({
    mutationFn: async ({ paymentId, data }: { paymentId: string; data: Partial<EnhancedPaymentData> }) => {
      console.log('🔄 [usePaymentOperations] Starting payment update:', { paymentId, data });

      // Check if payment exists and user has permission
      const { data: existingPayment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !existingPayment) {
        throw new Error('الدفعة غير موجودة أو لا تملك صلاحية للتعديل');
      }

      // Check if payment can be updated
      if (existingPayment.payment_status === 'completed' && !canApprovePayments) {
        throw new Error('لا يمكن تعديل دفعة مكتملة بدون صلاحية الموافقة');
      }

      // Prepare update data - only include valid database fields
      const updateData = {
        amount: data.amount,
        payment_number: data.payment_number,
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        reference_number: data.reference_number,
        check_number: data.check_number,
        currency: data.currency,
        notes: data.notes,
        payment_type: data.type,
        payment_status: data.payment_status,
        customer_id: data.customer_id,
        vendor_id: data.vendor_id,
        invoice_id: data.invoice_id,
        contract_id: data.contract_id,
        cost_center_id: data.cost_center_id,
        bank_id: data.bank_id,
        account_id: data.account_id,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      };

      // Update payment
      const { data: updatedPayment, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('❌ [usePaymentOperations] Update error:', error);
        throw error;
      }

      console.log('✅ [usePaymentOperations] Payment updated successfully:', updatedPayment);
      return updatedPayment;
    },
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment', payment.id] });
      
      toast.success('تم تحديث الدفعة بنجاح');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث الدفعة'
      console.error('💥 [usePaymentOperations] Update payment error:', error);
      toast.error(errorMessage);
    }
  });

  // Approve payment operation
  const approvePayment = useMutation({
    mutationFn: async (paymentId: string) => {
      console.log('✅ [usePaymentOperations] Starting payment approval:', paymentId);

      if (!canApprovePayments) {
        throw new Error('ليس لديك صلاحية الموافقة على الدفعات');
      }

      // Get payment details
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !payment) {
        throw new Error('الدفعة غير موجودة');
      }

      if (payment.payment_status !== 'pending') {
        throw new Error('الدفعة ليست في انتظار الموافقة');
      }

      // Approve payment
      const { data: approvedPayment, error } = await supabase
        .from('payments')
        .update({
          payment_status: 'completed',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', paymentId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('❌ [usePaymentOperations] Approval error:', error);
        throw error;
      }

      // Create journal entry after approval
      if (autoCreateJournalEntry) {
        await createJournalEntry(approvedPayment);
      }

      console.log('✅ [usePaymentOperations] Payment approved successfully:', approvedPayment);
      return approvedPayment;
    },
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment', payment.id] });
      
      toast.success('تم الموافقة على الدفعة بنجاح');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء الموافقة على الدفعة'
      console.error('💥 [usePaymentOperations] Approve payment error:', error);
      toast.error(errorMessage);
    }
  });

  // Cancel payment operation
  const cancelPayment = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason?: string }) => {
      console.log('❌ [usePaymentOperations] Starting payment cancellation:', { paymentId, reason });

      // Update payment status
      const { data: cancelledPayment, error } = await supabase
        .from('payments')
        .update({
          payment_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.id,
          cancellation_reason: reason,
        })
        .eq('id', paymentId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('❌ [usePaymentOperations] Cancellation error:', error);
        throw error;
      }

      // Reverse journal entry if exists
      await reverseJournalEntry(paymentId);

      console.log('✅ [usePaymentOperations] Payment cancelled successfully:', cancelledPayment);
      return cancelledPayment;
    },
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment', payment.id] });
      
      toast.success('تم إلغاء الدفعة بنجاح');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إلغاء الدفعة'
      console.error('💥 [usePaymentOperations] Cancel payment error:', error);
      toast.error(errorMessage);
    }
  });

  // Generate journal entry preview
  const generateJournalPreview = async (paymentData: EnhancedPaymentData): Promise<PaymentJournalPreview> => {
    console.log('📋 [usePaymentOperations] Generating journal preview:', paymentData);

    // This is a simplified preview generation
    // In a real system, this would be more complex based on chart of accounts
    const preview: PaymentJournalPreview = {
      entry_number: `JE-${new Date().getFullYear()}-XXXX`,
      entry_date: paymentData.payment_date,
      description: `${paymentData.type === 'receipt' ? 'Receipt' : 'Payment'} #${paymentData.payment_number}`,
      total_amount: paymentData.amount,
      lines: []
    };

    if (paymentData.type === 'receipt') {
      // Customer payment - debit cash/bank, credit revenue/customer
      preview.lines.push(
        {
          line_number: 1,
          account_name: paymentData.payment_method === 'cash' ? 'النقدية' : 'البنك',
          account_code: paymentData.payment_method === 'cash' ? '1110' : '1120',
          cost_center_name: 'الإدارة',
          description: `Receipt - ${paymentData.payment_number}`,
          debit_amount: paymentData.amount,
          credit_amount: 0,
        },
        {
          line_number: 2,
          account_name: 'العملاء',
          account_code: '1210',
          cost_center_name: 'الإدارة',
          description: `Receipt - ${paymentData.payment_number}`,
          debit_amount: 0,
          credit_amount: paymentData.amount,
        }
      );
    } else {
      // Vendor payment - debit expense/vendor, credit cash/bank
      preview.lines.push(
        {
          line_number: 1,
          account_name: 'الموردين',
          account_code: '2110',
          cost_center_name: 'الإدارة',
          description: `Payment - ${paymentData.payment_number}`,
          debit_amount: paymentData.amount,
          credit_amount: 0,
        },
        {
          line_number: 2,
          account_name: paymentData.payment_method === 'cash' ? 'النقدية' : 'البنك',
          account_code: paymentData.payment_method === 'cash' ? '1110' : '1120',
          cost_center_name: 'الإدارة',
          description: `Payment - ${paymentData.payment_number}`,
          debit_amount: 0,
          credit_amount: paymentData.amount,
        }
      );
    }

    return paymentJournalPreviewSchema.parse(preview);
  };

  // Helper functions
  const validatePaymentData = async (data: EnhancedPaymentData) => {
    // Check if payment number is unique
    if (data.payment_number) {
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('payment_number', data.payment_number)
        .eq('company_id', companyId)
        .single();

      if (existingPayment) {
        throw new Error('رقم الدفعة موجود مسبقاً');
      }
    }

    // Validate customer/vendor exists
    if (data.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id, is_blacklisted')
        .eq('id', data.customer_id)
        .eq('company_id', companyId)
        .single();

      if (!customer) {
        throw new Error('العميل غير موجود');
      }

      if (customer.is_blacklisted) {
        throw new Error('لا يمكن إجراء دفعات للعميل المحظور');
      }
    }

    if (data.vendor_id) {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('id', data.vendor_id)
        .eq('company_id', companyId)
        .single();

      if (!vendor) {
        throw new Error('المورد غير موجود');
      }
    }
  };

  const validateAccountBalance = async (data: EnhancedPaymentData) => {
    // This would check if there's sufficient balance for the payment
    // Implementation depends on your accounting system
    console.log('💰 Validating account balance for payment:', data.amount);
  };

  const generatePaymentNumber = async (type: 'receipt' | 'payment' | 'invoice_payment'): Promise<string> => {
    const prefix = type === 'receipt' ? 'REC' : type === 'payment' ? 'PAY' : 'INV';
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Get count of existing payments to generate next number
    const { count, error } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('payment_type', type);

    if (error) {
      console.error('Error generating payment number:', error);
      // Fallback to timestamp-based number
      return `${prefix}-${year}-${Date.now().toString().slice(-6)}`;
    }

    const nextNumber = (count || 0) + 1;
    return `${prefix}-${year}-${nextNumber.toString().padStart(3, '0')}`;
  };

  const createJournalEntry = async (payment: Payment) => {
    try {
      console.log('📝 Creating journal entry for payment:', payment.id);

      // For now, just log the creation - implement actual journal entry logic later
      // when the necessary database functions are available
      console.log('Journal entry creation placeholder for payment:', payment.payment_number);
    } catch (error) {
      console.error('Error in createJournalEntry:', error);
    }
  };

  const reverseJournalEntry = async (paymentId: string) => {
    try {
      console.log('🔄 Reversing journal entry for payment:', paymentId);
      
      // For now, just log the reversal - implement actual reversal logic later
      // when the necessary database functions are available
      console.log('Journal entry reversal placeholder for payment ID:', paymentId);
    } catch (error) {
      console.error('Error in reverseJournalEntry:', error);
    }
  };

  const sendPaymentNotifications = async (payment: Payment) => {
    try {
      console.log('📧 Sending payment notifications for:', payment.id);
      // Implementation for sending notifications
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  return {
    createPayment,
    updatePayment,
    approvePayment,
    cancelPayment,
    generateJournalPreview,
    // Expose loading states
    isCreating: createPayment.isPending,
    isUpdating: updatePayment.isPending,
    isApproving: approvePayment.isPending,
    isCancelling: cancelPayment.isPending,
    // Expose permissions
    canCreatePayments,
    canApprovePayments,
  };
};