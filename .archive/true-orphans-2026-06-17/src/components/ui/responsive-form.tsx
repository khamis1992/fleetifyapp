import React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useSimpleBreakpoint } from "@/hooks/use-mobile-simple"
import { ResponsiveGrid } from "./responsive-grid"
import { Button } from "./button"

const responsiveFormVariants = cva(
  "w-full space-y-4",
  {
    variants: {
      layout: {
        single: "grid grid-cols-1 gap-4",
        double: "grid grid-cols-1 md:grid-cols-2 gap-4",
        triple: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
        adaptive: "" // Handled in component logic
      },
      density: {
        compact: "space-y-3 gap-3",
        comfortable: "space-y-4 gap-4", 
        spacious: "space-y-6 gap-6"
      },
      direction: {
        horizontal: "",
        vertical: "flex flex-col"
      }
    },
    defaultVariants: {
      layout: "adaptive",
      density: "comfortable",
      direction: "vertical"
    }
  }
)

export interface ResponsiveFormProps
  extends React.FormHTMLAttributes<HTMLFormElement>,
    VariantProps<typeof responsiveFormVariants> {
  children: React.ReactNode
  onSubmit?: (e: React.FormEvent) => void
  loading?: boolean
  submitText?: string
  cancelText?: string
  onCancel?: () => void
  showActions?: boolean
  actionsPosition?: 'top' | 'bottom' | 'both'
  mobileStackActions?: boolean
}

const ResponsiveForm = React.forwardRef<HTMLFormElement, ResponsiveFormProps>(
  ({ 
    className,
    layout,
    density, 
    direction,
    children,
    onSubmit,
    loading = false,
    submitText = "حفظ",
    cancelText = "إلغاء",
    onCancel,
    showActions = true,
    actionsPosition = 'bottom',
    mobileStackActions = true,
    ...props 
  }, ref) => {
    const { isMobile, isTablet } = useSimpleBreakpoint()

    // Determine responsive layout
    const responsiveLayout = React.useMemo(() => {
      if (layout === 'adaptive') {
        if (isMobile) return 'single'
        if (isTablet) return 'double'
        return 'triple'
      }
      return layout
    }, [layout, isMobile, isTablet])

    // Determine responsive density
    const responsiveDensity = React.useMemo(() => {
      if (isMobile && density === 'spacious') return 'comfortable'
      if (isMobile && density === 'comfortable') return 'compact'
      return density
    }, [density, isMobile])

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (!loading && onSubmit) {
        onSubmit(e)
      }
    }

    const renderActions = () => {
      if (!showActions) return null

      return (
        <div className={cn(
          "flex gap-3",
          isMobile && mobileStackActions 
            ? "flex-col" 
            : "flex-row justify-end",
          isMobile && "pt-4"
        )}>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className={cn(
                isMobile && mobileStackActions && "w-full"
              )}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading}
            className={cn(
              isMobile && mobileStackActions && "w-full"
            )}
          >
            {loading ? "جاري الحفظ..." : submitText}
          </Button>
        </div>
      )
    }

    return (
      <form
        ref={ref}
        onSubmit={handleSubmit}
        className={cn(
          responsiveFormVariants({ 
            layout: responsiveLayout, 
            density: responsiveDensity, 
            direction 
          }),
          className
        )}
        {...props}
      >
        {/* Top Actions */}
        {actionsPosition === 'top' && renderActions()}
        
        {/* Form Content */}
        <div className={cn(
          "flex-1",
          responsiveLayout === 'single' && "space-y-4",
          responsiveLayout === 'double' && "grid grid-cols-1 md:grid-cols-2 gap-4",
          responsiveLayout === 'triple' && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        )}>
          {children}
        </div>

        {/* Bottom Actions */}
        {actionsPosition === 'bottom' && renderActions()}
      </form>
    )
  }
)

ResponsiveForm.displayName = "ResponsiveForm"

// Form Section Component for organizing form fields
export interface ResponsiveFormSectionProps 
  extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  columns?: 1 | 2 | 3
  collapsible?: boolean
  defaultOpen?: boolean
}

export const ResponsiveFormSection = React.forwardRef<
  HTMLDivElement,
  ResponsiveFormSectionProps
>(({ 
  className,
  title,
  description,
  columns,
  collapsible = false,
  defaultOpen = true,
  children,
  ...props 
}, ref) => {
  const { isMobile, isTablet } = useSimpleBreakpoint()
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  // Responsive column calculation
  const responsiveColumns = React.useMemo(() => {
    if (!columns) return undefined
    if (isMobile) return 1
    if (isTablet && columns > 2) return 2
    return columns
  }, [columns, isMobile, isTablet])

  return (
    <div
      ref={ref}
      className={cn("space-y-4", className)}
      {...props}
    >
      {/* Section Header */}
      {(title || description) && (
        <div 
          className={cn(
            "space-y-1",
            collapsible && "cursor-pointer select-none"
          )}
          onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
        >
          {title && (
            <h3 className={cn(
              "font-medium leading-none",
              isMobile ? "text-base" : "text-lg",
              collapsible && "flex items-center justify-between"
            )}>
              {title}
              {collapsible && (
                <span className={cn(
                  "transition-transform",
                  isOpen ? "rotate-90" : ""
                )}>
                  ▶
                </span>
              )}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Section Content */}
      {(!collapsible || isOpen) && (
        <div className={cn(
          "animate-in slide-in-from-top-2 duration-200",
          responsiveColumns && responsiveColumns === 1 && "space-y-4",
          responsiveColumns && responsiveColumns === 2 && "grid grid-cols-1 md:grid-cols-2 gap-4",
          responsiveColumns && responsiveColumns === 3 && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
          !responsiveColumns && "space-y-4"
        )}>
          {children}
        </div>
      )}
    </div>
  )
})

ResponsiveFormSection.displayName = "ResponsiveFormSection"

// Form Field Component with responsive label positioning
export interface ResponsiveFormFieldProps 
  extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  description?: string
  error?: string
  required?: boolean
  labelPosition?: 'top' | 'side'
  fullWidth?: boolean
}

export const ResponsiveFormField = React.forwardRef<
  HTMLDivElement,
  ResponsiveFormFieldProps
>(({ 
  className,
  label,
  description,
  error,
  required = false,
  labelPosition,
  fullWidth = false,
  children,
  ...props 
}, ref) => {
  const { isMobile } = useSimpleBreakpoint()

  // Force top label on mobile
  const effectiveLabelPosition = isMobile ? 'top' : (labelPosition || 'top')

  return (
    <div
      ref={ref}
      className={cn(
        "space-y-2",
        fullWidth && "col-span-full",
        effectiveLabelPosition === 'side' && "grid grid-cols-3 gap-4 space-y-0 items-start",
        className
      )}
      {...props}
    >
      {/* Label Section */}
      {label && (
        <div className={cn(
          effectiveLabelPosition === 'side' && "col-span-1 pt-2"
        )}>
          <label className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            required && "after:content-['*'] after:text-destructive after:mr-1"
          )}>
            {label}
          </label>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Input Section */}
      <div className={cn(
        effectiveLabelPosition === 'side' && "col-span-2",
        "space-y-2"
      )}>
        {children}
        
        {/* Error Message */}
        {error && (
          <p className="text-xs text-destructive animate-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    </div>
  )
})

ResponsiveFormField.displayName = "ResponsiveFormField"

export { 
  ResponsiveForm, 
  responsiveFormVariants 
}