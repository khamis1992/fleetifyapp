/**
 * React Hook for Taqadi Browser Automation
 * Manages the automation flow from the UI
 *
 * Usage:
 * ```tsx
 * const { automation, startAutomation, cancelAutomation } = useTaqadiAutomation({
 *   contractId,
 *   companyId,
 * });
 * ```
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { taqadiService } from '@/services/taqadi';
import type { TaqadiSubmissionData, ValidationResult } from '@/services/taqadi';

// ==========================================
// Hook State
// ==========================================

export type AutomationStatus =
  | 'idle'           // No automation running
  | 'preparing'      // Extracting and validating data
  | 'ready'          // Data ready, waiting for user action
  | 'connecting'     // Connecting to Taqadi
  | 'logging_in'     // Waiting for manual login
  | 'filling'        // Filling form fields
  | 'uploading'      // Uploading documents
  | 'reviewing'      // Ready for user review
  | 'submitting'     // Submitting the form
  | 'completed'      // Successfully completed
  | 'failed'         // Failed with error
  | 'cancelled';     // Cancelled by user

export interface AutomationStepProgress {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  progress: number; // 0-100
}

export interface AutomationState {
  status: AutomationStatus;
  progress: number; // 0-100 overall
  currentStep: number;
  totalSteps: number;
  steps: AutomationStepProgress[];
  data?: TaqadiSubmissionData;
  validation?: ValidationResult;
  error?: string;
  caseReference?: string;
  startedAt?: string;
  completedAt?: string;
  sessionUrl?: string; // Taqadi session URL for user
}

export interface UseTaqadiAutomationOptions {
  contractId: string;
  companyId: string;
  onStatusChange?: (status: AutomationStatus) => void;
  onProgress?: (progress: number) => void;
  onComplete?: (result: AutomationResult) => void;
  onError?: (error: string) => void;
}

export interface AutomationResult {
  success: boolean;
  caseReference?: string;
  screenshot?: string;
  video?: string;
}

// ==========================================
// Hook Implementation
// ==========================================

export function useTaqadiAutomation(options: UseTaqadiAutomationOptions) {
  const {
    contractId,
    companyId,
    onStatusChange,
    onProgress,
    onComplete,
    onError,
  } = options;

  // State
  const [state, setState] = useState<AutomationState>({
    status: 'idle',
    progress: 0,
    currentStep: 0,
    totalSteps: 7, // Total steps in automation
    steps: [
      { name: 'جاري استخراج البيانات...', status: 'pending', progress: 0 },
      { name: 'جاري التحقق من صحة البيانات...', status: 'pending', progress: 0 },
      { name: 'الاتصال بنظام تقاضي...', status: 'pending', progress: 0 },
      { name: 'تسجيل الدخول...', status: 'pending', progress: 0 },
      { name: 'ملء النموذج...', status: 'pending', progress: 0 },
      { name: 'رفع المستندات...', status: 'pending', progress: 0 },
      { name: 'المراجعة والتقديم...', status: 'pending', progress: 0 },
    ],
  });

  // Refs for cleanup
  const automationRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<AutomationState>) => {
    if (!isMountedRef.current) return;

    setState(prev => {
      const newState = { ...prev, ...updates };

      // Trigger callbacks
      if (updates.status && onStatusChange) {
        onStatusChange(newState.status);
      }
      if (updates.progress !== undefined && onProgress) {
        onProgress(newState.progress);
      }

      return newState;
    });
  }, [onStatusChange, onProgress]);

  /**
   * Update a specific step
   */
  const updateStep = useCallback((stepIndex: number, updates: Partial<AutomationStepProgress>) => {
    if (!isMountedRef.current) return;

    setState(prev => {
      const newSteps = [...prev.steps];
      newSteps[stepIndex] = { ...newSteps[stepIndex], ...updates };

      // Calculate overall progress
      const completedSteps = newSteps.filter(s => s.status === 'completed').length;
      const currentStepProgress = newSteps[stepIndex].progress || 0;
      const progress = Math.round(
        ((completedSteps * 100) + currentStepProgress) / newSteps.length
      );

      return {
        ...prev,
        steps: newSteps,
        progress,
        currentStep: stepIndex,
      };
    });
  }, []);

  /**
   * Start the automation process
   */
  const startAutomation = useCallback(async () => {
    try {
      // Reset state
      updateState({
        status: 'preparing',
        progress: 0,
        currentStep: 0,
        error: undefined,
        caseReference: undefined,
        startedAt: new Date().toISOString(),
      });

      // Step 1: Extract data
      updateStep(0, { status: 'running', progress: 10, startedAt: new Date().toISOString() });

      const prepareResult = await taqadiService.prepareForSubmission(
        contractId,
        companyId
      );

      if (!prepareResult.success || !prepareResult.data) {
        throw new Error(prepareResult.error || 'فشل استخراج البيانات');
      }

      updateStep(0, { status: 'completed', progress: 100, completedAt: new Date().toISOString() });
      updateStep(1, { status: 'running', progress: 10, startedAt: new Date().toISOString() });

      // Update state with data
      updateState({
        data: prepareResult.data,
        validation: prepareResult.validation,
      });

      // Step 2: Validate
      updateStep(1, { progress: 50 });

      if (!prepareResult.validation?.canSubmit) {
        // Data has critical errors
        updateStep(1, { status: 'failed', progress: 0, error: 'بيانات ناقصة' });
        updateState({
          status: 'failed',
          error: 'البيانات غير مكتملة. يرجى مراجعة الحقول المطلوبة.',
        });

        if (onError) {
          onError('بيانات ناقصة');
        }

        toast.error('البيانات غير مكتملة', {
          description: 'يرجى مراجعة الحقول المطلوبة',
        });

        return;
      }

      updateStep(1, { status: 'completed', progress: 100, completedAt: new Date().toISOString() });

      // Step 3-7: Browser automation
      // For now, we'll use the bookmarklet approach since browser automation
      // requires a server-side component

      updateState({ status: 'ready', progress: 30 });

      // Prepare data for bookmarklet
      const automationData = taqadiService.exportForAutomation(prepareResult.data);

      // Save to localStorage for bookmarklet
      localStorage.setItem('taqadiAutomationData', JSON.stringify(automationData));
      localStorage.setItem('taqadiAutomationTimestamp', Date.now().toString());

      // Open Taqadi in new tab
      const taqadiUrl = 'https://taqadi.sjc.gov.qa/itc/login';
      window.open(taqadiUrl, '_blank');

      updateState({
        status: 'reviewing',
        progress: 50,
        sessionUrl: taqadiUrl,
      });

      updateStep(2, { status: 'completed', progress: 100, completedAt: new Date().toISOString() });
      updateStep(3, { status: 'completed', progress: 100, completedAt: new Date().toISOString() });

      toast.info('تم فتح نظام تقاضي', {
        description: 'بعد تسجيل الدخول، استخدم Bookmarklet لملء النموذج تلقائياً',
        duration: 10000,
      });

    } catch (error: any) {
      console.error('Automation error:', error);

      updateState({
        status: 'failed',
        error: error.message || 'فشلت الأتمتة',
      });

      if (onError) {
        onError(error.message);
      }

      toast.error('فشلت الأتمتة', {
        description: error.message,
      });
    }
  }, [contractId, companyId, updateState, updateStep, onError]);

  /**
   * Cancel the automation
   */
  const cancelAutomation = useCallback(() => {
    if (state.status === 'idle' || state.status === 'completed' || state.status === 'failed') {
      return;
    }

    updateState({
      status: 'cancelled',
      progress: state.progress,
      completedAt: new Date().toISOString(),
    });

    toast.info('تم إلغاء الأتمتة');

    // Clean up any running automation
    if (automationRef.current) {
      try {
        automationRef.current.close();
        automationRef.current = null;
      } catch (e) {
        console.error('Error closing automation:', e);
      }
    }

    // Clear localStorage
    localStorage.removeItem('taqadiAutomationData');
    localStorage.removeItem('taqadiAutomationTimestamp');
  }, [state.status, state.progress, updateState]);

  /**
   * Retry the automation
   */
  const retryAutomation = useCallback(() => {
    // Reset and start over
    updateState({
      status: 'idle',
      progress: 0,
      currentStep: 0,
      error: undefined,
      caseReference: undefined,
      startedAt: undefined,
      completedAt: undefined,
      sessionUrl: undefined,
    });

    startAutomation();
  }, [updateState, startAutomation]);

  /**
   * Download data file for manual processing
   */
  const downloadDataFile = useCallback(() => {
    if (!state.data) {
      toast.error('لا توجد بيانات للتحميل');
      return;
    }

    const automationData = taqadiService.exportForAutomation(state.data);
    const blob = new Blob([JSON.stringify(automationData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taqadi-data-${contractId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('تم تحميل ملف البيانات');
  }, [state.data, contractId]);

  /**
   * Get validation summary
   */
  const getValidationSummary = useCallback(() => {
    if (!state.validation) {
      return null;
    }

    const summary = {
      title: '',
      description: '',
      color: '',
      icon: '',
    };

    if (!state.validation.canSubmit) {
      return {
        title: 'بيانات ناقصة',
        description: 'يرجى إكمال جميع الحقول المطلوبة',
        color: 'red',
        icon: '⚠️',
      };
    }

    if (state.validation.score < 80) {
      return {
        title: 'بيانات غير مكتملة',
        description: 'يمكنك المتابعة، ولكن يُنصح بإكمال المزيد',
        color: 'amber',
        icon: '⚡',
      };
    }

    if (state.validation.warnings.length > 0) {
      return {
        title: 'بيانات جاهزة',
        description: 'البيانات جاهزة مع بعض الملاحظات',
        color: 'green',
        icon: '✓',
      };
    }

    return {
      title: 'بيانات كاملة',
      description: 'جميع البيانات مكتملة',
      color: 'green',
      icon: '✓✓',
    };
  }, [state.validation]);

  /**
   * Cleanup on unmount
   */
  // No useEffect needed for cleanup since we're using refs

  return {
    // State
    state,

    // Computed
    isIdle: state.status === 'idle',
    isPreparing: state.status === 'preparing',
    isReady: state.status === 'ready',
    isRunning: state.status === 'preparing' || state.status === 'connecting' ||
               state.status === 'filling' || state.status === 'uploading',
    isCompleted: state.status === 'completed',
    isFailed: state.status === 'failed',
    isCancelled: state.status === 'cancelled',
    canCancel: state.status === 'preparing' || state.status === 'connecting',
    canRetry: state.status === 'failed' || state.status === 'cancelled',

    // Actions
    startAutomation,
    cancelAutomation,
    retryAutomation,
    downloadDataFile,

    // Helpers
    getValidationSummary,
  };
}

export default useTaqadiAutomation;
