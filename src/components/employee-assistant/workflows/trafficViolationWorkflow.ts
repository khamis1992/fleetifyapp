/**
 * سير عمل تسجيل المخالفات المرورية
 * Traffic Violation Workflow
 * يتضمن جميع التحققات المطلوبة لتسجيل مخالفة مرورية
 */

import type { WorkflowConfig, WorkflowCheck } from '../types';

// المرحلة 1: تحديد المخالفة
const violationIdentificationChecks: WorkflowCheck[] = [
  {
    id: 'violation_number',
    title: 'رقم المخالفة',
    description: 'إدخال رقم المخالفة من الجهة المختصة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const num = data?.violation_number || '';
      return num.length >= 3;
    },
    blockingMessage: 'يجب إدخال رقم المخالفة',
  },
  {
    id: 'violation_date',
    title: 'تاريخ المخالفة',
    description: 'تاريخ ارتكاب المخالفة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.violation_date,
    blockingMessage: 'يجب تحديد تاريخ المخالفة',
  },
  {
    id: 'violation_type',
    title: 'نوع المخالفة',
    description: 'تحديد نوع المخالفة المرورية',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.violation_type,
    blockingMessage: 'يجب تحديد نوع المخالفة',
  },
  {
    id: 'violation_location',
    title: 'موقع المخالفة',
    description: 'المكان الذي وقعت فيه المخالفة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.location,
  },
  {
    id: 'issuing_authority',
    title: 'الجهة المصدرة',
    description: 'الجهة التي أصدرت المخالفة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.issuing_authority,
  },
];

// المرحلة 2: تحديد المركبة
const vehicleIdentificationChecks: WorkflowCheck[] = [
  {
    id: 'select_vehicle',
    title: 'تحديد المركبة',
    description: 'اختيار المركبة المرتبطة بالمخالفة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!(data?.vehicle_id || data?.vehicle),
    blockingMessage: 'يجب تحديد المركبة',
  },
  {
    id: 'verify_plate_number',
    title: 'التحقق من رقم اللوحة',
    description: 'مطابقة رقم اللوحة مع المخالفة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.vehicle?.plate_number,
  },
  {
    id: 'check_vehicle_ownership',
    title: 'التحقق من ملكية المركبة',
    description: 'التأكد من أن المركبة تابعة للشركة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => data?.vehicle?.company_id === data?.company_id,
    warningMessage: 'المركبة قد لا تكون تابعة للشركة',
  },
];

// المرحلة 3: تحديد السائق/المستأجر
const driverIdentificationChecks: WorkflowCheck[] = [
  {
    id: 'identify_driver',
    title: 'تحديد السائق/المستأجر',
    description: 'من كان يقود المركبة وقت المخالفة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!(data?.driver_id || data?.customer_id || data?.driver_name),
    blockingMessage: 'يجب تحديد السائق أو المستأجر',
  },
  {
    id: 'check_active_contract',
    title: 'التحقق من العقد النشط',
    description: 'البحث عن عقد نشط وقت المخالفة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.contract_id,
    warningMessage: 'لم يتم العثور على عقد نشط وقت المخالفة',
  },
  {
    id: 'verify_driver_license',
    title: 'التحقق من رخصة القيادة',
    description: 'التأكد من صلاحية رخصة السائق',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'contact_driver',
    title: '📞 التواصل مع السائق',
    description: 'إبلاغ السائق بالمخالفة',
    type: 'manual',
    required: true,
    completed: false,
  },
];

// المرحلة 4: التفاصيل المالية
const financialDetailsChecks: WorkflowCheck[] = [
  {
    id: 'violation_amount',
    title: 'مبلغ المخالفة',
    description: 'قيمة الغرامة المالية',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => (data?.amount || 0) > 0,
    blockingMessage: 'يجب إدخال مبلغ المخالفة',
  },
  {
    id: 'payment_deadline',
    title: 'موعد السداد',
    description: 'آخر موعد لدفع المخالفة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.payment_deadline,
    blockingMessage: 'يجب تحديد موعد السداد',
  },
  {
    id: 'check_discount',
    title: 'التحقق من الخصم',
    description: 'هل يوجد خصم للسداد المبكر؟',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => data?.early_payment_discount !== undefined,
  },
  {
    id: 'determine_responsibility',
    title: 'تحديد المسؤولية المالية',
    description: 'من يتحمل دفع المخالفة؟',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.responsible_party,
    blockingMessage: 'يجب تحديد المسؤول عن الدفع',
  },
  {
    id: 'add_to_customer_invoice',
    title: '🧾 إضافة لفاتورة العميل',
    description: 'ربط المخالفة بفاتورة العميل',
    type: 'manual',
    required: false,
    completed: false,
    condition: (data) => data?.responsible_party === 'customer',
  },
];

