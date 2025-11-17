/**
 * Custom hook for managing legal case drafts
 * Provides auto-save and draft management functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface CaseDraft {
  id: string;
  data: any;
  lastSaved: Date;
  step: string;
}

const DRAFT_KEY = 'legal_case_draft';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export const useCaseDraft = (formData: any, currentStep: string) => {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // Generate unique draft ID
  const generateDraftId = () => {
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Save draft to localStorage
  const saveDraft = useCallback((showToast = true) => {
    try {
      const id = draftId || generateDraftId();
      const draft: CaseDraft = {
        id,
        data: formData,
        lastSaved: new Date(),
        step: currentStep,
      };

      localStorage.setItem(`${DRAFT_KEY}_${id}`, JSON.stringify(draft));
      
      if (!draftId) {
        setDraftId(id);
      }
      
      setLastSaved(new Date());
      
      if (showToast) {
        toast.success('تم حفظ المسودة');
      }
      
      return id;
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('فشل حفظ المسودة');
      return null;
    }
  }, [formData, currentStep, draftId]);

  // Load draft from localStorage
  const loadDraft = useCallback((id: string) => {
    try {
      const saved = localStorage.getItem(`${DRAFT_KEY}_${id}`);
      if (saved) {
        const draft: CaseDraft = JSON.parse(saved);
        setDraftId(draft.id);
        setLastSaved(new Date(draft.lastSaved));
        return draft;
      }
      return null;
    } catch (error) {
      console.error('Error loading draft:', error);
      return null;
    }
  }, []);

  // Delete draft from localStorage
  const deleteDraft = useCallback((id?: string) => {
    try {
      const idToDelete = id || draftId;
      if (idToDelete) {
        localStorage.removeItem(`${DRAFT_KEY}_${idToDelete}`);
        setDraftId(null);
        setLastSaved(null);
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  }, [draftId]);

  // Get all drafts
  const getAllDrafts = useCallback((): CaseDraft[] => {
    try {
      const drafts: CaseDraft[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DRAFT_KEY)) {
          const saved = localStorage.getItem(key);
          if (saved) {
            drafts.push(JSON.parse(saved));
          }
        }
      }
      return drafts.sort((a, b) => 
        new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime()
      );
    } catch (error) {
      console.error('Error getting all drafts:', error);
      return [];
    }
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (!autoSaveEnabled) return;

    const interval = setInterval(() => {
      // Only auto-save if there's data
      if (formData && Object.keys(formData).length > 0) {
        saveDraft(false); // Don't show toast for auto-save
        console.log('Auto-saved draft');
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [formData, autoSaveEnabled, saveDraft]);

  return {
    draftId,
    lastSaved,
    saveDraft,
    loadDraft,
    deleteDraft,
    getAllDrafts,
    autoSaveEnabled,
    setAutoSaveEnabled,
  };
};
