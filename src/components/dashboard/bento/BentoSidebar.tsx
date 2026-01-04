import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  {
    id: 'dashboard',
    label: 'الرئيسية',
    icon: LayoutDashboard,
    href: '/dashboard',
    category: 'main',
  },
  {
    id: 'customers',
    label: 'إدارة العملاء',
    icon: Users,
    category: 'operations',
    children: [
      { id: 'customers-list', label: 'قائمة العملاء', href: '/customers', icon: List },
      { id: 'customers-crm', label: 'إدارة العلاقات (CRM)', href: '/customers/crm', icon: HeartHandshake },
    ],
  },
  {
    id: 'fleet',
    label: 'إدارة الأسطول',
    icon: Car,
    category: 'operations',
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
    category: 'operations',
    children: [
      { id: 'quotations', label: 'عروض الأسعار', href: '/quotations', icon: ClipboardList },
      { id: 'contracts', label: 'العقود', href: '/contracts', icon: FileCheck },
    ],
  },
  {
    id: 'finance',
    label: 'المالية',
    icon: Banknote,
    href: '/finance/hub',
    category: 'management',
  },
  {
    id: 'hr',
    label: 'الموارد البشرية',
    icon: UserCheck,
    category: 'management',
    children: [
      { id: 'hr-employees', label: 'إدارة الموظفين', href: '/hr/employees', icon: UserCog },
      { id: 'hr-attendance', label: 'الحضور والإجازات', href: '/hr/attendance', icon: Clock },
      { id: 'hr-payroll', label: 'الرواتب', href: '/hr/payroll', icon: Receipt },
      { id: 'hr-reports', label: 'التقارير', href: '/hr/reports', icon: BarChart3 },
    ],
  },
  {
    id: 'legal',
    label: 'الشؤون القانونية',
    icon: Shield,
    category: 'management',
    children: [
      { id: 'legal-cases', label: 'تتبع القضايا', href: '/legal/cases', icon: Gavel },
      { id: 'legal-document-generator', label: 'مساعد الكتب الذكي', href: '/legal/document-generator', icon: BookOpen },
      { id: 'legal-documents', label: 'مستندات الشركة', href: '/legal/documents', icon: FolderOpen },
      { id: 'legal-delinquency', label: 'إدارة المتعثرات', href: '/legal/delinquency', icon: FileWarning },
    ],
  },
  {
    id: 'operations',
    label: 'العمليات',
    icon: Truck,
    category: 'management',
    children: [
      { id: 'dispatch', label: 'أذونات الصرف', href: '/fleet/dispatch-permits', icon: PackageCheck },
    ],
  },
  {
    id: 'tasks',
    label: 'إدارة المهام',
    icon: ListTodo,
    href: '/tasks',
    category: 'system',
  },
  {
    id: 'reports',
    label: 'التقارير',
    icon: BarChart3,
    href: '/reports',
    category: 'system',
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    icon: Settings,
    href: '/settings',
    category: 'system',
  },
];

// === Category Labels ===
const categoryLabels: Record<string, string> = {
  main: '',
  operations: 'التشغيل',
  management: 'الإدارة',
  system: 'النظام',
};

// === Group navigation by category ===
const groupedNavigation = navigation.reduce((acc, item) => {
  const category = item.category || 'main';
  if (!acc[category]) acc[category] = [];
  acc[category].push(item);
  return acc;
}, {} as Record<string, NavItem[]>);

