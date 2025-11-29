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
  ChevronRight,
  LogOut,
  Wrench,
  Receipt,
  CreditCard,
  Building2,
  UserCog,
  BarChart3,
  CalendarDays,
  Truck,
  FileCheck,
  PanelLeftClose,
  PanelLeft,
  PhoneCall,
  UserCheck,
  Clock,
  DollarSign,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: { id: string; label: string; href: string }[];
}

interface BentoSidebarProps {
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

const navigation: NavItem[] = [
  {
    id: 'dashboard',
    label: 'الرئيسية',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    id: 'customers',
    label: 'إدارة العملاء',
    icon: Users,
    children: [
      { id: 'customers-list', label: 'قائمة العملاء', href: '/customers' },
      { id: 'customers-crm', label: 'إدارة العلاقات (CRM)', href: '/customers/crm' },
    ],
  },
  {
    id: 'fleet',
    label: 'إدارة الأسطول',
    icon: Car,
    children: [
      { id: 'vehicles', label: 'المركبات', href: '/fleet' },
      { id: 'maintenance', label: 'الصيانة', href: '/fleet/maintenance' },
      { id: 'reservations', label: 'الحجوزات', href: '/fleet/reservations' },
      { id: 'violations', label: 'المخالفات المرورية', href: '/fleet/traffic-violations' },
      { id: 'fleet-reports', label: 'تقارير الأسطول', href: '/fleet/reports' },
    ],
  },
  {
    id: 'quotations-contracts',
    label: 'العروض والعقود',
    icon: FileText,
    children: [
      { id: 'quotations', label: 'عروض الأسعار', href: '/quotations' },
      { id: 'contracts', label: 'العقود', href: '/contracts' },
    ],
  },
  {
    id: 'finance',
    label: 'المالية',
    icon: Banknote,
    href: '/finance/hub',
  },
  {
    id: 'hr',
    label: 'الموارد البشرية',
    icon: UserCheck,
    children: [
      { id: 'hr-employees', label: 'إدارة الموظفين', href: '/hr/employees' },
      { id: 'hr-attendance', label: 'الحضور والإجازات', href: '/hr/attendance' },
      { id: 'hr-payroll', label: 'الرواتب', href: '/hr/payroll' },
      { id: 'hr-reports', label: 'التقارير', href: '/hr/reports' },
    ],
  },
  {
    id: 'legal',
    label: 'الشؤون القانونية',
    icon: Shield,
    children: [
      { id: 'legal-advisor', label: 'المستشار القانوني', href: '/legal/advisor' },
      { id: 'legal-cases', label: 'تتبع القضايا', href: '/legal/cases' },
    ],
  },
  {
    id: 'operations',
    label: 'العمليات',
    icon: Truck,
    children: [
      { id: 'dispatch', label: 'أذونات الصرف', href: '/fleet/dispatch-permits' },
    ],
  },
  {
    id: 'reports',
    label: 'التقارير',
    icon: BarChart3,
    href: '/reports',
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    icon: Settings,
    href: '/settings',
  },
];

const BentoSidebar: React.FC<BentoSidebarProps> = ({ isMobile = false, onCloseMobile }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['customers', 'fleet', 'finance']);

  // Handle link click on mobile
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

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const userName = user?.profile?.full_name || user?.email?.split('@')[0] || 'مستخدم';
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isMobile ? 288 : (collapsed ? 72 : 260) }}
      className={cn(
        "h-screen bg-white flex flex-col shadow-sm",
        isMobile ? "border-none" : "border-l border-neutral-200"
      )}
    >
      {/* Logo & Collapse */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-100">
        {(!collapsed || isMobile) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-coral-500 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-neutral-900">Fleetify</span>
          </motion.div>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500"
          >
            {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.id}>
              {item.children ? (
                // Expandable item
                <div>
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      expandedItems.includes(item.id)
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:bg-neutral-50'
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {(!collapsed || isMobile) && (
                      <>
                        <span className="flex-1 text-right">{item.label}</span>
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform',
                            expandedItems.includes(item.id) && 'rotate-180'
                          )}
                        />
                      </>
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedItems.includes(item.id) && (!collapsed || isMobile) && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mr-4 mt-1 space-y-1"
                      >
                        {item.children.map((child) => (
                          <li key={child.id}>
                            <NavLink
                              to={child.href}
                              onClick={handleLinkClick}
                              className={({ isActive }) =>
                                cn(
                                  'block px-3 py-2 rounded-lg text-sm transition-colors',
                                  isActive
                                    ? 'bg-coral-50 text-coral-600 font-medium'
                                    : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'
                                )
                              }
                            >
                              {child.label}
                            </NavLink>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                // Simple link
                <NavLink
                  to={item.href!}
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-coral-500 text-white shadow-sm'
                        : 'text-neutral-600 hover:bg-neutral-50'
                    )
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {(!collapsed || isMobile) && <span>{item.label}</span>}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-neutral-100">
        <div
          className={cn(
            'flex items-center gap-3 p-3 rounded-xl bg-neutral-50',
            collapsed && !isMobile && 'justify-center'
          )}
        >
          <div className="w-10 h-10 rounded-full bg-coral-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {userInitials}
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">{userName}</p>
              <p className="text-xs text-neutral-400 truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className={cn(
            'w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors',
            collapsed && !isMobile && 'justify-center'
          )}
        >
          <LogOut className="w-4 h-4" />
          {(!collapsed || isMobile) && <span>تسجيل الخروج</span>}
        </button>
      </div>
    </motion.aside>
  );
};

export default BentoSidebar;

