import { describe, expect, it } from 'vitest';
import {
  buildFormalPaymentNotice,
  getCycleKey,
  normalizeWhatsAppPhone,
  sha256Hex,
} from './notice.ts';

describe('automatic formal notice content', () => {
  it('normalizes Qatar numbers and rejects unusable recipients', () => {
    expect(normalizeWhatsAppPhone('5555 1234')).toBe('97455551234');
    expect(normalizeWhatsAppPhone('+974 5555 1234')).toBe('97455551234');
    expect(normalizeWhatsAppPhone('123')).toBe('');
  });

  it('builds a deterministic demand with contract, invoices, amount and grace period', async () => {
    const message = buildFormalPaymentNotice({
      customerName: 'عميل تجريبي',
      contractNumber: 'C-100',
      invoices: [{
        id: 'invoice-1',
        invoice_number: 'INV-100',
        due_date: '2026-08-01',
        balance_due: 1250,
        total_amount: 1250,
      }],
      amountDue: 1250,
      gracePeriodDays: 7,
      noticeDate: '2026-08-27',
    });

    expect(message).toContain('إنذار رسمي بالوفاء');
    expect(message).toContain('C-100');
    expect(message).toContain('فاتورة شهر أغسطس 2026');
    expect(message).not.toContain('INV-100');
    expect(message).toContain('1250.00 ريال قطري');
    expect(message).toContain('خلال 7 أيام من تاريخ استلام هذا الإنذار');
    expect(await sha256Hex(message)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('deduplicates a delinquency cycle by the oldest due month', () => {
    expect(getCycleKey('2026-08-27')).toBe('2026-08-01');
  });
});
