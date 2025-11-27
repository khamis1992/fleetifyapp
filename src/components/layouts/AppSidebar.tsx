
import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { AdminOnly, SuperAdminOnly } from '@/components/common/PermissionGuard';

import { PRIMARY_NAVIGATION, SETTINGS_ITEMS } from '@/navigation/navigationConfig';
import {
  DollarSign,
  LogOut,
  ChevronDown,
  UserCog,
  Shield,
  Headphones,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/common/LazyImage';

// Navigation items are now loaded from centralized config
// This ensures consistency across the entire application

export function AppSidebar() {
  const { signOut } = useAuth();
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { hasCompanyAdminAccess, hasGlobalAccess } = useUnifiedCompanyAccess();

  const handleSignOut = async () => {
    await signOut();
  };

  const getNavClassName = ({ isActive: active }: { isActive: boolean }) => 
    active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/60";

  const renderNavItem = (section: typeof PRIMARY_NAVIGATION[0]) => {
    // Check permissions
    if (section.requiresSuperAdmin && !hasGlobalAccess) return null;
    if (section.requiresAdmin && !hasCompanyAdminAccess && !hasGlobalAccess) return null;

    const isSectionActive = section.href ? location.pathname.startsWith(section.href) : false;
    const hasSubmenu = section.submenu && section.submenu.length > 0;

    if (!hasSubmenu && section.href) {
      // Simple menu item without submenu
      return (
        <SidebarMenuItem key={section.id}>
          <SidebarMenuButton asChild className="h-10">
            <NavLink 
              to={section.href} 
              className={getNavClassName}
            >
              <section.icon className="h-4 w-4" />
              {(!collapsed || isMobile) && <span className="font-medium">{section.name}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    // Menu item with submenu
    return (
      <SidebarMenuItem key={section.id}>
        <Collapsible defaultOpen={isSectionActive}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="h-10">
              <section.icon className="h-4 w-4" />
              {(!collapsed || isMobile) && (
                <>
                  <span className="font-medium">{section.name}</span>
                  <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </>
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {section.submenu!.map((subItem) => (
                <SidebarMenuSubItem key={subItem.id}>
                  <SidebarMenuSubButton asChild>
                    <NavLink 
                      to={subItem.href} 
                      className={getNavClassName}
                    >
                      <subItem.icon className="h-4 w-4" />
                      {(!collapsed || isMobile) && <span>{subItem.name}</span>}
                    </NavLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar side="right" className="border-l border-sidebar-border bg-sidebar-background">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <LazyImage 
            src="/uploads/b8725fdf-dfaa-462a-b7fe-e9c9a86d17c2.png" 
            alt="Fleetify Logo" 
            className="h-16 w-auto filter brightness-0 invert"
          />
          {(!collapsed || isMobile) && (
            <p className="text-xs text-sidebar-foreground/60">نظام إدارة تأجير السيارات</p>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/60 mb-2">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PRIMARY_NAVIGATION.map((section) => renderNavItem(section))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Section */}
        {(hasCompanyAdminAccess || hasGlobalAccess) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/60 mb-2">
              الإعدادات والإدارة
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Finance Settings */}
                {SETTINGS_ITEMS.finance && SETTINGS_ITEMS.finance.length > 0 && (
                  <SidebarMenuItem>
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="h-10">
                          <DollarSign className="h-4 w-4" />
                          {(!collapsed || isMobile) && (
                            <>
                              <span className="font-medium">إعدادات المالية</span>
                              <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {(SETTINGS_ITEMS.finance as any[])?.map((item: any) => (
                            <SidebarMenuSubItem key={item.id}>
                              <SidebarMenuSubButton asChild>
                                <NavLink to={item.href as string} className={getNavClassName}>
                                  <item.icon className="h-4 w-4" />
                                  {(!collapsed || isMobile) && <span>{item.name}</span>}
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                )}

                {/* HR Settings */}
                {SETTINGS_ITEMS.hr && SETTINGS_ITEMS.hr.length > 0 && (
                  <SidebarMenuItem>
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="h-10">
                          <UserCog className="h-4 w-4" />
                          {(!collapsed || isMobile) && (
                            <>
                              <span className="font-medium">إعدادات الموارد البشرية</span>
                              <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {(SETTINGS_ITEMS.hr as any[])?.map((item: any) => (
                            <SidebarMenuSubItem key={item.id}>
                              <SidebarMenuSubButton asChild>
                                <NavLink to={item.href as string} className={getNavClassName}>
                                  <item.icon className="h-4 w-4" />
                                  {(!collapsed || isMobile) && <span>{item.name}</span>}
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                )}

                {/* Admin Settings */}
                <SuperAdminOnly hideIfNoAccess>
                  {SETTINGS_ITEMS.admin && SETTINGS_ITEMS.admin.length > 0 && (
                    <SidebarMenuItem>
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="h-10">
                            <Shield className="h-4 w-4" />
                            {(!collapsed || isMobile) && (
                              <>
                                <span className="font-medium">إعدادات النظام</span>
                                <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                              </>
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {(SETTINGS_ITEMS.admin as any[])?.map((item: any) => (
                              <SidebarMenuSubItem key={item.id}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink to={item.href as string} className={getNavClassName}>
                                    <item.icon className="h-4 w-4" />
                                    {(!collapsed || isMobile) && <span>{item.name}</span>}
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  )}
                </SuperAdminOnly>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-4 w-4 mr-2" />
          تسجيل الخروج
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