// === Main Component ===
const BentoSidebar: React.FC<BentoSidebarProps> = ({ isMobile = false, onCloseMobile }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['customers', 'fleet']);

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

  const userName = user?.profile?.full_name || user?.email?.split('@')[0] || 'مستخدم';
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
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              isParentItemActive
                ? 'bg-gradient-to-l from-coral-500/10 to-orange-500/10 text-coral-600 border-r-2 border-coral-500'
                : isExpanded
                ? 'bg-neutral-100 text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
            )}
          >
            <item.icon className={cn(
              'w-5 h-5 flex-shrink-0 transition-colors',
              isParentItemActive ? 'text-coral-500' : ''
            )} />
            {(!collapsed || isMobile) && (
              <>
                <span className="flex-1 text-right">{item.label}</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    isExpanded && 'rotate-180'
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
                transition={{ duration: 0.2 }}
                className="overflow-hidden mr-2 mt-1 space-y-0.5 border-r-2 border-neutral-100"
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
                          'flex items-center gap-2.5 px-3 py-2 mr-2 rounded-lg text-sm transition-all duration-200',
                          isChildActive
                            ? 'bg-coral-500 text-white shadow-md shadow-coral-500/20 font-medium'
                            : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'
                        )}
                      >
                        <ChildIcon className={cn(
                          'w-4 h-4 flex-shrink-0',
                          isChildActive ? 'text-white' : 'text-neutral-400'
                        )} />
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

    // Simple link
    return (
      <NavLink
        key={item.id}
        to={item.href!}
        onClick={handleLinkClick}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isDirectActive
            ? 'bg-gradient-to-l from-coral-500 to-orange-500 text-white shadow-lg shadow-coral-500/25'
            : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
        )}
      >
        <item.icon className={cn(
          'w-5 h-5 flex-shrink-0',
          isDirectActive ? 'text-white' : ''
        )} />
        {(!collapsed || isMobile) && <span>{item.label}</span>}
      </NavLink>
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isMobile ? 288 : (collapsed ? 72 : 260) }}
      className={cn(
        // ✅ Fixed positioning - يبقى ثابتاً عند التمرير
        "fixed top-0 right-0 h-screen z-40",
        "bg-white flex flex-col shadow-sm",
        isMobile ? "border-none" : "border-l border-neutral-200"
      )}
    >
      {/* === Header: Logo & Collapse Button === */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-neutral-100 flex-shrink-0">
        {(!collapsed || isMobile) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-gradient-to-bl from-coral-500 to-orange-500 rounded-lg flex items-center justify-center shadow-md shadow-coral-500/20">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-neutral-900">Fleetify</span>
          </motion.div>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
            title={collapsed ? 'توسيع' : 'تصغير'}
          >
            {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* === Navigation with Categories === */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-thin scrollbar-thumb-neutral-200 scrollbar-track-transparent">
        {Object.entries(groupedNavigation).map(([category, items], categoryIndex) => (
          <div key={category} className={cn(categoryIndex > 0 && 'mt-4')}>
            {/* Category Label */}
            {categoryLabels[category] && (!collapsed || isMobile) && (
              <div className="px-3 py-2 mb-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  {categoryLabels[category]}
                </span>
              </div>
            )}
            
            {/* Category Items */}
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id}>{renderNavItem(item)}</li>
              ))}
            </ul>

            {/* Separator between categories */}
            {categoryIndex < Object.keys(groupedNavigation).length - 1 && (
              <div className="mt-4 mx-3 border-b border-neutral-100" />
            )}
          </div>
        ))}
      </nav>

      {/* === Compact User Profile === */}
      <div className="p-2 border-t border-neutral-100 flex-shrink-0 bg-neutral-50/50">
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded-lg',
            collapsed && !isMobile && 'justify-center'
          )}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-bl from-coral-500 to-orange-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 shadow-sm">
            {userInitials}
          </div>
          
          {/* User Info + Logout in one row */}
          {(!collapsed || isMobile) && (
            <div className="flex-1 flex items-center justify-between min-w-0">
              <div className="min-w-0">
                <p className="text-xs font-medium text-neutral-800 truncate">{userName}</p>
                <p className="text-[10px] text-neutral-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* Collapsed logout */}
          {collapsed && !isMobile && (
            <button
              onClick={handleSignOut}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

export default BentoSidebar;
