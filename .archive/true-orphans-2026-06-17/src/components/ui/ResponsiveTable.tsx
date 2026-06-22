import React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface ResponsiveTableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: ResponsiveTableColumn<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  stickyHeader?: boolean;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'لا توجد بيانات',
  className,
  stickyHeader = true,
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground" dir="rtl">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader className={stickyHeader ? 'sticky top-0 bg-background z-10' : ''}>
            <TableRow>
              {columns
                .filter(col => !col.mobileOnly)
                .map((column, index) => (
                  <TableHead
                    key={index}
                    className={cn(
                      column.className,
                      'whitespace-nowrap'
                    )}
                  >
                    {column.header}
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  onRowClick && 'cursor-pointer hover:bg-muted/50'
                )}
              >
                {columns
                  .filter(col => !col.mobileOnly)
                  .map((column, index) => (
                    <TableCell
                      key={index}
                      className={cn(column.className, 'py-4')}
                    >
                      {column.render
                        ? column.render(item)
                        : typeof column.key === 'string'
                        ? item[column.key]
                        : item[column.key as keyof T]}
                    </TableCell>
                  ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={cn(
              'bg-card rounded-lg border p-4 shadow-sm',
              onRowClick && 'cursor-pointer hover:shadow-md transition-shadow'
            )}
          >
            {columns
              .filter(col => !col.desktopOnly)
              .map((column, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex justify-between items-start py-2',
                    index !== 0 && 'border-t border-border mt-2 pt-2',
                    column.className
                  )}
                >
                  <span className="text-xs text-muted-foreground">
                    {column.header}
                  </span>
                  <div className="text-sm font-medium text-left flex-1 mr-2">
                    {column.render
                      ? column.render(item)
                      : typeof column.key === 'string'
                      ? item[column.key]
                      : item[column.key as keyof T]}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example usage:
 * 
 * interface Invoice {
 *   id: string;
 *   number: string;
 *   amount: number;
 *   status: 'paid' | 'pending' | 'overdue';
 * }
 * 
 * <ResponsiveTable
 *   data={invoices}
 *   columns={[
 *     { key: 'number', header: 'رقم الفاتورة' },
 *     { 
 *       key: 'amount', 
 *       header: 'المبلغ',
 *       render: (inv) => formatCurrency(inv.amount)
 *     },
 *     {
 *       key: 'status',
 *       header: 'الحالة',
 *       render: (inv) => <Badge>{inv.status}</Badge>
 *     }
 *   ]}
 *   keyExtractor={(inv) => inv.id}
 *   onRowClick={(inv) => navigate(`/invoices/${inv.id}`)}
 *   emptyMessage="لا توجد فواتير"
 * />
 */

export default ResponsiveTable;