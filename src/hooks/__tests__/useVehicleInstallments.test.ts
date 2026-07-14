import { describe, expect, it } from 'vitest';
import { buildVehicleInstallmentPaymentRpcArgs } from '@/hooks/useVehicleInstallments';

describe('buildVehicleInstallmentPaymentRpcArgs', () => {
  it('builds the complete atomic payment command', () => {
    expect(buildVehicleInstallmentPaymentRpcArgs(
      'company-1',
      'user-1',
      {
        schedule_id: 'schedule-1',
        paid_amount: 725.5,
        payment_method: 'bank_transfer',
        payment_date: '2026-07-14',
        payment_reference: 'TRX-42',
        notes: 'دفعة جزئية',
      },
      '2026-07-15',
    )).toEqual({
      p_company_id: 'company-1',
      p_schedule_id: 'schedule-1',
      p_amount: 725.5,
      p_payment_date: '2026-07-14',
      p_payment_method: 'bank_transfer',
      p_payment_reference: 'TRX-42',
      p_notes: 'دفعة جزئية',
      p_actor_id: 'user-1',
    });
  });

  it('uses the supplied current date and nulls empty optional fields', () => {
    const result = buildVehicleInstallmentPaymentRpcArgs(
      'company-1',
      'user-1',
      {
        schedule_id: 'schedule-1',
        paid_amount: 100,
        payment_method: 'cash',
      },
      '2026-07-14',
    );

    expect(result.p_payment_date).toBe('2026-07-14');
    expect(result.p_payment_reference).toBeNull();
    expect(result.p_notes).toBeNull();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid payment amount %s',
    (paidAmount) => {
      expect(() => buildVehicleInstallmentPaymentRpcArgs(
        'company-1',
        'user-1',
        {
          schedule_id: 'schedule-1',
          paid_amount: paidAmount,
          payment_method: 'cash',
        },
        '2026-07-14',
      )).toThrow('مبلغ الدفعة يجب أن يكون أكبر من صفر');
    },
  );
});
