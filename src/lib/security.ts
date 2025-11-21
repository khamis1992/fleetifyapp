/**
 * Security Configuration
 *
 * Since this is a Vite frontend application with Supabase backend,
 * security headers and configurations are applied here.
 */

import type { AppType } from 'vite';

export interface SecurityConfig {
  // Content Security Policy
  contentSecurityPolicy: {
    'default-src': string[];
    'script-src': string[];
    'style-src': string[];
    'img-src': string[];
    'font-src': string[];
    'connect-src': string[];
    'frame-src': string[];
    'object-src': string[];
  };

  // Rate limiting configuration
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };

  // Session configuration
  session: {
    timeout: number; // in minutes
    refreshThreshold: number; // in minutes
  };

  // Input validation limits
  validation: {
    maxStringLength: number;
    maxEmailLength: number;
    maxPasswordLength: number;
    allowedFileTypes: string[];
    maxFileSize: number; // in bytes
  };
}

export const securityConfig: SecurityConfig = {
  contentSecurityPolicy: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-inline needed for React/Vite
    'style-src': ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Tailwind CSS
    'img-src': ["'self'", "data:", "https:", "blob:"],
    'font-src': ["'self'", "data:"],
    'connect-src': [
      "'self'",
      import.meta.env.VITE_SUPABASE_URL || 'https://*.supabase.co',
      'ws:', // WebSocket for Vite HMR in development
      'wss:' // WebSocket for production
    ],
    'frame-src': ["'none'"], // Prevent clickjacking
    'object-src': ["'none'"], // Prevent XSS via object embed
  },

  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // limit each IP to 100 requests per windowMs
    skipSuccessfulRequests: false,
  },

  session: {
    timeout: 30, // 30 minutes session timeout
    refreshThreshold: 5, // refresh session 5 minutes before expiry
  },

  validation: {
    maxStringLength: 1000,
    maxEmailLength: 254, // RFC standard
    maxPasswordLength: 128,
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    maxFileSize: 5 * 1024 * 1024, // 5MB
  }
};

// Generate CSP header string
export function generateCSPHeader(): string {
  const directives = Object.entries(securityConfig.contentSecurityPolicy)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');

  return directives;
}

// Security headers to be applied via Vite plugin or meta tags
export const securityHeaders = {
  'Content-Security-Policy': generateCSPHeader(),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

// Rate limiting storage for client-side implementation
class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowMs = securityConfig.rateLimiting.windowMs;
    const maxRequests = securityConfig.rateLimiting.maxRequests;

    const existing = this.requests.get(identifier);

    if (!existing || now > existing.resetTime) {
      // Reset or create new counter
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }

    if (existing.count >= maxRequests) {
      return false; // Rate limit exceeded
    }

    existing.count++;
    return true;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// Cleanup expired rate limit entries every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);