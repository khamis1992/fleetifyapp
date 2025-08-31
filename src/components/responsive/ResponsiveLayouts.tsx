import React from 'react'
import { useEnhancedResponsive } from '@/hooks/useEnhancedResponsive'
import { ResponsiveClassGenerator } from '@/utils/responsiveUtils'
import { cn } from '@/lib/utils'

// Base responsive layout component
interface ResponsiveLayoutProps {
  children: React.ReactNode
  className?: string
  mobileComponent?: React.ComponentType<any>
  tabletComponent?: React.ComponentType<any>
  desktopComponent?: React.ComponentType<any>
  fallbackComponent?: React.ComponentType<any>
}

export function ResponsiveLayout({ 
  children, 
  className,
  mobileComponent: MobileComponent,
  tabletComponent: TabletComponent,
  desktopComponent: DesktopComponent,
  fallbackComponent: FallbackComponent
}: ResponsiveLayoutProps) {
  const { deviceType, isMobile, isTablet, isDesktop } = useEnhancedResponsive()

  // Render device-specific components if provided
  if (MobileComponent && isMobile) {
    return <MobileComponent>{children}</MobileComponent>
  }
  
  if (TabletComponent && isTablet) {
    return <TabletComponent>{children}</TabletComponent>
  }
  
  if (DesktopComponent && isDesktop) {
    return <DesktopComponent>{children}</DesktopComponent>
  }
  
  if (FallbackComponent) {
    return <FallbackComponent>{children}</FallbackComponent>
  }

  // Default responsive layout
  const responsiveClasses = ResponsiveClassGenerator.container(deviceType)
  
  return (
    <div className={cn(responsiveClasses, className)}>
      {children}
    </div>
  )
}

// Adaptive Grid Layout
interface AdaptiveGridProps {
  children: React.ReactNode
  className?: string
  mobileColumns?: number
  tabletColumns?: number
  desktopColumns?: number
  gap?: 'sm' | 'md' | 'lg'
  autoFit?: boolean
}

export function AdaptiveGrid({
  children,
  className,
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 3,
  gap = 'md',
  autoFit = false
}: AdaptiveGridProps) {
  const { deviceType, getOptimalColumns } = useEnhancedResponsive()
  
  const columns = autoFit 
    ? getOptimalColumns()
    : deviceType === 'mobile' 
      ? mobileColumns 
      : deviceType === 'tablet' 
        ? tabletColumns 
        : desktopColumns

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  }

  const gridClasses = cn(
    'grid',
    `grid-cols-${columns}`,
    gapClasses[gap],
    className
  )

  return (
    <div className={gridClasses}>
      {children}
    </div>
  )
}

// Adaptive Flex Layout
interface AdaptiveFlexProps {
  children: React.ReactNode
  className?: string
  mobileDirection?: 'row' | 'col'
  tabletDirection?: 'row' | 'col'
  desktopDirection?: 'row' | 'col'
  wrap?: boolean
  gap?: 'sm' | 'md' | 'lg'
}

export function AdaptiveFlex({
  children,
  className,
  mobileDirection = 'col',
  tabletDirection = 'row',
  desktopDirection = 'row',
  wrap = false,
  gap = 'md'
}: AdaptiveFlexProps) {
  const { deviceType } = useEnhancedResponsive()
  
  const direction = deviceType === 'mobile' 
    ? mobileDirection 
    : deviceType === 'tablet' 
      ? tabletDirection 
      : desktopDirection

  const gapClasses = {
    sm: direction === 'row' ? 'space-x-2' : 'space-y-2',
    md: direction === 'row' ? 'space-x-4' : 'space-y-4',
    lg: direction === 'row' ? 'space-x-6' : 'space-y-6'
  }

  const flexClasses = cn(
    'flex',
    `flex-${direction}`,
    wrap && 'flex-wrap',
    gapClasses[gap],
    className
  )

  return (
    <div className={flexClasses}>
      {children}
    </div>
  )
}

// Responsive Container
interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: boolean
  center?: boolean
}

export function ResponsiveContainer({
  children,
  className,
  maxWidth = 'full',
  padding = true,
  center = true
}: ResponsiveContainerProps) {
  const { deviceType, getOptimalSpacing } = useEnhancedResponsive()
  
  const maxWidthClasses = maxWidth !== 'full' ? `max-w-${maxWidth}` : 'w-full'
  const paddingClasses = padding ? getOptimalSpacing() : ''
  const centerClasses = center ? 'mx-auto' : ''

  const containerClasses = cn(
    maxWidthClasses,
    centerClasses,
    paddingClasses,
    className
  )

  return (
    <div className={containerClasses}>
      {children}
    </div>
  )
}

