import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  FileText, 
  Car, 
  BarChart3,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigationItems = [
  { 
    name: 'الرئيسية', 
    href: '/dashboard', 
    icon: Home 
  },
  { 
    name: 'العقارات', 
    href: '/properties', 
    icon: Home 
  },
  { 
    name: 'العقود', 
    href: '/contracts', 
    icon: FileText 
  },
  { 
    name: 'الأسطول', 
    href: '/fleet', 
    icon: Car 
  },
  { 
    name: 'التقارير', 
    href: '/reports', 
    icon: BarChart3 
  }
];

export const MobileNavigation: React.FC = () => {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      <div className="grid grid-cols-5 h-mobile-bottom-nav">
        {navigationItems.map((item) => {
          const active = isActive(item.href);
          
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-1 transition-colors",
                "hover:bg-accent/50 active:bg-accent",
                active 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon 
                className={cn(
                  "h-5 w-5 transition-all",
                  active && "scale-110"
                )} 
              />
              <span className="text-xs font-medium leading-none">
                {item.name}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </NavLink>
          );
        })}
      </div>
      
      {/* Safe area spacing for devices with home indicators */}
      <div className="h-mobile-safe-bottom bg-card" />
    </nav>
  );
};