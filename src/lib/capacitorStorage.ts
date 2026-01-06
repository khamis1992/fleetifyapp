/**
 * Capacitor Storage Adapter for Supabase
 * 
 * This adapter provides a localStorage-compatible interface
 * using Capacitor's Preferences API for better mobile compatibility
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

class CapacitorStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
      // Use regular localStorage on web
      return localStorage.getItem(key);
    }
    
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (error) {
      console.error('[CapacitorStorage] Error getting item:', key, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Use regular localStorage on web
      localStorage.setItem(key, value);
      return;
    }
    
    try {
      await Preferences.set({ key, value });
    } catch (error) {
      console.error('[CapacitorStorage] Error setting item:', key, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Use regular localStorage on web
      localStorage.removeItem(key);
      return;
    }
    
    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.error('[CapacitorStorage] Error removing item:', key, error);
    }
  }
}

// Create a singleton instance
export const capacitorStorage = new CapacitorStorageAdapter();

// Create a localStorage-compatible wrapper for Supabase
export const createCapacitorStorageAdapter = () => {
  return {
    getItem: (key: string) => capacitorStorage.getItem(key),
    setItem: (key: string, value: string) => capacitorStorage.setItem(key, value),
    removeItem: (key: string) => capacitorStorage.removeItem(key),
  };
};
