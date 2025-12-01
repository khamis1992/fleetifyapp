/**
 * سير عمل تسجيل الدفعات
 * Payment Recording Workflow
 * يتضمن جميع التحققات المطلوبة لضمان تسجيل دفعة صحيحة
 */

import type { WorkflowConfig, WorkflowCheck } from '../types';

// التحققات المتعلقة بمصدر الدفعة
const sourceVerificationChecks: WorkflowCheck[] = [
  {
    id: 'identify_customer',
    title: 'تحديد العميل/العقد',
    description: 'التأكد من اختيار العميل أو العقد الصحيح',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      return !!(data?.customer_id || data?.contract_id);
    },
    blockingMessage: 'يجب تحديد العميل أو العقد لتسجيل الدفعة',
  },
  {
    id: 'check_customer_balance',
    title: 'التحقق من رصيد العميل',
    description: 'التأكد من وجود مستحقات على العميل',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => {
      const balance = data?.customer?.outstanding_balance || 0;
      return balance > 0;
    },
    warningMessage: 'العميل ليس لديه مستحقات - تأكد من صحة الدفعة',
  },
  {
    id: 'check_contract_status',
    title: 'حالة العقد نشطة',
    description: 'التأكد من أن العقد المرتبط نشط',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.contract) return true; // لا يوجد عقد = لا حاجة للتحقق
      return data.contract.status === 'active';
    },
    warningMessage: 'العقد غير نشط - تأكد من صحة الربط',
  },
  {
    id: 'verify_payer_identity',
    title: 'التحقق من هوية الدافع',
    description: 'التأكد من أن الشخص الدافع هو العميل أو مفوض عنه',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'match_phone_number',
    title: 'مطابقة رقم الهاتف',
    description: 'التأكد من تطابق رقم هاتف الدافع مع الملف',
    type: 'manual',
    required: false,
    completed: false,
  },
];

// التحققات المتعلقة بالمبلغ
const amountVerificationChecks: WorkflowCheck[] = [
  {
    id: 'amount_greater_than_zero',
    title: 'المبلغ أكبر من صفر',
    description: 'التحقق من أن المبلغ المدخل صحيح',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      return (data?.amount || 0) > 0;
    },
    blockingMessage: 'يجب إدخال مبلغ أكبر من صفر',
  },
  {
    id: 'amount_within_balance',
    title: 'المبلغ ضمن المستحق',
    description: 'التحقق من أن المبلغ لا يتجاوز المستحقات',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => {
      const amount = data?.amount || 0;
      const balance = data?.customer?.outstanding_balance || Infinity;
      return amount <= balance;
    },
    warningMessage: 'المبلغ يتجاوز رصيد المستحقات - سيُسجل كرصيد دائن',
  },
  {
    id: 'count_cash_twice',
    title: '💵 عد النقود مرتين',
    description: 'عد المبلغ النقدي مرتين أمام العميل للتأكد',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cash',
  },
  {
    id: 'verify_currency_notes',
    title: 'التأكد من فئات العملة',
    description: 'فحص الأوراق النقدية والتأكد من سلامتها',
    type: 'manual',
    required: false,
    completed: false,
    condition: (data) => data?.payment_method === 'cash',
  },
  {
    id: 'large_amount_approval',
    title: '⚠️ موافقة المدير (مبلغ كبير)',
    description: 'المبلغ يتجاوز 10,000 ر.ق - يتطلب موافقة',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => (data?.amount || 0) > 10000,
    blockingMessage: 'يجب الحصول على موافقة المدير للمبالغ الكبيرة',
  },
];

// تحققات الدفع النقدي
const cashPaymentChecks: WorkflowCheck[] = [
  {
    id: 'receive_full_amount',
    title: '✅ استلام المبلغ كاملاً',
    description: 'التأكد من استلام كامل المبلغ المتفق عليه',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cash',
    blockingMessage: 'يجب استلام المبلغ كاملاً قبل التسجيل',
  },
  {
    id: 'put_in_safe',
    title: '🔒 وضع النقد في الصندوق',
    description: 'إيداع المبلغ في صندوق الخزينة فوراً',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cash',
  },
];

