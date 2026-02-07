/**
 * LocalStorage helpers for Vehicle Document Distribution processing state
 */

import { ProcessingState } from './types';
import { STORAGE_KEY_PREFIX } from './constants';

export const saveProcessingState = (dialogId: string, state: ProcessingState): void => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${dialogId}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save processing state:', error);
  }
};

export const loadProcessingState = (dialogId: string): ProcessingState | null => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${dialogId}`;
    const data = localStorage.getItem(key);
    if (data) {
      const state = JSON.parse(data) as ProcessingState;
      // تحقق من أن الحالة ليست قديمة (أقدم من 24 ساعة)
      const dayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - state.timestamp < dayInMs) {
        return state;
      } else {
        // حذف الحالة القديمة
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error('Failed to load processing state:', error);
  }
  return null;
};

export const clearProcessingState = (dialogId: string): void => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${dialogId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear processing state:', error);
  }
};
