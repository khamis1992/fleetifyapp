import React, { useEffect, useState } from 'react';
import { useFormDraft } from '@/hooks/useFormDraft';
import { DraftStatusIndicator } from './DraftStatusIndicator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface AutoSaveFormWrapperProps<T> {
  /** Unique form identifier */
  formId: string;
  /** Current form values */
  formValues: T;
  /** Callback to restore form values */
  onRestoreValues: (values: T) => void;
  /** Callback when draft is cleared */
  onDraftCleared?: () => void;
  /** Children (form content) */
  children: React.ReactNode;
  /** Auto-save interval in ms (default: 30000) */
  autoSaveInterval?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Show draft indicator (default: true) */
  showIndicator?: boolean;
  /** Position of draft indicator */
  indicatorPosition?: 'top' | 'bottom';
  /** Optional className for indicator container */
  indicatorClassName?: string;
}

/**
 * AutoSaveFormWrapper - Wrapper component that adds auto-save to any form
 *
 * Features:
 * - Automatically saves form data every 30 seconds
 * - Shows visual save status
 * - Prompts to restore draft on mount if exists
 * - Handles draft clearing on unmount
 * - Works with any form structure
 *
 * Usage:
 * ```tsx
 * const [formData, setFormData] = useState(initialData);
 *
 * <AutoSaveFormWrapper
 *   formId="customer-form-123"
 *   formValues={formData}
 *   onRestoreValues={(values) => setFormData(values)}
 * >
 *   <form>
 *     <input
 *       value={formData.name}
 *       onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 *     />
 *     <button type="submit">Save</button>
 *   </form>
 * </AutoSaveFormWrapper>
 * ```
 *
 * Integration with react-hook-form:
 * ```tsx
 * const { watch, reset } = useForm();
 * const formValues = watch();
 *
 * <AutoSaveFormWrapper
 *   formId="customer-form"
 *   formValues={formValues}
 *   onRestoreValues={(values) => reset(values)}
 * >
 *   <form>...</form>
 * </AutoSaveFormWrapper>
 * ```
 *
 * Part of K1 Fix #009 - Auto-save wrapper component
 */
export function AutoSaveFormWrapper<T = any>({
  formId,
  formValues,
  onRestoreValues,
  onDraftCleared,
  children,
  autoSaveInterval = 30000,
  enabled = true,
  showIndicator = true,
  indicatorPosition = 'top',
  indicatorClassName = '',
}: AutoSaveFormWrapperProps<T>) {
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<T | null>(null);

  const {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    draftTimestamp,
    saveStatus,
    draftDataRef,
  } = useFormDraft<T>({
    formId,
    autoSaveInterval,
    enabled,
    onDraftLoaded: (data) => {
      // Store the draft but don't restore immediately
      // Show dialog first
      setPendingDraft(data);
      setShowRestoreDialog(true);
    },
    onDraftCleared,
  });

  // Auto-save on form values change
  useEffect(() => {
    if (enabled && formValues) {
      // Update ref for auto-save timer
      draftDataRef.current = formValues;

      // Debounced manual save (only if user is actively typing)
      const debounceTimer = setTimeout(() => {
        saveDraft(formValues);
      }, 1000);

      return () => clearTimeout(debounceTimer);
    }
  }, [formValues, enabled, saveDraft, draftDataRef]);

  // Check for existing draft on mount
  useEffect(() => {
    if (enabled) {
      loadDraft();
    }
  }, [enabled, loadDraft]);

  const handleRestoreDraft = () => {
    if (pendingDraft) {
      onRestoreValues(pendingDraft);
      setShowRestoreDialog(false);
      toast.success('تم استعادة المسودة', {
        description: 'تم تحميل البيانات المحفوظة مسبقاً',
      });
    }
  };

  const handleDiscardDraft = () => {
    clearDraft(false);
    setShowRestoreDialog(false);
    setPendingDraft(null);
    toast.info('تم تجاهل المسودة', {
      description: 'ستبدأ بنموذج جديد',
    });
  };

  const handleManualRestore = () => {
    const draft = loadDraft();
    if (draft) {
      onRestoreValues(draft);
      toast.success('تم استعادة المسودة');
    }
  };

  const handleDeleteDraft = (showToast = false) => {
    clearDraft(showToast);
  };

  return (
    <>
      {/* Draft Status Indicator - Top Position */}
      {showIndicator && indicatorPosition === 'top' && (
        <div className={`mb-4 flex justify-end ${indicatorClassName}`}>
          <DraftStatusIndicator
            saveStatus={saveStatus}
            hasDraft={hasDraft}
            draftTimestamp={draftTimestamp}
            onRestoreDraft={handleManualRestore}
            onDeleteDraft={handleDeleteDraft}
            showRestoreButton={!showRestoreDialog}
          />
        </div>
      )}

      {/* Form Content */}
      {children}

      {/* Draft Status Indicator - Bottom Position */}
      {showIndicator && indicatorPosition === 'bottom' && (
        <div className={`mt-4 flex justify-end ${indicatorClassName}`}>
          <DraftStatusIndicator
            saveStatus={saveStatus}
            hasDraft={hasDraft}
            draftTimestamp={draftTimestamp}
            onRestoreDraft={handleManualRestore}
            onDeleteDraft={handleDeleteDraft}
            showRestoreButton={!showRestoreDialog}
          />
        </div>
      )}

      {/* Restore Draft Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>استعادة المسودة؟</AlertDialogTitle>
            <AlertDialogDescription>
              تم العثور على مسودة محفوظة مسبقاً لهذا النموذج.
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">آخر حفظ:</span>
                  <span className="font-medium">
                    {draftTimestamp?.toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-sm">
                هل تريد استعادة البيانات المحفوظة أم البدء بنموذج جديد؟
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardDraft}>
              بدء جديد
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreDraft}>
              استعادة المسودة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Hook-only version for custom integrations
 * Use this when you need more control over the UI
 */
export function useAutoSave<T>(
  formId: string,
  formValues: T,
  options?: {
    autoSaveInterval?: number;
    enabled?: boolean;
    onSave?: () => void;
    onRestore?: (values: T) => void;
  }
) {
  const {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    draftTimestamp,
    saveStatus,
  } = useFormDraft<T>({
    formId,
    autoSaveInterval: options?.autoSaveInterval,
    enabled: options?.enabled,
    onDraftSaved: options?.onSave,
    onDraftLoaded: options?.onRestore,
  });

  // Auto-save on form values change
  useEffect(() => {
    if (options?.enabled !== false && formValues) {
      const timer = setTimeout(() => {
        saveDraft(formValues);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [formValues, options?.enabled, saveDraft]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    draftTimestamp,
    saveStatus,
  };
}
