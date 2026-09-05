import { describe, expect, it } from 'vitest';
import {
  analyzeContractBillingPeriod,
  calculateCanonicalBillingMonths,
  calculateCanonicalRenewalEndDate,
  calculateContractMonths,
  calculateContractTotalAmount,
} from '@/utils/contractCalculations';

describe('canonical contract billing month calculations', () => {
  it('uses one billing month for a 31-day contract spanning adjacent months', () => {
    expect(calculateCanonicalBillingMonths('2026-08-01', '2026-09-01')).toBe(1);
    expect(calculateContractTotalAmount({
      start_date: '2026-08-01',
      end_date: '2026-09-01',
      monthly_amount: 3_000,
    })).toBe(3_000);
  });

  it('uses twelve billing months for a 365-day contract', () => {
    expect(calculateCanonicalBillingMonths('2026-08-01', '2027-08-01')).toBe(12);
    expect(calculateContractMonths({
      start_date: '2026-08-01',
      end_date: '2027-08-01',
    })).toBe(12);
  });

  it('keeps a same-month contract billable and rejects reversed dates', () => {
    expect(calculateCanonicalBillingMonths('2026-08-03', '2026-08-31')).toBe(1);
    expect(calculateCanonicalBillingMonths('2026-09-01', '2026-08-31')).toBe(0);
  });

  it('keeps first-of-month and leap-year renewals on the same billing convention', () => {
    expect(calculateCanonicalRenewalEndDate('2026-08-01', '2027-08-01'))
      .toBe('2028-08-02');
    expect(calculateCanonicalRenewalEndDate('2023-02-28', '2024-02-29'))
      .toBe('2025-03-01');
    expect(calculateCanonicalBillingMonths('2027-08-02', '2028-08-02')).toBe(12);
    expect(calculateCanonicalBillingMonths('2024-03-01', '2025-03-01')).toBe(12);
  });
});

