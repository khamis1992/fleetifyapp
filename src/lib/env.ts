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
  if (isProduction) {
    console.error('❌ Critical: Environment validation failed in production');
    throw error;
  } else {
    console.warn('⚠️ Environment validation failed in development:', error);
    // Continue in development for better DX
  }
}

/**
 * Get Supabase configuration
 * @throws {Error} If required variables are missing in production
 */
export function getSupabaseConfig() {
  if (!envConfig) {
    if (isProduction) {
      throw new Error('Supabase configuration not available in production');
    }
    // Fallback for development
    return {
      url: import.meta.env.VITE_SUPABASE_URL || '',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    };
  }

  return {
    url: envConfig.VITE_SUPABASE_URL,
    anonKey: envConfig.VITE_SUPABASE_ANON_KEY,
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
  return import.meta.env.VITE_API_BASE_URL || '/api';
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