/**
 * Improved Error Handler System
 * 
 * Provides:
 * - User-friendly error messages
 * - Actionable suggestions
 * - Automatic retry logic (3 attempts)
 * - Support contact information
 * - Error categorization and logging
 */

import { logger } from './logger';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'not_found'
  | 'server'
  | 'rate_limit'
  | 'timeout'
  | 'chunk_load'
  | 'database'
  | 'unknown';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface ErrorMessage {
  title: string;
  description: string;
  suggestions: string[];
  action: 'retry' | 'navigate' | 'contact_support' | 'reload' | 'none';
  severity: ErrorSeverity;
  retryable: boolean;
  maxRetries: number;
}

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

/**
 * Categorize error based on message/type
 */
export function categorizeError(error: Error | string): ErrorCategory {
  const message = (typeof error === 'string' ? error : error?.message || '').toLowerCase();
  const name = (typeof error !== 'string' ? error?.name || '' : '').toLowerCase();

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return 'network';
  }

  // Authentication errors
  if (message.includes('auth') || message.includes('invalid token') || message.includes('session expired')) {
    return 'authentication';
  }

  // Authorization errors
  if (message.includes('permission') || message.includes('forbidden') || message.includes('unauthorized') || message.includes('403')) {
    return 'authorization';
  }

  // Validation errors
  if (message.includes('validation') || message.includes('invalid') || message.includes('constraint')) {
    return 'validation';
  }

  // Not found errors
  if (message.includes('not found') || message.includes('404')) {
    return 'not_found';
  }

  // Rate limit errors
  if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
    return 'rate_limit';
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }

  // Chunk load errors
  if (message.includes('chunk') || message.includes('dynamically imported') || message.includes('chunkloaderror')) {
    return 'chunk_load';
  }

  // Database errors
  if (message.includes('database') || message.includes('db') || message.includes('postgres')) {
    return 'database';
  }

  // Server errors
  if (message.includes('server') || message.includes('500') || message.includes('internal')) {
    return 'server';
  }

  return 'unknown';
}

/**
 * Get user-friendly error message with suggestions
 */