// Mobile-First Stack Layout
interface StackLayoutProps {
  children: React.ReactNode
  className?: string
  spacing?: 'sm' | 'md' | 'lg'
  dividers?: boolean
}

export function StackLayout({
  children,
  className,
  spacing = 'md',
  dividers = false
}: StackLayoutProps) {
  const { deviceType } = useEnhancedResponsive()
  
  const spacingClasses = {
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6'
  }

  const stackClasses = cn(
    'flex flex-col',
    spacingClasses[spacing],
    dividers && 'divide-y divide-border',
    className
  )

  return (
    <div className={stackClasses}>
      {children}
    </div>
  )
}

// Responsive Card Layout
interface ResponsiveCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg'
  shadow?: 'sm' | 'md' | 'lg'
}

export function ResponsiveCard({
  children,
  className,
  hover = true,
  padding = 'md',
  shadow = 'md'
}: ResponsiveCardProps) {
  const { deviceType, touchDevice } = useEnhancedResponsive()
  
  const paddingClasses = {
    sm: deviceType === 'mobile' ? 'p-3' : 'p-2',
    md: deviceType === 'mobile' ? 'p-4' : deviceType === 'tablet' ? 'p-4' : 'p-6',
    lg: deviceType === 'mobile' ? 'p-6' : deviceType === 'tablet' ? 'p-6' : 'p-8'
  }

  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  }

  const cardClasses = cn(
    'bg-card border rounded-lg',
    paddingClasses[padding],
    shadowClasses[shadow],
    hover && !touchDevice && 'hover:shadow-lg transition-shadow duration-200',
    touchDevice && 'active:scale-95 transition-transform duration-150',
    className
  )

  return (
    <div className={cardClasses}>
      {children}
    </div>
  )
}

// Responsive Modal/Sheet Layout
interface ResponsiveModalProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  title?: string
  className?: string
}

export function ResponsiveModal({
  children,
  isOpen,
  onClose,
  title,
  className
}: ResponsiveModalProps) {
  const { isMobile, isTablet } = useEnhancedResponsive()

  if (!isOpen) return null

  // Mobile: Full screen sheet
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-md"
            >
              ✕
            </button>
          </div>
          <div className={cn("flex-1 overflow-auto p-4", className)}>
            {children}
          </div>
        </div>
      </div>
    )
  }

  // Tablet/Desktop: Standard modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={onClose}
      />
      <div className={cn(
        "relative bg-background rounded-lg shadow-lg border",
        isTablet ? "w-[90vw] max-w-2xl" : "w-[80vw] max-w-4xl",
        "max-h-[80vh] overflow-auto",
        className
      )}>
        <div className="flex items-center justify-between p-6 border-b">
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-md"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

// Responsive Data Display
interface ResponsiveDataDisplayProps {
  data: Array<Record<string, any>>
  columns: Array<{
    key: string
    label: string
    priority: 'critical' | 'important' | 'secondary' | 'optional'
    render?: (value: any, row: any) => React.ReactNode
  }>
  className?: string
}

export function ResponsiveDataDisplay({
  data,
  columns,
  className
}: ResponsiveDataDisplayProps) {
  const { deviceType, isMobile } = useEnhancedResponsive()
  
  // Mobile: Card-based display
  if (isMobile) {
    return (
      <StackLayout className={className}>
        {data.map((row, index) => (
          <ResponsiveCard key={index}>
            <StackLayout spacing="sm">
              {columns
                .filter(col => ['critical', 'important'].includes(col.priority))
                .map(column => (
                  <div key={column.key} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {column.label}:
                    </span>
                    <span className="text-sm font-medium">
                      {column.render 
                        ? column.render(row[column.key], row)
                        : row[column.key]
                      }
                    </span>
                  </div>
                ))
              }
            </StackLayout>
          </ResponsiveCard>
        ))}
      </StackLayout>
    )
  }

  // Tablet/Desktop: Table display
  const visibleColumns = columns.filter(col => {
    if (deviceType === 'tablet') {
      return ['critical', 'important', 'secondary'].includes(col.priority)
    }
    return true // Desktop shows all columns
  })

  return (
    <div className={cn("overflow-auto", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {visibleColumns.map(column => (
              <th key={column.key} className="text-left p-3">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className="border-b hover:bg-accent/50">
              {visibleColumns.map(column => (
                <td key={column.key} className="p-3">
                  {column.render 
                    ? column.render(row[column.key], row)
                    : row[column.key]
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}