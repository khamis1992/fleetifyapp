/**
 * Enhanced Error Handling Middleware
 * Provides centralized error handling with categorization and logging
 */

import { Request, Response, NextFunction } from 'express';
import { auditLogger } from '@/lib/audit-logger';

// Error categories
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  INTERNAL = 'INTERNAL',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Custom error class
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: ErrorCategory,
    public severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    public statusCode: number = 500,
    public details?: any,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      statusCode: this.statusCode,
      details: this.details,
      userMessage: this.userMessage || this.message,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}

// Predefined error creators
export const createError = {
  // Authentication errors
  unauthorized: (message: string = 'Unauthorized', details?: any) =>
    new AppError(
      message,
      'UNAUTHORIZED',
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      401,
      details
    ),

  forbidden: (message: string = 'Forbidden', details?: any) =>
    new AppError(
      message,
      'FORBIDDEN',
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.MEDIUM,
      403,
      details
    ),

  // Validation errors
  validation: (message: string, details?: any) =>
    new AppError(
      message,
      'VALIDATION_ERROR',
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      400,
      details
    ),

  // Not found errors
  notFound: (resource: string = 'Resource', id?: string) =>
    new AppError(
      `${resource}${id ? ` with ID: ${id}` : ''} not found`,
      'NOT_FOUND',
      ErrorCategory.NOT_FOUND,
      ErrorSeverity.LOW,
      404
    ),

  // Business logic errors
  business: (message: string, code: string = 'BUSINESS_ERROR', details?: any) =>
    new AppError(
      message,
      code,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      400,
      details
    ),

  // Database errors
  database: (message: string, details?: any) =>
    new AppError(
      message,
      'DATABASE_ERROR',
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      500,
      details,
      'Database operation failed'
    ),

  // Network errors
  network: (message: string, details?: any) =>
    new AppError(
      message,
      'NETWORK_ERROR',
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      503,
      details,
      'Network error occurred'
    ),

  // Rate limit errors
  rateLimit: (message: string = 'Rate limit exceeded') =>
    new AppError(
      message,
      'RATE_LIMIT_EXCEEDED',
      ErrorCategory.RATE_LIMIT,
      ErrorSeverity.MEDIUM,
      429,
      undefined,
      'Too many requests. Please try again later.'
    ),

  // External service errors
  externalService: (serviceName: string, message: string) =>
    new AppError(
      `${serviceName}: ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorSeverity.MEDIUM,
      502,
      { serviceName },
      `External service ${serviceName} is unavailable`
    ),

  // Internal server errors
  internal: (message: string, details?: any) =>
    new AppError(
      message,
      'INTERNAL_ERROR',
      ErrorCategory.INTERNAL,
      ErrorSeverity.CRITICAL,
      500,
      details,
      'An internal error occurred'
    ),
};

// Error categorizer
function categorizeError(error: Error): { category: ErrorCategory; severity: ErrorSeverity } {
  // Already categorized errors
  if (error instanceof AppError) {
    return {
      category: error.category,
      severity: error.severity,
    };
  }

  // HTTP errors
  if ('status' in error || 'statusCode' in error) {
    const status = (error as any).status || (error as any).statusCode;

    if (status === 401) return { category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.MEDIUM };
    if (status === 403) return { category: ErrorCategory.AUTHORIZATION, severity: ErrorSeverity.MEDIUM };
    if (status === 404) return { category: ErrorCategory.NOT_FOUND, severity: ErrorSeverity.LOW };
    if (status === 400) return { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW };
    if (status === 429) return { category: ErrorCategory.RATE_LIMIT, severity: ErrorSeverity.MEDIUM };
    if (status >= 500) return { category: ErrorCategory.INTERNAL, severity: ErrorSeverity.HIGH };
  }

  // Validation errors
  if (error.name === 'ValidationError' || error.message.includes('validation')) {
    return { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW };
  }

  // Database errors
  if (error.message.toLowerCase().includes('database') || error.message.toLowerCase().includes('sql')) {
    return { category: ErrorCategory.DATABASE, severity: ErrorSeverity.HIGH };
  }

  // Network errors
  if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch')) {
    return { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM };
  }

  // Default
  return { category: ErrorCategory.INTERNAL, severity: ErrorSeverity.MEDIUM };
}

// Main error handling middleware
export function errorHandlerMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Don't handle errors that have already been sent
  if (res.headersSent) {
    return next(error);
  }

  // Categorize error
  const { category, severity } = categorizeError(error);

  // Create app error if not already one
  const appError = error instanceof AppError
    ? error
    : new AppError(
        error.message,
        'UNKNOWN_ERROR',
        category,
        severity,
        500,
        { originalError: error }
      );

  // Log error
  logError(appError, req);

  // Send appropriate response
  const response = {
    success: false,
    error: {
      code: appError.code,
      message: appError.userMessage || appError.message,
      category: appError.category,
      severity: appError.severity,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
      ...(process.env.NODE_ENV === 'development' && {
        stack: appError.stack,
        details: appError.details,
      }),
    },
  };

  res.status(appError.statusCode).json(response);
}

// Async error wrapper for route handlers
export function asyncErrorHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Error logging function
async function logError(error: AppError, req: Request): Promise<void> {
  try {
    // Get client info
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const userId = (req as any).user?.id;
    const companyId = (req as any).company?.id;

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${error.category}] ${error.code}:`, {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip,
        userAgent,
        userId,
        companyId,
      });
    }

    // Log to audit system
    if (userId && companyId) {
      await auditLogger.log({
        company_id: companyId,
        action: 'system.error',
        resource_type: 'error_log',
        user_id: userId,
        category: 'system',
        severity: error.severity.toLowerCase() as any,
        metadata: {
          error_code: error.code,
          error_message: error.message,
          error_category: error.category,
          url: req.url,
          method: req.method,
          ip_address: ip,
          user_agent: userAgent,
          stack: error.stack,
        },
      });
    }

    // Send to external error tracking in production
    if (process.env.NODE_ENV === 'production' && error.severity === ErrorSeverity.CRITICAL) {
      // Send to Sentry, DataDog, etc.
      // Example:
      // Sentry.captureException(error, {
      //   tags: {
      //     category: error.category,
      //     severity: error.severity,
      //   },
      //   extra: {
      //     request: req,
      //   },
      // });
    }
  } catch (logError) {
    // Prevent logging errors from crashing the app
    console.error('Failed to log error:', logError);
  }
}

