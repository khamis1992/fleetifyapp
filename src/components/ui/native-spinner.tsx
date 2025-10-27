/**
 * Native Loading Spinner Component
 * iOS/Android inspired loading indicators
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const spinnerVariants = cva("native-spinner", {
  variants: {
    size: {
      sm: "w-4 h-4 border-[2px]",
      default: "w-6 h-6 border-[2.5px]",
      lg: "w-8 h-8 border-[3px]",
      xl: "w-12 h-12 border-[3.5px]",
    },
    variant: {
      primary: "border-t-primary",
      secondary: "border-t-secondary",
      white: "border-t-white border-white/30",
      muted: "border-t-muted-foreground",
    },
  },
  defaultVariants: {
    size: "default",
    variant: "primary",
  },
})

export interface NativeSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

const NativeSpinner = React.forwardRef<HTMLDivElement, NativeSpinnerProps>(
  ({ className, size, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(spinnerVariants({ size, variant }), className)}
        role="status"
        aria-label="جاري التحميل"
        {...props}
      >
        <span className="sr-only">جاري التحميل...</span>
      </div>
    )
  }
)
NativeSpinner.displayName = "NativeSpinner"

/**
 * Native Skeleton Loader
 * For content placeholders
 */
interface NativeSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string
  height?: string
  rounded?: boolean
  circle?: boolean
}

const NativeSkeleton = React.forwardRef<HTMLDivElement, NativeSkeletonProps>(
  ({ className, width, height, rounded = true, circle = false, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "native-skeleton",
          rounded && !circle && "rounded-lg",
          circle && "rounded-full",
          className
        )}
        style={{
          width: width || "100%",
          height: height || "20px",
          ...style,
        }}
        {...props}
      />
    )
  }
)
NativeSkeleton.displayName = "NativeSkeleton"

/**
 * Native Pull Refresh Indicator
 */
interface NativePullRefreshProps {
  pulling?: boolean
  refreshing?: boolean
}

const NativePullRefresh: React.FC<NativePullRefreshProps> = ({ 
  pulling = false, 
  refreshing = false 
}) => {
  return (
    <div
      className={cn(
        "native-pull-refresh",
        pulling && "pulling"
      )}
    >
      {refreshing ? (
        <NativeSpinner size="sm" />
      ) : (
        <svg
          className="w-6 h-6 text-primary"
          style={{
            transform: pulling ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease",
          }}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      )}
    </div>
  )
}
NativePullRefresh.displayName = "NativePullRefresh"

export { NativeSpinner, NativeSkeleton, NativePullRefresh, spinnerVariants }