export function getErrorMessage(error: Error | string, category?: ErrorCategory): ErrorMessage {
  const actualCategory = category || categorizeError(error);
  const errorMessage = typeof error === 'string' ? error : error?.message || '';

  switch (actualCategory) {
    case 'network':
      return {
        title: 'مشكلة في الاتصال',
        description: 'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت أو انتظر قليلاً ثم حاول مجدداً.',
        suggestions: [
          'تحقق من اتصال الإنترنت',
          'حاول إغلاق وفتح التطبيق مجدداً',
          'قد تكون هناك مشاكل في الخادم، حاول لاحقاً'
        ],
        action: 'retry',
        severity: 'high',
        retryable: true,
        maxRetries: 3
      };

    case 'authentication':
      return {
        title: 'انتهت جلستك',
        description: 'لقد انتهت جلستك. يرجى تسجيل الدخول مجدداً.',
        suggestions: [
          'سجل الدخول بمعلومات صحيحة',
          'إذا لم تتذكر كلمة المرور، استخدم خيار "نسيت كلمة المرور"',
          'تأكد من أنك تستخدم أحدث نسخة من التطبيق'
        ],
        action: 'navigate',
        severity: 'high',
        retryable: false,
        maxRetries: 0
      };

    case 'authorization':
      return {
        title: 'ليس لديك صلاحيات',
        description: 'لا توجد لديك الصلاحيات اللازمة للوصول إلى هذا المحتوى.',
        suggestions: [
          'تحقق من أن لديك الوصول الصحيح',
          'اطلب من مسؤول النظام منحك الصلاحيات اللازمة',
          'إذا تم مؤخراً تحديث صلاحياتك، حاول تسجيل الخروج والدخول مجدداً'
        ],
        action: 'contact_support',
        severity: 'medium',
        retryable: false,
        maxRetries: 0
      };

    case 'validation':
      return {
        title: 'بيانات غير صحيحة',
        description: 'تحقق من البيانات التي أدخلتها وحاول مجدداً.',
        suggestions: [
          'تحقق من صيغة البيانات المدخلة',
          'تأكد من ملء جميع الحقول المطلوبة',
          'راجع الأخطاء المعروضة وصححها'
        ],
        action: 'none',
        severity: 'low',
        retryable: false,
        maxRetries: 0
      };

    case 'not_found':
      return {
        title: 'محتوى غير موجود',
        description: 'لم يتم العثور على المحتوى المطلوب.',
        suggestions: [
          'تأكد من أن الرابط صحيح',
          'قد يكون المحتوى تم حذفه أو نقله',
          'عد إلى الصفحة السابقة وحاول مجدداً'
        ],
        action: 'navigate',
        severity: 'low',
        retryable: false,
        maxRetries: 0
      };

    case 'rate_limit':
      return {
        title: 'طلبات كثيرة',
        description: 'لقد قمت بإرسال طلبات كثيرة جداً. يرجى الانتظار قليلاً.',
        suggestions: [
          'انتظر بضع دقائق قبل محاولة مجدداً',
          'تجنب تكرار نفس العملية بسرعة',
          'إذا استمرت المشكلة، اتصل بالدعم'
        ],
        action: 'retry',
        severity: 'medium',
        retryable: true,
        maxRetries: 2
      };

    case 'timeout':
      return {
        title: 'استغرقت العملية وقتاً طويلاً',
        description: 'استغرقت العملية وقتاً أطول من المتوقع. قد تحتاج إلى الانتظار أكثر.',
        suggestions: [
          'حاول العملية مجدداً',
          'تحقق من اتصال الإنترنت',
          'إذا استمرت المشكلة، اتصل بالدعم'
        ],
        action: 'retry',
        severity: 'medium',
        retryable: true,
        maxRetries: 2
      };

    case 'chunk_load':
      return {
        title: 'تحديث التطبيق',
        description: 'تم نشر نسخة جديدة من التطبيق. يرجى إعادة تحميل الصفحة.',
        suggestions: [
          'انقر على زر إعادة التحميل',
          'إذا استمرت المشكلة، امسح الذاكرة المؤقتة وحاول مجدداً',
          'قد تحتاج إلى إغلاق وفتح المتصفح'
        ],
        action: 'reload',
        severity: 'high',
        retryable: true,
        maxRetries: 1
      };

    case 'database':
      return {
        title: 'خطأ في قاعدة البيانات',
        description: 'حدث خطأ في قاعدة البيانات. حاول مجدداً.',
        suggestions: [
          'حاول العملية مجدداً',
          'إذا استمرت المشكلة، قد تكون هناك مشاكل في الخادم',
          'اتصل بالدعم إذا لم تحل المشكلة'
        ],
        action: 'retry',
        severity: 'high',
        retryable: true,
        maxRetries: 3
      };

    case 'server':
      return {
        title: 'خطأ في الخادم',
        description: 'حدث خطأ في الخادم. نحاول معالجة المشكلة.',
        suggestions: [
          'حاول مجدداً في بضع دقائق',
          'تحقق من حالة الخادم',
          'اتصل بالدعم إذا استمرت المشكلة'
        ],
        action: 'retry',
        severity: 'critical',
        retryable: true,
        maxRetries: 3
      };

    default:
      return {
        title: 'حدث خطأ غير متوقع',
        description: 'عذراً، حدث خطأ غير متوقع. حاول مجدداً.',
        suggestions: [
          'حاول العملية مجدداً',
          'امسح الذاكرة المؤقتة للمتصفح',
          'اتصل بالدعم إذا استمرت المشكلة'
        ],
        action: 'retry',
        severity: 'high',
        retryable: true,
        maxRetries: 3
      };
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    maxDelayMs = 30000
  } = config;

  let lastError: Error | null = null;
  let delay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(`🔄 Attempt ${attempt}/${maxAttempts}`);
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxAttempts) {
        logger.warn(`❌ Attempt ${attempt} failed, retrying in ${delay}ms...`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelayMs);
      } else {
        logger.error(`❌ All ${maxAttempts} attempts failed`, lastError.message);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Create error context for logging
 */
export function createErrorContext(
  error: Error | string,
  context?: Partial<ErrorContext>
): ErrorContext {
  return {
    timestamp: new Date().toISOString(),
    ...context,
    metadata: {
      errorMessage: typeof error === 'string' ? error : error?.message,
      errorName: typeof error === 'string' ? undefined : error?.name,
      category: categorizeError(error),
      ...context?.metadata
    }
  };
}

/**
 * Log error with full context
 */
export function logError(
  error: Error | string,
  context?: Partial<ErrorContext>
): void {
  const errorContext = createErrorContext(error, context);
  
  logger.error('🔴 Error occurred:', {
    message: typeof error === 'string' ? error : error?.message,
    context: errorContext
  });

  // Store in localStorage for debugging (limited to last 20 errors)
  try {
    const storedErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
    storedErrors.push({
      ...errorContext,
      stack: typeof error === 'string' ? undefined : error?.stack
    });
    const recentErrors = storedErrors.slice(-20);
    localStorage.setItem('app_errors', JSON.stringify(recentErrors));
  } catch (e) {
    logger.warn('Failed to store error log:', e);
  }
}

/**
 * Error handler object for easy access
 */
export const ErrorHandler = {
  categorize: categorizeError,
  getMessage: getErrorMessage,
  retry: retryWithBackoff,
  createContext: createErrorContext,
  log: logError,

  /**
   * Get support contact information
   */
  getSupportInfo: () => ({
    email: 'support@fleetify.app',
    phone: '+974 4481 5555',
    hours: 'السبت - الخميس: 9:00 - 17:00',
    hoursEn: 'Sat - Thu: 9:00 AM - 5:00 PM',
    chat: 'https://fleetify.app/support/chat'
  }),

  /**
   * Check if error is recoverable
   */
  isRecoverable: (error: Error | string): boolean => {
    const category = categorizeError(error);
    return ['network', 'timeout', 'rate_limit', 'server', 'database', 'chunk_load'].includes(category);
  },

  /**
   * Get error severity
   */
  getSeverity: (error: Error | string): ErrorSeverity => {
    const category = categorizeError(error);
    switch (category) {
      case 'critical':
      case 'server':
        return 'critical';
      case 'network':
      case 'database':
      case 'chunk_load':
      case 'timeout':
        return 'high';
      case 'rate_limit':
      case 'authentication':
        return 'medium';
      default:
        return 'low';
    }
  }
};

export default ErrorHandler;
