import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useModuleConfig } from '@/modules/core/hooks/useModuleConfig';
import { AdminOnly, SuperAdminOnly } from '@/components/common/PermissionGuard';
import { PRIMARY_NAVIGATION, SETTINGS_ITEMS } from '@/navigation/navigationConfig';
import { 
  LogOut,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LazyImage } from '@/components/common/LazyImage';

export function MobileSidebar() {
  const { signOut } = useAuth();
  const location = useLocation();
  const { hasCompanyAdminAccess, hasGlobalAccess } = useUnifiedCompanyAccess();
  const { moduleContext, isLoading } = useModuleConfig();

  const handleSignOut = async () => {
    await signOut();
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const getNavClassName = ({ isActive: active }: { isActive: boolean }) => 
    cn(
      "flex items-center gap-3 w-full px-4 py-3 text-right transition-colors rounded-md",
      active 
        ? "bg-primary/10 text-primary font-medium border-r-4 border-primary" 
        : "text-foreground hover:bg-accent/60"
    );

  // Filter navigation items based on module context and permissions
  const filteredNavigationItems = React.useMemo(() => {
    return PRIMARY_NAVIGATION.filter((section) => {
      // Check permissions
      if (section.requiresSuperAdmin && !hasGlobalAccess) return false;
      if (section.requiresAdmin && !hasCompanyAdminAccess && !hasGlobalAccess) return false;

      // Check module context
      if (section.id === 'fleet' && !moduleContext?.activeModules.includes('vehicles')) return false;
      if (section.id === 'quotations-contracts' && 
          !moduleContext?.activeModules.includes('contracts') && 
          !moduleContext?.activeModules.includes('customers')) return false;
      if (section.id === 'finance' && !moduleContext?.activeModules.includes('finance')) return false;
      if (section.id === 'hr' && !moduleContext?.activeModules.includes('hr')) return false;
      if (section.id === 'inventory' && !moduleContext?.activeModules.includes('inventory')) return false;
      if (section.id === 'sales' && !moduleContext?.activeModules.includes('sales')) return false;

      return true;
    });
  }, [moduleContext, hasCompanyAdminAccess, hasGlobalAccess]);

  const renderNavItem = (section: typeof PRIMARY_NAVIGATION[0]) => {
    const isSectionActive = section.href ? isActive(section.href) : 
      section.submenu?.some(item => isActive(item.href)) || false;
    const hasSubmenu = section.submenu && section.submenu.length > 0;

    if (!hasSubmenu && section.href) {
      // Simple menu item without submenu
      return (
        <NavLink key={section.id} to={section.href} className={getNavClassName}>
          <section.icon className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">{section.name}</span>
        </NavLink>
      );
    }

    // Menu item with submenu
    return (
      <Collapsible key={section.id} defaultOpen={isSectionActive}>
        <CollapsibleTrigger className="flex items-center gap-3 w-full px-4 py-3 text-right transition-colors rounded-md hover:bg-accent/60">
          <section.icon className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium flex-1">{section.name}</span>
          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mr-8 mt-1 space-y-1">
            {section.submenu?.map((subItem) => (
              <NavLink key={subItem.id} to={subItem.href} className={getNavClassName}>
                <subItem.icon className="h-4 w-4 flex-shrink-0" />
                <span>{subItem.name}</span>
              </NavLink>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="h-16 w-16 bg-muted rounded-lg animate-pulse" />
            <div className="h-3 w-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
        
        {/* Loading Content */}
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <LazyImage 
            src="/receipts/logo.png" 
            alt="Fleetify Logo" 
            className="h-16 w-auto"
          />
          <p className="text-xs text-muted-foreground">نظام إدارة تأجير السيارات</p>
        </div>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Main Navigation */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-muted-foreground mb-3 px-3">
            القائمة الرئيسية
          </h3>
          <div className="space-y-1">
            {filteredNavigationItems.map((section) => renderNavItem(section))}
          </div>
        </div>

        {/* Settings Section */}
        {(hasCompanyAdminAccess || hasGlobalAccess) && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-muted-foreground mb-3 px-3">
              الإعدادات والإدارة
            </h3>
            <div className="space-y-1">
              {/* Finance Settings */}
              {SETTINGS_ITEMS.finance && SETTINGS_ITEMS.finance.length > 0 && (() => {
                const FinanceIcon = SETTINGS_ITEMS.finance[0].icon;
                return (
                  <AdminOnly hideIfNoAccess>
                    <Collapsible defaultOpen={location.pathname.startsWith('/finance/accounting-wizard') || 
                      location.pathname.startsWith('/finance/account-mappings') ||
                      location.pathname.startsWith('/finance/budgets') ||
                      location.pathname.startsWith('/finance/cost-centers') ||
                      location.pathname.startsWith('/finance/vendors') ||
                      location.pathname.startsWith('/finance/assets')}>
                      <CollapsibleTrigger className="flex items-center gap-3 w-full px-4 py-3 text-right transition-colors rounded-md hover:bg-accent/60">
                        <FinanceIcon className="h-5 w-5 flex-shrink-0" />
                        <span className="font-medium flex-1">إعدادات المالية</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mr-8 mt-1 space-y-1">
                          {SETTINGS_ITEMS.finance.map((settingItem) => (
                            <NavLink key={settingItem.id} to={settingItem.href!} className={getNavClassName}>
                              <settingItem.icon className="h-4 w-4 flex-shrink-0" />
                              <span>{settingItem.name}</span>
                            </NavLink>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </AdminOnly>
                );
              })()}

              {/* HR Settings */}
              {SETTINGS_ITEMS.hr && SETTINGS_ITEMS.hr.length > 0 && (() => {
                const HRIcon = SETTINGS_ITEMS.hr[0].icon;
                return (
                  <AdminOnly hideIfNoAccess>
                    <Collapsible defaultOpen={location.pathname.startsWith('/hr/location-settings') || 
                      location.pathname.startsWith('/hr/settings')}>
                      <CollapsibleTrigger className="flex items-center gap-3 w-full px-4 py-3 text-right transition-colors rounded-md hover:bg-accent/60">
                        <HRIcon className="h-5 w-5 flex-shrink-0" />
                        <span className="font-medium flex-1">إعدادات الموارد البشرية</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mr-8 mt-1 space-y-1">
                          {SETTINGS_ITEMS.hr.map((settingItem) => (
                            <NavLink key={settingItem.id} to={settingItem.href!} className={getNavClassName}>
                              <settingItem.icon className="h-4 w-4 flex-shrink-0" />
                              <span>{settingItem.name}</span>
                            </NavLink>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </AdminOnly>
                );
              })()}

              {/* Admin Settings */}
              {SETTINGS_ITEMS.admin && SETTINGS_ITEMS.admin.length > 0 && (() => {
                const AdminIcon = SETTINGS_ITEMS.admin[0].icon;
                return (
                  <SuperAdminOnly hideIfNoAccess>
                    <Collapsible defaultOpen={location.pathname.startsWith('/approvals') || 
                      location.pathname.startsWith('/audit') ||
                      location.pathname.startsWith('/backup')}>
                      <CollapsibleTrigger className="flex items-center gap-3 w-full px-4 py-3 text-right transition-colors rounded-md hover:bg-accent/60">
                        <AdminIcon className="h-5 w-5 flex-shrink-0" />
                        <span className="font-medium flex-1">إدارة النظام</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mr-8 mt-1 space-y-1">
                          {SETTINGS_ITEMS.admin.map((adminItem) => {
                            if (adminItem.requiresSuperAdmin && !hasGlobalAccess) return null;
                            return (
                              <NavLink key={adminItem.id} to={adminItem.href!} className={getNavClassName}>
                                <adminItem.icon className="h-4 w-4 flex-shrink-0" />
                                <span>{adminItem.name}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </SuperAdminOnly>
                );
              })()}
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="mt-auto pt-4 border-t border-border">
          <Button 
            onClick={handleSignOut}
            variant="ghost" 
            className="w-full justify-start gap-3 px-4 py-3 text-right text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">تسجيل الخروج</span>
          </Button>
        </div>
      </div>
    </div>
  );
}