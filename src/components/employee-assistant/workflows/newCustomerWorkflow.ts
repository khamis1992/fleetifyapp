/**
 * سير عمل إضافة عميل جديد
 * New Customer Workflow
 * يتضمن جميع التحققات المطلوبة لضمان إضافة عميل صحيحة
 */

import type { WorkflowConfig, WorkflowCheck } from '../types';

// المرحلة 1: البيانات الأساسية
const basicDataChecks: WorkflowCheck[] = [
  {
    id: 'enter_full_name',
    title: 'إدخال الاسم الكامل',
    description: 'الاسم الثلاثي أو الرباعي',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const name = data?.full_name || data?.first_name || '';
      return name.length >= 2;
    },
    blockingMessage: 'يجب إدخال اسم العميل',
  },
  {
    id: 'enter_phone',
    title: 'إدخال رقم الهاتف',
    description: 'رقم هاتف صالح للتواصل',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const phone = data?.phone || '';
      return phone.length >= 8;
    },
    blockingMessage: 'يجب إدخال رقم هاتف صحيح',
  },
  {
    id: 'enter_national_id',
    title: 'إدخال الرقم الشخصي/الإقامة',
    description: 'رقم الهوية أو الإقامة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const id = data?.national_id || '';
      return id.length >= 5;
    },
    blockingMessage: 'يجب إدخال رقم الهوية',
  },
  {
    id: 'check_duplicate',
    title: 'التحقق من عدم التكرار',
    description: 'التأكد من أن العميل غير مسجل مسبقاً',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => data?.is_duplicate !== true,
    blockingMessage: '⚠️ العميل مسجل مسبقاً بهذا الرقم',
  },
  {
    id: 'enter_email',
    title: 'إدخال البريد الإلكتروني',
    description: 'بريد إلكتروني صالح (اختياري)',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.email) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
    },
    warningMessage: 'البريد الإلكتروني غير صالح',
  },
];

// المرحلة 2: التحقق من المستندات
const documentVerificationChecks: WorkflowCheck[] = [
  {
    id: 'receive_id_copy',
    title: '🆔 استلام نسخة الهوية',
    description: 'صورة واضحة من الوجهين',
    type: 'manual',
    required: true,
    completed: false,
    blockingMessage: 'يجب الحصول على صورة الهوية',
  },
  {
    id: 'verify_id_validity',
    title: 'التحقق من صلاحية الهوية',
    description: 'التأكد من أن الهوية غير منتهية',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.id_expiry_date) return true; // لم يتم إدخالها بعد
      return new Date(data.id_expiry_date) > new Date();
    },
    blockingMessage: '⛔ الهوية منتهية الصلاحية',
  },
  {
    id: 'match_name_with_id',
    title: 'مطابقة الاسم مع الهوية',
    description: 'التأكد من تطابق الاسم المدخل مع الهوية',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'receive_license',
    title: '🚗 استلام رخصة القيادة',
    description: 'صورة واضحة من الوجهين',
    type: 'manual',
    required: true,
    completed: false,
    blockingMessage: 'يجب الحصول على صورة رخصة القيادة',
  },
  {
    id: 'verify_license_validity',
    title: 'التحقق من صلاحية الرخصة',
    description: 'التأكد من أن الرخصة غير منتهية',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.license_expiry_date) return true;
      return new Date(data.license_expiry_date) > new Date();
    },
    blockingMessage: '⛔ رخصة القيادة منتهية',
  },
  {
    id: 'verify_license_type',
    title: 'التحقق من نوع الرخصة',
    description: 'التأكد من أن الرخصة تسمح بقيادة السيارات',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'international_license',
    title: '🌍 رخصة دولية (للأجانب)',
    description: 'مطلوبة إذا كانت الرخصة أجنبية',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.is_foreign_license === true,
  },
];

// المرحلة 3: التوثيق والرفع
const uploadDocumentsChecks: WorkflowCheck[] = [
  {
    id: 'upload_id_front',
    title: '📤 رفع صورة الهوية (الوجه)',
    description: 'رفع الصورة الأمامية للهوية',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.id_front_uploaded,
    blockingMessage: 'يجب رفع صورة الهوية',
  },
  {
    id: 'upload_id_back',
    title: '📤 رفع صورة الهوية (الخلف)',
    description: 'رفع الصورة الخلفية للهوية',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.id_back_uploaded,
  },
  {
    id: 'upload_license_front',
    title: '📤 رفع صورة الرخصة (الوجه)',
    description: 'رفع الصورة الأمامية للرخصة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.license_front_uploaded,
    blockingMessage: 'يجب رفع صورة الرخصة',
  },
  {
    id: 'upload_license_back',
    title: '📤 رفع صورة الرخصة (الخلف)',
    description: 'رفع الصورة الخلفية للرخصة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.license_back_uploaded,
  },
  {
    id: 'upload_customer_photo',
    title: '📷 صورة شخصية للعميل',
    description: 'التقاط صورة للعميل للتوثيق',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'enter_address',
    title: '🏠 إدخال العنوان',
    description: 'عنوان السكن الحالي',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.address,
  },
  {
    id: 'enter_emergency_contact',
    title: '📞 رقم طوارئ',
    description: 'رقم للتواصل في الحالات الطارئة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => !!data?.emergency_contact,
  },
];

// المرحلة 4: التأكيد والحفظ
const confirmationChecks: WorkflowCheck[] = [
  {
    id: 'review_entered_data',
    title: '📋 مراجعة البيانات المدخلة',
    description: 'التأكد من صحة جميع البيانات',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'customer_consent',
    title: '✅ موافقة العميل على الشروط',
    description: 'توقيع العميل على شروط الخدمة',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'save_customer',
    title: '💾 حفظ بيانات العميل',
    description: 'حفظ البيانات في النظام',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => !!data?.customer_saved,
    successMessage: '✅ تم حفظ بيانات العميل بنجاح',
  },
  {
    id: 'send_welcome_message',
    title: '📱 إرسال رسالة ترحيب',
    description: 'إرسال رسالة ترحيب عبر واتساب/SMS',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'give_customer_card',
    title: '🎴 تسليم بطاقة العميل',
    description: 'إعطاء العميل بطاقة الولاء أو رقم العميل',
    type: 'manual',
    required: false,
    completed: false,
  },
];

// تكوين سير عمل إضافة عميل جديد
export const newCustomerWorkflow: WorkflowConfig = {
  id: 'new_customer',
  title: 'إضافة عميل جديد',
  description: 'سير عمل تسجيل عميل جديد مع التحقق من المستندات',
  icon: '👤',
  phases: [
    {
      id: 'basic_data',
      title: 'البيانات الأساسية',
      icon: '📝',
      description: 'إدخال المعلومات الشخصية الأساسية',
      checks: basicDataChecks,
    },
    {
      id: 'document_verification',
      title: 'التحقق من المستندات',
      icon: '🆔',
      description: 'فحص والتحقق من الوثائق الرسمية',
      checks: documentVerificationChecks,
    },
    {
      id: 'upload_documents',
      title: 'التوثيق والرفع',
      icon: '📤',
      description: 'رفع صور المستندات والبيانات الإضافية',
      checks: uploadDocumentsChecks,
    },
    {
      id: 'confirmation',
      title: 'التأكيد والحفظ',
      icon: '✅',
      description: 'مراجعة وحفظ بيانات العميل',
      checks: confirmationChecks,
    },
  ],
};

export default newCustomerWorkflow;

