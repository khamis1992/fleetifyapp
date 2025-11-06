import {
  Home,
  Car,
  FileText,
  DollarSign,
  TrendingUp,
  Boxes,
  UserCheck,
  Shield,
  BarChart3,
  Headphones,
  Settings,
  Wrench,
  AlertTriangle,
  CreditCard,
  Receipt,
  Building,
  Link,
  Calculator,
  Landmark,
  MapPin,
  Target,
  CheckSquare,
  Database,
  Activity,
  Zap,
  Users,
  Clock,
  Calendar,
  UserCog,
  AlertCircle,
  Package,
  Tags,
  ArrowUpDown,
  UserPlus,
  ShoppingCart,
  TrendingDown,
  LayoutDashboard,
  BookOpen as BookOpenIcon,
  HelpCircle,
  PlayCircle,
  MessageSquare,
  PhoneCall,
  LucideIcon,
} from 'lucide-react'

// Use TrendingUp as alternative for Timeline and BarChart3 for PieChart since those don't exist in lucide-react
const Timeline = TrendingUp
const BookOpen = FileText
const PieChart = BarChart3

/**
 * Flattened Navigation Structure (Max 2 Levels)
 * 
 * Structure:
 * - Level 1: Main menu items (always visible)
 * - Level 2: Submenus (expand on demand)
 * - Settings: Dedicated drawer (admin/config items)
 */

export interface NavSubItem {
  id: string
  name: string
  href: string
  icon: LucideIcon
  description?: string
}

export interface NavSection {
  id: string
  name: string
  name_en?: string
  href?: string
  icon: LucideIcon
  submenu?: NavSubItem[]
  requiresAdmin?: boolean
  requiresSuperAdmin?: boolean
}

export interface NavDrawer {
  id: string
  label: string
  description?: string
  items: NavSection[]
}

// ============================================================================
// PRIMARY NAVIGATION (Main Menu - Max 10 items)
// ============================================================================

