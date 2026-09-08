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
  const incompletePackage = raw.match(/Filing package is incomplete:\s*(\[[\s\S]*\])/i);
  if (incompletePackage) {
    try {
      const keys: unknown = JSON.parse(incompletePackage[1]);
      if (Array.isArray(keys) && keys.every((key) => typeof key === 'string')) {
        const labels: Record<string, string> = {
          'documents.violations': 'كشف المخالفات',
          'documents.violationsEvidence': 'مستند إثبات المخالفات الرسمي',
          'documents.memo': 'المذكرة الشارحة',
          'documents.claims': 'كشف المطالبات',
          'documents.docsList': 'كشف المستندات',
          'documents.contract': 'العقد الموقّع',
          'documents.commercialRegister': 'السجل التجاري',
          'documents.ibanCertificate': 'شهادة الحساب البنكي',
          'documents.representativeId': 'هوية المفوض',
          'case.title': 'عنوان الدعوى',
          'case.facts': 'وقائع الدعوى',
          'case.claims': 'طلبات الدعوى',
          'case.amount': 'قيمة المطالبة',
          'defendant.fullName': 'اسم المدعى عليه',
          'defendant.idNumber': 'الرقم الشخصي للمدعى عليه',
          'defendant.nationality': 'جنسية المدعى عليه',
        };
        const names = keys.map((key: string) => key.startsWith('documents.contract.sourceDocumentId')
          ? 'نسخة عقد موقّع مرتبطة بالعقد ومطابقة للهوية'
          : labels[key] || decodeDisplayText(key));
        const guidance = keys.includes('documents.violationsEvidence')
          ? ' أرفق الإثبات الرسمي في الوقائع والأدلة، ثم أعد تجهيز الحافظة.'
          : ' راجع البيانات وحافظة المستندات ثم أعد المحاولة.';
        return `حافظة الدعوى غير مكتملة: ${names.join('، ')}.${guidance}`;
      }
    } catch {
      // Preserve malformed or future diagnostics instead of hiding the cause.
    }
  }
  if (raw.includes('LAWSUIT_SOURCE_DOCUMENT_NOT_DIRECT_ACTIVE_MATCH')) {
    return 'تعذر تسجيل الإيداع لأن مطابقة نسخة العقد تحتاج مراجعة. افتح تفاصيل العقد وراجع المستند ثم استخدم «مطابقة يدوية». الإيصال محفوظ وسيعاد تحديث النظام دون إرسال الدعوى مرة أخرى.';
  }
  if (raw.trim() === '[object Object]') {
    return 'توقفت محاولة سابقة، لكن نسخة الوكيل القديمة لم تحفظ تفاصيل الخطأ. راجع سجل التنفيذ وحالة المسودة في تقاضي قبل المتابعة.';
  }
  if (/<!doctype html|<html[\s>]/i.test(raw)) {
    return 'تعذر الاتصال بخادم البيانات مؤقتاً؛ أعد المتابعة بعد استقرار الاتصال.';
  }
  return decodeDisplayText(raw);
}
