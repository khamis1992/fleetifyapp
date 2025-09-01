import React, { useState } from 'react'
import { useEnhancedResponsive } from '@/hooks/useEnhancedResponsive'
import { getResponsiveProps, ResponsiveClassGenerator } from '@/utils/responsiveUtils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  MoreVertical, 
  ChevronDown, 
  ChevronRight,
  Filter,
  Search,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'

// Responsive Button
interface ResponsiveButtonProps {
  children: React.ReactNode
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'sm' | 'default' | 'lg'
  fullWidth?: boolean
  className?: string
  onClick?: () => void
  disabled?: boolean
}

export function ResponsiveButton({
  children,
  variant = 'default',
  size,
  fullWidth = false,
  className,
  onClick,
  disabled
}: ResponsiveButtonProps) {
  const { deviceType } = useEnhancedResponsive()
  const responsiveProps = getResponsiveProps(deviceType)

  // Use device-specific button props if size not specified
  const buttonProps = size ? { size } : responsiveProps.buttonProps

  return (
    <Button
      variant={variant}
      size={buttonProps.size}
      className={cn(
        buttonProps.className,
        fullWidth && 'w-full',
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}

// Responsive Input
interface ResponsiveInputProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  type?: string
  label?: string
  error?: string
  className?: string
  disabled?: boolean
}

export function ResponsiveInput({
  placeholder,
  value,
  onChange,
  type = 'text',
  label,
  error,
  className,
  disabled
}: ResponsiveInputProps) {
  const { deviceType } = useEnhancedResponsive()
  const responsiveProps = getResponsiveProps(deviceType)

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          responsiveProps.inputProps.className,
          error && 'border-destructive',
          className
        )}
        disabled={disabled}
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

// Responsive Card
interface ResponsiveCardProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
  hover?: boolean
  className?: string
  onClick?: () => void
}