export const PRIMARY_NAVIGATION: NavSection[] = [
  {
    id: 'dashboard',
    name: 'لوحة التحكم',
    name_en: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },

  // Customer Management (CRM)
  {
    id: 'customers',
    name: 'إدارة العملاء',
    name_en: 'Customer Management',
    icon: Users,
    submenu: [
      {
        id: 'customers-list',
        name: 'قائمة العملاء',
        href: '/customers',
        icon: Users,
      },
      {
        id: 'customers-crm',
        name: 'إدارة العلاقات (CRM)',
        href: '/customers/crm',
        icon: PhoneCall,
      },
    ],
  },

  // Fleet Management (Consolidated - 5 items)
  {
    id: 'fleet',
    name: 'إدارة الأسطول',
    name_en: 'Fleet Management',
    icon: Car,
    submenu: [
      {
        id: 'fleet-vehicles',
        name: 'إدارة المركبات',
        href: '/fleet',
        icon: Car,
      },
      {
        id: 'fleet-maintenance',
        name: 'الصيانة',
        href: '/fleet/maintenance',
        icon: Wrench,
      },
      {
        id: 'fleet-dispatch',
        name: 'تصاريح الحركة',
        href: '/fleet/dispatch-permits',
        icon: FileText,
      },
      {
        id: 'fleet-violations',
        name: 'المخالفات والمدفوعات',
        href: '/fleet/traffic-violations',
        icon: AlertTriangle,
      },
      {
        id: 'fleet-reports',
        name: 'التقارير والتحليلات',
        href: '/fleet/reports',
        icon: BarChart3,
      },
      {
        id: 'fleet-installments',
        name: 'أقساط المركبات',
        href: '/fleet/vehicle-installments',
        icon: TrendingUp,
      },
      {
        id: 'fleet-reservation-system',
        name: 'نظام الحجوزات',
        href: '/fleet/reservation-system',
        icon: Calendar,
      },
    ],
  },

  // Quotations & Contracts (Simple - No submenu)
  {
    id: 'quotations-contracts',
    name: 'العروض والعقود',
    name_en: 'Quotations & Contracts',
    icon: FileText,
    submenu: [
      {
        id: 'quotations',
        name: 'عروض الأسعار',
        href: '/quotations',
        icon: FileText,
      },
      {
        id: 'contracts',
        name: 'العقود',
        href: '/contracts',
        icon: FileText,
      },
    ],
  },

  // Finance (Reduced from 16 to 7 items)
  {
    id: 'finance',
    name: 'المالية',
    name_en: 'Finance',
    icon: DollarSign,
    requiresAdmin: true,
    submenu: [
      {
        id: 'finance-chart',
        name: 'دليل الحسابات',
        href: '/finance/chart-of-accounts',
        icon: BookOpen,
      },
      {
        id: 'finance-ledger',
        name: 'دفتر الأستاذ',
        href: '/finance/ledger',
        icon: Calculator,
      },
      {
        id: 'finance-invoices',
        name: 'الفواتير والمدفوعات',
        href: '/finance/invoices',
        icon: Receipt,
      },
      {
        id: 'finance-treasury',
        name: 'الخزينة والبنوك',
        href: '/finance/treasury',
        icon: Landmark,
      },
      {
        id: 'finance-ar-aging',
        name: 'الذمم المدينة',
        href: '/finance/ar-aging',
        icon: TrendingDown,
      },
      {
        id: 'finance-payment-tracking',
        name: 'تتبع الدفعات',
        href: '/finance/payment-tracking',
        icon: Timeline,
      },
      {
        id: 'finance-reports',
        name: 'التحليل والتقارير',
        href: '/finance/reports',
        icon: PieChart,
      },
    ],
  },

  // Sales (4 items)
  {
    id: 'sales',
    name: 'المبيعات',
    name_en: 'Sales',
    icon: TrendingUp,
    submenu: [
      {
        id: 'sales-pipeline',
        name: 'مسار المبيعات',
        href: '/sales/pipeline',
        icon: TrendingUp,
      },
      {
        id: 'sales-leads',
        name: 'العملاء المحتملين والعروض',
        href: '/sales/leads',
        icon: UserPlus,
      },
      {
        id: 'sales-orders',
        name: 'الطلبات',
        href: '/sales/orders',
        icon: ShoppingCart,
      },
      {
        id: 'sales-analytics',
        name: 'تحليلات المبيعات',
        href: '/sales/analytics',
        icon: BarChart3,
      },
    ],
  },

  // Inventory (Consolidated - 3 items)
  {
    id: 'inventory',
    name: 'المخزون',
    name_en: 'Inventory',
    icon: Boxes,
    submenu: [
      {
        id: 'inventory-items',
        name: 'الأصناف والتصنيفات',
        href: '/inventory',
        icon: Package,
      },
      {
        id: 'inventory-warehouses',
        name: 'المستودعات',
        href: '/inventory/warehouses',
        icon: Boxes,
      },
      {
        id: 'inventory-movements',
        name: 'حركات المخزون والتقارير',
        href: '/inventory/movements',
        icon: ArrowUpDown,
      },
    ],
  },

  // Human Resources (Consolidated - 4 items)
  {
    id: 'hr',
    name: 'الموارد البشرية',
    name_en: 'Human Resources',
    icon: UserCheck,
    requiresAdmin: true,
    submenu: [
      {
        id: 'hr-employees',
        name: 'إدارة الموظفين',
        href: '/hr/employees',
        icon: Users,
      },
      {
        id: 'hr-attendance',
        name: 'الحضور والإجازات',
        href: '/hr/attendance',
        icon: Clock,
      },
      {
        id: 'hr-payroll',
        name: 'الرواتب',
        href: '/hr/payroll',
        icon: DollarSign,
      },
      {
        id: 'hr-reports',
        name: 'التقارير',
        href: '/hr/reports',
        icon: BarChart3,
      },
    ],
  },

  // Legal Affairs (Combined - 4 items)
  {
    id: 'legal',
    name: 'الشؤون القانونية',
    name_en: 'Legal Affairs',
    icon: Shield,
    submenu: [
      {
        id: 'legal-advisor',
        name: 'المستشار القانوني',
        href: '/legal/advisor',
        icon: UserCog,
      },
      {
        id: 'legal-cases',
        name: 'تتبع القضايا',
        href: '/legal/cases',
        icon: FileText,
      },
      {
        id: 'legal-disputes',
        name: 'نزاعات الفواتير',
        href: '/legal/invoice-disputes',
        icon: AlertCircle,
      },
      {
        id: 'legal-late-fees',
        name: 'غرامات التأخير والتذكيرات',
        href: '/legal/late-fees',
        icon: AlertTriangle,
      },
    ],
  },

  // Reports
  {
    id: 'reports',
    name: 'التقارير',
    name_en: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },

  // Support
  {
    id: 'support',
    name: 'الدعم الفني',
    name_en: 'Support',
    href: '/support',
    icon: Headphones,
  },

  // Help & Documentation
  {
    id: 'help',
    name: 'المساعدة والتوثيق',
    name_en: 'Help & Documentation',
    icon: BookOpenIcon,
    submenu: [
      {
        id: 'help-hub',
        name: 'مركز المساعدة',
        href: '/help',
        icon: BookOpenIcon,
      },
      {
        id: 'help-user-guide',
        name: 'دليل المستخدم',
        href: '/help/user-guide',
        icon: PlayCircle,
      },
      {
        id: 'help-dashboard',
        name: 'دليل لوحة التحكم',
        href: '/help/dashboard',
        icon: Home,
      },
      {
        id: 'help-contracts',
        name: 'دليل العقود',
        href: '/help/contracts',
        icon: FileText,
      },
      {
        id: 'help-customers',
        name: 'دليل العملاء',
        href: '/help/customers',
        icon: Users,
      },
      {
        id: 'help-finance',
        name: 'دليل المالية',
        href: '/help/finance',
        icon: DollarSign,
      },
      {
        id: 'help-collections',
        name: 'دليل التحصيل',
        href: '/help/collections',
        icon: MessageSquare,
      },
      {
        id: 'help-fleet',
        name: 'دليل الأسطول',
        href: '/help/fleet',
        icon: Car,
      },
      {
        id: 'help-faq',
        name: 'الأسئلة الشائعة',
        href: '/help/faq',
        icon: HelpCircle,
      },
    ],
  },
]

