import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Car,
  FileText,
  Users,
  Banknote,
  Settings,
  ChevronDown,
  LogOut,
  Wrench,
  UserCog,
  BarChart3,
  CalendarDays,
  Truck,
  PanelLeftClose,
  PanelLeft,
  Search,
  UserCheck,
  Shield,
  ListTodo,
  List,
  HeartHandshake,
  AlertTriangle,
  ClipboardList,
  FileCheck,
  Scale,
  BookOpen,
  Building2,
  Receipt,
  Clock,
  PackageCheck,
  Gavel,
  FolderOpen,
  FileWarning,
  Target,
  X,
  Sparkles,
  CircleDot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTourGuide } from '@/components/tour-guide';

import { useFleetifyTranslation } from "@/hooks/useTranslation";
// === Types ===
interface SubItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: SubItem[];
  category?: string;
}

interface BentoSidebarProps {
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

// === Navigation Configuration with Icons for Sub-items ===
const navigation: NavItem[] = [
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

  // --- Section: "المالية والإدارة" (Finance & Admin) — category: 'finance-admin' ---
  {
    id: 'finance',
    label: 'المالية',
    icon: Banknote,
    category: 'finance-admin',
    children: [
      { id: 'finance-overview', label: 'لوحة التحكم', href: '/finance/overview', icon: LayoutDashboard },
      { id: 'finance-billing', label: 'الفواتير والمدفوعات', href: '/finance/billing', icon: Receipt },
      { id: 'finance-treasury', label: 'الخزينة والبنوك', href: '/finance/treasury', icon: Building2 },
      { id: 'finance-ledger', label: 'دفتر الأستاذ', href: '/finance/general-ledger', icon: BookOpen },
      { id: 'finance-chart-of-accounts', label: 'دليل الحسابات', href: '/finance/chart-of-accounts', icon: Scale },
      { id: 'finance-reports', label: 'التقارير المالية', href: '/finance/reports', icon: BarChart3 },
    ],
  },
  {
    id: 'hr',
    label: 'الموارد البشرية',
    icon: UserCheck,
    category: 'finance-admin',
    children: [
      { id: 'hr-employees', label: 'إدارة الموظفين', href: '/hr/employees', icon: UserCog },
      { id: 'hr-attendance', label: 'الحضور والإجازات', href: '/hr/attendance', icon: Clock },
      { id: 'hr-payroll', label: 'الرواتب', href: '/hr/payroll', icon: Receipt },
      { id: 'hr-reports', label: 'التقارير', href: '/hr/reports', icon: BarChart3 },
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
    id: 'settings',
    label: 'الإعدادات',
    icon: Settings,
    href: '/settings',
    category: 'tools',
  },
];

// === Category Labels ===
const categoryLabels: Record<string, string> = {
  main: '',
  core: 'العمليات الأساسية',
  'finance-admin': 'المالية والإدارة',
  compliance: 'الامتثال والمتابعة',
  tools: 'الأدوات والنظام',
};

// === Group navigation by category ===
const groupedNavigation = navigation.reduce((acc, item) => {
  const category = item.category || 'main';
  if (!acc[category]) acc[category] = [];
  acc[category].push(item);
  return acc;
}, {} as Record<string, NavItem[]>);

// === Main Component ===
const BentoSidebar: React.FC<BentoSidebarProps> = ({
  isMobile = false, onCloseMobile }) => {
  const { t } = useFleetifyTranslation("ui");
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1280;
    }
    return false;
  });
  const [expandedItems, setExpandedItems] = useState<string[]>(['customers', 'fleet']);
  const [recentPages, setRecentPages] = useState<Array<{label: string; href: string; icon: React.ElementType}>>([]);
  const { startTour } = useTourGuide();

  const allNavItems = navigation.flatMap(item =>
    item.children ? [item, ...item.children] : [item]
  );

  useEffect(() => {
    const current = allNavItems.find(item =>
      location.pathname === item.href ||
      location.pathname.startsWith(item.href + "/")
    );
    if (current) {
      setRecentPages(prev => {
        const filtered = prev.filter(p => p.href !== current.href);
        const icon = 'icon' in current ? current.icon : List;
        return [{ label: current.label, href: current.href!, icon }, ...filtered].slice(0, 5);
      });
    }
  }, [location.pathname]);

  const handleLinkClick = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isActiveLink = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const isParentActive = (children?: SubItem[]) =>
    children?.some(child => isActiveLink(child.href));

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const userName = (user?.profile?.first_name && user?.profile?.last_name
    ? `${user.profile.first_name} ${user.profile.last_name}`
    : user?.email?.split('@')[0]) || 'مستخدم';
  const userInitials = userName.slice(0, 2).toUpperCase();

  // === Render Navigation Item ===
  const renderNavItem = (item: NavItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isParentItemActive = hasChildren && isParentActive(item.children);
    const isDirectActive = item.href && isActiveLink(item.href);

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleExpanded(item.id)}
            className={cn(
              'group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
              'hover:bg-slate-100/80 dark:hover:bg-neutral-800/60',
              isParentItemActive
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-neutral-300'
            )}
            aria-expanded={isExpanded}
          >
            {/* Active accent bar */}
            {isParentItemActive && (
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full bg-gradient-to-b from-teal-400 to-emerald-500" />
            )}
            {/* Icon with subtle container */}
            <span className={cn(
              'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300',
              'bg-slate-100 dark:bg-neutral-800 group-hover:bg-slate-200/80 dark:group-hover:bg-neutral-700',
              isParentItemActive && 'bg-gradient-to-br from-teal-500/15 to-emerald-500/15 ring-1 ring-teal-500/20'
            )}>
              <item.icon className={cn(
                'w-4 h-4 transition-colors',
                isParentItemActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-neutral-400'
              )} />
            </span>
            {(!collapsed || isMobile) && (
              <>
                <span className={cn('flex-1 text-right transition-colors', isParentItemActive && 'font-semibold')}>
                  {item.label}
                </span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-slate-400 transition-transform duration-300',
                    isExpanded && 'rotate-180',
                    isParentItemActive && 'text-teal-500'
                  )}
                />
              </>
            )}
          </button>
          <AnimatePresence>
            {isExpanded && (!collapsed || isMobile) && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden mr-3 mt-1 space-y-0.5 border-r-2 border-slate-100 dark:border-neutral-800"
              >
                {item.children!.map((child) => {
                  const ChildIcon = child.icon;
                  const isChildActive = isActiveLink(child.href);
                  return (
                    <li key={child.id}>
                      <NavLink
                        to={child.href}
                        onClick={handleLinkClick}
                        className={cn(
                          'group flex items-center gap-2.5 px-3 py-2 mr-2 rounded-lg text-sm transition-all duration-300 relative',
                          isChildActive
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/25 font-semibold'
                            : 'text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800/60 hover:text-slate-800 dark:hover:text-neutral-100'
                        )}
                      >
                        {/* Active connector dot */}
                        {isChildActive && (
                          <span className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-teal-500 ring-2 ring-white dark:ring-neutral-900" />
                        )}
                        <span className="flex-shrink-0 flex items-center justify-center">
                          <ChildIcon className={cn(
                            'w-4 h-4 transition-transform group-hover:scale-110',
                            isChildActive ? 'text-white' : 'text-slate-400 dark:text-neutral-500'
                          )} />
                        </span>
                        <span>{child.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <NavLink
        key={item.id}
        to={item.href!}
        onClick={handleLinkClick}
        className={cn(
          'group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
          isDirectActive
            ? 'bg-gradient-to-l from-teal-500 via-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/20'
            : 'text-slate-600 dark:text-neutral-300 hover:bg-slate-100/80 dark:hover:bg-neutral-800/60 hover:text-slate-900 dark:hover:text-white'
        )}
      >
        {/* Active accent bar */}
        {isDirectActive && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-l-full bg-white/40" />
        )}
        {/* Icon container */}
        <span className={cn(
          'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300',
          isDirectActive
            ? 'bg-white/15'
            : 'bg-slate-100 dark:bg-neutral-800 group-hover:bg-slate-200/80 dark:group-hover:bg-neutral-700'
        )}>
          <item.icon className={cn(
            'w-4 h-4',
            isDirectActive ? 'text-white' : 'text-slate-500 dark:text-neutral-400'
          )} />
        </span>
        {(!collapsed || isMobile) && (
          <span className={cn(isDirectActive && 'font-semibold')}>{item.label}</span>
        )}
      </NavLink>
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isMobile ? 288 : (collapsed ? 76 : 264) }}
      className={cn(
        "fixed top-0 right-0 h-screen z-40",
        "flex flex-col bg-white dark:bg-neutral-900",
        "shadow-[0_0_40px_-12px_rgba(15,118,110,0.18)] dark:shadow-[0_0_40px_-12px_rgba(20,184,166,0.15)]",
        isMobile ? "border-none" : "border-l border-slate-200/70 dark:border-neutral-800"
      )}
    >
      {/* Decorative top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-teal-500 via-emerald-500 to-transparent" />

      {/* === Header: Logo & Collapse Button === */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100/80 dark:border-neutral-800 flex-shrink-0">
        {(!collapsed || isMobile) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2.5"
          >
            <div className="relative w-9 h-9 bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
              <span className="text-white font-bold text-lg tracking-tight">F</span>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-neutral-900" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight">{t("fleetify")}</span>
              <span className="text-[9px] text-teal-600 dark:text-teal-400 font-medium mt-0.5 tracking-wider">FLEET MANAGEMENT</span>
            </div>
          </motion.div>
        )}
        {(collapsed && !isMobile) && (
          <div className="w-9 h-9 mx-auto bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
            <span className="text-white font-bold text-lg">F</span>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'p-1.5 rounded-lg transition-all hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400',
              collapsed && 'absolute left-2 top-4'
            )}
            title={collapsed ? 'توسيع' : 'تصغير'}
            aria-label={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* === Search Trigger === */}
      {(!collapsed || isMobile) && (
        <div className="px-3 py-2.5 border-b border-slate-100/80 dark:border-neutral-800">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className={cn(
              'group w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl',
              'bg-gradient-to-l from-slate-50 to-slate-100/70 dark:from-neutral-800 dark:to-neutral-800/60',
              'hover:from-teal-50/60 hover:to-emerald-50/40 dark:hover:from-neutral-800 dark:hover:to-neutral-700',
              'border border-slate-200/60 dark:border-neutral-700/60 hover:border-teal-300/50',
              'text-slate-400 dark:text-neutral-400 text-xs transition-all duration-300'
            )}
            aria-label="بحث سريع"
          >
            <Search className="w-3.5 h-3.5 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" />
            <span className="flex-1 text-right">بحث سريع...</span>
            <kbd className="text-[10px] bg-white dark:bg-neutral-700 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-neutral-600 font-mono text-slate-500 dark:text-neutral-300 shadow-sm">⌘K</kbd>
          </button>
        </div>
      )}

      {/* === Recent Pages === */}
      {(!collapsed || isMobile) && recentPages.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-100/80 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-1">
              <CircleDot className="w-2.5 h-2.5 text-teal-400" />
              المؤخر
            </span>
            <button
              onClick={() => setRecentPages([])}
              className="text-slate-300 hover:text-slate-500 dark:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
              aria-label="مسح الصفحات الأخيرة"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-0.5">
            {recentPages.map(page => (
              <Link
                key={page.href}
                to={page.href}
                onClick={handleLinkClick}
                className="group flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800/60 hover:text-teal-600 dark:hover:text-teal-400 transition-all"
              >
                {page.icon && <page.icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />}
                {page.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* === Start Tour Button === */}
      {(!collapsed || isMobile) && (
        <div className="px-3 py-2 border-b border-slate-100/80 dark:border-neutral-800">
          <button
            onClick={() => startTour('dashboard-overview')}
            className={cn(
              'group w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl',
              'bg-gradient-to-l from-teal-500/90 via-emerald-500/90 to-teal-600/90',
              'hover:from-teal-600 hover:via-emerald-600 hover:to-teal-700',
              'text-white text-xs font-semibold transition-all duration-300',
              'shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30',
              'hover:scale-[1.02]'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 text-right">ابدأ جولة تعريفية</span>
          </button>
        </div>
      )}

      {/* === Navigation with Categories === */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">
        {Object.entries(groupedNavigation).map(([category, items], categoryIndex) => (
          <div key={category} className={cn(categoryIndex > 0 && 'mt-5')}>
            {/* Category Label */}
            {categoryLabels[category] && (!collapsed || isMobile) && (
              <div className="flex items-center gap-2 px-2 py-1.5 mb-1.5">
                <span className="h-px w-4 bg-gradient-to-l from-slate-300 to-transparent dark:from-neutral-600" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                  {categoryLabels[category]}
                </span>
                <span className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent dark:via-neutral-700/60" />
              </div>
            )}

            {/* Category Items */}
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id}>{renderNavItem(item)}</li>
              ))}
            </ul>

            {/* Separator between categories */}
            {categoryIndex < Object.keys(groupedNavigation).length - 1 && (collapsed && !isMobile) && (
              <div className="mt-4 mx-3 border-b border-slate-100 dark:border-neutral-800" />
            )}
          </div>
        ))}
      </nav>

      {/* === Footer: Theme Toggle + User Profile Card === */}
      {!isMobile && (
        <div className="px-3 py-1.5 border-t border-slate-100/80 dark:border-neutral-800 flex items-center justify-between">
          <ThemeToggle />
          {(!collapsed) && (
            <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase tracking-wider">النظام</span>
          )}
        </div>
      )}

      <div className="p-2.5 border-t border-slate-100/80 dark:border-neutral-800 flex-shrink-0 bg-gradient-to-l from-slate-50/80 to-teal-50/30 dark:from-neutral-900 dark:to-neutral-900">
        <div
          className={cn(
            'group relative flex items-center gap-2.5 p-2 rounded-xl',
            'bg-white dark:bg-neutral-800/40 shadow-sm border border-slate-200/60 dark:border-neutral-700/40',
            'hover:border-teal-300/40 hover:shadow-md transition-all duration-300',
            collapsed && !isMobile && 'justify-center'
          )}
        >
          {/* Online status dot */}
          {(!collapsed || isMobile) && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-neutral-900 z-10" />
          )}

          {/* Avatar - Clickable to go to Profile */}
          <button
            onClick={() => {
              handleLinkClick();
              navigate('/profile');
            }}
            className={cn(
              'relative flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 transition-all cursor-pointer',
              'w-9 h-9 rounded-full',
              'bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600',
              'shadow-lg shadow-teal-500/30 hover:from-teal-600 hover:to-emerald-700 hover:scale-105'
            )}
            title="الملف الشخصي"
            aria-label="الملف الشخصي"
          >
            <span className="ring-2 ring-white/30 rounded-full w-full h-full flex items-center justify-center">
              {userInitials}
            </span>
          </button>

          {/* User Info + Logout */}
          {(!collapsed || isMobile) && (
            <div className="flex-1 flex items-center justify-between min-w-0">
              <button
                onClick={() => {
                  handleLinkClick();
                  navigate('/profile');
                }}
                className="min-w-0 text-right transition-colors cursor-pointer"
                title="الملف الشخصي"
              >
                <p className="text-xs font-semibold text-slate-800 dark:text-neutral-100 truncate">{userName}</p>
                <p className="text-[10px] text-slate-400 dark:text-neutral-500 truncate">{user?.email}</p>
              </button>
              <button
                onClick={handleSignOut}
                className={cn(
                  'p-2 rounded-lg transition-all duration-300 flex-shrink-0',
                  'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                )}
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Collapsed logout */}
          {collapsed && !isMobile && (
            <button
              onClick={handleSignOut}
              className="absolute -top-1 -left-1 p-1.5 rounded-full bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 shadow-sm text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
              title="تسجيل الخروج"
              aria-label="تسجيل الخروج"
            >
              <LogOut className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

export default BentoSidebar;