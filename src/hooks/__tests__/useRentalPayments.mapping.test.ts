import { describe, expect, it } from 'vitest';
import {
  mapOutstandingBalanceSummary,
  toRentalReceiptUpdate,
} from '../useRentalPayments';

describe('rental payment mappings', () => {
  it('keeps UI relations out of receipt updates', () => {
    const update = toRentalReceiptUpdate({
      total_paid: 900,
      pending_balance: 100,
      vehicle_number: '123456',
      customer_phone: '55555555',
      vehicle: {
        id: 'vehicle-1',
        plate_number: '123456',
        make: 'Toyota',
        model: 'Corolla',
      },
    });

    expect(update).toEqual({ total_paid: 900, pending_balance: 100 });
  });

  it('derives a stable overdue summary from the RPC result', () => {
    const summary = mapOutstandingBalanceSummary({
      customer_id: 'customer-1',
      customer_name: 'Test Customer',
      last_payment_date: '2026-04-01',
      monthly_rent: 1000,
      months_behind: 3,
      outstanding_balance: 3000,
      total_paid: 4000,
    });

    expect(summary).toMatchObject({
      expected_total: 7000,
      months_paid: 4,
      months_expected: 7,
      unpaid_month_count: 3,
      payment_status: 'overdue',
    });
  });
});
