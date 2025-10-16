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

/**
 * Validates all required environment variables
 * @throws {EnvironmentError} if any required variable is missing
 */
export function validateEnvironment(): EnvConfig {
  const errors: string[] = [];

  // Required variables
  const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
 */
export function getEnvConfig(): EnvConfig {
  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL!,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY!,
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
