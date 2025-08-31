import React from 'react'
import { useEnhancedResponsive } from '@/hooks/useEnhancedResponsive'
import { getResponsiveProps } from '@/utils/responsiveUtils'
import { cn } from '@/lib/utils'

// Enhanced Dashboard Layout for responsive design
interface EnhancedResponsiveDashboardProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
  bottomNav?: React.ReactNode
  className?: string
  preserveLayout?: boolean // For gradual migration
}

export function EnhancedResponsiveDashboard({
  children,
  sidebar,
  header,
  bottomNav,
  className,
  preserveLayout = false
}: EnhancedResponsiveDashboardProps) {
  const { 
    deviceType, 
    isMobile, 
    isTablet, 
    isDesktop, 
    safeAreaSupport,
    hasNotch 
  } = useEnhancedResponsive()

  const responsiveProps = getResponsiveProps(deviceType)

  // Mobile Layout: Bottom Navigation + Full Screen Content
  if (isMobile) {
    return (
      <div className={cn(
        "min-h-screen bg-background flex flex-col",
        safeAreaSupport && "pb-mobile-safe-bottom pt-mobile-safe-top",
        hasNotch && "pt-12",
        className
      )}>
        {/* Mobile Header */}
        {header && (
          <header className="sticky top-0 z-40 bg-background border-b px-4 py-3">
            {header}
          </header>
        )}
        
        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-auto",
          bottomNav ? "pb-mobile-bottom-nav" : "pb-4",
          responsiveProps.spacing
        )}>
          {children}
        </main>
        
        {/* Bottom Navigation */}
        {bottomNav && (
          <nav className={cn(
            "fixed bottom-0 left-0 right-0 z-40",
            "bg-background border-t",
            "h-mobile-bottom-nav",
            safeAreaSupport && "pb-mobile-safe-bottom"
          )}>
            {bottomNav}
          </nav>
        )}
      </div>
    )
  }

  // Tablet Layout: Collapsible Sidebar
  if (isTablet) {
    return (
      <div className={cn("min-h-screen bg-background flex", className)}>
        {/* Tablet Sidebar */}
        {sidebar && (
          <aside className="w-64 bg-sidebar border-r flex-shrink-0 overflow-auto">
            {sidebar}
          </aside>
        )}
        
        {/* Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tablet Header */}
          {header && (
            <header className="bg-background border-b px-6 py-4">
              {header}
            </header>
          )}
          
          {/* Content */}
          <main className={cn(
            "flex-1 overflow-auto",
            responsiveProps.spacing
          )}>
            {children}
          </main>
        </div>
      </div>
    )
  }

  // Desktop Layout: Fixed Sidebar + Full Layout
  return (
    <div className={cn("min-h-screen bg-background flex", className)}>
      {/* Desktop Sidebar */}
      {sidebar && (
        <aside className="w-72 bg-sidebar border-r flex-shrink-0 overflow-auto">
          {sidebar}
        </aside>
      )}
      
      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Header */}
        {header && (
          <header className="bg-background border-b px-8 py-6">
            {header}
          </header>
        )}
        
        {/* Content */}
        <main className={cn(
          "flex-1 overflow-auto",
          responsiveProps.spacing
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}

// Responsive Page Layout
interface ResponsivePageLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
  className?: string
}

export function ResponsivePageLayout({
  children,
  title,
  subtitle,
  actions,
  breadcrumb,
  className
}: ResponsivePageLayoutProps) {
  const { deviceType, isMobile } = useEnhancedResponsive()
  const responsiveProps = getResponsiveProps(deviceType)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Page Header */}
      <div className="space-y-4">
        {/* Breadcrumb */}
        {breadcrumb && (
          <div className="text-sm text-muted-foreground">
            {breadcrumb}
          </div>
        )}
        
        {/* Title and Actions */}
        <div className={cn(
          "flex justify-between items-start",
          isMobile && "flex-col space-y-4"
        )}>
          <div className="space-y-1">
            {title && (
              <h1 className={cn(
                "font-bold tracking-tight",
                isMobile ? "text-xl" : "text-2xl"
              )}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          
          {actions && (
            <div className={cn(
              "flex gap-2",
              isMobile && "w-full"
            )}>
              {actions}
            </div>
          )}
        </div>
      </div>
      
      {/* Page Content */}
      <div className={responsiveProps.spacing}>
        {children}
      </div>
    </div>
  )
}

