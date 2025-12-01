/**
 * سير عمل الصيانة والإصلاحات
 * Maintenance Workflow
 * يتضمن جميع التحققات المطلوبة لضمان صيانة صحيحة
 */

import type { WorkflowConfig, WorkflowCheck } from '../types';

// المرحلة 1: استلام المركبة للصيانة
const vehicleReceptionChecks: WorkflowCheck[] = [
  {
    id: 'identify_vehicle',
    title: 'تحديد المركبة',
    description: 'اختيار المركبة المطلوب صيانتها',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!(data?.vehicle_id || data?.vehicle),
    blockingMessage: 'يجب تحديد المركبة',
  },
  {
    id: 'check_vehicle_status',
    title: 'التحقق من حالة المركبة',
    description: 'التأكد من أن المركبة ليست مؤجرة حالياً',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const status = data?.vehicle?.status;
      return status !== 'rented' && status !== 'reserved';
    },
    blockingMessage: 'المركبة مؤجرة حالياً - لا يمكن إدخالها للصيانة',
  },
  {
    id: 'record_odometer',
    title: 'تسجيل قراءة العداد',
    description: 'تسجيل الكيلومترات الحالية',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => (data?.current_odometer || 0) > 0,
    blockingMessage: 'يجب إدخال قراءة العداد',
  },
  {
    id: 'record_fuel_level',
    title: 'تسجيل مستوى الوقود',
    description: 'تسجيل مستوى الوقود عند الاستلام',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'take_reception_photos',
    title: '📷 تصوير المركبة عند الاستلام',
    description: 'توثيق حالة المركبة بالصور',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'document_existing_damage',
    title: 'توثيق الأضرار الموجودة',
    description: 'تسجيل أي أضرار موجودة مسبقاً',
    type: 'manual',
    required: false,
    completed: false,
  },
];

// المرحلة 2: تشخيص المشكلة
const diagnosisChecks: WorkflowCheck[] = [
  {
    id: 'describe_problem',
    title: 'وصف المشكلة/الأعراض',
    description: 'تسجيل وصف تفصيلي للمشكلة أو الأعراض',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const desc = data?.problem_description || data?.description || '';
      return desc.length > 5;
    },
    blockingMessage: 'يجب وصف المشكلة',
  },
  {
    id: 'select_maintenance_type',
    title: 'تحديد نوع الصيانة',
    description: 'صيانة دورية / إصلاح / طوارئ',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.maintenance_type,
    blockingMessage: 'يجب تحديد نوع الصيانة',
  },
  {
    id: 'technical_inspection',
    title: '🔧 الفحص الفني',
    description: 'فحص المركبة من قبل الفني المختص',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'identify_parts_needed',
    title: 'تحديد القطع المطلوبة',
    description: 'قائمة قطع الغيار اللازمة',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'estimate_repair_time',
    title: 'تقدير وقت الإصلاح',
    description: 'المدة المتوقعة لإتمام الصيانة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.estimated_completion_date,
  },
];

// المرحلة 3: التكلفة والموافقة
const costApprovalChecks: WorkflowCheck[] = [
  {
    id: 'calculate_parts_cost',
    title: 'حساب تكلفة القطع',
    description: 'إجمالي تكلفة قطع الغيار',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => (data?.parts_cost || 0) >= 0,
  },
  {
    id: 'calculate_labor_cost',
    title: 'حساب تكلفة العمالة',
    description: 'أجور الفنيين والعمال',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => (data?.labor_cost || 0) >= 0,
  },
  {
    id: 'calculate_total_cost',
    title: '💰 إجمالي التكلفة',
    description: 'المجموع الكلي للصيانة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const total = (data?.parts_cost || 0) + (data?.labor_cost || 0);
      return total > 0;
    },
  },
  {
    id: 'manager_approval',
    title: '⚠️ موافقة المدير',
    description: 'مطلوب للتكاليف العالية',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => {
      const total = (data?.parts_cost || 0) + (data?.labor_cost || 0);
      return total > 5000; // أكثر من 5000 ر.ق
    },
    blockingMessage: 'يجب الحصول على موافقة المدير للتكاليف العالية',
  },
  {
    id: 'select_vendor',
    title: 'اختيار المورد/الورشة',
    description: 'تحديد مصدر القطع أو الورشة الخارجية',
    type: 'auto',
    required: false,
    completed: false,
    condition: (data) => data?.is_external === true,
    autoCheckFn: (data) => !!data?.vendor_id,
  },
  {
    id: 'create_work_order',
    title: '📋 إنشاء أمر عمل',
    description: 'إصدار أمر عمل رسمي',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.work_order_number,
  },
];

