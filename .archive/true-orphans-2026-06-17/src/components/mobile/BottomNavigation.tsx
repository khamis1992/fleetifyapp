/**
 * Bottom Navigation Component
 * Mobile-first bottom navigation bar with:
 * - 5 main navigation items
 * - Active state indicator
 * - Badge support for notifications
 * - FAB (Floating Action Button) integration
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  FileText,
  Users,
  Car,
  DollarSign,
  Plus,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface BottomNavigationProps {
  /** Navigation items */
  items?: NavItem[];
  /** Show FAB button */
  showFab?: boolean;
  /** FAB click handler */
  onFabClick?: () => void;
  /** FAB icon */
  fabIcon?: React.ElementType;
  /** Hide on certain paths */
  hiddenPaths?: string[];
  /** Additional class name */
  className?: string;
}

// Default navigation items
const defaultNavItems: NavItem[] = [
  { path: '/dashboard', label: 'الرئيسية', icon: Home },
  { path: '/contracts', label: 'العقود', icon: FileText },
  { path: '/customers', label: 'العملاء', icon: Users },
  { path: '/fleet', label: 'الأسطول', icon: Car },
  { path: '/finance/hub', label: 'المالية', icon: DollarSign },
];

// Navigation Item Component
const NavItem: React.FC<{
  item: NavItem;
  isActive: boolean;
}> = ({ item, isActive }) => {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 relative',
        'min-w-[60px] py-2 px-1 rounded-lg transition-colors',
        isActive
          ? 'text-coral-600'
          : 'text-neutral-500 hover:text-neutral-700'
      )}
    >
      {/* Active Indicator */}
      {isActive && (
        <motion.div
          layoutId="bottomNavIndicator"
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-rose-500 rounded-full"
          initial={false}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}

      {/* Icon with Badge */}
      <div className="relative">
        <Icon className={cn('h-6 w-6', isActive && 'text-coral-600')} />
        {item.badge !== undefined && item.badge > 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1 min-w-[18px] h-[18px]',
              'flex items-center justify-center',
              'text-[10px] font-bold text-white bg-red-500 rounded-full px-1'
            )}
          >
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          'text-[10px] font-medium leading-tight',
          isActive ? 'text-coral-600' : 'text-neutral-500'
        )}
      >
        {item.label}
      </span>
    </NavLink>
  );
};

// Floating Action Button
const FAB: React.FC<{
  onClick: () => void;
  icon: React.ElementType;
}> = ({ onClick, icon: Icon }) => (
  <motion.button
    onClick={onClick}
    className={cn(
      'absolute -top-6 left-1/2 -translate-x-1/2',
      'w-14 h-14 rounded-full',
      'bg-rose-500 hover:bg-coral-600 text-white',
      'shadow-lg shadow-rose-500/30',
      'flex items-center justify-center',
      'active:scale-95 transition-transform'
    )}
    whileTap={{ scale: 0.95 }}
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
  >
    <Icon className="h-6 w-6" />
  </motion.button>
);

// Main Component
export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  items = defaultNavItems,
  showFab = false,
  onFabClick,
  fabIcon = Plus,
  hiddenPaths = ['/auth', '/super-admin'],
  className,
}) => {
  const location = useLocation();

  // Check if should hide on current path
  const shouldHide = hiddenPaths.some((path) =>
    location.pathname.startsWith(path)
  );

  if (shouldHide) return null;

  // Only show on mobile
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white border-t border-neutral-200',
        'safe-area-inset-bottom', // For notched devices
        'md:hidden', // Hide on desktop
        className
      )}
    >
      {/* FAB */}
      {showFab && onFabClick && <FAB onClick={onFabClick} icon={fabIcon} />}

      {/* Navigation Items */}
      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            isActive={location.pathname.startsWith(item.path)}
          />
        ))}
      </div>

      {/* Safe area spacer for iOS */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
};

// Mobile Page Container (adds bottom padding for nav)
export const MobilePageContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}> = ({ children, className, noPadding }) => (
  <div
    className={cn(
      'min-h-screen',
      'pb-20 md:pb-0', // Bottom padding for mobile nav
      !noPadding && 'p-4',
      className
    )}
  >
    {children}
  </div>
);

export default BottomNavigation;

