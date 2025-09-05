import * as React from "react"
import { cn } from "@/lib/utils"
import { useResponsiveBreakpoint } from "@/hooks/use-mobile"
import { useDeviceDetection } from "@/hooks/responsive/useDeviceDetection"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface ResponsiveFormProps {
  children: React.ReactNode
  
  // Layout configuration
  mobileLayout?: 'single-column' | 'accordion' | 'steps'
  tabletLayout?: 'two-column' | 'single-column'
  desktopLayout?: 'multi-column' | 'two-column' | 'single-column'
  
  // Mobile features
  showProgress?: boolean
  enableAutoSave?: boolean
  optimizeForTouch?: boolean
  
  // Styling
  className?: string
  
  // Form behavior
  onSubmit?: (event: React.FormEvent) => void
}

/**
 * ResponsiveForm - نموذج متجاوب محسن للأجهزة المختلفة
 */
export const ResponsiveForm: React.FC<ResponsiveFormProps> = ({
  children,
  mobileLayout = 'single-column',
  tabletLayout = 'two-column',
  desktopLayout = 'multi-column',
  showProgress = false,
  enableAutoSave = false,
  optimizeForTouch = true,
  className,
  onSubmit
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsiveBreakpoint()
  const { touchSupport } = useDeviceDetection()

  // Determine current layout
  const currentLayout = React.useMemo(() => {
    if (isMobile) return mobileLayout
    if (isTablet) return tabletLayout
    return desktopLayout
  }, [isMobile, isTablet, mobileLayout, tabletLayout, desktopLayout])

  // Get layout classes
  const getLayoutClasses = () => {
    const baseClasses = "space-y-6"
    
    switch (currentLayout) {
      case 'two-column':
        return cn(baseClasses, "md:grid md:grid-cols-2 md:gap-6 md:space-y-0")
      case 'multi-column':
        return cn(baseClasses, "lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0")
      case 'steps':
        return cn(baseClasses, "max-w-2xl mx-auto")
      case 'accordion':
        return cn(baseClasses, "space-y-4")
      default: // single-column
        return cn(baseClasses, "max-w-lg mx-auto")
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "w-full",
        optimizeForTouch && touchSupport && "touch-manipulation",
        className
      )}
    >
      <div className={getLayoutClasses()}>
        {children}
      </div>
    </form>
  )
}

// Enhanced form field components

export interface ResponsiveFormFieldProps {
  children: React.ReactNode
  label?: string
  description?: string
  error?: string
  required?: boolean
  className?: string
  labelClassName?: string
  
  // Mobile optimizations
  stackOnMobile?: boolean
  fullWidthOnMobile?: boolean
}

/**
 * ResponsiveFormField - حقل نموذج متجاوب
 */