// المرحلة 4: تنفيذ الصيانة
const executionChecks: WorkflowCheck[] = [
  {
    id: 'assign_technician',
    title: '👷 تعيين الفني',
    description: 'تحديد الفني المسؤول عن العمل',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.technician_id || !!data?.assigned_to,
  },
  {
    id: 'start_work',
    title: '🚀 بدء العمل',
    description: 'تسجيل وقت بدء الصيانة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.start_time,
  },
  {
    id: 'parts_received',
    title: '📦 استلام القطع',
    description: 'التأكد من وصول جميع القطع المطلوبة',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => (data?.parts_cost || 0) > 0,
  },
  {
    id: 'perform_repairs',
    title: '🔧 تنفيذ الإصلاحات',
    description: 'إجراء أعمال الصيانة والإصلاح',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'quality_check',
    title: '✅ فحص الجودة',
    description: 'اختبار العمل المنجز',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'test_drive',
    title: '🚗 اختبار القيادة',
    description: 'تجربة المركبة بعد الصيانة',
    type: 'manual',
    required: false,
    completed: false,
    condition: (data) => {
      const type = data?.maintenance_type;
      return type === 'repair' || type === 'engine' || type === 'brakes';
    },
  },
];

// المرحلة 5: التوثيق والإغلاق
const closureChecks: WorkflowCheck[] = [
  {
    id: 'document_work_done',
    title: '📝 توثيق الأعمال المنفذة',
    description: 'تسجيل تفاصيل ما تم إنجازه',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const notes = data?.work_notes || data?.completion_notes || '';
      return notes.length > 5;
    },
  },
  {
    id: 'take_completion_photos',
    title: '📷 صور بعد الإنجاز',
    description: 'توثيق حالة المركبة بعد الصيانة',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'update_vehicle_record',
    title: 'تحديث سجل المركبة',
    description: 'تحديث سجل الصيانة في ملف المركبة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => data?.vehicle_record_updated === true,
  },
  {
    id: 'record_end_time',
    title: 'تسجيل وقت الانتهاء',
    description: 'تسجيل وقت إتمام الصيانة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.end_time,
  },
  {
    id: 'update_vehicle_status',
    title: 'تحديث حالة المركبة',
    description: 'تغيير الحالة إلى "متاحة"',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => data?.vehicle_available === true,
  },
  {
    id: 'create_invoice',
    title: '🧾 إنشاء فاتورة (إن وجد)',
    description: 'فاتورة للعميل إذا كانت على حسابه',
    type: 'manual',
    required: false,
    completed: false,
    condition: (data) => data?.billable_to_customer === true,
  },
  {
    id: 'schedule_next_maintenance',
    title: '📅 جدولة الصيانة القادمة',
    description: 'تحديد موعد الصيانة الدورية القادمة',
    type: 'manual',
    required: false,
    completed: false,
    condition: (data) => data?.maintenance_type === 'periodic',
  },
];

// تكوين سير عمل الصيانة
export const maintenanceWorkflow: WorkflowConfig = {
  id: 'maintenance',
  title: 'صيانة المركبة',
  description: 'سير عمل صيانة وإصلاح المركبات',
  icon: '🔧',
  phases: [
    {
      id: 'vehicle_reception',
      title: 'استلام المركبة',
      icon: '🚗',
      description: 'استلام وتوثيق حالة المركبة',
      checks: vehicleReceptionChecks,
    },
    {
      id: 'diagnosis',
      title: 'التشخيص',
      icon: '🔍',
      description: 'فحص وتحديد المشكلة',
      checks: diagnosisChecks,
    },
    {
      id: 'cost_approval',
      title: 'التكلفة والموافقة',
      icon: '💰',
      description: 'تقدير التكلفة والحصول على الموافقة',
      checks: costApprovalChecks,
    },
    {
      id: 'execution',
      title: 'تنفيذ الصيانة',
      icon: '🔧',
      description: 'تنفيذ أعمال الصيانة',
      checks: executionChecks,
    },
    {
      id: 'closure',
      title: 'التوثيق والإغلاق',
      icon: '✅',
      description: 'توثيق العمل وإغلاق الطلب',
      checks: closureChecks,
    },
  ],
};

export default maintenanceWorkflow;

