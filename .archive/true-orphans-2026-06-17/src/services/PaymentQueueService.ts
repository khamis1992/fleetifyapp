/**
 * Payment Queue Service
 * 
 * Queue للمعالجة المدفوعات المعلقة:
 * - معالجة مدفوعات في حالت 'processing'
 * - إعادة محاولة المدفوعات الفاشلة
 * - معالجة المهام المجدولة (مثل رسوم التأخير)
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { paymentStateMachine } from './PaymentStateMachine';
import { PaymentState } from './PaymentStateMachine';

export interface QueueJob {
  id: string;
  type: 'payment_processing' | 'late_fee_calculation' | 'retry_failed_payment';
  priority: number; // 1-10, 10 = highest
  paymentId?: string;
  payload: any;
  scheduledAt: string;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  lastError?: string;
  completedAt?: string;
}

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  avgProcessingTimeMs: number;
}

class PaymentQueueService {
  private queue: Map<string, QueueJob> = new Map();
  private processingJobs: Set<string> = new Set();
  private processingTimes: Map<string, number[]> = new Map();

  /**
   * إضافة دفعة لل queue
   */
  async enqueuePayment(
    paymentId: string,
    priority: number = 5
  ): Promise<QueueJob> {
    try {
      const { data: payment } = await supabase
        .from('payments')
        .select('id, company_id, payment_number, amount, customer_id, created_at')
        .eq('id', paymentId)
        .single();

      if (!payment) {
        throw new Error('الدفعة غير موجودة');
      }

      const jobId = `payment-${paymentId}-${Date.now()}`;
      
      const job: QueueJob = {
        id: jobId,
        type: 'payment_processing',
        priority,
        paymentId,
        payload: { payment },
        scheduledAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
        status: 'pending'
      };

      this.queue.set(jobId, job);

      logger.info('Payment enqueued', {
        paymentId,
        paymentNumber: payment.payment_number,
        jobId,
        priority
      });

      return job;
    } catch (error) {
      logger.error('Failed to enqueue payment', { error, paymentId });
      throw error;
    }
  }

  /**
   * بدء معالجة queue
   */
  async startProcessing(): Promise<{ processed: number; failed: number }> {
    try {
      logger.info('Starting queue processing', {
        queueSize: this.queue.size
      });

      // جلب الوظائف المعلقة والمجدولة للمعالجة
      const now = new Date();
      const jobsToProcess = Array.from(this.queue.values())
        .filter(job => 
          job.status === 'pending' && 
          new Date(job.scheduledAt) <= now &&
          !this.processingJobs.has(job.id)
        )
        .sort((a, b) => b.priority - a.priority) // Highest priority first
        .slice(0, 10); // Max 10 jobs per batch

      if (jobsToProcess.length === 0) {
        logger.info('No jobs to process');
        return { processed: 0, failed: 0 };
      }

      let processed = 0;
      let failed = 0;

      for (const job of jobsToProcess) {
        this.processingJobs.add(job.id);
        const startTime = Date.now();

        try {
          await this.processJob(job);
          
          // تسجيل وقت المعالجة
          const processingTime = Date.now() - startTime;
          const jobProcessingTimes = this.processingTimes.get(job.id) || [];
          jobProcessingTimes.push(processingTime);
          this.processingTimes.set(job.id, jobProcessingTimes);

          job.status = 'completed';
          job.completedAt = new Date().toISOString();
          job.attempts = job.attempts + 1;
          processed++;

          logger.info('Job completed', {
            jobId: job.id,
            type: job.type,
            processingTime,
            attempts: job.attempts
          });

        } catch (error) {
          job.status = 'failed';
          job.lastError = error instanceof Error ? error.message : 'خطأ غير معروف';
          job.attempts = job.attempts + 1;
          failed++;

          // التحقق من إمكانية إعادة المحاولة
          if (job.attempts < job.maxAttempts) {
            // إعادة جدولة للمحاولة التالية
            const delay = this.calculateRetryDelay(job.attempts);
            job.scheduledAt = new Date(Date.now() + delay).toISOString();
            job.status = 'pending';
            
            logger.warn('Job failed, rescheduled for retry', {
              jobId: job.id,
              attempt: job.attempts,
              nextAttemptAt: job.scheduledAt,
              error: job.lastError
            });
          } else {
            logger.error('Job failed permanently', {
              jobId: job.id,
              attempts: job.attempts,
              error: job.lastError
            });
          }

          // مسح من قائمة المعالجة
          this.processingJobs.delete(job.id);
        }
      }

      return { processed, failed };
    } catch (error) {
      logger.error('Queue processing failed', { error });
      return { processed: 0, failed: 0 };
    }
  }

  /**
   * معالجة وظيفة واحدة
   */
  private async processJob(job: QueueJob): Promise<void> {
    switch (job.type) {
      case 'payment_processing':
        await this.processPaymentJob(job);
        break;
      
      case 'late_fee_calculation':
        await this.processLateFeeJob(job);
        break;
      
      case 'retry_failed_payment':
        await this.processRetryPaymentJob(job);
        break;
      
      default:
        logger.warn('Unknown job type', { type: job.type });
    }
  }

  /**
   * معالجة دفعة
   */
  private async processPaymentJob(job: QueueJob): Promise<void> {
    if (!job.paymentId) {
      throw new Error('Payment ID is required for payment_processing job');
    }

    const payment = job.payload.payment;
    
    // التحقق من الحالة الحالية
    const currentState = await paymentStateMachine.getCurrentState(job.paymentId);
    
    // بدء المعالجة
    await paymentStateMachine.startProcessing(job.paymentId, 'queue_system');
    
    // إكمال المعالجة (محاكاة)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // إكمال بنجاح
    await paymentStateMachine.completePayment(job.paymentId, 'queue_system');
  }

  /**
   * معالجة حساب رسوم التأخير
   */
  private async processLateFeeJob(job: QueueJob): Promise<void> {
    const { customerId, contractId, paymentId } = job.payload;

    try {
      // حساب رسوم التأخير
      // TODO: تطبيق منطق حساب رسوم التأخير الحقيقي
      logger.info('Late fee calculation job processed', {
        customerId,
        contractId,
        paymentId
      });

    } catch (error) {
      logger.error('Failed to calculate late fee', { error, job });
      throw error;
    }
  }

  /**
   * إعادة محاولة دفعة فاشلة
   */
  private async processRetryPaymentJob(job: QueueJob): Promise<void> {
    if (!job.paymentId) {
      throw new Error('Payment ID is required for retry_failed_payment job');
    }

    logger.info('Retrying failed payment', {
      paymentId: job.paymentId,
      attempt: job.attempts + 1
    });

    const result = await paymentStateMachine.retryPayment(job.paymentId, 'queue_system');

    if (!result.success) {
      throw new Error(result.error || 'Retry failed');
    }
  }

  /**
   * حساب تأخير المحاولة التالية
   */
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 5s, 10s, 20s
    const baseDelay = 5000; // 5 ثواني
    return baseDelay * Math.pow(2, attempt - 1);
  }

  /**
   * الحصول على إحصائيات Queue
   */
  getQueueStats(): QueueStats {
    const jobs = Array.from(this.queue.values());
    
    const stats: QueueStats = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      avgProcessingTimeMs: 0
    };

    jobs.forEach(job => {
      switch (job.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'running':
          stats.running++;
          break;
        case 'completed':
          stats.completed++;
          // حساب متوسط وقت المعالجة
          const times = this.processingTimes.get(job.id) || [];
          if (times.length > 0) {
            const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
            stats.avgProcessingTimeMs += avg;
          }
          break;
        case 'failed':
          stats.failed++;
          break;
      }
    });

    return stats;
  }

  /**
   * الحصول على الوظائف في queue
   */
  getJobs(filters?: {
    type?: string;
    status?: string;
    paymentId?: string;
    limit?: number;
  }): QueueJob[] {
    let jobs = Array.from(this.queue.values());

    if (filters) {
      if (filters.type) {
        jobs = jobs.filter(job => job.type === filters.type);
      }
      if (filters.status) {
        jobs = jobs.filter(job => job.status === filters.status);
      }
      if (filters.paymentId) {
        jobs = jobs.filter(job => job.paymentId === filters.paymentId);
      }
      if (filters.limit) {
        jobs = jobs.slice(0, filters.limit);
      }
    }

    return jobs.sort((a, b) => {
      // Sort by priority (highest first) then by scheduled time
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });
  }

  /**
   * الحصول على عدد الوظائف
   */
  getJobCount(filters?: {
    type?: string;
    status?: string;
  }): number {
    return this.getJobs(filters).length;
  }

  /**
   * مسح وظيفة من queue
   */
  removeJob(jobId: string): boolean {
    const job = this.queue.get(jobId);
    
    if (!job) {
      return false;
    }

    if (job.status === 'running') {
      // لا يمكن حذف وظيفة قيد التشغيل
      logger.warn('Cannot remove running job', { jobId });
      return false;
    }

    this.queue.delete(jobId);
    this.processingJobs.delete(jobId);
    this.processingTimes.delete(jobId);

    logger.info('Job removed from queue', { jobId, type: job.type });

    return true;
  }

  /**
   * مسح جميع الوظائف المكتملة
   */
  clearCompletedJobs(olderThanDays: number = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let removedCount = 0;
    const jobsToRemove: string[] = [];

    for (const [jobId, job] of this.queue.entries()) {
      if (job.status === 'completed' && job.completedAt) {
        const completionDate = new Date(job.completedAt);
        if (completionDate < cutoffDate) {
          jobsToRemove.push(jobId);
          removedCount++;
        }
      }
    }

    jobsToRemove.forEach(jobId => {
      this.queue.delete(jobId);
      this.processingTimes.delete(jobId);
    });

    if (removedCount > 0) {
      logger.info('Cleared completed jobs', { removedCount, olderThanDays });
    }

    return removedCount;
  }

  /**
   * بدء Job Scheduler لتشغيل queue تلقائياً
   */
  async startScheduler(intervalMs: number = 30000): Promise<void> { // 30 ثانية افتراضياً
    logger.info('Starting job scheduler', { intervalMs });

    const processInterval = setInterval(async () => {
      logger.debug('Scheduler tick', { queueSize: this.queue.size, processingJobsCount: this.processingJobs.size });

      // معالجة الوظائف المعلقة
      await this.startProcessing();

      // تنظيف الوظائف القديمة
      this.clearCompletedJobs(7);

    }, intervalMs);

    // تنظيف Interval عند إيقاف الخدمة (للاستخدام في المستقبل)
    // note: في الإنتاج، يمكن استخدام Web Workers أو Cron Jobs
  }

  /**
   * إيقاف Job Scheduler
   */
  async stopScheduler(): Promise<void> {
    // ملاحظة: تنفيذ فعلي سيحتاج إلى تخزين الـ interval ID
    logger.info('Scheduler stop requested');
  }
}

// Export singleton instance
export const paymentQueueService = new PaymentQueueService();

// Export factory for creating instances with custom config
export function createPaymentQueueService(): PaymentQueueService {
  return new PaymentQueueService();
}
