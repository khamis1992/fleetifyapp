import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useResponsiveBreakpoint } from "@/hooks/use-mobile"
import { useDeviceDetection } from "@/hooks/responsive/useDeviceDetection"

const responsiveButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-accent",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-card-hover hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-dark",
        ghost: "hover:bg-card-hover hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-accent",
        success: "bg-success text-success-foreground hover:bg-success/90",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
      },
      size: {
        xs: "h-7 px-2 text-xs",
        sm: "h-9 px-3 text-sm",
        default: "h-10 px-4 py-2",
        lg: "h-11 px-8 text-base",
        xl: "h-12 px-10 text-lg",
        icon: "h-10 w-10",
      },
      // Mobile-specific sizes
      mobileSize: {
        xs: "mobile:h-8 mobile:px-3 mobile:text-xs",
        sm: "mobile:h-10 mobile:px-4 mobile:text-sm", 
        default: "mobile:h-12 mobile:px-6 mobile:py-3",
        lg: "mobile:h-14 mobile:px-8 mobile:text-base",
        xl: "mobile:h-16 mobile:px-12 mobile:text-lg",
        icon: "mobile:h-12 mobile:w-12",
      },
      // Touch optimization
      touchOptimized: {
        true: "min-h-[44px] min-w-[44px] touch-manipulation select-none",
        false: "",
      },
      // Full width on mobile
      fullWidthOnMobile: {
        true: "mobile:w-full",
        false: "",
      },
      // Loading state
      loading: {
        true: "cursor-wait",
        false: "",
      },
      // Responsive behavior
      responsive: {
        true: "transition-all duration-200 ease-in-out",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      mobileSize: "default",
      touchOptimized: true,
      fullWidthOnMobile: false,
      loading: false,
      responsive: true,
    },
  }
)

export interface ResponsiveButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof responsiveButtonVariants> {
  asChild?: boolean
  
  // Loading state
  loading?: boolean
  loadingText?: string
  
  // Mobile-specific props
  mobileSize?: "xs" | "sm" | "default" | "lg" | "xl" | "icon"
  touchOptimized?: boolean
  fullWidthOnMobile?: boolean
  
  // Haptic feedback
  enableHapticFeedback?: boolean
  
  // Icon support
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  
  // Responsive behavior
  responsive?: boolean
  adaptToDevice?: boolean
}

/**
 * ResponsiveButton - زر محسن للأجهزة المختلفة
 * يوفر تجربة مستخدم محسنة مع دعم اللمس والتجاوب
 */
