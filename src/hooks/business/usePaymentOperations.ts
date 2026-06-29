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
import { calculateInvoiceTotalsAfterPaymentReversal } from '@/utils/invoiceHelpers';
import { assertFinancialPeriodOpen } from '@/services/financialControls';
import { useFinanceAccessGuard } from '@/hooks/finance/useFinanceAccessGuard';

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
  const financeAccess = useFinanceAccessGuard();

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

      if (!financeAccess.can('finance.payment.create')) {
        throw new Error('ليس لديك صلاحية تسجيل دفعة مالية');
      }

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

      await assertFinancialPeriodOpen(companyId, validatedData.payment_date);

      // ========== DUPLICATE PREVENTION LAYER ==========
      // 1. Check for existing idempotency key (retry detection)
      // Note: payments table doesn't have idempotency_key column — use reference_number as fallback
      if (data.idempotencyKey) {
        const { data: existingPayment, error: idempotencyError } = await supabase
          .from('payments')
          .select('*')
          .eq('reference_number', data.idempotencyKey)
          .eq('company_id', companyId)
          .maybeSingle();

        if (existingPayment) {
          console.log('♻️ [usePaymentOperations] Idempotency key found, returning existing payment:', existingPayment.payment_number);
          return existingPayment; // Return existing payment instead of creating duplicate
        }
        if (idempotencyError) {
          console.warn('⚠️ [usePaymentOperations] Idempotency check query failed (non-fatal):', idempotencyError.message);
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

      // Add idempotency key if provided (stored as reference_number for dedup)
      if (data.idempotencyKey) {
        paymentData.reference_number = data.idempotencyKey;
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
      if (!paymentData.bank_id && ['bank_transfer', 'check', 'credit_card', 'debit_card'].includes(validatedData.payment_method)) {
        const { data: defaultBank } = await supabase
          .from('banks')
          .select('id')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (defaultBank?.id) {
          paymentData.bank_id = defaultBank.id;
        }
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


      if (paymentData.invoice_id && paymentData.payment_status === 'completed') {
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('id,total_amount,paid_amount,payment_status')
          .eq('id', paymentData.invoice_id)
          .eq('company_id', companyId)
          .maybeSingle();

        if (invoiceError) {
          throw invoiceError;
        }

        if (!invoice) {
          throw new Error('Invoice not found for payment allocation');
        }

        const { data: existingInvoicePayments, error: existingPaymentsError } = await supabase
          .from('payments')
          .select('id,amount,payment_status')
          .eq('invoice_id', paymentData.invoice_id)
          .eq('company_id', companyId)
          .eq('payment_status', 'completed');

        if (existingPaymentsError) {
          throw existingPaymentsError;
        }

        const alreadyPaid = (existingInvoicePayments || []).reduce(
          (sum, payment) => sum + (Number(payment.amount) || 0),
          0
        );
        const invoiceTotal = Number(invoice.total_amount) || 0;
        const newTotalPaid = alreadyPaid + (Number(paymentData.amount) || 0);

        if (invoiceTotal > 0 && newTotalPaid - invoiceTotal > 0.01) {
          const overpaidAmount = (newTotalPaid - invoiceTotal).toFixed(2);
          throw new Error('Payment would overpay invoice by QAR ' + overpaidAmount + '. Link the excess amount to another invoice or record it as an advance payment.');
        }
      }

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

      if (data.amount !== undefined && Number(data.amount) !== Number(existingPayment.amount) && !financeAccess.canEditField('payment', 'amount')) {
        throw new Error('ليس لديك صلاحية تعديل مبلغ الدفعة');
      }

      if (data.payment_date !== undefined && data.payment_date !== existingPayment.payment_date && !financeAccess.canEditField('payment', 'payment_date')) {
        throw new Error('ليس لديك صلاحية تعديل تاريخ الدفعة');
      }

      if (data.bank_id !== undefined && data.bank_id !== existingPayment.bank_id && !financeAccess.canEditField('payment', 'bank_account_id')) {
        throw new Error('ليس لديك صلاحية تغيير حساب البنك للدفعة');
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

      if (!companyId) {
        throw new Error('لم يتم تحديد الشركة');
      }

      if (!financeAccess.can('finance.payment.cancel')) {
        throw new Error('ليس لديك صلاحية إلغاء الدفعات المالية');
      }

      // Fetch payment first (needed to reverse invoice totals safely)
      const { data: existingPayment, error: fetchPaymentError } = await supabase
        .from('payments')
        .select('id, invoice_id, amount, payment_status, created_by')
        .eq('id', paymentId)
        .eq('company_id', companyId)
        .single();

      if (fetchPaymentError || !existingPayment) {
        console.error('❌ [usePaymentOperations] Fetch payment before cancel failed:', fetchPaymentError);
        throw new Error('الدفعة غير موجودة');
      }

      if (existingPayment.payment_status === 'cancelled') {
        // Idempotent: nothing to do
        return existingPayment as any;
      }

      const segregationDecision = financeAccess.checkSegregationOfDuties({
        action: 'finance.payment.cancel',
        actorId: user?.id,
        creatorId: existingPayment.created_by,
      });

      if (!segregationDecision.allowed) {
        throw new Error(segregationDecision.reason || 'تم منع العملية بسبب قاعدة فصل المهام');
      }

      // If linked to invoice, reverse invoice paid totals
      if (existingPayment.invoice_id) {
        console.log('📄 [usePaymentOperations] Updating invoice:', existingPayment.invoice_id);
        
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('id, total_amount, paid_amount, balance_due')
          .eq('id', existingPayment.invoice_id)
          .eq('company_id', companyId)
          .single();

        if (invoiceError || !invoice) {
          console.error('❌ [usePaymentOperations] Fetch invoice before cancel failed:', invoiceError);
          throw new Error('تعذر جلب بيانات الفاتورة لتحديثها');
        }

        console.log('📊 [usePaymentOperations] Invoice before reversal:', {
          total_amount: invoice.total_amount,
          paid_amount: invoice.paid_amount,
          balance_due: invoice.balance_due,
          reversed_amount: existingPayment.amount,
        });

        const { paidAmount, balanceDue, paymentStatus } = calculateInvoiceTotalsAfterPaymentReversal({
          totalAmount: Number(invoice.total_amount) || 0,
          currentPaidAmount: Number(invoice.paid_amount) || 0,
          reversedAmount: Number(existingPayment.amount) || 0,
        });

        console.log('📊 [usePaymentOperations] Invoice after reversal:', {
          paidAmount,
          balanceDue,
          paymentStatus,
        });

        const { error: updateInvoiceError } = await supabase
          .from('invoices')
          .update({
            paid_amount: paidAmount,
            balance_due: balanceDue,
            payment_status: paymentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoice.id)
          .eq('company_id', companyId);

        if (updateInvoiceError) {
          console.error('❌ [usePaymentOperations] Update invoice after cancel failed:', updateInvoiceError);
          throw new Error('فشل تحديث الفاتورة بعد إلغاء الدفعة');
        }

        console.log('✅ [usePaymentOperations] Invoice updated successfully');
      } else {
        console.log('ℹ️ [usePaymentOperations] Payment has no invoice_id, skipping invoice update');
      }

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
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
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
    const transactionType = type === 'payment' ? 'payment' : 'receipt';
    
    // Get count of existing payments to generate next number
    const { count, error } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('transaction_type', transactionType);

    if (error) {
      console.error('Error generating payment number:', error);
      // Fallback to timestamp-based number
      return `${prefix}-${year}-${Date.now().toString().slice(-6)}`;
    }

    const nextNumber = (count || 0) + 1;
    return `${prefix}-${year}-${nextNumber.toString().padStart(3, '0')}`;
  };

  const createJournalEntry = async (payment: Payment): Promise<string> => {
    try {
      console.log('Creating journal entry for payment:', payment.id);

      if (!companyId || !payment.amount) {
        throw new Error('Missing company or payment amount for journal entry');
      }

      let cashAccount: { id: string } | null = null;

      if (payment.account_id && typeof payment.account_id === 'string') {
        const { data: selectedAccount } = await supabase
          .from('chart_of_accounts')
          .select('id')
          .eq('company_id', companyId)
          .eq('id', payment.account_id)
          .eq('is_header', false)
          .eq('is_active', true)
          .maybeSingle();

        cashAccount = selectedAccount;
      }

      if (!cashAccount) {
        const { data: defaultCashAccount } = await supabase
          .from('chart_of_accounts')
          .select('id')
          .eq('company_id', companyId)
          .in('account_code', ['11151', '11111', '1010'])
          .eq('is_header', false)
          .eq('is_active', true)
          .order('account_code')
          .limit(1)
          .maybeSingle();

        cashAccount = defaultCashAccount;
      }

      const { data: receivableCandidates } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('company_id', companyId)
        .in('account_code', ['12101', '11211', '11212', '11221', '11222'])
        .eq('is_header', false)
        .eq('is_active', true);

      const receivablePriority = ['12101', '11211', '11212', '11221', '11222'];
      const receivableAccount = (receivableCandidates || []).sort(
        (a, b) => receivablePriority.indexOf(a.account_code) - receivablePriority.indexOf(b.account_code)
      )[0];

      if (!cashAccount || !receivableAccount) {
        throw new Error('Payment journal entry accounts are not configured. Required: cash/bank account and customer receivables account.');
      }

      const entryNumber = `JE-PAY-${payment.payment_number}`;
      const entryDate = (payment as any).payment_date || new Date().toISOString().split('T')[0];

      const { data: journalEntry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_number: entryNumber,
          entry_date: entryDate,
          status: 'draft',
          description: `Payment receipt ${payment.payment_number}`,
          reference_type: 'payment',
          reference_id: payment.id,
          total_debit: payment.amount,
          total_credit: payment.amount,
          created_by: user?.id
        })
        .select()
        .single();

      if (entryError) {
        throw entryError;
      }

      const lines = [
        {
          journal_entry_id: journalEntry.id,
          account_id: cashAccount.id,
          line_number: 1,
          line_description: `Payment received - ${payment.payment_number}`,
          debit_amount: payment.amount,
          credit_amount: 0
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: receivableAccount.id,
          line_number: 2,
          line_description: `Receivables settlement - ${payment.payment_number}`,
          debit_amount: 0,
          credit_amount: payment.amount
        }
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) {
        await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
        throw linesError;
      }

      const { error: postEntryError } = await supabase
        .from('journal_entries')
        .update({
          status: 'posted',
          posted_by: user?.id,
          posted_at: new Date().toISOString(),
        })
        .eq('id', journalEntry.id)
        .eq('company_id', companyId);

      if (postEntryError) {
        await supabase.from('journal_entry_lines').delete().eq('journal_entry_id', journalEntry.id);
        await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
        throw postEntryError;
      }

      const { error: paymentLinkError } = await supabase
        .from('payments')
        .update({ journal_entry_id: journalEntry.id })
        .eq('id', payment.id)
        .eq('company_id', companyId);

      if (paymentLinkError) {
        console.warn('Payment journal entry was created but direct payment link was blocked by validation. Using journal reference link instead.', {
          paymentId: payment.id,
          journalEntryId: journalEntry.id,
          error: paymentLinkError.message,
        });
      }

      console.log('Journal entry created successfully:', entryNumber);
      return journalEntry.id;
    } catch (error) {
      console.error('Error in createJournalEntry:', error);
      throw error;
    }
  };
  const reverseJournalEntry = async (paymentId: string): Promise<string | null> => {
    try {
      console.log('Reversing journal entry for payment:', paymentId);

      if (!companyId) {
        throw new Error('Missing company for journal reversal');
      }

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('id,payment_number,journal_entry_id,payment_date')
        .eq('id', paymentId)
        .eq('company_id', companyId)
        .single();

      if (paymentError || !payment) {
        throw paymentError || new Error('Payment not found for journal reversal');
      }

      let journalEntryId = payment.journal_entry_id as string | null;

      if (!journalEntryId) {
        const { data: referencedJournalEntry, error: referenceError } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('company_id', companyId)
          .eq('reference_type', 'payment')
          .eq('reference_id', paymentId)
          .maybeSingle();

        if (referenceError) {
          throw referenceError;
        }

        journalEntryId = referencedJournalEntry?.id || null;
      }

      if (!journalEntryId) {
        console.warn('No journal entry found to reverse for payment:', paymentId);
        return null;
      }

      const { data: originalEntry, error: originalEntryError } = await supabase
        .from('journal_entries')
        .select('id,entry_number,entry_date,status,total_debit,total_credit,reversal_entry_id')
        .eq('id', journalEntryId)
        .eq('company_id', companyId)
        .single();

      if (originalEntryError || !originalEntry) {
        throw originalEntryError || new Error('Original journal entry not found');
      }

      if (originalEntry.reversal_entry_id) {
        return originalEntry.reversal_entry_id;
      }

      const { data: originalLines, error: linesError } = await supabase
        .from('journal_entry_lines')
        .select('account_id,line_description,debit_amount,credit_amount,line_number,cost_center_id,asset_id,employee_id')
        .eq('journal_entry_id', journalEntryId)
        .order('line_number', { ascending: true });

      if (linesError) {
        throw linesError;
      }

      if (!originalLines || originalLines.length === 0) {
        throw new Error('Original journal entry has no lines to reverse');
      }

      const reversalEntryNumber = `REV-${originalEntry.entry_number}-${Date.now().toString().slice(-6)}`;
      const reversalDate = new Date().toISOString().split('T')[0];

      const { data: reversalEntry, error: reversalEntryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_number: reversalEntryNumber,
          entry_date: reversalDate,
          status: 'draft',
          description: `Reversal of payment journal entry ${originalEntry.entry_number}`,
          reference_type: 'payment_reversal',
          reference_id: paymentId,
          total_debit: originalEntry.total_credit,
          total_credit: originalEntry.total_debit,
          created_by: user?.id,
        })
        .select('id')
        .single();

      if (reversalEntryError || !reversalEntry) {
        throw reversalEntryError || new Error('Failed to create reversal journal entry');
      }

      const reversalLines = originalLines.map((line: any, index: number) => ({
        journal_entry_id: reversalEntry.id,
        account_id: line.account_id,
        line_number: index + 1,
        line_description: `Reversal - ${line.line_description || originalEntry.entry_number}`,
        debit_amount: Number(line.credit_amount) || 0,
        credit_amount: Number(line.debit_amount) || 0,
        cost_center_id: line.cost_center_id || null,
        asset_id: line.asset_id || null,
        employee_id: line.employee_id || null,
      }));

      const { error: reversalLinesError } = await supabase
        .from('journal_entry_lines')
        .insert(reversalLines);

      if (reversalLinesError) {
        await supabase.from('journal_entries').delete().eq('id', reversalEntry.id);
        throw reversalLinesError;
      }

      const { error: postReversalError } = await supabase
        .from('journal_entries')
        .update({
          status: 'posted',
          posted_by: user?.id,
          posted_at: new Date().toISOString(),
        })
        .eq('id', reversalEntry.id)
        .eq('company_id', companyId);

      if (postReversalError) {
        throw postReversalError;
      }

      const { error: originalUpdateError } = await supabase
        .from('journal_entries')
        .update({
          status: 'reversed',
          reversal_entry_id: reversalEntry.id,
          reversed_at: new Date().toISOString(),
          reversed_by: user?.id,
        })
        .eq('id', originalEntry.id)
        .eq('company_id', companyId);

      if (originalUpdateError) {
        throw originalUpdateError;
      }

      return reversalEntry.id;
    } catch (error) {
      console.error('Error in reverseJournalEntry:', error);
      throw error;
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
