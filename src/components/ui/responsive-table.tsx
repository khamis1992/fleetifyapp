import * as React from "react"
import { cn } from "@/lib/utils"
import { useResponsiveBreakpoint } from "@/hooks/use-mobile"
import { useDeviceDetection } from "@/hooks/responsive/useDeviceDetection"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, MoreVertical } from "lucide-react"

export interface ResponsiveTableColumn<T = any> {
  key: string
  title: string
  dataIndex?: keyof T
  render?: (value: any, record: T, index: number) => React.ReactNode
  width?: string | number
  minWidth?: string | number
  sortable?: boolean
  filterable?: boolean
  hideOnMobile?: boolean
  priority?: 'high' | 'medium' | 'low' // For mobile column prioritization
  align?: 'left' | 'center' | 'right'
  className?: string
}

export interface ResponsiveTableProps<T = any> {
  data: T[]
  columns: ResponsiveTableColumn<T>[]
  
  // Mobile behavior
  mobileMode?: 'cards' | 'scroll' | 'accordion' | 'list'
  cardTemplate?: React.ComponentType<{ item: T; index: number }>
  priorityColumns?: string[] // Column keys to show on mobile
  maxMobileColumns?: number
  
  // Interaction
  onRowClick?: (record: T, index: number) => void
  rowSelection?: {
    selectedRowKeys?: React.Key[]
    onSelectionChange?: (selectedRowKeys: React.Key[], selectedRows: T[]) => void
  }
  
  // Pagination
  pagination?: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
  }
  
  // Loading and empty states
  loading?: boolean
  emptyText?: string
  
  // Styling
  className?: string
  rowClassName?: string | ((record: T, index: number) => string)
  
  // Responsive behavior
  enableHorizontalScroll?: boolean
  stickyHeader?: boolean
  
  // Actions
  rowActions?: Array<{
    key: string
    label: string
    icon?: React.ReactNode
    onClick: (record: T, index: number) => void
    color?: 'primary' | 'secondary' | 'destructive' | 'success'
  }>
}

/**
 * ResponsiveTable - جدول متجاوب متقدم
 * يتكيف مع جميع أحجام الشاشات ويوفر تجربة مستخدم محسنة
 */
