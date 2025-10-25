import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Users, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { useCustomerSearch } from '@/hooks/useCustomerSearch';

interface TypeAheadSearchProps {
  placeholder?: string;
  onSelect: (result: CustomerSearchResult) => void;
  className?: string;
  disabled?: boolean;
}

interface CustomerSearchResult {
  id: string;
  name: string;
  type: 'individual' | 'corporate';
  phone: string | null;
  email: string | null;
}

/**
 * TypeAheadSearch Component
 *
 * A reusable type-ahead search component with instant results
 * Features:
 * - Debounced search (300ms)
 * - Shows top 10 results
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Highlights matching text
 * - Loading indicator
 * - Empty state
 *
 * @example
 * <TypeAheadSearch
 *   placeholder="ابحث عن عميل..."
 *   onSelect={(customer) => console.log(customer)}
 * />
 */
export function TypeAheadSearch({
  placeholder = 'ابحث...',
  onSelect,
  className,
  disabled = false,
}: TypeAheadSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounce the search query
  const debouncedQuery = useDebounce(query, 300);

  // Fetch search results
  const { data: results = [], isLoading } = useCustomerSearch(debouncedQuery, {
    limit: 10,
    enabled: debouncedQuery.length >= 2,
  });

  // Show results when query is entered and results exist
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelect = (result: CustomerSearchResult) => {
    onSelect(result);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  // Highlight matching text
  const highlightMatch = (text: string, search: string) => {
    if (!search) return text;

    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 font-semibold">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (debouncedQuery.length >= 2) {
              setIsOpen(true);
            }
          }}
          disabled={disabled}
          className="pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && debouncedQuery.length >= 2 && (
        <Card
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 shadow-lg border-border"
        >
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin ml-2" />
                <span className="text-sm">جاري البحث...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">لا توجد نتائج</p>
                <p className="text-xs mt-1">جرب مصطلح بحث آخر</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={result.id}
                    className={cn(
                      'px-4 py-3 cursor-pointer transition-colors border-b border-border/50 last:border-0',
                      selectedIndex === index
                        ? 'bg-primary/10'
                        : 'hover:bg-muted/50'
                    )}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {result.type === 'individual' ? (
                            <Users className="h-4 w-4 text-primary flex-shrink-0" />
                          ) : (
                            <Building2 className="h-4 w-4 text-success flex-shrink-0" />
                          )}
                          <p className="font-medium text-sm truncate">
                            {highlightMatch(result.name, debouncedQuery)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {result.phone && (
                            <span className="truncate">
                              {highlightMatch(result.phone, debouncedQuery)}
                            </span>
                          )}
                          {result.email && (
                            <>
                              {result.phone && <span>•</span>}
                              <span className="truncate">
                                {highlightMatch(result.email, debouncedQuery)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={result.type === 'individual' ? 'default' : 'secondary'}
                        className="text-xs flex-shrink-0"
                      >
                        {result.type === 'individual' ? 'فرد' : 'شركة'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results count */}
            {results.length > 0 && !isLoading && (
              <div className="px-4 py-2 bg-muted/30 border-t border-border/50 text-xs text-muted-foreground text-center">
                {results.length} نتيجة • استخدم ↑↓ للتنقل و Enter للاختيار
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
