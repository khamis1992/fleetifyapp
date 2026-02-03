/**
 * Centralized Environment Management
 *
 * SECURITY: This file centralizes all environment variable access
 * to prevent credential leakage and provide validation
 */

import { validateEnvironment, getEnvConfig, isDevelopment, isProduction } from './validateEnv';

// Validate environment on import
let envConfig: ReturnType<typeof getEnvConfig> | null = null;

try {
  envConfig = validateEnvironment();
} catch (error) {
  // Don't throw in production for mobile app compatibility
  // The fallback values will be used instead
  console.warn('⚠️ Environment validation warning:', error);
  // Continue with fallback values
}

// SECURITY: No fallback credentials - environment variables MUST be provided
// For mobile apps, credentials should be bundled securely via build process
const FALLBACK_SUPABASE_URL = "";
const FALLBACK_SUPABASE_ANON_KEY = "";

/**
 * Get Supabase configuration
 * Uses hardcoded fallback values for mobile app compatibility
 */
export function getSupabaseConfig() {
  // Always use fallback values if env vars are not available (for mobile app)
  if (envConfig) {
    return {
      url: envConfig.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL,
      anonKey: envConfig.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY,
    };
  }

  // Fallback for mobile/production when envConfig failed to load
  return {
    url: import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY,
  };
}

/**
 * Get OpenAI configuration (optional)
 */
export function getOpenAIConfig() {
  return {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    hasKey: !!import.meta.env.VITE_OPENAI_API_KEY,
  };
}

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(featureName: string): boolean {
  const flagEnvVar = `VITE_FEATURE_${featureName.toUpperCase()}`;
  return import.meta.env[flagEnvVar] === 'true';
}

/**
 * Get API base URL
 */
export function getApiBaseUrl(): string {
  // Use full backend URL directly to avoid Vercel rewrite issues
  return import.meta.env.VITE_API_URL || 'https://fleetify-backend-production.up.railway.app';
}

/**
 * Get application version
 */
export function getAppVersion(): string {
  return import.meta.env.VITE_APP_VERSION || '1.0.0';
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  return {
    isDevelopment,
    isProduction,
    mode: import.meta.env.MODE,
    apiBaseUrl: getApiBaseUrl(),
    appVersion: getAppVersion(),
    supabase: getSupabaseConfig(),
    openai: getOpenAIConfig(),
  };
}

/**
 * Security: Check if we're in a secure context
 */
export function isSecureContext(): boolean {
  // In production, we should be using HTTPS
  if (isProduction) {
    return window.location.protocol === 'https:';
  }
  return true; // Allow HTTP in development
}

/**
 * Get Sentry DSN if available
 */
export function getSentryDsn(): string | undefined {
  return import.meta.env.VITE_SENTRY_DSN;
}

/**
 * Debug logging in development only
 */
export function debugLog(...args: any[]) {
  if (isDevelopment) {
    console.log('🔧 [DEBUG]', ...args);
  }
}

/**
 * Warn about potential security issues
 */
export function securityLog(message: string, data?: any) {
  if (isDevelopment) {
    console.warn('🔒 [SECURITY]', message, data);
  } else {
    // In production, send to monitoring service
    console.error('Security Issue:', message, data);
  }
}