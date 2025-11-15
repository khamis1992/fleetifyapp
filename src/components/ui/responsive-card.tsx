import React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useSimpleBreakpoint } from "@/hooks/use-mobile-simple"

const responsiveCardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-border",
        outlined: "border-2 border-border",
        elevated: "shadow-md hover:shadow-lg",
        interactive: "cursor-pointer hover:bg-accent/5 active:scale-[0.98]"
      },
      size: {
        sm: "", // Responsive padding handled below
        default: "",
        lg: ""
      },
      density: {
        compact: "",
        comfortable: "",
        spacious: ""
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      density: "comfortable"
    }
  }
)

export interface ResponsiveCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof responsiveCardVariants> {
  asChild?: boolean
}

const ResponsiveCard = React.forwardRef<HTMLDivElement, ResponsiveCardProps>(
  ({ className, variant, size, density, ...props }, ref) => {
    const { isMobile, isTablet, isDesktop } = useSimpleBreakpoint()
    
    // Responsive padding based on device and density
    const responsivePadding = useMemo(() => {
      const densityMap = {
        compact: isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-4',
        comfortable: isMobile ? 'p-4' : isTablet ? 'p-5' : 'p-6',
        spacious: isMobile ? 'p-5' : isTablet ? 'p-6' : 'p-8'
      }
      return densityMap[density || 'comfortable']
    }, [isMobile, isTablet, density])

    // Responsive margin/spacing
    const responsiveSpacing = useMemo(() => {
      if (isMobile) return 'mb-4'
      if (isTablet) return 'mb-5'
      return 'mb-6'
    }, [isMobile, isTablet])

    // Touch-friendly enhancements for mobile
    const touchEnhancements = isMobile ? 'min-h-touch active:bg-accent/10' : ''

    return (
      <div
        className={cn(
          responsiveCardVariants({ variant, size, density }),
          responsivePadding,
          responsiveSpacing,
          touchEnhancements,
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

ResponsiveCard.displayName = "ResponsiveCard"

const ResponsiveCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { isMobile, isTablet } = useSimpleBreakpoint()
  
  const responsivePadding = isMobile ? 'p-4 pb-2' : isTablet ? 'p-5 pb-3' : 'p-6 pb-4'
  
  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5", responsivePadding, className)}
      {...props}
    />
  )
})
ResponsiveCardHeader.displayName = "ResponsiveCardHeader"

const ResponsiveCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const { isMobile, isTablet } = useSimpleBreakpoint()
  
  const responsiveSize = isMobile 
    ? 'text-lg font-semibold' 
    : isTablet 
      ? 'text-xl font-semibold' 
      : 'text-2xl font-semibold'
  
  return (
    <h3
      ref={ref}
      className={cn(
        "leading-none tracking-tight",
        responsiveSize,
        className
      )}
      {...props}
    />
  )
})
ResponsiveCardTitle.displayName = "ResponsiveCardTitle"

const ResponsiveCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { isMobile } = useSimpleBreakpoint()
  
  const responsiveSize = isMobile ? 'text-sm' : 'text-sm'
  
  return (
    <p
      ref={ref}
      className={cn("text-muted-foreground", responsiveSize, className)}
      {...props}
    />
  )
})
ResponsiveCardDescription.displayName = "ResponsiveCardDescription"

const ResponsiveCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { isMobile, isTablet } = useSimpleBreakpoint()
  
  const responsivePadding = isMobile ? 'p-4 pt-0' : isTablet ? 'p-5 pt-0' : 'p-6 pt-0'
  
  return (
    <div 
      ref={ref} 
      className={cn(responsivePadding, className)} 
      {...props} 
    />
  )
})
ResponsiveCardContent.displayName = "ResponsiveCardContent"

const ResponsiveCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { isMobile, isTablet } = useSimpleBreakpoint()
  
  const responsivePadding = isMobile ? 'p-4 pt-0' : isTablet ? 'p-5 pt-0' : 'p-6 pt-0'
  const responsiveLayout = isMobile ? 'flex-col gap-2' : 'flex-row gap-3'
  
  return (
    <div
      ref={ref}
      className={cn("flex items-center", responsiveLayout, responsivePadding, className)}
      {...props}
    />
  )
})
ResponsiveCardFooter.displayName = "ResponsiveCardFooter"

export {
  ResponsiveCard,
  ResponsiveCardHeader,
  ResponsiveCardFooter,
  ResponsiveCardTitle,
  ResponsiveCardDescription,
  ResponsiveCardContent,
}