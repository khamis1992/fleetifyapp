// Drill-down routing configuration for charts and widgets
export interface DrillDownRoute {
  path: string;
  label: string;
  filter?: Record<string, unknown>;
}

export const drillDownRoutes = {
  // Finance drill-downs
  revenue: {
    path: '/finance/invoices',
    label: 'عرض الفواتير',
    filter: { status: 'paid' },
  },
  expenses: {
    path: '/finance/invoices',
    label: 'عرض المصروفات',
    filter: { type: 'expense' },
  },
  customers: {
    path: '/customers',
    label: 'عرض العملاء',
  },
  contracts: {
    path: '/contracts',
    label: 'عرض العقود',
  },
  payments: {
    path: '/finance/invoices',
    label: 'عرض المدفوعات',
  },

  // Fleet drill-downs
  vehicles: {
    path: '/fleet',
    label: 'عرض المركبات',
  },
  'vehicle-maintenance': {
    path: '/fleet/maintenance',
    label: 'عرض الصيانة',
  },
  'vehicle-insurance': {
    path: '/fleet/insurance',
    label: 'عرض التأمينات',
  },
  rentals: {
    path: '/contracts',
    label: 'عرض الإيجارات',
    filter: { type: 'rental' },
  },

  // Property drill-downs
  properties: {
    path: '/properties',
    label: 'عرض العقارات',
  },
  units: {
    path: '/properties/units',
    label: 'عرض الوحدات',
  },
  tenants: {
    path: '/tenants',
    label: 'عرض المستأجرين',
  },
  'property-maintenance': {
    path: '/properties/maintenance',
    label: 'عرض صيانة العقارات',
  },

  // Sales drill-downs
  'sales-leads': {
    path: '/sales/leads',
    label: 'عرض العملاء المحتملين',
  },
  'sales-opportunities': {
    path: '/sales/opportunities',
    label: 'عرض الفرص',
  },
  'sales-quotes': {
    path: '/sales/quotes',
    label: 'عرض عروض الأسعار',
  },
  'sales-orders': {
    path: '/sales/orders',
    label: 'عرض الطلبات',
  },
  'sales-pipeline': {
    path: '/sales/pipeline',
    label: 'عرض مسار المبيعات',
  },

  // Inventory drill-downs
  inventory: {
    path: '/inventory',
    label: 'عرض المخزون',
  },
  'inventory-categories': {
    path: '/inventory/categories',
    label: 'عرض فئات المخزون',
  },
  'stock-movements': {
    path: '/inventory/movements',
    label: 'عرض حركات المخزون',
  },
  'low-stock': {
    path: '/inventory',
    label: 'عرض المنتجات منخفضة المخزون',
    filter: { lowStock: true },
  },

  // Vendor drill-downs
  vendors: {
    path: '/finance/vendors',
    label: 'عرض الموردين',
  },
  'vendor-categories': {
    path: '/finance/vendor-categories',
    label: 'عرض فئات الموردين',
  },

  // Integration drill-downs
  integrations: {
    path: '/dashboards/integration',
    label: 'لوحة التكامل',
  },
} as const;

export type DrillDownKey = keyof typeof drillDownRoutes;

export const getDrillDownRoute = (key: DrillDownKey): DrillDownRoute => {
  return drillDownRoutes[key];
};