// Error recovery utilities
export const ErrorRecovery = {
  /**
   * Retry a function with exponential backoff
   */
  async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry certain errors
        if (error instanceof AppError && error.category === ErrorCategory.VALIDATION) {
          throw error;
        }

        if (attempt === maxAttempts) {
          break;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  },

  /**
   * Circuit breaker for external services
   */
  createCircuitBreaker<T>(
    fn: () => Promise<T>,
    options: {
      failureThreshold?: number;
      recoveryTimeout?: number;
      monitoringPeriod?: number;
    } = {}
  ) {
    const {
      failureThreshold = 5,
      recoveryTimeout = 60000,
      monitoringPeriod = 10000,
    } = options;

    let failures = 0;
    let lastFailureTime = 0;
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    return async (...args: any[]) => {
      const now = Date.now();

      if (state === 'OPEN') {
        if (now - lastFailureTime < recoveryTimeout) {
          throw createError.externalService('Circuit Breaker', 'Service temporarily unavailable');
        }
        state = 'HALF_OPEN';
      }

      try {
        const result = await fn(...args);

        // Reset failure count on success
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
        }

        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;

        if (failures >= failureThreshold) {
          state = 'OPEN';
        }

        throw error;
      }
    };
  },
};

// Export types for external use
export type ErrorHandler = typeof errorHandlerMiddleware;
export type AsyncErrorHandler = typeof asyncErrorHandler;