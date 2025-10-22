import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface CreateInvoiceForPaymentResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

/**
 * Creates an invoice for a payment if no invoice exists
 * This is typically called after linking a payment to a contract
 */
export const createInvoiceForPayment = async (
  paymentId: string,
  companyId: string
): Promise<CreateInvoiceForPaymentResult> => {
  try {
    logger.debug('Creating invoice for payment', { paymentId });

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        payment_number,
        amount,
        payment_date,
        contract_id,
        customer_id,
        reference_number,
        payment_method,
        invoice_id
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      logger.error('Payment not found', { paymentError, paymentId });
      return {
        success: false,
        error: 'المدفوعة غير موجودة'
      };
    }

    // Check if payment already has an invoice
    if (payment.invoice_id) {
      logger.debug('Payment already has an invoice', { paymentId, invoiceId: payment.invoice_id });
      return {
        success: false,
        skipped: true,
        reason: 'المدفوعة مرتبطة بفاتورة مسبقاً'
      };
    }

    // Check if payment amount is valid
    if (!payment.amount || payment.amount <= 0) {
      logger.debug('Payment amount is invalid', { paymentId, amount: payment.amount });
      return {
        success: false,
        skipped: true,
        reason: 'مبلغ المدفوعة غير صالح'
      };
    }

    // Get contract details if payment is linked to a contract
    let contract = null;
    if (payment.contract_id) {
      const { data: contractData } = await supabase
        .from('contracts')
        .select('contract_number, monthly_amount, contract_type')
        .eq('id', payment.contract_id)
        .single();
      
      contract = contractData;
    }

    // Get customer details
    let customer = null;
    if (payment.customer_id) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('customer_type, first_name, last_name, company_name, first_name_ar, last_name_ar, company_name_ar')
        .eq('id', payment.customer_id)
        .single();
      
      customer = customerData;
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(companyId);

    // Create invoice description
    const description = createInvoiceDescription(payment, contract, customer);

    // Create the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        company_id: companyId,
        invoice_number: invoiceNumber,
        customer_id: payment.customer_id,
        contract_id: payment.contract_id,
        invoice_date: payment.payment_date,
        due_date: payment.payment_date, // Same as payment date for payment receipts
        total_amount: payment.amount,
        tax_amount: 0,
        subtotal: payment.amount,
        status: 'paid', // Mark as paid since we have the payment
        invoice_type: 'payment_receipt',
        description: description,
        payment_terms: 'مدفوع',
        currency: 'KWD'
      })
      .select('id, invoice_number')
      .single();

    if (invoiceError) {
      logger.error('Failed to create invoice', { invoiceError, paymentId });
      return {
        success: false,
        error: 'فشل في إنشاء الفاتورة'
      };
    }

    // Link the payment to the invoice
    const { error: updateError } = await supabase
      .from('payments')
      .update({ invoice_id: invoice.id })
      .eq('id', paymentId);

    if (updateError) {
      logger.error('Failed to link payment to invoice', { updateError, paymentId, invoiceId: invoice.id });
      // Don't fail the entire operation, just log the warning
      logger.warn('Invoice created but payment link failed', { invoiceId: invoice.id });
    }

    logger.info('Invoice created successfully for payment', { 
      paymentId, 
      invoiceId: invoice.id, 
      invoiceNumber: invoice.invoice_number 
    });

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number
    };

  } catch (error) {
    logger.error('Exception creating invoice for payment', { error, paymentId });
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
};

/**
 * Generate a unique invoice number
 */
