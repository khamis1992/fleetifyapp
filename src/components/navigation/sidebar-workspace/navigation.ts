import type React from 'react';
import {
  LayoutDashboard,
  Car,
  FileText,
  Users,
  Settings,
  Wrench,
  UserCog,
  BarChart3,
  CalendarDays,
  UserCheck,
  Shield,
  ListTodo,
  List,
  HeartHandshake,
  AlertTriangle,
  ClipboardList,
  FileCheck,
  BookOpen,
  Receipt,
  Clock,
  PackageCheck,
  Gavel,
  FolderOpen,
  FileWarning,
} from 'lucide-react';

// === Types ===
export interface SubItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: SubItem[];
  category?: string;
  requiresAdmin?: boolean;
}

// === Navigation Configuration with Icons for Sub-items ===
export const navigation: NavItem[] = [
  // --- Section: "الرئيسية" (Main) — category: 'main' ---
  {
    id: 'dashboard',
    label: 'الرئيسية',
    icon: LayoutDashboard,
    href: '/dashboard',
    category: 'main',
  },

  // --- Section: "العمليات الأساسية" (Core Operations) — category: 'core' ---
  {
    id: 'fleet',
    label: 'إدارة الأسطول',
    icon: Car,
    category: 'core',
    children: [
      { id: 'vehicles', label: 'المركبات', href: '/fleet', icon: Car },
      { id: 'maintenance', label: 'الصيانة', href: '/fleet/maintenance', icon: Wrench },
      { id: 'reservations', label: 'الحجوزات', href: '/fleet/reservations', icon: CalendarDays },
      { id: 'violations', label: 'المخالفات المرورية', href: '/fleet/traffic-violations', icon: AlertTriangle },
      { id: 'fleet-reports', label: 'تقارير الأسطول', href: '/fleet/reports', icon: BarChart3 },
    ],
  },
  {
    id: 'quotations-contracts',
    label: 'العروض والعقود',
    icon: FileText,
    category: 'core',
    children: [
      { id: 'contracts', label: 'العقود', href: '/contracts', icon: FileCheck },
      { id: 'quotations', label: 'عروض الأسعار', href: '/quotations', icon: ClipboardList },
    ],
  },
  {
    id: 'customers',
    label: 'إدارة العملاء',
    icon: Users,
    category: 'core',
    children: [
      { id: 'customers-list', label: 'قائمة العملاء', href: '/customers', icon: List },
      { id: 'customers-crm', label: 'إدارة العلاقات (CRM)', href: '/customers/crm', icon: HeartHandshake },
    ],
  },

  // Administrative sections; financial navigation has its own dedicated menu.
  {
    id: 'hr',
    label: 'الموارد البشرية',
    icon: UserCheck,
    category: 'finance-admin',
    children: [
      { id: 'hr-employees', label: 'إدارة الموظفين', href: '/hr/employees', icon: UserCog },
      { id: 'hr-user-permissions', label: 'إدارة المستخدمين والصلاحيات', href: '/settings/permissions', icon: Shield },
      { id: 'hr-attendance', label: 'الحضور والإجازات', href: '/hr/attendance', icon: Clock },
      { id: 'hr-payroll', label: 'الرواتب', href: '/hr/payroll', icon: Receipt },
      { id: 'hr-reports', label: 'التقارير', href: '/hr/reports', icon: BarChart3 },
      { id: 'hr-daily-closeouts', label: 'إقفالات الموظفين', href: '/hr/daily-closeouts', icon: ClipboardList },
    ],
  },

  // --- Section: "الامتثال والمتابعة" (Compliance & Tracking) — category: 'compliance' ---
  {
    id: 'legal',
    label: 'الشؤون القانونية',
    icon: Shield,
    category: 'compliance',
    children: [
      { id: 'legal-cases', label: 'تتبع القضايا', href: '/legal/cases', icon: Gavel },
      { id: 'legal-document-generator', label: 'مساعد الكتب الذكي', href: '/legal/document-generator', icon: BookOpen },
      { id: 'legal-documents', label: 'مستندات الشركة', href: '/legal/documents', icon: FolderOpen },
      { id: 'legal-delinquency', label: 'إدارة المتعثرات', href: '/legal/delinquency', icon: FileWarning },
    ],
  },
  {
    id: 'tasks',
    label: 'إدارة المهام',
    icon: ListTodo,
    href: '/tasks',
    category: 'compliance',
  },
  {
    id: 'dispatch-permits',
    label: 'أذونات الصرف',
    icon: PackageCheck,
    href: '/fleet/dispatch-permits',
    category: 'compliance',
  },

  // --- Section: "الأدوات والنظام" (Tools & System) — category: 'tools' ---
  {
    id: 'reports',
    label: 'التقارير',
    icon: BarChart3,
    href: '/reports',
    category: 'tools',
  },
  {
    id: 'audit-logs',
    label: 'سجل التدقيق',
    icon: FileCheck,
    href: '/settings/audit-logs',
    category: 'tools',
    requiresAdmin: true,
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    icon: Settings,
    href: '/settings',
    category: 'tools',
  },
];

export const workspaceOnlyNavigation: NavItem[] = [
  {
    id: 'employee-workspace',
    label: 'مساحة عملي',
    icon: UserCheck,
    href: '/employee-workspace',
    category: 'main',
  },
];

// === Category Labels ===
export const categoryLabels: Record<string, string> = {
  main: '',
  core: 'العمليات الأساسية',
  'finance-admin': 'الإدارة',
  compliance: 'الامتثال والمتابعة',
  tools: 'الأدوات والنظام',
};

