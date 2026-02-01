/**
 * Capacitor Storage Adapter for Supabase
 * 
 * This adapter provides a localStorage-compatible interface
 * using Capacitor's Preferences API for better mobile compatibility
 * 
 * IMPORTANT: Supabase auth requires synchronous getItem for initial session recovery.
 * On web, we use localStorage directly. On native, we use Preferences API with
 * a localStorage cache to maintain synchronous access.
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// Cache prefix for native storage sync
const CACHE_PREFIX = '__capacitor_cache_';

class CapacitorStorageAdapter {
  private isNative: boolean;
  
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    
    // On native, sync cached values from Preferences to localStorage on init
    if (this.isNative) {
      this.syncFromPreferences();
    }
  }
  
  /**
   * Sync values from Preferences to localStorage cache (for native platforms)
   * This runs once on startup to ensure synchronous access works
   * FIXED: Now syncs ALL Preferences keys to localStorage for complete compatibility
   */
  private async syncFromPreferences(): Promise<void> {
    try {
      console.log('[CapacitorStorage] Starting sync from Preferences to localStorage...');
      
      // Get all keys from Preferences
      const { keys } = await Preferences.keys();
      console.log('[CapacitorStorage] Found', keys.length, 'keys in Preferences');
      
      // Sync all keys to localStorage cache
      for (const key of keys) {
        const { value } = await Preferences.get({ key });
        if (value) {
          localStorage.setItem(CACHE_PREFIX + key, value);
          console.log('[CapacitorStorage] Synced key:', key);
        }
      }
      
      console.log('[CapacitorStorage] Sync complete');
    } catch (error) {
      console.error('[CapacitorStorage] Error syncing from Preferences:', error);
    }
  }

  /**
   * Get item - synchronous for Supabase compatibility
   * Uses localStorage directly (or cached values from Preferences on native)
   */
  getItem(key: string): string | null {
    // Always use localStorage for synchronous access
    // On native, we sync Preferences to localStorage cache
    if (this.isNative) {
      return localStorage.getItem(CACHE_PREFIX + key);
    }
    return localStorage.getItem(key);
  }

  /**
   * Set item - returns Promise but also updates localStorage cache synchronously
   * FIXED: Now updates localStorage cache immediately for synchronous access,
   * then saves to Preferences asynchronously
   */
  async setItem(key: string, value: string): Promise<void> {
    if (!this.isNative) {
      // Use regular localStorage on web
      localStorage.setItem(key, value);
      return;
    }
    
    // CRITICAL FIX: Update localStorage cache FIRST for immediate synchronous access
    // This ensures getItem() can retrieve the value immediately after setItem()
    localStorage.setItem(CACHE_PREFIX + key, value);
    console.log('[CapacitorStorage] Set item in cache:', key);
    
    // Then save to Preferences asynchronously (don't block)
    try {
      await Preferences.set({ key, value });
      console.log('[CapacitorStorage] Saved to Preferences:', key);
    } catch (error) {
      console.error('[CapacitorStorage] Error setting item in Preferences:', key, error);
      // Don't throw - we already updated localStorage cache
    }
  }

  /**
   * Remove item - returns Promise but also updates localStorage cache synchronously
   * FIXED: Now removes from localStorage cache immediately, then Preferences asynchronously
   */
  async removeItem(key: string): Promise<void> {
    if (!this.isNative) {
      // Use regular localStorage on web
      localStorage.removeItem(key);
      return;
    }
    
    // CRITICAL FIX: Remove from localStorage cache FIRST for immediate effect
    localStorage.removeItem(CACHE_PREFIX + key);
    console.log('[CapacitorStorage] Removed item from cache:', key);
    
    // Then remove from Preferences asynchronously (don't block)
    try {
      await Preferences.remove({ key });
      console.log('[CapacitorStorage] Removed from Preferences:', key);
    } catch (error) {
      console.error('[CapacitorStorage] Error removing item from Preferences:', key, error);
      // Don't throw - we already removed from localStorage cache
    }
  }
}

// Create a singleton instance
export const capacitorStorage = new CapacitorStorageAdapter();

// Create a localStorage-compatible wrapper for Supabase
// IMPORTANT: getItem MUST be synchronous for Supabase session recovery to work
export const createCapacitorStorageAdapter = () => {
  return {
    // Synchronous getItem - required by Supabase
    getItem: (key: string): string | null => capacitorStorage.getItem(key),
    // Async setItem/removeItem are fine
    setItem: (key: string, value: string) => capacitorStorage.setItem(key, value),
    removeItem: (key: string) => capacitorStorage.removeItem(key),
  };
};
