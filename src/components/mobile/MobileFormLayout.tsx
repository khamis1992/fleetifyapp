/**
 * Mobile Form Layout Component
 * Optimized form layout for mobile devices with:
 * - Full-width inputs
 * - Large touch targets (44px minimum)
 * - Sticky action buttons
 * - Step navigation for multi-step forms
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface MobileFormLayoutProps {
  /** Form title */
  title: string;
  /** Form description */
  description?: string;
  /** Form content */
  children: React.ReactNode;
  /** Current step (for multi-step forms) */
  currentStep?: number;
  /** Total steps */
  totalSteps?: number;
  /** Step labels */
  stepLabels?: string[];
  /** Is form submitting */
  isSubmitting?: boolean;
  /** Submit button text */
  submitText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** On submit handler */
  onSubmit?: () => void;
  /** On cancel handler */
  onCancel?: () => void;
  /** On next step handler */
  onNext?: () => void;
  /** On previous step handler */
  onPrevious?: () => void;
  /** Disable next/submit button */
  disableNext?: boolean;
  /** Show sticky footer */
  stickyFooter?: boolean;
  /** Custom footer content */
  customFooter?: React.ReactNode;
  /** Hide progress indicator */
  hideProgress?: boolean;
}

// Step indicator component
const StepIndicator: React.FC<{
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}> = ({ currentStep, totalSteps, stepLabels }) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-900">
          {stepLabels?.[currentStep] || `الخطوة ${currentStep + 1}`}
        </span>
        <span className="text-neutral-500">
          {currentStep + 1} من {totalSteps}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
};

// Mobile input wrapper with proper sizing
export const MobileInputWrapper: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn(
    'space-y-1.5',
    // Ensure inputs have proper touch target size
    '[&_input]:min-h-[44px] [&_input]:text-base',
    '[&_select]:min-h-[44px] [&_select]:text-base',
    '[&_textarea]:min-h-[88px] [&_textarea]:text-base',
    '[&_button]:min-h-[44px]',
    className
  )}>
    {children}
  </div>
);

// Main component
export const MobileFormLayout: React.FC<MobileFormLayoutProps> = ({
  title,
  description,
  children,
  currentStep,
  totalSteps,
  stepLabels,
  isSubmitting = false,
  submitText = 'حفظ',
  cancelText = 'إلغاء',
  onSubmit,
  onCancel,
  onNext,
  onPrevious,
  disableNext = false,
  stickyFooter = true,
  customFooter,
  hideProgress = false,
}) => {
  const isMultiStep = totalSteps !== undefined && totalSteps > 1;
  const isLastStep = isMultiStep && currentStep === totalSteps - 1;
  const isFirstStep = !isMultiStep || currentStep === 0;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-neutral-900">{title}</h1>
            {onCancel && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
          {description && (
            <p className="text-sm text-neutral-500">{description}</p>
          )}
        </div>

        {/* Step Progress */}
        {isMultiStep && !hideProgress && (
          <div className="px-4 pb-3">
            <StepIndicator
              currentStep={currentStep!}
              totalSteps={totalSteps}
              stepLabels={stepLabels}
            />
          </div>
        )}
      </div>

      {/* Form Content */}
      <div className={cn(
        'flex-1 p-4',
        stickyFooter && 'pb-24' // Add padding for sticky footer
      )}>
        <MobileInputWrapper>
          {children}
        </MobileInputWrapper>
      </div>

      {/* Footer Actions */}
      <div
        className={cn(
          'bg-white border-t border-neutral-200 p-4',
          stickyFooter && 'fixed bottom-0 left-0 right-0 z-10'
        )}
      >
        {customFooter || (
          <div className="flex gap-3">
            {/* Back/Cancel Button */}
            {!isFirstStep ? (
              <Button
                variant="outline"
                onClick={onPrevious}
                disabled={isSubmitting}
                className="flex-1 h-12"
              >
                <ChevronRight className="h-5 w-5 ml-2" />
                السابق
              </Button>
            ) : onCancel ? (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1 h-12"
              >
                {cancelText}
              </Button>
            ) : null}

            {/* Next/Submit Button */}
            {isMultiStep && !isLastStep ? (
              <Button
                onClick={onNext}
                disabled={disableNext || isSubmitting}
                className="flex-1 h-12 bg-coral-500 hover:bg-coral-600"
              >
                التالي
                <ChevronLeft className="h-5 w-5 mr-2" />
              </Button>
            ) : (
              <Button
                onClick={onSubmit}
                disabled={disableNext || isSubmitting}
                className="flex-1 h-12 bg-coral-500 hover:bg-coral-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 ml-2" />
                    {submitText}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Mobile form section component
export const MobileFormSection: React.FC<{
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, description, children, className }) => (
  <Card className={cn('mb-4', className)}>
    {(title || description) && (
      <CardHeader className="pb-2">
        {title && <CardTitle className="text-base">{title}</CardTitle>}
        {description && (
          <p className="text-sm text-neutral-500">{description}</p>
        )}
      </CardHeader>
    )}
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
);

export default MobileFormLayout;

