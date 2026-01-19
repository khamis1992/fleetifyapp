import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for error tracking
 * Only enabled in production environment
 */
export const initSentry = () => {
  // Only initialize in production
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Performance Monitoring
      tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring
      
      // Session Replay
      replaysSessionSampleRate: 0.1, // Sample 10% of sessions
      replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors
      
      // Environment
      environment: import.meta.env.MODE,
      
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || 'unknown',
      
      // Ignore specific errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'chrome-extension://',
        'moz-extension://',
        // Network errors
        'NetworkError',
        'Failed to fetch',
        // React hydration errors (usually not critical)
        'Hydration failed',
      ],
      
      // Filter out sensitive data
      beforeSend(event, hint) {
        // Don't send events if user is in development
        if (import.meta.env.DEV) {
          return null;
        }
        
        // Remove sensitive data from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
            if (breadcrumb.data) {
              // Remove tokens, passwords, etc.
              const sanitized = { ...breadcrumb.data };
              ['token', 'password', 'apiKey', 'api_key', 'authorization'].forEach(key => {
                if (sanitized[key]) {
                  sanitized[key] = '[REDACTED]';
                }
              });
              breadcrumb.data = sanitized;
            }
            return breadcrumb;
          });
        }
        
        return event;
      },
    });
  }
};

/**
 * Set user context for Sentry
 */
export const setSentryUser = (user: {
  id: string;
  email?: string;
  username?: string;
  company_id?: string;
}) => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
    
    // Set company context
    if (user.company_id) {
      Sentry.setContext('company', {
        company_id: user.company_id,
      });
    }
  }
};

/**
 * Clear user context from Sentry (on logout)
 */
export const clearSentryUser = () => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.setUser(null);
  }
};

/**
 * Manually capture an exception
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, {
      contexts: context ? { custom: context } : undefined,
    });
  } else {
    // In development, just log to console
    console.error('Error:', error, context);
  }
};

/**
 * Manually capture a message
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  } else {
    console.log(`[${level}]`, message);
  }
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}) => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
  }
};
