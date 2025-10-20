/**
 * DateRangePicker Component
 * Phase 8 - Agent 1: Advanced Filters & Search
 *
 * A comprehensive date range picker with presets, RTL support, and Arabic localization
 */

import React, { useState, useMemo, useCallback } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ar } from 'date-fns/locale';
import {
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subQuarters,
  format
} from 'date-fns';
import { Calendar, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DateRange, DateRangePreset, DateRangeConfig } from '@/types/filter.types';
import 'react-datepicker/dist/react-datepicker.css';

// Register Arabic locale
registerLocale('ar', ar);

// ============================================================================
// Date Range Presets Configuration
// ============================================================================

const DATE_RANGE_PRESETS: DateRangeConfig[] = [
  {
    label: 'اليوم',
    value: 'today',
    getRange: () => ({
      start: startOfDay(new Date()),
      end: endOfDay(new Date())
    })
  },
  {
    label: 'أمس',
    value: 'yesterday',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday)
      };
    }
  },
  {
    label: 'آخر 7 أيام',
    value: 'last_7_days',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 6)),
      end: endOfDay(new Date())
    })
  },
  {
    label: 'آخر 30 يوم',
    value: 'last_30_days',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 29)),
      end: endOfDay(new Date())
    })
  },
  {
    label: 'هذا الشهر',
    value: 'this_month',
    getRange: () => ({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date())
    })
  },
  {
    label: 'الشهر الماضي',
    value: 'last_month',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth)
      };
    }
  },
  {
    label: 'هذا الربع',
    value: 'this_quarter',
    getRange: () => ({
      start: startOfQuarter(new Date()),
      end: endOfQuarter(new Date())
    })
  },
  {
    label: 'الربع الماضي',
    value: 'last_quarter',
    getRange: () => {
      const lastQuarter = subQuarters(new Date(), 1);
      return {
        start: startOfQuarter(lastQuarter),
        end: endOfQuarter(lastQuarter)
      };
    }
  },
  {
    label: 'هذه السنة',
    value: 'this_year',
    getRange: () => ({
      start: startOfYear(new Date()),
      end: endOfYear(new Date())
    })
  },
  {
    label: 'نطاق مخصص',
    value: 'custom',
    getRange: () => null
  }
];

// ============================================================================
// Component Props
// ============================================================================

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (dateRange: DateRange) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showPresets?: boolean;
  presets?: DateRangeConfig[];
  showClearButton?: boolean;
  formatString?: string;
  locale?: string;
  position?: 'left' | 'right';
}

// ============================================================================
// DateRangePicker Component
// ============================================================================

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  placeholder = 'اختر نطاق التاريخ',
  className,
  disabled = false,
  minDate,
  maxDate,
  showPresets = true,
  presets = DATE_RANGE_PRESETS,
  showClearButton = true,
  formatString = 'dd/MM/yyyy',
  locale = 'ar',
  position = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localDateRange, setLocalDateRange] = useState<DateRange>(
    value || { start: null, end: null }
  );
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset | undefined>(
    value?.preset
  );

  // ============================================================================
  // Handlers
  // ============================================================================

  const handlePresetClick = useCallback(
    (preset: DateRangeConfig) => {
      if (preset.value === 'custom') {
        setSelectedPreset('custom');
        setLocalDateRange({ start: null, end: null, preset: 'custom' });
        return;
      }

      const range = preset.getRange();
      if (range) {
        const newDateRange: DateRange = {
          start: range.start,
          end: range.end,
          preset: preset.value
        };
        setLocalDateRange(newDateRange);
        setSelectedPreset(preset.value);
        onChange?.(newDateRange);
        setIsOpen(false);
      }
    },
    [onChange]
  );

  const handleDateChange = useCallback(
    (dates: [Date | null, Date | null]) => {
      const [start, end] = dates;
      const newDateRange: DateRange = {
        start: start ? startOfDay(start) : null,
        end: end ? endOfDay(end) : null,
        preset: 'custom'
      };
      setLocalDateRange(newDateRange);
      setSelectedPreset('custom');

      // Only trigger onChange when both dates are selected
      if (start && end) {
        onChange?.(newDateRange);
        setIsOpen(false);
      }
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const clearedRange: DateRange = { start: null, end: null };
      setLocalDateRange(clearedRange);
      setSelectedPreset(undefined);
      onChange?.(clearedRange);
    },
    [onChange]
  );

  // ============================================================================
  // Computed Values
  // ============================================================================

  const displayValue = useMemo(() => {
    if (!localDateRange.start && !localDateRange.end) {
      return placeholder;
    }

    if (selectedPreset && selectedPreset !== 'custom') {
      const preset = presets.find((p) => p.value === selectedPreset);
      if (preset) return preset.label;
    }

    if (localDateRange.start && localDateRange.end) {
      return `${format(localDateRange.start, formatString, { locale: ar })} - ${format(
        localDateRange.end,
        formatString,
        { locale: ar }
      )}`;
    }

    if (localDateRange.start) {
      return `من ${format(localDateRange.start, formatString, { locale: ar })}`;
    }

    if (localDateRange.end) {
      return `إلى ${format(localDateRange.end, formatString, { locale: ar })}`;
    }

    return placeholder;
  }, [localDateRange, selectedPreset, presets, placeholder, formatString]);

  const hasValue = localDateRange.start !== null || localDateRange.end !== null;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-between text-right font-normal',
            !hasValue && 'text-muted-foreground',
            disabled && 'cursor-not-allowed opacity-50',
            className
          )}
          disabled={disabled}
        >
          <span className="flex items-center gap-2 flex-1 truncate">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{displayValue}</span>
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {showClearButton && hasValue && !disabled && (
              <X
                className="h-4 w-4 hover:text-destructive transition-colors"
                onClick={handleClear}
              />
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'w-auto p-0',
          position === 'right' ? 'mr-0' : 'ml-0'
        )}
        align={position === 'right' ? 'end' : 'start'}
        sideOffset={4}
      >
        <div className="flex flex-col md:flex-row" dir="rtl">
          {/* Presets Sidebar */}
          {showPresets && (
            <div className="border-b md:border-b-0 md:border-l border-border p-3 bg-muted/30">
              <div className="space-y-1 min-w-[140px]">
                {presets.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={selectedPreset === preset.value ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start text-right"
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Calendar */}
          <div className="p-3">
            <DatePicker
              selected={localDateRange.start}
              onChange={handleDateChange}
              startDate={localDateRange.start}
              endDate={localDateRange.end}
              selectsRange
              inline
              locale={locale}
              minDate={minDate}
              maxDate={maxDate}
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              calendarClassName="border-0"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ============================================================================
// Export presets for external use
// ============================================================================

export { DATE_RANGE_PRESETS };
export type { DateRangeConfig };
