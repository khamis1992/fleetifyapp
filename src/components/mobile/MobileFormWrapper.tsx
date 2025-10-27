/**
 * Mobile Form Wrapper Component
 * Provides mobile-optimized form layout with auto-save and progress tracking
 */

import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  shouldUseSinglePageLayout,
  autoSaveForm,
  restoreFormDraft,
  clearFormDraft
} from '@/utils/mobileFormHelpers';
import type { MobileFormConfig } from '@/types/mobile';

interface MobileFormWrapperProps {
  children: React.ReactNode;
  formId: string;
  title?: string;
  description?: string;
  onDataChange?: (data: Record<string, any>) => void;
  config?: MobileFormConfig;
  className?: string;
  totalSteps?: number;
  currentStep?: number;
}

export const MobileFormWrapper: React.FC<MobileFormWrapperProps> = ({
  children,
  formId,
  title,
  description,
  onDataChange,
  config = {
    singlePage: true,
    autoSave: true,
    autoSaveInterval: 3000,
    showProgress: true,
    hapticFeedback: false,
  },
  className,
  totalSteps,
  currentStep,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [hasDraft, setHasDraft] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(shouldUseSinglePageLayout());
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Restore draft on mount
  useEffect(() => {
    const draft = restoreFormDraft(formId);
    if (draft) {
      setFormData(draft);
      setHasDraft(true);
      onDataChange?.(draft);
    }
  }, [formId]);

  // Auto-save functionality
  const performAutoSave = useCallback(() => {
    if (!config.autoSave || Object.keys(formData).length === 0) return;

    try {
      setAutoSaveStatus('saving');
      autoSaveForm(formId, formData);
      setLastSaved(new Date());
      setAutoSaveStatus('saved');

      // Reset to idle after 2 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('error');
    }
  }, [formData, formId, config.autoSave]);

  // Auto-save interval
  useEffect(() => {
    if (!config.autoSave) return;

    const interval = setInterval(() => {
      performAutoSave();
    }, config.autoSaveInterval || 3000);

    return () => clearInterval(interval);
  }, [config.autoSave, config.autoSaveInterval, performAutoSave]);

  // Clear draft on successful submission (external control)
  const clearDraft = useCallback(() => {
    clearFormDraft(formId);
    setHasDraft(false);
    setFormData({});
  }, [formId]);

  // Calculate progress percentage
  const progressPercentage = totalSteps && currentStep
    ? (currentStep / totalSteps) * 100
    : 0;

  // Single-page layout for mobile
  const useSinglePage = config.singlePage !== false && isMobile;

  return (
    <div className={cn(
      'mobile-form-wrapper',
      useSinglePage && 'single-page-layout',
      className
    )}>
      {/* Form Header */}
      {(title || description) && (
        <CardHeader className="space-y-2">
          {title && (
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl md:text-2xl">{title}</CardTitle>
              {config.autoSave && autoSaveStatus !== 'idle' && (
                <Badge
                  variant={autoSaveStatus === 'saved' ? 'success' : autoSaveStatus === 'error' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {autoSaveStatus === 'saving' && (
                    <>
                      <Save className="h-3 w-3 ml-1 animate-pulse" />
                      جاري الحفظ...
                    </>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <>
                      <CheckCircle2 className="h-3 w-3 ml-1" />
                      تم الحفظ
                    </>
                  )}
                  {autoSaveStatus === 'error' && (
                    <>
                      <AlertCircle className="h-3 w-3 ml-1" />
                      فشل الحفظ
                    </>
                  )}
                </Badge>
              )}
            </div>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
      )}

      {/* Progress Indicator */}
      {config.showProgress && totalSteps && currentStep && (
        <div className="px-6 pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                الخطوة {currentStep} من {totalSteps}
              </span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      )}

      {/* Draft Restored Alert */}
      {hasDraft && (
        <div className="px-6 pb-4">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              تم استعادة المسودة المحفوظة. يمكنك المتابعة من حيث توقفت.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Form Content */}
      <CardContent className={cn(
        'space-y-6',
        useSinglePage && 'pb-20' // Extra padding for mobile bottom nav
      )}>
        {children}
      </CardContent>

      {/* Last Saved Timestamp */}
      {config.autoSave && lastSaved && (
        <div className="px-6 pb-4 text-xs text-muted-foreground text-center">
          آخر حفظ: {lastSaved.toLocaleTimeString('ar-SA')}
        </div>
      )}
    </div>
  );
};

// Export clear draft function for external use
export { clearFormDraft };
