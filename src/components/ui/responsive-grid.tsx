import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useResponsiveBreakpoint } from "@/hooks/use-mobile"

const responsiveGridVariants = cva(
  "grid",
  {
    variants: {
      columns: {
        1: "grid-cols-1",
        2: "grid-cols-1 sm:grid-cols-2", 
        3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        5: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
        auto: "grid-cols-1 sm:grid-cols-2 md:grid-cols-auto-fit"
      },
      gap: {
        none: "gap-0",
        sm: "gap-2 md:gap-3",
        default: "gap-3 md:gap-4 lg:gap-6",
        lg: "gap-4 md:gap-6 lg:gap-8",
        xl: "gap-6 md:gap-8 lg:gap-10"
      },
      adaptive: {
        true: "", // Will be handled in component logic
        false: ""
      }
    },
    defaultVariants: {
      columns: 2,
      gap: "default",
      adaptive: true
    }
  }
)

export interface ResponsiveGridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof responsiveGridVariants> {
  mobileColumns?: 1 | 2
  tabletColumns?: 1 | 2 | 3 | 4
  desktopColumns?: 1 | 2 | 3 | 4 | 5 | 6
}

const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ 
    className, 
    columns, 
    gap, 
    adaptive, 
    mobileColumns,
    tabletColumns,
    desktopColumns,
    ...props 
  }, ref) => {
    const { isMobile, isTablet, isDesktop } = useResponsiveBreakpoint()
    
    // Custom adaptive columns logic
    const adaptiveGridClass = React.useMemo(() => {
      if (!adaptive || (!mobileColumns && !tabletColumns && !desktopColumns)) {
        return ""
      }
      
      const mobile = mobileColumns || 1
      const tablet = tabletColumns || 2
      const desktop = desktopColumns || 3
      
      let gridClass = `grid-cols-${mobile}`
      
      if (tablet !== mobile) {
        gridClass += ` md:grid-cols-${tablet}`
      }
      
      if (desktop !== tablet) {
        gridClass += ` lg:grid-cols-${desktop}`
      }
      
      return gridClass
    }, [adaptive, mobileColumns, tabletColumns, desktopColumns])

    // Responsive gap adjustments
    const responsiveGap = React.useMemo(() => {
      if (isMobile) {
        return gap === 'lg' ? 'gap-3' : gap === 'xl' ? 'gap-4' : 'gap-2'
      }
      return ""
    }, [isMobile, gap])

    return (
      <div
        className={cn(
          responsiveGridVariants({ columns: adaptive ? undefined : columns, gap, adaptive }),
          adaptiveGridClass,
          responsiveGap,
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

ResponsiveGrid.displayName = "ResponsiveGrid"

// Specialized grid components for common use cases
export interface DashboardGridProps extends Omit<ResponsiveGridProps, 'columns'> {
  variant?: 'stats' | 'cards' | 'mixed'
}

export const DashboardGrid = React.forwardRef<HTMLDivElement, DashboardGridProps>(
  ({ variant = 'cards', ...props }, ref) => {
    const gridConfig = {
      stats: { mobileColumns: 1, tabletColumns: 2, desktopColumns: 4 },
      cards: { mobileColumns: 1, tabletColumns: 2, desktopColumns: 3 },
      mixed: { mobileColumns: 1, tabletColumns: 2, desktopColumns: 3 }
    } as const

    return (
      <ResponsiveGrid
        ref={ref}
        {...gridConfig[variant]}
        {...props}
      />
    )
  }
)

DashboardGrid.displayName = "DashboardGrid"

export interface DataGridProps extends Omit<ResponsiveGridProps, 'columns'> {
  density?: 'compact' | 'comfortable' | 'spacious'
}

export const DataGrid = React.forwardRef<HTMLDivElement, DataGridProps>(
  ({ density = 'comfortable', gap, ...props }, ref) => {
    const densityGap = {
      compact: 'sm',
      comfortable: 'default', 
      spacious: 'lg'
    } as const

    return (
      <ResponsiveGrid
        ref={ref}
        mobileColumns={1}
        tabletColumns={2}
        desktopColumns={3}
        gap={gap || densityGap[density]}
        {...props}
      />
    )
  }
)

DataGrid.displayName = "DataGrid"

export { ResponsiveGrid, responsiveGridVariants }