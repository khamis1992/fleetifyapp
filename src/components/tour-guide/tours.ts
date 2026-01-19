/**
 * الجولات التفاعلية المُعرّفة مسبقاً
 * Predefined Interactive Tours
 */

import { TourConfig } from './TourGuide';

// ===== مسارات الصفحات =====
export const NAVIGATION_ROUTES = {
  // الرئيسية
  dashboard: {
    path: '/dashboard',
    name: 'الرئيسية',
    description: 'لوحة التحكم الرئيسية',
    icon: '🏠',
  },
  
  // المركبات
  fleet: {
    path: '/fleet',
    name: 'المركبات',
    description: 'إدارة أسطول المركبات',
    icon: '🚗',
  },
  fleetMaintenance: {
    path: '/fleet/maintenance',
    name: 'الصيانة',
    description: 'جدول صيانة المركبات',
    icon: '🔧',
  },
  fleetReservations: {
    path: '/fleet/reservations',
    name: 'الحجوزات',
    description: 'حجوزات المركبات',
    icon: '📅',
  },
  fleetReports: {
    path: '/fleet/reports',
    name: 'تقارير الأسطول',
    description: 'تقارير وإحصائيات الأسطول',
    icon: '📊',
  },
  
  // العملاء
  customers: {
    path: '/customers',
    name: 'العملاء',
    description: 'قائمة العملاء',
    icon: '👥',
  },
  customersCRM: {
    path: '/customers/crm',
    name: 'متابعة العملاء',
    description: 'نظام CRM لمتابعة العملاء',
    icon: '📞',
  },
  
  // العقود
  contracts: {
    path: '/contracts',
    name: 'العقود',
    description: 'إدارة العقود',
    icon: '📄',
  },
  
  // المالية
  financeHub: {
    path: '/finance/hub',
    name: 'المالية',
    description: 'مركز الإدارة المالية',
    icon: '💰',
  },
  payments: {
    path: '/finance/payments',
    name: 'المدفوعات',
    description: 'سندات القبض والصرف',
    icon: '💳',
  },
  invoices: {
    path: '/finance/invoices',
    name: 'الفواتير',
    description: 'إدارة الفواتير',
    icon: '🧾',
  },
  
  // المهام
  tasks: {
    path: '/tasks',
    name: 'المهام',
    description: 'إدارة المهام',
    icon: '✅',
  },
  
  // الإعدادات
  settings: {
    path: '/settings',
    name: 'الإعدادات',
    description: 'إعدادات النظام',
    icon: '⚙️',
  },
} as const;

