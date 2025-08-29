import React, { useMemo, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  className?: string;
  overscan?: number;
}

export const VirtualizedList = <T,>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  className,
  overscan = 5
}: VirtualizedListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const visibleItems = useMemo(() => {
    const itemCount = items.length;
    const containerVisibleCount = Math.ceil(containerHeight / itemHeight);
    
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      startIndex + containerVisibleCount + overscan * 2
    );

    const visibleItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visibleItems.push({
        index: i,
        item: items[i],
        top: i * itemHeight
      });
    }

    return {
      items: visibleItems,
      totalHeight: itemCount * itemHeight,
      startIndex,
      endIndex
    };
  }, [items, itemHeight, scrollTop, containerHeight, overscan]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Smooth scrolling optimization
  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    let ticking = false;
    const updateScrollTop = () => {
      setScrollTop(element.scrollTop);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollTop);
        ticking = true;
      }
    };

    element.addEventListener('scroll', onScroll, { passive: true });
    return () => element.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      ref={scrollElementRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: visibleItems.totalHeight, position: 'relative' }}>
        {visibleItems.items.map(({ item, index, top }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
};