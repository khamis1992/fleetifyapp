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
              'group relative w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200',
              'hover:bg-amber-50/60 dark:hover:bg-amber-500/5',
              isParentItemActive
                ? 'text-stone-900 dark:text-amber-50'
                : 'text-stone-500 dark:text-stone-400'
            )}
            aria-expanded={isExpanded}
          >
            {isParentItemActive && (
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-amber-500 dark:bg-amber-400" />
            )}
            <span className={cn(
              'flex-shrink-0 flex items-center justify-center w-8 h-8 transition-all duration-200',
              'border border-stone-200 dark:border-stone-700/50',
              'group-hover:border-amber-300 dark:group-hover:border-amber-500/40',
              isParentItemActive && 'border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/10'
            )}>
              <item.icon className={cn(
                'w-4 h-4 transition-colors',
                isParentItemActive ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400 dark:text-stone-500 group-hover:text-amber-500 dark:group-hover:text-amber-400'
              )} />
            </span>
            {(!collapsed || isMobile) && (
              <>
                <span className={cn('flex-1 text-right transition-colors', isParentItemActive && 'font-semibold')}>
                  {item.label}
                </span>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-200',
                    isExpanded && 'rotate-180',
                    isParentItemActive ? 'text-amber-500 dark:text-amber-400' : 'text-stone-300 dark:text-stone-600'
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
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden mr-4 mt-0.5 space-y-px border-r border-amber-200/60 dark:border-amber-500/15"
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
                          'group flex items-center gap-2.5 px-3 py-2 mr-2 text-sm transition-all duration-200 relative',
                          isChildActive
                            ? 'bg-amber-500 text-stone-900 dark:text-amber-50 font-semibold'
                            : 'text-stone-400 dark:text-stone-500 hover:bg-amber-50/50 dark:hover:bg-amber-500/5 hover:text-stone-700 dark:hover:text-amber-50'
                        )}
                      >
                        {isChildActive && (
                          <span className="absolute right-[-9px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-amber-500 dark:bg-amber-400" />
                        )}
                        <span className="flex-shrink-0 flex items-center justify-center">
                          <ChildIcon className={cn(
                            'w-3.5 h-3.5 transition-transform group-hover:scale-110',
                            isChildActive ? 'text-stone-900 dark:text-amber-50' : 'text-stone-300 dark:text-stone-600'
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
          'group relative w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isDirectActive
            ? 'bg-amber-500 text-stone-900 dark:text-amber-50 font-semibold'
            : 'text-stone-500 dark:text-stone-400 hover:bg-amber-50/60 dark:hover:bg-amber-500/5 hover:text-stone-800 dark:hover:text-amber-50'
        )}
      >
        {isDirectActive && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-amber-600 dark:bg-amber-300" />
        )}
        <span className={cn(
          'flex-shrink-0 flex items-center justify-center w-8 h-8 transition-all duration-200',
          'border border-stone-200 dark:border-stone-700/50',
          isDirectActive
            ? 'border-amber-600 dark:border-amber-400 bg-amber-100/50 dark:bg-amber-400/10'
            : 'group-hover:border-amber-300 dark:group-hover:border-amber-500/40'
        )}>
          <item.icon className={cn(
            'w-4 h-4',
            isDirectActive ? 'text-amber-700 dark:text-amber-300' : 'text-stone-400 dark:text-stone-500 group-hover:text-amber-500 dark:group-hover:text-amber-400'
          )} />
        </span>
        {(!collapsed || isMobile) && (
          <span className={cn(isDirectActive && 'font-semibold')}>{item.label}</span>
        )}
      </NavLink>
    );
  };

  const categoryEntries = Object.entries(groupedNavigation);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isMobile ? 288 : (collapsed ? 76 : 264) }}
      className={cn(
        "fixed top-0 right-0 h-screen z-40",
        "flex flex-col",
        "bg-stone-50 dark:bg-stone-950",
        "border-l border-stone-200 dark:border-stone-800",
        isMobile && "border-none"
      )}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%2300000000'/%3E%3Ccircle cx='2' cy='2' r='0.4' fill='%2300000005'/%3E%3C/svg%3E")`,
      }}
    >
      {/* Top accent line — thin gold gradient */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-l from-amber-500 via-amber-400 to-transparent dark:from-amber-400 dark:via-amber-500" />

      {/* === Header: Logo & Collapse Button === */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-stone-200 dark:border-stone-800 flex-shrink-0">
        {(!collapsed || isMobile) && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex items-center gap-3"
          >
            <div className="relative w-9 h-9 border-2 border-amber-500 dark:border-amber-400 flex items-center justify-center bg-stone-900 dark:bg-stone-900">
              <span className="text-amber-400 dark:text-amber-300 font-bold text-lg tracking-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>F</span>
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 dark:bg-amber-300" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-stone-900 dark:text-amber-50 text-base tracking-tight">{t("fleetify")}</span>
              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 tracking-[0.2em] uppercase" style={{ fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", monospace' }}>Fleet Mgmt</span>
            </div>
          </motion.div>
        )}
        {(collapsed && !isMobile) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="w-9 h-9 mx-auto border-2 border-amber-500 dark:border-amber-400 flex items-center justify-center bg-stone-900 dark:bg-stone-900"
          >
            <span className="text-amber-400 dark:text-amber-300 font-bold text-lg" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>F</span>
          </motion.div>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'p-1.5 transition-all text-stone-400 dark:text-stone-500 hover:text-amber-600 dark:hover:text-amber-400',
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
        <div className="px-3 py-2.5 border-b border-stone-200 dark:border-stone-800">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className={cn(
              'group w-full flex items-center gap-2.5 px-3 py-2.5',
              'border border-stone-200 dark:border-stone-700/60',
              'hover:border-amber-400 dark:hover:border-amber-500/50',
              'bg-stone-100/50 dark:bg-stone-900/50',
              'hover:bg-amber-50/40 dark:hover:bg-amber-500/5',
              'text-stone-400 dark:text-stone-500 text-xs transition-all duration-200'
            )}
            aria-label="بحث سريع"
          >
            <Search className="w-3.5 h-3.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
            <span className="flex-1 text-right">بحث سريع...</span>
            <kbd className="text-[10px] bg-stone-200/60 dark:bg-stone-800 px-1.5 py-0.5 border border-stone-300 dark:border-stone-700 font-mono text-stone-500 dark:text-stone-400" style={{ fontFamily: 'ui-monospace, "Cascadia Code", monospace' }}>⌘K</kbd>
          </button>
        </div>
      )}

      {/* === Recent Pages === */}
      {(!collapsed || isMobile) && recentPages.length > 0 && (
        <div className="px-3 py-2 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-[0.15em] flex items-center gap-1.5" style={{ fontFamily: 'ui-monospace, "Cascadia Code", monospace' }}>
              <span className="w-1 h-1 bg-amber-500 dark:bg-amber-400" />
              المؤخر
            </span>
            <button
              onClick={() => setRecentPages([])}
              className="text-stone-300 hover:text-stone-500 dark:text-stone-700 dark:hover:text-stone-400 transition-colors"
              aria-label="مسح الصفحات الأخيرة"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-px">
            {recentPages.map(page => (
              <Link
                key={page.href}
                to={page.href}
                onClick={handleLinkClick}
                className="group flex items-center gap-2 px-2 py-1.5 text-xs text-stone-500 dark:text-stone-400 hover:bg-amber-50/50 dark:hover:bg-amber-500/5 hover:text-amber-700 dark:hover:text-amber-400 transition-all"
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
        <div className="px-3 py-2 border-b border-stone-200 dark:border-stone-800">
          <button
            onClick={() => startTour('dashboard-overview')}
            className={cn(
              'group w-full flex items-center gap-2.5 px-3 py-2.5',
              'border border-amber-400 dark:border-amber-500/50',
              'bg-amber-50 dark:bg-amber-500/5',
              'hover:bg-amber-100 dark:hover:bg-amber-500/10',
              'text-amber-700 dark:text-amber-400 text-xs font-semibold transition-all duration-200',
              'hover:tracking-wider'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 text-right">ابدأ جولة تعريفية</span>
          </button>
        </div>
      )}

      {/* === Navigation with Categories === */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 scrollbar-thin scrollbar-thumb-stone-200 dark:scrollbar-thumb-stone-800 scrollbar-track-transparent">
        {categoryEntries.map(([category, items], categoryIndex) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: categoryIndex * 0.06, ease: 'easeOut' }}
            className={cn(categoryIndex > 0 && 'mt-5')}
          >
            {/* Category Label */}
            {categoryLabels[category] && (!collapsed || isMobile) && (
              <div className="flex items-center gap-2 px-2 py-1.5 mb-1.5">
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-500 tabular-nums" style={{ fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", monospace' }}>
                  {String(categoryIndex).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-[0.15em]" style={{ fontFamily: 'ui-monospace, "Cascadia Code", monospace' }}>
                  {categoryLabels[category]}
                </span>
                <span className="flex-1 h-px bg-gradient-to-l from-transparent via-stone-200 dark:via-stone-800 to-transparent" />
              </div>
            )}

            {/* Category Items */}
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.id}>{renderNavItem(item)}</li>
              ))}
            </ul>

            {/* Separator between categories (collapsed) */}
            {categoryIndex < categoryEntries.length - 1 && (collapsed && !isMobile) && (
              <div className="mt-4 mx-3 border-b border-stone-200 dark:border-stone-800" />
            )}
          </motion.div>
        ))}
      </nav>

      {/* === Footer: Theme Toggle === */}
      {!isMobile && (
        <div className="px-3 py-1.5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <ThemeToggle />
          {(!collapsed) && (
            <span className="text-[10px] text-stone-400 dark:text-stone-600 uppercase tracking-[0.15em]" style={{ fontFamily: 'ui-monospace, "Cascadia Code", monospace' }}>النظام</span>
          )}
        </div>
      )}

      {/* === User Profile Card === */}
      <div className="p-2.5 border-t border-stone-200 dark:border-stone-800 flex-shrink-0 bg-stone-100/50 dark:bg-stone-900/50">
        <div
          className={cn(
            'group relative flex items-center gap-2.5 p-2',
            'border border-stone-200 dark:border-stone-800',
            'hover:border-amber-300 dark:hover:border-amber-500/40 transition-all duration-200',
            collapsed && !isMobile && 'justify-center'
          )}
        >
          {(!collapsed || isMobile) && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 dark:bg-amber-300 ring-2 ring-stone-100 dark:ring-stone-900 z-10" />
          )}

          {/* Avatar */}
          <button
            onClick={() => {
              handleLinkClick();
              navigate('/profile');
            }}
            className={cn(
              'relative flex items-center justify-center font-semibold text-xs flex-shrink-0 transition-all cursor-pointer',
              'w-9 h-9',
              'border-2 border-amber-500 dark:border-amber-400',
              'bg-stone-900 dark:bg-stone-900 text-amber-400 dark:text-amber-300',
              'hover:scale-105'
            )}
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            title="الملف الشخصي"
            aria-label="الملف الشخصي"
          >
            {userInitials}
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
                <p className="text-xs font-semibold text-stone-800 dark:text-amber-50 truncate">{userName}</p>
                <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate" style={{ fontFamily: 'ui-monospace, "Cascadia Code", monospace' }}>{user?.email}</p>
              </button>
              <button
                onClick={handleSignOut}
                className={cn(
                  'p-2 transition-all duration-200 flex-shrink-0',
                  'text-stone-400 hover:text-red-500 dark:hover:text-red-400'
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
              className="absolute -top-1 -left-1 p-1.5 bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
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