export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  mobileMode = 'cards',
  cardTemplate: CardTemplate,
  priorityColumns = [],
  maxMobileColumns = 2,
  onRowClick,
  rowSelection,
  pagination,
  loading = false,
  emptyText = 'لا توجد بيانات',
  className,
  rowClassName,
  enableHorizontalScroll = true,
  stickyHeader = true,
  rowActions = []
}: ResponsiveTableProps<T>) {
  const { isMobile, isTablet } = useResponsiveBreakpoint()
  const { touchSupport } = useDeviceDetection()
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set())

  // Filter columns for mobile display
  const mobileColumns = React.useMemo(() => {
    if (!isMobile) return columns

    // Use priority columns if specified
    if (priorityColumns.length > 0) {
      return columns.filter(col => priorityColumns.includes(col.key))
    }

    // Auto-select high priority columns
    const highPriorityColumns = columns.filter(col => col.priority === 'high')
    if (highPriorityColumns.length > 0 && highPriorityColumns.length <= maxMobileColumns) {
      return highPriorityColumns
    }

    // Fallback to first few columns
    return columns
      .filter(col => !col.hideOnMobile)
      .slice(0, maxMobileColumns)
  }, [columns, isMobile, priorityColumns, maxMobileColumns])

  // Toggle row expansion
  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  // Render cell content
  const renderCell = (column: ResponsiveTableColumn<T>, record: T, index: number) => {
    const value = column.dataIndex ? record[column.dataIndex] : record
    
    if (column.render) {
      return column.render(value, record, index)
    }
    
    return value
  }

  // Card mode for mobile
  const renderCardMode = () => {
    if (CardTemplate) {
      return (
        <div className="space-y-4">
          {data.map((item, index) => (
            <CardTemplate key={index} item={item} index={index} />
          ))}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {data.map((record, index) => (
          <Card
            key={index}
            className={cn(
              "transition-all duration-200",
              onRowClick && "cursor-pointer hover:shadow-md",
              touchSupport && "active:scale-[0.98]",
              typeof rowClassName === 'function' ? rowClassName(record, index) : rowClassName
            )}
            onClick={() => onRowClick?.(record, index)}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {mobileColumns.map((column) => (
                  <div key={column.key} className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground min-w-0 flex-1">
                      {column.title}
                    </span>
                    <span className="text-sm text-right min-w-0 flex-1 ml-2">
                      {renderCell(column, record, index)}
                    </span>
                  </div>
                ))}
                
                {/* Row actions */}
                {rowActions.length > 0 && (
                  <div className="flex gap-2 pt-2 border-t">
                    {rowActions.map((action) => (
                      <Button
                        key={action.key}
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          action.onClick(record, index)
                        }}
                        className="flex-1"
                      >
                        {action.icon && <span className="mr-1">{action.icon}</span>}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Accordion mode for mobile
  const renderAccordionMode = () => (
    <div className="space-y-2">
      {data.map((record, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader
            className={cn(
              "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
              "flex flex-row items-center justify-between space-y-0"
            )}
            onClick={() => toggleRowExpansion(index)}
          >
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">
                {renderCell(mobileColumns[0], record, index)}
              </CardTitle>
              {mobileColumns[1] && (
                <p className="text-sm text-muted-foreground truncate">
                  {renderCell(mobileColumns[1], record, index)}
                </p>
              )}
            </div>
            {expandedRows.has(index) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CardHeader>
          
          {expandedRows.has(index) && (
            <CardContent className="p-4 pt-0 border-t">
              <div className="space-y-3">
                {columns.slice(2).map((column) => (
                  <div key={column.key} className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">
                      {column.title}
                    </span>
                    <span className="text-sm text-right ml-2">
                      {renderCell(column, record, index)}
                    </span>
                  </div>
                ))}
                
                {rowActions.length > 0 && (
                  <div className="flex gap-2 pt-2">
                    {rowActions.map((action) => (
                      <Button
                        key={action.key}
                        variant="outline"
                        size="sm"
                        onClick={() => action.onClick(record, index)}
                        className="flex-1"
                      >
                        {action.icon && <span className="mr-1">{action.icon}</span>}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )

  // List mode for mobile
  const renderListMode = () => (
    <div className="space-y-1">
      {data.map((record, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center justify-between p-3 rounded-lg border bg-card",
            "transition-all duration-200",
            onRowClick && "cursor-pointer hover:bg-muted/50",
            touchSupport && "active:bg-muted",
            typeof rowClassName === 'function' ? rowClassName(record, index) : rowClassName
          )}
          onClick={() => onRowClick?.(record, index)}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {renderCell(mobileColumns[0], record, index)}
            </p>
            {mobileColumns[1] && (
              <p className="text-sm text-muted-foreground truncate">
                {renderCell(mobileColumns[1], record, index)}
              </p>
            )}
          </div>
          
          {rowActions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                // Handle actions menu
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  )

  // Desktop table mode
  const renderTableMode = () => (
    <div className={cn(
      "relative",
      enableHorizontalScroll && "overflow-x-auto",
      className
    )}>
      <table className="w-full caption-bottom text-sm">
        <thead className={cn(
          stickyHeader && "sticky top-0 z-10 bg-background"
        )}>
          <tr className="border-b transition-colors hover:bg-muted/50">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "h-12 px-4 text-right align-middle font-medium text-muted-foreground",
                  column.align === 'center' && "text-center",
                  column.align === 'left' && "text-left",
                  column.className
                )}
                style={{
                  width: column.width,
                  minWidth: column.minWidth
                }}
              >
                {column.title}
              </th>
            ))}
            {rowActions.length > 0 && (
              <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground w-[100px]">
                إجراءات
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((record, index) => (
            <tr
              key={index}
              className={cn(
                "border-b transition-colors hover:bg-muted/50",
                onRowClick && "cursor-pointer",
                typeof rowClassName === 'function' ? rowClassName(record, index) : rowClassName
              )}
              onClick={() => onRowClick?.(record, index)}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "p-4 align-middle",
                    column.align === 'center' && "text-center",
                    column.align === 'left' && "text-left",
                    column.className
                  )}
                >
                  {renderCell(column, record, index)}
                </td>
              ))}
              
              {rowActions.length > 0 && (
                <td className="p-4 align-middle text-center">
                  <div className="flex gap-1 justify-center">
                    {rowActions.map((action) => (
                      <Button
                        key={action.key}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          action.onClick(record, index)
                        }}
                        title={action.label}
                      >
                        {action.icon || action.label}
                      </Button>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
      </div>
    )
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  // Render based on device and mode
  if (isMobile) {
    switch (mobileMode) {
      case 'accordion':
        return renderAccordionMode()
      case 'list':
        return renderListMode()
      case 'scroll':
        return renderTableMode()
      default: // cards
        return renderCardMode()
    }
  }

  return renderTableMode()
}

export default ResponsiveTable
