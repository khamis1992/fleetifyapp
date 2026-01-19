/**
 * MultiSelectFilter Component
 * Phase 8 - Agent 1: Advanced Filters & Search
 *
 * A multi-select filter with checkboxes, search, and Select All/Clear All options
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { MultiSelectOption } from '@/types/filter.types';

// ============================================================================
// Component Props
// ============================================================================

export interface MultiSelectFilterProps {
  label: string;
  options: MultiSelectOption[];
  value?: string[];
  onChange?: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showSearch?: boolean;
  showSelectAll?: boolean;
  showClearAll?: boolean;
  showCount?: boolean;
  maxHeight?: number;
  emptyMessage?: string;
  searchPlaceholder?: string;
  selectAllLabel?: string;
  clearAllLabel?: string;
  position?: 'left' | 'right';
}

// ============================================================================
// MultiSelectFilter Component
// ============================================================================

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  options,
  value = [],
  onChange,
  placeholder = 'اختر خيارات',
  className,
  disabled = false,
  showSearch = true,
  showSelectAll = true,
  showClearAll = true,
  showCount = true,
  maxHeight = 300,
  emptyMessage = 'لا توجد نتائج',
  searchPlaceholder = 'بحث...',
  selectAllLabel = 'تحديد الكل',
  clearAllLabel = 'إلغاء الكل',
  position = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, showSearch]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;

    const query = searchQuery.toLowerCase().trim();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const selectedOptions = useMemo(() => {
    return options.filter((option) => selectedSet.has(option.value));
  }, [options, selectedSet]);

  const allFilteredSelected = useMemo(() => {
    if (filteredOptions.length === 0) return false;
    return filteredOptions.every((option) => selectedSet.has(option.value));
  }, [filteredOptions, selectedSet]);

  const someFilteredSelected = useMemo(() => {
    if (filteredOptions.length === 0) return false;
    return (
      filteredOptions.some((option) => selectedSet.has(option.value)) &&
      !allFilteredSelected
    );
  }, [filteredOptions, selectedSet, allFilteredSelected]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleToggle = useCallback(
    (optionValue: string) => {
      const newSelected = selectedSet.has(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue];
      onChange?.(newSelected);
    },
    [value, selectedSet, onChange]
  );

  const handleSelectAll = useCallback(() => {
    const allValues = filteredOptions
      .filter((opt) => !opt.disabled)
      .map((opt) => opt.value);
    const newSelected = [...new Set([...value, ...allValues])];
    onChange?.(newSelected);
  }, [filteredOptions, value, onChange]);

  const handleClearAll = useCallback(() => {
    const filteredValues = new Set(
      filteredOptions.filter((opt) => !opt.disabled).map((opt) => opt.value)
    );
    const newSelected = value.filter((v) => !filteredValues.has(v));
    onChange?.(newSelected);
  }, [filteredOptions, value, onChange]);

  const handleClearSelection = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.([]);
    },
    [onChange]
  );

  const handleRemoveBadge = useCallback(
    (optionValue: string, e: React.MouseEvent) => {
      e.stopPropagation();
      handleToggle(optionValue);
    },
    [handleToggle]
  );

  // ============================================================================
  // Display Text
  // ============================================================================

  const displayText = useMemo(() => {
    if (selectedOptions.length === 0) return placeholder;
    if (selectedOptions.length === 1) return selectedOptions[0].label;
    if (selectedOptions.length <= 3) {
      return selectedOptions.map((opt) => opt.label).join('، ');
    }
    return `${selectedOptions.length} محدد`;
  }, [selectedOptions, placeholder]);

  const hasValue = value.length > 0;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={cn('w-full', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={cn(
              'w-full justify-between text-right font-normal',
              !hasValue && 'text-muted-foreground',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            disabled={disabled}
          >
            <span className="flex items-center gap-2 flex-1 truncate">
              {showCount && hasValue && (
                <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs">
                  {value.length}
                </Badge>
              )}
              <span className="truncate">{displayText}</span>
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {hasValue && !disabled && (
                <X
                  className="h-4 w-4 hover:text-destructive transition-colors"
                  onClick={handleClearSelection}
                />
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align={position === 'right' ? 'end' : 'start'}
          sideOffset={4}
        >
          <div className="flex flex-col" dir="rtl">
            {/* Search Input */}
            {showSearch && (
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-9 text-right"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Select All / Clear All Buttons */}
            {(showSelectAll || showClearAll) && filteredOptions.length > 0 && (
              <>
                <div className="p-2 flex items-center justify-between gap-2">
                  {showSelectAll && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs flex-1"
                      onClick={handleSelectAll}
                      disabled={allFilteredSelected}
                    >
                      <Check className="h-3 w-3 ml-2" />
                      {selectAllLabel}
                    </Button>
                  )}
                  {showClearAll && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs flex-1"
                      onClick={handleClearAll}
                      disabled={!someFilteredSelected && !allFilteredSelected}
                    >
                      <X className="h-3 w-3 ml-2" />
                      {clearAllLabel}
                    </Button>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Options List */}
            <ScrollArea className="overflow-y-auto" style={{ maxHeight }}>
              {filteredOptions.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredOptions.map((option) => {
                    const isSelected = selectedSet.has(option.value);
                    const Icon = option.icon;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          'w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-right transition-colors',
                          'hover:bg-accent hover:text-accent-foreground',
                          isSelected && 'bg-accent',
                          option.disabled && 'opacity-50 cursor-not-allowed'
                        )}
                        onClick={() => !option.disabled && handleToggle(option.value)}
                        disabled={option.disabled}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => !option.disabled && handleToggle(option.value)}
                          disabled={option.disabled}
                          className="pointer-events-none"
                        />
                        {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                        <span className="flex-1 truncate">{option.label}</span>
                        {option.count !== undefined && (
                          <Badge variant="secondary" className="text-xs">
                            {option.count}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Items as Badges (Optional) */}
      {hasValue && selectedOptions.length <= 5 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedOptions.map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="text-xs gap-1 pr-1"
            >
              {option.label}
              {!disabled && (
                <button
                  onClick={(e) => handleRemoveBadge(option.value, e)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelectFilter;
