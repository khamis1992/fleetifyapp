import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useEnhancedResponsive } from '@/hooks/useEnhancedResponsive'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Home,
  Car,
  FileText,
  Users,
  DollarSign,
  Settings,
  Menu,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

// Navigation item interface
interface NavigationItem {
  name: string
  name_en: string
  href: string
  icon: React.ComponentType<any>
  children?: NavigationItem[]
  badge?: string | number
  priority: 'critical' | 'important' | 'secondary' | 'optional'
}

// Main navigation items configuration
const mainNavigationItems: NavigationItem[] = [
  {
    name: 'لوحة التحكم',
    name_en: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    priority: 'critical'
  },
  {
    name: 'العملاء',
    name_en: 'Customers',
    href: '/customers',
    icon: Users,
    priority: 'critical'
  },
  {
    name: 'إدارة الأسطول',
    name_en: 'Fleet Management',
    href: '/fleet',
    icon: Car,
    priority: 'critical',
    children: [
      {
        name: 'المركبات',
        name_en: 'Vehicles',
        href: '/fleet/vehicles',
        icon: Car,
        priority: 'critical'
      },
      {
        name: 'الصيانة',
        name_en: 'Maintenance',
        href: '/fleet/maintenance',
        icon: Settings,
        priority: 'important'
      }
    ]
  },
  {
    name: 'العمليات المالية',
    name_en: 'Finance',
    href: '/finance',
    icon: DollarSign,
    priority: 'critical',
    children: [
      {
        name: 'دليل الحسابات',
        name_en: 'Chart of Accounts',
        href: '/finance/chart-of-accounts',
        icon: FileText,
        priority: 'critical'
      },
      {
        name: 'المدفوعات',
        name_en: 'Payments',
        href: '/finance/payments',
        icon: DollarSign,
        priority: 'important'
      }
    ]
  },
  {
    name: 'العقود',
    name_en: 'Contracts',
    href: '/contracts',
    icon: FileText,
    priority: 'important'
  }
]

// Mobile Bottom Navigation Component
interface MobileBottomNavProps {
  items: NavigationItem[]
  className?: string
}

