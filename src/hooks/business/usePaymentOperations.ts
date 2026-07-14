import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { 
  EnhancedPaymentData,
  PaymentJournalPreview,
  enhancedPaymentSchema,
  paymentJournalPreviewSchema 
} from '@/schemas/payment.schema';
import { assertFinancialPeriodOpen } from '@/services/financialControls';
import { useFinanceAccessGuard } from '@/hooks/finance/useFinanceAccessGuard';

export interface PaymentOperationsOptions {
  autoCreateJournalEntry?: boolean;
  autoUpdateBankBalance?: boolean;
  requireApproval?: boolean;
  enableNotifications?: boolean;
  validateBalance?: boolean;
}

export interface PaymentRegistrationMetadata {
  monthly_amount?: number;
  amount_paid?: number;
  remaining_amount?: number;
  payment_month?: string;
  due_date?: string;
  days_overdue?: number;
  late_fee_amount?: number;
}

interface Payment {
  id: string;
  payment_number?: string;
  payment_type?: string;
  payment_status?: string;
  amount?: number;
  [key: string]: unknown;
}

type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

const getSupabaseErrorMessage = (error: unknown): string => {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  if (typeof error === 'object') {
    const supabaseError = error as {
      code?: string;
      message?: string;
      details?: string | null;
      hint?: string | null;
      status?: number;
      statusText?: string;
    };

    return [
      supabaseError.message,
      supabaseError.details,
      supabaseError.hint,
      supabaseError.code,
      supabaseError.statusText,
      supabaseError.status ? `HTTP ${supabaseError.status}` : null,
    ].filter(Boolean).join(' - ');
  }

  return String(error);
};

const getPaymentCancellationFailureMessage = (error: unknown): string => {
  const message = getSupabaseErrorMessage(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('authentication required')) {
    return 'تعذر إلغاء الدفعة لأن الجلسة غير صالحة. أعد تسجيل الدخول ثم جرّب مرة أخرى.';
  }

  if (normalized.includes('financial period') || normalized.includes('locked')) {
    return 'تعذر إلغاء الدفعة لأن الفترة المالية مقفلة. تم تجهيز إصلاح دالة الإلغاء لتتعامل مع الدفعات القديمة من داخل قاعدة البيانات.';
  }

  if (normalized.includes('completed payments are immutable') || normalized.includes('immutable')) {
    return 'تعذر إلغاء الدفعة لأنها مكتملة ومحميّة من التعديل المباشر. يجب استخدام دالة الإلغاء الذري بعد تحديث قاعدة البيانات.';
  }

  return message
    ? `تعذر إلغاء الدفعة من قاعدة البيانات. السبب: ${message}`
    : 'تعذر إلغاء الدفعة من قاعدة البيانات.';
};

