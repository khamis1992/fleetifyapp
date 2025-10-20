/**
 * Filter Components Barrel Export
 * Phase 8 - Agent 1: Advanced Filters & Search
 *
 * Centralized exports for all filter components, hooks, and utilities
 */

// ============================================================================
// Components
// ============================================================================

export { DateRangePicker, DATE_RANGE_PRESETS } from './DateRangePicker';
export type { DateRangePickerProps } from './DateRangePicker';

export { MultiSelectFilter } from './MultiSelectFilter';
export type { MultiSelectFilterProps } from './MultiSelectFilter';

export { AdvancedSearch } from './AdvancedSearch';
export type { AdvancedSearchProps } from './AdvancedSearch';

export { FilterBar } from './FilterBar';
export type { FilterBarProps } from './FilterBar';

export { FilterPresets } from './FilterPresets';
export type { FilterPresetsProps } from './FilterPresets';

// ============================================================================
// Hooks
// ============================================================================

export { useFilterState } from '@/hooks/useFilterState';
export type { UseFilterStateOptions, UseFilterStateReturn } from '@/hooks/useFilterState';

// ============================================================================
// Types
// ============================================================================

export type {
  DateRange,
  DateRangePreset,
  DateRangeConfig,
  MultiSelectOption,
  MultiSelectFilterState,
  SearchState,
  SearchSuggestion,
  FilterState,
  FilterPreset,
  FilterPresetModule,
  FilterContextValue,
  FilterChangeType,
  FilterChangeEvent,
  FilterChangeHandler,
  FilterUrlParams,
  WidgetFilterProps,
  FilterOperator,
  FilterCondition,
  FilterGroup
} from '@/types/filter.types';

// ============================================================================
// Utilities
// ============================================================================

export {
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
} from '@/utils/filterUrlSync';

// ============================================================================
// Constants
// ============================================================================

export { FILTER_STORAGE_KEYS } from '@/types/filter.types';

// ============================================================================
// Type Guards
// ============================================================================

export { isDateRange, isFilterPreset, isValidFilterState } from '@/types/filter.types';
