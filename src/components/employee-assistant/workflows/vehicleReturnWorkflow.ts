/**
 * سير عمل إعادة المركبة
 * Vehicle Return Workflow
 * يتضمن جميع التحققات المطلوبة لضمان إرجاع صحيح للمركبة
 */

import type { WorkflowConfig, WorkflowCheck } from '../types';

// المرحلة 1: تحديد العقد والمركبة
const contractIdentificationChecks: WorkflowCheck[] = [
  {
    id: 'identify_contract',
    title: 'تحديد العقد النشط',
    description: 'اختيار العقد المراد إنهاؤه',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!(data?.contract_id || data?.contract),
    blockingMessage: 'يجب تحديد العقد لإرجاع المركبة',
  },
  {
    id: 'verify_vehicle',
    title: 'التحقق من المركبة',
    description: 'التأكد من أن المركبة مرتبطة بالعقد',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!(data?.vehicle_id || data?.vehicle),
    blockingMessage: 'لا توجد مركبة مرتبطة بهذا العقد',
  },
  {
    id: 'verify_customer_identity',
    title: 'التحقق من هوية العميل',
    description: 'التأكد من أن الشخص المُرجع هو العميل أو مفوض عنه',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'check_return_date',
    title: 'التحقق من موعد الإرجاع',
    description: 'هل العميل في الموعد أم متأخر؟',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.contract?.end_date) return true;
      return new Date() <= new Date(data.contract.end_date);
    },
    warningMessage: '⚠️ العميل متأخر عن موعد الإرجاع - قد تُطبق غرامة',
  },
];

// المرحلة 2: فحص المركبة
const vehicleInspectionChecks: WorkflowCheck[] = [
  {
    id: 'inspect_front',
    title: 'الفحص الخارجي الأمامي',
    description: 'فحص المصدات، الكابوت، الأضواء الأمامية، الزجاج',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'inspect_rear',
    title: 'الفحص الخارجي الخلفي',
    description: 'فحص الصندوق، الأضواء الخلفية، المصد الخلفي',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'inspect_sides',
    title: 'فحص الجوانب',
    description: 'فحص الأبواب، المرايا الجانبية، النوافذ',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'inspect_tires',
    title: 'فحص الإطارات',
    description: 'حالة الإطارات الأربعة + الإطار الاحتياطي',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'inspect_interior',
    title: 'الفحص الداخلي',
    description: 'المقاعد، لوحة القيادة، التكييف، النظافة',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'inspect_engine',
    title: 'فحص المحرك',
    description: 'مستوى الزيت، التسريبات، أصوات غير طبيعية',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'test_lights',
    title: 'اختبار الأضواء',
    description: 'التأكد من عمل جميع الأضواء بشكل صحيح',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'test_ac',
    title: 'اختبار التكييف',
    description: 'التأكد من عمل التكييف بشكل جيد',
    type: 'manual',
    required: false,
    completed: false,
  },
];

// المرحلة 3: التوثيق
const documentationChecks: WorkflowCheck[] = [
  {
    id: 'take_photos',
    title: '📷 تصوير المركبة (8+ صور)',
    description: 'أمامية، خلفية، جوانب (4)، داخلية، عداد',
    type: 'manual',
    required: true,
    completed: false,
    blockingMessage: 'يجب توثيق حالة المركبة بالصور',
  },
  {
    id: 'record_odometer',
    title: 'تسجيل قراءة العداد',
    description: 'تسجيل الكيلومترات الحالية ومقارنتها بالتسليم',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => (data?.return_odometer || 0) > 0,
    blockingMessage: 'يجب إدخال قراءة العداد',
  },
  {
    id: 'record_fuel_level',
    title: 'تسجيل مستوى الوقود',
    description: 'مقارنة مستوى الوقود الحالي بوقت التسليم',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.return_fuel_level,
    blockingMessage: 'يجب تحديد مستوى الوقود',
  },
  {
    id: 'document_damages',
    title: '⚠️ توثيق الأضرار (إن وجدت)',
    description: 'تصوير وتوصيف أي أضرار جديدة',
    type: 'manual',
    required: false,
    completed: false,
    condition: (data) => data?.has_damages === true,
  },
  {
    id: 'compare_with_delivery',
    title: 'مقارنة بحالة التسليم',
    description: 'مراجعة صور وتقرير التسليم الأصلي',
    type: 'manual',
    required: true,
    completed: false,
  },
];

