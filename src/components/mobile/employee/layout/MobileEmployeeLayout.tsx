/**
 * Mobile Employee Layout
 * التخطيط الرئيسي لتطبيق مساحة عمل الموظف
 */

import React, { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  Star,
  Plus,
  Phone,
  Calendar,
  Edit3,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileEmployeeLayoutProps {
  children: ReactNode;
  showFAB?: boolean;
  showBottomNav?: boolean;
}

interface BottomNavTab {
  id: 'home' | 'collections' | 'contracts' | 'tasks' | 'performance';
  icon: React.ElementType;
  label: string;
  labelAr: string;
  path: string;
}

const bottomNavTabs: BottomNavTab[] = [
  { 
    id: 'home', 
    icon: Home, 
    label: 'Home', 
    labelAr: 'الرئيسية',
    path: '/mobile/employee/home'
  },
  { 
    id: 'collections', 
    icon: DollarSign, 
    label: 'Collections', 
    labelAr: 'التحصيل',
    path: '/mobile/employee/collections'
  },
  { 
    id: 'contracts', 
    icon: FileText, 
    label: 'Contracts', 
    labelAr: 'العقود',
    path: '/mobile/employee/contracts'
  },
  { 
    id: 'tasks', 
    icon: CheckCircle, 
    label: 'Tasks', 
    labelAr: 'المهام',
    path: '/mobile/employee/tasks'
  },
  { 
    id: 'performance', 
    icon: Star, 
    label: 'Performance', 
    labelAr: 'الأداء',
    path: '/mobile/employee/performance'
  },
];

interface FABAction {
  id: string;
  icon: React.ElementType;
  label: string;
  color: string;
}

const fabActions: FABAction[] = [
  { 
    id: 'call', 
    icon: Phone, 
    label: 'تسجيل مكالمة',
    color: 'bg-blue-600'
  },
  { 
    id: 'payment', 
    icon: CreditCard, 
    label: 'تسجيل دفعة',
    color: 'bg-emerald-600'
  },
  { 
    id: 'followup', 
    icon: Calendar, 
    label: 'جدولة موعد',
    color: 'bg-purple-600'
  },
  { 
    id: 'note', 
    icon: Edit3, 
    label: 'ملاحظة جديدة',
    color: 'bg-amber-600'
  },
];

export const MobileEmployeeLayout: React.FC<MobileEmployeeLayoutProps> = ({
  children,
  showFAB = true,
  showBottomNav = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showFABMenu, setShowFABMenu] = useState(false);

  // Determine current tab from location
  const getCurrentTab = (): string => {
    const path = location.pathname;
    if (path.includes('/collections')) return 'collections';
    if (path.includes('/contracts')) return 'contracts';
    if (path.includes('/tasks')) return 'tasks';
    if (path.includes('/performance')) return 'performance';
    return 'home';
  };

  const currentTab = getCurrentTab();

  const handleTabChange = (tab: BottomNavTab) => {
    navigate(tab.path);
  };

  const handleFABAction = (actionId: string) => {
    setShowFABMenu(false);
    
    // Dispatch custom event for FAB actions
    const event = new CustomEvent('fab-action', { detail: { action: actionId } });
    window.dispatchEvent(event);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: showBottomNav ? 'calc(70px + env(safe-area-inset-bottom))' : 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      dir="rtl"
    >
      {/* Main Content */}
      <div className="min-h-screen pb-safe">
        {children}
      </div>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/50 shadow-lg z-40"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="flex items-center justify-around h-[70px] px-2">
            {bottomNavTabs.map((tab) => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    'flex flex-col items-center justify-center relative px-4 py-2 rounded-2xl transition-all duration-200 min-w-[64px]',
                    isActive
                      ? 'text-teal-600'
                      : 'text-slate-400 hover:text-slate-600'
                  )}
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-teal-600/10 rounded-2xl"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}

                  {/* Icon */}
                  <motion.div
                    className="relative z-10"
                    animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Icon
                      className={cn(
                        'w-6 h-6 transition-colors',
                        isActive && 'drop-shadow-lg'
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </motion.div>

                  {/* Label */}
                  <span
                    className={cn(
                      'relative z-10 text-[10px] font-medium mt-1',
                      isActive ? 'opacity-100' : 'opacity-70'
                    )}
                  >
                    {tab.labelAr}
                  </span>

                  {/* Active Dot */}
                  {isActive && (
                    <motion.div
                      layoutId="activeDot"
                      className="absolute -bottom-1 w-1 h-1 bg-teal-600 rounded-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Floating Action Button (FAB) */}
      {showFAB && (
        <>
          {/* FAB Button */}
          <motion.button
            onClick={() => setShowFABMenu(!showFABMenu)}
            className={cn(
              'fixed bottom-[90px] left-6 z-50',
              'w-14 h-14 rounded-full',
              'bg-gradient-to-r from-teal-500 to-teal-600',
              'shadow-xl shadow-teal-500/40',
              'flex items-center justify-center',
              'text-white',
              'transition-all duration-300'
            )}
            style={{
              bottom: 'calc(90px + env(safe-area-inset-bottom))',
            }}
            whileTap={{ scale: 0.9 }}
            animate={showFABMenu ? { rotate: 45 } : { rotate: 0 }}
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </motion.button>

          {/* FAB Menu */}
          <AnimatePresence>
            {showFABMenu && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowFABMenu(false)}
                  className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                />

                {/* Menu Items */}
                <div className="fixed bottom-[160px] left-6 z-50 space-y-3"
                  style={{
                    bottom: 'calc(160px + env(safe-area-inset-bottom))',
                  }}
                >
                  {fabActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={action.id}
                        initial={{ opacity: 0, x: -20, scale: 0.8 }}
                        animate={{ 
                          opacity: 1, 
                          x: 0, 
                          scale: 1,
                          transition: { delay: index * 0.05 }
                        }}
                        exit={{ 
                          opacity: 0, 
                          x: -20, 
                          scale: 0.8,
                          transition: { delay: (fabActions.length - index - 1) * 0.05 }
                        }}
                        onClick={() => handleFABAction(action.id)}
                        className="flex items-center gap-3 group"
                        whileTap={{ scale: 0.95 }}
                      >
                        {/* Label */}
                        <motion.span
                          className="bg-white/95 backdrop-blur-xl px-4 py-2 rounded-xl text-sm font-medium text-slate-700 shadow-lg border border-slate-200/50 whitespace-nowrap"
                          whileHover={{ scale: 1.05 }}
                        >
                          {action.label}
                        </motion.span>

                        {/* Icon Button */}
                        <motion.div
                          className={cn(
                            'w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg',
                            action.color
                          )}
                          whileHover={{ scale: 1.1 }}
                        >
                          <Icon className="w-5 h-5" strokeWidth={2.5} />
                        </motion.div>
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default MobileEmployeeLayout;
