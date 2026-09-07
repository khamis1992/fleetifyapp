import { decodeDisplayText } from '@/utils/arabicDisplayText';

/** Historical workers persisted String(PostgRESTError), losing its diagnostics. */
export function taqadiErrorMessage(value: unknown, code?: string | null): string {
  if (code === 'SMART_CARD_PIN_RETRY_LIMIT') {
    return 'توقف إدخال الرقم السري تلقائيًا لحماية البطاقة. هذا التنبيه لا يثبت أن الرقم خاطئ. أكمل الدخول في نافذة الوكيل، واختر حساب شركة العراف، ثم اضغط «متابعة من تقاضي».';
  }
  if (code === 'TAWTHEEQ_COMPANY_CONTEXT_NOT_VERIFIED') {
    return 'نجح الدخول إلى تقاضي، لكن حساب شركة العراف لم يُتحقق منه. اختر حساب الشركة برقم المنشأة 17201586 في نافذة الوكيل ثم اضغط «متابعة من تقاضي». لم يبدأ الوكيل إنشاء الدعوى.';
  }
  const raw = typeof value === 'string'
    ? value
    : value && typeof value === 'object' && 'message' in value
      && typeof value.message === 'string' ? value.message : '';
  if (!raw.trim()) return '';
  if (raw.trim() === '[object Object]') {
    return 'توقفت محاولة سابقة، لكن نسخة الوكيل القديمة لم تحفظ تفاصيل الخطأ. راجع سجل التنفيذ وحالة المسودة في تقاضي قبل المتابعة.';
  }
  if (/<!doctype html|<html[\s>]/i.test(raw)) {
    return 'تعذر الاتصال بخادم البيانات مؤقتاً؛ أعد المتابعة بعد استقرار الاتصال.';
  }
  return decodeDisplayText(raw);
}