function MobileBottomNav({ items, className }: MobileBottomNavProps) {
  const location = useLocation()
  const { safeAreaSupport } = useEnhancedResponsive()

  // Show only critical items in bottom nav
  const criticalItems = items.filter(item => item.priority === 'critical').slice(0, 5)

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-40",
      "bg-background border-t",
      "h-mobile-bottom-nav",
      safeAreaSupport && "pb-mobile-safe-bottom",
      className
    )}>
      <div className="grid grid-cols-5 h-full">
        {criticalItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.href)

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center",
                "text-xs font-medium transition-colors",
                "min-h-[44px] gap-1",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={20} />
              <span className="text-[10px]">{item.name_en}</span>
              {item.badge && (
                <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[8px] rounded-full w-4 h-4 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

// Mobile Sidebar Sheet
interface MobileSidebarProps {
  items: NavigationItem[]
  isOpen: boolean
  onClose: () => void
}

function MobileSidebar({ items, isOpen, onClose }: MobileSidebarProps) {
  const location = useLocation()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  const renderNavItem = (item: NavigationItem, level = 0) => {
    const Icon = item.icon
    const isActive = location.pathname === item.href
    const isExpanded = expandedItems.includes(item.href)
    const hasChildren = item.children && item.children.length > 0

    return (
      <div key={item.href}>
        <div
          className={cn(
            "flex items-center gap-3 p-3 rounded-md transition-colors",
            "min-h-[44px]",
            level > 0 && "ml-6",
            isActive 
              ? "bg-primary text-primary-foreground" 
              : "hover:bg-accent hover:text-accent-foreground"
          )}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.href)
            } else {
              onClose()
            }
          }}
        >
          <Icon size={20} />
          <span className="flex-1 text-sm font-medium">{item.name}</span>
          {item.badge && (
            <span className="bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-3 space-y-1">
            {item.children.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">القائمة الرئيسية</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-4 space-y-2">
            {items.map(item => renderNavItem(item))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// Tablet Collapsible Sidebar
interface TabletSidebarProps {
  items: NavigationItem[]
  className?: string
}

function TabletSidebar({ items, className }: TabletSidebarProps) {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  const renderNavItem = (item: NavigationItem, level = 0) => {
    const Icon = item.icon
    const isActive = location.pathname.startsWith(item.href)
    const isExpanded = expandedItems.includes(item.href)
    const hasChildren = item.children && item.children.length > 0

    // Filter children based on device priority
    const visibleChildren = item.children?.filter(child => 
      ['critical', 'important'].includes(child.priority)
    )

    return (
      <div key={item.href}>
        <NavLink
          to={hasChildren ? '#' : item.href}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault()
              toggleExpanded(item.href)
            }
          }}
          className={cn(
            "flex items-center gap-3 p-3 rounded-md transition-colors",
            "min-h-[40px]",
            level > 0 && "ml-6",
            isActive 
              ? "bg-primary text-primary-foreground" 
              : "hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Icon size={18} />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-sm font-medium">{item.name}</span>
              {item.badge && (
                <span className="bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              {hasChildren && visibleChildren && visibleChildren.length > 0 && (
                isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
              )}
            </>
          )}
        </NavLink>

        {hasChildren && isExpanded && !isCollapsed && visibleChildren && (
          <div className="ml-3 space-y-1">
            {visibleChildren.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className={cn(
      "bg-sidebar border-r transition-all duration-300",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold">FleetifyApp</h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Menu size={18} />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-80px)]">
        <div className="p-4 space-y-2">
          {items
            .filter(item => ['critical', 'important', 'secondary'].includes(item.priority))
            .map(item => renderNavItem(item))
          }
        </div>
      </ScrollArea>
    </aside>
  )
}

// Desktop Fixed Sidebar
interface DesktopSidebarProps {
  items: NavigationItem[]
  className?: string
}

function DesktopSidebar({ items, className }: DesktopSidebarProps) {
  const location = useLocation()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  const renderNavItem = (item: NavigationItem, level = 0) => {
    const Icon = item.icon
    const isActive = location.pathname.startsWith(item.href)
    const isExpanded = expandedItems.includes(item.href)
    const hasChildren = item.children && item.children.length > 0

    return (
      <div key={item.href}>
        <NavLink
          to={hasChildren ? '#' : item.href}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault()
              toggleExpanded(item.href)
            }
          }}
          className={cn(
            "flex items-center gap-3 p-3 rounded-md transition-colors",
            "min-h-[36px]",
            level > 0 && "ml-6",
            isActive 
              ? "bg-primary text-primary-foreground" 
              : "hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Icon size={18} />
          <span className="flex-1 text-sm font-medium">{item.name}</span>
          {item.badge && (
            <span className="bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
        </NavLink>

        {hasChildren && isExpanded && (
          <div className="ml-3 space-y-1">
            {item.children.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className={cn(
      "w-72 bg-sidebar border-r flex-shrink-0",
      className
    )}>
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">FleetifyApp</h1>
      </div>

      <ScrollArea className="h-[calc(100vh-80px)]">
        <div className="p-6 space-y-2">
          {items.map(item => renderNavItem(item))}
        </div>
      </ScrollArea>
    </aside>
  )
}

// Main Responsive Navigation Component
interface ResponsiveNavigationProps {
  items?: NavigationItem[]
  className?: string
}

export function ResponsiveNavigation({ 
  items = mainNavigationItems,
  className 
}: ResponsiveNavigationProps) {
  const { deviceType, isMobile, isTablet, isDesktop } = useEnhancedResponsive()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Mobile: Bottom Navigation + Hamburger Menu
  if (isMobile) {
    return (
      <>
        {/* Mobile Header with Menu Button */}
        <header className="sticky top-0 z-40 bg-background border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
            </Sheet>
            
            <h1 className="text-lg font-semibold">FleetifyApp</h1>
            
            <div className="w-10" /> {/* Spacer for center alignment */}
          </div>
        </header>

        {/* Mobile Sidebar */}
        <MobileSidebar
          items={items}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Bottom Navigation */}
        <MobileBottomNav items={items} className={className} />
      </>
    )
  }

  // Tablet: Collapsible Sidebar
  if (isTablet) {
    return <TabletSidebar items={items} className={className} />
  }

  // Desktop: Fixed Sidebar
  return <DesktopSidebar items={items} className={className} />
}

// Mobile Header Component
interface MobileHeaderProps {
  title?: string
  leftAction?: React.ReactNode
  rightAction?: React.ReactNode
  className?: string
}

export function MobileHeader({ 
  title = "FleetifyApp", 
  leftAction, 
  rightAction, 
  className 
}: MobileHeaderProps) {
  const { safeAreaSupport, hasNotch } = useEnhancedResponsive()

  return (
    <header className={cn(
      "sticky top-0 z-40 bg-background border-b",
      "px-4 py-3",
      safeAreaSupport && "pt-mobile-safe-top",
      hasNotch && "pt-12",
      className
    )}>
      <div className="flex items-center justify-between min-h-[44px]">
        <div className="flex-shrink-0">
          {leftAction}
        </div>
        
        <h1 className="text-lg font-semibold text-center flex-1 px-4">
          {title}
        </h1>
        
        <div className="flex-shrink-0">
          {rightAction}
        </div>
      </div>
    </header>
  )
}

// Export navigation items for use in other components
export { mainNavigationItems }
export type { NavigationItem }