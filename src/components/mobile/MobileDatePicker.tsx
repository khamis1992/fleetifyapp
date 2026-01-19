/**
 * Mobile Date Picker Component
 * Uses native date picker on mobile, falls back to custom picker on desktop
 */

import React, { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { shouldUseNativeDatePicker, getMobileFieldHeight } from '@/utils/mobileFormHelpers';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface MobileDatePickerProps {
  /**
   * Selected date value
   */
  value?: Date | string;

  /**
   * On date change callback
   */
  onChange?: (date: Date | undefined) => void;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Minimum date
   */
  minDate?: Date;

  /**
   * Maximum date
   */
  maxDate?: Date;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Use large variant (52px instead of 48px)
   */
  large?: boolean;

  /**
   * Additional class names
   */
  className?: string;

  /**
   * Field name for form
   */
  name?: string;
}

export const MobileDatePicker = forwardRef<HTMLDivElement, MobileDatePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = 'اختر التاريخ',
      minDate,
      maxDate,
      disabled = false,
      large = false,
      className,
      name,
    },
    ref
  ) => {
    const useNative = shouldUseNativeDatePicker();
    const minHeight = getMobileFieldHeight(large ? 'large' : 'default');

    // Convert value to Date object
    const dateValue = value instanceof Date ? value : value ? new Date(value) : undefined;

    // Format date for display
    const formattedDate = dateValue ? format(dateValue, 'PPP', { locale: ar }) : '';

    // Format date for native input (YYYY-MM-DD)
    const nativeValue = dateValue ? format(dateValue, 'yyyy-MM-dd') : '';

    // Handle native input change
    const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value ? new Date(e.target.value) : undefined;
      onChange?.(newDate);
    };

    // Handle calendar select
    const handleCalendarSelect = (date: Date | undefined) => {
      onChange?.(date);
    };

    // Native date picker for mobile
    if (useNative) {
      return (
        <div ref={ref} className={cn('mobile-date-picker-wrapper w-full', className)}>
          <Input
            type="date"
            name={name}
            value={nativeValue}
            onChange={handleNativeChange}
            min={minDate ? format(minDate, 'yyyy-MM-dd') : undefined}
            max={maxDate ? format(maxDate, 'yyyy-MM-dd') : undefined}
            disabled={disabled}
            className={cn(
              'mobile-date-picker touch-optimized',
              `min-h-[${minHeight}]`,
              'text-base'
            )}
            style={{
              minHeight,
              fontSize: '16px', // Prevent iOS zoom
            }}
          />
        </div>
      );
    }

    // Custom calendar picker for desktop
    return (
      <div ref={ref} className={cn('mobile-date-picker-wrapper w-full', className)}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                'w-full justify-start text-right font-normal',
                `min-h-[${minHeight}]`,
                !dateValue && 'text-muted-foreground'
              )}
              style={{
                minHeight,
              }}
            >
              <CalendarIcon className="ml-2 h-4 w-4" />
              {dateValue ? formattedDate : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={handleCalendarSelect}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              initialFocus
              locale={ar}
            />
          </PopoverContent>
        </Popover>

        {/* Hidden input for form submission */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={nativeValue}
          />
        )}
      </div>
    );
  }
);

MobileDatePicker.displayName = 'MobileDatePicker';
