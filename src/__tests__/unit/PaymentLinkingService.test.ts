import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/types/payment';
import {
  distributePaymentAcrossInvoices,
  paymentLinkingService,
  type InvoiceAllocationInput,
  type LinkingResult,
  type LinkingSuggestion,
} from '@/services/PaymentLinkingService';
import { PaymentRepository } from '@/services/repositories/PaymentRepository';

const mocks = vi.hoisted(() => ({
  logPaymentAction: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'actor-id' } } }),
    },
  },
}));

vi.mock('@/utils/auditTrailSystem', () => ({
  auditTrailSystem: {
    logPaymentAction: mocks.logPaymentAction,
  },
}));

type TestablePaymentLinkingService = typeof paymentLinkingService & {
  executeLinking(payment: Payment, suggestion: LinkingSuggestion): Promise<LinkingResult>;
  getCurrentInvoiceAllocations(paymentId: string): Promise<InvoiceAllocationInput[]>;
  replaceInvoiceAllocations(
    payment: Payment,
    allocations: InvoiceAllocationInput[],
    expectedAllocations: InvoiceAllocationInput[],
    reason: string
  ): Promise<void>;
};

const service = paymentLinkingService as unknown as TestablePaymentLinkingService;
const payment = {
  id: 'payment-id',
  company_id: 'company-id',
  customer_id: 'customer-id',
  created_by: 'creator-id',
  amount: 300,
  payment_status: 'completed',
} as Payment;

describe('distributePaymentAcrossInvoices', () => {
  it('distributes one payment over invoices in order without exceeding the payment', () => {
    expect(distributePaymentAcrossInvoices(300, [
      { invoiceId: 'invoice-1', availableAmount: 100 },
      { invoiceId: 'invoice-2', availableAmount: 150 },
      { invoiceId: 'invoice-3', availableAmount: 200 },
    ])).toEqual([
      { invoice_id: 'invoice-1', amount: 100 },
      { invoice_id: 'invoice-2', amount: 150 },
      { invoice_id: 'invoice-3', amount: 50 },
    ]);
  });

  it('leaves excess payment unallocated when invoice balances are smaller', () => {
    expect(distributePaymentAcrossInvoices(500, [
      { invoiceId: 'invoice-1', availableAmount: 120 },
    ])).toEqual([{ invoice_id: 'invoice-1', amount: 120 }]);
  });

  it('rounds currency and ignores zero or negative balances', () => {
    expect(distributePaymentAcrossInvoices(100.005, [
      { invoiceId: 'invoice-0', availableAmount: 0 },
      { invoiceId: 'invoice-negative', availableAmount: -10 },
      { invoiceId: 'invoice-1', availableAmount: 100.005 },
    ])).toEqual([{ invoice_id: 'invoice-1', amount: 100.01 }]);
  });
});

describe('PaymentLinkingService canonical linking', () => {
  beforeEach(() => {
    mocks.logPaymentAction.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('manual linking executes the exact target selected by the user', async () => {
    vi.spyOn(service, 'getById').mockResolvedValue(payment);
    const executeLinking = vi.spyOn(service, 'executeLinking').mockResolvedValue({
      success: true,
      linkedTo: { type: 'invoice', id: 'selected-invoice', number: 'INV-10' },
      confidence: 1,
      reason: 'manual',
    });

    const result = await service.manualLink(
      payment.id,
      'invoice',
      'selected-invoice',
      'actor-id'
    );

    expect(result.success).toBe(true);
    expect(executeLinking).toHaveBeenCalledWith(payment, expect.objectContaining({
      targetId: 'selected-invoice',
      targetType: 'invoice',
      confidence: 1,
    }));
    expect(mocks.logPaymentAction).toHaveBeenCalledWith(
      'linked_manually',
      payment.id,
      'actor-id',
      payment.company_id,
      'selected-invoice',
      expect.any(Object)
    );
  });

  it('unlinking replaces active allocations with an empty atomic allocation set', async () => {
    const currentAllocations = [{ invoice_id: 'invoice-1', amount: 300 }];
    vi.spyOn(service, 'getById').mockResolvedValue(payment);
    vi.spyOn(service, 'getCurrentInvoiceAllocations').mockResolvedValue(currentAllocations);
    const replace = vi.spyOn(service, 'replaceInvoiceAllocations').mockResolvedValue();

    const result = await service.unlinkPayment(payment.id, 'actor-id');

    expect(result.success).toBe(true);
    expect(replace).toHaveBeenCalledWith(
      payment,
      [],
      currentAllocations,
      expect.stringContaining('فك تخصيص')
    );
  });

  it('does not write anything when the payment has no active allocations', async () => {
    vi.spyOn(service, 'getById').mockResolvedValue(payment);
    vi.spyOn(service, 'getCurrentInvoiceAllocations').mockResolvedValue([]);
    const replace = vi.spyOn(service, 'replaceInvoiceAllocations').mockResolvedValue();

    const result = await service.unlinkPayment(payment.id, 'actor-id');

    expect(result.success).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('PaymentRepository financial guards', () => {
  const repository = new PaymentRepository();

  it('blocks direct invoice and contract links', async () => {
    await expect(repository.linkToInvoice('payment-id', 'invoice-id')).rejects.toThrow(
      'Direct invoice linking is disabled'
    );
    await expect(repository.linkToContract('payment-id', 'contract-id')).rejects.toThrow(
      'Direct contract linking is disabled'
    );
  });

  it('blocks direct status transitions', async () => {
    await expect(repository.updateStatus('payment-id', 'completed')).rejects.toThrow(
      'Direct payment status updates are disabled'
    );
  });
});
