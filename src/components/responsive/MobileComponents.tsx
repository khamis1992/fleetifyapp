import React, { useState } from 'react'
import { useEnhancedResponsive } from '@/hooks/useEnhancedResponsive'
import { getResponsiveProps } from '@/utils/responsiveUtils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  MoreVertical,
  Plus,
  X,
  Check
} from 'lucide-react'

// Mobile Card List Item
interface MobileCardItemProps {
  title: string
  subtitle?: string
  description?: string
  image?: string
  badge?: string | number
  actions?: React.ReactNode
  onClick?: () => void
  className?: string
}

export function MobileCardItem({
  title,
  subtitle,
  description,
  image,
  badge,
  actions,
  onClick,
  className
}: MobileCardItemProps) {
  const { touchDevice } = useEnhancedResponsive()

  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer transition-all duration-200",
        touchDevice && "active:scale-95",
        "hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Image/Avatar */}
        {image && (
          <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
            <img 
              src={image} 
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{title}</h3>
            {badge && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 flex-shrink-0">
                {badge}
              </span>
            )}
          </div>
          
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
          
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </Card>
  )
}

// Mobile Search Header
interface MobileSearchHeaderProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onFilter?: () => void
  onAdd?: () => void
  showFilter?: boolean
  showAdd?: boolean
  className?: string
}

export function MobileSearchHeader({
  placeholder = "البحث...",
  value,
  onChange,
  onFilter,
  onAdd,
  showFilter = true,
  showAdd = true,
  className
}: MobileSearchHeaderProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  return (
    <div className={cn(
      "sticky top-mobile-header z-30 bg-background border-b p-4",
      className
    )}>
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="pl-10 h-10"
          />
        </div>

        {/* Filter Button */}
        {showFilter && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onFilter}
            className="flex-shrink-0"
          >
            <Filter size={16} />
          </Button>
        )}

        {/* Add Button */}
        {showAdd && (
          <Button 
            size="sm"
            onClick={onAdd}
            className="flex-shrink-0"
          >
            <Plus size={16} />
          </Button>
        )}
      </div>
    </div>
  )
}

// Mobile Action Sheet
interface MobileActionSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  actions: Array<{
    label: string
    icon?: React.ComponentType<any>
    onClick: () => void
    variant?: 'default' | 'destructive'
  }>
}

export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  actions
}: MobileActionSheetProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {title && <h3 className="font-medium">{title}</h3>}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2">
          {actions.map((action, index) => {
            const Icon = action.icon
            return (
              <Button
                key={index}
                variant={action.variant || "ghost"}
                className="w-full justify-start min-h-[44px]"
                onClick={() => {
                  action.onClick()
                  onClose()
                }}
              >
                {Icon && <Icon size={16} className="mr-3" />}
                {action.label}
              </Button>
            )
          })}
        </div>

        {/* Safe area bottom */}
        <div className="h-mobile-safe-bottom" />
      </div>
    </div>
  )
}

// Mobile Page Header
interface MobilePageHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  actions?: React.ReactNode
  className?: string
}

export function MobilePageHeader({
  title,
  subtitle,
  onBack,
  actions,
  className
}: MobilePageHeaderProps) {
  return (
    <div className={cn(
      "sticky top-0 z-40 bg-background border-b px-4 py-3",
      className
    )}>
      <div className="flex items-center gap-3 min-h-[44px]">
        {/* Back Button */}
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft size={20} />
          </Button>
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

// Mobile Form Section
interface MobileFormSectionProps {
  title?: string
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  className?: string
}

export function MobileFormSection({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
  className
}: MobileFormSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <div 
          className={cn(
            "flex items-center justify-between",
            collapsible && "cursor-pointer"
          )}
          onClick={() => collapsible && setIsOpen(!isOpen)}
        >
          <h3 className="font-medium text-base">{title}</h3>
          {collapsible && (
            <Button variant="ghost" size="sm">
              <ChevronLeft 
                size={16} 
                className={cn(
                  "transition-transform",
                  isOpen && "rotate-90"
                )}
              />
            </Button>
          )}
        </div>
      )}

      {(!collapsible || isOpen) && (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}

// Mobile FAB (Floating Action Button)
interface MobileFABProps {
  onClick: () => void
  icon?: React.ComponentType<any>
  label?: string
  className?: string
}

export function MobileFAB({
  onClick,
  icon: Icon = Plus,
  label,
  className
}: MobileFABProps) {
  const { safeAreaSupport } = useEnhancedResponsive()

  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        "fixed bottom-4 right-4 z-40",
        "h-14 w-14 rounded-full shadow-lg",
        "hover:shadow-xl transition-all duration-200",
        label && "w-auto px-4 rounded-full",
        safeAreaSupport && "bottom-mobile-safe-bottom",
        className
      )}
    >
      <Icon size={24} />
      {label && <span className="ml-2">{label}</span>}
    </Button>
  )
}

// Mobile Tab Navigation
interface MobileTabProps {
  tabs: Array<{
    id: string
    label: string
    icon?: React.ComponentType<any>
    count?: number
  }>
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function MobileTabNavigation({
  tabs,
  activeTab,
  onTabChange,
  className
}: MobileTabProps) {
  return (
    <div className={cn(
      "flex bg-muted rounded-lg p-1",
      className
    )}>
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2",
              "py-2 px-3 rounded-md transition-all duration-200",
              "min-h-[40px] text-sm font-medium",
              isActive 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon size={16} />}
            <span>{tab.label}</span>
            {tab.count && (
              <span className={cn(
                "text-xs rounded-full w-5 h-5 flex items-center justify-center",
                isActive 
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted-foreground/20"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Mobile Progress Steps
interface MobileProgressStepsProps {
  steps: Array<{
    id: string
    title: string
    completed?: boolean
  }>
  currentStep: string
  className?: string
}

export function MobileProgressSteps({
  steps,
  currentStep,
  className
}: MobileProgressStepsProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStep)

  return (
    <div className={cn("space-y-4", className)}>
      {steps.map((step, index) => {
        const isCompleted = step.completed || index < currentIndex
        const isCurrent = step.id === currentStep
        const isActive = isCompleted || isCurrent

        return (
          <div key={step.id} className="flex items-center gap-3">
            {/* Step Circle */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              "text-sm font-medium transition-colors",
              isCompleted && "bg-success text-success-foreground",
              isCurrent && !isCompleted && "bg-primary text-primary-foreground",
              !isActive && "bg-muted text-muted-foreground"
            )}>
              {isCompleted ? (
                <Check size={16} />
              ) : (
                index + 1
              )}
            </div>

            {/* Step Title */}
            <div className="flex-1">
              <h4 className={cn(
                "text-sm font-medium",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.title}
              </h4>
            </div>
          </div>
        )
      })}
    </div>
  )
}