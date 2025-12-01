/**
 * سير عمل إنشاء فاتورة
 * New Invoice Workflow
 * يتضمن جميع التحققات المطلوبة لضمان إنشاء فاتورة صحيحة
 */

import type { WorkflowConfig, WorkflowCheck } from '../types';

// المرحلة 1: تحديد العميل والعقد
const customerSelectionChecks: WorkflowCheck[] = [
  {
    id: 'select_customer',
    title: 'اختيار العميل',
    description: 'تحديد العميل الذي ستُصدر له الفاتورة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.customer_id,
    blockingMessage: 'يجب اختيار العميل',
  },
  {
    id: 'verify_customer_data',
    title: 'التحقق من بيانات العميل',
    description: 'التأكد من صحة الاسم والهاتف والعنوان',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const customer = data?.customer;
      return !!(customer?.name || customer?.full_name);
    },
    warningMessage: 'بيانات العميل غير مكتملة',
  },
  {
    id: 'select_contract',
    title: 'ربط بعقد (اختياري)',
    description: 'ربط الفاتورة بعقد محدد إن وجد',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.contract_id,
  },
  {
    id: 'check_customer_balance',
    title: 'التحقق من رصيد العميل',
    description: 'مراجعة المستحقات السابقة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => {
      const balance = data?.customer?.outstanding_balance || 0;
      return balance === 0;
    },
    warningMessage: '⚠️ العميل لديه مستحقات سابقة غير مسددة',
  },
];

// المرحلة 2: بنود الفاتورة
const invoiceItemsChecks: WorkflowCheck[] = [
  {
    id: 'add_at_least_one_item',
    title: 'إضافة بند واحد على الأقل',
    description: 'الفاتورة يجب أن تحتوي على بند واحد على الأقل',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const items = data?.items || [];
      return items.length > 0;
    },
    blockingMessage: 'يجب إضافة بند واحد على الأقل',
  },
  {
    id: 'verify_item_descriptions',
    title: 'وصف واضح لكل بند',
    description: 'التأكد من وضوح وصف كل بند',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const items = data?.items || [];
      return items.every((item: any) => item.description && item.description.length > 0);
    },
    blockingMessage: 'بعض البنود بدون وصف',
  },
  {
    id: 'verify_item_prices',
    title: 'التحقق من الأسعار',
    description: 'التأكد من صحة سعر كل بند',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const items = data?.items || [];
      return items.every((item: any) => (item.unit_price || item.price || 0) > 0);
    },
    blockingMessage: 'بعض البنود بسعر صفر أو سالب',
  },
  {
    id: 'verify_quantities',
    title: 'التحقق من الكميات',
    description: 'التأكد من صحة كمية كل بند',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const items = data?.items || [];
      return items.every((item: any) => (item.quantity || 1) > 0);
    },
    blockingMessage: 'بعض البنود بكمية صفر أو سالبة',
  },
  {
    id: 'verify_total_calculation',
    title: 'التحقق من حساب الإجمالي',
    description: 'التأكد من صحة حساب المجموع',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const total = data?.subtotal || data?.total_amount || 0;
      return total > 0;
    },
    blockingMessage: 'إجمالي الفاتورة صفر',
  },
  {
    id: 'review_items',
    title: '📋 مراجعة جميع البنود',
    description: 'مراجعة يدوية لجميع بنود الفاتورة',
    type: 'manual',
    required: true,
    completed: false,
  },
];

// المرحلة 3: الضرائب والخصومات
const taxDiscountChecks: WorkflowCheck[] = [
  {
    id: 'apply_tax',
    title: 'تطبيق الضريبة',
    description: 'إضافة ضريبة القيمة المضافة إن وجدت',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => {
      // إذا كانت الضريبة مفعلة، يجب أن تكون موجودة
      if (data?.tax_enabled === false) return true;
      return (data?.tax_amount || 0) >= 0;
    },
  },
  {
    id: 'apply_discount',
    title: 'تطبيق الخصم (إن وجد)',
    description: 'إضافة خصم على الفاتورة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => (data?.discount_amount || 0) >= 0,
  },
  {
    id: 'manager_approval_for_discount',
    title: '⚠️ موافقة المدير على الخصم',
    description: 'الخصم الكبير يتطلب موافقة المدير',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => {
      const discount = data?.discount_percentage || 0;
      return discount > 10; // خصم أكثر من 10%
    },
    blockingMessage: 'يجب الحصول على موافقة المدير للخصومات الكبيرة',
  },
  {
    id: 'calculate_final_total',
    title: 'حساب الإجمالي النهائي',
    description: 'المجموع بعد الضريبة والخصم',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const total = data?.total_amount || data?.grand_total || 0;
      return total > 0;
    },
    successMessage: '✓ تم حساب الإجمالي النهائي',
  },
];

