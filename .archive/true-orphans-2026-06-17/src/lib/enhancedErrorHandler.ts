/**
 * Enhanced Error Handler
 * 
 * Integrates with AppError for better error management.
 * Provides unified error handling across the application.
 */

import { AppError, ErrorType, ErrorSeverity } from './AppError';
import { logger } from './logger';
import { toast } from 'sonner';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  throwError?: boolean;
  onError?: (error: AppError | Error) => void;
}

/**
 * Enhanced Error Handler
 */
export class EnhancedErrorHandler {
  private static errorLog: AppError[] = [];
  private static maxLogSize = 50;

  /**
   * Handle any error with full processing
   */
  static handle(
    error: Error | AppError | string,
    options: ErrorHandlerOptions = {}
  ): void {
    const {
      showToast = true,
      logError = true,
      throwError = false,
      onError
    } = options;

    // Convert to AppError if needed
    const appError = this.toAppError(error);

    // Log error
    if (logError) {
      this.logError(appError);
    }

    // Store in error log
    this.storeError(appError);

    // Show user notification
    if (showToast) {
      this.showErrorToast(appError);
    }

    // Call custom error handler
    if (onError) {
      onError(appError);
    }

    // Throw if requested
    if (throwError) {
      throw appError;
    }
  }

  /**
   * Handle error with automatic retry
   */
  static async handleWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    options: ErrorHandlerOptions = {}
  ): Promise<T> {
    let lastError: Error | AppError | null = null;
    let delay = 1000; // Start with 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`🔄 Attempt ${attempt}/${maxRetries}`);
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const appError = this.toAppError(lastError);

        if (attempt < maxRetries && appError.retryable) {
          logger.warn(`❌ Attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, 30000); // Exponential backoff, max 30s
        } else {
          this.handle(appError, options);
          throw appError;
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Convert any error to AppError
   */
  private static toAppError(error: Error | AppError | string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (typeof error === 'string') {
      return new AppError(ErrorType.UNKNOWN, error);
    }

    // Determine error type from error message
    const errorType = this.categorizeError(error);
    const retryable = this.isRetryable(errorType);

    return new AppError(
      errorType,
      error.message,
      { originalError: error.name, stack: error.stack },
      undefined,
      undefined,
      retryable
    );
  }

  /**
   * Categorize error based on message and type
   */
  private static categorizeError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }

    if (message.includes('not found') || message.includes('404')) {
      return ErrorType.NOT_FOUND;
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return ErrorType.AUTHENTICATION;
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return ErrorType.AUTHORIZATION;
    }

    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK;
    }

    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return ErrorType.RATE_LIMIT;
    }

    if (message.includes('database') || message.includes('postgres')) {
      return ErrorType.DATABASE;
    }

    if (message.includes('server') || message.includes('500')) {
      return ErrorType.SERVER;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Check if error type is retryable
   */
  private static isRetryable(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.RATE_LIMIT,
      ErrorType.DATABASE,
      ErrorType.SERVER
    ].includes(type);
  }

  /**
   * Log error with context
   */
  private static logError(error: AppError): void {
    const logLevel = error.severity === ErrorSeverity.CRITICAL ? 'error' :
                     error.severity === ErrorSeverity.HIGH ? 'error' :
                     error.severity === ErrorSeverity.MEDIUM ? 'warn' : 'info';

    logger[logLevel](`[${error.type}] ${error.message}`, error.toJSON());
  }

  /**
   * Store error in local storage for debugging
   */
  private static storeError(error: AppError): void {
    try {
      // Add to in-memory log
      this.errorLog.push(error);
      if (this.errorLog.length > this.maxLogSize) {
        this.errorLog.shift(); // Remove oldest
      }

      // Store in localStorage (last 20 errors)
      const stored = JSON.parse(localStorage.getItem('app_errors') || '[]');
      stored.push(error.toJSON());
      const recent = stored.slice(-20);
      localStorage.setItem('app_errors', JSON.stringify(recent));
    } catch (e) {
      logger.warn('Failed to store error', e);
    }
  }

  /**
   * Show error toast notification
   */
  private static showErrorToast(error: AppError): void {
    const options = {
      duration: error.severity === ErrorSeverity.CRITICAL ? 10000 : 5000,
      description: error.details ? `تفاصيل: ${JSON.stringify(error.details)}` : undefined
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        toast.error(error.userMessage, options);
        break;
      case ErrorSeverity.MEDIUM:
        toast.warning(error.userMessage, options);
        break;
      case ErrorSeverity.LOW:
        toast.info(error.userMessage, options);
        break;
    }
  }

  /**
   * Get error log
   */
  static getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  static clearErrorLog(): void {
    this.errorLog = [];
    localStorage.removeItem('app_errors');
  }

  /**
   * Get recent errors from localStorage
   */
  static getRecentErrors(): any[] {
    try {
      return JSON.parse(localStorage.getItem('app_errors') || '[]');
    } catch {
      return [];
    }
  }
}

// Export for backward compatibility
export const handleError = (error: Error | AppError | string, options?: ErrorHandlerOptions) => {
  EnhancedErrorHandler.handle(error, options);
};

export const handleErrorWithRetry = <T>(
  operation: () => Promise<T>,
  maxRetries?: number,
  options?: ErrorHandlerOptions
) => {
  return EnhancedErrorHandler.handleWithRetry(operation, maxRetries, options);
};

