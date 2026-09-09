import { describe, expect, it } from 'vitest';
import { taqadiErrorMessage } from '../taqadiErrorMessage';

describe('filing authentication recovery messages', () => {
  it('explains stale memo components and service dates with a new-snapshot recovery action', () => {
    const message = taqadiErrorMessage('Filing package is incomplete: ["memoSnapshot.financial_components_changed","memoSnapshot.service_period_changed"]');
    expect(message).toContain('تغيرت مكونات المطالبة');
    expect(message).toContain('تغيرت فترة الخدمة');
    expect(message).toContain('ثبّت نسخة جديدة');
    expect(message).not.toContain('memoSnapshot.');
  });
  it('explains changed evidence once when more than one validation stage reports it', () => {
    const message = taqadiErrorMessage('Filing package is incomplete: ["memoSnapshot.evidence_unavailable","memoSnapshot.evidence_unavailable","memoSnapshot.vehicle_changed"]');
    expect(message.match(/أحد المستندات المؤيدة/g)).toHaveLength(1);
    expect(message).toContain('تغيرت بيانات المركبة');
    expect(message).toContain('ثبّت نسخة جديدة');
    expect(message).not.toContain('memoSnapshot.');
  });
  it('explains missing filing documents in Arabic for PostgREST error objects', () => {
    const message = taqadiErrorMessage({ message: 'Filing package is incomplete: ["documents.violations", "documents.violationsEvidence"]' });
    expect(message).toContain('كشف المخالفات');
    expect(message).toContain('مستند إثبات المخالفات الرسمي');
    expect(message).toContain('أعد تجهيز الحافظة');
    expect(message).not.toContain('documents.');
  });
  it('preserves unknown diagnostics and handles malformed package errors without throwing', () => {
    expect(taqadiErrorMessage('Filing package is incomplete: ["documents.memo", "future.field"]')).toContain('المذكرة الشارحة، future.field');
    expect(taqadiErrorMessage('Filing package is incomplete: [bad json]')).toContain('[bad json]');
    expect(taqadiErrorMessage('Filing package is incomplete: ["documents.contract.sourceDocumentId:missing"]')).toContain('مطابقة للهوية');
  });
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
