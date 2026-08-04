import { describe, expect, it, vi } from 'vitest';
import {
  buildEmployeeContractBillingSummary,
  fetchContractRowsByKeyset,
  summarizeEmployeeInvoicesByContract,
  summarizeEmployeeSchedulesByContract,
} from '@/utils/employeeContractInvoiceStats';

describe('employee contract invoice stats', () => {
  it('continues keyset pagination beyond 1,000 rows and chunks contract ids', async () => {
    const contractIds = Array.from({ length: 105 }, (_, index) => `contract-${String(index).padStart(3, '0')}`);
    const rows = [
      ...Array.from({ length: 1_205 }, (_, index) => ({
        id: `invoice-a-${String(index).padStart(4, '0')}`,
        contract_id: contractIds[0],
      })),
      ...contractIds.slice(1).map((contractId, index) => ({
        id: `invoice-b-${String(index).padStart(4, '0')}`,
        contract_id: contractId,
      })),
    ];

    const fetchPage = vi.fn(async ({
      contractIds: contractIdChunk,
      afterId,
      limit,
    }: {
      contractIds: string[];
      afterId: string | null;
      limit: number;
    }) => rows
      .filter((row) => contractIdChunk.includes(row.contract_id))
      .filter((row) => afterId === null || row.id > afterId)
      .sort((left, right) => left.id.localeCompare(right.id))
      .slice(0, limit));

    const result = await fetchContractRowsByKeyset(contractIds, fetchPage, {
      contractIdChunkSize: 50,
      pageSize: 500,
    });

    expect(result).toHaveLength(rows.length);
    expect(new Set(result.map((row) => row.id)).size).toBe(rows.length);
    expect(fetchPage.mock.calls.some(([request]) => request.afterId !== null)).toBe(true);
    expect(fetchPage.mock.calls.every(([request]) => request.contractIds.length <= 50)).toBe(true);
    expect(new Set(fetchPage.mock.calls.map(([request]) => request.contractIds.join(','))).size).toBe(3);
  });

  it('keeps every invoice-derived balance and count at zero when invoices are empty', () => {
    const stats = summarizeEmployeeInvoicesByContract([]);
    const now = new Date('2026-08-03T09:00:00.000Z');
    const summary = buildEmployeeContractBillingSummary({
      balance_due: 35_450,
      contract_amount: 48_000,
      monthly_amount: 4_000,
      start_date: '2026-01-15',
      end_date: '2026-12-15',
      status: 'active',
    }, stats.get('contract-with-gap'), undefined, now);

    expect(summary).toEqual({
      dueBalance: 0,
      openBalance: 0,
      collectibleBalance: 0,
      futureBalance: 0,
      dueCount: 0,
      openCount: 0,
      collectibleCount: 0,
      positiveInvoiceMonths: new Set(),
      billingReviewRequired: true,
    });
  });

  it('uses invoice_month before invoice_date and excludes future accounting months from collectible totals', () => {
    const now = new Date(2026, 7, 3, 12, 0, 0);
    const stats = summarizeEmployeeInvoicesByContract([
      {
        contract_id: 'contract-1',
        invoice_month: '2026-09-01',
        invoice_date: '2026-08-01',
        due_date: '2026-08-03',
        balance_due: 500,
        total_amount: 500,
        paid_amount: 0,
        payment_status: 'unpaid',
        status: 'issued',
      },
      {
        contract_id: 'contract-1',
        invoice_month: null,
        invoice_date: '2026-08-15',
        due_date: '2026-09-10',
        balance_due: 700,
        total_amount: 700,
        paid_amount: 0,
        payment_status: 'partial',
        status: 'issued',
      },
    ], now).get('contract-1');

    expect(stats).toEqual({
      dueBalance: 0,
      openBalance: 1_200,
      collectibleBalance: 700,
      futureBalance: 500,
      dueCount: 0,
      openCount: 2,
      collectibleCount: 1,
      positiveInvoiceMonths: new Set(['2026-08', '2026-09']),
    });
  });

  it('does not fabricate an open invoice from zero, paid, or cancelled rows', () => {
    const stats = summarizeEmployeeInvoicesByContract([
      {
        contract_id: 'contract-1',
        invoice_month: '2026-08-01',
        invoice_date: '2026-08-01',
        due_date: '2026-08-03',
        balance_due: 0,
        total_amount: 1_000,
        paid_amount: 0,
        payment_status: 'unpaid',
        status: 'issued',
      },
      {
        contract_id: 'contract-1',
        invoice_month: '2026-08-01',
        invoice_date: '2026-08-01',
        due_date: '2026-08-03',
        balance_due: 1_000,
        total_amount: 1_000,
        paid_amount: 0,
        payment_status: 'paid',
        status: 'issued',
      },
      {
        contract_id: 'contract-1',
        invoice_month: '2026-08-01',
        invoice_date: '2026-08-01',
        due_date: '2026-08-03',
        balance_due: 1_000,
        total_amount: 1_000,
        paid_amount: 0,
        payment_status: 'unpaid',
        status: 'cancelled',
      },
    ], new Date(2026, 7, 3)).get('contract-1');

    expect(buildEmployeeContractBillingSummary({
      balance_due: 1_000,
      contract_amount: 12_000,
      monthly_amount: 1_000,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'active',
    }, stats, undefined, new Date('2026-08-03T09:00:00.000Z')).billingReviewRequired).toBe(false);
  });

  it('requires review when an old open invoice exists but the expected current month is missing', () => {
    const now = new Date('2026-08-03T09:00:00.000Z');
    const stats = summarizeEmployeeInvoicesByContract([{
      contract_id: 'contract-1',
      invoice_month: '2026-07-01',
      invoice_date: '2026-07-01',
      due_date: '2026-07-05',
      balance_due: 1_000,
      total_amount: 1_000,
      paid_amount: 0,
      payment_status: 'unpaid',
      status: 'issued',
    }], now).get('contract-1');
    const schedules = summarizeEmployeeSchedulesByContract([{
      contract_id: 'contract-1',
      due_date: '2026-08-15',
      amount: 1_000,
      status: 'pending',
    }]).get('contract-1');

    const summary = buildEmployeeContractBillingSummary({
      balance_due: 5_000,
      contract_amount: 12_000,
      monthly_amount: 1_000,
      start_date: '2026-01-15',
      end_date: '2026-12-15',
      status: 'active',
    }, stats, schedules, now);

    expect(summary.openCount).toBe(1);
    expect(summary.billingReviewRequired).toBe(true);
  });

  it('does not require review when the current-month invoice exists and is already paid', () => {
    const now = new Date('2026-08-03T09:00:00.000Z');
    const stats = summarizeEmployeeInvoicesByContract([{
      contract_id: 'contract-1',
      invoice_month: '2026-08-01',
      invoice_date: '2026-08-01',
      due_date: '2026-08-05',
      balance_due: 0,
      total_amount: 1_000,
      paid_amount: 1_000,
      payment_status: 'paid',
      status: 'paid',
    }], now).get('contract-1');
    const schedules = summarizeEmployeeSchedulesByContract([{
      contract_id: 'contract-1',
      due_date: '2026-08-15',
      amount: 1_000,
      status: 'paid',
    }]).get('contract-1');

    const summary = buildEmployeeContractBillingSummary({
      balance_due: 4_000,
      contract_amount: 12_000,
      monthly_amount: 1_000,
      start_date: '2026-01-15',
      end_date: '2026-12-15',
      status: 'active',
    }, stats, schedules, now);

    expect(summary.openCount).toBe(0);
    expect(summary.billingReviewRequired).toBe(false);
  });

  it('still requires review when the expected invoice is missing but the denormalized contract balance is zero', () => {
    const now = new Date('2026-08-03T09:00:00.000Z');
    const schedules = summarizeEmployeeSchedulesByContract([{
      contract_id: 'contract-1',
      due_date: '2026-08-15',
      amount: 1_000,
      status: 'pending',
    }]).get('contract-1');

    const summary = buildEmployeeContractBillingSummary({
      balance_due: 0,
      contract_amount: 12_000,
      monthly_amount: 1_000,
      start_date: '2026-01-15',
      end_date: '2026-12-15',
      status: 'active',
    }, undefined, schedules, now);

    expect(summary.billingReviewRequired).toBe(true);
  });
});
