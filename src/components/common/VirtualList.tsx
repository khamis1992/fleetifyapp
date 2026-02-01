import React, { CSSProperties, useRef, useCallback } from 'react';
// @ts-ignore - react-window types may be outdated
import { FixedSizeList as List, VariableSizeList } from 'react-window';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';

type ListChildComponentProps = { index: number; style: CSSProperties; data?: unknown };

/**
 * Virtual List Component - Performance Optimization
 * Uses react-window and @tanstack/react-virtual for efficient rendering of large lists
 * Part of Phase 1 Performance Optimization
 * 
 * Updated: Now supports dynamic height calculation to prevent scroll jumps
 */

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height?: number | string;
  width?: string;
  overscanCount?: number;
  renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  height = 600,
  width = '100%',
  overscanCount = 5,
  renderItem,
  className = '',
  emptyMessage = 'لا توجد عناصر للعرض'
}: VirtualListProps<T>) {
  const { isMobile } = useSimpleBreakpoint();

  // Adjust height for mobile
  const listHeight = typeof height === 'number' 
    ? (isMobile ? Math.min(height, 400) : height)
    : height;

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 text-muted-foreground ${className}`}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Row renderer
  const Row = ({ index, style }: ListChildComponentProps) => {
    const item = items[index];
    return renderItem(item, index, style);
  };

  return (
    <div className={className}>
      <List
        height={typeof listHeight === 'number' ? listHeight : 600}
        itemCount={items.length}
        itemSize={itemHeight}
        width={width}
        overscanCount={overscanCount}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {Row}
      </List>
    </div>
  );
}

/**
 * Dynamic height list using @tanstack/react-virtual
 * Automatically measures item heights - no hardcoded sizes!
 */
interface DynamicVirtualListProps<T> {
  items: T[];
  height?: number | string;
  overscanCount?: number;
  estimateSize?: number; // Initial estimate
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
  getItemKey?: (item: T, index: number) => string | number;
}

export function DynamicVirtualList<T>({
  items,
  height = 600,
  overscanCount = 5,
  estimateSize = 100,
  renderItem,
  className = '',
  emptyMessage = 'لا توجد عناصر للعرض',
  getItemKey
}: DynamicVirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useSimpleBreakpoint();

  // Adjust height for mobile
  const listHeight = typeof height === 'number' 
    ? (isMobile ? Math.min(height, 400) : height)
    : height;

  // Dynamic height measurement
  const measureElement = useCallback((el: Element | null) => {
    if (!el) return estimateSize;
    const measuredHeight = el.getBoundingClientRect().height;
    return measuredHeight > 0 ? measuredHeight : estimateSize;
  }, [estimateSize]);

  // Virtualizer with dynamic sizing
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: overscanCount,
    measureElement,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 text-muted-foreground ${className}`}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={parentRef}
        className="overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        style={{
          height: typeof listHeight === 'number' ? `${listHeight}px` : listHeight,
          contain: 'strict',
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const item = items[virtualRow.index];
            const key = getItemKey ? getItemKey(item, virtualRow.index) : virtualRow.index;
            
            return (
              <div
                key={key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {renderItem(item, virtualRow.index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Fixed height list (for uniform items) - More performant when all items are same height
 */
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height?: number | string;
  width?: string;
  overscanCount?: number;
  renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
}

/**
 * Variable size list for items with different heights (legacy - use DynamicVirtualList instead)
 * @deprecated Use DynamicVirtualList for better performance and dynamic height support
 */
interface VirtualVariableListProps<T> {
  items: T[];
  height?: number | string;
  width?: string;
  overscanCount?: number;
  getItemSize: (index: number) => number;
  renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
}

export function VirtualVariableList<T>({
  items,
  height = 600,
  width = '100%',
  overscanCount = 5,
  getItemSize,
  renderItem,
  className = '',
  emptyMessage = 'لا توجد عناصر للعرض'
}: VirtualVariableListProps<T>) {
  const { isMobile } = useSimpleBreakpoint();

  // Adjust height for mobile
  const listHeight = typeof height === 'number' 
    ? (isMobile ? Math.min(height, 400) : height)
    : height;

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 text-muted-foreground ${className}`}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Row renderer
  const Row = ({ index, style }: ListChildComponentProps) => {
    const item = items[index];
    return renderItem(item, index, style);
  };

  return (
    <div className={className}>
      <VariableSizeList
        height={typeof listHeight === 'number' ? listHeight : 600}
        itemCount={items.length}
        itemSize={getItemSize}
        width={width}
        overscanCount={overscanCount}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {Row}
      </VariableSizeList>
    </div>
  );
}

export default VirtualList;
