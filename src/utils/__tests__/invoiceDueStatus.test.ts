import { describe, expect, it } from 'vitest';
import { getInvoiceDueStatus } from '@/utils/invoiceDueStatus';

describe('getInvoiceDueStatus', () => {
  const today = new Date(2026, 8, 1, 15, 30);

  it('marks an invoice after today as future', () => {
    expect(getInvoiceDueStatus('2026-12-01', today)).toBe('future');
  });

  it('marks an invoice due today separately', () => {
    expect(getInvoiceDueStatus('2026-09-01', today)).toBe('due_today');
  });

  it('marks an invoice before today as overdue', () => {
    expect(getInvoiceDueStatus('2026-08-31', today)).toBe('overdue');
  });

  it('marks missing or invalid dates as unscheduled', () => {
    expect(getInvoiceDueStatus(null, today)).toBe('unscheduled');
    expect(getInvoiceDueStatus('not-a-date', today)).toBe('unscheduled');
    expect(getInvoiceDueStatus('2026-02-31', today)).toBe('unscheduled');
  });
});
