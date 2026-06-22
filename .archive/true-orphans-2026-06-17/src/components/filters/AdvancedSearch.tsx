/**
 * AdvancedSearch Component
 * Phase 8 - Agent 1: Advanced Filters & Search
 *
 * A debounced search input with autocomplete, recent searches, and multi-field support
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { SearchSuggestion } from '@/types/filter.types';
import { FILTER_STORAGE_KEYS } from '@/types/filter.types';

// ============================================================================
// Component Props
// ============================================================================

export interface AdvancedSearchProps {
  value?: string;
  onChange?: (query: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  suggestions?: SearchSuggestion[];
  fields?: string[];
  debounceMs?: number;
  showRecentSearches?: boolean;
  maxRecentSearches?: number;
  showSuggestions?: boolean;
  emptyMessage?: string;
  recentSearchesLabel?: string;
  suggestionsLabel?: string;
  minChars?: number;
}

// ============================================================================
// Local Storage Helper
// ============================================================================

const getRecentSearches = (maxItems = 10): string[] => {
  try {
    const stored = localStorage.getItem(FILTER_STORAGE_KEYS.RECENT_SEARCHES);
    if (!stored) return [];
    const searches = JSON.parse(stored) as string[];
    return searches.slice(0, maxItems);
  } catch {
    return [];
  }
};

const saveRecentSearch = (query: string, maxItems = 10): void => {
  try {
    const searches = getRecentSearches(maxItems);
    const trimmedQuery = query.trim();

    if (!trimmedQuery) return;

    // Remove duplicates and add to front
    const updated = [
      trimmedQuery,
      ...searches.filter((s) => s !== trimmedQuery)
    ].slice(0, maxItems);

    localStorage.setItem(FILTER_STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent search:', error);
  }
};

const clearRecentSearches = (): void => {
  try {
    localStorage.removeItem(FILTER_STORAGE_KEYS.RECENT_SEARCHES);
  } catch (error) {
    console.error('Failed to clear recent searches:', error);
  }
};

// ============================================================================
// AdvancedSearch Component
// ============================================================================

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  value = '',
  onChange,
  onSearch,
  placeholder = 'بحث...',
  className,
  disabled = false,
  suggestions = [],
  fields = [],
  debounceMs = 300,
  showRecentSearches = true,
  maxRecentSearches = 10,
  showSuggestions = true,
  emptyMessage = 'لا توجد نتائج',
  recentSearchesLabel = 'عمليات البحث الأخيرة',
  suggestionsLabel = 'الاقتراحات',
  minChars = 1
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Load Recent Searches
  // ============================================================================

  useEffect(() => {
    if (showRecentSearches) {
      setRecentSearches(getRecentSearches(maxRecentSearches));
    }
  }, [showRecentSearches, maxRecentSearches]);

  // ============================================================================
  // Sync External Value
  // ============================================================================

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // ============================================================================
  // Debounced onChange Handler
  // ============================================================================

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onChange?.(localValue);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localValue, debounceMs, onChange]);

  // ============================================================================
  // Filtered Suggestions
  // ============================================================================

  const filteredSuggestions = useMemo(() => {
    if (!showSuggestions || !localValue || localValue.length < minChars) {
      return [];
    }

    const query = localValue.toLowerCase().trim();
    return suggestions.filter(
      (suggestion) =>
        suggestion.label.toLowerCase().includes(query) ||
        suggestion.value.toLowerCase().includes(query)
    );
  }, [suggestions, localValue, showSuggestions, minChars]);

  // ============================================================================
  // Grouped Suggestions by Category
  // ============================================================================

  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, SearchSuggestion[]> = {};

    filteredSuggestions.forEach((suggestion) => {
      const category = suggestion.category || 'عام';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(suggestion);
    });

    return groups;
  }, [filteredSuggestions]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    if (e.target.value.trim()) {
      setIsOpen(true);
    }
  }, []);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange?.('');
    inputRef.current?.focus();
  }, [onChange]);

  const handleSearch = useCallback(
    (query: string) => {
      const trimmedQuery = query.trim();
      if (trimmedQuery) {
        setLocalValue(trimmedQuery);
        onChange?.(trimmedQuery);
        onSearch?.(trimmedQuery);
        saveRecentSearch(trimmedQuery, maxRecentSearches);
        setRecentSearches(getRecentSearches(maxRecentSearches));
      }
      setIsOpen(false);
    },
    [onChange, onSearch, maxRecentSearches]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: SearchSuggestion) => {
      handleSearch(suggestion.value);
    },
    [handleSearch]
  );

  const handleRecentSearchClick = useCallback(
    (query: string) => {
      handleSearch(query);
    },
    [handleSearch]
  );

  const handleClearRecentSearches = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch(localValue);
      } else if (e.key === 'Escape') {
        handleClear();
        setIsOpen(false);
      }
    },
    [localValue, handleSearch, handleClear]
  );

  // ============================================================================
  // Show Popover Content
  // ============================================================================

  const hasContent =
    (showRecentSearches && recentSearches.length > 0) ||
    (showSuggestions && filteredSuggestions.length > 0);

  const showPopover = isOpen && hasContent;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={showPopover} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={localValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              disabled={disabled}
              className={cn(
                'pr-10 text-right',
                localValue && 'pl-10',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            />
            {localValue && !disabled && (
              <button
                onClick={handleClear}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col" dir="rtl">
            <ScrollArea className="max-h-[300px]">
              {/* Recent Searches */}
              {showRecentSearches && recentSearches.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {recentSearchesLabel}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-0 px-2 text-xs"
                      onClick={handleClearRecentSearches}
                    >
                      مسح الكل
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((query, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-right transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleRecentSearchClick(query)}
                      >
                        <Clock className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{query}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Separator */}
              {showRecentSearches &&
                recentSearches.length > 0 &&
                showSuggestions &&
                filteredSuggestions.length > 0 && <Separator />}

              {/* Suggestions */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    {suggestionsLabel}
                  </div>

                  {/* Grouped by Category */}
                  {Object.entries(groupedSuggestions).map(([category, items]) => (
                    <div key={category} className="mb-3 last:mb-0">
                      {Object.keys(groupedSuggestions).length > 1 && (
                        <div className="text-xs font-medium text-muted-foreground mb-1 px-3">
                          {category}
                        </div>
                      )}
                      <div className="space-y-1">
                        {items.map((suggestion, index) => (
                          <button
                            key={`${suggestion.value}-${index}`}
                            type="button"
                            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-right transition-colors hover:bg-accent hover:text-accent-foreground"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <Search className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                            <span className="flex-1 truncate">{suggestion.label}</span>
                            {suggestion.category && (
                              <Badge variant="secondary" className="text-xs">
                                {suggestion.category}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {localValue.length >= minChars &&
                filteredSuggestions.length === 0 &&
                recentSearches.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </div>
                )}
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Search Badge */}
      {localValue && (
        <div className="flex items-center gap-1 mt-1">
          <Badge variant="secondary" className="text-xs">
            <Search className="h-3 w-3 ml-1" />
            البحث عن: {localValue}
          </Badge>
          {fields.length > 0 && (
            <Badge variant="outline" className="text-xs">
              في: {fields.join('، ')}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;