export const ResponsiveFormField: React.FC<ResponsiveFormFieldProps> = ({
  children,
  label,
  description,
  error,
  required = false,
  className,
  labelClassName,
  stackOnMobile = true,
  fullWidthOnMobile = true
}) => {
  const { isMobile } = useResponsiveBreakpoint()

  return (
    <div className={cn(
      "space-y-2",
      fullWidthOnMobile && isMobile && "w-full",
      className
    )}>
      {label && (
        <Label
          className={cn(
            "text-sm font-medium",
            isMobile && "text-base", // Larger on mobile
            required && "after:content-['*'] after:text-destructive after:ml-1",
            labelClassName
          )}
        >
          {label}
        </Label>
      )}
      
      {description && (
        <p className={cn(
          "text-sm text-muted-foreground",
          isMobile && "text-base"
        )}>
          {description}
        </p>
      )}
      
      <div className={cn(
        stackOnMobile && isMobile && "w-full"
      )}>
        {children}
      </div>
      
      {error && (
        <p className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

// Enhanced input components

export interface ResponsiveInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
  error?: string
  
  // Mobile optimizations
  touchOptimized?: boolean
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
}

/**
 * ResponsiveInput - حقل إدخال محسن للأجهزة المختلفة
 */
export const ResponsiveInput = React.forwardRef<HTMLInputElement, ResponsiveInputProps>(
  ({ 
    label,
    description,
    error,
    touchOptimized = true,
    className,
    ...props 
  }, ref) => {
    const { isMobile } = useResponsiveBreakpoint()
    const { touchSupport } = useDeviceDetection()

    return (
      <ResponsiveFormField
        label={label}
        description={description}
        error={error}
      >
        <Input
          ref={ref}
          className={cn(
            // Mobile optimizations
            isMobile && touchOptimized && [
              "h-12", // Larger height on mobile
              "text-base", // Prevent zoom on iOS
              "px-4" // More padding
            ],
            touchSupport && touchOptimized && [
              "focus:ring-2 focus:ring-primary/20",
              "transition-all duration-200"
            ],
            className
          )}
          {...props}
        />
      </ResponsiveFormField>
    )
  }
)

ResponsiveInput.displayName = "ResponsiveInput"

export interface ResponsiveTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  description?: string
  error?: string
  
  // Mobile optimizations
  touchOptimized?: boolean
  autoResize?: boolean
}

/**
 * ResponsiveTextarea - منطقة نص محسنة للأجهزة المختلفة
 */
export const ResponsiveTextarea = React.forwardRef<HTMLTextAreaElement, ResponsiveTextareaProps>(
  ({ 
    label,
    description,
    error,
    touchOptimized = true,
    autoResize = false,
    className,
    ...props 
  }, ref) => {
    const { isMobile } = useResponsiveBreakpoint()
    const { touchSupport } = useDeviceDetection()

    return (
      <ResponsiveFormField
        label={label}
        description={description}
        error={error}
      >
        <Textarea
          ref={ref}
          className={cn(
            // Mobile optimizations
            isMobile && touchOptimized && [
              "min-h-[120px]", // Larger minimum height on mobile
              "text-base", // Prevent zoom on iOS
              "px-4 py-3" // More padding
            ],
            touchSupport && touchOptimized && [
              "focus:ring-2 focus:ring-primary/20",
              "transition-all duration-200"
            ],
            autoResize && "resize-none",
            className
          )}
          {...props}
        />
      </ResponsiveFormField>
    )
  }
)

ResponsiveTextarea.displayName = "ResponsiveTextarea"

// Form section component for better organization

export interface ResponsiveFormSectionProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  
  // Mobile behavior
  collapsibleOnMobile?: boolean
  defaultExpanded?: boolean
}

/**
 * ResponsiveFormSection - قسم نموذج منظم
 */
export const ResponsiveFormSection: React.FC<ResponsiveFormSectionProps> = ({
  children,
  title,
  description,
  className,
  collapsibleOnMobile = false,
  defaultExpanded = true
}) => {
  const { isMobile } = useResponsiveBreakpoint()
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  const shouldCollapse = collapsibleOnMobile && isMobile

  return (
    <Card className={cn("w-full", className)}>
      {title && (
        <CardHeader
          className={cn(
            shouldCollapse && "cursor-pointer hover:bg-muted/50 transition-colors"
          )}
          onClick={shouldCollapse ? () => setIsExpanded(!isExpanded) : undefined}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={cn(
                "text-lg",
                isMobile && "text-xl"
              )}>
                {title}
              </CardTitle>
              {description && (
                <p className={cn(
                  "text-sm text-muted-foreground mt-1",
                  isMobile && "text-base"
                )}>
                  {description}
                </p>
              )}
            </div>
            
            {shouldCollapse && (
              <Button variant="ghost" size="sm">
                {isExpanded ? "إخفاء" : "إظهار"}
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      
      {(!shouldCollapse || isExpanded) && (
        <CardContent className="space-y-4">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

// Form actions component

export interface ResponsiveFormActionsProps {
  children: React.ReactNode
  className?: string
  
  // Mobile layout
  stackOnMobile?: boolean
  fullWidthOnMobile?: boolean
}

/**
 * ResponsiveFormActions - إجراءات النموذج المتجاوبة
 */
export const ResponsiveFormActions: React.FC<ResponsiveFormActionsProps> = ({
  children,
  className,
  stackOnMobile = true,
  fullWidthOnMobile = true
}) => {
  const { isMobile } = useResponsiveBreakpoint()

  return (
    <div className={cn(
      "flex gap-3",
      // Mobile adjustments
      isMobile && stackOnMobile && "flex-col",
      isMobile && fullWidthOnMobile && "w-full",
      // Desktop layout
      !isMobile && "justify-end",
      className
    )}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === Button) {
          return React.cloneElement(child, {
            className: cn(
              child.props.className,
              isMobile && fullWidthOnMobile && "w-full"
            )
          })
        }
        return child
      })}
    </div>
  )
}

export {
  ResponsiveForm,
  ResponsiveFormField,
  ResponsiveFormSection,
  ResponsiveFormActions
}
