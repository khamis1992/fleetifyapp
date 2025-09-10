import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import * as Icons from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useModuleConfig } from "../hooks/useModuleConfig";
import { ModuleRoute } from "@/types/modules";
import { CarRentalSidebar } from "@/components/navigation/CarRentalSidebar";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";

const getIconComponent = (iconName: string) => {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.FileText;
};

export function DynamicSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { moduleContext, isLoading, company } = useModuleConfig();
  const currentPath = location.pathname;

  const collapsed = state === "collapsed";

  // إذا كانت الشركة من نوع تأجير السيارات، استخدم الشريط الجانبي المخصص
  console.log('🏢 [DYNAMIC_SIDEBAR] Company business type:', company?.business_type, 'Available modules:', moduleContext?.availableModules?.map(m => m.name));
  
  if (company?.business_type === 'car_rental') {
    return <CarRentalSidebar />;
  }

  if (isLoading) {
    return (
      <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
        <SidebarContent>
          <div className="flex items-center justify-center p-4">
            <Icons.Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  // بناء عناصر الشريط الجانبي بناءً على الوحدات المفعلة
  const sidebarItems = [
    {
      title: 'Dashboard',
      title_ar: 'لوحة التحكم',
      url: '/dashboard',
      icon: 'LayoutDashboard'
    }
  ];

  // إضافة مسارات الوحدات المفعلة
  moduleContext.availableModules.forEach(module => {
    if (moduleContext.activeModules.includes(module.name) && module.routes.length > 0) {
      module.routes.forEach(route => {
        sidebarItems.push({
          title: route.label,
          title_ar: route.label_ar,
          url: route.path,
          icon: route.icon
        });
      });
    }
  });

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {collapsed ? "" : "القائمة الرئيسية"}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => {
                const IconComponent = getIconComponent(item.icon);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end 
                        className={getNavCls}
                      >
                        <IconComponent className="mr-2 h-4 w-4" />
                        {!collapsed && (
                          <span className="text-right">
                            {item.title_ar || item.title}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* إعدادات النظام */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {collapsed ? "" : "الإعدادات"}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/settings" className={getNavCls}>
                    <Icons.Settings className="mr-2 h-4 w-4" />
                    {!collapsed && <span>الإعدادات</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}