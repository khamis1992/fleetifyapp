import { describe, expect, it } from 'vitest';
import { taqadiErrorMessage } from '../taqadiErrorMessage';

describe('filing authentication recovery messages', () => {
  it('replaces the historical false PIN diagnosis with safe continuation guidance', () => {
    const message = taqadiErrorMessage('تحقق من الرقم السري ثم أعد تشغيل الوكيل.', 'SMART_CARD_PIN_RETRY_LIMIT');
    expect(message).toContain('لا يثبت أن الرقم خاطئ');
    expect(message).toContain('متابعة من تقاضي');
    expect(message).not.toContain('أعد تشغيل الوكيل');
  });

  it('distinguishes successful login from missing company authorization', () => {
    const message = taqadiErrorMessage('old error', 'TAWTHEEQ_COMPANY_CONTEXT_NOT_VERIFIED');
    expect(message).toContain('نجح الدخول');
    expect(message).toContain('17201586');
    expect(message).toContain('لم يبدأ');
  });

  it('preserves unrelated errors and handles missing diagnostics', () => {
    expect(taqadiErrorMessage('ملف العقد غير متاح', 'DOCUMENT_MISSING')).toBe('ملف العقد غير متاح');
    expect(taqadiErrorMessage(null)).toBe('');
    expect(taqadiErrorMessage('[object Object]')).toContain('لم تحفظ تفاصيل الخطأ');
  });
});
