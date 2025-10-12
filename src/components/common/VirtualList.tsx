import React, { CSSProperties } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';

/**
 * Virtual List Component - Performance Optimization
 * Uses react-window for efficient rendering of large lists
 * Part of Phase 1 Performance Optimization
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
 * Variable size list for items with different heights
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
  const { VariableSizeList } = require('react-window');
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
