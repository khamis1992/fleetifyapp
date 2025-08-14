import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border-2 border-input-border bg-input px-4 py-3 text-base text-foreground placeholder:text-muted-foreground transition-colors resize-none",
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
Textarea.displayName = "Textarea"

export { Textarea }
