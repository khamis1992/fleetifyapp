/** A confirmed command must never be retried just because its subsequent read failed. */
export class PaymentRecordedReadError extends Error {
  readonly name = 'PaymentRecordedReadError';

  constructor(
    readonly paymentId: string,
    readonly companyId: string,
    readonly readCause: unknown,
  ) {
    super(`تم تسجيل الدفعة (${paymentId})، وتعذر تحميل تفاصيلها. لا تسجل الدفعة مرة أخرى؛ أعد تحميل بيانات العقد للتحقق.`);
  }
}

interface PaymentIdentity {
  id: string;
  company_id: string;
}

export async function readPaymentAfterCommit<T extends PaymentIdentity>(
  paymentId: unknown,
  companyId: string,
  read: (id: string) => PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T> {
  // A malformed command response is not proof of a committed payment.
  if (typeof paymentId !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId)) {
    throw new Error('تعذر تأكيد نتيجة تسجيل الدفعة. تحقق من المدفوعات قبل تكرار الطلب.');
  }

  try {
    const { data, error } = await read(paymentId);
    if (error) throw error;
    if (!data || data.id !== paymentId || data.company_id !== companyId) {
      throw new Error('لم تصل تفاصيل مطابقة للدفعة المسجلة');
    }
    return data;
  } catch (cause) {
    throw new PaymentRecordedReadError(paymentId, companyId, cause);
  }
}