export const usePaymentOperations = (options: PaymentOperationsOptions = {}) => {
  const { companyId, user } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const financeAccess = useFinanceAccessGuard();

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
    mutationFn: async (data: EnhancedPaymentData & {
      idempotencyKey?: string;
      registrationMetadata?: PaymentRegistrationMetadata;
    }) => {
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

      const ensurePaymentJournalOrThrow = async (payment: any) => {
        if (autoCreateJournalEntry && payment?.payment_status === 'completed') {
          const journalEntryId = await createJournalEntry(payment);
          return journalEntryId && !payment.journal_entry_id
            ? { ...payment, journal_entry_id: journalEntryId }
            : payment;
        }

        return payment;
      };

      // ========== DUPLICATE PREVENTION LAYER ==========
      // 1. Check for existing idempotency key (retry detection)
      // Note: payments table doesn't have idempotency_key column — use reference_number as fallback
      if (data.idempotencyKey) {
        const { data: existingPayment, error: idempotencyError } = await supabase
          .from('payments')
          .select('*')
          .eq('reference_number', data.idempotencyKey)
          .eq('company_id', companyId)
          .neq('payment_status', 'cancelled')
          .maybeSingle();

        if (existingPayment) {
          console.log('♻️ [usePaymentOperations] Idempotency key found, returning existing payment:', existingPayment.payment_number);
          return await ensurePaymentJournalOrThrow(existingPayment);
        }
        if (idempotencyError) {
          console.warn('⚠️ [usePaymentOperations] Idempotency check query failed (non-fatal):', idempotencyError.message);
        }
      }

      // 2. Pre-insert duplicate detection (full history, excluding cancelled)
      // Exclude cancelled payments — they are effectively deleted and should not block re-imports.
      let duplicateCheckQuery = supabase
        .from('payments')
        .select('*')
        .eq('company_id', companyId)
        .eq('amount', validatedData.amount)
        .eq('payment_date', validatedData.payment_date)
        .neq('payment_status', 'cancelled');

      // Add customer filter if present
      if (validatedData.customer_id) {
        duplicateCheckQuery = duplicateCheckQuery.eq('customer_id', validatedData.customer_id);
      }

      // Add invoice filter if present (critical for batch payments)
      // This is essential to allow multiple payments for different invoices with same amount
      if (validatedData.invoice_id) {
        duplicateCheckQuery = duplicateCheckQuery.eq('invoice_id', validatedData.invoice_id);
      } else if (validatedData.contract_id) {
        duplicateCheckQuery = duplicateCheckQuery.eq('contract_id', validatedData.contract_id);
      } else {
        duplicateCheckQuery = duplicateCheckQuery.is('contract_id', null);
      }

      const { data: potentialDuplicates, error: duplicateCheckError } = await duplicateCheckQuery;

      if (!duplicateCheckError && potentialDuplicates && potentialDuplicates.length > 0) {
        if (data.idempotencyKey) {
          const duplicate = potentialDuplicates[0];
          return await ensurePaymentJournalOrThrow(duplicate);
        }

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
      const hasManualPaymentNumber = Boolean(validatedData.payment_number && validatedData.payment_number.length > 0);
      let paymentNumber = hasManualPaymentNumber
        ? validatedData.payment_number!
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

      const enrichPaymentErrorMessage = async (message: string) => {
        const details: string[] = [];

        if (paymentData.contract_id) {
          const { data: contract } = await supabase
            .from('contracts')
            .select(`
              contract_number,
              customers:customer_id (
                first_name,
                last_name,
                first_name_ar,
                last_name_ar,
                company_name,
                company_name_ar
              )
            `)
            .eq('company_id', companyId)
            .eq('id', paymentData.contract_id)
            .maybeSingle();

          if (contract?.contract_number) {
            details.push(`العقد ${contract.contract_number}`);
          }

          const customer = Array.isArray(contract?.customers)
            ? contract?.customers[0]
            : contract?.customers;
          const customerName = [
            customer?.first_name_ar,
            customer?.last_name_ar,
            customer?.first_name,
            customer?.last_name,
            customer?.company_name_ar,
            customer?.company_name,
          ].filter(Boolean).join(' ').trim();

          if (customerName) {
            details.push(`العميل ${customerName}`);
          }
        }

        if (paymentData.invoice_id) {
          const { data: invoice } = await supabase
            .from('invoices')
            .select('invoice_number')
            .eq('company_id', companyId)
            .eq('id', paymentData.invoice_id)
            .maybeSingle();

          if (invoice?.invoice_number) {
            details.push(`الفاتورة ${invoice.invoice_number}`);
          }
        }

        return details.length ? `${details.join(' - ')}: ${message}` : message;
      };
      
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

      // Insert payment with retry protection for automatically generated numbers.
      let insertedPayment: any = null;
      let error: any = null;
      const maxInsertAttempts = hasManualPaymentNumber ? 1 : 5;
      const findExistingTransactionPayment = async () => {
        // Match the database constraint unique_payment_per_invoice_date_amount
        // which covers (invoice_id, payment_date, amount) — NOT transaction_type.
        let existingPaymentQuery = supabase
          .from('payments')
          .select('*')
          .eq('company_id', companyId)
          .eq('amount', paymentData.amount)
          .eq('payment_date', paymentData.payment_date)
          .neq('payment_status', 'cancelled')
          .limit(1);

        if (paymentData.invoice_id) {
          existingPaymentQuery = existingPaymentQuery.eq('invoice_id', paymentData.invoice_id);
        }
        if (paymentData.contract_id) {
          existingPaymentQuery = existingPaymentQuery.eq('contract_id', paymentData.contract_id);
        }
        if (paymentData.customer_id) {
          existingPaymentQuery = existingPaymentQuery.eq('customer_id', paymentData.customer_id);
        }

        const { data: existingMatches, error: existingMatchError } = await existingPaymentQuery;
        if (existingMatchError) {
          console.warn('⚠️ [usePaymentOperations] Existing transaction lookup failed:', existingMatchError.message);
          return null;
        }

        return existingMatches?.[0] || null;
      };

      for (let attempt = 0; attempt < maxInsertAttempts; attempt += 1) {
        if (attempt > 0) {
          paymentNumber = await generatePaymentNumber(validatedData.type, attempt);
          paymentData.payment_number = paymentNumber;
          console.warn('⚠️ [usePaymentOperations] Retrying payment insert with regenerated number:', paymentNumber);
        }

        const { data: paymentId, error: atomicError } = await (supabase as any).rpc(
          'create_payment_atomic',
          {
            p_company_id: companyId,
            p_customer_id: paymentData.customer_id ?? null,
            p_contract_id: paymentData.contract_id ?? null,
            p_invoice_id: paymentData.invoice_id ?? null,
            p_payment_number: paymentData.payment_number ?? null,
            p_payment_date: paymentData.payment_date,
            p_amount: paymentData.amount,
            p_payment_method: paymentData.payment_method,
            p_payment_type: paymentData.payment_type,
            p_transaction_type: paymentData.transaction_type,
            p_reference_number: paymentData.reference_number ?? null,
            p_agreement_number: null,
            p_check_number: paymentData.check_number ?? null,
            p_bank_id: paymentData.bank_id ?? null,
            p_notes: paymentData.notes ?? null,
            p_created_by: paymentData.created_by ?? null,
            p_idempotency_key: data.idempotencyKey ?? null,
            p_account_id: paymentData.account_id ?? null,
            p_cost_center_id: paymentData.cost_center_id ?? null,
            p_currency: paymentData.currency ?? 'QAR',
            p_initial_status: requireApproval ? 'pending' : 'completed',
            p_registration_metadata: data.registrationMetadata ?? {},
          }
        );

        if (atomicError) {
          insertedPayment = null;
          error = atomicError;
        } else {
          const { data: createdPayment, error: fetchCreatedError } = await supabase
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .eq('company_id', companyId)
            .single();

          insertedPayment = createdPayment;
          error = fetchCreatedError;
        }

        if (!error) {
          break;
        }

        if (error.code === '23505') {
          // First try: find an active (non-cancelled) duplicate
          const existingTransactionPayment = await findExistingTransactionPayment();
          if (existingTransactionPayment) {
            console.log('♻️ [usePaymentOperations] Duplicate transaction found, returning existing payment:', existingTransactionPayment.payment_number);
            insertedPayment = await ensurePaymentJournalOrThrow(existingTransactionPayment);
            error = null;
            break;
          }

          // Cancelled payments are immutable audit records. A retry must create a
          // new payment number and idempotency key rather than reactivate history.
        }

        if (error.code !== '23505' || hasManualPaymentNumber) {
          break;
        }
      }

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
          const duplicateMessage = String(error.message || '').toLowerCase();
          if (
            duplicateMessage.includes('unique_transaction') ||
            duplicateMessage.includes('idx_payments_unique_transaction') ||
            duplicateMessage.includes('invoice_payments')
          ) {
            throw new Error('تم تسجيل هذه الدفعة سابقاً لنفس العقد/الفاتورة/التاريخ/المبلغ');
          }
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
          throw new Error(await enrichPaymentErrorMessage(errorMsg));
        }
        // Use hint if available (contains detailed validation message)
        const errorMessage = error.hint || error.message || 'فشل حفظ الدفعة في قاعدة البيانات';
        throw new Error(await enrichPaymentErrorMessage(errorMessage));
      }

      console.log('✅ [usePaymentOperations] Payment created successfully:', insertedPayment);

      if (insertedPayment.payment_status === 'completed' && !insertedPayment.journal_entry_id) {
        throw new Error('تم إيقاف العملية لأن قاعدة البيانات لم تُرجع القيد المحاسبي الذري للدفعة');
      }

      // Notifications are non-financial and can safely run after the atomic commit.
      try {
        if (enableNotifications) {
          await sendPaymentNotifications(insertedPayment);
        }
      } catch (postError) {
        console.warn('⚠️ Post-creation operations failed:', postError);
        // The payment, journal, allocation, and bank movement already committed together.
      }

      return insertedPayment;
    },
    onSuccess: (payment) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['contract-payments'] });
      queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
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
      if (!companyId) throw new Error('لم يتم تحديد الشركة');

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

      const currentStatus = String(existingPayment.payment_status || '').toLowerCase();
      if (['completed', 'paid', 'success', 'succeeded', 'cancelled', 'canceled', 'voided'].includes(currentStatus)) {
        throw new Error('الدفعة المكتملة سجل مالي ثابت؛ استخدم إعادة التخصيص أو الإلغاء ثم أنشئ دفعة جديدة');
      }
      if (data.payment_status !== undefined && data.payment_status !== existingPayment.payment_status) {
        throw new Error('تغيير حالة الدفعة يتم فقط من خلال أوامر الاعتماد أو الإلغاء المعتمدة');
      }
      if (
        (data.invoice_id !== undefined && data.invoice_id !== existingPayment.invoice_id)
        || (data.contract_id !== undefined && data.contract_id !== existingPayment.contract_id)
      ) {
        throw new Error('ربط الدفعة بالفاتورة أو العقد يتم فقط من شاشة تخصيص الدفعات');
      }

      // Prepare update data - only include valid database fields
      const updateData: PaymentUpdate = {
        amount: data.amount,
        payment_number: data.payment_number,
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        reference_number: data.reference_number,
        check_number: data.check_number,
        currency: data.currency,
        notes: data.notes,
        payment_type: data.payment_method,
        transaction_type: data.type === 'payment' ? 'payment' : data.type ? 'receipt' : undefined,
        customer_id: data.customer_id,
        vendor_id: data.vendor_id,
        cost_center_id: data.cost_center_id,
        bank_id: data.bank_id,
        account_id: data.account_id,
        updated_at: new Date().toISOString(),
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
      if (!companyId) {
        throw new Error('لم يتم تحديد الشركة');
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

      const approvalDecision = financeAccess.checkSegregationOfDuties({
        action: 'finance.payment.approve',
        actorId: user?.id,
        creatorId: payment.created_by,
      });
      if (!approvalDecision.allowed) {
        throw new Error(approvalDecision.reason || 'يجب أن يعتمد الدفعة مستخدم مختلف عن منشئها');
      }

      const { error: approvalError } = await (supabase as any).rpc('approve_payment_atomic', {
        p_payment_id: paymentId,
        p_company_id: companyId,
        p_actor_id: user?.id || null,
      });
      if (approvalError) {
        console.error('❌ [usePaymentOperations] Atomic approval error:', approvalError);
        throw approvalError;
      }

      const { data: approvedPayment, error: fetchApprovedError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('company_id', companyId)
        .single();
      if (fetchApprovedError || !approvedPayment) {
        throw fetchApprovedError || new Error('تعذر تحميل الدفعة بعد اعتمادها');
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
        .select('id, invoice_id, amount, payment_status, created_by, notes, processing_notes')
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

      const cancellationReason = reason?.trim();
      if (!cancellationReason) {
        throw new Error('سبب إلغاء الدفعة مطلوب لحفظ سجل التدقيق المالي');
      }

      const { data: atomicCancelResult, error: atomicCancelError } = await (supabase as any)
        .rpc('cancel_payment_with_reversal', {
          p_payment_id: paymentId,
          p_company_id: companyId,
          p_reason: cancellationReason,
          p_actor_id: user?.id || null,
        });

      if (atomicCancelError) {
        const readableMessage = getSupabaseErrorMessage(atomicCancelError);
        console.error('[usePaymentOperations] Atomic cancellation failed:', {
          message: readableMessage,
          error: atomicCancelError,
        });
        throw new Error(getPaymentCancellationFailureMessage(atomicCancelError));
      }

      console.log('[usePaymentOperations] Payment cancelled atomically:', atomicCancelResult);
      return {
        ...existingPayment,
        id: paymentId,
        payment_status: 'cancelled',
        atomic_cancel_result: atomicCancelResult,
      } as any;
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
      const errorMessage = getSupabaseErrorMessage(error) || 'حدث خطأ أثناء إلغاء الدفعة'
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
    if (!companyId) throw new Error('لم يتم تحديد الشركة');

    // Check if payment number is unique
    if (data.payment_number) {
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('payment_number', data.payment_number)
        .eq('company_id', companyId)
        .maybeSingle();

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

  const generatePaymentNumber = async (
    type: 'receipt' | 'payment' | 'invoice_payment',
    sequenceOffset = 0
  ): Promise<string> => {
    if (!companyId) throw new Error('لم يتم تحديد الشركة');

    const prefix = type === 'receipt' ? 'REC' : type === 'payment' ? 'PAY' : 'INV';
    const year = new Date().getFullYear().toString().slice(-2);
    const transactionType = type === 'payment' ? 'payment' : 'receipt';
    
    // Use the highest existing numeric suffix instead of count+1. Count-based
    // generation collides after imports, cancellations, or concurrent inserts.
    const existingNumbers: { payment_number: string | null }[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('payments')
        .select('payment_number')
        .eq('company_id', companyId)
        .eq('transaction_type', transactionType)
        .ilike('payment_number', `${prefix}-${year}-%`)
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('Error generating payment number:', error);
        // Fallback to timestamp-based number
        return `${prefix}-${year}-${Date.now().toString().slice(-6)}${sequenceOffset ? sequenceOffset.toString().padStart(2, '0') : ''}`;
      }

      existingNumbers.push(...(data || []));
      if (!data || data.length < pageSize) {
        break;
      }
      from += pageSize;
    }

    const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
    const maxExistingNumber = (existingNumbers || []).reduce((max, row) => {
      const match = String(row.payment_number || '').match(pattern);
      if (!match) return max;
      return Math.max(max, Number(match[1]) || 0);
    }, 0);

    let nextNumber = maxExistingNumber + 1 + sequenceOffset;

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const candidate = `${prefix}-${year}-${nextNumber.toString().padStart(3, '0')}`;
      const { data: existingPaymentNumber, error: existingPaymentNumberError } = await supabase
        .from('payments')
        .select('id')
        .eq('company_id', companyId)
        .eq('payment_number', candidate)
        .limit(1);

      if (existingPaymentNumberError) {
        console.warn('⚠️ [usePaymentOperations] Payment number availability check failed:', existingPaymentNumberError.message);
        return candidate;
      }

      if (!existingPaymentNumber?.length) {
        return candidate;
      }

      nextNumber += 1;
    }

    return `${prefix}-${year}-${Date.now().toString().slice(-6)}`;
  };

  const createJournalEntry = async (payment: Payment): Promise<string> => {
    try {
      console.log('Creating journal entry for payment:', payment.id);

      if (!companyId || !payment.amount) {
        throw new Error('Missing company or payment amount for journal entry');
      }

      const { data: ensuredJournal, error: ensureJournalError } = await (supabase as any).rpc(
        'ensure_payment_journal_entry',
        {
          p_payment_id: payment.id,
          p_company_id: companyId,
          p_actor_id: user?.id || null,
        }
      );

      if (!ensureJournalError) {
        const ensuredJournalId = ensuredJournal?.journal_entry_id || ensuredJournal?.journalEntryId || null;
        if (ensuredJournalId) {
          console.log('Payment journal entry ensured successfully:', ensuredJournal);
          return ensuredJournalId;
        }

        if (String(ensuredJournal?.status || '').startsWith('skipped_')) {
          console.warn('Payment journal entry skipped by database policy:', ensuredJournal);
          return '';
        }
      }

      const ensureMessage = String(ensureJournalError?.message || '');
      if (ensureJournalError) {
        console.error('ensure_payment_journal_entry RPC failed:', ensureJournalError);
      }

      throw new Error(
        ensureMessage ||
        'Payment journal entry could not be created by the database. The client-side journal fallback has been disabled to prevent duplicate accounting entries.'
      );
    } catch (error) {
      console.error('Error in createJournalEntry:', error);
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
