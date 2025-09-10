import { BusinessType, ModuleConfig, ModuleName } from '@/types/modules';
import { Car, Building, Store, Stethoscope, UtensilsCrossed, Factory, Truck, GraduationCap, Users, Hammer } from 'lucide-react';

// سجل الوحدات - تكوين جميع الوحدات المتاحة
export const MODULE_REGISTRY: Record<ModuleName, ModuleConfig> = {
  // الوحدات الأساسية
  core: {
    name: 'core',
    display_name: 'Core',
    display_name_ar: 'النواة الأساسية',
    icon: 'Settings',
    description: 'Core system functionality',
    description_ar: 'الوظائف الأساسية للنظام',
    routes: [],
    permissions: ['core.view'],
    version: '1.0.0'
  },
  
  finance: {
    name: 'finance',
    display_name: 'Finance',
    display_name_ar: 'المحاسبة',
    icon: 'Calculator',
    description: 'Financial management and accounting',
    description_ar: 'إدارة المحاسبة والشؤون المالية',
    routes: [
      { path: '/chart-of-accounts', label: 'Chart of Accounts', label_ar: 'دليل الحسابات', icon: 'BookOpen' },
      { path: '/journal-entries', label: 'Journal Entries', label_ar: 'القيود اليومية', icon: 'FileText' },
      { path: '/payments', label: 'Payments', label_ar: 'المدفوعات', icon: 'CreditCard' },
      { path: '/reports', label: 'Financial Reports', label_ar: 'التقارير المالية', icon: 'BarChart3' }
    ],
    permissions: ['finance.view', 'finance.manage'],
    version: '1.0.0'
  },

  // وحدة السيارات
  vehicles: {
    name: 'vehicles',
    display_name: 'Vehicles',
    display_name_ar: 'المركبات',
    icon: 'Car',
    description: 'Vehicle fleet management',
    description_ar: 'إدارة أسطول المركبات',
    routes: [
      { path: '/vehicles', label: 'Fleet Management', label_ar: 'إدارة الأسطول', icon: 'Car' },
      { path: '/maintenance', label: 'Maintenance', label_ar: 'الصيانة', icon: 'Wrench' }
    ],
    permissions: ['vehicles.view', 'vehicles.manage'],
    required_modules: ['core', 'finance'],
    version: '1.0.0'
  },

  // وحدة العقارات
  properties: {
    name: 'properties',
    display_name: 'Properties',
    display_name_ar: 'العقارات',
    icon: 'Building',
    description: 'Real estate management',
    description_ar: 'إدارة العقارات',
    routes: [
      { path: '/properties', label: 'Properties', label_ar: 'العقارات', icon: 'Building' },
      { path: '/property-map', label: 'Property Map', label_ar: 'خريطة العقارات', icon: 'Map' },
      { path: '/owners', label: 'Property Owners', label_ar: 'ملاك العقارات', icon: 'Users' }
    ],
    permissions: ['properties.view', 'properties.manage'],
    required_modules: ['core', 'finance'],
    version: '1.0.0'
  },

  // وحدة العقود
  contracts: {
    name: 'contracts',
    display_name: 'Contracts',
    display_name_ar: 'العقود',
    icon: 'FileText',
    description: 'Contract management',
    description_ar: 'إدارة العقود',
    routes: [
      { path: '/contracts', label: 'Contracts', label_ar: 'العقود', icon: 'FileText' },
      { path: '/contract-templates', label: 'Templates', label_ar: 'القوالب', icon: 'Copy' }
    ],
    permissions: ['contracts.view', 'contracts.manage'],
    required_modules: ['core', 'finance'],
    version: '1.0.0'
  },

  // وحدة العملاء
  customers: {
    name: 'customers',
    display_name: 'Customers',
    display_name_ar: 'العملاء',
    icon: 'Users',
    description: 'Customer relationship management',
    description_ar: 'إدارة علاقات العملاء',
    routes: [
      { path: '/customers', label: 'Customers', label_ar: 'العملاء', icon: 'Users' }
    ],
    permissions: ['customers.view', 'customers.manage'],
    required_modules: ['core'],
    version: '1.0.0'
  },

  // وحدة المستأجرين
  tenants: {
    name: 'tenants',
    display_name: 'Tenants',
    display_name_ar: 'المستأجرين',
    icon: 'UserCheck',
    description: 'Tenant management',
    description_ar: 'إدارة المستأجرين',
    routes: [
      { path: '/tenants', label: 'Tenants', label_ar: 'المستأجرين', icon: 'UserCheck' }
    ],
    permissions: ['tenants.view', 'tenants.manage'],
    required_modules: ['core', 'properties'],
    version: '1.0.0'
  },

  // وحدة المخزون
  inventory: {
    name: 'inventory',
    display_name: 'Inventory',
    display_name_ar: 'المخزون',
    icon: 'Package',
    description: 'Inventory management',
    description_ar: 'إدارة المخزون',
    routes: [
      { path: '/inventory', label: 'Inventory', label_ar: 'المخزون', icon: 'Package' },
      { path: '/stock-movements', label: 'Stock Movements', label_ar: 'حركة المخزون', icon: 'ArrowUpDown' }
    ],
    permissions: ['inventory.view', 'inventory.manage'],
    required_modules: ['core', 'finance'],
    version: '1.0.0'
  },

  // وحدة المبيعات
  sales: {
    name: 'sales',
    display_name: 'Sales',
    display_name_ar: 'المبيعات',
    icon: 'ShoppingCart',
    description: 'Sales management',
    description_ar: 'إدارة المبيعات',
    routes: [
      { path: '/sales', label: 'Sales', label_ar: 'المبيعات', icon: 'ShoppingCart' },
      { path: '/invoices', label: 'Invoices', label_ar: 'الفواتير', icon: 'Receipt' }
    ],
    permissions: ['sales.view', 'sales.manage'],
    required_modules: ['core', 'finance', 'inventory'],
    version: '1.0.0'
  },

  // وحدة الموردين
  suppliers: {
    name: 'suppliers',
    display_name: 'Suppliers',
    display_name_ar: 'الموردين',
    icon: 'Truck',
    description: 'Supplier management',
    description_ar: 'إدارة الموردين',
    routes: [
      { path: '/suppliers', label: 'Suppliers', label_ar: 'الموردين', icon: 'Truck' }
    ],
    permissions: ['suppliers.view', 'suppliers.manage'],
    required_modules: ['core', 'finance'],
    version: '1.0.0'
  },

  // وحدة المرضى
  patients: {
    name: 'patients',
    display_name: 'Patients',
    display_name_ar: 'المرضى',
    icon: 'Heart',
    description: 'Patient management',
    description_ar: 'إدارة المرضى',
    routes: [
      { path: '/patients', label: 'Patients', label_ar: 'المرضى', icon: 'Heart' }
    ],
    permissions: ['patients.view', 'patients.manage'],
    required_modules: ['core'],
    version: '1.0.0'
  },

  // وحدة المواعيد
  appointments: {
    name: 'appointments',
    display_name: 'Appointments',
    display_name_ar: 'المواعيد',
    icon: 'Calendar',
    description: 'Appointment scheduling',
    description_ar: 'جدولة المواعيد',
    routes: [
      { path: '/appointments', label: 'Appointments', label_ar: 'المواعيد', icon: 'Calendar' }
    ],
    permissions: ['appointments.view', 'appointments.manage'],
    required_modules: ['core', 'patients'],
    version: '1.0.0'
  },

  // وحدة السجلات الطبية
  medical_records: {
    name: 'medical_records',
    display_name: 'Medical Records',
    display_name_ar: 'السجلات الطبية',
    icon: 'Clipboard',
    description: 'Medical records management',
    description_ar: 'إدارة السجلات الطبية',
    routes: [
      { path: '/medical-records', label: 'Medical Records', label_ar: 'السجلات الطبية', icon: 'Clipboard' }
    ],
    permissions: ['medical_records.view', 'medical_records.manage'],
    required_modules: ['core', 'patients'],
    version: '1.0.0'
  },

  // وحدة القوائم
  menu: {
    name: 'menu',
    display_name: 'Menu',
    display_name_ar: 'القوائم',
    icon: 'ChefHat',
    description: 'Menu management',
    description_ar: 'إدارة القوائم',
    routes: [
      { path: '/menu', label: 'Menu Items', label_ar: 'عناصر القائمة', icon: 'ChefHat' }
    ],
    permissions: ['menu.view', 'menu.manage'],
    required_modules: ['core', 'inventory'],
    version: '1.0.0'
  },

  // وحدة الطلبات
  orders: {
    name: 'orders',
    display_name: 'Orders',
    display_name_ar: 'الطلبات',
    icon: 'ClipboardList',
    description: 'Order management',
    description_ar: 'إدارة الطلبات',
    routes: [
      { path: '/orders', label: 'Orders', label_ar: 'الطلبات', icon: 'ClipboardList' }
    ],
    permissions: ['orders.view', 'orders.manage'],
    required_modules: ['core', 'menu'],
    version: '1.0.0'
  }
};