// ===== الجولات التفاعلية =====
export const PREDEFINED_TOURS: Record<string, TourConfig> = {
  // جولة إضافة مركبة جديدة
  'add-vehicle': {
    id: 'add-vehicle',
    name: 'إضافة مركبة جديدة',
    steps: [
      {
        target: '[data-tour="add-vehicle-btn"]',
        title: 'زر إضافة مركبة',
        content: 'اضغط على هذا الزر لإضافة مركبة جديدة للأسطول.',
        placement: 'bottom',
        hint: 'يمكنك أيضاً استخدام الاختصار Ctrl+N',
      },
      {
        target: '[data-tour="vehicle-form"]',
        title: 'نموذج المركبة',
        content: 'قم بملء بيانات المركبة: رقم اللوحة، النوع، الموديل، وسنة الصنع.',
        placement: 'right',
      },
      {
        target: '[data-tour="vehicle-status"]',
        title: 'حالة المركبة',
        content: 'اختر حالة المركبة: متاحة، مؤجرة، في الصيانة، أو خارج الخدمة.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="save-btn"]',
        title: 'حفظ المركبة',
        content: 'بعد ملء جميع البيانات، اضغط هنا لحفظ المركبة.',
        placement: 'top',
        waitForClick: true,
      },
    ],
  },

  // جولة إنشاء عقد جديد
  'create-contract': {
    id: 'create-contract',
    name: 'إنشاء عقد جديد',
    steps: [
      {
        target: '[data-tour="new-contract-btn"]',
        title: 'إنشاء عقد جديد',
        content: 'اضغط هنا لبدء إنشاء عقد إيجار جديد.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="select-customer"]',
        title: 'اختيار العميل',
        content: 'ابحث واختر العميل من القائمة، أو أضف عميل جديد.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="select-vehicle"]',
        title: 'اختيار المركبة',
        content: 'اختر المركبة المتاحة للتأجير.',
        placement: 'bottom',
        hint: 'فقط المركبات ذات الحالة "متاحة" ستظهر هنا.',
      },
      {
        target: '[data-tour="contract-dates"]',
        title: 'تواريخ العقد',
        content: 'حدد تاريخ بداية ونهاية العقد.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="contract-amount"]',
        title: 'قيمة العقد',
        content: 'أدخل القيمة الشهرية أو الإجمالية للعقد.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="submit-contract"]',
        title: 'إنشاء العقد',
        content: 'راجع البيانات ثم اضغط لإنشاء العقد.',
        placement: 'top',
      },
    ],
  },

  // جولة تجديد التأمين
  'renew-insurance': {
    id: 'renew-insurance',
    name: 'تجديد تأمين مركبة',
    steps: [
      {
        target: '[data-tour="search-vehicle"]',
        title: 'البحث عن المركبة',
        content: 'ابحث عن المركبة برقم اللوحة أو الاسم.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="vehicle-card"]',
        title: 'بطاقة المركبة',
        content: 'اضغط على المركبة لعرض تفاصيلها.',
        placement: 'right',
      },
      {
        target: '[data-tour="insurance-tab"]',
        title: 'تبويب التأمين',
        content: 'انتقل إلى تبويب "التأمين والاستمارة".',
        placement: 'bottom',
      },
      {
        target: '[data-tour="add-insurance-btn"]',
        title: 'إضافة تأمين',
        content: 'اضغط هنا لإضافة أو تجديد التأمين.',
        placement: 'left',
      },
      {
        target: '[data-tour="insurance-form"]',
        title: 'بيانات التأمين',
        content: 'أدخل: شركة التأمين، رقم الوثيقة، تاريخ البداية والانتهاء.',
        placement: 'right',
      },
    ],
  },

  // جولة إنشاء سند قبض
  'create-payment': {
    id: 'create-payment',
    name: 'إنشاء سند قبض',
    steps: [
      {
        target: '[data-tour="new-payment-btn"]',
        title: 'سند جديد',
        content: 'اضغط هنا لإنشاء سند قبض أو صرف جديد.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="payment-type"]',
        title: 'نوع السند',
        content: 'اختر نوع السند: قبض أو صرف.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="payment-customer"]',
        title: 'العميل',
        content: 'اختر العميل أو المورد.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="payment-amount"]',
        title: 'المبلغ',
        content: 'أدخل المبلغ بالريال القطري.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="payment-method"]',
        title: 'طريقة الدفع',
        content: 'اختر طريقة الدفع: نقدي، تحويل، شيك.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="save-payment"]',
        title: 'حفظ السند',
        content: 'اضغط لحفظ السند وطباعته.',
        placement: 'top',
      },
    ],
  },

  // جولة إضافة عميل
  'add-customer': {
    id: 'add-customer',
    name: 'إضافة عميل جديد',
    steps: [
      {
        target: '[data-tour="add-customer-btn"]',
        title: 'إضافة عميل',
        content: 'اضغط هنا لإضافة عميل جديد.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="customer-type"]',
        title: 'نوع العميل',
        content: 'اختر نوع العميل: فرد أو شركة.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="customer-name"]',
        title: 'اسم العميل',
        content: 'أدخل الاسم بالعربية والإنجليزية.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="customer-contact"]',
        title: 'بيانات التواصل',
        content: 'أدخل رقم الهاتف والبريد الإلكتروني.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="customer-id"]',
        title: 'رقم الهوية',
        content: 'أدخل رقم الهوية أو الرخصة.',
        placement: 'bottom',
      },
    ],
  },

  // جولة نظرة عامة على Dashboard
  'dashboard-overview': {
    id: 'dashboard-overview',
    name: 'نظرة عامة على لوحة التحكم',
    steps: [
      {
        target: '[data-tour="stats-cards"]',
        title: 'بطاقات الإحصائيات',
        content: 'هنا تجد ملخص سريع: المركبات، العقود، العملاء، والإيرادات.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="fleet-status"]',
        title: 'حالة الأسطول',
        content: 'رسم بياني يوضح توزيع حالات المركبات.',
        placement: 'left',
      },
      {
        target: '[data-tour="calendar"]',
        title: 'تقويم الحجوزات',
        content: 'عرض الحجوزات والعقود على التقويم.',
        placement: 'top',
      },
      {
        target: '[data-tour="recent-activities"]',
        title: 'النشاطات الأخيرة',
        content: 'آخر العمليات والتحديثات في النظام.',
        placement: 'top',
      },
    ],
  },
};

// دالة للحصول على جولة بالمعرف
export const getTourById = (tourId: string): TourConfig | null => {
  return PREDEFINED_TOURS[tourId] || null;
};

// دالة للحصول على المسار بالمفتاح
export const getRouteByKey = (key: string) => {
  return NAVIGATION_ROUTES[key as keyof typeof NAVIGATION_ROUTES] || null;
};

// دالة للبحث عن مسار بالاسم
export const findRouteByName = (name: string) => {
  return Object.entries(NAVIGATION_ROUTES).find(
    ([, route]) => route.name.includes(name) || route.description.includes(name)
  );
};