// تحققات الشيك
const chequePaymentChecks: WorkflowCheck[] = [
  {
    id: 'cheque_name_match',
    title: 'اسم الشيك = اسم العميل',
    description: 'التأكد من تطابق الاسم على الشيك مع اسم العميل',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cheque' || data?.payment_method === 'check',
  },
  {
    id: 'cheque_date_valid',
    title: 'تاريخ الشيك صحيح',
    description: 'التأكد من أن تاريخ الشيك مناسب (ليس مستقبلي بعيد)',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cheque' || data?.payment_method === 'check',
  },
  {
    id: 'cheque_amount_match',
    title: 'المبلغ بالأرقام = بالحروف',
    description: 'التأكد من تطابق المبلغ المكتوب بالأرقام مع الحروف',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cheque' || data?.payment_method === 'check',
  },
  {
    id: 'cheque_signature_clear',
    title: 'التوقيع واضح وصحيح',
    description: 'التأكد من وجود توقيع واضح على الشيك',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cheque' || data?.payment_method === 'check',
  },
  {
    id: 'cheque_bank_approved',
    title: 'البنك من البنوك المعتمدة',
    description: 'التأكد من أن البنك من البنوك المقبولة لدى الشركة',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cheque' || data?.payment_method === 'check',
  },
  {
    id: 'cheque_photo_front_back',
    title: '📷 تصوير الشيك (وجهين)',
    description: 'التقاط صورة واضحة للشيك من الأمام والخلف',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cheque' || data?.payment_method === 'check',
  },
  {
    id: 'cheque_number_recorded',
    title: 'تسجيل رقم الشيك',
    description: 'إدخال رقم الشيك في النظام',
    type: 'auto',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cheque' || data?.payment_method === 'check',
    autoCheckFn: (data) => {
      return !!(data?.cheque_number || data?.reference_number);
    },
    blockingMessage: 'يجب إدخال رقم الشيك',
  },
  {
    id: 'postdated_cheque_date',
    title: '📅 تسجيل تاريخ استحقاق الشيك المؤجل',
    description: 'إدخال تاريخ استحقاق الشيك إذا كان مؤجلاً',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => {
      const isCheque = data?.payment_method === 'cheque' || data?.payment_method === 'check';
      const isPostdated = data?.is_postdated === true;
      return isCheque && isPostdated;
    },
  },
];

// تحققات التحويل البنكي
const transferPaymentChecks: WorkflowCheck[] = [
  {
    id: 'transfer_received',
    title: '✅ التأكد من وصول التحويل',
    description: 'التحقق من كشف الحساب البنكي أن التحويل وصل',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'bank_transfer' || data?.payment_method === 'transfer',
    blockingMessage: 'يجب التأكد من وصول التحويل قبل التسجيل',
  },
  {
    id: 'transfer_sender_name',
    title: 'مطابقة اسم المرسل',
    description: 'التأكد من أن اسم المرسل في التحويل يطابق اسم العميل',
    type: 'manual',
    required: false,
    completed: false,
    condition: (data) => data?.payment_method === 'bank_transfer' || data?.payment_method === 'transfer',
    warningMessage: 'إذا كان الاسم مختلفاً، تأكد من وجود تفويض',
  },
  {
    id: 'transfer_reference_saved',
    title: 'حفظ رقم مرجع التحويل',
    description: 'تسجيل رقم مرجع التحويل البنكي',
    type: 'auto',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'bank_transfer' || data?.payment_method === 'transfer',
    autoCheckFn: (data) => {
      return !!(data?.reference_number || data?.transfer_reference);
    },
    blockingMessage: 'يجب إدخال رقم مرجع التحويل',
  },
  {
    id: 'transfer_slip_saved',
    title: '📄 حفظ إشعار التحويل',
    description: 'رفع صورة من إشعار التحويل البنكي',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'bank_transfer' || data?.payment_method === 'transfer',
  },
];

