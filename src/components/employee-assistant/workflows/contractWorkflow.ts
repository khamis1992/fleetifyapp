/**
 * سير عمل إنشاء العقود
 * Contract Creation Workflow
 * يتضمن جميع التحققات المطلوبة لضمان إنشاء عقد صحيح
 */

import type { WorkflowConfig, WorkflowCheck } from '../types';

// التحققات المتعلقة بالعميل
const customerVerificationChecks: WorkflowCheck[] = [
  {
    id: 'verify_customer_identity',
    title: 'التحقق من هوية العميل',
    description: 'تأكد من مطابقة الهوية للشخص الموجود أمامك',
    type: 'manual',
    required: true,
    completed: false,
    blockingMessage: 'يجب التحقق من هوية العميل قبل المتابعة',
  },
  {
    id: 'check_id_validity',
    title: 'صلاحية الهوية/الإقامة',
    description: 'التحقق من أن الهوية سارية المفعول',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.customer?.id_expiry_date) return false;
      return new Date(data.customer.id_expiry_date) > new Date();
    },
    blockingMessage: 'هوية العميل منتهية الصلاحية',
  },
  {
    id: 'check_license_validity',
    title: 'صلاحية رخصة القيادة',
    description: 'التحقق من أن رخصة القيادة سارية',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.customer?.license_expiry_date) return false;
      return new Date(data.customer.license_expiry_date) > new Date();
    },
    blockingMessage: 'رخصة قيادة العميل منتهية',
  },
  {
    id: 'check_license_type',
    title: 'نوع رخصة القيادة مناسب',
    description: 'التأكد من أن الرخصة تسمح بقيادة هذا النوع من السيارات',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'check_outstanding_balance',
    title: 'لا توجد مستحقات سابقة',
    description: 'التحقق من عدم وجود ديون على العميل',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      const balance = data?.customer?.outstanding_balance || 0;
      return balance <= 0;
    },
    warningMessage: 'العميل لديه مستحقات سابقة غير مسددة',
  },
  {
    id: 'check_blacklist',
    title: 'العميل ليس في القائمة السوداء',
    description: 'التأكد من أن العميل غير محظور',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      return data?.customer?.status !== 'blacklisted';
    },
    blockingMessage: 'العميل في القائمة السوداء - لا يمكن المتابعة',
  },
];

// التحققات المتعلقة بالسيارة
const vehicleVerificationChecks: WorkflowCheck[] = [
  {
    id: 'check_vehicle_availability',
    title: 'السيارة متاحة',
    description: 'التأكد من أن السيارة ليست محجوزة أو في صيانة',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      return data?.vehicle?.status === 'available';
    },
    blockingMessage: 'السيارة غير متاحة حالياً',
  },
  {
    id: 'check_vehicle_registration',
    title: 'صلاحية استمارة السيارة',
    description: 'التحقق من أن استمارة السيارة سارية',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.vehicle?.registration_expiry) return false;
      return new Date(data.vehicle.registration_expiry) > new Date();
    },
    warningMessage: 'استمارة السيارة قريبة الانتهاء أو منتهية',
  },
  {
    id: 'check_vehicle_insurance',
    title: 'صلاحية تأمين السيارة',
    description: 'التحقق من أن تأمين السيارة ساري',
    type: 'auto',
    required: true,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.vehicle?.insurance_expiry) return false;
      return new Date(data.vehicle.insurance_expiry) > new Date();
    },
    blockingMessage: 'تأمين السيارة منتهي - لا يمكن التأجير',
  },
  {
    id: 'check_vehicle_maintenance',
    title: 'حالة الصيانة',
    description: 'التأكد من أن السيارة لا تحتاج صيانة عاجلة',
    type: 'auto',
    required: false,
    completed: false,
    autoCheckFn: (data) => {
      if (!data?.vehicle?.last_maintenance_date) return true;
      const lastMaintenance = new Date(data.vehicle.last_maintenance_date);
      const monthsAgo = (new Date().getTime() - lastMaintenance.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsAgo < 6;
    },
    warningMessage: 'السيارة تحتاج صيانة - آخر صيانة كانت قبل أكثر من 6 أشهر',
  },
];

