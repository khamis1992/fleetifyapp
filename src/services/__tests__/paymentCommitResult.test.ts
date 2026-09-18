import { describe, expect, it, vi } from 'vitest';
import { PaymentRecordedReadError, readPaymentAfterCommit } from '../paymentCommitResult';

const id = '11111111-1111-4111-8111-111111111111';
const company = '22222222-2222-4222-8222-222222222222';

describe('payment command acknowledgement and subsequent read', () => {
  it('returns only the matching server record', async () => {
    const row = { id, company_id: company, payment_number: 'SERVER-NUMBER' };
    const read = vi.fn().mockResolvedValue({ data: row, error: null });
    expect(await readPaymentAfterCommit(id, company, read)).toBe(row);
    expect(read).toHaveBeenCalledExactlyOnceWith(id);
  });

  it.each([
    { data: null, error: { code: '42501', message: 'read denied' } },
    { data: null, error: null },
    { data: { id: 'wrong-id', company_id: company }, error: null },
    { data: { id, company_id: 'wrong-company' }, error: null },
  ])('preserves the committed ID when reading fails: %j', async (response) => {
    const read = vi.fn().mockResolvedValue(response);
    const error = await readPaymentAfterCommit(id, company, read).catch((cause) => cause);
    expect(error).toBeInstanceOf(PaymentRecordedReadError);
    expect(error.paymentId).toBe(id);
    expect(error.companyId).toBe(company);
    expect(error.message).toContain('لا تسجل الدفعة مرة أخرى');
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('also classifies thrown transport errors after confirmation without retrying', async () => {
    const cause = new TypeError('fetch failed');
    const read = vi.fn().mockRejectedValue(cause);
    const error = await readPaymentAfterCommit(id, company, read).catch((failure) => failure);
    expect(error).toBeInstanceOf(PaymentRecordedReadError);
    expect(error.readCause).toBe(cause);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it.each([null, undefined, '', 'not-a-uuid', { id }])('does not claim commitment from a malformed command result: %j', async (ack) => {
    const read = vi.fn();
    const error = await readPaymentAfterCommit(ack, company, read).catch((cause) => cause);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(PaymentRecordedReadError);
    expect(error.message).toContain('تحقق من المدفوعات قبل تكرار الطلب');
    expect(read).not.toHaveBeenCalled();
  });
});
