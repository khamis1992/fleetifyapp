import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  FileText, 
  Car, 
  BarChart3,
  Building2
} from 'lucide-react';
import { useModuleConfig } from '@/modules/core/hooks/useModuleConfig';
import { cn } from '@/lib/utils';

export const MobileNavigation: React.FC = () => {
  const location = useLocation();
  const { moduleContext, isLoading } = useModuleConfig();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  // Generate navigation items based on enabled modules
  const navigationItems = React.useMemo(() => {
    if (isLoading || !moduleContext) return [];
    
    const items = [
      { 
        name: 'الرئيسية', 
        href: '/dashboard', 
        icon: Home 
      }
    ];

    // Add modules based on what's enabled
    if (moduleContext.activeModules.includes('properties')) {
      items.push({
        name: 'العقارات', 
        href: '/properties', 
        icon: Building2 
      });
    }

    if (moduleContext.activeModules.includes('contracts') || moduleContext.activeModules.includes('customers')) {
      items.push({
        name: 'العقود', 
        href: '/contracts', 
        icon: FileText 
      });
    }

    if (moduleContext.activeModules.includes('vehicles')) {
      items.push({
        name: 'الأسطول', 
        href: '/fleet', 
        icon: Car 
      });
    }

    items.push({
      name: 'التقارير', 
      href: '/reports', 
      icon: BarChart3 
    });

    return items;
  }, [moduleContext, isLoading]);

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