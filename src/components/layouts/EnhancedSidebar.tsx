import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { AdminOnly, SuperAdminOnly } from '@/components/common/PermissionGuard';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollDirection } from '@/hooks/useScrollDirection';

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

// Custom hook for scroll direction
function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = React.useState<'up' | 'down' | null>(null);
  const lastScrollY = React.useRef(0);

  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY.current) {
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollY.current) {
        setScrollDirection('up');
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return scrollDirection;
}

// Navigation item with tooltip
const NavItemWithTooltip: React.FC<{
  icon: React.ElementType;
  label: string;
  href: string;
  isActive: boolean;
  collapsed: boolean;
  isMobile: boolean;
}> = ({ icon: Icon, label, href, isActive, collapsed, isMobile }) => {
  const content = (
    <NavLink 
      to={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
        isActive 
          ? "bg-gradient-to-l from-coral-500/20 to-orange-500/10 text-coral-600 font-semibold shadow-sm" 
          : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80 hover:text-sidebar-foreground"
      )}
    >
      <Icon className={cn(
        "h-5 w-5 transition-transform duration-200",
        isActive && "scale-110"
      )} />
      <AnimatePresence mode="wait">
        {(!collapsed || isMobile) && (
          <motion.span 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="font-medium whitespace-nowrap overflow-hidden"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </NavLink>
  );

  // Show tooltip only when collapsed and not mobile
  if (collapsed && !isMobile) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-neutral-900 text-white border-0">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

export function EnhancedSidebar() {
  const { signOut } = useAuth();
  const { state, isMobile, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { hasCompanyAdminAccess, hasGlobalAccess } = useUnifiedCompanyAccess();
  const scrollDirection = useScrollDirection();

  const handleSignOut = async () => {
    await signOut();
  };

  const getNavClassName = ({ isActive: active }: { isActive: boolean }) => 
    active 
      ? "bg-gradient-to-l from-coral-500/20 to-orange-500/10 text-coral-600 font-semibold" 
      : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80 hover:text-sidebar-foreground";

  const renderNavItem = (section: typeof PRIMARY_NAVIGATION[0]) => {
    // Check permissions
    if (section.requiresSuperAdmin && !hasGlobalAccess) return null;
    if (section.requiresAdmin && !hasCompanyAdminAccess && !hasGlobalAccess) return null;

    const isSectionActive = section.href ? location.pathname.startsWith(section.href) : false;
    const hasSubmenu = section.submenu && section.submenu.length > 0;

    if (!hasSubmenu && section.href) {
      // Simple menu item without submenu - with Tooltip
      return (
        <SidebarMenuItem key={section.id}>
          <NavItemWithTooltip
            icon={section.icon}
            label={section.name}
            href={section.href}
            isActive={isSectionActive}
            collapsed={collapsed}
            isMobile={isMobile}
          />
        </SidebarMenuItem>
      );
    }

    // Menu item with submenu
    // In desktop mode, show expanded menu
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
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span 
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="font-medium"
                    >
                      {section.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <TooltipContent side="left" className="bg-neutral-900 text-white border-0 p-0">
              <div className="py-2">
                <p className="px-3 pb-2 font-semibold border-b border-white/10">{section.name}</p>
                <div className="pt-1">
                  {section.submenu?.map((subItem) => (
                    <NavLink
                      key={subItem.id}
                      to={subItem.href}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors"
                    >
                      <subItem.icon className="h-4 w-4" />
                      <span className="text-sm">{subItem.name}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </TooltipContent>
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
          <ChevronDown className="h-4 w-4 ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
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
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar side="right" className={cn(
        "border-l border-sidebar-border bg-sidebar-background",
        // Add transition classes for smooth collapse/expand
        "transition-all duration-300 ease-in-out"
      )}>
        {/* Header with Toggle Button */}
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center gap-3"
              layout
              transition={{ duration: 0.2 }}
            >
              <LazyImage 
                src="/receipts/logo.png" 
                alt="Fleetify Logo" 
                className={cn(
                  "filter brightness-0 invert transition-all duration-300",
                  collapsed && !isMobile ? "h-8 w-8" : "h-12 w-auto"
                )}
              />
              <AnimatePresence mode="wait">
                {(!collapsed || isMobile) && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col"
                  >
                    <h1 className="font-bold text-sidebar-foreground">Fleetify</h1>
                    <p className="text-xs text-sidebar-foreground/60">إدارة تأجير السيارات</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className={cn(
                "h-8 w-8 rounded-lg hover:bg-sidebar-accent transition-all duration-200",
                collapsed && !isMobile && "mx-auto"
              )}
            >
              <motion.div
                animate={{ rotate: collapsed ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isMobile ? (
                  collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className={cn(
                    "h-4 w-4 transition-transform",
                    scrollDirection === 'down' && "rotate-90"
                  )} />
                )}
              </motion.div>
            </Button>
          </div>
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent className="px-3 py-4">
          <SidebarGroup>
            {/* Only show main navigation when scrolling up or not scrolling */}
            {(scrollDirection === 'up' || scrollDirection === null) && (
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/60 mb-2">
                      القائمة الرئيسية
                    </SidebarGroupLabel>
                    <SidebarMenu className="space-y-1">
                      {PRIMARY_NAVIGATION.map((section) => renderNavItem(section))}
                    </SidebarMenu>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </SidebarGroup>

          {/* Settings Section */}
          {(hasCompanyAdminAccess || hasGlobalAccess) && (
            <SidebarGroup>
              <AnimatePresence mode="wait">
                {(!collapsed || isMobile) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/60 mb-2">
                      الإعدادات والإدارة
                    </SidebarGroupLabel>
                    <SidebarMenu>
                      {/* Finance Settings */}
                      {SETTINGS_ITEMS.finance && SETTINGS_ITEMS.finance.length > 0 && (
                        <SidebarMenuItem>
                          {collapsed && !isMobile ? (
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <SidebarMenuButton className="h-11 justify-center rounded-xl">
                                  <DollarSign className="h-5 w-5" />
                                </SidebarMenuButton>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="bg-neutral-900 text-white border-0 p-0">
                                <div className="py-2">
                                  <p className="px-3 pb-2 font-semibold border-b border-white/10">إعدادات المالية</p>
                                  <div className="pt-1">
                                    {(SETTINGS_ITEMS.finance as any[])?.map((item: any) => (
                                      <NavLink
                                        key={item.id}
                                        to={item.href as string} 
                                        className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors"
                                      >
                                        <item.icon className="h-4 w-4" />
                                        <span className="text-sm">{item.name}</span>
                                      </NavLink>
                                    ))}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Collapsible defaultOpen={location.pathname.startsWith('/finance')}>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton className="h-11 rounded-xl">
                                  <DollarSign className="h-5 w-5" />
                                  <span className="font-medium">إعدادات المالية</span>
                                  <ChevronDown className="h-4 w-4 ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
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
                          )}
                        </SidebarMenuItem>
                      )}
                      
                      {/* HR Settings */}
                      {SETTINGS_ITEMS.hr && SETTINGS_ITEMS.hr.length > 0 && (
                        <SidebarMenuItem>
                          {collapsed && !isMobile ? (
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <SidebarMenuButton className="h-11 justify-center rounded-xl">
                                  <UserCog className="h-5 w-5" />
                                </SidebarMenuButton>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="bg-neutral-900 text-white border-0 p-0">
                                <div className="py-2">
                                  <p className="px-3 pb-2 font-semibold border-b border-white/10">إعدادات الموارد البشرية</p>
                                  <div className="pt-1">
                                    {(SETTINGS_ITEMS.hr as any[])?.map((item: any) => (
                                      <NavLink
                                        key={item.id}
                                        to={item.href as string} 
                                        className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors"
                                      >
                                        <item.icon className="h-4 w-4" />
                                        <span className="text-sm">{item.name}</span>
                                      </NavLink>
                                    ))}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Collapsible defaultOpen={location.pathname.startsWith('/hr')}>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton className="h-11 rounded-xl">
                                  <UserCog className="h-5 w-5" />
                                  <span className="font-medium">إعدادات الموارد البشرية</span>
                                  <ChevronDown className="h-4 w-4 ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
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
                          )}
                        </SidebarMenuItem>
                      )}
                    </SidebarMenu>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </SidebarGroup>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className={cn(
          "border-t border-sidebar-border p-4 mt-auto",
          // Hide footer when scrolling down on desktop
          scrollDirection === 'down' && !isMobile && "opacity-0 pointer-events-none"
        )}>
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
