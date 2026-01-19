/**
 * Filter URL Sync Utility
 * Phase 8 - Agent 1: Advanced Filters & Search
 *
 * Utilities for syncing filter state with URL query parameters
 */

import { FilterState, FilterUrlParams, isValidFilterState } from '@/types/filter.types';

// ============================================================================
// Base64 Encoding/Decoding Helpers
// ============================================================================

/**
 * Encode filter state to base64 string
 */
export const encodeFilterState = (filters: FilterState): string => {
  try {
    const json = JSON.stringify(filters);
    return btoa(encodeURIComponent(json));
  } catch (error) {
    console.error('Failed to encode filter state:', error);
    return '';
  }
};

/**
 * Decode base64 string to filter state
 */
export const decodeFilterState = (encoded: string): FilterState | null => {
  try {
    const json = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(json);

    // Convert date strings back to Date objects
    if (parsed.dateRange) {
      if (parsed.dateRange.start) {
        parsed.dateRange.start = new Date(parsed.dateRange.start);
      }
      if (parsed.dateRange.end) {
        parsed.dateRange.end = new Date(parsed.dateRange.end);
      }
    }

    // Validate the parsed state
    if (!isValidFilterState(parsed)) {
      console.warn('Invalid filter state in URL');
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to decode filter state:', error);
    return null;
  }
};

// ============================================================================
// URL Parameter Management
// ============================================================================

/**
 * Get filter state from URL query parameters
 */
export const getFiltersFromUrl = (): FilterState | null => {
  try {
    const params = new URLSearchParams(window.location.search);
    const filtersParam = params.get('filters');

    if (!filtersParam) return null;

    return decodeFilterState(filtersParam);
  } catch (error) {
    console.error('Failed to get filters from URL:', error);
    return null;
  }
};

/**
 * Get preset ID from URL query parameters
 */
export const getPresetFromUrl = (): string | null => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('preset');
  } catch (error) {
    console.error('Failed to get preset from URL:', error);
    return null;
  }
};

/**
 * Update URL with filter state
 */
export const updateUrlWithFilters = (
  filters: FilterState,
  options?: {
    replaceState?: boolean;
    presetId?: string;
    preserveOtherParams?: boolean;
  }
): void => {
  try {
    const { replaceState = false, presetId, preserveOtherParams = true } = options || {};

    // Get current URL params
    const currentParams = new URLSearchParams(window.location.search);
    const newParams = preserveOtherParams ? currentParams : new URLSearchParams();

    // Remove old filter params
    newParams.delete('filters');
    newParams.delete('preset');

    // Check if filters are empty
    const hasFilters =
      (filters.dateRange?.start || filters.dateRange?.end) ||
      (filters.multiSelect && Object.values(filters.multiSelect).some((arr) => arr.length > 0)) ||
      (filters.search?.query && filters.search.query.trim()) ||
      (filters.custom && Object.keys(filters.custom).length > 0);

    // Add new filter params if not empty
    if (hasFilters) {
      const encoded = encodeFilterState(filters);
      if (encoded) {
        newParams.set('filters', encoded);
      }
    }

    // Add preset ID if provided
    if (presetId) {
      newParams.set('preset', presetId);
    }

    // Build new URL
    const newSearch = newParams.toString();
    const newUrl = newSearch
      ? `${window.location.pathname}?${newSearch}`
      : window.location.pathname;

    // Update browser history
    if (replaceState) {
      window.history.replaceState(null, '', newUrl);
    } else {
      window.history.pushState(null, '', newUrl);
    }
  } catch (error) {
    console.error('Failed to update URL with filters:', error);
  }
};

/**
 * Clear filters from URL
 */
export const clearFiltersFromUrl = (options?: {
  replaceState?: boolean;
  preserveOtherParams?: boolean;
}): void => {
  try {
    const { replaceState = false, preserveOtherParams = true } = options || {};

    const currentParams = new URLSearchParams(window.location.search);
    const newParams = preserveOtherParams ? currentParams : new URLSearchParams();

    newParams.delete('filters');
    newParams.delete('preset');

    const newSearch = newParams.toString();
    const newUrl = newSearch
      ? `${window.location.pathname}?${newSearch}`
      : window.location.pathname;

    if (replaceState) {
      window.history.replaceState(null, '', newUrl);
    } else {
      window.history.pushState(null, '', newUrl);
    }
  } catch (error) {
    console.error('Failed to clear filters from URL:', error);
  }
};