const ResponsiveButton = React.forwardRef<HTMLButtonElement, ResponsiveButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    mobileSize,
    touchOptimized = true,
    fullWidthOnMobile = false,
    loading = false,
    loadingText,
    enableHapticFeedback = true,
    leftIcon,
    rightIcon,
    responsive = true,
    adaptToDevice = true,
    asChild = false, 
    children,
    onClick,
    disabled,
    ...props 
  }, ref) => {
    const { isMobile, touchDevice } = useResponsiveBreakpoint()
    const { touchSupport } = useDeviceDetection()
    const [isPressed, setIsPressed] = React.useState(false)

    // Determine effective size based on device
    const effectiveSize = React.useMemo(() => {
      if (!adaptToDevice) return size
      
      // Auto-adjust size for mobile devices
      if (isMobile) {
        switch (size) {
          case 'xs': return 'sm'
          case 'sm': return 'default'
          case 'default': return 'lg'
          case 'lg': return 'xl'
          default: return size
        }
      }
      
      return size
    }, [size, isMobile, adaptToDevice])

    // Determine mobile size
    const effectiveMobileSize = React.useMemo(() => {
      if (!mobileSize) return effectiveSize
      return mobileSize
    }, [mobileSize, effectiveSize])

    // Handle haptic feedback
    const triggerHapticFeedback = React.useCallback(() => {
      if (!enableHapticFeedback || !touchSupport) return
      
      // Use Vibration API if available
      if ('vibrate' in navigator) {
        navigator.vibrate(10) // Short vibration
      }
    }, [enableHapticFeedback, touchSupport])

    // Enhanced click handler
    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return
      
      triggerHapticFeedback()
      onClick?.(event)
    }, [disabled, loading, onClick, triggerHapticFeedback])

    // Touch handlers for visual feedback
    const handleTouchStart = React.useCallback(() => {
      if (touchOptimized && touchSupport) {
        setIsPressed(true)
      }
    }, [touchOptimized, touchSupport])

    const handleTouchEnd = React.useCallback(() => {
      if (touchOptimized && touchSupport) {
        setIsPressed(false)
      }
    }, [touchOptimized, touchSupport])

    // Loading spinner component
    const LoadingSpinner = () => (
      <svg
        className="animate-spin h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    )

    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(
          responsiveButtonVariants({ 
            variant, 
            size: effectiveSize,
            mobileSize: effectiveMobileSize,
            touchOptimized: touchOptimized && touchSupport,
            fullWidthOnMobile,
            loading,
            responsive
          }),
          // Touch-specific enhancements
          touchSupport && touchOptimized && [
            "active:scale-95",
            "active:brightness-95",
            isPressed && "scale-95 brightness-95"
          ],
          // Mobile-specific adjustments
          isMobile && [
            "font-medium", // Slightly bolder text on mobile
            variant === 'outline' && "border-2", // Thicker borders on mobile
          ],
          // Loading state
          loading && "cursor-wait opacity-80",
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseLeave={() => setIsPressed(false)}
        aria-busy={loading}
        aria-label={loading && loadingText ? loadingText : undefined}
        {...props}
      >
        {/* Left icon */}
        {leftIcon && !loading && (
          <span className="flex-shrink-0">
            {leftIcon}
          </span>
        )}
        
        {/* Loading spinner */}
        {loading && (
          <LoadingSpinner />
        )}
        
        {/* Button text */}
        <span className={cn(
          "flex-1 truncate",
          loading && loadingText && "sr-only"
        )}>
          {loading && loadingText ? loadingText : children}
        </span>
        
        {/* Right icon */}
        {rightIcon && !loading && (
          <span className="flex-shrink-0">
            {rightIcon}
          </span>
        )}
      </Comp>
    )
  }
)

ResponsiveButton.displayName = "ResponsiveButton"

// Specialized button variants for common use cases

/**
 * TouchButton - زر محسن خصيصاً للأجهزة اللمسية
 */
export const TouchButton = React.forwardRef<HTMLButtonElement, ResponsiveButtonProps>(
  (props, ref) => (
    <ResponsiveButton
      {...props}
      ref={ref}
      touchOptimized={true}
      mobileSize="lg"
      fullWidthOnMobile={true}
    />
  )
)

TouchButton.displayName = "TouchButton"

/**
 * IconButton - زر أيقونة متجاوب
 */
export const ResponsiveIconButton = React.forwardRef<
  HTMLButtonElement, 
  ResponsiveButtonProps & { icon: React.ReactNode }
>(({ icon, children, ...props }, ref) => (
  <ResponsiveButton
    {...props}
    ref={ref}
    size="icon"
    mobileSize="icon"
    aria-label={typeof children === 'string' ? children : 'Button'}
  >
    {icon}
    {children && <span className="sr-only">{children}</span>}
  </ResponsiveButton>
))

ResponsiveIconButton.displayName = "ResponsiveIconButton"

/**
 * FloatingActionButton - زر عائم للإجراءات السريعة
 */
export const FloatingActionButton = React.forwardRef<HTMLButtonElement, ResponsiveButtonProps>(
  ({ className, ...props }, ref) => (
    <ResponsiveButton
      {...props}
      ref={ref}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "rounded-full shadow-lg",
        "h-14 w-14 mobile:h-16 mobile:w-16",
        className
      )}
      size="icon"
      mobileSize="icon"
    />
  )
)

FloatingActionButton.displayName = "FloatingActionButton"

export { ResponsiveButton, responsiveButtonVariants }
export type { ResponsiveButtonProps }