// المرحلة 5: التوثيق والحفظ
const documentationChecks: WorkflowCheck[] = [
  {
    id: 'upload_violation_image',
    title: '📷 رفع صورة المخالفة',
    description: 'صورة من إشعار المخالفة',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'add_notes',
    title: 'إضافة ملاحظات',
    description: 'أي ملاحظات إضافية',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => data?.notes !== undefined,
  },
  {
    id: 'save_violation',
    title: '💾 حفظ المخالفة',
    description: 'حفظ بيانات المخالفة في النظام',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.violation_id || data?.saved === true,
    successMessage: '✅ تم حفظ المخالفة بنجاح',
  },
  {
    id: 'update_vehicle_record',
    title: 'تحديث سجل المركبة',
    description: 'إضافة المخالفة لسجل المركبة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => data?.vehicle_record_updated === true,
  },
  {
    id: 'create_reminder',
    title: '⏰ إنشاء تذكير بالسداد',
    description: 'تذكير قبل موعد السداد',
    type: 'manual',
    required: false,
    completed: false,
  },
];

// المرحلة 6: السداد والإغلاق
const paymentClosureChecks: WorkflowCheck[] = [
  {
    id: 'payment_received',
    title: '💰 استلام الدفعة',
    description: 'استلام مبلغ المخالفة من المسؤول',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.responsible_party === 'customer',
  },
  {
    id: 'pay_violation',
    title: '💳 دفع المخالفة',
    description: 'سداد المخالفة للجهة المختصة',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'upload_payment_receipt',
    title: '🧾 رفع إيصال الدفع',
    description: 'توثيق إيصال سداد المخالفة',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'close_violation',
    title: '✅ إغلاق المخالفة',
    description: 'تحديث حالة المخالفة إلى مغلقة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => data?.status === 'paid' || data?.status === 'closed',
    successMessage: '✅ تم إغلاق المخالفة بنجاح',
  },
];

// تكوين سير عمل المخالفات المرورية
export const trafficViolationWorkflow: WorkflowConfig = {
  id: 'traffic_violation',
  title: 'تسجيل مخالفة مرورية',
  description: 'سير عمل تسجيل ومتابعة المخالفات المرورية',
  icon: '🚨',
  phases: [
    {
      id: 'violation_identification',
      title: 'تحديد المخالفة',
      icon: '📋',
      description: 'بيانات المخالفة الأساسية',
      checks: violationIdentificationChecks,
    },
    {
      id: 'vehicle_identification',
      title: 'تحديد المركبة',
      icon: '🚗',
      description: 'المركبة المرتبطة بالمخالفة',
      checks: vehicleIdentificationChecks,
    },
    {
      id: 'driver_identification',
      title: 'تحديد السائق',
      icon: '👤',
      description: 'السائق/المستأجر وقت المخالفة',
      checks: driverIdentificationChecks,
    },
    {
      id: 'financial_details',
      title: 'التفاصيل المالية',
      icon: '💰',
      description: 'قيمة المخالفة والمسؤولية',
      checks: financialDetailsChecks,
    },
    {
      id: 'documentation',
      title: 'التوثيق والحفظ',
      icon: '📁',
      description: 'توثيق وحفظ المخالفة',
      checks: documentationChecks,
    },
    {
      id: 'payment_closure',
      title: 'السداد والإغلاق',
      icon: '✅',
      description: 'دفع وإغلاق المخالفة',
      checks: paymentClosureChecks,
    },
  ],
};

export default trafficViolationWorkflow;

