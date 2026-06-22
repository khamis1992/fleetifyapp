/**
 * Filter Types and Interfaces
 * Phase 8 - Agent 1: Advanced Filters & Search
 *
 * Defines all filter-related types for the dashboard widgets
 */

import { z } from 'zod';

// ============================================================================
// Date Range Filter Types
// ============================================================================

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'custom';

export interface DateRange {
  start: Date | null;
  end: Date | null;
  preset?: DateRangePreset;
}

export interface DateRangeConfig {
  label: string;
  value: DateRangePreset;
  getRange: () => { start: Date; end: Date } | null;
}

// Zod schema for date range validation
export const dateRangeSchema = z.object({
  start: z.date().nullable(),
  end: z.date().nullable(),
  preset: z.enum([
    'today',
    'yesterday',
    'last_7_days',
    'last_30_days',
    'this_month',
    'last_month',
    'this_quarter',
    'last_quarter',
    'this_year',
    'custom'
  ]).optional()
});

// ============================================================================
// Multi-Select Filter Types
// ============================================================================

export interface MultiSelectOption {
  value: string;
  label: string;
  count?: number; // Optional count for display
  icon?: React.ComponentType<{ className?: string }>; // Optional icon
  disabled?: boolean;
}

export interface MultiSelectFilterState {
  [filterKey: string]: string[];
}

// Zod schema for multi-select validation
export const multiSelectSchema = z.record(z.array(z.string()));

// ============================================================================
// Search Filter Types
// ============================================================================

export interface SearchState {
  query: string;
  fields: string[]; // Fields to search in
  recentSearches?: string[];
}

export interface SearchSuggestion {
  value: string;
  label: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

// Zod schema for search validation
export const searchSchema = z.object({
  query: z.string(),
  fields: z.array(z.string()),
  recentSearches: z.array(z.string()).optional()
});

// ============================================================================
// Combined Filter State
// ============================================================================

export interface FilterState {
  dateRange?: DateRange;
  multiSelect?: MultiSelectFilterState;
  search?: SearchState;
  presetId?: string;
  custom?: Record<string, unknown>; // For widget-specific filters
}

// Zod schema for complete filter state
export const filterStateSchema = z.object({
  dateRange: dateRangeSchema.optional(),
  multiSelect: multiSelectSchema.optional(),
  search: searchSchema.optional(),
  presetId: z.string().optional(),
  custom: z.record(z.unknown()).optional()
});

// ============================================================================
// Filter Presets
// ============================================================================

export type FilterPresetModule = 'car_rental' | 'real_estate' | 'retail' | 'general';

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: FilterState;
  module: FilterPresetModule;
  widgetId?: string; // Optional: specific widget this preset is for
  createdAt: Date;
  updatedAt?: Date;
  isDefault?: boolean;
  isShared?: boolean; // For future: shared presets
  tags?: string[];
}

// Zod schema for filter preset
export const filterPresetSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  filters: filterStateSchema,
  module: z.enum(['car_rental', 'real_estate', 'retail', 'general']),
  widgetId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  isDefault: z.boolean().optional(),
  isShared: z.boolean().optional(),
  tags: z.array(z.string()).optional()
});

// ============================================================================
// Filter Context Types
// ============================================================================

export interface FilterContextValue {
  filters: FilterState;
  setFilters: (filters: FilterState | ((prev: FilterState) => FilterState)) => void;
  resetFilters: () => void;
  applyPreset: (preset: FilterPreset) => void;
  activeFilterCount: number;
  isFiltering: boolean;
}

// ============================================================================
// Filter Change Event Types
// ============================================================================

export type FilterChangeType = 'dateRange' | 'multiSelect' | 'search' | 'preset' | 'custom' | 'reset';

export interface FilterChangeEvent {
  type: FilterChangeType;
  filters: FilterState;
  previousFilters: FilterState;
  changedKeys: string[];
}

export type FilterChangeHandler = (event: FilterChangeEvent) => void;

// ============================================================================
// URL Sync Types
// ============================================================================

export interface FilterUrlParams {
  filters?: string; // Base64 encoded FilterState JSON
  preset?: string; // Preset ID
}

// ============================================================================
// Widget Filter Props (for integration)
// ============================================================================

export interface WidgetFilterProps {
  filters?: FilterState;
  onFiltersChange?: FilterChangeHandler;
  enableFilters?: boolean;
  availableFilters?: {
    dateRange?: boolean;
    multiSelect?: Array<{
      key: string;
      label: string;
      options: MultiSelectOption[];
    }>;
    search?: {
      fields: string[];
      placeholder?: string;
    };
  };
  defaultFilters?: FilterState;
  showFilterBar?: boolean;
  presetModule?: FilterPresetModule;
}

// ============================================================================
// Filter Helper Types
// ============================================================================

export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'between' | 'greaterThan' | 'lessThan';

export interface FilterCondition<T = unknown> {
  field: string;
  operator: FilterOperator;
  value: T;
}

export interface FilterGroup {
  conditions: FilterCondition[];
  operator: 'AND' | 'OR';
}

// ============================================================================
// Type Guards
// ============================================================================

export function isDateRange(value: unknown): value is DateRange {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('start' in value || 'end' in value)
  );
}

export function isFilterPreset(value: unknown): value is FilterPreset {
  try {
    filterPresetSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function isValidFilterState(value: unknown): value is FilterState {
  try {
    filterStateSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Filter Storage Keys
// ============================================================================

export const FILTER_STORAGE_KEYS = {
  PRESETS: 'fleetify_filter_presets',
  RECENT_SEARCHES: 'fleetify_recent_searches',
  LAST_APPLIED: 'fleetify_last_applied_filters',
  USER_PREFERENCES: 'fleetify_filter_preferences'
} as const;

// ============================================================================
// Export all types
// ============================================================================

export type {
  // Re-export for convenience
  FilterState as Filters,
  FilterPreset as Preset,
  DateRange as DateRangeFilter,
  MultiSelectOption as SelectOption
};