export const generateInvoiceNumber = async (companyId: string): Promise<string> => {
  const prefix = 'INV';
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  
  // Get the highest invoice number for this company this month
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('company_id', companyId)
    .like('invoice_number', `${prefix}-${year}${month}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
    .single();

  let sequence = 1;
  if (lastInvoice?.invoice_number) {
    const lastSequence = parseInt(lastInvoice.invoice_number.split('-').pop() || '0');
    sequence = lastSequence + 1;
  }

  return `${prefix}-${year}${month}-${sequence.toString().padStart(4, '0')}`;
};

/**
 * Create a descriptive invoice description based on payment and contract details
 */
const createInvoiceDescription = (
  payment: any,
  contract: any,
  customer: any
): string => {
  const customerName = customer?.customer_type === 'individual'
    ? `${customer.first_name_ar || customer.first_name} ${customer.last_name_ar || customer.last_name}`
    : customer?.company_name_ar || customer?.company_name || 'عميل غير محدد';

  let description = `إيصال دفع - ${customerName}`;
  
  if (contract) {
    description += ` - عقد رقم ${contract.contract_number}`;
    
    if (contract.contract_type === 'rental') {
      description += ' (إيجار)';
    } else if (contract.contract_type === 'service') {
      description += ' (خدمة)';
    }
  }

  if (payment.reference_number) {
    description += ` - مرجع: ${payment.reference_number}`;
  }

  description += ` - ${payment.payment_method === 'cash' ? 'نقداً' : payment.payment_method === 'bank_transfer' ? 'تحويل بنكي' : payment.payment_method}`;

  return description;
};

/**
 * Backfill invoices for existing payments linked to a contract
 * Handles both regular payments and rental_payment_receipts
 */
export const backfillInvoicesForContract = async (
  contractId: string,
  companyId: string
): Promise<{
  success: boolean;
  created: number;
  skipped: number;
  errors: string[];
}> => {
  try {
    logger.debug('Backfilling invoices for contract', { contractId });

    // Get all completed payments for this contract that don't have invoices (from payments table)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .eq('payment_status', 'completed')
      .is('invoice_id', null);

    if (paymentsError) {
      logger.error('Failed to fetch payments for backfill', { paymentsError, contractId });
    }

    // Get all rental payment receipts for this contract that don't have invoices
    const { data: rentalPayments, error: rentalPaymentsError } = await supabase
      .from('rental_payment_receipts')
      .select('id, receipt_number, total_paid, payment_date, customer_id, customer_name, fine, rent_amount, month')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .is('invoice_id', null);

    if (rentalPaymentsError) {
      logger.error('Failed to fetch rental payments for backfill', { rentalPaymentsError, contractId });
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // Process each regular payment
    for (const payment of payments || []) {
      const result = await createInvoiceForPayment(payment.id, companyId);
      
      if (result.success) {
        results.created++;
      } else if (result.skipped) {
        results.skipped++;
      } else {
        results.errors.push(`فشل في إنشاء فاتورة للمدفوعة ${payment.id}: ${result.error}`);
      }
    }

    // Process each rental payment receipt
    for (const rentalPayment of rentalPayments || []) {
      try {
        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber(companyId);

        // Create invoice description for rental payment
        const description = `إيصال دفع رقم ${rentalPayment.receipt_number} - ${rentalPayment.month} - ${rentalPayment.customer_name}`;
        const notes = `مبلغ الإيجار: ${rentalPayment.rent_amount.toFixed(3)} د.ك\nغرامة التأخير: ${rentalPayment.fine.toFixed(3)} د.ك\nالإجمالي: ${rentalPayment.total_paid.toFixed(3)} د.ك`;

        // Create the invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            company_id: companyId,
            invoice_number: invoiceNumber,
            customer_id: rentalPayment.customer_id,
            contract_id: contractId,
            invoice_date: rentalPayment.payment_date,
            due_date: rentalPayment.payment_date,
            total_amount: rentalPayment.total_paid,
            tax_amount: 0,
            subtotal: rentalPayment.total_paid,
            status: 'paid',
            invoice_type: 'rental',
            description: description,
            notes: notes,
            payment_terms: 'مدفوع',
            currency: 'KWD'
          })
          .select('id, invoice_number')
          .single();

        if (invoiceError) {
          logger.error('Failed to create invoice for rental payment', { invoiceError, rentalPaymentId: rentalPayment.id });
          results.errors.push(`فشل في إنشاء فاتورة للإيصال ${rentalPayment.receipt_number}`);
          continue;
        }

        // Create invoice item
        const { error: itemError } = await supabase
          .from('invoice_items')
          .insert({
            invoice_id: invoice.id,
            item_description: description,
            quantity: 1,
            unit_price: rentalPayment.total_paid,
            line_total: rentalPayment.total_paid,
            tax_rate: 0,
            tax_amount: 0
          });

        if (itemError) {
          logger.error('Failed to create invoice item', { itemError, invoiceId: invoice.id });
        }

        // Link the rental payment receipt to the invoice
        const { error: updateError } = await supabase
          .from('rental_payment_receipts')
          .update({ invoice_id: invoice.id })
          .eq('id', rentalPayment.id);

        if (updateError) {
          logger.error('Failed to link rental payment to invoice', { updateError, rentalPaymentId: rentalPayment.id, invoiceId: invoice.id });
        }

        results.created++;
        logger.info('Invoice created for rental payment', { 
          rentalPaymentId: rentalPayment.id,
          invoiceId: invoice.id, 
          invoiceNumber: invoice.invoice_number 
        });

      } catch (error) {
        logger.error('Exception creating invoice for rental payment', { error, rentalPaymentId: rentalPayment.id });
        results.errors.push(`خطأ غير متوقع للإيصال ${rentalPayment.receipt_number}`);
      }
    }

    logger.info('Backfill completed', { contractId, ...results });

    return {
      success: true,
      ...results
    };

  } catch (error) {
    logger.error('Exception during backfill', { error, contractId });
    return {
      success: false,
      created: 0,
      skipped: 0,
      errors: ['حدث خطأ غير متوقع أثناء المعالجة']
    };
  }
};