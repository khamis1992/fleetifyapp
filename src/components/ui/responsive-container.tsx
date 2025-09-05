import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useResponsiveBreakpoint } from "@/hooks/use-mobile"

const responsiveContainerVariants = cva(
  "w-full mx-auto",
  {
    variants: {
      size: {
        sm: "max-w-2xl",
        default: "max-w-7xl",
        lg: "max-w-screen-2xl",
        full: "max-w-none",
        content: "max-w-4xl"
      },
      padding: {
        none: "px-0",
        sm: "", // Responsive padding handled below
        default: "",
        lg: ""
      },
      centered: {
        true: "flex flex-col items-center",
        false: ""
      }
    },
    defaultVariants: {
      size: "default",
      padding: "default",
      centered: false
    }
  }
)

export interface ResponsiveContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof responsiveContainerVariants> {
  as?: React.ElementType
  fluid?: boolean
}

const ResponsiveContainer = React.forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  ({ 
    className, 
    size, 
    padding, 
    centered, 
    as: Component = "div",
    fluid = false,
    ...props 
  }, ref) => {
    const { isMobile, isTablet, isDesktop } = useResponsiveBreakpoint()
    
    // Responsive padding based on device
    const responsivePadding = React.useMemo(() => {
      if (padding === 'none') return 'px-0'
      
      const paddingMap = {
        sm: isMobile ? 'px-3' : isTablet ? 'px-4' : 'px-6',
        default: isMobile ? 'px-4' : isTablet ? 'px-6' : 'px-8',
        lg: isMobile ? 'px-6' : isTablet ? 'px-8' : 'px-12'
      }
      
      return paddingMap[padding || 'default']
    }, [isMobile, isTablet, isDesktop, padding])

    // Fluid handling for mobile-first approach
    const containerSize = fluid && isMobile ? 'full' : size

    return (
      <Component
        className={cn(
          responsiveContainerVariants({ 
            size: containerSize, 
            padding: 'none', // Handle padding separately
            centered 
          }),
          responsivePadding,
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

ResponsiveContainer.displayName = "ResponsiveContainer"

// Page container with responsive spacing
export interface PageContainerProps extends ResponsiveContainerProps {
  withSidebar?: boolean
  headerHeight?: string
}

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ withSidebar = false, headerHeight = "h-14", className, ...props }, ref) => {
    const { isMobile } = useResponsiveBreakpoint()
    
    const sidebarAdjustment = withSidebar && !isMobile ? 'lg:pl-64' : ''
    const topSpacing = isMobile ? 'pt-2' : 'pt-4'
    
    return (
      <ResponsiveContainer
        ref={ref}
        className={cn(
          "min-h-screen-safe",
          sidebarAdjustment,
          topSpacing,
          className
        )}
        fluid={isMobile}
        {...props}
      />
    )
  }
)

PageContainer.displayName = "PageContainer"

// Section container for organizing content
export interface SectionContainerProps extends ResponsiveContainerProps {
  spacing?: 'tight' | 'normal' | 'loose'
}

export const SectionContainer = React.forwardRef<HTMLDivElement, SectionContainerProps>(
  ({ spacing = 'normal', className, ...props }, ref) => {
    const { isMobile, isTablet } = useResponsiveBreakpoint()
    
    const spacingMap = {
      tight: isMobile ? 'py-4' : isTablet ? 'py-6' : 'py-8',
      normal: isMobile ? 'py-6' : isTablet ? 'py-8' : 'py-12',
      loose: isMobile ? 'py-8' : isTablet ? 'py-12' : 'py-16'
    }
    
    return (
      <ResponsiveContainer
        ref={ref}
        className={cn(spacingMap[spacing], className)}
        {...props}
      />
    )
  }
)

SectionContainer.displayName = "SectionContainer"

export { 
  ResponsiveContainer, 
  responsiveContainerVariants 
}