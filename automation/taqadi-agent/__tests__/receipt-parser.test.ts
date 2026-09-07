import { describe, expect, it } from 'vitest';
import { parseTaqadiReceipt } from '../receipt-parser';
import type { FilingPayload } from '../types';

describe('receipt evidence', () => {
  it('waits for the number, not just the receipt label', () => {
    expect(parseTaqadiReceipt('إشعار تقديم الطلب رقم المرجع:')).toBeNull();
    expect(parseTaqadiReceipt('إشعار تقديم الطلب رقم المرجع: ----')).toBeNull();
    expect(parseTaqadiReceipt('رقم الطلب: 123456 المراجعة النهائية')).toBeNull();
    expect(parseTaqadiReceipt('تم حفظ المسودة بنجاح رقم الطلب: 123456')).toBeNull();
  });
  it('parses the real receipt and normalizes Arabic numerals', () => {
    expect(parseTaqadiReceipt('إشعار تقديم الطلب إيصال طلب قيد دعوى رقم المرجع: ٢٠٢٦٠٠١٠٩٣٥ رسوم تسليم طلب رفع دعوى 3000.0'))
      .toMatchObject({ referenceNumber: '20260010935', courtFees: 3000 });
  });
  it('rejects a receipt that explicitly names a different contract or defendant identity', () => {
    const expected = { contract: { number: 'LTO-123' }, defendant: { idNumber: '12345678901' } } as FilingPayload;
    expect(parseTaqadiReceipt('إشعار تقديم الطلب رقم الطلب: 12345 رقم العقد: LTO-999', expected)).toBeNull();
    expect(parseTaqadiReceipt('إشعار تقديم الطلب رقم الطلب: 12345 رقم هوية المدعى عليه: 99999999999', expected)).toBeNull();
    expect(parseTaqadiReceipt('إشعار تقديم الطلب رقم الطلب: 12345 رقم العقد: LTO-123', expected)?.referenceNumber).toBe('12345');
  });
});
