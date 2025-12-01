/**
 * سير عمل إضافة مركبة جديدة
 * New Vehicle Workflow
 * يتضمن جميع التحققات المطلوبة لتسجيل مركبة جديدة في الأسطول
 */

import type { WorkflowConfig, WorkflowCheck } from '../types';

// المرحلة 1: البيانات الأساسية
const basicDataChecks: WorkflowCheck[] = [
  {
    id: 'plate_number',
    title: 'رقم اللوحة',
    description: 'إدخال رقم لوحة المركبة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const plate = data?.plate_number || '';
      return plate.length >= 3;
    },
    blockingMessage: 'يجب إدخال رقم اللوحة',
  },
  {
    id: 'check_plate_unique',
    title: 'التحقق من تفرد اللوحة',
    description: 'التأكد من عدم وجود مركبة بنفس اللوحة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => data?.plate_unique !== false,
    blockingMessage: 'رقم اللوحة موجود مسبقاً في النظام',
  },
  {
    id: 'make',
    title: 'الشركة المصنعة',
    description: 'ماركة المركبة (تويوتا، نيسان، إلخ)',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.make,
    blockingMessage: 'يجب تحديد الشركة المصنعة',
  },
  {
    id: 'model',
    title: 'الموديل',
    description: 'موديل المركبة (كامري، صني، إلخ)',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.model,
    blockingMessage: 'يجب تحديد الموديل',
  },
  {
    id: 'year',
    title: 'سنة الصنع',
    description: 'سنة تصنيع المركبة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const year = data?.year;
      return year && year >= 1990 && year <= new Date().getFullYear() + 1;
    },
    blockingMessage: 'يجب إدخال سنة صنع صحيحة',
  },
  {
    id: 'color',
    title: 'اللون',
    description: 'لون المركبة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.color,
    blockingMessage: 'يجب تحديد لون المركبة',
  },
  {
    id: 'vehicle_type',
    title: 'نوع المركبة',
    description: 'سيدان، SUV، شاحنة صغيرة، إلخ',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.vehicle_type,
    blockingMessage: 'يجب تحديد نوع المركبة',
  },
];

// المرحلة 2: بيانات التعريف
const identificationDataChecks: WorkflowCheck[] = [
  {
    id: 'vin',
    title: 'رقم الهيكل (VIN)',
    description: 'رقم تعريف المركبة الفريد',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const vin = data?.vin || '';
      return vin.length === 17; // VIN يتكون من 17 حرف/رقم
    },
    blockingMessage: 'رقم الهيكل يجب أن يكون 17 خانة',
  },
  {
    id: 'check_vin_unique',
    title: 'التحقق من تفرد رقم الهيكل',
    description: 'التأكد من عدم تكرار رقم الهيكل',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => data?.vin_unique !== false,
    blockingMessage: 'رقم الهيكل موجود مسبقاً',
  },
  {
    id: 'engine_number',
    title: 'رقم المحرك',
    description: 'رقم المحرك الخاص بالمركبة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.engine_number,
  },
  {
    id: 'fuel_type',
    title: 'نوع الوقود',
    description: 'بنزين، ديزل، كهرباء، هايبرد',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.fuel_type,
    blockingMessage: 'يجب تحديد نوع الوقود',
  },
  {
    id: 'transmission',
    title: 'نوع ناقل الحركة',
    description: 'أوتوماتيك أو يدوي',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.transmission,
  },
  {
    id: 'seating_capacity',
    title: 'عدد المقاعد',
    description: 'سعة الركاب',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => (data?.seating_capacity || 0) > 0,
  },
];

// المرحلة 3: المستندات والتراخيص
const documentsChecks: WorkflowCheck[] = [
  {
    id: 'registration_number',
    title: 'رقم الاستمارة',
    description: 'رقم استمارة تسجيل المركبة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.registration_number,
    blockingMessage: 'يجب إدخال رقم الاستمارة',
  },
  {
    id: 'registration_expiry',
    title: 'تاريخ انتهاء الاستمارة',
    description: 'تاريخ انتهاء صلاحية التسجيل',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.registration_expiry) return false;
      return new Date(data.registration_expiry) > new Date();
    },
    blockingMessage: 'الاستمارة منتهية الصلاحية',
  },
  {
    id: 'upload_registration',
    title: '📄 رفع صورة الاستمارة',
    description: 'صورة من استمارة التسجيل',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'insurance_company',
    title: 'شركة التأمين',
    description: 'اسم شركة التأمين',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.insurance_company,
    blockingMessage: 'يجب تحديد شركة التأمين',
  },
  {
    id: 'insurance_policy',
    title: 'رقم وثيقة التأمين',
    description: 'رقم بوليصة التأمين',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.insurance_policy,
    blockingMessage: 'يجب إدخال رقم وثيقة التأمين',
  },
  {
    id: 'insurance_expiry',
    title: 'تاريخ انتهاء التأمين',
    description: 'تاريخ انتهاء صلاحية التأمين',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.insurance_expiry) return false;
      return new Date(data.insurance_expiry) > new Date();
    },
    blockingMessage: 'التأمين منتهي الصلاحية',
  },
  {
    id: 'upload_insurance',
    title: '📄 رفع صورة التأمين',
    description: 'صورة من وثيقة التأمين',
    type: 'manual',
    required: true,
    completed: false,
  },
];

