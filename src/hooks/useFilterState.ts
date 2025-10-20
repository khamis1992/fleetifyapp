/**
 * useFilterState Hook
 * Phase 8 - Agent 1: Advanced Filters & Search
 *
 * Custom hook for managing filter state with URL sync and preset support
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FilterState,
  FilterPreset,
  FilterChangeHandler,
  FilterChangeEvent,
  FilterChangeType
} from '@/types/filter.types';
import {
  getFiltersFromUrl,
  updateUrlWithFilters,
  clearFiltersFromUrl,
  createNavigationListener
} from '@/utils/filterUrlSync';

// ============================================================================
// Hook Options
// ============================================================================

export interface UseFilterStateOptions {
  initialFilters?: FilterState;
  syncWithUrl?: boolean;
  debounceUrlUpdate?: number;
  onFiltersChange?: FilterChangeHandler;
  storageKey?: string; // For localStorage persistence
  enableLocalStorage?: boolean;
}

// ============================================================================
// Hook Return Type
// ============================================================================

export interface UseFilterStateReturn {
  filters: FilterState;
  setFilters: (filters: FilterState | ((prev: FilterState) => FilterState)) => void;
  updateFilters: (partial: Partial<FilterState>) => void;
  resetFilters: () => void;
  applyPreset: (preset: FilterPreset) => void;
  activeFilterCount: number;
  isFiltering: boolean;
  hasActiveFilters: boolean;
  setDateRange: (start: Date | null, end: Date | null, preset?: string) => void;
  setMultiSelect: (key: string, values: string[]) => void;
  setSearch: (query: string, fields?: string[]) => void;
  clearDateRange: () => void;
  clearMultiSelect: (key?: string) => void;
  clearSearch: () => void;
}

// ============================================================================
// Helper: Count Active Filters
// ============================================================================

const countActiveFilters = (filters: FilterState): number => {
  let count = 0;

  if (filters.dateRange?.start || filters.dateRange?.end) count++;
  if (filters.multiSelect) {
    count += Object.values(filters.multiSelect).filter((arr) => arr.length > 0).length;
  }
  if (filters.search?.query && filters.search.query.trim()) count++;
  if (filters.custom) count += Object.keys(filters.custom).length;

  return count;
};

// ============================================================================
// Helper: Get Changed Keys
// ============================================================================

const getChangedKeys = (prev: FilterState, next: FilterState): string[] => {
  const keys = new Set<string>();

  if (JSON.stringify(prev.dateRange) !== JSON.stringify(next.dateRange)) {
    keys.add('dateRange');
  }
  if (JSON.stringify(prev.multiSelect) !== JSON.stringify(next.multiSelect)) {
    keys.add('multiSelect');
  }
  if (JSON.stringify(prev.search) !== JSON.stringify(next.search)) {
    keys.add('search');
  }
  if (JSON.stringify(prev.custom) !== JSON.stringify(next.custom)) {
    keys.add('custom');
  }

  return Array.from(keys);
};

// ============================================================================
// useFilterState Hook
// ============================================================================

export const useFilterState = (options: UseFilterStateOptions = {}): UseFilterStateReturn => {
  const {
    initialFilters = {},
    syncWithUrl = true,
    debounceUrlUpdate = 500,
    onFiltersChange,
    storageKey,
    enableLocalStorage = false
  } = options;

  const [searchParams] = useSearchParams();
  const urlSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousFiltersRef = useRef<FilterState>(initialFilters);

  // ============================================================================
  // Initialize Filters (from URL or localStorage or initial)
  // ============================================================================

  const [filters, setFiltersInternal] = useState<FilterState>(() => {
    // Priority 1: URL parameters
    if (syncWithUrl) {
      const urlFilters = getFiltersFromUrl();
      if (urlFilters) return urlFilters;
    }

    // Priority 2: localStorage
    if (enableLocalStorage && storageKey) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects
          if (parsed.dateRange) {
            if (parsed.dateRange.start) parsed.dateRange.start = new Date(parsed.dateRange.start);
            if (parsed.dateRange.end) parsed.dateRange.end = new Date(parsed.dateRange.end);
          }
          return parsed;
        }
      } catch (error) {
        console.error('Failed to load filters from localStorage:', error);
      }
    }

    // Priority 3: Initial filters
    return initialFilters;
  });

  // ============================================================================
  // URL Sync Effect
  // ============================================================================

  useEffect(() => {
    if (!syncWithUrl) return;

    if (urlSyncTimeoutRef.current) {
      clearTimeout(urlSyncTimeoutRef.current);
    }

    urlSyncTimeoutRef.current = setTimeout(() => {
      updateUrlWithFilters(filters, { replaceState: true });
    }, debounceUrlUpdate);

    return () => {
      if (urlSyncTimeoutRef.current) {
        clearTimeout(urlSyncTimeoutRef.current);
      }
    };
  }, [filters, syncWithUrl, debounceUrlUpdate]);

  // ============================================================================
  // LocalStorage Sync Effect
  // ============================================================================

  useEffect(() => {
    if (!enableLocalStorage || !storageKey) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (error) {
      console.error('Failed to save filters to localStorage:', error);
    }
  }, [filters, enableLocalStorage, storageKey]);

  // ============================================================================
  // Browser Navigation Listener
  // ============================================================================

  useEffect(() => {
    if (!syncWithUrl) return;

    const cleanup = createNavigationListener((urlFilters) => {
      if (urlFilters) {
        setFiltersInternal(urlFilters);
      }
    });

    return cleanup;
  }, [syncWithUrl]);

  // ============================================================================
  // Change Handler Effect
  // ============================================================================

  useEffect(() => {
    if (!onFiltersChange) return;

    const changedKeys = getChangedKeys(previousFiltersRef.current, filters);
    if (changedKeys.length === 0) return;

    const event: FilterChangeEvent = {
      type: changedKeys[0] as FilterChangeType,
      filters,
      previousFilters: previousFiltersRef.current,
      changedKeys
    };

    onFiltersChange(event);
    previousFiltersRef.current = filters;
  }, [filters, onFiltersChange]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const isFiltering = activeFilterCount > 0;
  const hasActiveFilters = isFiltering;

  // ============================================================================
  // Main Setters
  // ============================================================================

  const setFilters = useCallback(
    (newFilters: FilterState | ((prev: FilterState) => FilterState)) => {
      setFiltersInternal(newFilters);
    },
    []
  );

  const updateFilters = useCallback((partial: Partial<FilterState>) => {
    setFiltersInternal((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersInternal(initialFilters);
    if (syncWithUrl) {
      clearFiltersFromUrl({ replaceState: true });
    }
  }, [initialFilters, syncWithUrl]);

  const applyPreset = useCallback((preset: FilterPreset) => {
    setFiltersInternal(preset.filters);
    if (syncWithUrl) {
      updateUrlWithFilters(preset.filters, { replaceState: false, presetId: preset.id });
    }
  }, [syncWithUrl]);

  // ============================================================================
  // Specific Filter Setters
  // ============================================================================

  const setDateRange = useCallback((start: Date | null, end: Date | null, preset?: string) => {
    setFiltersInternal((prev) => ({
      ...prev,
      dateRange: { start, end, preset: preset as any }
    }));
  }, []);

  const setMultiSelect = useCallback((key: string, values: string[]) => {
    setFiltersInternal((prev) => ({
      ...prev,
      multiSelect: {
        ...prev.multiSelect,
        [key]: values
      }
    }));
  }, []);

  const setSearch = useCallback((query: string, fields: string[] = []) => {
    setFiltersInternal((prev) => ({
      ...prev,
      search: {
        query,
        fields,
        recentSearches: prev.search?.recentSearches
      }
    }));
  }, []);

  // ============================================================================
  // Clear Specific Filters
  // ============================================================================

  const clearDateRange = useCallback(() => {
    setFiltersInternal((prev) => ({
      ...prev,
      dateRange: undefined
    }));
  }, []);

  const clearMultiSelect = useCallback((key?: string) => {
    setFiltersInternal((prev) => {
      if (!key) {
        return { ...prev, multiSelect: undefined };
      }
      const newMultiSelect = { ...prev.multiSelect };
      delete newMultiSelect[key];
      return { ...prev, multiSelect: newMultiSelect };
    });
  }, []);

  const clearSearch = useCallback(() => {
    setFiltersInternal((prev) => ({
      ...prev,
      search: undefined
    }));
  }, []);

  // ============================================================================
  // Return Hook Values
  // ============================================================================

  return {
    filters,
    setFilters,
    updateFilters,
    resetFilters,
    applyPreset,
    activeFilterCount,
    isFiltering,
    hasActiveFilters,
    setDateRange,
    setMultiSelect,
    setSearch,
    clearDateRange,
    clearMultiSelect,
    clearSearch
  };
};

export default useFilterState;
