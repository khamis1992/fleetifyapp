/**
 * سير عمل الحجوزات
 * Reservation Workflow
 * يتضمن جميع التحققات المطلوبة لضمان حجز صحيح
 */

import type { WorkflowConfig, WorkflowCheck } from '../types';

// المرحلة 1: بيانات العميل
const customerDataChecks: WorkflowCheck[] = [
  {
    id: 'identify_customer',
    title: 'تحديد العميل',
    description: 'اختيار عميل موجود أو إضافة جديد',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!(data?.customer_id || data?.customer),
    blockingMessage: 'يجب تحديد العميل',
  },
  {
    id: 'verify_customer_phone',
    title: 'التحقق من رقم الهاتف',
    description: 'التأكد من وجود رقم هاتف للتواصل',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const phone = data?.customer?.phone || data?.phone || '';
      return phone.length >= 8;
    },
    blockingMessage: 'يجب توفير رقم هاتف صالح',
  },
  {
    id: 'check_customer_history',
    title: 'مراجعة سجل العميل',
    description: 'التحقق من سجل العميل السابق',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => {
      return data?.customer?.status !== 'blacklisted';
    },
    blockingMessage: '⛔ العميل في القائمة السوداء',
  },
  {
    id: 'check_outstanding_balance',
    title: 'التحقق من المستحقات',
    description: 'هل العميل لديه ديون سابقة؟',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => {
      const balance = data?.customer?.outstanding_balance || 0;
      return balance <= 0;
    },
    warningMessage: '⚠️ العميل لديه مستحقات سابقة',
  },
];

// المرحلة 2: تفاصيل الحجز
const reservationDetailsChecks: WorkflowCheck[] = [
  {
    id: 'select_pickup_date',
    title: 'تحديد تاريخ الاستلام',
    description: 'موعد استلام المركبة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.pickup_date,
    blockingMessage: 'يجب تحديد تاريخ الاستلام',
  },
  {
    id: 'pickup_date_valid',
    title: 'تاريخ الاستلام صالح',
    description: 'التاريخ يجب أن يكون في المستقبل',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.pickup_date) return false;
      const pickup = new Date(data.pickup_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return pickup >= today;
    },
    blockingMessage: 'تاريخ الاستلام يجب أن يكون اليوم أو في المستقبل',
  },
  {
    id: 'select_return_date',
    title: 'تحديد تاريخ الإرجاع',
    description: 'موعد إرجاع المركبة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.return_date,
    blockingMessage: 'يجب تحديد تاريخ الإرجاع',
  },
  {
    id: 'return_after_pickup',
    title: 'تاريخ الإرجاع بعد الاستلام',
    description: 'التأكد من صحة التواريخ',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.pickup_date || !data?.return_date) return false;
      return new Date(data.return_date) > new Date(data.pickup_date);
    },
    blockingMessage: 'تاريخ الإرجاع يجب أن يكون بعد تاريخ الاستلام',
  },
  {
    id: 'select_pickup_location',
    title: 'مكان الاستلام',
    description: 'تحديد موقع استلام المركبة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.pickup_location,
  },
  {
    id: 'select_return_location',
    title: 'مكان الإرجاع',
    description: 'تحديد موقع إرجاع المركبة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.return_location,
  },
];

// المرحلة 3: اختيار المركبة
const vehicleSelectionChecks: WorkflowCheck[] = [
  {
    id: 'select_vehicle_type',
    title: 'تحديد نوع المركبة',
    description: 'الفئة أو النوع المطلوب',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!(data?.vehicle_type || data?.vehicle_category || data?.vehicle_id),
  },
  {
    id: 'check_availability',
    title: '🔍 التحقق من التوفر',
    description: 'التأكد من وجود مركبات متاحة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const available = data?.available_vehicles || [];
      return available.length > 0 || !!data?.vehicle_id;
    },
    blockingMessage: 'لا توجد مركبات متاحة في هذه الفترة',
  },
  {
    id: 'select_specific_vehicle',
    title: 'اختيار مركبة محددة',
    description: 'تحديد المركبة المخصصة للحجز',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.vehicle_id,
    blockingMessage: 'يجب اختيار مركبة',
  },
  {
    id: 'verify_vehicle_status',
    title: 'التحقق من حالة المركبة',
    description: 'التأكد من أن المركبة متاحة وجاهزة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const status = data?.vehicle?.status;
      return status === 'available';
    },
    blockingMessage: 'المركبة غير متاحة',
  },
  {
    id: 'check_vehicle_documents',
    title: 'صلاحية مستندات المركبة',
    description: 'التأمين والاستمارة سارية',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const vehicle = data?.vehicle;
      if (!vehicle) return false;
      
      const today = new Date();
      const insuranceValid = !vehicle.insurance_expiry || new Date(vehicle.insurance_expiry) > today;
      const registrationValid = !vehicle.registration_expiry || new Date(vehicle.registration_expiry) > today;
      
      return insuranceValid && registrationValid;
    },
    warningMessage: 'مستندات المركبة قريبة الانتهاء',
  },
];