// التحققات المالية
const financialChecks: WorkflowCheck[] = [
  {
    id: 'verify_price',
    title: 'مراجعة السعر',
    description: 'التأكد من أن السعر مناسب ومطابق للتسعيرة',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'collect_deposit',
    title: '⚠️ استلام مبلغ التأمين',
    description: 'يجب استلام مبلغ التأمين كاملاً قبل تسليم السيارة',
    type: 'manual',
    required: true,
    completed: false,
    blockingMessage: '⛔ لا يمكن إتمام العقد بدون استلام مبلغ التأمين',
  },
  {
    id: 'collect_advance',
    title: 'استلام الإيجار المقدم',
    description: 'استلام الدفعة الأولى من الإيجار',
    type: 'manual',
    required: false,
    completed: false,
  },
  // تحققات الشيك - تظهر فقط إذا كانت طريقة الدفع شيك
  {
    id: 'cheque_name_match',
    title: 'اسم الشيك مطابق للعميل',
    description: 'التأكد من أن الاسم على الشيك = اسم العميل',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cheque',
  },
  {
    id: 'cheque_date_valid',
    title: 'تاريخ الشيك صحيح',
    description: 'التأكد من أن تاريخ الشيك مناسب',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cheque',
  },
  {
    id: 'cheque_signature_match',
    title: 'توقيع الشيك مطابق للهوية',
    description: 'مقارنة التوقيع على الشيك مع التوقيع في الهوية',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cheque',
  },
  {
    id: 'cheque_bank_approved',
    title: 'البنك معتمد',
    description: 'التأكد من أن البنك من البنوك المقبولة',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cheque',
  },
  {
    id: 'cheque_amount_match',
    title: 'المبلغ بالأرقام = بالحروف',
    description: 'التأكد من تطابق المبلغ',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cheque',
  },
  {
    id: 'cheque_photo',
    title: 'تصوير الشيك (وجهين)',
    description: 'التقاط صورة واضحة للشيك من الأمام والخلف',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'cheque',
  },
  // تحققات التحويل
  {
    id: 'transfer_confirmed',
    title: 'التأكد من وصول التحويل',
    description: 'التحقق من وصول المبلغ للحساب البنكي',
    type: 'manual',
    required: true,
    completed: false,
    condition: (data) => data?.payment_method === 'transfer',
  },
  {
    id: 'issue_receipt',
    title: 'إصدار إيصال استلام',
    description: 'إصدار إيصال رسمي بالمبالغ المستلمة',
    type: 'manual',
    required: true,
    completed: false,
  },
];

// تحققات توقيع العقد
const contractSigningChecks: WorkflowCheck[] = [
  {
    id: 'print_full_contract',
    title: 'طباعة العقد كاملاً',
    description: 'طباعة جميع صفحات العقد والملاحق',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'customer_sign_all_pages',
    title: 'توقيع العميل على جميع الصفحات',
    description: 'التأكد من توقيع العميل على كل صفحة',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'customer_fingerprint',
    title: '👆 أخذ بصمة العميل',
    description: 'الحصول على بصمة إصبع العميل على العقد',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'company_stamp',
    title: 'ختم الشركة',
    description: 'وضع ختم الشركة الرسمي على العقد',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'give_customer_copy',
    title: 'تسليم نسخة للعميل',
    description: 'تسليم العميل نسخته من العقد',
    type: 'manual',
    required: true,
    completed: false,
  },
];

// تحققات تسليم السيارة
const vehicleHandoverChecks: WorkflowCheck[] = [
  {
    id: 'take_vehicle_photos',
    title: '📷 توثيق حالة السيارة بالصور',
    description: '8 صور على الأقل: أمامية، خلفية، جوانب، داخلية، عداد',
    type: 'manual',
    required: true,
    completed: false,
    blockingMessage: 'يجب توثيق حالة السيارة بالصور قبل التسليم',
  },
  {
    id: 'record_odometer',
    title: 'تسجيل قراءة العداد',
    description: 'تسجيل قراءة عداد الكيلومترات الحالية',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'record_fuel_level',
    title: 'تسجيل مستوى الوقود',
    description: 'تسجيل مستوى الوقود الحالي (ممتلئ/نصف/ربع)',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'check_documents_in_vehicle',
    title: 'التأكد من وجود المستندات بالسيارة',
    description: 'استمارة السيارة، بطاقة التأمين، دليل المستخدم',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'check_accessories',
    title: 'فحص الملحقات',
    description: 'طفاية حريق، مثلث، إطار احتياطي، عدة',
    type: 'manual',
    required: false,
    completed: false,
  },
  {
    id: 'give_one_key_only',
    title: 'تسليم مفتاح واحد فقط',
    description: 'تسليم مفتاح واحد والاحتفاظ بالمفتاح الاحتياطي',
    type: 'manual',
    required: true,
    completed: false,
  },
  {
    id: 'explain_contact_method',
    title: 'شرح طريقة التواصل للعميل',
    description: 'تزويد العميل بأرقام التواصل وتطبيق الشركة',
    type: 'manual',
    required: false,
    completed: false,
  },
];

// تكوين سير عمل إنشاء العقد الكامل
export const contractWorkflow: WorkflowConfig = {
  id: 'new_contract',
  title: 'إنشاء عقد جديد',
  description: 'سير عمل إنشاء عقد إيجار سيارة جديد مع جميع التحققات المطلوبة',
  icon: '📋',
  phases: [
    {
      id: 'customer_verification',
      title: 'التحقق من العميل',
      icon: '👤',
      description: 'التحقق من هوية العميل ومستنداته',
      checks: customerVerificationChecks,
    },
    {
      id: 'vehicle_verification',
      title: 'التحقق من السيارة',
      icon: '🚗',
      description: 'التأكد من جاهزية السيارة',
      checks: vehicleVerificationChecks,
    },
    {
      id: 'financial_checks',
      title: 'المالية والدفع',
      icon: '💰',
      description: 'استلام المبالغ والتحقق من طريقة الدفع',
      checks: financialChecks,
    },
    {
      id: 'contract_signing',
      title: 'توقيع العقد',
      icon: '✍️',
      description: 'إتمام التوقيعات والختم',
      checks: contractSigningChecks,
    },
    {
      id: 'vehicle_handover',
      title: 'تسليم السيارة',
      icon: '🔑',
      description: 'توثيق وتسليم السيارة للعميل',
      checks: vehicleHandoverChecks,
    },
  ],
};

export default contractWorkflow;

