/**
 * Mobile Data List Component
 * Replaces traditional tables with swipeable card-based lists
 * Optimized for touch interactions and small screens
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  MoreVertical,
  ChevronLeft,
  SortAsc,
  SortDesc,
  X,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';

// Types
interface DataItem {
  id: string;
  [key: string]: any;
}

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  primary?: boolean; // Main display field
  secondary?: boolean; // Secondary info
  badge?: boolean; // Show as badge
}

interface Action<T> {
  label: string;
  icon?: React.ElementType;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive';
}

interface MobileDataListProps<T extends DataItem> {
  /** Data items */
  data: T[];
  /** Column definitions */
  columns: Column<T>[];
  /** Row actions */
  actions?: Action<T>[];
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Enable search */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** On search change */
  onSearch?: (query: string) => void;
  /** On item click */
  onItemClick?: (item: T) => void;
  /** On refresh */
  onRefresh?: () => void;
  /** Enable swipe actions */
  swipeActions?: boolean;
  /** Swipe action (single action on swipe) */
  swipeAction?: Action<T>;
  /** Custom card renderer */
  renderCard?: (item: T, actions: Action<T>[]) => React.ReactNode;
  /** Sort config */
  sortConfig?: { key: string; direction: 'asc' | 'desc' };
  /** On sort change */
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
}

// Swipeable Card Component
const SwipeableCard = <T extends DataItem>({
  item,
  columns,
  actions,
  onItemClick,
  swipeAction,
}: {
  item: T;
  columns: Column<T>[];
  actions: Action<T>[];
  onItemClick?: (item: T) => void;
  swipeAction?: Action<T>;
}) => {
  const [isSwipedOpen, setIsSwipedOpen] = useState(false);
  const x = useMotionValue(0);
  const swipeThreshold = -80;

  // Get primary and secondary columns
  const primaryCol = columns.find((c) => c.primary);
  const secondaryCols = columns.filter((c) => c.secondary);
  const badgeCols = columns.filter((c) => c.badge);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < swipeThreshold && swipeAction) {
      setIsSwipedOpen(true);
    } else {
      setIsSwipedOpen(false);
    }
  };

  const renderValue = (col: Column<T>) => {
    if (col.render) return col.render(item);
    const key = col.key as keyof T;
    return item[key];
  };

  return (
    <div className="relative overflow-hidden">
      {/* Swipe Action Background */}
      {swipeAction && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-20 flex items-center justify-center',
            swipeAction.variant === 'destructive' ? 'bg-red-500' : 'bg-rose-500'
          )}
        >
          <button
            onClick={() => {
              swipeAction.onClick(item);
              setIsSwipedOpen(false);
            }}
            className="text-white p-2"
          >
            {swipeAction.icon && <swipeAction.icon className="h-6 w-6" />}
          </button>
        </div>
      )}

      {/* Main Card */}
      <motion.div
        drag={swipeAction ? 'x' : false}
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: isSwipedOpen ? -80 : 0 }}
        style={{ x }}
        onClick={() => !isSwipedOpen && onItemClick?.(item)}
        className={cn(
          'bg-white border border-neutral-200 rounded-lg p-4 relative',
          onItemClick && 'cursor-pointer active:bg-neutral-50'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Primary Field */}
            {primaryCol && (
              <h3 className="font-semibold text-neutral-900 truncate">
                {renderValue(primaryCol)}
              </h3>
            )}

            {/* Secondary Fields */}
            {secondaryCols.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-neutral-500">
                {secondaryCols.map((col) => (
                  <span key={String(col.key)}>
                    <span className="text-neutral-400">{col.label}: </span>
                    {renderValue(col)}
                  </span>
                ))}
              </div>
            )}

            {/* Badge Fields */}
            {badgeCols.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {badgeCols.map((col) => (
                  <Badge key={String(col.key)} variant="secondary">
                    {renderValue(col)}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions Menu */}
          {actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action) => (
                  <DropdownMenuItem
                    key={action.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick(item);
                    }}
                    className={cn(
                      action.variant === 'destructive' && 'text-red-600 focus:text-red-600'
                    )}
                  >
                    {action.icon && <action.icon className="h-4 w-4 ml-2" />}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Chevron for clickable items */}
          {onItemClick && actions.length === 0 && (
            <ChevronLeft className="h-5 w-5 text-neutral-400 shrink-0" />
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Loading Skeleton
const ListSkeleton: React.FC = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Empty State
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-12">
    <div className="text-6xl mb-4">📭</div>
    <p className="text-neutral-500">{message}</p>
  </div>
);

// Main Component
export function MobileDataList<T extends DataItem>({
  data,
  columns,
  actions = [],
  isLoading,
  emptyMessage = 'لا توجد بيانات',
  searchable = false,
  searchPlaceholder = 'بحث...',
  onSearch,
  onItemClick,
  onRefresh,
  swipeActions = false,
  swipeAction,
  renderCard,
  sortConfig,
  onSortChange,
}: MobileDataListProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const sortableColumns = columns.filter((c) => c.sortable);

  if (isLoading) {
    return <ListSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters Bar */}
      {(searchable || sortableColumns.length > 0 || onRefresh) && (
        <div className="flex gap-2">
          {/* Search Input */}
          {searchable && (
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pr-10 h-11"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-neutral-400" />
                </button>
              )}
            </div>
          )}

          {/* Sort Button */}
          {sortableColumns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-11 w-11">
                  {sortConfig?.direction === 'desc' ? (
                    <SortDesc className="h-5 w-5" />
                  ) : (
                    <SortAsc className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sortableColumns.map((col) => (
                  <DropdownMenuItem
                    key={String(col.key)}
                    onClick={() =>
                      onSortChange?.(
                        String(col.key),
                        sortConfig?.key === col.key && sortConfig?.direction === 'asc'
                          ? 'desc'
                          : 'asc'
                      )
                    }
                  >
                    {col.label}
                    {sortConfig?.key === col.key && (
                      sortConfig.direction === 'asc' ? ' ↑' : ' ↓'
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              className="h-11 w-11"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-neutral-500">
        {data.length} نتيجة
      </div>

      {/* Data List */}
      {data.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {data.map((item) =>
              renderCard ? (
                <div key={item.id}>{renderCard(item, actions)}</div>
              ) : (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <SwipeableCard
                    item={item}
                    columns={columns}
                    actions={actions}
                    onItemClick={onItemClick}
                    swipeAction={swipeActions ? swipeAction : undefined}
                  />
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default MobileDataList;