describe('contract billing period preflight', () => {
  const calendarContract = {
    startDate: '2026-01-01', endDate: '2026-03-01',
    contractAmount: 3000, monthlyAmount: 1000,
  };

  it('uses the rental invoice month, not a shifted payment deadline, to detect start-month billing', () => {
    const result = analyzeContractBillingPeriod({ ...calendarContract, invoices: [{
      invoice_month: '2026-01-01', invoice_date: '2026-02-01',
      due_date: '2026-02-01', total_amount: 1000,
    }] });
    expect(result.valid).toBe(true);
    expect(result.billingStartMonth).toBe('2026-01');
    expect(result.availableBillingMonths).toBe(3);
  });

  it('does not invent a start-month rental obligation from the payment deadline', () => {
    const result = analyzeContractBillingPeriod({ ...calendarContract, invoices: [{
      invoice_month: '2026-02-01', due_date: '2026-01-01', total_amount: 1000,
    }] });
    expect(result.valid).toBe(false);
    expect(result.billingStartMonth).toBe('2026-02');
    expect(result.availableBillingMonths).toBe(2);
  });

  it('uses invoice_date for legacy invoices without an invoice month', () => {
    const result = analyzeContractBillingPeriod({ ...calendarContract, invoices: [{
      invoice_month: null, invoice_date: '2026-01-15', due_date: '2026-02-01', total_amount: 1000,
    }] });
    expect(result.valid).toBe(true);
    expect(result.billingStartMonth).toBe('2026-01');
  });

  it.each([
    { penalty_id: 'violation-1' }, { invoice_number: ' tv-123 ' },
  ])('does not let non-rental charges extend the rental window: %j', (charge) => {
    const result = analyzeContractBillingPeriod({ ...calendarContract, invoices: [{
      ...charge, invoice_month: '2026-01-01', due_date: '2026-01-01', total_amount: 1000,
    }] });
    expect(result.valid).toBe(false);
    expect(result.billingStartMonth).toBe('2026-02');
  });

  it.each([
    { invoice_month: null, invoice_date: null, due_date: '2026-01-01' },
    { invoice_month: '2026-02-30', invoice_date: '2026-01-01' },
    { invoice_month: 'not-a-date', invoice_date: '2026-01-01' },
  ])('blocks invalid invoice period evidence instead of guessing from another date: %j', (dates) => {
    const result = analyzeContractBillingPeriod({ ...calendarContract, contractAmount: 2000,
      invoices: [{ ...dates, total_amount: 1000 }],
    });
    expect(result.valid).toBe(false);
    expect(result.blockingMessage).toContain('فاتورة إيجار فعّالة بلا شهر فوترة صالح');
  });

  it('does not use invoice metadata to repair a missing schedule due date', () => {
    const result = analyzeContractBillingPeriod({ ...calendarContract, contractAmount: 1000,
      schedules: [{ due_date: null, invoice_month: '2026-02-01', amount: 1000 }],
    });
    expect(result.valid).toBe(false);
    expect(result.blockingMessage).toContain('قسط فعّال بلا تاريخ استحقاق صالح');
  });

  it('retains an invalid invoice-period warning even when the schedule itself is valid', () => {
    const result = analyzeContractBillingPeriod({ ...calendarContract, contractAmount: 2000,
      schedules: ['2026-02-01', '2026-03-01'].map((due_date) => ({ due_date, amount: 1000 })),
      invoices: [{ total_amount: 1000, invoice_month: '2026-02-30' }],
    });
    expect(result.valid).toBe(false);
    expect(result.usesEstablishedSchedule).toBe(false);
    expect(result.blockingMessage).toContain('فاتورة إيجار فعّالة بلا شهر فوترة صالح');
  });

  it.each([{ status: 'cancelled' }, { payment_status: 'void' }, { penalty_id: 'traffic-1' }])(
    'ignores unknown billing months on inactive or non-rental invoices: %j', (state) => {
      const result = analyzeContractBillingPeriod({ ...calendarContract, contractAmount: 2000,
        invoices: [{ ...state, total_amount: 1000 }],
      });
      expect(result.valid).toBe(true);
      expect(result.billingStartMonth).toBe('2026-02');
    },
  );

  it('accepts service-typed rent when its period and amount match the linked installment', () => {
    const result = analyzeContractBillingPeriod({ ...calendarContract, contractAmount: 1000,
      invoices: [{ id: 'rent-1', invoice_type: 'service', invoice_month: '2026-02-01', total_amount: 1000 }],
      schedules: [{ due_date: '2026-02-01', amount: 1000, invoice_id: 'rent-1' }],
    });
    expect(result.valid).toBe(true);
  });

  it.each([{}, { invoice_id: 'different-invoice' }, { invoice_id: 'rent-1', amount: 999 }])(
    'does not silently discard or guess an unclassified service invoice: %j', (link) => {
      const result = analyzeContractBillingPeriod({ ...calendarContract, contractAmount: 1000,
        invoices: [{ id: 'rent-1', invoice_type: ' SERVICE ', invoice_month: '2026-02-01', total_amount: 1000 }],
        schedules: [{ due_date: '2026-02-01', amount: 1000, ...link }],
      });
      expect(result.valid).toBe(false);
      expect(result.blockingMessage).toContain('قد تكون إيجاراً أو خدمة أخرى');
    },
  );

  it('still uses the schedule due date rather than invoice metadata when both are present', () => {
    const result = analyzeContractBillingPeriod({ ...calendarContract, contractAmount: 1000,
      schedules: [{ due_date: '2026-04-01', invoice_month: '2026-02-01', amount: 1000 }],
    });
    expect(result.outsideScheduleMonths).toEqual(['2026-04']);
    expect(result.valid).toBe(false);
  });

  it('detects that LTO2024276 needs more installments than its dates allow', () => {
    const result = analyzeContractBillingPeriod({
      startDate: '2024-08-15',
      endDate: '2027-08-15',
      contractAmount: 55_500,
      monthlyAmount: 1_500,
      schedules: Array.from({ length: 37 }, (_, index) => ({
        due_date: new Date(Date.UTC(2024, 8 + index, 1)).toISOString().slice(0, 10),
        amount: 1_500,
        status: 'pending',
      })),
    });

    expect(result.valid).toBe(false);
    expect(result.availableBillingMonths).toBe(36);
    expect(result.requiredInstallments).toBe(37);
    expect(result.outsideScheduleMonths).toEqual(['2027-09']);
    expect(result.blockingMessage).toContain('تم اكتشاف تاريخي البداية والنهاية');
  });

  it('accepts a matching 36-month contract and schedule', () => {
    const result = analyzeContractBillingPeriod({
      startDate: '2024-08-15',
      endDate: '2027-08-15',
      contractAmount: 54_000,
      monthlyAmount: 1_500,
      schedules: Array.from({ length: 36 }, (_, index) => ({
        due_date: new Date(Date.UTC(2024, 8 + index, 1)).toISOString().slice(0, 10),
        amount: 1_500,
        status: 'pending',
      })),
    });

    expect(result.valid).toBe(true);
    expect(result.blockingMessage).toBeNull();
  });

  it('accepts the signed LTO2024276 schedule with partial boundary months', () => {
    const result = analyzeContractBillingPeriod({
      startDate: '2024-08-15',
      endDate: '2027-08-15',
      contractAmount: 64_800,
      monthlyAmount: 1_800,
      schedules: Array.from({ length: 37 }, (_, index) => ({
        due_date: new Date(Date.UTC(2024, 7 + index, 1)).toISOString().slice(0, 10),
        amount: index === 0 || index === 36 ? 900 : 1_800,
        status: 'pending',
      })),
    });

    expect(result.valid).toBe(true);
    expect(result.availableBillingMonths).toBe(37);
    expect(result.requiredInstallments).toBe(37);
    expect(result.billingStartMonth).toBe('2024-08');
    expect(result.billingEndMonth).toBe('2027-08');
    expect(result.scheduleTotal).toBe(64_800);
    expect(result.usesEstablishedSchedule).toBe(true);
  });

  it('rejects full boundary installments for a contract that starts and ends mid-month', () => {
    const result = analyzeContractBillingPeriod({
      startDate: '2024-08-15',
      endDate: '2027-08-15',
      contractAmount: 55_500,
      monthlyAmount: 1_500,
      schedules: Array.from({ length: 37 }, (_, index) => ({
        due_date: new Date(Date.UTC(2024, 7 + index, 1)).toISOString().slice(0, 10),
        amount: 1_500,
        status: 'pending',
      })),
    });

    expect(result.valid).toBe(false);
    expect(result.blockingMessage).toContain('قسط شهر البداية غير مجزأ');
    expect(result.blockingMessage).toContain('قسط شهر النهاية غير مجزأ');
  });

  it('rejects gaps, duplicate months and a schedule total that differs from the contract', () => {
    const result = analyzeContractBillingPeriod({
      startDate: '2026-01-01',
      endDate: '2026-04-30',
      contractAmount: 4_000,
      monthlyAmount: 1_000,
      schedules: [
        { due_date: '2026-01-01', amount: 1_000, status: 'pending' },
        { due_date: '2026-01-15', amount: 500, status: 'pending' },
        { due_date: '2026-03-01', amount: 1_000, status: 'pending' },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.blockingMessage).toContain('أكثر من قسط فعّال للشهر نفسه');
    expect(result.blockingMessage).toContain('الأشهر الناقصة هي: 2026-02');
    expect(result.blockingMessage).toContain('لا يطابق قيمة العقد');
  });

  it('fails closed instead of guessing partial boundary installments without a schedule', () => {
    const result = analyzeContractBillingPeriod({
      startDate: '2024-08-15',
      endDate: '2027-08-15',
      contractAmount: 64_800,
      monthlyAmount: 1_800,
      schedules: [],
    });

    expect(result.valid).toBe(false);
    expect(result.blockingMessage).toContain('لن يخمّن النظام التجزئة');
  });
});