// المرحلة 4: التسوية المالية
const financialSettlementChecks: WorkflowCheck[] = [
  {
    id: 'calculate_rental_days',
    title: 'حساب أيام الإيجار الفعلية',
    description: 'مقارنة الأيام الفعلية بالعقد',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => (data?.actual_days || 0) > 0,
  },
  {
    id: 'calculate_fuel_difference',
    title: '⛽ حساب فرق الوقود',
    description: 'إذا كان مستوى الوقود أقل من التسليم',
    type: 'auto',
    required: false,
    completed: false,
    condition: (data) => {
      const deliveryFuel = data?.delivery_fuel_level || 'full';
      const returnFuel = data?.return_fuel_level || 'full';
      const fuelLevels = ['empty', 'quarter', 'half', 'three_quarter', 'full'];
      return fuelLevels.indexOf(returnFuel) < fuelLevels.indexOf(deliveryFuel);
    },
    warningMessage: 'مستوى الوقود أقل من التسليم - سيتم احتساب الفرق',
  },
  {
    id: 'calculate_excess_km',
    title: '🚗 حساب الكيلومترات الزائدة',
    description: 'إذا تجاوز العميل الحد المسموح',
    type: 'auto',
    required: false,
    completed: false,
    condition: (data) => {
      const allowed = data?.allowed_km || Infinity;
      const actual = (data?.return_odometer || 0) - (data?.delivery_odometer || 0);
      return actual > allowed;
    },
    warningMessage: 'تجاوز العميل الكيلومترات المسموحة',
  },
  {
    id: 'calculate_late_fee',
    title: '⏰ حساب غرامة التأخير',
    description: 'إذا تأخر العميل عن موعد الإرجاع',
    type: 'auto',
    required: false,
    completed: false,
    condition: (data) => {
      if (!data?.contract?.end_date) return false;
      return new Date() > new Date(data.contract.end_date);
    },
    warningMessage: 'سيتم احتساب غرامة تأخير',
  },
  {
    id: 'calculate_damage_cost',
    title: '🔧 تقدير تكلفة الأضرار',
    description: 'تقدير تكلفة إصلاح أي أضرار جديدة',
    type: 'manual',
    required: false,
    completed: false,
    condition: (data) => data?.has_damages === true,
  },
  {
    id: 'review_total_dues',
    title: '💰 مراجعة إجمالي المستحقات',
    description: 'المبلغ النهائي المستحق أو المسترد',
    type: 'manual',
    required: true,
    completed: false,
  },
];

// المرحلة 5: استلام/رد المبالغ
const paymentSettlementChecks: WorkflowCheck[] = [
  {
    id: 'settle_dues',
    title: '💵 تسوية المستحقات',
    description: 'استلام المبلغ المستحق أو رد الفائض للعميل',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'return_deposit',
    title: '💳 رد مبلغ التأمين',
    description: 'رد التأمين بعد خصم الأضرار إن وجدت',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => (data?.deposit_amount || 0) > 0,
  },
  {
    id: 'issue_settlement_receipt',
    title: '🧾 إصدار إيصال التسوية',
    description: 'طباعة إيصال بالتسوية النهائية',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'customer_sign_receipt',
    title: 'توقيع العميل على الإيصال',
    description: 'الحصول على توقيع العميل',
    type: 'manual',
    required: true,
    completed: false,
  },
];

// المرحلة 6: إنهاء العقد
const contractClosureChecks: WorkflowCheck[] = [
  {
    id: 'collect_all_keys',
    title: '🔑 استلام جميع المفاتيح',
    description: 'المفتاح الأصلي + الاحتياطي',
    type: 'manual',
    required: true,
    completed: false,
    blockingMessage: 'يجب استلام جميع المفاتيح',
  },
  {
    id: 'collect_documents',
    title: '📄 استلام المستندات',
    description: 'استمارة السيارة إن كانت مع العميل',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'sign_handover_report',
    title: '✍️ توقيع محضر الاستلام',
    description: 'توقيع العميل والموظف على محضر الإرجاع',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'update_contract_status',
    title: 'تحديث حالة العقد',
    description: 'تغيير حالة العقد إلى "مكتمل"',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => data?.contract_closed === true,
  },
  {
    id: 'update_vehicle_status',
    title: 'تحديث حالة المركبة',
    description: 'تغيير حالة المركبة إلى "متاحة"',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => data?.vehicle_available === true,
  },
  {
    id: 'send_feedback_request',
    title: '⭐ طلب تقييم من العميل',
    description: 'إرسال رابط تقييم الخدمة',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'thank_customer',
    title: '🙏 شكر العميل',
    description: 'شكر العميل على تعامله معنا',
    type: 'manual',
    required: false,
    completed: false,
  },
];

// تكوين سير عمل إعادة المركبة
export const vehicleReturnWorkflow: WorkflowConfig = {
  id: 'vehicle_return',
  title: 'إعادة المركبة',
  description: 'سير عمل استلام المركبة من العميل وإنهاء العقد',
  icon: '🔄',
  phases: [
    {
      id: 'contract_identification',
      title: 'تحديد العقد',
      icon: '📋',
      description: 'تحديد العقد والمركبة والعميل',
      checks: contractIdentificationChecks,
    },
    {
      id: 'vehicle_inspection',
      title: 'فحص المركبة',
      icon: '🔍',
      description: 'فحص شامل لحالة المركبة',
      checks: vehicleInspectionChecks,
    },
    {
      id: 'documentation',
      title: 'التوثيق',
      icon: '📷',
      description: 'توثيق الحالة والقراءات',
      checks: documentationChecks,
    },
    {
      id: 'financial_settlement',
      title: 'التسوية المالية',
      icon: '💰',
      description: 'حساب المستحقات والخصومات',
      checks: financialSettlementChecks,
    },
    {
      id: 'payment_settlement',
      title: 'الدفع والاستلام',
      icon: '💵',
      description: 'تسوية المبالغ ورد التأمين',
      checks: paymentSettlementChecks,
    },
    {
      id: 'contract_closure',
      title: 'إنهاء العقد',
      icon: '✅',
      description: 'إغلاق العقد وتحديث الحالات',
      checks: contractClosureChecks,
    },
  ],
};

export default vehicleReturnWorkflow;