// ============================================================================
// SECONDARY NAVIGATION (Settings & Admin - Drawer Access)
// ============================================================================

// Finance Settings
const financeSettingsItems: NavSection[] = [
  {
    id: 'finance-accounting-wizard',
    name: 'معالج النظام المحاسبي',
    name_en: 'Accounting Wizard',
    href: '/finance/accounting-wizard',
    icon: Zap,
  },
  {
    id: 'finance-account-mappings',
    name: 'ربط الحسابات',
    href: '/finance/account-mappings',
    icon: Link,
  },
  {
    id: 'finance-budgets',
    name: 'الموازنات',
    href: '/finance/budgets',
    icon: Target,
  },
  {
    id: 'finance-cost-centers',
    name: 'مراكز التكلفة',
    href: '/finance/cost-centers',
    icon: MapPin,
  },
  {
    id: 'finance-vendors',
    name: 'إدارة الموردين',
    href: '/finance/vendors',
    icon: Building,
  },
  {
    id: 'finance-vendor-categories',
    name: 'تصنيفات الموردين',
    href: '/finance/vendor-categories',
    icon: Tags,
  },
  {
    id: 'finance-purchase-orders',
    name: 'أوامر الشراء',
    href: '/finance/purchase-orders',
    icon: ShoppingCart,
  },
  {
    id: 'finance-assets',
    name: 'الأصول الثابتة',
    href: '/finance/assets',
    icon: Building,
  },
]

// HR Settings
const hrSettingsItems: NavSection[] = [
  {
    id: 'hr-location-settings',
    name: 'إعدادات الموقع',
    href: '/hr/location-settings',
    icon: MapPin,
  },
  {
    id: 'hr-configuration',
    name: 'إعدادات الموارد البشرية',
    href: '/hr/settings',
    icon: Settings,
  },
]

// System Administration
const adminItems: NavSection[] = [
  {
    id: 'admin-approvals',
    name: 'نظام الموافقات',
    href: '/approvals',
    icon: CheckSquare,
  },
  {
    id: 'admin-audit',
    name: 'سجل العمليات',
    href: '/audit',
    icon: FileText,
  },
  {
    id: 'admin-backup',
    name: 'النسخ الاحتياطية',
    href: '/backup',
    icon: Database,
    requiresSuperAdmin: true,
  },
]

// ============================================================================
// SETTINGS DRAWER (Secondary Menu)
// ============================================================================

export const SETTINGS_DRAWER: NavDrawer = {
  id: 'settings',
  label: 'الإعدادات والإدارة',
  description: 'إدارة الإعدادات والعمليات الإدارية',
  items: [
    {
      id: 'finance-settings-section',
      name: 'إعدادات المالية',
      name_en: 'Finance Settings',
      icon: DollarSign,
      requiresAdmin: true,
    },
    {
      id: 'hr-settings-section',
      name: 'إعدادات الموارد البشرية',
      name_en: 'HR Settings',
      icon: UserCheck,
      requiresAdmin: true,
    },
    {
      id: 'admin-section',
      name: 'إدارة النظام',
      name_en: 'System Administration',
      icon: Settings,
      requiresAdmin: true,
    },
  ],
}

export const SETTINGS_ITEMS = {
  finance: financeSettingsItems,
  hr: hrSettingsItems,
  admin: adminItems,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all navigation items (primary + secondary)
 */
export const getAllNavItems = (): NavSection[] => {
  return [...PRIMARY_NAVIGATION]
}

/**
 * Get a specific section by ID
 */
export const getNavSectionById = (id: string): NavSection | undefined => {
  return PRIMARY_NAVIGATION.find(section => section.id === id)
}

/**
 * Get submenu items for a section
 */
export const getSubMenuItems = (sectionId: string): NavSubItem[] => {
  const section = getNavSectionById(sectionId)
  return section?.submenu || []
}

/**
 * Check if a route should show admin badge
 */
export const isAdminRoute = (sectionId: string): boolean => {
  const section = getNavSectionById(sectionId)
  return section?.requiresAdmin || false
}

/**
 * Get all settings items (flat list)
 */
export const getAllSettingsItems = (): NavSection[] => {
  return [
    ...financeSettingsItems,
    ...hrSettingsItems,
    ...adminItems,
  ]
}
