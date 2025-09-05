import React, { ReactNode, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout'
import { useResponsiveBreakpoint } from '@/hooks/use-mobile'
import { useScreenOrientation } from '@/hooks/responsive/useScreenOrientation'

export interface ResponsiveLayoutProps {
  children: ReactNode
  
  // Layout components
  sidebar?: ReactNode
  header?: ReactNode
  footer?: ReactNode
  mobileNavigation?: ReactNode
  
  // Layout configuration
  sidebarCollapsible?: boolean
  showMobileDrawer?: boolean
  showBottomNav?: boolean
  stickyHeader?: boolean
  stickyFooter?: boolean
  
  // Responsive behavior
  breakpoint?: 'sm' | 'md' | 'lg'
  mobileFirst?: boolean
  adaptToOrientation?: boolean
  
  // Content configuration
  contentDensity?: 'compact' | 'comfortable' | 'spacious'
  enableScrollRestoration?: boolean
  
  // Custom classes
  className?: string
  sidebarClassName?: string
  headerClassName?: string
  footerClassName?: string
  contentClassName?: string
  
  // Event handlers
  onLayoutChange?: (layout: 'mobile' | 'tablet' | 'desktop') => void
  onOrientationChange?: (orientation: 'portrait' | 'landscape') => void
}

/**
 * ResponsiveLayout - مكون تخطيط متجاوب شامل
 * يوفر تخطيط متكيف مع جميع أحجام الشاشات والأجهزة
 */
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebar,
  header,
  footer,
  mobileNavigation,
  sidebarCollapsible = true,
  showMobileDrawer = true,
  showBottomNav = true,
  stickyHeader = true,
  stickyFooter = false,
  breakpoint = 'md',
  mobileFirst = true,
  adaptToOrientation = true,
  contentDensity = 'comfortable',
  enableScrollRestoration = true,
  className,
  sidebarClassName,
  headerClassName,
  footerClassName,
  contentClassName,
  onLayoutChange,
  onOrientationChange
}) => {
  const { 
    viewMode, 
    isMobile, 
    isTablet, 
    isDesktop,
    showDrawer,
    sidebarBehavior,
    containerPadding,
    densityClass,
    touchOptimized
  } = useAdaptiveLayout({
    mobileNavigation: showBottomNav ? 'both' : 'drawer',
    contentDensity,
    sidebarBehavior: 'auto'
  })
  
  const { orientation } = useScreenOrientation()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)

  // Handle layout changes
  useEffect(() => {
    onLayoutChange?.(viewMode)
  }, [viewMode, onLayoutChange])

  // Handle orientation changes
  useEffect(() => {
    onOrientationChange?.(orientation)
    
    // Auto-close drawer on orientation change for mobile
    if (isMobile && isDrawerOpen) {
      setIsDrawerOpen(false)
    }
  }, [orientation, onOrientationChange, isMobile, isDrawerOpen])

  // Scroll restoration
  useEffect(() => {
    if (!enableScrollRestoration) return

    const handleScroll = () => {
      setScrollPosition(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [enableScrollRestoration])

  // Determine layout structure based on device and configuration
  const shouldShowSidebar = sidebar && (isDesktop || (isTablet && !isMobile))
  const shouldShowDrawer = sidebar && showMobileDrawer && (isMobile || (isTablet && orientation === 'portrait'))
  const shouldShowBottomNav = mobileNavigation && showBottomNav && isMobile

  // Layout classes
  const layoutClasses = cn(
    'min-h-screen bg-background text-foreground',
    'flex flex-col',
    densityClass,
    touchOptimized && 'touch-manipulation',
    className
  )

  const mainClasses = cn(
    'flex flex-1 overflow-hidden',
    isMobile ? 'flex-col' : 'flex-row'
  )

  const sidebarClasses = cn(
    'bg-card border-r border-border',
    'transition-all duration-300 ease-in-out',
    {
      // Desktop sidebar
      'w-64 flex-shrink-0': isDesktop && shouldShowSidebar,
      'w-56 flex-shrink-0': isTablet && shouldShowSidebar,
      
      // Collapsible behavior
      'w-16': sidebarCollapsible && isDesktop,
      
      // Hidden on mobile (drawer will be used instead)
      'hidden': isMobile || !shouldShowSidebar,
    },
    sidebarClassName
  )

  const contentClasses = cn(
    'flex-1 flex flex-col overflow-hidden',
    containerPadding,
    contentClassName
  )

  const headerClasses = cn(
    'bg-card border-b border-border',
    'transition-all duration-200',
    {
      'sticky top-0 z-40': stickyHeader,
      'relative': !stickyHeader,
    },
    headerClassName
  )

  const footerClasses = cn(
    'bg-card border-t border-border',
    'transition-all duration-200',
    {
      'sticky bottom-0 z-40': stickyFooter,
      'relative': !stickyFooter,
    },
    footerClassName
  )

  // Mobile drawer component - تم إزالته لتجنب التداخل مع MobileDrawer المنفصل
  const MobileDrawer = null;

  // Bottom navigation component
  const BottomNavigation = shouldShowBottomNav ? (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-30',
      'bg-card/95 backdrop-blur-sm border-t border-border',
      'safe-area-inset-bottom',
      'transition-transform duration-300',
      scrollPosition > 100 ? 'translate-y-full' : 'translate-y-0'
    )}>
      {mobileNavigation}
    </div>
  ) : null

  return (
    <div className={layoutClasses} dir="rtl">
      {/* Header */}
      {header && (
        <header className={headerClasses}>
          {header}
        </header>
      )}

      {/* Main content area */}
      <main className={mainClasses}>
        {/* Desktop/Tablet Sidebar */}
        {shouldShowSidebar && (
          <aside className={sidebarClasses}>
            {sidebar}
          </aside>
        )}

        {/* Content */}
        <div className={contentClasses}>
          {children}
        </div>
      </main>

      {/* Footer */}
      {footer && (
        <footer className={footerClasses}>
          {footer}
        </footer>
      )}

      {/* Bottom Navigation */}
      {BottomNavigation}
    </div>
  )
}

export default ResponsiveLayout