// المرحلة 4: شروط الدفع
const paymentTermsChecks: WorkflowCheck[] = [
  {
    id: 'set_due_date',
    title: 'تحديد تاريخ الاستحقاق',
    description: 'موعد سداد الفاتورة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.due_date,
    blockingMessage: 'يجب تحديد تاريخ الاستحقاق',
  },
  {
    id: 'due_date_valid',
    title: 'التحقق من تاريخ الاستحقاق',
    description: 'التاريخ يجب أن يكون في المستقبل',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.due_date) return false;
      return new Date(data.due_date) >= new Date();
    },
    warningMessage: 'تاريخ الاستحقاق في الماضي',
  },
  {
    id: 'set_payment_method',
    title: 'تحديد طريقة الدفع المفضلة',
    description: 'طريقة الدفع المتوقعة من العميل',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.preferred_payment_method,
  },
  {
    id: 'add_payment_notes',
    title: 'إضافة ملاحظات الدفع',
    description: 'أي شروط أو ملاحظات خاصة',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'set_invoice_number',
    title: 'تعيين رقم الفاتورة',
    description: 'رقم تسلسلي فريد للفاتورة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.invoice_number,
  },
];

// المرحلة 5: المراجعة والإرسال
const reviewSendChecks: WorkflowCheck[] = [
  {
    id: 'review_invoice',
    title: '📋 مراجعة الفاتورة كاملة',
    description: 'التأكد من صحة جميع البيانات',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'preview_print',
    title: '👁️ معاينة الطباعة',
    description: 'التأكد من المظهر النهائي للفاتورة',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'save_invoice',
    title: '💾 حفظ الفاتورة',
    description: 'حفظ الفاتورة في النظام',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.invoice_saved,
    successMessage: '✅ تم حفظ الفاتورة بنجاح',
  },
  {
    id: 'create_journal_entry',
    title: '📊 إنشاء القيد المحاسبي',
    description: 'تسجيل المديونية تلقائياً',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.journal_entry_created,
    successMessage: '✅ تم إنشاء القيد المحاسبي',
  },
  {
    id: 'send_to_customer',
    title: '📤 إرسال للعميل',
    description: 'إرسال الفاتورة عبر واتساب أو بريد إلكتروني',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'print_invoice',
    title: '🖨️ طباعة الفاتورة',
    description: 'طباعة نسخة ورقية للعميل أو للأرشيف',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'archive_copy',
    title: '📁 حفظ نسخة للأرشيف',
    description: 'الاحتفاظ بنسخة في ملفات الشركة',
    type: 'manual',
    required: false,
    completed: false,
  },
];

// تكوين سير عمل إنشاء فاتورة
export const invoiceWorkflow: WorkflowConfig = {
  id: 'new_invoice',
  title: 'إنشاء فاتورة',
  description: 'سير عمل إنشاء فاتورة جديدة للعميل',
  icon: '📄',
  phases: [
    {
      id: 'customer_selection',
      title: 'العميل والعقد',
      icon: '👤',
      description: 'تحديد العميل وربط الفاتورة',
      checks: customerSelectionChecks,
    },
    {
      id: 'invoice_items',
      title: 'بنود الفاتورة',
      icon: '📝',
      description: 'إضافة ومراجعة بنود الفاتورة',
      checks: invoiceItemsChecks,
    },
    {
      id: 'tax_discount',
      title: 'الضرائب والخصومات',
      icon: '💰',
      description: 'تطبيق الضرائب والخصومات',
      checks: taxDiscountChecks,
    },
    {
      id: 'payment_terms',
      title: 'شروط الدفع',
      icon: '📅',
      description: 'تحديد شروط ومواعيد الدفع',
      checks: paymentTermsChecks,
    },
    {
      id: 'review_send',
      title: 'المراجعة والإرسال',
      icon: '✅',
      description: 'مراجعة وإرسال الفاتورة',
      checks: reviewSendChecks,
    },
  ],
};

export default invoiceWorkflow;

