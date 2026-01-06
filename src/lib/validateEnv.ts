/**
 * Environment Variables Validation Utility
 *
 * Validates required environment variables at application startup
 * Prevents runtime crashes due to missing configuration
 */

interface EnvConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_OPENAI_API_KEY?: string; // Optional
}

class EnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentError';
  }
}

// Fallback values for mobile app (Capacitor) where env vars may not be available
const FALLBACK_SUPABASE_URL = "https://qwhunliohlkkahbspfiu.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs";

/**
 * Validates all required environment variables
 * @throws {EnvironmentError} if any required variable is missing
 */
export function validateEnvironment(): EnvConfig {
  const errors: string[] = [];

  // Required variables - use fallbacks for mobile
  const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

  // Only error if both env var and fallback are missing (should never happen now)
  if (!VITE_SUPABASE_URL) {
    errors.push('VITE_SUPABASE_URL is required');
  }

  if (!VITE_SUPABASE_ANON_KEY) {
    errors.push('VITE_SUPABASE_ANON_KEY is required');
  }

  // Validate URL format
  if (VITE_SUPABASE_URL) {
    try {
      new URL(VITE_SUPABASE_URL);
    } catch {
      errors.push('VITE_SUPABASE_URL must be a valid URL');
    }
  }

  // Validate key format (basic check)
  if (VITE_SUPABASE_ANON_KEY && VITE_SUPABASE_ANON_KEY.length < 20) {
    errors.push('VITE_SUPABASE_ANON_KEY appears to be invalid (too short)');
  }

  if (errors.length > 0) {
    const errorMessage = [
      '❌ Environment Configuration Error:',
      '',
      ...errors.map(err => `  • ${err}`),
      '',
      '📝 Please check your .env file and ensure all required variables are set.',
      '   See .env.example for reference.',
    ].join('\n');

    throw new EnvironmentError(errorMessage);
  }

  return {
    VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY,
    VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  };
}

/**
 * Gets environment configuration (validated)
 * Safe to use after validateEnvironment() has been called
 * Uses fallbacks for mobile app compatibility
 */
export function getEnvConfig(): EnvConfig {
  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY,
    VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  };
}

/**
 * Check if running in development mode
 */
export const isDevelopment = import.meta.env.DEV;

/**
 * Check if running in production mode
 */
export const isProduction = import.meta.env.PROD;

/**
 * Get application mode
 */
export const mode = import.meta.env.MODE;
