/**
 * AppError Class
 * 
 * Custom error class for application-specific errors.
 * Provides better error categorization and user-friendly messages.
 */

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorDetails {
  [key: string]: any;
}

/**
 * Custom Application Error
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly userMessage: string;
  public readonly details?: ErrorDetails;
  public readonly timestamp: string;
  public readonly retryable: boolean;

  constructor(
    type: ErrorType,
    message: string,
    details?: ErrorDetails,
    userMessage?: string,
    severity?: ErrorSeverity,
    retryable: boolean = false
  ) {
    super(message);
    
    this.name = 'AppError';
    this.type = type;
    this.details = details;
    this.userMessage = userMessage || this.getDefaultUserMessage(type);
    this.severity = severity || this.getDefaultSeverity(type);
    this.timestamp = new Date().toISOString();
    this.retryable = retryable;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Get default user-friendly message based on error type
   */
  private getDefaultUserMessage(type: ErrorType): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.VALIDATION]: 'البيانات المدخلة غير صحيحة. يرجى التحقق والمحاولة مرة أخرى.',
      [ErrorType.DATABASE]: 'حدث خطأ في قاعدة البيانات. يرجى المحاولة مرة أخرى.',
      [ErrorType.BUSINESS_LOGIC]: 'لا يمكن إتمام هذه العملية. يرجى التحقق من البيانات.',
      [ErrorType.AUTHENTICATION]: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.',
      [ErrorType.AUTHORIZATION]: 'ليس لديك صلاحية للوصول إلى هذا المحتوى.',
      [ErrorType.NOT_FOUND]: 'العنصر المطلوب غير موجود.',
      [ErrorType.NETWORK]: 'فشل الاتصال بالخادم. تحقق من اتصال الإنترنت.',
      [ErrorType.TIMEOUT]: 'استغرقت العملية وقتاً طويلاً. يرجى المحاولة مرة أخرى.',
      [ErrorType.RATE_LIMIT]: 'طلبات كثيرة جداً. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.',
      [ErrorType.SERVER]: 'حدث خطأ في الخادم. نحن نعمل على إصلاحه.',
      [ErrorType.UNKNOWN]: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
    };

    return messages[type];
  }

  /**
   * Get default severity based on error type
   */
  private getDefaultSeverity(type: ErrorType): ErrorSeverity {
    const severities: Record<ErrorType, ErrorSeverity> = {
      [ErrorType.VALIDATION]: ErrorSeverity.LOW,
      [ErrorType.DATABASE]: ErrorSeverity.HIGH,
      [ErrorType.BUSINESS_LOGIC]: ErrorSeverity.MEDIUM,
      [ErrorType.AUTHENTICATION]: ErrorSeverity.HIGH,
      [ErrorType.AUTHORIZATION]: ErrorSeverity.MEDIUM,
      [ErrorType.NOT_FOUND]: ErrorSeverity.LOW,
      [ErrorType.NETWORK]: ErrorSeverity.HIGH,
      [ErrorType.TIMEOUT]: ErrorSeverity.MEDIUM,
      [ErrorType.RATE_LIMIT]: ErrorSeverity.MEDIUM,
      [ErrorType.SERVER]: ErrorSeverity.CRITICAL,
      [ErrorType.UNKNOWN]: ErrorSeverity.HIGH
    };

    return severities[type];
  }

  /**
   * Convert to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      userMessage: this.userMessage,
      severity: this.severity,
      retryable: this.retryable,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Static factory methods for common errors
   */
  static validation(message: string, details?: ErrorDetails): AppError {
    return new AppError(ErrorType.VALIDATION, message, details);
  }

  static notFound(resource: string, id?: string): AppError {
    const message = id 
      ? `${resource} with id ${id} not found`
      : `${resource} not found`;
    
    return new AppError(
      ErrorType.NOT_FOUND,
      message,
      { resource, id },
      `${resource} غير موجود`
    );
  }

  static unauthorized(action: string): AppError {
    return new AppError(
      ErrorType.AUTHORIZATION,
      `Unauthorized to ${action}`,
      { action },
      `ليس لديك صلاحية لتنفيذ: ${action}`
    );
  }

  static database(operation: string, details?: ErrorDetails): AppError {
    return new AppError(
      ErrorType.DATABASE,
      `Database operation failed: ${operation}`,
      details,
      undefined,
      ErrorSeverity.HIGH,
      true
    );
  }

  static network(details?: ErrorDetails): AppError {
    return new AppError(
      ErrorType.NETWORK,
      'Network request failed',
      details,
      undefined,
      ErrorSeverity.HIGH,
      true
    );
  }
}

