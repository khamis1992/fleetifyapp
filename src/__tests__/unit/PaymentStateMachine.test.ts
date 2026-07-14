import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchPayment: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
  rpc: vi.fn(),
  logPaymentAction: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'notifications') {
        return {
          insert: vi.fn(() => Promise.resolve({ error: null })),
        };
      }

      if (table !== 'payments') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ single: mocks.fetchPayment })),
        })),
        update: mocks.update,
      };
    }),
    rpc: mocks.rpc,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/utils/auditTrailSystem', () => ({
  auditTrailSystem: {
    logPaymentAction: mocks.logPaymentAction,
  },
}));

import {
  createPaymentStateMachine,
  PaymentEvent,
  PaymentState,
} from '@/services/PaymentStateMachine';

const basePayment = {
  id: 'payment-id',
  company_id: 'company-id',
  created_by: 'creator-id',
  processing_status: PaymentState.PENDING,
  payment_status: 'pending',
  amount: 100,
};

describe('PaymentStateMachine approved transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchPayment.mockResolvedValue({ data: { ...basePayment }, error: null });
    mocks.updateEq.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.updateEq });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
  });

  it('starts processing through the allowed local transition and audits it', async () => {
    const machine = createPaymentStateMachine();

    const result = await machine.startProcessing(basePayment.id, 'actor-id');

    expect(result).toEqual({ success: true, newState: PaymentState.PROCESSING });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      processing_status: PaymentState.PROCESSING,
      processing_started_at: expect.any(String),
    }));
    expect(mocks.updateEq).toHaveBeenCalledWith('id', basePayment.id);
    expect(mocks.logPaymentAction).toHaveBeenCalledWith(
      `state_transition_${PaymentEvent.START_PROCESSING}`,
      basePayment.id,
      'actor-id',
      basePayment.company_id,
      undefined,
      expect.objectContaining({
        fromState: PaymentState.PENDING,
        toState: PaymentState.PROCESSING,
      }),
    );
  });

  it('rejects an invalid local transition without writing', async () => {
    const machine = createPaymentStateMachine();

    const result = await machine.failPayment(basePayment.id, 'actor-id');

    expect(result.success).toBe(false);
    expect(result.error).toContain(PaymentEvent.FAIL);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('completes a payment only through the atomic approval command', async () => {
    mocks.fetchPayment.mockResolvedValue({
      data: { ...basePayment, processing_status: PaymentState.PROCESSING },
      error: null,
    });
    const machine = createPaymentStateMachine();

    const result = await machine.completePayment(basePayment.id, 'actor-id');

    expect(result).toEqual({ success: true, newState: PaymentState.COMPLETED });
    expect(mocks.rpc).toHaveBeenCalledWith('approve_payment_atomic', {
      p_payment_id: basePayment.id,
      p_company_id: basePayment.company_id,
      p_actor_id: 'actor-id',
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('voids a payment only through the accounting reversal command', async () => {
    mocks.fetchPayment.mockResolvedValue({
      data: { ...basePayment, processing_status: PaymentState.COMPLETED },
      error: null,
    });
    const machine = createPaymentStateMachine();

    const result = await machine.voidPayment(basePayment.id, 'actor-id', 'duplicate receipt');

    expect(result).toEqual({ success: true, newState: PaymentState.VOIDED });
    expect(mocks.rpc).toHaveBeenCalledWith('cancel_payment_with_reversal', {
      p_payment_id: basePayment.id,
      p_company_id: basePayment.company_id,
      p_reason: 'duplicate receipt',
      p_actor_id: 'actor-id',
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('returns an atomic command error without reporting success', async () => {
    mocks.fetchPayment.mockResolvedValue({
      data: { ...basePayment, processing_status: PaymentState.PROCESSING },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'approval denied' } });
    const machine = createPaymentStateMachine();

    await expect(machine.completePayment(basePayment.id, 'actor-id')).resolves.toEqual({
      success: false,
      error: 'approval denied',
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('marks a processing failure and clears allocation and reconciliation state', async () => {
    mocks.fetchPayment.mockResolvedValue({
      data: { ...basePayment, processing_status: PaymentState.PROCESSING },
      error: null,
    });
    const machine = createPaymentStateMachine();

    const result = await machine.failPayment(basePayment.id, 'actor-id', 'gateway error');

    expect(result).toEqual({ success: true, newState: PaymentState.FAILED });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      processing_status: PaymentState.FAILED,
      payment_status: 'failed',
      allocation_status: null,
      reconciliation_status: null,
    }));
  });

  it('enforces the configured retry limit', async () => {
    mocks.fetchPayment.mockResolvedValue({
      data: { ...basePayment, processing_status: PaymentState.FAILED },
      error: null,
    });
    const machine = createPaymentStateMachine({ maxRetries: 2 });

    expect((await machine.retryPayment(basePayment.id)).success).toBe(true);
    expect((await machine.retryPayment(basePayment.id)).success).toBe(true);
    const thirdAttempt = await machine.retryPayment(basePayment.id);

    expect(thirdAttempt.success).toBe(false);
    expect(mocks.update).toHaveBeenCalledTimes(2);
  });

  it('does not write when the payment cannot be loaded', async () => {
    mocks.fetchPayment.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const machine = createPaymentStateMachine();

    const result = await machine.startProcessing('missing-payment');

    expect(result.success).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