// ============================================================================
// Browser Navigation Handling
// ============================================================================

/**
 * Create a listener for browser back/forward navigation
 */
export const createNavigationListener = (
  onNavigate: (filters: FilterState | null) => void
): (() => void) => {
  const handlePopState = () => {
    const filters = getFiltersFromUrl();
    onNavigate(filters);
  };

  window.addEventListener('popstate', handlePopState);

  // Return cleanup function
  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
};

// ============================================================================
// Deep Linking Helpers
// ============================================================================

/**
 * Create a shareable URL with current filters
 */
export const createShareableUrl = (filters: FilterState, presetId?: string): string => {
  try {
    const params = new URLSearchParams();

    const encoded = encodeFilterState(filters);
    if (encoded) {
      params.set('filters', encoded);
    }

    if (presetId) {
      params.set('preset', presetId);
    }

    const search = params.toString();
    const baseUrl = `${window.location.origin}${window.location.pathname}`;

    return search ? `${baseUrl}?${search}` : baseUrl;
  } catch (error) {
    console.error('Failed to create shareable URL:', error);
    return window.location.href;
  }
};

/**
 * Copy shareable URL to clipboard
 */
export const copyShareableUrl = async (
  filters: FilterState,
  presetId?: string
): Promise<boolean> => {
  try {
    const url = createShareableUrl(filters, presetId);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Failed to copy URL to clipboard:', error);
    return false;
  }
};

// ============================================================================
// URL Compression (for very long filter states)
// ============================================================================

/**
 * Compress filter state using a simplified version
 * This is useful when the full state is too long for URLs
 */
export const compressFilterState = (filters: FilterState): string => {
  try {
    // Create a simplified version of the filter state
    const compressed: Record<string, unknown> = {};

    // Date range - only include what's needed
    if (filters.dateRange) {
      compressed.dr = {
        s: filters.dateRange.start?.toISOString(),
        e: filters.dateRange.end?.toISOString(),
        p: filters.dateRange.preset
      };
    }

    // Multi-select - use shorter keys
    if (filters.multiSelect) {
      compressed.ms = filters.multiSelect;
    }

    // Search - only query
    if (filters.search?.query) {
      compressed.q = filters.search.query;
    }

    // Custom filters
    if (filters.custom) {
      compressed.c = filters.custom;
    }

    return encodeFilterState(compressed as FilterState);
  } catch (error) {
    console.error('Failed to compress filter state:', error);
    return encodeFilterState(filters);
  }
};

/**
 * Decompress filter state from compressed format
 */
export const decompressFilterState = (compressed: string): FilterState | null => {
  try {
    const decoded = decodeFilterState(compressed);
    if (!decoded) return null;

    const decompressed: FilterState = {};

    // Date range
    if ((decoded as any).dr) {
      const dr = (decoded as any).dr;
      decompressed.dateRange = {
        start: dr.s ? new Date(dr.s) : null,
        end: dr.e ? new Date(dr.e) : null,
        preset: dr.p
      };
    }

    // Multi-select
    if ((decoded as any).ms) {
      decompressed.multiSelect = (decoded as any).ms;
    }

    // Search
    if ((decoded as any).q) {
      decompressed.search = {
        query: (decoded as any).q,
        fields: []
      };
    }

    // Custom
    if ((decoded as any).c) {
      decompressed.custom = (decoded as any).c;
    }

    return decompressed;
  } catch (error) {
    console.error('Failed to decompress filter state:', error);
    return decodeFilterState(compressed);
  }
};

// ============================================================================
// Export all utilities
// ============================================================================

export default {
  encodeFilterState,
  decodeFilterState,
  getFiltersFromUrl,
  getPresetFromUrl,
  updateUrlWithFilters,
  clearFiltersFromUrl,
  createNavigationListener,
  createShareableUrl,
  copyShareableUrl,
  compressFilterState,
  decompressFilterState
};
