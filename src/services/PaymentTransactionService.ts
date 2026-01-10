/**
 * Payment Transaction Service
 * 
 * آلية التعافي من الأخطاء للمدفوعات:
 * - Transactions للعمليات متعددة الخطوات (atomic operations)
 * - Retry Logic (3x with exponential backoff)
 * - Queue للعمليات الفاشلة
 * - Logging شامل
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { accountingService } from './AccountingService';
import { paymentStateMachine } from './PaymentStateMachine';
import { paymentLinkingService } from './PaymentLinkingService';

export interface TransactionStep<T> {
  name: string;
  execute: () => Promise<T>;
  rollback?: () => Promise<void>;
  critical: boolean; // If true, transaction fails if this step fails
}

export interface TransactionResult<T = any> {
  success: boolean;
  data?: T;
  stepsExecuted: string[];
  stepsFailed: string[];
  stepsRolledBack: string[];
  error?: string;
  retryAttempt?: number;
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  backoffMultiplier: number;
  exponential: boolean;
}

export interface FailedTransaction {
  transactionId: string;
  paymentId?: string;
  steps: string[];
  failedAt: string;
  error: string;
  retryCount: number;
  nextRetryAt?: string;
  metadata?: any;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 5000, // 5 ثواني
  backoffMultiplier: 2,
  exponential: true
};

class PaymentTransactionService {
  private failedTransactions: Map<string, FailedTransaction> = new Map();
  private transactionHistory: Map<string, TransactionResult[]> = new Map();

  /**
   * تنفيذ transaction متعددة الخطوات مع آلية تعافي من الأخطاء
   */
  async executeTransaction<T = any>(
    transactionId: string,
    steps: TransactionStep<T>[],
    options: {
      enableRetry?: boolean;
      retryOptions?: RetryOptions;
      paymentId?: string;
      userId?: string;
      companyId?: string;
    } = {}
  ): Promise<TransactionResult<T>> {
    const startTime = Date.now();
    const stepsExecuted: string[] = [];
    const stepsFailed: string[] = [];
    const stepsRolledBack: string[] = [];
    let result: TransactionResult<T>;
    
    const retryOptions = options.retryOptions || DEFAULT_RETRY_OPTIONS;
    const maxAttempts = options.enableRetry !== false ? retryOptions.maxAttempts : 1;

    logger.info('Starting transaction', {
      transactionId,
      stepsCount: steps.length,
      maxAttempts
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // إعادة تعيين القوائم
        stepsExecuted.length = 0;
        stepsFailed.length = 0;
        stepsRolledBack.length = 0;

        // تنفيذ كل خطوة
        for (const step of steps) {
          logger.debug(`Executing step: ${step.name}`, { transactionId, attempt });

          try {
            const stepResult = await step.execute();
            stepsExecuted.push(step.name);

            logger.debug(`Step completed: ${step.name}`, { transactionId, attempt });

          } catch (stepError) {
            stepsFailed.push(step.name);
            
            const errorMessage = stepError instanceof Error ? stepError.message : 'خطأ غير معروف';
            logger.error(`Step failed: ${step.name}`, {
              transactionId,
              attempt,
              error: errorMessage,
              stepIsCritical: step.critical
            });

            // إذا كانت الخطوة حرجة، نوقف الـ transaction
            if (step.critical) {
              throw new Error(`فشل في خطوة حرجة: ${step.name} - ${errorMessage}`);
            }

            // إذا لم تكن حرجة، نتابع الخطوات التالية
            continue;
          }
        }

        // إذا انتهت جميع الخطوات بنجاح
        if (stepsFailed.length === 0) {
          const duration = Date.now() - startTime;
          
          logger.info('Transaction completed successfully', {
            transactionId,
            attempt,
            stepsExecuted: stepsExecuted.length,
            duration
          });

          // تسجيل في التاريخ
          this.recordTransactionResult(transactionId, {
            success: true,
            stepsExecuted,
            stepsFailed: [],
            stepsRolledBack: [],
            duration
          });

          // مسح من الفاشلات إذا كانت موجودة
          this.failedTransactions.delete(transactionId);

          result = {
            success: true,
            stepsExecuted,
            stepsFailed: [],
            stepsRolledBack: [],
            retryAttempt: attempt
          };
          
          return result;
        }

        // إذا فشلت خطوات، نحاول التراجع
        await this.rollbackSteps(steps, stepsExecuted, stepsFailed);
        
        if (attempt < maxAttempts) {
          // حساب وقت الانتظار للإعادة
          const delay = this.calculateRetryDelay(attempt, retryOptions);
          const nextRetryAt = new Date(Date.now() + delay);
          
          logger.warn('Transaction failed, will retry', {
            transactionId,
            attempt,
            failedSteps: stepsFailed,
            nextRetryAt: nextRetryAt.toISOString(),
            delay
          });

          // انتظار قبل إعادة المحاولة
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (transactionError) {
        stepsRolledBack.push(...stepsExecuted);
        
        const errorMessage = transactionError instanceof Error ? transactionError.message : 'خطأ غير معروف';
        
        logger.error('Transaction error', {
          transactionId,
          attempt,
          error: errorMessage,
          stepsExecuted,
          stepsFailed
        });

        // التراجع عن الخطوات المنفذة
        await this.rollbackSteps(steps, stepsExecuted, stepsFailed);

        if (attempt < maxAttempts) {
          const delay = this.calculateRetryDelay(attempt, retryOptions);
          logger.info('Will retry after delay', { transactionId, delay, attempt: attempt + 1 });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // المحاولة الأخيرة فشلت - تسجيل كفشلة نهائي
          await this.recordFailedTransaction(transactionId, {
            paymentId: options.paymentId,
            steps: stepsExecuted,
            failedAt: new Date().toISOString(),
            error: errorMessage,
            retryCount: maxAttempts,
            metadata: options
          });

          result = {
            success: false,
            stepsExecuted,
            stepsFailed,
            stepsRolledBack,
            error: errorMessage,
            retryAttempt: attempt
          };

          return result;
        }
      }
    }

    // إذا وصلنا إلى هنا، فشلت جميع المحاولات
    result = {
      success: false,
      stepsExecuted,
      stepsFailed,
      stepsRolledBack,
      error: 'فشلت جميع محاولات إعادة المعالجة',
      retryAttempt: maxAttempts
    };

    return result;
  }

  /**
   * التراجع عن خطوات معينة
   */
  private async rollbackSteps(
    steps: TransactionStep<any>[],
    stepsExecuted: string[],
    stepsFailed: string[]
  ): Promise<void> {
    const stepsToRollback: TransactionStep<any>[] = [];

    // الحصول على خطوات التراجع (بترتيب عكسي للتنفيذ)
    for (let i = stepsExecuted.length - 1; i >= 0; i--) {
      const stepName = stepsExecuted[i];
      const step = steps.find(s => s.name === stepName);
      
      if (step && step.rollback) {
        stepsToRollback.push(step);
      }
    }

    if (stepsToRollback.length === 0) {
      return;
    }

    logger.warn('Rolling back steps', {
      stepsToRollback: stepsToRollback.map(s => s.name)
    });

    const rolledBack: string[] = [];

    for (const step of stepsToRollback) {
      try {
        logger.debug(`Rolling back: ${step.name}`);
        await step.rollback!();
        rolledBack.push(step.name);
      } catch (rollbackError) {
        logger.error(`Failed to rollback: ${step.name}`, {
          error: rollbackError instanceof Error ? rollbackError.message : 'خطأ غير معروف'
        });
        // نتابع مع خطوات التراجع التالية
      }
    }

    logger.warn('Rollback completed', {
      rolledBack: rolledBack.length,
      failed: stepsToRollback.length - rolledBack.length
    });
  }

  /**
   * حساب وقت الانتظار للإعادة
   */
  private calculateRetryDelay(attempt: number, options: RetryOptions): number {
    if (options.exponential) {
      // Exponential backoff: delay = baseDelay * (backoffMultiplier ^ (attempt - 1))
      return Math.min(
        options.baseDelayMs * Math.pow(options.backoffMultiplier, attempt - 1),
        60000 // أقصى 60 ثانية
      );
    } else {
      // Linear backoff: delay = baseDelay * attempt
      return Math.min(
        options.baseDelayMs * attempt,
        60000
      );
    }
  }

  /**
   * تسجيل transaction فاشلة
   */
  private async recordFailedTransaction(
    transactionId: string,
    failedTx: Partial<FailedTransaction>
  ): Promise<void> {
    const record: FailedTransaction = {
      transactionId,
      steps: failedTx.steps || [],
      failedAt: failedTx.failedAt || new Date().toISOString(),
      error: failedTx.error || 'خطأ غير معروف',
      retryCount: failedTx.retryCount || 0,
      nextRetryAt: failedTx.nextRetryAt,
      paymentId: failedTx.paymentId,
      metadata: failedTx.metadata
    };

    this.failedTransactions.set(transactionId, record);

    // TODO: تخزين في قاعدة البيانات
    // await supabase.from('failed_transactions').insert(record);

    logger.error('Failed transaction recorded', { transactionId, error: record.error });
  }

  /**
   * تسجيل نتيجة transaction
   */
  private recordTransactionResult(
    transactionId: string,
    result: TransactionResult & { duration?: number }
  ): void {
    const history = this.transactionHistory.get(transactionId) || [];
    history.push(result);
    this.transactionHistory.set(transactionId, history);

    logger.debug('Transaction result recorded', {
      transactionId,
      success: result.success,
      duration: result.duration,
      attemptCount: history.length
    });
  }

  /**
   * الحصول على المعاملات الفاشلة
   */
  getFailedTransactions(): FailedTransaction[] {
    return Array.from(this.failedTransactions.values());
  }

  /**
   * إعادة محاولة transaction فاشلة
   */
  async retryFailedTransaction(
    transactionId: string,
    steps: TransactionStep<any>[],
    options: {
      userId?: string;
      companyId?: string;
    } = {}
  ): Promise<TransactionResult> {
    const failedTx = this.failedTransactions.get(transactionId);
    
    if (!failedTx) {
      return {
        success: false,
        stepsExecuted: [],
        stepsFailed: [],
        stepsRolledBack: [],
        error: 'المعاملة غير موجودة في قائمة الفاشلات'
      };
    }

    logger.info('Retrying failed transaction', {
      transactionId,
      previousRetryCount: failedTx.retryCount
    });

    // تنفيذ transaction مرة أخرى
    const result = await this.executeTransaction(
      transactionId,
      steps,
      {
        enableRetry: true,
        retryOptions: {
          ...DEFAULT_RETRY_OPTIONS,
          // زيادة وقت الانتظار لأن المحاولة الأخيرة فشلت
          baseDelayMs: DEFAULT_RETRY_OPTIONS.baseDelayMs * 2
        },
        paymentId: failedTx.paymentId,
        userId: options.userId,
        companyId: options.companyId
      }
    );

    return result;
  }

  /**
   * مسح المعاملات القديمة من القائمة الفاشلة
   */
  clearOldFailedTransactions(olderThanDays: number = 7): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const toRemove: string[] = [];

    for (const [txId, failedTx] of this.failedTransactions.entries()) {
      const failedDate = new Date(failedTx.failedAt);
      if (failedDate < cutoffDate) {
        toRemove.push(txId);
      }
    }

    toRemove.forEach(txId => this.failedTransactions.delete(txId));

    if (toRemove.length > 0) {
      logger.info('Cleared old failed transactions', {
        clearedCount: toRemove.length,
        olderThanDays
      });
    }
  }

  /**
   * الحصول على تاريخ transaction
   */
  getTransactionHistory(transactionId: string): TransactionResult[] {
    return this.transactionHistory.get(transactionId) || [];
  }

  /**
   * إنشاء transaction قياسية لإنشاء دفعة كاملة
   */
  async createPaymentTransaction(
    paymentId: string,
    companyId: string,
    userId?: string
  ): Promise<TransactionResult> {
    const transactionId = `payment-${paymentId}`;

    const steps: TransactionStep<any>[] = [
      {
        name: 'validate_payment',
        execute: async () => {
          // TODO: تنفيذ التحقق من البيانات
          return { validated: true };
        },
        critical: true
      },
      {
        name: 'start_processing',
        execute: async () => {
          const result = await paymentStateMachine.startProcessing(paymentId, userId);
          if (!result.success) {
            throw new Error(result.error || 'فشل في بدء المعالجة');
          }
          return result;
        },
        rollback: async () => {
          // TODO: التراجع عن بدء المعالجة
          // await paymentStateMachine.failPayment(paymentId, userId, 'transaction rolled back');
        },
        critical: true
      },
      {
        name: 'link_payment',
        execute: async () => {
          const result = await paymentLinkingService.linkPayment(paymentId, { autoLink: true });
          if (!result.success) {
            // ربط غير ناجح لكن ليس حرجياً
            logger.warn('Payment linking failed (non-critical)', { error: result.reason });
          }
          return result;
        },
        rollback: async () => {
          // فك الربط
          await paymentLinkingService.unlinkPayment(paymentId, userId);
        },
        critical: false // ليس حرجياً
      },
      {
        name: 'update_invoice_status',
        execute: async () => {
          // TODO: تحديث حالة الفاتورة إذا كانت مرتبطة
          return { updated: true };
        },
        critical: false
      },
      {
        name: 'update_account_balances',
        execute: async () => {
          const result = await accountingService.updateAccountBalances(paymentId, companyId);
          if (!result.success) {
            throw new Error(`فشل في تحديث الأرصدة: ${result.errors.join(', ')}`);
          }
          return result;
        },
        rollback: async () => {
          // TODO: التراجع عن تحديث الأرصدة
        },
        critical: true
      },
      {
        name: 'complete_payment',
        execute: async () => {
          const result = await paymentStateMachine.completePayment(paymentId, userId);
          if (!result.success) {
            throw new Error(result.error || 'فشل في إكمال الدفعة');
          }
          return result;
        },
        rollback: async () => {
          // التراجع عن إكمال الدفعة
          await paymentStateMachine.failPayment(paymentId, userId, 'transaction rolled back');
        },
        critical: true
      },
      {
        name: 'send_notifications',
        execute: async () => {
          // TODO: إرسال الإيصالات
          return { sent: true };
        },
        critical: false // فشل الإشعارات ليس حرجياً
      }
    ];

    return this.executeTransaction(transactionId, steps, {
      enableRetry: true,
      paymentId,
      userId,
      companyId
    });
  }

  /**
   * إنشاء transaction لإنشاء فاتورة من عقد
   */
  async createInvoiceTransaction(
    contractId: string,
    companyId: string,
    userId?: string
  ): Promise<TransactionResult> {
    const transactionId = `invoice-${contractId}-${Date.now()}`;

    const steps: TransactionStep<any>[] = [
      {
        name: 'validate_contract',
        execute: async () => {
          // TODO: التحقق من صحة العقد
          return { validated: true };
        },
        critical: true
      },
      {
        name: 'generate_invoice',
        execute: async () => {
          // TODO: إنشاء الفاتورة
          return { invoiceId: 'new-invoice-id' };
        },
        critical: true
      },
      {
        name: 'update_contract_status',
        execute: async () => {
          // TODO: تحديث حالة العقد
          return { updated: true };
        },
        critical: false
      },
      {
        name: 'create_journal_entry',
        execute: async () => {
          // TODO: إنشاء القيد المحاسبي
          return { journalEntryId: 'new-je-id' };
        },
        rollback: async () => {
          // TODO: التراجع عن القيد المحاسبي
        },
        critical: true
      }
    ];

    return this.executeTransaction(transactionId, steps, {
      enableRetry: true,
      companyId,
      userId
    });
  }

  /**
   * الحصول على إحصائيات المعاملات
   */
  getTransactionStats(): {
    totalExecuted: number;
    totalSucceeded: number;
    totalFailed: number;
    totalStepsExecuted: number;
    totalStepsFailed: number;
    avgRetryAttempts: number;
  } {
    let totalExecuted = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    let totalStepsExecuted = 0;
    let totalStepsFailed = 0;
    let totalRetryAttempts = 0;

    for (const [_, history] of this.transactionHistory.entries()) {
      for (const result of history) {
        totalExecuted++;
        totalStepsExecuted += result.stepsExecuted.length;
        totalStepsFailed += result.stepsFailed.length;
        totalRetryAttempts += (result.retryAttempt || 1) - 1;

        if (result.success) {
          totalSucceeded++;
        } else {
          totalFailed++;
        }
      }
    }

    return {
      totalExecuted,
      totalSucceeded,
      totalFailed,
      totalStepsExecuted,
      totalStepsFailed,
      avgRetryAttempts: totalExecuted > 0 ? totalRetryAttempts / totalExecuted : 0
    };
  }
}

// Export singleton instance
export const paymentTransactionService = new PaymentTransactionService();
