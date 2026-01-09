import React, { ReactNode } from 'react';
import { Home, FileText, Car, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  currentTab?: 'home' | 'contracts' | 'cars' | 'overdue';
  onTabChange?: (tab: 'home' | 'contracts' | 'cars' | 'overdue') => void;
}

interface DockItem {
  id: 'home' | 'contracts' | 'cars' | 'overdue';
  icon: React.ElementType;
  label: string;
  labelAr: string;
}

const dockItems: DockItem[] = [
  { id: 'home', icon: Home, label: 'Home', labelAr: 'الرئيسية' },
  { id: 'contracts', icon: FileText, label: 'Contracts', labelAr: 'العقود' },
  { id: 'cars', icon: Car, label: 'Cars', labelAr: 'السيارات' },
  { id: 'overdue', icon: AlertCircle, label: 'Overdue', labelAr: 'المتأخرات' },
];

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  currentTab = 'home',
  onTabChange,
}) => {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'calc(60px + env(safe-area-inset-bottom))',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      dir="rtl"
    >
      {/* Main Content Area */}
      <div className="min-h-screen pb-safe">
        {children}
      </div>

      {/* Bottom Dock Navigation */}
      {onTabChange && (
        <nav
          className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/50 shadow-lg"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="flex items-center justify-around h-16 px-2">
            {dockItems.map((item) => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    'flex flex-col items-center justify-center relative px-4 py-2 rounded-2xl transition-all duration-200 min-w-[64px]',
                    isActive
                      ? 'text-teal-600'
                      : 'text-slate-400 hover:text-slate-600'
                  )}
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-teal-600/10 rounded-2xl"
                    />
                  )}

                  {/* Icon */}
                  <div
                    className={cn(
                      'relative z-10',
                      isActive && 'scale-110'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-6 h-6 transition-colors',
                        isActive && 'drop-shadow-lg'
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      'relative z-10 text-[10px] font-medium mt-1',
                      isActive ? 'opacity-100' : 'opacity-70'
                    )}
                  >
                    {item.labelAr}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default MobileLayout;
