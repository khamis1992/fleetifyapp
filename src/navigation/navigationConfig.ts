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
  Building2,
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
  CalendarDays,
  UserCog,
  AlertCircle,
  Package,
  PackageCheck,
  Tags,
  ArrowUpDown,
  UserPlus,
  ShoppingCart,
  TrendingDown,
  LayoutDashboard,
  BookOpen as BookOpenIcon,
  Banknote,
  Scale,
  Gavel,
  FolderOpen,
  FileWarning,
  FileCheck,
  ClipboardList,
  ListTodo,
  List,
  HeartHandshake,
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
  // --- Main ---
  {
    id: 'dashboard',
    name: 'الرئيسية',
    name_en: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },

  // --- Core Operations: Fleet Management ---
  {
    id: 'fleet',
    name: 'إدارة الأسطول',
    name_en: 'Fleet Management',
    icon: Car,
    submenu: [
      {
        id: 'vehicles',
        name: 'المركبات',
        href: '/fleet',
        icon: Car,
      },
      {
        id: 'maintenance',
        name: 'الصيانة',
        href: '/fleet/maintenance',
        icon: Wrench,
      },
      {
        id: 'reservations',
        name: 'الحجوزات',
        href: '/fleet/reservations',
        icon: CalendarDays,
      },
      {
        id: 'violations',
        name: 'المخالفات المرورية',
        href: '/fleet/traffic-violations',
        icon: AlertTriangle,
      },
      {
        id: 'fleet-reports',
        name: 'تقارير الأسطول',
        href: '/fleet/reports',
        icon: BarChart3,
      },
    ],
  },

  // --- Core Operations: Contracts & Quotations ---
  {
    id: 'quotations-contracts',
    name: 'العروض والعقود',
    name_en: 'Contracts & Quotations',
    icon: FileText,
    submenu: [
      {
        id: 'contracts',
        name: 'العقود',
        href: '/contracts',
        icon: FileCheck,
      },
      {
        id: 'quotations',
        name: 'عروض الأسعار',
        href: '/quotations',
        icon: ClipboardList,
      },
    ],
  },

  // --- Core Operations: Customers ---
  {
    id: 'customers',
    name: 'إدارة العملاء',
    name_en: 'Customers',
    icon: Users,
    submenu: [
      {
        id: 'customers-list',
        name: 'قائمة العملاء',
        href: '/customers',
        icon: List,
      },
      {
        id: 'customers-crm',
        name: 'إدارة العلاقات (CRM)',
        href: '/customers/crm',
        icon: HeartHandshake,
      },
    ],
  },

  // --- Finance & Admin: Finance ---
  {
    id: 'finance',
    name: 'المالية',
    name_en: 'Finance',
    icon: Banknote,
    requiresAdmin: true,
    submenu: [
      {
        id: 'finance-overview',
        name: 'لوحة التحكم',
        href: '/finance/overview',
        icon: LayoutDashboard,
      },
      {
        id: 'finance-billing',
        name: 'الفوترة والتحصيل',
        href: '/finance/billing',
        icon: Receipt,
      },
      {
        id: 'finance-accounting',
        name: 'المحاسبة العامة',
        href: '/finance/accounting',
        icon: BookOpenIcon,
      },
      {
        id: 'finance-treasury',
        name: 'الخزينة والبنوك',
        href: '/finance/treasury',
        icon: Building2,
      },
      {
        id: 'finance-reports-analysis',
        name: 'التقارير والتحليل',
        href: '/finance/reports-analysis',
        icon: BarChart3,
      },
      {
        id: 'finance-planning',
        name: 'التخطيط والرقابة',
        href: '/finance/budgets-centers',
        icon: Scale,
      },
      {
        id: 'finance-audit-settings',
        name: 'الإعدادات والتدقيق',
        href: '/finance/audit-settings',
        icon: Settings,
      },
    ],
  },

  // --- Finance & Admin: Human Resources ---
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
        icon: UserCog,
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
        icon: Receipt,
      },
      {
        id: 'hr-reports',
        name: 'التقارير',
        href: '/hr/reports',
        icon: BarChart3,
      },
    ],
  },

  // --- Compliance & Tracking: Legal Affairs ---
  {
    id: 'legal',
    name: 'الشؤون القانونية',
    name_en: 'Legal Affairs',
    icon: Shield,
    submenu: [
      {
        id: 'legal-cases',
        name: 'تتبع القضايا',
        href: '/legal/cases',
        icon: Gavel,
      },
      {
        id: 'legal-document-generator',
        name: 'مساعد الكتب الذكي',
        href: '/legal/document-generator',
        icon: BookOpenIcon,
      },
      {
        id: 'legal-documents',
        name: 'مستندات الشركة',
        href: '/legal/documents',
        icon: FolderOpen,
      },
      {
        id: 'legal-delinquency',
        name: 'إدارة المتعثرات',
        href: '/legal/delinquency',
        icon: FileWarning,
      },
    ],
  },

  // --- Compliance & Tracking: Tasks ---
  {
    id: 'tasks',
    name: 'إدارة المهام',
    name_en: 'Tasks',
    href: '/tasks',
    icon: ListTodo,
  },

  // --- Compliance & Tracking: Dispatch Permits ---
  {
    id: 'dispatch-permits',
    name: 'أذونات الصرف',
    name_en: 'Dispatch Permits',
    href: '/fleet/dispatch-permits',
    icon: PackageCheck,
  },

  // --- Tools & System: Reports ---
  {
    id: 'reports',
    name: 'التقارير',
    name_en: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },

  // --- Tools & System: Settings ---
  {
    id: 'settings',
    name: 'الإعدادات',
    name_en: 'Settings',
    href: '/settings',
    icon: Settings,
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
    id: 'admin-legal',
    name: 'الشؤون القانونية',
    name_en: 'Legal Affairs',
    href: '/legal/cases',
    icon: Shield,
  },
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
  {
    id: 'admin-whatsapp',
    name: 'تقارير واتساب',
    href: '/settings/whatsapp',
    icon: MessageSquare,
  },
]

// ============================================================================
// SETTINGS DRAWER (Secondary Menu)
// ============================================================================


// Help & Support
const helpSupportItems: NavSection[] = [
  {
    id: 'help-hub',
    name: 'مركز المساعدة',
    name_en: 'Help Center',
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
    id: 'help-faq',
    name: 'الأسئلة الشائعة',
    href: '/help/faq',
    icon: HelpCircle,
  },
  {
    id: 'support',
    name: 'الدعم الفني',
    name_en: 'Support',
    href: '/support',
    icon: Headphones,
  },
]
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
    {
      id: 'help-support-section',
      name: 'المساعدة والدعم',
      name_en: 'Help & Support',
      icon: HelpCircle,
    },
  ],
}

export const SETTINGS_ITEMS = {
  finance: financeSettingsItems,
  hr: hrSettingsItems,
  admin: adminItems,
  help: helpSupportItems,
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
