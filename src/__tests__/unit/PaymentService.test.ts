import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/types/payment';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  findLinkingSuggestions: vi.fn(),
  manualLink: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: vi.fn(),
  },
}));

vi.mock('@/services/PaymentLinkingService', () => ({
  paymentLinkingService: {
    findLinkingSuggestions: mocks.findLinkingSuggestions,
    manualLink: mocks.manualLink,
  },
}));

import { PaymentService } from '@/services/PaymentService';

const payment = {
  id: 'payment-id',
  company_id: 'company-id',
  customer_id: 'customer-id',
  amount: 300,
  payment_date: '2026-07-13',
  payment_method: 'cash',
  payment_type: 'rental_income',
  transaction_type: 'receipt',
  payment_status: 'completed',
  allocation_status: 'fully_allocated',
} as Payment;

const creationData = {
  customer_id: payment.customer_id,
  contract_id: 'contract-id',
  amount: payment.amount,
  payment_date: payment.payment_date,
  payment_method: payment.payment_method,
  payment_type: payment.payment_type,
  transaction_type: 'income',
};

describe('PaymentService current contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: payment.id, error: null });
  });

  it('creates payments through the atomic database command', async () => {
    const service = new PaymentService();
    vi.spyOn(service, 'getById').mockResolvedValue(payment);

    const result = await service.createPayment(creationData as any, 'actor-id', payment.company_id);

    expect(result).toEqual(payment);
    expect(mocks.rpc).toHaveBeenCalledWith('create_payment_atomic', expect.objectContaining({
      p_company_id: payment.company_id,
      p_customer_id: payment.customer_id,
      p_contract_id: 'contract-id',
      p_amount: payment.amount,
      p_created_by: 'actor-id',
      p_initial_status: 'completed',
    }));
  });

  it('rejects missing customer data before calling the database', async () => {
    const service = new PaymentService();

    await expect(service.createPayment(
      { ...creationData, customer_id: null } as any,
      'actor-id',
      payment.company_id,
    )).rejects.toThrow('customer_id is required');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('rejects a non-positive amount before calling the database', async () => {
    const service = new PaymentService();

    await expect(service.createPayment(
      { ...creationData, amount: 0 } as any,
      'actor-id',
      payment.company_id,
    )).rejects.toThrow('Validation failed');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('surfaces an atomic creation error and does not fetch a payment', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'duplicate request' } });
    const service = new PaymentService();
    const getById = vi.spyOn(service, 'getById');

    await expect(service.createPayment(
      creationData as any,
      'actor-id',
      payment.company_id,
    )).rejects.toThrow('Atomic payment failed: duplicate request');
    expect(getById).not.toHaveBeenCalled();
  });

  it('returns invoice suggestions only and normalizes confidence to percent', async () => {
    mocks.findLinkingSuggestions.mockResolvedValue([
      {
        targetType: 'invoice',
        targetId: 'invoice-id',
        confidence: 0.87,
        reason: 'same amount',
        details: { invoiceNumber: 'INV-100' },
      },
      {
        targetType: 'contract',
        targetId: 'contract-id',
        confidence: 0.99,
        reason: 'same contract',
        details: {},
      },
    ]);
    const service = new PaymentService();

    await expect(service.findMatchingSuggestions(payment)).resolves.toEqual([{
      invoice_id: 'invoice-id',
      invoice_number: 'INV-100',
      amount: payment.amount,
      confidence: 87,
      reason: 'same amount',
      customer_id: payment.customer_id,
    }]);
  });

  it('delegates manual matching to the canonical linking service', async () => {
    mocks.manualLink.mockResolvedValue({
      success: true,
      confidence: 1,
      reason: 'manual',
    });
    const service = new PaymentService();

    const result = await service.matchPayment(payment.id, 'invoice', 'invoice-id');

    expect(mocks.manualLink).toHaveBeenCalledWith(payment.id, 'invoice', 'invoice-id');
    expect(result).toEqual(expect.objectContaining({
      success: true,
      payment_id: payment.id,
      invoice_id: 'invoice-id',
      confidence: 100,
    }));
  });

  it('computes allocation statistics without double-counting payments', async () => {
    const service = new PaymentService();
    vi.spyOn(service, 'getByCompany').mockResolvedValue([
      payment,
      { ...payment, id: 'payment-2', amount: 100, allocation_status: null },
      { ...payment, id: 'payment-3', amount: 200, allocation_status: 'partially_allocated' },
    ] as Payment[]);

    await expect(service.getPaymentStats(payment.company_id)).resolves.toEqual({
      total: 3,
      totalAmount: 600,
      matched: 2,
      unmatched: 1,
      averageAmount: 200,
    });
  });

  it('uses the date-range query only when both boundaries are supplied', async () => {
    const service = new PaymentService();
    const range = vi.spyOn(service, 'getByDateRange').mockResolvedValue([payment]);
    const company = vi.spyOn(service, 'getByCompany').mockResolvedValue([]);

    const result = await service.getPaymentStats(
      payment.company_id,
      '2026-07-01',
      '2026-07-31',
    );

    expect(range).toHaveBeenCalledWith('2026-07-01', '2026-07-31', payment.company_id);
    expect(company).not.toHaveBeenCalled();
    expect(result.total).toBe(1);
  });
});
