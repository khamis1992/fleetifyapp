/**
 * Native Bottom Sheet Component
 * iOS/Android inspired bottom sheet with drag-to-dismiss
 */

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSimpleBreakpoint } from "@/hooks/use-mobile-simple"

const NativeBottomSheet = DialogPrimitive.Root

const NativeBottomSheetTrigger = DialogPrimitive.Trigger

const NativeBottomSheetPortal = DialogPrimitive.Portal

const NativeBottomSheetClose = DialogPrimitive.Close

interface NativeBottomSheetOverlayProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {}

const NativeBottomSheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  NativeBottomSheetOverlayProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
      className
    )}
    {...props}
  />
))
NativeBottomSheetOverlay.displayName = DialogPrimitive.Overlay.displayName

interface NativeBottomSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /**
   * Maximum height of the sheet (default: 90vh)
   */
  maxHeight?: string
  
  /**
   * Whether to show the drag handle
   */
  showHandle?: boolean
  
  /**
   * Whether to enable drag to dismiss
   */
  dragToDismiss?: boolean
  
  /**
   * Close threshold (default: 100px)
   */
  closeThreshold?: number
}

const NativeBottomSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  NativeBottomSheetContentProps
>(({ 
  className, 
  children, 
  maxHeight = "90vh", 
  showHandle = true, 
  dragToDismiss = true,
  closeThreshold = 100,
  ...props 
}, ref) => {
  const { isMobile } = useSimpleBreakpoint()
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, closeThreshold], [1, 0.5])
  
  const [isDragging, setIsDragging] = React.useState(false)

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)
    
    if (dragToDismiss && info.offset.y > closeThreshold) {
      // Close the sheet
      const closeButton = document.querySelector('[data-sheet-close]') as HTMLButtonElement
      closeButton?.click()
    }
  }

  return (
    <NativeBottomSheetPortal>
      <AnimatePresence>
        <NativeBottomSheetOverlay />
        <DialogPrimitive.Content
          ref={ref}
          asChild
          {...props}
        >
          <motion.div
            className={cn(
              "native-bottom-sheet",
              "max-w-full sm:max-w-lg mx-auto",
              className
            )}
            style={{ 
              y: dragToDismiss ? y : undefined,
              opacity: dragToDismiss ? opacity : undefined,
              maxHeight,
            }}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
            }}
            drag={dragToDismiss && isMobile ? "y" : false}
            dragConstraints={{ top: 0, bottom: 400 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
          >
            {/* Drag Handle */}
            {showHandle && (
              <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                <div className="native-sheet-handle" />
              </div>
            )}
            
            {/* Content */}
            <div className={cn(
              "overflow-y-auto",
              showHandle ? "pb-6" : "pt-6 pb-6"
            )}>
              {children}
            </div>
            
            {/* Hidden close button for programmatic closing */}
            <DialogPrimitive.Close asChild>
              <button 
                data-sheet-close 
                className="hidden" 
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogPrimitive.Close>
          </motion.div>
        </DialogPrimitive.Content>
      </AnimatePresence>
    </NativeBottomSheetPortal>
  )
})
NativeBottomSheetContent.displayName = DialogPrimitive.Content.displayName

const NativeBottomSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 px-6 pb-4",
      className
    )}
    {...props}
  />
)
NativeBottomSheetHeader.displayName = "NativeBottomSheetHeader"

const NativeBottomSheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 px-6 pt-4",
      className
    )}
    {...props}
  />
)
NativeBottomSheetFooter.displayName = "NativeBottomSheetFooter"

const NativeBottomSheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("native-heading", className)}
    {...props}
  />
))
NativeBottomSheetTitle.displayName = DialogPrimitive.Title.displayName

const NativeBottomSheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("native-caption", className)}
    {...props}
  />
))
NativeBottomSheetDescription.displayName = DialogPrimitive.Description.displayName

export {
  NativeBottomSheet,
  NativeBottomSheetPortal,
  NativeBottomSheetOverlay,
  NativeBottomSheetTrigger,
  NativeBottomSheetClose,
  NativeBottomSheetContent,
  NativeBottomSheetHeader,
  NativeBottomSheetFooter,
  NativeBottomSheetTitle,
  NativeBottomSheetDescription,
}