// تكوين الوحدات حسب نوع النشاط التجاري
export const BUSINESS_TYPE_MODULES: Record<BusinessType, ModuleName[]> = {
  car_rental: ['core', 'finance', 'vehicles', 'contracts', 'customers'],
  real_estate: ['core', 'finance', 'properties', 'contracts', 'customers', 'tenants'],
  retail: ['core', 'finance', 'inventory', 'sales', 'suppliers', 'customers'],
  medical: ['core', 'finance', 'patients', 'appointments', 'medical_records'],
  manufacturing: ['core', 'finance', 'inventory', 'sales', 'suppliers'],
  restaurant: ['core', 'finance', 'menu', 'orders', 'inventory'],
  logistics: ['core', 'finance', 'vehicles', 'customers'],
  education: ['core', 'finance', 'customers'],
  consulting: ['core', 'finance', 'customers', 'contracts'],
  construction: ['core', 'finance', 'customers', 'contracts', 'suppliers']
};

// الأيقونات حسب نوع النشاط
export const BUSINESS_TYPE_ICONS: Record<BusinessType, any> = {
  car_rental: Car,
  real_estate: Building,
  retail: Store,
  medical: Stethoscope,
  manufacturing: Factory,
  restaurant: UtensilsCrossed,
  logistics: Truck,
  education: GraduationCap,
  consulting: Users,
  construction: Hammer
};