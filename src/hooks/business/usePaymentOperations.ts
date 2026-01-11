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
import { 
  createBankTransactionFromPayment, 
  reverseBankTransactionForPayment 
} from '@/utils/bankTransactionHelper';

export interface PaymentOperationsOptions {
  autoCreateJournalEntry?: boolean;
  autoUpdateBankBalance?: boolean;
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
    autoUpdateBankBalance = true,
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
    mutationFn: async (data: EnhancedPaymentData & { idempotencyKey?: string }) => {
      console.log('💰 [usePaymentOperations] Starting payment creation:', data);

      // Check company access
      if (!companyId) {
        throw new Error('لم يتم تحديد الشركة');
      }

      // Validate input data with better error handling
      let validatedData: EnhancedPaymentData;
      try {
        validatedData = enhancedPaymentSchema.parse(data);
        console.log('✅ Schema validation passed:', validatedData);
      } catch (zodError: any) {
        console.error('❌ Schema validation failed:', zodError);
        const errorMessage = zodError.errors?.map((e: any) => e.message).join(', ') || 'خطأ في البيانات المدخلة';
        throw new Error(errorMessage);
      }

      // ========== DUPLICATE PREVENTION LAYER ==========
      // 1. Check for existing idempotency key (retry detection)
      if (data.idempotencyKey) {
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('*')
          .eq('idempotency_key', data.idempotencyKey)
          .eq('company_id', companyId)
          .maybeSingle();

        if (existingPayment) {
          console.log('♻️ [usePaymentOperations] Idempotency key found, returning existing payment:', existingPayment.payment_number);
          return existingPayment; // Return existing payment instead of creating duplicate
        }
      }

      // 2. Pre-insert duplicate detection (within 1 hour window)
      // Build query dynamically to ensure all filters are applied
      let duplicateCheckQuery = supabase
        .from('payments')
        .select('*')
        .eq('company_id', companyId)
        .eq('amount', validatedData.amount)
        .eq('payment_date', validatedData.payment_date)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      // Add customer filter if present
      if (validatedData.customer_id) {
        duplicateCheckQuery = duplicateCheckQuery.eq('customer_id', validatedData.customer_id);
      }

      // Add contract filter if present (stricter check for contract payments)
      if (validatedData.contract_id) {
        duplicateCheckQuery = duplicateCheckQuery.eq('contract_id', validatedData.contract_id);
      } else {
        duplicateCheckQuery = duplicateCheckQuery.is('contract_id', null);
      }

      // Add invoice filter if present (critical for batch payments)
      // This is essential to allow multiple payments for different invoices with same amount
      if (validatedData.invoice_id) {
        duplicateCheckQuery = duplicateCheckQuery.eq('invoice_id', validatedData.invoice_id);
      }

      const { data: potentialDuplicates, error: duplicateCheckError } = await duplicateCheckQuery;

      if (!duplicateCheckError && potentialDuplicates && potentialDuplicates.length > 0) {
        const duplicateInfo = potentialDuplicates.map((p: any) =>
          `رقم الدفعة: ${p.payment_number} (${new Date(p.created_at).toLocaleTimeString('ar-SA')})`
        ).join('، ');

        throw new Error(
          `⚠️ تم اكتشاف دفعة مكررة محتملة!\n\n` +
          `توجد دفعة بنفس المبلغ (${validatedData.amount} ريال) والتاريخ (${validatedData.payment_date}) تم إنشاؤها خلال الساعة الماضية.\n\n` +
          `الدفع الموجود: ${duplicateInfo}\n\n` +
          `إذا كنت ترغب في إضافة دفعة جديدة، يرجى تغيير المبلغ أو التاريخ أو الانتظار لمدة ساعة.`
        );
      }
      // ========== END DUPLICATE PREVENTION ==========

      // Generate payment number if not provided
      const paymentNumber = validatedData.payment_number && validatedData.payment_number.length > 0
        ? validatedData.payment_number
        : await generatePaymentNumber(validatedData.type);

      // Determine transaction_type for database (must be 'payment' or 'receipt')
      const dbTransactionType = validatedData.type === 'receipt' ? 'receipt' : 'payment';
      
      // Map payment_method to payment_type (payment_type must be one of: cash, check, bank_transfer, credit_card, online_transfer)
      // payment_method values: cash, bank_transfer, check, credit_card
      let dbPaymentType = validatedData.payment_method;
      if (dbPaymentType === 'bank_transfer') {
        dbPaymentType = 'bank_transfer'; // Keep as is
      } else if (dbPaymentType === 'credit_card') {
        dbPaymentType = 'credit_card'; // Keep as is
      } else if (dbPaymentType === 'check') {
        dbPaymentType = 'check'; // Keep as is
      } else {
        dbPaymentType = 'cash'; // Default to cash
      }

      // Prepare payment data for database - only include non-empty optional fields
      const paymentData: Record<string, any> = {
        amount: validatedData.amount,
        payment_number: paymentNumber,
        payment_date: validatedData.payment_date,
        payment_method: validatedData.payment_method,
        currency: validatedData.currency || 'QAR',
        payment_type: dbPaymentType, // Fixed: use payment_method value, not type
        transaction_type: dbTransactionType,
        payment_status: requireApproval ? 'pending' : 'completed',
        company_id: companyId,
      };
      
      // Only add created_by if user.id exists and is a valid UUID
      if (user?.id && user.id !== '' && !user.id.match(/^0{8}-0{4}-0{4}-0{4}-0{4,12}$/)) {
        paymentData.created_by = user.id;
      }

      // Add idempotency key if provided
      if (data.idempotencyKey) {
        paymentData.idempotency_key = data.idempotencyKey;
      }

      console.log('📝 Prepared payment data:', paymentData);

      // Add optional fields only if they have valid values (non-empty strings for UUIDs)
      if (validatedData.reference_number) paymentData.reference_number = validatedData.reference_number;
      if (validatedData.check_number) paymentData.check_number = validatedData.check_number;
      if (validatedData.notes) paymentData.notes = validatedData.notes;

      // UUID fields - only add if they're valid UUIDs (not empty strings or undefined)
      // Convert undefined/null to null for PostgreSQL compatibility
      if (validatedData.customer_id && validatedData.customer_id !== '' && validatedData.customer_id !== 'undefined') {
        paymentData.customer_id = validatedData.customer_id;
      }
      if (validatedData.vendor_id && validatedData.vendor_id !== '' && validatedData.vendor_id !== 'undefined') {
        paymentData.vendor_id = validatedData.vendor_id;
      }
      if (validatedData.invoice_id && validatedData.invoice_id !== '' && validatedData.invoice_id !== 'undefined') {
        paymentData.invoice_id = validatedData.invoice_id;
      }
      if (validatedData.contract_id && validatedData.contract_id !== '' && validatedData.contract_id !== 'undefined') {
        paymentData.contract_id = validatedData.contract_id;
      }
      if (validatedData.cost_center_id && validatedData.cost_center_id !== '' && validatedData.cost_center_id !== 'undefined') {
        paymentData.cost_center_id = validatedData.cost_center_id;
      }
      if (validatedData.bank_id && validatedData.bank_id !== '' && validatedData.bank_id !== 'undefined') {
        paymentData.bank_id = validatedData.bank_id;
      }
      if (validatedData.account_id && validatedData.account_id !== '' && validatedData.account_id !== 'undefined') {
        paymentData.account_id = validatedData.account_id;
      }
      
      // Clean up: Remove any undefined values and invalid UUIDs from paymentData to prevent PostgreSQL errors
      // Pattern matches UUIDs that are all zeros (invalid UUIDs)
      // Note: The problematic value is "00000000-0000-0000-0000-0000-0000" (36 chars with 6 zeros at end)
      const invalidUuidValues = [
        '00000000-0000-0000-0000-0000-0000',
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-00000000'
      ];
      
      // More flexible pattern: matches UUIDs that start with zeros and have mostly zeros
      const isInvalidUuid = (val: string): boolean => {
        if (!val || typeof val !== 'string') return false;
        // Check exact matches first
        if (invalidUuidValues.includes(val)) return true;
        // Check if it's a UUID-like string that's all zeros
        if (val.includes('-') && val.length >= 30) {
          // Remove dashes and check if all zeros
          const withoutDashes = val.replace(/-/g, '');
          return /^0+$/.test(withoutDashes);
        }
        return false;
      };
      
      console.log('🔍 [usePaymentOperations] Before cleanup:', JSON.stringify(paymentData, null, 2));
      
      Object.keys(paymentData).forEach(key => {
        const value = paymentData[key];
        
        // Remove undefined values
        if (value === undefined || value === 'undefined') {
          console.warn(`⚠️ Removing undefined from ${key}`);
          delete paymentData[key];
          return;
        }
        
        // Remove null values for UUID fields
        if (value === null && (key.includes('_id') || key === 'id')) {
          console.warn(`⚠️ Removing null UUID from ${key}`);
          delete paymentData[key];
          return;
        }
        
        // Remove invalid UUID values (all zeros)
        if (typeof value === 'string' && isInvalidUuid(value)) {
          console.warn(`⚠️ Removing invalid UUID from ${key}: ${value}`);
          delete paymentData[key];
          return;
        }
        
        // Remove empty strings for UUID fields
        if (typeof value === 'string' && value === '' && (key.includes('_id') || key === 'id')) {
          console.warn(`⚠️ Removing empty UUID from ${key}`);
          delete paymentData[key];
          return;
        }
      });

      console.log('📝 Final payment data for insert:', JSON.stringify(paymentData, null, 2));

      // Insert payment with timeout protection
      const { data: insertedPayment, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (error) {
        console.error('❌ [usePaymentOperations] Database error:', error);
        console.error('❌ [usePaymentOperations] Error details:', {
          code: error.code,
          message: error.message,
          hint: error.hint,
          details: error.details,
          paymentData: paymentData
        });
        
        // Provide more descriptive error messages
        if (error.code === '23505') {
          throw new Error('رقم الدفعة موجود مسبقاً');
        } else if (error.code === '23503') {
          throw new Error('خطأ في ربط البيانات - تحقق من العميل أو المورد أو العقد');
        } else if (error.code === '22P02') {
          // Invalid input syntax - show detailed error
          const errorDetails = error.message || error.hint || error.details || '';
          const fieldMatch = errorDetails.match(/column "(\w+)"/i);
          const fieldName = fieldMatch ? fieldMatch[1] : 'غير محدد';
          throw new Error(`خطأ في تنسيق البيانات - الحقل "${fieldName}": ${errorDetails || 'تنسيق غير صحيح'}`);
        } else if (error.code === '23514') {
          // Check constraint violation - use the detailed message from database
          const errorMsg = error.message || error.hint || 'تم رفض الدفعة بسبب عدم استيفاء شروط التحقق';
          throw new Error(errorMsg);
        }
        // Use hint if available (contains detailed validation message)
        const errorMessage = error.hint || error.message || 'فشل حفظ الدفعة في قاعدة البيانات';
        throw new Error(errorMessage);
      }

      console.log('✅ [usePaymentOperations] Payment created successfully:', insertedPayment);

      // Post-creation operations (don't block on these)
      try {
        if (autoCreateJournalEntry && insertedPayment.payment_status === 'completed') {
          await createJournalEntry(insertedPayment);
        }
        
        // إنشاء حركة بنكية تلقائياً
        if (autoUpdateBankBalance && insertedPayment.payment_status === 'completed' && insertedPayment.bank_id) {
          const bankResult = await createBankTransactionFromPayment({
            id: insertedPayment.id,
            company_id: insertedPayment.company_id,
            amount: insertedPayment.amount,
            payment_date: insertedPayment.payment_date,
            payment_method: insertedPayment.payment_method,
            payment_number: insertedPayment.payment_number,
            reference_number: insertedPayment.reference_number,
            check_number: insertedPayment.check_number,
            transaction_type: insertedPayment.transaction_type,
            bank_id: insertedPayment.bank_id,
            notes: insertedPayment.notes
          }, user?.id);
          
          if (!bankResult.success) {
            console.warn('⚠️ Bank transaction creation failed:', bankResult.error);
          } else {
            console.log('✅ Bank transaction created for payment');
          }
        }
        
        if (enableNotifications) {
          await sendPaymentNotifications(insertedPayment);
        }
      } catch (postError) {
        console.warn('⚠️ Post-creation operations failed:', postError);
        // Don't throw - payment was created successfully
      }

      return insertedPayment;
    },
    onSuccess: (payment) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financial-overview'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-summary'] });
      
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
      
      // عكس حركة البنك إذا وجدت
      if (autoUpdateBankBalance) {
        const reversalResult = await reverseBankTransactionForPayment(paymentId, user?.id);
        if (!reversalResult.success) {
          console.warn('⚠️ Bank transaction reversal failed:', reversalResult.error);
        } else {
          console.log('✅ Bank transaction reversed for cancelled payment');
        }
      }

      console.log('✅ [usePaymentOperations] Payment cancelled successfully:', cancelledPayment);
      return cancelledPayment;
    },
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment', payment.id] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-summary'] });
      
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

      if (!companyId || !payment.amount) {
        console.warn('⚠️ Missing required data for journal entry');
        return;
      }

      // جلب حسابات القيد المحاسبي
      // حساب النقدية/البنك (مدين) - حساب 11151
      const { data: cashAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', companyId)
        .eq('account_code', '11151')
        .eq('is_header', false)
        .single();

      // حساب الذمم المدينة (دائن) - حساب 12101 أو إيرادات 41101
      const { data: receivableAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', companyId)
        .eq('account_code', '12101')
        .eq('is_header', false)
        .single();

      if (!cashAccount || !receivableAccount) {
        console.warn('⚠️ Required accounts not found for journal entry (11151, 12101)');
        return;
      }

      const entryNumber = `JE-PAY-${payment.payment_number}`;
      const entryDate = (payment as any).payment_date || new Date().toISOString().split('T')[0];

      // إنشاء القيد الرئيسي
      const { data: journalEntry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_number: entryNumber,
          entry_date: entryDate,
          entry_type: 'standard',
          status: 'posted',
          description: `قيد دفعة رقم ${payment.payment_number}`,
          reference_type: 'payment',
          reference_id: payment.id,
          total_debit: payment.amount,
          total_credit: payment.amount,
          created_by: user?.id,
          notes: 'تم الإنشاء تلقائياً من نظام الدفعات'
        })
        .select()
        .single();

      if (entryError) {
        console.error('❌ Error creating journal entry:', entryError);
        return;
      }

      // إنشاء سطور القيد
      const lines = [
        {
          journal_entry_id: journalEntry.id,
          account_id: cashAccount.id,
          line_number: 1,
          line_description: `استلام دفعة - ${payment.payment_number}`,
          debit_amount: payment.amount,
          credit_amount: 0,
          reference_type: 'payment',
          reference_id: payment.id
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: receivableAccount.id,
          line_number: 2,
          line_description: `تسديد ذمم - دفعة ${payment.payment_number}`,
          debit_amount: 0,
          credit_amount: payment.amount,
          reference_type: 'payment',
          reference_id: payment.id
        }
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) {
        console.error('❌ Error creating journal entry lines:', linesError);
        // حذف القيد الرئيسي في حالة فشل السطور
        await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
        return;
      }

      // تحديث الدفعة بربط القيد المحاسبي
      await supabase
        .from('payments')
        .update({ journal_entry_id: journalEntry.id })
        .eq('id', payment.id);

      console.log('✅ Journal entry created successfully:', entryNumber);
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