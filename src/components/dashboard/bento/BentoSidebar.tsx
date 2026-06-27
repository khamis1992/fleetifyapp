import React, { useState, useEffect, useRef } from 'react';
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
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTourGuide } from '@/components/tour-guide';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';

import { useFleetifyTranslation } from "@/hooks/useTranslation";

const sidebarColors = {
  text: systemColorPattern.colors.text,
  inner: systemColorPattern.colors.innerSurface,
  secondary: systemColorPattern.colors.secondaryText,
  border: systemColorPattern.colors.border,
  water: systemColorPattern.colors.info,
  alert: systemColorPattern.colors.alert,
  focus: systemColorPattern.colors.focus,
  success: systemColorPattern.colors.success,
};
const PENDING_TOUR_STORAGE_KEY = 'fleetify:pending-tour';

const categoryAccents: Record<string, string> = {
  main: sidebarColors.success,
  core: sidebarColors.water,
  'finance-admin': sidebarColors.alert,
  compliance: sidebarColors.focus,
  tools: sidebarColors.success,
};

const itemAccents: Record<string, string> = {
  dashboard: sidebarColors.success,
  fleet: sidebarColors.water,
  'quotations-contracts': sidebarColors.focus,
  customers: sidebarColors.success,
  finance: sidebarColors.alert,
  hr: sidebarColors.focus,
  legal: sidebarColors.focus,
  tasks: sidebarColors.alert,
  'dispatch-permits': sidebarColors.water,
  reports: sidebarColors.success,
  settings: sidebarColors.focus,
};
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

interface SidebarScrollState {
  top: number;
  remaining: number;
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
      { id: 'finance-billing', label: 'الفوترة والتحصيل', href: '/finance/billing', icon: Receipt },
      { id: 'finance-accounting', label: 'المحاسبة العامة', href: '/finance/accounting', icon: BookOpen },
      { id: 'finance-treasury', label: 'الخزينة والبنوك', href: '/finance/treasury', icon: Building2 },
      { id: 'finance-reports-analysis', label: 'التقارير والتحليل', href: '/finance/reports-analysis', icon: BarChart3 },
      { id: 'finance-planning', label: 'التخطيط والرقابة', href: '/finance/budgets-centers', icon: Scale },
      { id: 'finance-audit-settings', label: 'الإعدادات والتدقيق', href: '/finance/audit-settings', icon: Settings },
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
  const navScrollRef = useRef<HTMLElement | null>(null);
  const savedScrollRef = useRef<SidebarScrollState | null>(null);
  const ignoreScrollSaveUntilRef = useRef(0);
  const scrollStorageKey = isMobile ? 'fleetify:bento-sidebar-scroll:mobile' : 'fleetify:bento-sidebar-scroll:desktop';
  const scrollRestoreKey = `${scrollStorageKey}:restore`;

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

  const saveSidebarScroll = (force = false) => {
    if (typeof window === 'undefined' || !navScrollRef.current) return;
    if (!force && Date.now() < ignoreScrollSaveUntilRef.current) return;
    const nav = navScrollRef.current;
    const scrollState = {
      top: nav.scrollTop,
      remaining: nav.scrollHeight - nav.clientHeight - nav.scrollTop,
    };
    savedScrollRef.current = scrollState;
    window.sessionStorage.setItem(scrollStorageKey, JSON.stringify(scrollState));
    if (force) {
      window.sessionStorage.setItem(scrollRestoreKey, JSON.stringify(scrollState));
    }
  };

  const restoreSidebarScroll = () => {
    if (typeof window === 'undefined') return;
    const applyRestore = () => {
      const nav = navScrollRef.current;
      const savedScroll = window.sessionStorage.getItem(scrollRestoreKey) || window.sessionStorage.getItem(scrollStorageKey);
      if (!nav || (savedScroll === null && !savedScrollRef.current)) return;
      ignoreScrollSaveUntilRef.current = Date.now() + 250;
      try {
        const parsed = savedScrollRef.current || JSON.parse(savedScroll || '{}') as SidebarScrollState;
        const remaining = typeof parsed.remaining === 'number' ? parsed.remaining : 0;
        nav.scrollTop = Math.max(0, nav.scrollHeight - nav.clientHeight - remaining);
      } catch {
        nav.scrollTop = Number(savedScroll || 0);
      }
    };

    window.requestAnimationFrame(applyRestore);
    window.setTimeout(applyRestore, 60);
    window.setTimeout(applyRestore, 180);
    window.setTimeout(() => window.sessionStorage.removeItem(scrollRestoreKey), 700);
  };