// Responsive Form Layout
interface ResponsiveFormLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  columns?: 1 | 2 | 3
}

export function ResponsiveFormLayout({
  children,
  title,
  description,
  className,
  columns
}: ResponsiveFormLayoutProps) {
  const { deviceType, isMobile, isTablet } = useEnhancedResponsive()
  
  // Determine columns based on device
  const actualColumns = columns || (
    isMobile ? 1 : isTablet ? 2 : 3
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Form Header */}
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h2 className={cn(
              "font-semibold",
              isMobile ? "text-lg" : "text-xl"
            )}>
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      
      {/* Form Grid */}
      <div className={cn(
        "grid gap-6",
        actualColumns === 1 && "grid-cols-1",
        actualColumns === 2 && "grid-cols-1 md:grid-cols-2",
        actualColumns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}>
        {children}
      </div>
    </div>
  )
}

// Responsive Content Layout with Sidebar
interface ResponsiveContentLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  sidebarPosition?: 'left' | 'right'
  sidebarWidth?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ResponsiveContentLayout({
  children,
  sidebar,
  sidebarPosition = 'right',
  sidebarWidth = 'md',
  className
}: ResponsiveContentLayoutProps) {
  const { isMobile, isTablet } = useEnhancedResponsive()

  const sidebarWidths = {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96'
  }

  // Mobile: Stack layout
  if (isMobile) {
    return (
      <div className={cn("space-y-6", className)}>
        <div>{children}</div>
        {sidebar && (
          <div className="border-t pt-6">
            {sidebar}
          </div>
        )}
      </div>
    )
  }

  // Tablet/Desktop: Side-by-side layout
  const isLeftSidebar = sidebarPosition === 'left'

  return (
    <div className={cn(
      "grid gap-6",
      isTablet ? "grid-cols-1 lg:grid-cols-4" : "grid-cols-5",
      className
    )}>
      {/* Left sidebar */}
      {sidebar && isLeftSidebar && (
        <div className={cn(
          isTablet ? "lg:col-span-1" : "col-span-1",
          "space-y-6"
        )}>
          {sidebar}
        </div>
      )}
      
      {/* Main content */}
      <div className={cn(
        sidebar ? (
          isTablet ? "lg:col-span-3" : "col-span-4"
        ) : (
          isTablet ? "lg:col-span-4" : "col-span-5"
        ),
        "space-y-6"
      )}>
        {children}
      </div>
      
      {/* Right sidebar */}
      {sidebar && !isLeftSidebar && (
        <div className={cn(
          isTablet ? "lg:col-span-1" : "col-span-1",
          "space-y-6"
        )}>
          {sidebar}
        </div>
      )}
    </div>
  )
}

// Layout Migration Wrapper (for gradual transition)
interface LayoutMigrationWrapperProps {
  children: React.ReactNode
  useResponsive?: boolean // Feature flag
  fallbackLayout?: React.ComponentType<any>
}

export function LayoutMigrationWrapper({
  children,
  useResponsive = false, // Default to false for safety
  fallbackLayout: FallbackLayout
}: LayoutMigrationWrapperProps) {
  const { deviceType } = useEnhancedResponsive()

  // Use responsive layout if enabled
  if (useResponsive) {
    return (
      <EnhancedResponsiveDashboard>
        {children}
      </EnhancedResponsiveDashboard>
    )
  }

  // Use fallback layout
  if (FallbackLayout) {
    return <FallbackLayout>{children}</FallbackLayout>
  }

  // Default wrapper
  return <div>{children}</div>
}