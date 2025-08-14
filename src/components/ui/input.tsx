import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-md border-2 border-input-border bg-input px-4 py-3 text-base text-foreground placeholder:text-muted-foreground transition-colors",
          "focus:border-input-focus focus:ring-2 focus:ring-input-focus/20 focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "hover:border-border",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