// المرحلة 4: التسعير والتأكيد
const pricingConfirmationChecks: WorkflowCheck[] = [
  {
    id: 'calculate_rental_days',
    title: 'حساب أيام الإيجار',
    description: 'عدد أيام الحجز',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => (data?.rental_days || 0) > 0,
  },
  {
    id: 'apply_daily_rate',
    title: 'تطبيق السعر اليومي',
    description: 'السعر اليومي للمركبة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => (data?.daily_rate || 0) > 0,
  },
  {
    id: 'calculate_total',
    title: '💰 حساب الإجمالي',
    description: 'إجمالي قيمة الحجز',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => (data?.total_amount || 0) > 0,
  },
  {
    id: 'apply_discount',
    title: 'تطبيق الخصم (إن وجد)',
    description: 'خصومات خاصة أو عروض',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => (data?.discount_amount || 0) >= 0,
  },
  {
    id: 'confirm_price_with_customer',
    title: '✅ تأكيد السعر مع العميل',
    description: 'موافقة العميل على التكلفة',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'collect_deposit',
    title: '💳 استلام العربون/التأمين',
    description: 'دفعة مقدمة لتأكيد الحجز',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.requires_deposit !== false,
  },
];

// المرحلة 5: تأكيد الحجز
const bookingConfirmationChecks: WorkflowCheck[] = [
  {
    id: 'review_reservation',
    title: '📋 مراجعة تفاصيل الحجز',
    description: 'مراجعة جميع البيانات قبل التأكيد',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'create_reservation',
    title: '💾 إنشاء الحجز',
    description: 'حفظ الحجز في النظام',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.reservation_id || data?.reservation_saved === true,
    successMessage: '✅ تم إنشاء الحجز بنجاح',
  },
  {
    id: 'block_vehicle',
    title: '🔒 حجز المركبة',
    description: 'تغيير حالة المركبة إلى "محجوزة"',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => data?.vehicle_blocked === true,
  },
  {
    id: 'generate_confirmation_number',
    title: 'إصدار رقم التأكيد',
    description: 'رقم مرجعي للحجز',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.confirmation_number,
  },
  {
    id: 'send_confirmation',
    title: '📱 إرسال تأكيد للعميل',
    description: 'رسالة واتساب/SMS بتفاصيل الحجز',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'add_to_calendar',
    title: '📅 إضافة للتقويم',
    description: 'جدولة موعد الاستلام',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'print_confirmation',
    title: '🖨️ طباعة تأكيد الحجز',
    description: 'نسخة ورقية للعميل',
    type: 'manual',
    required: false,
    completed: false,
  },
];

// تكوين سير عمل الحجوزات
export const reservationWorkflow: WorkflowConfig = {
  id: 'reservation',
  title: 'حجز مركبة',
  description: 'سير عمل إنشاء حجز جديد للعميل',
  icon: '📅',
  phases: [
    {
      id: 'customer_data',
      title: 'بيانات العميل',
      icon: '👤',
      description: 'تحديد والتحقق من العميل',
      checks: customerDataChecks,
    },
    {
      id: 'reservation_details',
      title: 'تفاصيل الحجز',
      icon: '📋',
      description: 'تواريخ ومواقع الاستلام والإرجاع',
      checks: reservationDetailsChecks,
    },
    {
      id: 'vehicle_selection',
      title: 'اختيار المركبة',
      icon: '🚗',
      description: 'اختيار وتأكيد المركبة',
      checks: vehicleSelectionChecks,
    },
    {
      id: 'pricing_confirmation',
      title: 'التسعير والتأكيد',
      icon: '💰',
      description: 'حساب التكلفة واستلام العربون',
      checks: pricingConfirmationChecks,
    },
    {
      id: 'booking_confirmation',
      title: 'تأكيد الحجز',
      icon: '✅',
      description: 'إتمام وتأكيد الحجز',
      checks: bookingConfirmationChecks,
    },
  ],
};

export default reservationWorkflow;

