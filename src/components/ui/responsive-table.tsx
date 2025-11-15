import React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useSimpleBreakpoint } from "@/hooks/use-mobile-simple"
import { ResponsiveCard, ResponsiveCardContent, ResponsiveCardHeader, ResponsiveCardTitle } from "./responsive-card"
import { Button } from "./button"
import { Badge } from "./badge"
import { ScrollArea } from "./scroll-area"
import { ChevronDown, MoreVertical } from "lucide-react"

const responsiveTableVariants = cva(
  "w-full",
  {
    variants: {
      variant: {
        default: "border-collapse border-spacing-0",
        striped: "border-collapse border-spacing-0",
        borderless: "border-collapse border-spacing-0"
      },
      size: {
        sm: "text-sm",
        default: "text-base",
        lg: "text-lg"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface ResponsiveTableProps
  extends React.TableHTMLAttributes<HTMLTableElement>,
    VariantProps<typeof responsiveTableVariants> {
  columns: Array<{
    key: string
    title: string
    accessor?: string
    render?: (item: any, index: number) => React.ReactNode
    sortable?: boolean
    width?: string
    mobileHidden?: boolean
  }>
  data: unknown[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (item: any, index: number) => void
  showPagination?: boolean
  itemsPerPage?: number
  cardView?: boolean
  mobileCardTitle?: (item: any) => string
  mobileCardSubtitle?: (item: any) => string
  mobileCardActions?: (item: any) => React.ReactNode
}

const ResponsiveTable = React.forwardRef<HTMLTableElement, ResponsiveTableProps>(
  ({ 
    className,
    variant,
    size,
    columns,
    data,
    loading = false,
    emptyMessage = "لا توجد بيانات",
    onRowClick,
    cardView = false,
    mobileCardTitle,
    mobileCardSubtitle,
    mobileCardActions,
    ...props 
  }, ref) => {
    const { isMobile, isTablet } = useSimpleBreakpoint()
    const [currentPage, setCurrentPage] = useState(1)
    const [sortConfig, setSortConfig] = useState<{
      key: string
      direction: 'asc' | 'desc'
    } | null>(null)

    // Force card view on mobile or when explicitly set
    const shouldUseCardView = isMobile || cardView

    // Filter visible columns for tablet/desktop
    const visibleColumns = useMemo(() => {
      if (shouldUseCardView) return columns
      return columns.filter(col => !col.mobileHidden || !isMobile)
    }, [columns, shouldUseCardView, isMobile])

    // Sort data if sortConfig is set
    const sortedData = useMemo(() => {
      if (!sortConfig) return data
      
      return [...data].sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }, [data, sortConfig])

    const handleSort = (columnKey: string) => {
      const column = columns.find(col => col.key === columnKey)
      if (!column?.sortable) return

      setSortConfig(current => {
        if (current?.key === columnKey) {
          return current.direction === 'asc' 
            ? { key: columnKey, direction: 'desc' }
            : null
        }
        return { key: columnKey, direction: 'asc' }
      })
    }

    const getCellValue = (item: any, column: any) => {
      if (column.render) {
        return column.render(item, sortedData.indexOf(item))
      }
      return column.accessor ? item[column.accessor] : item[column.key]
    }

    if (loading) {
      return (
        <div className="w-full space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      )
    }

    if (sortedData.length === 0) {
      return (
        <ResponsiveCard className="text-center py-8">
          <ResponsiveCardContent>
            <p className="text-muted-foreground">{emptyMessage}</p>
          </ResponsiveCardContent>
        </ResponsiveCard>
      )
    }

    // Mobile/Card View
    if (shouldUseCardView) {
      return (
        <div className="space-y-3">
          {sortedData.map((item, index) => (
            <ResponsiveCard
              key={index}
              variant={onRowClick ? "interactive" : "default"}
              onClick={() => onRowClick?.(item, index)}
              className="transition-all duration-200"
            >
              <ResponsiveCardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <ResponsiveCardTitle className="text-base">
                      {mobileCardTitle ? mobileCardTitle(item) : getCellValue(item, columns[0])}
                    </ResponsiveCardTitle>
                    {mobileCardSubtitle && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {mobileCardSubtitle(item)}
                      </p>
                    )}
                  </div>
                  {mobileCardActions && (
                    <div className="flex items-center gap-2 ml-2">
                      {mobileCardActions(item)}
                    </div>
                  )}
                </div>
              </ResponsiveCardHeader>
              
              <ResponsiveCardContent className="pt-0">
                <div className="grid grid-cols-1 gap-2">
                  {columns.slice(1).map((column) => {
                    const value = getCellValue(item, column)
                    if (!value && value !== 0) return null
                    
                    return (
                      <div key={column.key} className="flex justify-between items-center py-1">
                        <span className="text-sm text-muted-foreground font-medium">
                          {column.title}:
                        </span>
                        <span className="text-sm font-medium text-right">
                          {value}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </ResponsiveCardContent>
            </ResponsiveCard>
          ))}
        </div>
      )
    }

    // Desktop/Tablet Table View
    return (
      <div className="w-full overflow-hidden rounded-lg border border-border">
        <ScrollArea className="w-full">
          <table
            ref={ref}
            className={cn(responsiveTableVariants({ variant, size }), className)}
            {...props}
          >
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "h-12 px-4 text-right align-middle font-medium text-muted-foreground",
                      column.sortable && "cursor-pointer hover:bg-muted transition-colors",
                      column.width && `w-[${column.width}]`
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center justify-between">
                      {column.title}
                      {column.sortable && (
                        <ChevronDown 
                          className={cn(
                            "h-4 w-4 transition-transform",
                            sortConfig?.key === column.key && sortConfig.direction === 'desc' && "rotate-180"
                          )}
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, index) => (
                <tr
                  key={index}
                  className={cn(
                    "border-b border-border transition-colors",
                    variant === "striped" && index % 2 === 0 && "bg-muted/25",
                    onRowClick && "cursor-pointer hover:bg-muted/50 active:bg-muted"
                  )}
                  onClick={() => onRowClick?.(item, index)}
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className="p-4 align-middle text-right"
                    >
                      {getCellValue(item, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </div>
    )
  }
)

ResponsiveTable.displayName = "ResponsiveTable"

export { ResponsiveTable, responsiveTableVariants }