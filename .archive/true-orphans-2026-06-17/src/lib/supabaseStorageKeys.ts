/**
 * Supabase Storage Keys Helper
 *
 * Dynamically generates Supabase storage keys based on the project configuration
 * Prevents hardcoded keys that break when project changes
 */

import { getEnvConfig } from './validateEnv';

/**
 * Extract project ref from Supabase URL
 * Example: https://abc def123.supabase.co -> abcdef123
 */
function getSupabaseProjectRef(): string {
  const { VITE_SUPABASE_URL } = getEnvConfig();

  try {
    const url = new URL(VITE_SUPABASE_URL);
    // Extract project ref from subdomain (e.g., "qwhunliohlkkahbspfiu" from "qwhunliohlkkahbspfiu.supabase.co")
    const hostname = url.hostname;
    const projectRef = hostname.split('.')[0];

    if (!projectRef || projectRef.length < 10) {
      throw new Error('Invalid project ref extracted from Supabase URL');
    }

    return projectRef;
  } catch (error) {
    console.error('Failed to extract Supabase project ref:', error);
    // Fallback to a default (this should never happen in production)
    return 'default-project';
  }
}

/**
 * Get the auth token storage key
 */
export function getAuthTokenKey(): string {
  const projectRef = getSupabaseProjectRef();
  return `sb-${projectRef}-auth-token`;
}

/**
 * Get the refresh token storage key
 */
export function getRefreshTokenKey(): string {
  const projectRef = getSupabaseProjectRef();
  return `sb-${projectRef}-refresh-token`;
}

/**
 * Clear all Supabase auth tokens from localStorage
 * Safe to use even if keys don't exist
 */
export function clearSupabaseAuthTokens(): void {
  try {
    const authTokenKey = getAuthTokenKey();
    const refreshTokenKey = getRefreshTokenKey();

    localStorage.removeItem(authTokenKey);
    localStorage.removeItem(refreshTokenKey);

    // Also clear the standard Supabase storage pattern
    // Supabase stores auth state with a specific pattern
    const projectRef = getSupabaseProjectRef();
    const authStateKey = `sb-${projectRef}-auth-token`;

    // Clear all possible variations
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`sb-${projectRef}-`)) {
        localStorage.removeItem(key);
      }
    });

    console.log('✅ [AUTH] Cleared Supabase auth tokens');
  } catch (error) {
    console.error('❌ [AUTH] Error clearing tokens:', error);
  }
}

/**
 * Check if user has valid auth tokens
 */
export function hasAuthTokens(): boolean {
  try {
    const authTokenKey = getAuthTokenKey();
    return !!localStorage.getItem(authTokenKey);
  } catch {
    return false;
  }
}

/**
 * Get all Supabase storage keys (for debugging)
 */
export function getSupabaseStorageKeys(): string[] {
  try {
    const projectRef = getSupabaseProjectRef();
    return Object.keys(localStorage).filter(key => key.startsWith(`sb-${projectRef}-`));
  } catch {
    return [];
  }
}
