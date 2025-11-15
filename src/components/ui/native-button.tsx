/**
 * Native Button Component
 * iOS/Android inspired button with haptic feedback
 */

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, HTMLMotionProps } from "framer-motion"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"

const nativeButtonVariants = cva(
  "native-button inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "native-button-primary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        outline: "border-2 border-primary text-primary bg-background hover:bg-primary/10",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-gradient-to-br from-success to-success/90 text-white shadow-lg shadow-success/30",
        warning: "bg-gradient-to-br from-warning to-warning/90 text-white shadow-lg shadow-warning/30",
        destructive: "bg-gradient-to-br from-destructive to-destructive/90 text-white shadow-lg shadow-destructive/30",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-10 px-4 text-sm",
        lg: "h-14 px-8 text-lg",
        icon: "h-12 w-12",
        "icon-sm": "h-10 w-10",
        "icon-lg": "h-14 w-14",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface NativeButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">,
    VariantProps<typeof nativeButtonVariants> {
  asChild?: boolean
  loading?: boolean
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  haptic?: boolean
}

const NativeButton = React.forwardRef<HTMLButtonElement, NativeButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth,
    asChild = false, 
    loading = false,
    disabled,
    onClick,
    haptic = true,
    children,
    ...props 
  }, ref) => {
    const { vibrate } = useHapticFeedback()
    const [isPressed, setIsPressed] = React.useState(false)

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return
      
      // Haptic feedback
      if (haptic) {
        vibrate('light')
      }
      
      // Press animation
      setIsPressed(true)
      setTimeout(() => setIsPressed(false), 150)
      
      // Call original onClick
      onClick?.(event)
    }

    const Comp = asChild ? Slot : motion.button

    return (
      <Comp
        className={cn(nativeButtonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        onClick={handleClick}
        disabled={disabled || loading}
        animate={isPressed ? { scale: 0.97 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </Comp>
    )
  }
)
NativeButton.displayName = "NativeButton"

export { NativeButton, nativeButtonVariants }