// تحققات البطاقة الائتمانية
const cardPaymentChecks: WorkflowCheck[] = [
  {
    id: 'card_transaction_completed',
    title: '✅ إتمام عملية الدفع',
    description: 'التأكد من نجاح عملية الدفع بالبطاقة',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'card' || data?.payment_method === 'credit_card',
    blockingMessage: 'يجب إتمام عملية الدفع بالبطاقة أولاً',
  },
  {
    id: 'pos_receipt_printed',
    title: '🧾 طباعة إيصال نقطة البيع',
    description: 'طباعة إيصال POS والاحتفاظ به',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'card' || data?.payment_method === 'credit_card',
  },
  {
    id: 'card_customer_signature',
    title: 'توقيع العميل على الإيصال',
    description: 'الحصول على توقيع العميل على إيصال نقطة البيع',
    type: 'manual',
    required: false,
    completed: false,
    condition: (data) => data?.payment_method === 'card' || data?.payment_method === 'credit_card',
  },
  {
    id: 'card_authorization_code',
    title: 'تسجيل رقم التفويض',
    description: 'إدخال رقم تفويض العملية (Authorization Code)',
    type: 'auto',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'card' || data?.payment_method === 'credit_card',
    autoCheckFn: (data) => {
      return !!(data?.authorization_code || data?.reference_number);
    },
  },
];

// تحققات التوثيق والإيصال
const documentationChecks: WorkflowCheck[] = [
  {
    id: 'issue_receipt',
    title: '🧾 إصدار إيصال رسمي',
    description: 'طباعة سند القبض الرسمي',
    type: 'manual',
    required: true,
    completed: false,
    blockingMessage: 'يجب إصدار إيصال رسمي للعميل',
  },
  {
    id: 'employee_signature',
    title: 'توقيع الموظف',
    description: 'التوقيع على الإيصال من قبل الموظف المستلم',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'give_customer_copy',
    title: '📄 تسليم نسخة للعميل',
    description: 'إعطاء العميل نسخته من الإيصال',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'archive_company_copy',
    title: '📁 حفظ نسخة الشركة',
    description: 'أرشفة نسخة الإيصال في ملفات الشركة',
    type: 'manual',
    required: true,
    completed: false,
  },
];

// تحققات التأكيد النهائي
const finalConfirmationChecks: WorkflowCheck[] = [
  {
    id: 'review_journal_entry',
    title: 'مراجعة القيد المحاسبي',
    description: 'التأكد من صحة القيد المحاسبي التلقائي',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      // التحقق من توازن القيد
      return (data?.amount || 0) > 0;
    },
    successMessage: 'القيد متوازن ✓',
  },
  {
    id: 'customer_balance_updated',
    title: 'تحديث رصيد العميل',
    description: 'التأكد من تحديث رصيد المستحقات',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      return data?.is_submitted === true;
    },
  },
  {
    id: 'send_notification',
    title: '📱 إرسال إشعار للعميل',
    description: 'إرسال رسالة واتساب/SMS بتأكيد الاستلام',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'thank_customer',
    title: '🙏 شكر العميل',
    description: 'شكر العميل على السداد والتأكد من رضاه',
    type: 'manual',
    required: false,
    completed: false,
  },
];

// تكوين سير عمل تسجيل الدفعة الكامل
export const paymentWorkflow: WorkflowConfig = {
  id: 'payment_recording',
  title: 'تسجيل دفعة',
  description: 'سير عمل تسجيل دفعة من عميل مع جميع التحققات المطلوبة',
  icon: '💰',
  phases: [
    {
      id: 'source_verification',
      title: 'تحديد المصدر',
      icon: '👤',
      description: 'تحديد العميل/العقد والتحقق من البيانات',
      checks: sourceVerificationChecks,
    },
    {
      id: 'amount_verification',
      title: 'التحقق من المبلغ',
      icon: '💵',
      description: 'التأكد من صحة المبلغ وعده',
      checks: amountVerificationChecks,
    },
    {
      id: 'payment_method',
      title: 'طريقة الدفع',
      icon: '💳',
      description: 'التحققات الخاصة بطريقة الدفع',
      checks: [
        ...cashPaymentChecks,
        ...chequePaymentChecks,
        ...transferPaymentChecks,
        ...cardPaymentChecks,
      ],
    },
    {
      id: 'documentation',
      title: 'التوثيق والإيصال',
      icon: '📄',
      description: 'إصدار الإيصالات والتوثيق',
      checks: documentationChecks,
    },
    {
      id: 'final_confirmation',
      title: 'التأكيد النهائي',
      icon: '✅',
      description: 'مراجعة وتأكيد العملية',
      checks: finalConfirmationChecks,
    },
  ],
};

export default paymentWorkflow;