export function ResponsiveCard({
  title,
  subtitle,
  children,
  actions,
  hover = true,
  className,
  onClick
}: ResponsiveCardProps) {
  const { deviceType, touchDevice } = useEnhancedResponsive()
  const responsiveProps = getResponsiveProps(deviceType)

  return (
    <Card 
      className={cn(
        responsiveProps.cardProps.className,
        hover && !touchDevice && 'hover:shadow-lg transition-shadow duration-200',
        touchDevice && onClick && 'active:scale-95 transition-transform duration-150',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {(title || subtitle || actions) && (
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              {title && (
                <CardTitle className={deviceType === 'mobile' ? 'text-lg' : 'text-xl'}>
                  {title}
                </CardTitle>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="flex gap-2">
                {actions}
              </div>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={title || subtitle || actions ? 'pt-0' : ''}>
        {children}
      </CardContent>
    </Card>
  )
}

// Responsive Modal/Sheet
interface ResponsiveModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className
}: ResponsiveModalProps) {
  const { isMobile } = useEnhancedResponsive()

  // Mobile: Use Sheet (full screen)
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[90vh]">
          {title && (
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
          )}
          <div className={cn("mt-6 overflow-auto", className)}>
            {children}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop/Tablet: Use Dialog
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(sizeClasses[size], className)}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        <div className="mt-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Responsive Data Table
interface ResponsiveDataTableProps<T = any> {
  data: T[]
  columns: Array<{
    key: string
    label: string
    priority: 'critical' | 'important' | 'secondary' | 'optional'
    sortable?: boolean
    render?: (value: any, row: T) => React.ReactNode
    width?: string
  }>
  actions?: Array<{
    label: string
    icon?: React.ComponentType<any>
    onClick: (row: T) => void
    variant?: 'default' | 'destructive' | 'outline'
  }>
  searchable?: boolean
  filterable?: boolean
  className?: string
}

export function ResponsiveDataTable<T = any>({
  data,
  columns,
  actions,
  searchable = true,
  filterable = true,
  className
}: ResponsiveDataTableProps<T>) {
  const { isMobile, deviceType } = useEnhancedResponsive()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Filter columns based on device type
  const visibleColumns = columns.filter(col => {
    if (deviceType === 'mobile') {
      return ['critical', 'important'].includes(col.priority)
    }
    if (deviceType === 'tablet') {
      return ['critical', 'important', 'secondary'].includes(col.priority)
    }
    return true // Desktop shows all columns
  })

  // Filter and sort data
  const filteredData = data.filter(row =>
    !searchTerm || visibleColumns.some(col =>
      String(row[col.key]).toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const sortedData = sortField
    ? [...filteredData].sort((a, b) => {
        const aVal = a[sortField]
        const bVal = b[sortField]
        const multiplier = sortDirection === 'asc' ? 1 : -1
        return aVal < bVal ? -1 * multiplier : aVal > bVal ? 1 * multiplier : 0
      })
    : filteredData

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Mobile: Card-based display
  if (isMobile) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Search */}
        {searchable && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="البحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Cards */}
        <div className="space-y-3">
          {sortedData.map((row, index) => (
            <ResponsiveCard key={index}>
              <div className="space-y-3">
                {visibleColumns.map(column => (
                  <div key={column.key} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-medium">
                      {column.label}:
                    </span>
                    <span className="text-sm font-medium text-right">
                      {column.render 
                        ? column.render(row[column.key], row)
                        : row[column.key]
                      }
                    </span>
                  </div>
                ))}
                
                {actions && actions.length > 0 && (
                  <div className="flex gap-2 pt-2 border-t">
                    {actions.map((action, actionIndex) => {
                      const Icon = action.icon
                      return (
                        <ResponsiveButton
                          key={actionIndex}
                          variant={action.variant || 'outline'}
                          size="sm"
                          onClick={() => action.onClick(row)}
                          className="flex-1"
                        >
                          {Icon && <Icon size={14} className="mr-2" />}
                          {action.label}
                        </ResponsiveButton>
                      )
                    })}
                  </div>
                )}
              </div>
            </ResponsiveCard>
          ))}
        </div>
      </div>
    )
  }

  // Desktop/Tablet: Table display
  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filter */}
      {(searchable || filterable) && (
        <div className="flex gap-2">
          {searchable && (
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="البحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          {filterable && (
            <Button variant="outline">
              <Filter size={16} className="mr-2" />
              تصفية
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map(column => (
                <TableHead 
                  key={column.key}
                  className={cn(
                    column.width && `w-${column.width}`,
                    column.sortable && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && (
                      <ArrowUpDown size={14} className="text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && actions.length > 0 && (
                <TableHead className="w-[100px]">العمليات</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row, index) => (
              <TableRow key={index}>
                {visibleColumns.map(column => (
                  <TableCell key={column.key}>
                    {column.render 
                      ? column.render(row[column.key], row)
                      : row[column.key]
                    }
                  </TableCell>
                ))}
                {actions && actions.length > 0 && (
                  <TableCell>
                    <div className="flex gap-1">
                      {actions.slice(0, 2).map((action, actionIndex) => {
                        const Icon = action.icon
                        return (
                          <Button
                            key={actionIndex}
                            variant="ghost"
                            size="sm"
                            onClick={() => action.onClick(row)}
                          >
                            {Icon && <Icon size={14} />}
                          </Button>
                        )
                      })}
                      {actions.length > 2 && (
                        <Button variant="ghost" size="sm">
                          <MoreVertical size={14} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// Responsive Form Layout
interface ResponsiveFormProps {
  children: React.ReactNode
  onSubmit?: (e: React.FormEvent) => void
  title?: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function ResponsiveForm({
  children,
  onSubmit,
  title,
  description,
  actions,
  className
}: ResponsiveFormProps) {
  const { deviceType } = useEnhancedResponsive()
  const responsiveProps = getResponsiveProps(deviceType)

  return (
    <form onSubmit={onSubmit} className={cn("space-y-6", className)}>
      {/* Form Header */}
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h2 className={cn(
              "font-semibold",
              deviceType === 'mobile' ? "text-lg" : "text-xl"
            )}>
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Form Content */}
      <div className={cn(
        "grid gap-4",
        deviceType === 'mobile' && "grid-cols-1",
        deviceType === 'tablet' && "grid-cols-1 md:grid-cols-2",
        deviceType === 'desktop' && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}>
        {children}
      </div>

      {/* Form Actions */}
      {actions && (
        <div className={cn(
          "flex gap-3 pt-4 border-t",
          deviceType === 'mobile' && "flex-col"
        )}>
          {actions}
        </div>
      )}
    </form>
  )
}

// Responsive Stats Grid
interface StatItem {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ComponentType<any>
}

interface ResponsiveStatsProps {
  stats: StatItem[]
  className?: string
}

export function ResponsiveStats({ stats, className }: ResponsiveStatsProps) {
  const { deviceType } = useEnhancedResponsive()

  const gridCols = {
    mobile: 'grid-cols-1',
    tablet: 'grid-cols-2',
    desktop: 'grid-cols-4'
  }

  return (
    <div className={cn(
      "grid gap-4",
      gridCols[deviceType],
      className
    )}>
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <ResponsiveCard key={index}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                {stat.change && (
                  <p className={cn(
                    "text-xs",
                    stat.trend === 'up' && "text-green-600",
                    stat.trend === 'down' && "text-red-600",
                    stat.trend === 'neutral' && "text-muted-foreground"
                  )}>
                    {stat.change}
                  </p>
                )}
              </div>
              {Icon && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Icon size={24} className="text-primary" />
                </div>
              )}
            </div>
          </ResponsiveCard>
        )
      })}
    </div>
  )
}