// المرحلة 4: البيانات المالية
const financialDataChecks: WorkflowCheck[] = [
  {
    id: 'purchase_price',
    title: 'سعر الشراء',
    description: 'تكلفة شراء المركبة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => (data?.purchase_price || 0) >= 0,
  },
  {
    id: 'purchase_date',
    title: 'تاريخ الشراء',
    description: 'تاريخ شراء المركبة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.purchase_date,
  },
  {
    id: 'daily_rate',
    title: 'السعر اليومي',
    description: 'سعر الإيجار اليومي',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => (data?.daily_rate || 0) > 0,
    blockingMessage: 'يجب تحديد السعر اليومي',
  },
  {
    id: 'weekly_rate',
    title: 'السعر الأسبوعي',
    description: 'سعر الإيجار الأسبوعي',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => (data?.weekly_rate || 0) >= 0,
  },
  {
    id: 'monthly_rate',
    title: 'السعر الشهري',
    description: 'سعر الإيجار الشهري',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => (data?.monthly_rate || 0) >= 0,
  },
  {
    id: 'deposit_amount',
    title: 'مبلغ التأمين',
    description: 'مبلغ التأمين المطلوب عند الإيجار',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => (data?.deposit_amount || 0) >= 0,
  },
];

// المرحلة 5: الحالة والصيانة
const statusMaintenanceChecks: WorkflowCheck[] = [
  {
    id: 'current_mileage',
    title: 'قراءة العداد الحالية',
    description: 'الكيلومترات الحالية للمركبة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => (data?.current_mileage || 0) >= 0,
    blockingMessage: 'يجب إدخال قراءة العداد',
  },
  {
    id: 'last_maintenance_date',
    title: 'تاريخ آخر صيانة',
    description: 'تاريخ آخر صيانة تمت للمركبة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.last_maintenance_date,
  },
  {
    id: 'next_maintenance_mileage',
    title: 'عداد الصيانة القادمة',
    description: 'الكيلومترات لموعد الصيانة القادمة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => (data?.next_maintenance_mileage || 0) > 0,
  },
  {
    id: 'initial_inspection',
    title: '🔍 الفحص الأولي',
    description: 'فحص المركبة قبل إدخالها للخدمة',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'take_photos',
    title: '📷 تصوير المركبة',
    description: 'التقاط صور للمركبة من جميع الجوانب',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'set_initial_status',
    title: 'تحديد الحالة الأولية',
    description: 'متاحة أو تحتاج صيانة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.status,
    blockingMessage: 'يجب تحديد حالة المركبة',
  },
];

// المرحلة 6: المراجعة والحفظ
const reviewSaveChecks: WorkflowCheck[] = [
  {
    id: 'review_data',
    title: '📋 مراجعة البيانات',
    description: 'مراجعة جميع البيانات قبل الحفظ',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'save_vehicle',
    title: '💾 حفظ المركبة',
    description: 'حفظ بيانات المركبة في النظام',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.vehicle_id || data?.saved === true,
    successMessage: '✅ تم حفظ المركبة بنجاح',
  },
  {
    id: 'generate_qr_code',
    title: 'إنشاء رمز QR',
    description: 'إنشاء رمز QR للمركبة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.qr_code,
  },
  {
    id: 'add_to_fleet',
    title: '🚗 إضافة للأسطول',
    description: 'إضافة المركبة للأسطول النشط',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => data?.added_to_fleet === true,
  },
  {
    id: 'create_maintenance_schedule',
    title: '📅 جدولة الصيانة',
    description: 'إنشاء جدول الصيانة الدورية',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'print_vehicle_card',
    title: '🖨️ طباعة بطاقة المركبة',
    description: 'طباعة بطاقة بيانات المركبة',
    type: 'manual',
    required: false,
    completed: false,
  },
];

// تكوين سير عمل إضافة مركبة
export const newVehicleWorkflow: WorkflowConfig = {
  id: 'new_vehicle',
  title: 'إضافة مركبة جديدة',
  description: 'سير عمل تسجيل مركبة جديدة في الأسطول',
  icon: '🚗',
  phases: [
    {
      id: 'basic_data',
      title: 'البيانات الأساسية',
      icon: '📝',
      description: 'المعلومات الأساسية للمركبة',
      checks: basicDataChecks,
    },
    {
      id: 'identification_data',
      title: 'بيانات التعريف',
      icon: '🔢',
      description: 'أرقام التعريف والمواصفات',
      checks: identificationDataChecks,
    },
    {
      id: 'documents',
      title: 'المستندات والتراخيص',
      icon: '📄',
      description: 'الاستمارة والتأمين',
      checks: documentsChecks,
    },
    {
      id: 'financial_data',
      title: 'البيانات المالية',
      icon: '💰',
      description: 'أسعار الإيجار والتكاليف',
      checks: financialDataChecks,
    },
    {
      id: 'status_maintenance',
      title: 'الحالة والصيانة',
      icon: '🔧',
      description: 'العداد والفحص الأولي',
      checks: statusMaintenanceChecks,
    },
    {
      id: 'review_save',
      title: 'المراجعة والحفظ',
      icon: '✅',
      description: 'مراجعة وحفظ المركبة',
      checks: reviewSaveChecks,
    },
  ],
};

export default newVehicleWorkflow;

