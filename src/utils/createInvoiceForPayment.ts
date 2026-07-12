import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { paymentLinkingService } from '@/services/PaymentLinkingService';

export interface CreateInvoiceForPaymentResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

interface ActiveInvoiceAllocation {
  target_id: string;
}

async function getAllocatedInvoice(paymentId: string) {
  const { data: allocation, error: allocationError } = await (supabase as any)
    .from('payment_allocations')
    .select('target_id')
    .eq('payment_id', paymentId)
    .eq('allocation_type', 'invoice')
    .eq('is_active', true)
    .order('allocation_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (allocationError) throw allocationError;
  if (!allocation) return null;

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, invoice_number')
    .eq('id', (allocation as ActiveInvoiceAllocation).target_id)
    .maybeSingle();

  if (invoiceError) throw invoiceError;
  return invoice;
}

/**
 * Ensures contract invoices exist and allocates the completed receipt through
 * the canonical payment allocation ledger.
 */
export const createInvoiceForPayment = async (
  paymentId: string,
  companyId: string
): Promise<CreateInvoiceForPaymentResult> => {
  try {
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, company_id, invoice_id, contract_id, payment_status')
      .eq('id', paymentId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (paymentError || !payment) {
      return { success: false, error: 'الدفعة غير موجودة في الشركة الحالية' };
    }

    const existingInvoice = await getAllocatedInvoice(payment.id);
    if (existingInvoice) {
      return {
        success: true,
        skipped: true,
        reason: 'الدفعة مخصصة بالفعل في دفتر التخصيص',
        invoiceId: existingInvoice.id,
        invoiceNumber: existingInvoice.invoice_number,
      };
    }

    if (!['completed', 'paid', 'success', 'succeeded'].includes((payment.payment_status || '').toLowerCase())) {
      return {
        success: false,
        skipped: true,
        reason: 'يجب اعتماد الدفعة قبل تخصيصها لفاتورة',
      };
    }

    if (payment.invoice_id) {
      const result = await paymentLinkingService.manualLink(payment.id, 'invoice', payment.invoice_id);
      if (!result.success) {
        return { success: false, error: result.reason };
      }

      return {
        success: true,
        invoiceId: result.linkedTo?.id,
        invoiceNumber: result.linkedTo?.number,
      };
    }

    if (!payment.contract_id) {
      return {
        success: false,
        skipped: true,
        reason: 'لا يمكن إنشاء فاتورة من إيصال غير مرتبط بعقد أو فاتورة أصلية',
      };
    }

    const { error: backfillError } = await supabase.rpc('backfill_contract_invoices', {
      p_company_id: companyId,
      p_contract_id: payment.contract_id,
    });

    if (backfillError) {
      return { success: false, error: `تعذر استكمال فواتير العقد: ${backfillError.message}` };
    }

    const linkingResult = await paymentLinkingService.manualLink(
      payment.id,
      'contract',
      payment.contract_id
    );

    if (!linkingResult.success) {
      return { success: false, error: linkingResult.reason };
    }

    const allocatedInvoice = await getAllocatedInvoice(payment.id);
    return {
      success: true,
      invoiceId: allocatedInvoice?.id,
      invoiceNumber: allocatedInvoice?.invoice_number,
    };
  } catch (error) {
    logger.error('Failed to create or allocate invoice for payment', { error, paymentId, companyId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
    };
  }
};

/**
 * Legacy callers still use this for draft invoice forms. Final uniqueness is
 * enforced by the database; new creation flows should reserve numbers atomically.
 */
export const generateInvoiceNumber = async (companyId: string): Promise<string> => {
  const prefix = 'INV';
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const { data: lastInvoice, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('company_id', companyId)
    .like('invoice_number', `${prefix}-${year}${month}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const lastSequence = Number(lastInvoice?.invoice_number?.split('-').pop() || 0);
  return `${prefix}-${year}${month}-${String(lastSequence + 1).padStart(4, '0')}`;
};

export const backfillInvoicesForContract = async (
  contractId: string,
  companyId: string
): Promise<{
  success: boolean;
  created: number;
  skipped: number;
  errors: string[];
}> => {
  const results = { created: 0, skipped: 0, errors: [] as string[] };

  try {
    const { data: backfillRows, error: backfillError } = await supabase.rpc(
      'backfill_contract_invoices',
      { p_company_id: companyId, p_contract_id: contractId }
    );

    if (backfillError) throw backfillError;
    results.created = (backfillRows || []).reduce(
      (total, row) => total + Number(row.invoices_created || 0),
      0
    );

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, allocation_status')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .eq('payment_status', 'completed');

    if (paymentsError) throw paymentsError;

    for (const payment of payments || []) {
      if (['allocated', 'partially_allocated', 'fully_allocated'].includes(payment.allocation_status || '')) {
        results.skipped += 1;
        continue;
      }

      const linkingResult = await paymentLinkingService.manualLink(
        payment.id,
        'contract',
        contractId
      );
      if (!linkingResult.success) {
        results.errors.push(`تعذر تخصيص الدفعة ${payment.id}: ${linkingResult.reason}`);
      }
    }

    return { success: results.errors.length === 0, ...results };
  } catch (error) {
    logger.error('Contract invoice backfill failed', { error, contractId, companyId });
    return {
      success: false,
      ...results,
      errors: [error instanceof Error ? error.message : 'تعذر استكمال فواتير العقد'],
    };
  }
};
