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
          'memoSnapshot.missing': 'نسخة المذكرة المحفوظة غير موجودة لهذا العقد',
          'memoSnapshot.superseded': 'توجد نسخة أحدث من المذكرة',
          'memoSnapshot.scope_changed': 'تغير نطاق المطالبة عن المذكرة',
          'memoSnapshot.financial_components_changed': 'تغيرت مكونات المطالبة عن المذكرة',
          'memoSnapshot.rent_settlement_changed': 'تغير إجمالي الأجرة أو المدفوعات المحتسبة',
          'memoSnapshot.service_period_changed': 'تغيرت فترة الخدمة المطالب بها',
          'memoSnapshot.compensation_details_changed': 'تغيرت تفاصيل التعويض الاتفاقي أو سقفه',
          'memoSnapshot.retention_details_changed': 'تغيرت فترة الاحتباس أو سعره المؤيد',
          'memoSnapshot.invalid_details': 'تعذر التحقق من تفاصيل المذكرة المحفوظة',
          'memoSnapshot.parties_changed': 'تغيرت بيانات المدعى عليه أو بيانات تبليغه',
          'memoSnapshot.contract_changed': 'تغيرت بيانات العقد أو بنوده',
          'memoSnapshot.vehicle_changed': 'تغيرت بيانات المركبة',
          'memoSnapshot.case_number_changed': 'تغير رقم الدعوى القضائي',
          'memoSnapshot.custody_changed': 'تغيرت وقائع تسليم المركبة أو حيازتها أو ردها',
          'memoSnapshot.termination_changed': 'تغير مسار إنهاء العقد أو مستنداته',
          'memoSnapshot.notices_changed': 'تغيرت وقائع الإعذار أو مستنداته',
          'memoSnapshot.damage_details_changed': 'تغيرت تفاصيل الأضرار والمصاريف المؤيدة',
          'memoSnapshot.evidence_unavailable': 'أحد المستندات المؤيدة لم يعد صالحًا للاعتماد',
        };
        const names = [...new Set(keys.map((key: string) => key.startsWith('documents.contract.sourceDocumentId')
          ? 'نسخة عقد موقّع مرتبطة بالعقد ومطابقة للهوية'
          : labels[key] || decodeDisplayText(key)))];
        const guidance = keys.some((key: string) => key.startsWith('memoSnapshot.'))
          ? ' حدّث بيانات المطالبة وراجع تفاصيلها، ثم ثبّت نسخة جديدة من المذكرة وأعد تجهيز الحافظة.'
          : keys.includes('documents.violationsEvidence')
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
