/**
 * Mobile Input Component
 * Mobile-optimized input with automatic keyboard type detection and WCAG AAA compliance
 */

import React, { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getInputConfig, getMobileFieldHeight, validateField } from '@/utils/mobileFormHelpers';
import type { MobileInputConfig } from '@/types/mobile';

interface MobileInputProps extends Omit<React.ComponentProps<typeof Input>, 'type'> {
  /**
   * Field type - automatically configures mobile keyboard and validation
   */
  fieldType?:
    | 'name' | 'firstName' | 'lastName'
    | 'email' | 'tel' | 'mobile'
    | 'address' | 'city' | 'postalCode'
    | 'number' | 'amount' | 'price' | 'quantity'
    | 'date' | 'time'
    | 'search' | 'url' | 'website'
    | 'plateNumber' | 'nationalId' | 'iqamaId'
    | 'text';

  /**
   * Custom input configuration (overrides fieldType)
   */
  customConfig?: Partial<MobileInputConfig>;

  /**
   * Use large variant for primary fields (52px instead of 48px)
   */
  large?: boolean;

  /**
   * Show validation errors inline
   */
  showValidation?: boolean;

  /**
   * Validation error message
   */
  validationError?: string;
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  (
    {
      fieldType = 'text',
      customConfig,
      large = false,
      showValidation = false,
      validationError: externalError,
      className,
      onChange,
      value,
      ...props
    },
    ref
  ) => {
    // Get optimal input configuration
    const config = customConfig || getInputConfig(fieldType);

    // Internal validation state
    const [internalError, setInternalError] = React.useState<string | undefined>();

    // Handle input change with validation
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      // Perform validation if enabled
      if (showValidation && newValue) {
        const validation = validateField(newValue, fieldType);
        setInternalError(validation.valid ? undefined : validation.error);
      } else {
        setInternalError(undefined);
      }

      // Call parent onChange
      onChange?.(e);
    };

    const hasError = externalError || internalError;
    const minHeight = getMobileFieldHeight(large ? 'large' : 'default');

    return (
      <div className="mobile-input-wrapper w-full">
        <Input
          ref={ref}
          type={config.type}
          inputMode={config.inputMode}
          autoCapitalize={config.autoCapitalize}
          autoComplete={config.autoComplete}
          pattern={config.pattern}
          value={value}
          onChange={handleChange}
          className={cn(
            'mobile-input touch-optimized',
            `min-h-[${minHeight}]`,
            'text-base', // Prevent zoom on iOS
            hasError && 'border-destructive focus:border-destructive focus:ring-destructive/20',
            className
          )}
          style={{
            minHeight,
            fontSize: '16px', // Prevent iOS zoom
          }}
          {...props}
        />

        {/* Validation Error Message */}
        {showValidation && hasError && (
          <p className="text-xs text-destructive mt-1 px-1">
            {externalError || internalError}
          </p>
        )}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';
