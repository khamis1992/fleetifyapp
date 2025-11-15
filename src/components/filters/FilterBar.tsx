/**
 * FilterBar Component
 * Phase 8 - Agent 1: Advanced Filters & Search
 *
 * Container component for all filters with clear all, active filter display, and responsive layout
 */

import React, { useMemo, ReactNode } from 'react';
import { X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { FilterState } from '@/types/filter.types';

// ============================================================================
// Component Props
// ============================================================================

export interface FilterBarProps {
  children: ReactNode;
  filters?: FilterState;
  onClearAll?: () => void;
  className?: string;
  showClearButton?: boolean;
  showFilterCount?: boolean;
  showActiveFilters?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  title?: string;
  clearAllLabel?: string;
  activeFiltersLabel?: string;
  filtersLabel?: string;
  position?: 'top' | 'bottom';
  variant?: 'default' | 'compact';
}

// ============================================================================
// Helper: Count Active Filters
// ============================================================================

const countActiveFilters = (filters?: FilterState): number => {
  if (!filters) return 0;

  let count = 0;

  // Count date range
  if (filters.dateRange?.start || filters.dateRange?.end) {
    count++;
  }

  // Count multi-select filters
  if (filters.multiSelect) {
    const multiSelectCount = Object.values(filters.multiSelect).reduce(
      (sum, values) => sum + (values.length > 0 ? 1 : 0),
      0
    );
    count += multiSelectCount;
  }

  // Count search
  if (filters.search?.query && filters.search.query.trim()) {
    count++;
  }

  // Count custom filters
  if (filters.custom) {
    count += Object.keys(filters.custom).length;
  }

  return count;
};

// ============================================================================
// Helper: Get Active Filter Descriptions
// ============================================================================

const getActiveFilterDescriptions = (filters?: FilterState): string[] => {
  if (!filters) return [];

  const descriptions: string[] = [];

  // Date range description
  if (filters.dateRange?.preset) {
    descriptions.push(`التاريخ: ${filters.dateRange.preset}`);
  } else if (filters.dateRange?.start || filters.dateRange?.end) {
    descriptions.push('نطاق تاريخ مخصص');
  }

  // Multi-select descriptions
  if (filters.multiSelect) {
    Object.entries(filters.multiSelect).forEach(([key, values]) => {
      if (values.length > 0) {
        descriptions.push(`${key}: ${values.length} محدد`);
      }
    });
  }

  // Search description
  if (filters.search?.query && filters.search.query.trim()) {
    descriptions.push(`بحث: "${filters.search.query}"`);
  }

  // Custom filter descriptions
  if (filters.custom) {
    Object.keys(filters.custom).forEach((key) => {
      descriptions.push(key);
    });
  }

  return descriptions;
};

// ============================================================================
// FilterBar Component
// ============================================================================

export const FilterBar: React.FC<FilterBarProps> = ({
  children,
  filters,
  onClearAll,
  className,
  showClearButton = true,
  showFilterCount = true,
  showActiveFilters = true,
  collapsible = false,
  defaultCollapsed = false,
  title = 'تصفية البيانات',
  clearAllLabel = 'مسح الكل',
  activeFiltersLabel = 'التصفيات النشطة',
  filtersLabel = 'تصفية',
  position = 'top',
  variant = 'default'
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const activeFilterCount = useMemo(
    () => countActiveFilters(filters),
    [filters]
  );

  const activeFilterDescriptions = useMemo(
    () => getActiveFilterDescriptions(filters),
    [filters]
  );

  const hasActiveFilters = activeFilterCount > 0;

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleClearAll = () => {
    onClearAll?.();
  };

  // ============================================================================
  // Render Helper: Filter Header
  // ============================================================================

  const renderHeader = () => (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{title}</h3>
        {showFilterCount && hasActiveFilters && (
          <Badge variant="secondary" className="rounded-full px-2 text-xs">
            {activeFilterCount}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showClearButton && hasActiveFilters && onClearAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-8 text-xs"
          >
            <X className="h-3 w-3 ml-1" />
            {clearAllLabel}
          </Button>
        )}
        {collapsible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // Render Helper: Active Filters
  // ============================================================================

  const renderActiveFilters = () => {
    if (!showActiveFilters || !hasActiveFilters) return null;

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{activeFiltersLabel}:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeFilterDescriptions.map((description, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs gap-1 pr-1"
            >
              {description}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // Render Helper: Filter Content
  // ============================================================================

  const renderContent = () => (
    <div className="space-y-4">
      {/* Filter Inputs */}
      <div
        className={cn(
          'grid gap-4',
          variant === 'compact'
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        )}
      >
        {children}
      </div>

      {/* Active Filters Display */}
      {renderActiveFilters()}
    </div>
  );

  // ============================================================================
  // Render
  // ============================================================================

  if (collapsible) {
    return (
      <div
        className={cn(
          'rounded-lg border bg-card text-card-foreground shadow-sm',
          position === 'bottom' && 'mt-6',
          position === 'top' && 'mb-6',
          className
        )}
      >
        <Collapsible open={!isCollapsed} onOpenChange={setIsCollapsed}>
          <div className="p-4">
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer">{renderHeader()}</div>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="px-4 pb-4">
              <Separator className="mb-4" />
              {renderContent()}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-4',
        position === 'bottom' && 'mt-6',
        position === 'top' && 'mb-6',
        className
      )}
    >
      {renderHeader()}
      <Separator />
      {renderContent()}
    </div>
  );
};

export default FilterBar;
