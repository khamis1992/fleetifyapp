import React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSimpleBreakpoint } from "@/hooks/use-mobile-simple"

const responsiveDialogVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
        center: "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] border data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
      },
      size: {
        sm: "max-w-sm",
        default: "max-w-lg", 
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        full: "max-w-7xl",
        screen: "min-w-[100vw] min-h-[100vh]"
      }
    },
    defaultVariants: {
      side: "center",
      size: "default"
    }
  }
)

interface ResponsiveDialogProps extends 
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>,
  VariantProps<typeof responsiveDialogVariants> {
  mobileFullScreen?: boolean
  mobileFromBottom?: boolean
}

const ResponsiveDialog = DialogPrimitive.Root

const ResponsiveDialogTrigger = DialogPrimitive.Trigger

const ResponsiveDialogPortal = DialogPrimitive.Portal

const ResponsiveDialogClose = DialogPrimitive.Close

const ResponsiveDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
ResponsiveDialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const ResponsiveDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & 
  VariantProps<typeof responsiveDialogVariants> & {
    mobileFullScreen?: boolean
    mobileFromBottom?: boolean
  }
>(({ 
  className, 
  children, 
  side,
  size,
  mobileFullScreen = false,
  mobileFromBottom = false,
  ...props 
}, ref) => {
  const { isMobile, isTablet } = useSimpleBreakpoint()

  // Determine responsive behavior
  const responsiveSide = React.useMemo(() => {
    if (isMobile) {
      if (mobileFullScreen) return "center"
      if (mobileFromBottom) return "bottom"
      return "bottom"
    }
    return side
  }, [isMobile, mobileFullScreen, mobileFromBottom, side])

  const responsiveSize = React.useMemo(() => {
    if (isMobile && mobileFullScreen) return "screen"
    if (isMobile) return "full"
    if (isTablet && size === "xl") return "lg"
    return size
  }, [isMobile, isTablet, mobileFullScreen, size])

  return (
    <ResponsiveDialogPortal>
      <ResponsiveDialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          responsiveDialogVariants({ 
            side: responsiveSide, 
            size: responsiveSize 
          }),
          // Mobile-specific styles
          isMobile && "rounded-t-lg",
          isMobile && mobileFullScreen && "rounded-none",
          // Tablet adjustments
          isTablet && "max-w-[90vw] max-h-[90vh]",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className={cn(
          "absolute top-4 left-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
          isMobile && "top-3 left-3 h-8 w-8 p-1"
        )}>
          <X className="h-4 w-4" />
          <span className="sr-only">إغلاق</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </ResponsiveDialogPortal>
  )
})
ResponsiveDialogContent.displayName = DialogPrimitive.Content.displayName

const ResponsiveDialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { isMobile } = useSimpleBreakpoint()
  
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-right",
        isMobile ? "pb-4" : "pb-6",
        className
      )}
      {...props}
    />
  )
})
ResponsiveDialogHeader.displayName = "ResponsiveDialogHeader"

const ResponsiveDialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { isMobile } = useSimpleBreakpoint()
  
  return (
    <div
      ref={ref}
      className={cn(
        "flex justify-end space-x-2",
        isMobile && "flex-col space-x-0 space-y-2 pt-4",
        className
      )}
      {...props}
    />
  )
})
ResponsiveDialogFooter.displayName = "ResponsiveDialogFooter"

const ResponsiveDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  const { isMobile } = useSimpleBreakpoint()
  
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn(
        "font-semibold leading-none tracking-tight",
        isMobile ? "text-lg" : "text-xl lg:text-2xl",
        className
      )}
      {...props}
    />
  )
})
ResponsiveDialogTitle.displayName = DialogPrimitive.Title.displayName

const ResponsiveDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
ResponsiveDialogDescription.displayName = DialogPrimitive.Description.displayName

// Specialized responsive dialog components
export interface ResponsiveModalProps extends ResponsiveDialogProps {
  title?: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  title,
  description,
  children,
  footer,
  open,
  onOpenChange,
  mobileFullScreen = false,
  mobileFromBottom = true,
  size = "default",
  ...props
}) => {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} {...props}>
      <ResponsiveDialogContent 
        size={size}
        mobileFullScreen={mobileFullScreen}
        mobileFromBottom={mobileFromBottom}
      >
        {title && (
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
            {description && (
              <ResponsiveDialogDescription>
                {description}
              </ResponsiveDialogDescription>
            )}
          </ResponsiveDialogHeader>
        )}
        
        <div className="flex-1 overflow-auto">
          {children}
        </div>
        
        {footer && (
          <ResponsiveDialogFooter>
            {footer}
          </ResponsiveDialogFooter>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

export {
  ResponsiveDialog,
  ResponsiveDialogPortal,
  ResponsiveDialogOverlay,
  ResponsiveDialogClose,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
}