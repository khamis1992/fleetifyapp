import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useResponsiveBreakpoint } from "@/hooks/use-mobile"
import { useDeviceDetection } from "@/hooks/responsive/useDeviceDetection"

const responsiveDialogVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
      mobileMode: {
        sheet: "mobile:inset-x-0 mobile:bottom-0 mobile:border-t mobile:data-[state=closed]:slide-out-to-bottom mobile:data-[state=open]:slide-in-from-bottom",
        fullscreen: "mobile:inset-0 mobile:border-0 mobile:data-[state=closed]:fade-out mobile:data-[state=open]:fade-in",
        dialog: "mobile:left-[50%] mobile:top-[50%] mobile:translate-x-[-50%] mobile:translate-y-[-50%] mobile:data-[state=closed]:zoom-out-95 mobile:data-[state=open]:zoom-in-95",
      },
      size: {
        sm: "max-w-sm",
        md: "max-w-md", 
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        full: "max-w-full",
      }
    },
    defaultVariants: {
      side: "right",
      mobileMode: "sheet",
      size: "md",
    },
  }
)

export interface ResponsiveDialogProps {
  children: React.ReactNode
  
  // State control
  open?: boolean
  onOpenChange?: (open: boolean) => void
  
  // Mobile behavior
  mobileMode?: "sheet" | "fullscreen" | "dialog"
  adaptiveSize?: boolean
  
  // Desktop behavior  
  side?: "top" | "bottom" | "left" | "right"
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  
  // Styling
  className?: string
  overlayClassName?: string
  
  // Behavior
  closeOnOutsideClick?: boolean
  closeOnEscape?: boolean
  preventScroll?: boolean
  
  // Accessibility
  title?: string
  description?: string
}

const ResponsiveDialog = DialogPrimitive.Root

const ResponsiveDialogTrigger = DialogPrimitive.Trigger

const ResponsiveDialogPortal = DialogPrimitive.Portal

const ResponsiveDialogClose = DialogPrimitive.Close

const ResponsiveDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
    className?: string
  }
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
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
      mobileMode?: "sheet" | "fullscreen" | "dialog"
      adaptiveSize?: boolean
      overlayClassName?: string
    }
>(({ 
  side = "right", 
  mobileMode = "sheet",
  size = "md",
  adaptiveSize = true,
  className, 
  overlayClassName,
  children, 
  ...props 
}, ref) => {
  const { isMobile, isTablet } = useResponsiveBreakpoint()
  const { touchSupport } = useDeviceDetection()

  // Determine effective mobile mode
  const effectiveMobileMode = React.useMemo(() => {
    if (!adaptiveSize) return mobileMode
    
    // Auto-adjust based on content and device
    if (isMobile && touchSupport) {
      return mobileMode
    }
    
    return "dialog"
  }, [mobileMode, adaptiveSize, isMobile, touchSupport])

  // Determine effective size
  const effectiveSize = React.useMemo(() => {
    if (!adaptiveSize) return size
    
    if (isMobile) {
      return "full"
    }
    
    if (isTablet) {
      switch (size) {
        case "sm": return "md"
        case "md": return "lg" 
        case "lg": return "xl"
        default: return size
      }
    }
    
    return size
  }, [size, adaptiveSize, isMobile, isTablet])

  return (
    <ResponsiveDialogPortal>
      <ResponsiveDialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          responsiveDialogVariants({ 
            side, 
            mobileMode: effectiveMobileMode,
            size: effectiveSize 
          }),
          // Mobile-specific adjustments
          isMobile && effectiveMobileMode === "sheet" && [
            "rounded-t-lg",
            "max-h-[85vh]",
            "overflow-y-auto"
          ],
          isMobile && effectiveMobileMode === "fullscreen" && [
            "rounded-none",
            "h-full",
            "overflow-y-auto"
          ],
          // Touch optimizations
          touchSupport && [
            "touch-manipulation",
            "overscroll-contain"
          ],
          className
        )}
        {...props}
      >
        {children}
        
        {/* Close button */}
        <DialogPrimitive.Close className={cn(
          "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
          // Mobile adjustments
          isMobile && "right-6 top-6 h-8 w-8"
        )}>
          <X className={cn("h-4 w-4", isMobile && "h-5 w-5")} />
          <span className="sr-only">إغلاق</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </ResponsiveDialogPortal>
  )
})
ResponsiveDialogContent.displayName = DialogPrimitive.Content.displayName

const ResponsiveDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { isMobile } = useResponsiveBreakpoint()
  
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        isMobile && "pb-4 border-b border-border mb-4",
        className
      )}
      {...props}
    />
  )
}
ResponsiveDialogHeader.displayName = "ResponsiveDialogHeader"

const ResponsiveDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { isMobile } = useResponsiveBreakpoint()
  
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        isMobile && [
          "pt-4 border-t border-border mt-4",
          "gap-3", // Larger gap on mobile
          "flex-col" // Always stack on mobile
        ],
        className
      )}
      {...props}
    />
  )
}
ResponsiveDialogFooter.displayName = "ResponsiveDialogFooter"

const ResponsiveDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  const { isMobile } = useResponsiveBreakpoint()
  
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        isMobile && "text-xl font-bold", // Larger on mobile
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
>(({ className, ...props }, ref) => {
  const { isMobile } = useResponsiveBreakpoint()
  
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn(
        "text-sm text-muted-foreground",
        isMobile && "text-base", // Slightly larger on mobile
        className
      )}
      {...props}
    />
  )
})
ResponsiveDialogDescription.displayName = DialogPrimitive.Description.displayName

// Specialized dialog components

/**
 * MobileSheet - Sheet محسن للأجهزة المحمولة
 */
export const MobileSheet: React.FC<ResponsiveDialogProps> = ({
  children,
  ...props
}) => {
  const { isMobile } = useResponsiveBreakpoint()
  
  if (!isMobile) {
    return (
      <ResponsiveDialog {...props}>
        <ResponsiveDialogContent mobileMode="dialog" side="right">
          {children}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    )
  }
  
  return (
    <ResponsiveDialog {...props}>
      <ResponsiveDialogContent mobileMode="sheet" side="bottom">
        {children}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

/**
 * FullscreenModal - نافذة ملء الشاشة للموبايل
 */
export const FullscreenModal: React.FC<ResponsiveDialogProps> = ({
  children,
  ...props
}) => (
  <ResponsiveDialog {...props}>
    <ResponsiveDialogContent mobileMode="fullscreen" size="full">
      {children}
    </ResponsiveDialogContent>
  </ResponsiveDialog>
)

/**
 * AdaptiveModal - نافذة تتكيف تلقائياً مع الجهاز
 */
export const AdaptiveModal: React.FC<ResponsiveDialogProps> = ({
  children,
  ...props
}) => (
  <ResponsiveDialog {...props}>
    <ResponsiveDialogContent adaptiveSize={true}>
      {children}
    </ResponsiveDialogContent>
  </ResponsiveDialog>
)

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
