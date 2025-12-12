import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import * as Icons from "lucide-react";
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
import { useModuleConfig } from "../hooks/useModuleConfig";
import { ModuleRoute, ModuleName } from "@/types/modules";
import { CarRentalSidebar } from "@/components/navigation/CarRentalSidebar";
import { RealEstateSidebar } from "@/components/navigation/RealEstateSidebar";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";

const getIconComponent = (iconName: string) => {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.FileText;
};

// Helper function to group routes by module
const groupRoutesByModule = (moduleContext: any) => {
  const groupedModules: Record<string, { 
    name: string; 
    icon: string; 
    routes: Array<{ path: string; label: string; label_ar: string; icon: string; }> 
  }> = {};

  // Safety check for moduleContext and availableModules
  if (!moduleContext || !moduleContext.availableModules || !Array.isArray(moduleContext.availableModules)) {
    return groupedModules;
  }

  (moduleContext.availableModules || []).forEach((module: any) => {
    if (module && moduleContext.activeModules?.includes(module.name) && module.routes?.length > 0) {
      // If module has multiple routes, group them
      if (module.routes.length > 1) {
        groupedModules[module.name] = {
          name: module.display_name_ar || module.display_name,
          icon: module.icon,
          routes: module.routes
        };
      } else {
        // Single route modules go to individual items
        groupedModules[`single_${module.name}`] = {
          name: module.routes[0].label_ar || module.routes[0].label,
          icon: module.routes[0].icon,
          routes: module.routes
        };
      }
    }
  });

  return groupedModules;
};

export function DynamicSidebar() {
  const { signOut } = useAuth();
  const { state, isMobile } = useSidebar();
  const location = useLocation();
  const { moduleContext, isLoading, company } = useModuleConfig();
  const currentPath = location.pathname;

  const collapsed = state === "collapsed";

  // إذا كانت الشركة من نوع تأجير السيارات أو العقارات، استخدم الشريط الجانبي المخصص
  console.log('🏢 [DYNAMIC_SIDEBAR] Company business type:', company?.business_type, 'Available modules:', moduleContext?.availableModules?.map(m => m.name));
  
  if (company?.business_type === 'car_rental') {
    return <CarRentalSidebar />;
  }
  
  if (company?.business_type === 'real_estate') {
    return <RealEstateSidebar />;
  }

  const handleSignOut = async () => {
    await signOut();
  };

  if (isLoading || !moduleContext) {
    return (
      <Sidebar side="right" className="border-l border-sidebar-border bg-sidebar-background">
        <SidebarContent>
          <div className="flex items-center justify-center p-4">
            <Icons.Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  // Group modules and prepare navigation structure
  const groupedModules = groupRoutesByModule(moduleContext);
  
  const isActive = (href: string) => location.pathname.startsWith(href);
  const getNavClassName = ({ isActive: active }: { isActive: boolean }) => 
    active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/60";

  // Get business type display name
  const getBusinessTypeDisplayName = () => {
    switch (company?.business_type) {
      case 'real_estate': return 'نظام إدارة العقارات';
      case 'retail': return 'نظام إدارة المبيعات';
      case 'medical': return 'نظام إدارة المستشفى';
      case 'manufacturing': return 'نظام إدارة التصنيع';
      case 'restaurant': return 'نظام إدارة المطعم';
      case 'logistics': return 'نظام إدارة اللوجستيات';
      case 'education': return 'نظام إدارة التعليم';
      case 'consulting': return 'نظام إدارة الاستشارات';
      case 'construction': return 'نظام إدارة الإنشاءات';
      default: return 'نظام إدارة الأعمال';
    }
  };

  return (
    <Sidebar side="right" className="border-l border-sidebar-border bg-sidebar-background">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <img 
            src="/receipts/logo.png" 
            alt="Company Logo" 
            className="h-16 w-auto filter brightness-0 invert"
          />
          {(!collapsed || isMobile) && (
            <>
              <h3 className="text-sm font-medium text-sidebar-foreground">
                {(company as any)?.name || (company as any)?.name_ar || 'اسم الشركة'}
              </h3>
              <p className="text-xs text-sidebar-foreground/60">
                {getBusinessTypeDisplayName()}
              </p>
            </>
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
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink to="/dashboard" className={getNavClassName}>
                    <Icons.LayoutDashboard className="h-4 w-4" />
                    {(!collapsed || isMobile) && <span className="font-medium">لوحة التحكم</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Grouped Modules */}
              {Object.entries(groupedModules).map(([moduleKey, moduleGroup]) => {
                const isModuleActive = moduleGroup.routes.some(route => isActive(route.path));
                const IconComponent = getIconComponent(moduleGroup.icon);
                
                // If single route, render as direct menu item
                if (moduleKey.startsWith('single_') || moduleGroup.routes.length === 1) {
                  const route = moduleGroup.routes[0];
                  return (
                    <SidebarMenuItem key={moduleKey}>
                      <SidebarMenuButton asChild className="h-10">
                        <NavLink to={route.path} className={getNavClassName}>
                          <IconComponent className="h-4 w-4" />
                          {(!collapsed || isMobile) && <span className="font-medium">{route.label_ar || route.label}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // Multiple routes - render as collapsible group
                return (
                  <SidebarMenuItem key={moduleKey}>
                    <Collapsible defaultOpen={isModuleActive}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="h-10">
                          <IconComponent className="h-4 w-4" />
                          {(!collapsed || isMobile) && (
                            <>
                              <span className="font-medium">{moduleGroup.name}</span>
                              <Icons.ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {moduleGroup.routes.map((route) => {
                            const RouteIcon = getIconComponent(route.icon);
                            return (
                              <SidebarMenuSubItem key={route.path}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink to={route.path} className={getNavClassName}>
                                    <RouteIcon className="h-4 w-4" />
                                    {(!collapsed || isMobile) && <span>{route.label_ar || route.label}</span>}
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                );
              })}

              {/* Settings */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink to="/settings" className={getNavClassName}>
                    <Icons.Settings className="h-4 w-4" />
                    {(!collapsed || isMobile) && <span className="font-medium">الإعدادات</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Icons.LogOut className="h-4 w-4" />
          {(!collapsed || isMobile) && <span className="mr-2">تسجيل الخروج</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}