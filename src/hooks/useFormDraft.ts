import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface FormDraft<T> {
  formId: string;
  data: T;
  timestamp: string;
  version: number;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseFormDraftOptions {
  /** Unique identifier for this form */
  formId: string;
  /** Auto-save interval in milliseconds (default: 30000 = 30 seconds) */
  autoSaveInterval?: number;
  /** Whether to enable auto-save (default: true) */
  enabled?: boolean;
  /** Callback when draft is loaded */
  onDraftLoaded?: (data: any) => void;
  /** Callback when draft is saved */
  onDraftSaved?: () => void;
  /** Callback when draft is cleared */
  onDraftCleared?: () => void;
}

/**
 * useFormDraft - Auto-save form data to prevent data loss
 *
 * Features:
 * - Auto-saves to localStorage every 30 seconds
 * - Manual save trigger available
 * - Restore draft on mount
 * - Clear draft on successful submit
 * - Visual save status indicator
 * - Timestamp tracking
 * - Version control for conflict detection
 *
 * Usage:
 * ```tsx
 * const {
 *   saveDraft,
 *   loadDraft,
 *   clearDraft,
 *   hasDraft,
 *   draftTimestamp,
 *   saveStatus
 * } = useFormDraft({
 *   formId: 'customer-form',
 *   onDraftLoaded: (data) => {
 *     // Restore form values
 *     form.reset(data);
 *   }
 * });
 *
 * // In form onChange:
 * const handleChange = (values) => {
 *   saveDraft(values);
 * };
 *
 * // On successful submit:
 * const handleSubmit = async (values) => {
 *   await saveToDatabase(values);
 *   clearDraft(); // Clear draft after successful save
 * };
 * ```
 *
 * Part of K1 Fix #009 - Auto-save to prevent data loss
 */
export function useFormDraft<T = any>(options: UseFormDraftOptions) {
  const {
    formId,
    autoSaveInterval = 30000, // 30 seconds
    enabled = true,
    onDraftLoaded,
    onDraftSaved,
    onDraftCleared,
  } = options;

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<Date | null>(null);

  const draftDataRef = useRef<T | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveRef = useRef<string>('');

  const STORAGE_KEY = `form_draft_${formId}`;
  const DRAFT_VERSION = 1; // Increment when draft structure changes

  /**
   * Save draft to localStorage
   */
  const saveDraft = useCallback((data: T, showToast = false) => {
    if (!enabled) return;

    try {
      setSaveStatus('saving');

      const draft: FormDraft<T> = {
        formId,
        data,
        timestamp: new Date().toISOString(),
        version: DRAFT_VERSION,
      };

      const serialized = JSON.stringify(draft);

      // Only save if data has actually changed
      if (serialized === lastSaveRef.current) {
        setSaveStatus('saved');
        return;
      }

      localStorage.setItem(STORAGE_KEY, serialized);
      lastSaveRef.current = serialized;
      draftDataRef.current = data;

      setHasDraft(true);
      setDraftTimestamp(new Date());
      setSaveStatus('saved');

      if (onDraftSaved) {
        onDraftSaved();
      }

      if (showToast) {
        toast.success('تم حفظ المسودة', {
          description: 'تم حفظ التغييرات تلقائياً',
          duration: 2000,
        });
      }

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);

    } catch (error) {
      console.error('❌ [FORM_DRAFT] Failed to save draft:', error);
      setSaveStatus('error');
      toast.error('فشل حفظ المسودة', {
        description: 'حدث خطأ أثناء الحفظ التلقائي',
      });
    }
  }, [enabled, formId, onDraftSaved, STORAGE_KEY]);

  /**
   * Load draft from localStorage
   */
  const loadDraft = useCallback((): T | null => {
    if (!enabled) return null;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        setHasDraft(false);
        return null;
      }

      const draft: FormDraft<T> = JSON.parse(stored);

      // Version check - clear old drafts
      if (draft.version !== DRAFT_VERSION) {
        console.warn('⚠️ [FORM_DRAFT] Draft version mismatch, clearing old draft');
        clearDraft();
        return null;
      }

      // Form ID check
      if (draft.formId !== formId) {
        console.warn('⚠️ [FORM_DRAFT] Form ID mismatch');
        return null;
      }

      setHasDraft(true);
      setDraftTimestamp(new Date(draft.timestamp));
      draftDataRef.current = draft.data;
      lastSaveRef.current = stored;

      if (onDraftLoaded) {
        onDraftLoaded(draft.data);
      }

      console.log('✅ [FORM_DRAFT] Draft loaded:', {
        formId,
        timestamp: draft.timestamp,
        dataKeys: Object.keys(draft.data as any),
      });

      return draft.data;

    } catch (error) {
      console.error('❌ [FORM_DRAFT] Failed to load draft:', error);
      // Clear corrupted draft
      clearDraft();
      return null;
    }
  }, [enabled, formId, onDraftLoaded, STORAGE_KEY]);

  /**
   * Clear draft from localStorage
   */
  const clearDraft = useCallback((showToast = false) => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      draftDataRef.current = null;
      lastSaveRef.current = '';
      setHasDraft(false);
      setDraftTimestamp(null);
      setSaveStatus('idle');

      if (onDraftCleared) {
        onDraftCleared();
      }

      if (showToast) {
        toast.success('تم حذف المسودة');
      }

      console.log('✅ [FORM_DRAFT] Draft cleared:', formId);

    } catch (error) {
      console.error('❌ [FORM_DRAFT] Failed to clear draft:', error);
    }
  }, [formId, onDraftCleared, STORAGE_KEY]);

  /**
   * Auto-save setup
   */
  useEffect(() => {
    if (!enabled) return;

    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // Set up auto-save interval
    autoSaveTimerRef.current = setInterval(() => {
      if (draftDataRef.current) {
        console.log('💾 [FORM_DRAFT] Auto-saving...', formId);
        saveDraft(draftDataRef.current);
      }
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [enabled, autoSaveInterval, formId, saveDraft]);

  /**
   * Check for existing draft on mount
   */
  useEffect(() => {
    if (enabled) {
      const stored = localStorage.getItem(STORAGE_KEY);
      setHasDraft(!!stored);

      if (stored) {
        try {
          const draft: FormDraft<T> = JSON.parse(stored);
          setDraftTimestamp(new Date(draft.timestamp));
        } catch (error) {
          console.error('❌ [FORM_DRAFT] Failed to parse draft timestamp:', error);
        }
      }
    }
  }, [enabled, STORAGE_KEY]);

  /**
   * Save before page unload
   */
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      if (draftDataRef.current) {
        // Synchronous save before unload
        const draft: FormDraft<T> = {
          formId,
          data: draftDataRef.current,
          timestamp: new Date().toISOString(),
          version: DRAFT_VERSION,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, formId, STORAGE_KEY]);

  return {
    /** Save current form data to draft */
    saveDraft,
    /** Load draft from localStorage */
    loadDraft,
    /** Clear draft from localStorage */
    clearDraft,
    /** Whether a draft exists */
    hasDraft,
    /** Timestamp of last save */
    draftTimestamp,
    /** Current save status */
    saveStatus,
    /** Reference to current draft data */
    draftDataRef,
  };
}

/**
 * Helper function to format relative time
 */
export function getRelativeTime(date: Date | null): string {
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  return `منذ ${diffDays} يوم`;
}