  useEffect(() => {
    restoreSidebarScroll();
  }, [location.pathname, collapsed, isMobile]);

  useEffect(() => {
    restoreSidebarScroll();
  }, [expandedItems]);

  const handleLinkClick = (event?: React.MouseEvent<HTMLElement>) => {
    saveSidebarScroll(true);
    ignoreScrollSaveUntilRef.current = Date.now() + 1200;
    event?.currentTarget.blur();
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleStartDashboardTour = () => {
    saveSidebarScroll(true);
    if (location.pathname.startsWith('/finance/accounting')) {
      startTour('accounting-center');
      return;
    }

    if (location.pathname.startsWith('/finance/billing')) {
      startTour('billing-center');
      return;
    }

    if (location.pathname.startsWith('/finance')) {
      const isFinanceOverviewRoute = location.pathname === '/finance' || location.pathname === '/finance/overview' || location.pathname === '/finance/hub';
      if (!isFinanceOverviewRoute) {
        window.sessionStorage.setItem(PENDING_TOUR_STORAGE_KEY, 'finance-overview');
        navigate('/finance/overview');
        return;
      }
      startTour('finance-overview');
      return;
    }

    const isDashboardRoute = location.pathname === '/' || location.pathname === '/dashboard';
    if (!isDashboardRoute) {
      window.sessionStorage.setItem(PENDING_TOUR_STORAGE_KEY, 'dashboard-overview');
      navigate('/dashboard');
      return;
    }
    startTour('dashboard-overview');
  };

  const toggleExpanded = (id: string) => {
    saveSidebarScroll(true);
    ignoreScrollSaveUntilRef.current = Date.now() + 400;
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
    const accent = itemAccents[item.id] || categoryAccents[item.category || 'main'] || sidebarColors.success;

    if (hasChildren) {
      return (
        <div key={item.id} className="relative">
          <button
            onClick={() => toggleExpanded(item.id)}
            className={cn(
              'group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
              !isParentItemActive && 'hover:bg-white'
            )}
            style={{
              backgroundColor: isParentItemActive ? `${accent}14` : 'transparent',
              color: isParentItemActive ? sidebarColors.text : sidebarColors.secondary,
              boxShadow: isParentItemActive ? `inset 0 0 0 1px ${accent}26` : undefined,
            }}
            aria-expanded={isExpanded}
          >
            {isParentItemActive && (
              <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full" style={{ backgroundColor: accent }} />
            )}
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition-all duration-200 group-hover:scale-[1.03]"
              style={{
                backgroundColor: isParentItemActive ? '#FFFFFF' : `${accent}10`,
                borderColor: isParentItemActive ? `${accent}40` : `${accent}1F`,
              }}
            >
              <item.icon className="h-4 w-4 transition-colors" style={{ color: accent }} />
            </span>
            {(!collapsed || isMobile) && (
              <>
                <span className="flex-1 text-right transition-colors">
                  {item.label}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                  style={{ color: isParentItemActive ? accent : sidebarColors.secondary }}
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
                className="mr-4 mt-1 space-y-1 overflow-hidden border-r pr-2"
                style={{ borderColor: `${accent}26` }}
              >
                {item.children!.map((child) => {
                  const ChildIcon = child.icon;
                  const isChildActive = isActiveLink(child.href);
                  return (
                    <li key={child.id}>
                      <NavLink
                        to={child.href}
                        onPointerDown={() => saveSidebarScroll(true)}
                        onClick={handleLinkClick}
                        className={cn(
                          'group relative mr-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                          isChildActive && 'font-semibold'
                        )}
                        style={{
                          backgroundColor: isChildActive ? '#FFFFFF' : 'transparent',
                          color: isChildActive ? sidebarColors.text : sidebarColors.secondary,
                          boxShadow: isChildActive ? `inset 0 0 0 1px ${sidebarColors.border}` : undefined,
                        }}
                      >
                        {isChildActive && (
                          <span className="absolute right-[-12px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full" style={{ backgroundColor: accent }} />
                        )}
                        <span className="flex flex-shrink-0 items-center justify-center">
                          <ChildIcon className="h-3.5 w-3.5 transition-transform group-hover:scale-110" style={{ color: isChildActive ? accent : sidebarColors.secondary }} />
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
        onPointerDown={() => saveSidebarScroll(true)}
        onClick={handleLinkClick}
        className={cn(
          'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
          !isDirectActive && 'hover:bg-white'
        )}
        style={{
          backgroundColor: isDirectActive ? `${accent}14` : 'transparent',
          color: isDirectActive ? sidebarColors.text : sidebarColors.secondary,
          boxShadow: isDirectActive ? `inset 0 0 0 1px ${accent}26` : undefined,
        }}
      >
        {isDirectActive && (
          <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full" style={{ backgroundColor: accent }} />
        )}
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition-all duration-200 group-hover:scale-[1.03]"
          style={{
            backgroundColor: isDirectActive ? '#FFFFFF' : `${accent}10`,
            borderColor: isDirectActive ? `${accent}40` : `${accent}1F`,
          }}
        >
          <item.icon className="h-4 w-4" style={{ color: accent }} />
        </span>
        {(!collapsed || isMobile) && (
          <span>{item.label}</span>
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
        "fixed z-40",
        isMobile
          ? "top-0 right-0 bottom-0"
          : "top-3 right-3 bottom-3 h-[calc(100vh-1.5rem)]",
        "flex flex-col",
        "rounded-2xl",
        "border bg-white",
        "shadow-[0_18px_45px_rgba(2,6,23,0.08)]",
        isMobile && "rounded-none border-none"
      )}
      style={{ borderColor: sidebarColors.border }}
    >
      {/* Subtle top border for glass edge definition */}
      <div className="absolute left-4 right-4 top-0 h-1 rounded-b-full" style={{ background: `linear-gradient(90deg, ${sidebarColors.water}, ${sidebarColors.success}, ${sidebarColors.focus}, ${sidebarColors.alert})` }} />

      {/* === Header: Logo & Collapse Button === */}
      <div className="flex h-20 flex-shrink-0 items-center justify-between border-b px-4" style={{ borderColor: sidebarColors.border }}>
        {(!collapsed || isMobile) && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex items-center gap-3"
          >
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: sidebarColors.text }}>
              <span className="text-lg font-black tracking-tight text-white">F</span>
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full ring-2 ring-white" style={{ backgroundColor: sidebarColors.success }} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-black tracking-tight" style={{ color: sidebarColors.text }}>{t("fleetify")}</span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: sidebarColors.secondary }}>Fleet operations</span>
            </div>
          </motion.div>
        )}
        {(collapsed && !isMobile) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: sidebarColors.text }}
          >
            <span className="text-lg font-black text-white">F</span>
          </motion.div>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'rounded-lg p-1.5 transition-all hover:bg-slate-50',
              collapsed && 'absolute left-2 top-4'
            )}
            style={{ color: sidebarColors.secondary }}
            title={collapsed ? 'توسيع' : 'تصغير'}
            aria-label={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* === Search Trigger === */}
      {(!collapsed || isMobile) && (
        <div className="border-b px-3 py-3" style={{ borderColor: sidebarColors.border }}>
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="group flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs transition-all duration-200 hover:bg-white"
            style={{ backgroundColor: sidebarColors.inner, borderColor: sidebarColors.border, color: sidebarColors.secondary }}
            aria-label="بحث سريع"
          >
            <Search className="h-3.5 w-3.5 transition-colors" style={{ color: sidebarColors.water }} />
            <span className="flex-1 text-right">بحث سريع...</span>
            <kbd className="rounded-md border bg-white px-1.5 py-0.5 font-mono text-[10px]" style={{ borderColor: sidebarColors.border, color: sidebarColors.secondary }}>⌘K</kbd>
          </button>
        </div>
      )}

      {/* === Recent Pages === */}
      {(!collapsed || isMobile) && recentPages.length > 0 && (
        <div className="border-b px-3 py-2" style={{ borderColor: sidebarColors.border }}>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: sidebarColors.secondary }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sidebarColors.alert }} />
              المؤخر
            </span>
            <button
              onClick={() => setRecentPages([])}
              className="transition-colors"
              style={{ color: sidebarColors.secondary }}
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
                onPointerDown={() => saveSidebarScroll(true)}
                onClick={handleLinkClick}
                className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all hover:bg-white"
                style={{ color: sidebarColors.secondary }}
              >
                {page.icon && <page.icon className="w-3.5 h-3.5 transition-transform group-hover:scale-110" style={{ color: sidebarColors.water }} />}
                {page.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* === Start Tour Entry === */}
      {(!collapsed || isMobile) && (
        <div className="border-b px-3 py-3" style={{ borderColor: sidebarColors.border }}>
          <button
            onClick={handleStartDashboardTour}
            className="group relative w-full overflow-hidden rounded-xl border bg-white p-3 text-right shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderColor: `${sidebarColors.success}38` }}
            aria-label="ابدأ جولة تعريفية"
          >
            <span
              className="pointer-events-none absolute inset-y-0 right-0 w-1"
              style={{ backgroundColor: sidebarColors.success }}
            />
            <span className="flex items-start gap-3">
              <span
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
                style={{ backgroundColor: `${sidebarColors.success}14`, color: sidebarColors.success }}
              >
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black" style={{ color: sidebarColors.text }}>
                  ابدأ جولة تعريفية
                </span>
                <span className="mt-0.5 block text-[11px] font-medium leading-5" style={{ color: sidebarColors.secondary }}>
                  تعرّف على أهم الأدوات في أقل من دقيقة
                </span>
              </span>
            </span>
            <span className="mt-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1">
                {[0, 1, 2].map((step) => (
                  <span
                    key={step}
                    className="h-1.5 rounded-full transition-all duration-200"
                    style={{
                      width: step === 0 ? 18 : 7,
                      backgroundColor: step === 0 ? sidebarColors.success : `${sidebarColors.success}30`,
                    }}
                  />
                ))}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black"
                style={{ backgroundColor: `${sidebarColors.success}10`, color: sidebarColors.success }}
              >
                بدء الجولة
              </span>
            </span>
          </button>
        </div>
      )}

      {/* === Navigation with Categories === */}
      <nav
        ref={navScrollRef}
        onScroll={saveSidebarScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 scrollbar-thin scrollbar-track-transparent"
        style={{ scrollbarColor: `${sidebarColors.border} transparent` }}
      >
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
                <span className="text-[9px] font-bold tabular-nums" style={{ color: categoryAccents[category], fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", monospace' }}>
                  {String(categoryIndex).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: sidebarColors.secondary }}>
                  {categoryLabels[category]}
                </span>
                <span className="h-px flex-1" style={{ backgroundColor: sidebarColors.border }} />
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
              <div className="mx-3 mt-4 border-b" style={{ borderColor: sidebarColors.border }} />
            )}
          </motion.div>
        ))}
      </nav>

      {/* === Footer: Theme Toggle === */}
      {!isMobile && (
        <div className="flex items-center justify-between border-t px-3 py-2" style={{ borderColor: sidebarColors.border }}>
          <ThemeToggle />
          {(!collapsed) && (
            <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: sidebarColors.secondary }}>النظام</span>
          )}
        </div>
      )}

      {/* === User Profile Card === */}
      <div className="flex-shrink-0 border-t p-2.5" style={{ backgroundColor: sidebarColors.inner, borderColor: sidebarColors.border }}>
        <div
          className={cn(
            'group relative flex items-center gap-2.5 rounded-xl border bg-white p-2 transition-all duration-200',
            collapsed && !isMobile && 'justify-center'
          )}
          style={{ borderColor: sidebarColors.border }}
        >
          {(!collapsed || isMobile) && (
            <span className="absolute right-2 top-2 z-10 h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: sidebarColors.success }} />
          )}

          {/* Avatar */}
          <button
            onClick={() => {
              handleLinkClick();
              navigate('/profile');
            }}
            className={cn(
              'relative flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg text-xs font-black text-white transition-all',
              'hover:scale-105'
            )}
            style={{ backgroundColor: sidebarColors.text }}
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
                <p className="truncate text-xs font-bold" style={{ color: sidebarColors.text }}>{userName}</p>
                <p className="truncate text-[10px]" style={{ color: sidebarColors.secondary }}>{user?.email}</p>
              </button>
              <button
                onClick={handleSignOut}
                className={cn(
                  'flex-shrink-0 rounded-lg p-2 transition-all duration-200 hover:bg-slate-50'
                )}
                style={{ color: sidebarColors.alert }}
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
              className="absolute -left-1 -top-1 rounded-lg border bg-white p-1.5 transition-all"
              style={{ borderColor: sidebarColors.border, color: sidebarColors.alert }}
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
