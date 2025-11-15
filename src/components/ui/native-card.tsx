/**
 * Native Mobile Card Component
 * iOS/Android inspired card design with native-like interactions
 */

import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

export interface NativeCardProps extends Omit<HTMLMotionProps<"div">, "onClick"> {
  /**
   * Makes the card pressable with native-like feedback
   */
  pressable?: boolean
  
  /**
   * Card variant
   */
  variant?: "default" | "elevated" | "gradient"
  
  /**
   * Click handler
   */
  onClick?: () => void
  
  /**
   * Whether to show ripple effect on press
   */
  ripple?: boolean
}

const NativeCard = React.forwardRef<HTMLDivElement, NativeCardProps>(
  ({ className, pressable = false, variant = "default", onClick, ripple = true, children, ...props }, ref) => {
    const [isPressed, setIsPressed] = React.useState(false)

    const handlePress = () => {
      if (pressable || onClick) {
        setIsPressed(true)
        setTimeout(() => setIsPressed(false), 150)
      }
    }

    const cardVariants = {
      rest: { scale: 1 },
      pressed: { scale: 0.97 },
    }

    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="rest"
        animate={isPressed ? "pressed" : "rest"}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => {
          handlePress()
          onClick?.()
        }}
        className={cn(
          "native-card",
          variant === "elevated" && "native-card-elevated",
          variant === "gradient" && "native-card-gradient",
          (pressable || onClick) && "pressable cursor-pointer",
          ripple && "native-ripple",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

NativeCard.displayName = "NativeCard"

const NativeCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-5 pb-3", className)}
    {...props}
  />
))

NativeCardHeader.displayName = "NativeCardHeader"

const NativeCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("native-heading", className)}
    {...props}
  />
))

NativeCardTitle.displayName = "NativeCardTitle"

const NativeCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("native-caption", className)}
    {...props}
  />
))

NativeCardDescription.displayName = "NativeCardDescription"

const NativeCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-5 pt-0", className)}
    {...props}
  />
))

NativeCardContent.displayName = "NativeCardContent"

const NativeCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-5 pt-0", className)}
    {...props}
  />
))

NativeCardFooter.displayName = "NativeCardFooter"

export { 
  NativeCard, 
  NativeCardHeader, 
  NativeCardFooter, 
  NativeCardTitle, 
  NativeCardDescription, 
  NativeCardContent 
}

