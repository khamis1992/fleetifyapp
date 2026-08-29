import { describe, expect, it } from 'vitest';
import { buildOfficialInvoiceReceiptProps } from '../officialInvoiceReceipt';

describe('buildOfficialInvoiceReceiptProps', () => {
  it('labels legacy schedule rows as contractual due statements, not invoices', () => {
    const receipt = buildOfficialInvoiceReceiptProps({
      source: 'payment_schedule',
      invoice_number: 'استحقاق تعاقدي رقم 4',
      due_date: '2026-04-01',
      total_amount: 1500,
      paid_amount: 0,
    }, 'مستأجر تجريبي');

    expect(receipt.documentTitle).toEqual({
      ar: 'كشف استحقاق تعاقدي',
      en: 'CONTRACTUAL DUE STATEMENT',
    });
    expect(receipt.description).toContain('استحقاق أجرة تعاقدي');
    expect(receipt.amount).toBe(1500);
  });
});
