import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { AdminOnly, SuperAdminOnly } from '@/components/common/PermissionGuard';
import { useSidebar } from "@/components/ui/sidebar";

import { PRIMARY_NAVIGATION, SETTINGS_ITEMS } from '@/navigation/navigationConfig';
import {
  DollarSign,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Shield,
  Headphones,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/common/LazyImage';
import { cn } from '@/lib/utils';

export function EnhancedSidebar() {
  const { signOut } = useAuth();
  const { state, isMobile, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { hasCompanyAdminAccess, hasGlobalAccess } = useUnifiedCompanyAccess();

  const handleSignOut = async () => {
    await signOut();
  };

  const getNavClassName = ({ isActive: active }: { isActive: boolean }) => 
    active 
      ? "bg-gradient-to-l from-coral-500/20 to-orange-500/10 text-coral-600 font-semibold" 
      : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80 hover:text-sidebar-foreground";

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar side="right" className={cn(
        "border-l border-sidebar-border bg-sidebar-background",
        // Make sidebar sticky and fill entire viewport height
        "fixed top-0 bottom-0 h-screen z-40"
      )}>
        {/* Header with Toggle Button */}
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <div className="flex items-center justify-between">
            <LazyImage 
              src="/receipts/logo.png" 
              alt="Fleetify Logo" 
              className={cn(
                "filter brightness-0 invert",
                collapsed && !isMobile ? "h-8 w-8" : "h-12 w-auto"
              )}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent className={cn(
          "px-3 py-4",
          // Make content flexible to fill available space
          "flex-1 overflow-y-auto"
        )}>
          <SidebarGroup>
            {/* Main navigation always visible */}
            <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/60 mb-2">
              القائمة الرئيسية
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-1">
              {PRIMARY_NAVIGATION.map((section) => {
                // Check permissions
                if (section.requiresSuperAdmin && !hasGlobalAccess) return null;
                if (section.requiresAdmin && !hasCompanyAdminAccess && !hasGlobalAccess) return null;

                const isSectionActive = section.href ? location.pathname.startsWith(section.href) : false;
                const hasSubmenu = section.submenu && section.submenu.length > 0;

                if (!hasSubmenu && section.href) {
                  // Simple menu item without submenu
                  return (
                    <SidebarMenuItem key={section.id}>
                      <NavLink 
                        to={section.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                          isSectionActive 
                            ? "bg-gradient-to-l from-coral-500/20 to-orange-500/10 text-coral-600 font-semibold shadow-sm" 
                            : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                        )}
                      >
                        <section.icon className={cn(
                          "h-5 w-5 transition-transform duration-200",
                          isSectionActive && "scale-110"
                        )} />
                        <span>{section.name}</span>
                      </NavLink>
                    </SidebarMenuItem>
                  );
                }

                // Menu item with submenu
                if (!isMobile) {
                  return (
                    <SidebarMenuItem key={section.id}>
                      <Collapsible defaultOpen={isSectionActive}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className={cn(
                            "h-11 justify-center rounded-xl transition-all duration-200",
                            isSectionActive && "bg-gradient-to-l from-coral-500/20 to-orange-500/10"
                          )}>
                            <section.icon className={cn(
                              "h-5 w-5",
                              isSectionActive && "text-coral-600"
                            )} />
                            <span className="font-medium">{section.name}</span>
                            <ChevronDown className="h-4 w-4 ml-auto" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {section.submenu?.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.id}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink 
                                    to={subItem.href} 
                                    className={getNavClassName}
                                  >
                                    <subItem.icon className="h-4 w-4" />
                                    <span>{subItem.name}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  );
                }

                // Mobile menu item - always expanded
                return (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton className={cn(
                      "h-11 justify-center rounded-xl transition-all duration-200",
                      isSectionActive && "bg-gradient-to-l from-coral-500/20 to-orange-500/10"
                    )}>
                      <section.icon className={cn(
                        "h-5 w-5",
                        isSectionActive && "text-coral-600"
                      )} />
                      <span className="font-medium">{section.name}</span>
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      {section.submenu?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.id}>
                          <SidebarMenuSubButton asChild>
                            <NavLink 
                              to={subItem.href} 
                              className={getNavClassName}
                            >
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.name}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>

          {/* Settings Section */}
          {(hasCompanyAdminAccess || hasGlobalAccess) && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/60 mb-2">
                الإعدادات والإدارة
              </SidebarGroupLabel>
              <SidebarMenu>
                {/* Finance Settings */}
                {SETTINGS_ITEMS.finance && SETTINGS_ITEMS.finance.length > 0 && (
                  <SidebarMenuItem>
                    <Collapsible defaultOpen={location.pathname.startsWith('/finance')}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="h-11 rounded-xl">
                          <DollarSign className="h-5 w-5" />
                          <span className="font-medium">إعدادات المالية</span>
                          <ChevronDown className="h-4 w-4 ml-auto" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {(SETTINGS_ITEMS.finance as any[])?.map((item: any) => (
                            <SidebarMenuSubItem key={item.id}>
                              <SidebarMenuSubButton asChild>
                                <NavLink 
                                  to={item.href as string} 
                                  className={getNavClassName}
                                >
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.name}</span>
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
                    <Collapsible defaultOpen={location.pathname.startsWith('/hr')}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="h-11 rounded-xl">
                          <UserCog className="h-5 w-5" />
                          <span className="font-medium">إعدادات الموارد البشرية</span>
                          <ChevronDown className="h-4 w-4 ml-auto" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {(SETTINGS_ITEMS.hr as any[])?.map((item: any) => (
                            <SidebarMenuSubItem key={item.id}>
                              <SidebarMenuSubButton asChild>
                                <NavLink 
                                  to={item.href as string} 
                                  className={getNavClassName}
                                >
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.name}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="border-t border-sidebar-border p-4 sticky bottom-0 bg-sidebar-background">
          <div className="flex flex-col gap-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 ml-2" />
              تسجيل الخروج
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
              onClick={() => window.open('https://fleetify-support.saas')}
            >
              <Headphones className="h-4 w-4 ml-2" />
              الدعم الفني
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}