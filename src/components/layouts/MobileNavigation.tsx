import * as React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  MoreHorizontal,
  Plus,
  Settings,
  HelpCircle,
  Search,
  DollarSign,
  FileEdit,
  FileText,
  Car
} from 'lucide-react';
import { useModuleConfig } from '@/modules/core/hooks/useModuleConfig';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { PRIMARY_NAVIGATION } from '@/navigation/navigationConfig';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavBadges } from '@/hooks/useNavBadges';
import { NavBadge } from '@/components/mobile/NavBadge';

const LONG_PRESS_DURATION = 300; // milliseconds

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}

export const MobileNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { moduleContext, isLoading } = useModuleConfig();
  const { hasCompanyAdminAccess, hasGlobalAccess } = useUnifiedCompanyAccess();
  const { data: badges } = useNavBadges();
  const { vibrate } = useHapticFeedback();

  const [showQuickActions, setShowQuickActions] = React.useState(false);
  const [activeNavItem, setActiveNavItem] = React.useState<string | null>(null);
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const touchStartTimeRef = React.useRef<number>(0);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  // Generate navigation items based on PRIMARY_NAVIGATION and enabled modules
  const navigationItems = React.useMemo(() => {
    if (isLoading || !moduleContext || !moduleContext.activeModules || !Array.isArray(moduleContext.activeModules)) return [];

    // Map PRIMARY_NAVIGATION to mobile bottom nav items
    const items: Array<{
      name: string;
      href: string;
      icon: React.ElementType;
      badgeKey: string;
    }> = [];

    PRIMARY_NAVIGATION.forEach((section) => {
      // Check permissions
      if (section.requiresSuperAdmin && !hasGlobalAccess) return;
      if (section.requiresAdmin && !hasCompanyAdminAccess && !hasGlobalAccess) return;

      // Check module context
      if (section.id === 'fleet' && !moduleContext.activeModules.includes('vehicles')) return;
      if (section.id === 'quotations-contracts' && 
          !moduleContext.activeModules.includes('contracts') && 
          !moduleContext.activeModules.includes('customers')) return;
      if (section.id === 'finance' && !moduleContext.activeModules.includes('finance')) return;
      if (section.id === 'hr' && !moduleContext.activeModules.includes('hr')) return;
      if (section.id === 'inventory' && !moduleContext.activeModules.includes('inventory')) return;
      if (section.id === 'sales' && !moduleContext.activeModules.includes('sales')) return;

      // For mobile bottom nav, use the main href if available, otherwise use first submenu item
      if (section.href) {
        items.push({
          name: section.name,
          href: section.href,
          icon: section.icon,
          badgeKey: section.id
        });
      } else if (section.submenu && section.submenu.length > 0) {
        // Use first submenu item as the main link
        const firstSubItem = section.submenu[0];
        items.push({
          name: section.name,
          href: firstSubItem.href,
          icon: section.icon,
          badgeKey: section.id
        });
      }
    });

    return items;
  }, [moduleContext, isLoading, hasCompanyAdminAccess, hasGlobalAccess]);

  // Get quick actions based on current nav item
  const getQuickActions = React.useCallback((href: string): QuickAction[] => {
    switch (href) {
      case '/dashboard':
        return [
          {
            id: 'new-contract',
            label: 'عقد جديد',
            icon: FileText,
            onClick: () => navigate('/contracts')
          },
          {
            id: 'new-customer',
            label: 'عميل جديد',
            icon: Users,
            onClick: () => navigate('/customers')
          },
          {
            id: 'new-vehicle',
            label: 'مركبة جديدة',
            icon: Car,
            onClick: () => navigate('/fleet')
          },
          {
            id: 'search',
            label: 'بحث',
            icon: Search,
            onClick: () => navigate('/search')
          }
        ];

      case '/contracts':
        return [
          {
            id: 'add-contract',
            label: 'عقد جديد',
            icon: Plus,
            onClick: () => {
              // This would be handled by parent page
              console.log('Add contract');
            }
          },
          {
            id: 'search-contracts',
            label: 'بحث في العقود',
            icon: Search,
            onClick: () => navigate('/search?type=contracts')
          },
          {
            id: 'bulk-invoice',
            label: 'فواتير جماعية',
            icon: FileEdit,
            onClick: () => {
              console.log('Bulk invoice');
            }
          }
        ];

      case '/customers':
        return [
          {
            id: 'add-customer',
            label: 'عميل جديد',
            icon: Plus,
            onClick: () => {
              console.log('Add customer');
            }
          },
          {
            id: 'search-customers',
            label: 'بحث في العملاء',
            icon: Search,
            onClick: () => navigate('/search?type=customers')
          },
          {
            id: 'import-customers',
            label: 'استيراد عملاء',
            icon: FileEdit,
            onClick: () => {
              console.log('Import customers');
            }
          }
        ];

      case '/fleet':
        return [
          {
            id: 'add-vehicle',
            label: 'مركبة جديدة',
            icon: Plus,
            onClick: () => {
              console.log('Add vehicle');
            }
          },
          {
            id: 'maintenance',
            label: 'صيانة',
            icon: Settings,
            onClick: () => navigate('/fleet/maintenance')
          },
          {
            id: 'search-vehicles',
            label: 'بحث في المركبات',
            icon: Search,
            onClick: () => navigate('/search?type=vehicles')
          }
        ];

      case '/reports':
        return [
          {
            id: 'financial-reports',
            label: 'تقارير مالية',
            icon: DollarSign,
            onClick: () => navigate('/finance/reports')
          },
          {
            id: 'contracts-reports',
            label: 'تقارير العقود',
            icon: FileText,
            onClick: () => navigate('/reports/contracts')
          },
          {
            id: 'fleet-reports',
            label: 'تقارير الأسطول',
            icon: Car,
            onClick: () => navigate('/fleet/reports')
          }
        ];

      default:
        return [];
    }
  }, [navigate]);

  // Handle long press start
  const handlePressStart = React.useCallback((href: string) => {
    touchStartTimeRef.current = Date.now();

    longPressTimerRef.current = setTimeout(() => {
      const actions = getQuickActions(href);
      if (actions.length > 0) {
        vibrate('medium');
        setActiveNavItem(href);
        setShowQuickActions(true);
      }
    }, LONG_PRESS_DURATION);
  }, [getQuickActions, vibrate]);

  // Handle long press end
  const handlePressEnd = React.useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Close quick actions menu
  const handleCloseQuickActions = React.useCallback(() => {
    setShowQuickActions(false);
    setActiveNavItem(null);
  }, []);

  // Handle quick action click
  const handleQuickActionClick = React.useCallback((action: QuickAction) => {
    vibrate('light');
    action.onClick();
    handleCloseQuickActions();
  }, [vibrate, handleCloseQuickActions]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Animation variants for quick actions menu
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } }
  };

  const menuVariants = {
    hidden: { y: '100%', opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } }
  };

  if (isLoading) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div className="grid grid-cols-5 h-mobile-bottom-nav">
          {/* Loading skeleton */}
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center justify-center gap-1 py-2 px-1">
              <div className="h-5 w-5 bg-muted rounded-full animate-pulse" />
              <div className="h-3 w-12 bg-muted rounded-full animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-mobile-safe-bottom bg-card" />
      </nav>
    );
  }

  return (
    <>
      <nav className="native-bottom-nav">
        <div className="grid grid-cols-4 w-full h-full items-center justify-items-center">
          {navigationItems.slice(0, 4).map((item) => {
            const active = isActive(item.href);
            const badge = badges?.[item.badgeKey];

            return (
              <NavLink
                key={item.href}
                to={item.href}
                onMouseDown={() => handlePressStart(item.href)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={() => handlePressStart(item.href)}
                onTouchEnd={handlePressEnd}
                onTouchCancel={handlePressEnd}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 w-full h-full py-2 transition-colors relative",
                  active
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
                aria-label={item.name}
              >
                <div className="relative">
                  <item.icon
                    className={cn(
                      "h-6 w-6 transition-all",
                      active && "scale-110 text-primary"
                    )}
                  />
                  {/* Badge on icon */}
                  {badge && (
                    <NavBadge
                      badge={badge}
                      position="top-right"
                      showTooltip={false}
                    />
                  )}
                </div>
                <span className="text-xs font-medium leading-tight text-center px-1">
                  {item.name}
                </span>
                {/* Active indicator */}
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-full" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Quick Actions Menu */}
      <AnimatePresence>
        {showQuickActions && activeNavItem && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleCloseQuickActions}
            className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="fixed bottom-0 left-0 right-0 z-[61] bg-card border-t border-border rounded-t-3xl shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">
                  إجراءات سريعة
                </h3>
                <button
                  onClick={handleCloseQuickActions}
                  className={cn(
                    'h-8 w-8 rounded-full',
                    'flex items-center justify-center',
                    'hover:bg-accent',
                    'transition-colors'
                  )}
                  aria-label="إغلاق"
                >
                  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Quick Actions */}
              <div className="p-4 space-y-2">
                {getQuickActions(activeNavItem).map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        transition: { delay: index * 0.05, duration: 0.2 }
                      }}
                    >
                      <Button
                        onClick={() => handleQuickActionClick(action)}
                        variant="outline"
                        className={cn(
                          'w-full h-14 justify-start gap-3',
                          'text-base font-medium'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {action.label}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Safe area spacing */}
              <div className="h-mobile-safe-bottom bg-card rounded-b-3xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
