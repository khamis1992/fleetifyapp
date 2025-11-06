/**
 * Job Queue System
 * 
 * Manages background jobs with priority queue.
 */

import { logger } from '@/lib/logger';

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum JobPriority {
  LOW = 0,
  MEDIUM = 50,
  HIGH = 100,
  CRITICAL = 200
}

export interface Job<T = any> {
  id: string;
  name: string;
  type: string;
  data: T;
  priority: JobPriority;
  status: JobStatus;
  progress: number;
  result?: any;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  retries: number;
  maxRetries: number;
}

export type JobHandler<T = any> = (job: Job<T>) => Promise<any>;

/**
 * Job Queue - Singleton
 */
export class JobQueue {
  private static instance: JobQueue;
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private processing = false;
  private maxConcurrent = 3;
  private runningJobs = 0;

  private constructor() {
    logger.info('JobQueue initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }

  /**
   * Register a job handler
   */
  registerHandler<T = any>(jobType: string, handler: JobHandler<T>): void {
    this.handlers.set(jobType, handler as JobHandler);
    logger.info(`Handler registered for job type: ${jobType}`);
  }

  /**
   * Add a job to the queue
   */
  async addJob<T = any>(
    name: string,
    type: string,
    data: T,
    priority: JobPriority = JobPriority.MEDIUM,
    maxRetries: number = 3
  ): Promise<string> {
    const jobId = this.generateJobId();

    const job: Job<T> = {
      id: jobId,
      name,
      type,
      data,
      priority,
      status: JobStatus.PENDING,
      progress: 0,
      createdAt: new Date().toISOString(),
      retries: 0,
      maxRetries
    };

    this.jobs.set(jobId, job);
    logger.info(`Job added to queue: ${name}`, { jobId, type, priority });

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return jobId;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   */
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: JobStatus): Job[] {
    return Array.from(this.jobs.values())
      .filter(job => job.status === status);
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      return false;
    }

    if (job.status === JobStatus.RUNNING) {
      logger.warn(`Cannot cancel running job: ${jobId}`);
      return false;
    }

    job.status = JobStatus.CANCELLED;
    job.completedAt = new Date().toISOString();
    
    logger.info(`Job cancelled: ${jobId}`);
    return true;
  }

  /**
   * Process the job queue
   */
  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.runningJobs < this.maxConcurrent) {
      // Get next job by priority
      const nextJob = this.getNextJob();
      
      if (!nextJob) {
        break; // No more jobs
      }

      this.runningJobs++;
      this.processJob(nextJob).finally(() => {
        this.runningJobs--;
      });
    }

    // Check if any jobs remaining
    if (this.getJobsByStatus(JobStatus.PENDING).length > 0) {
      // Wait a bit then check again
      setTimeout(() => this.processQueue(), 1000);
    } else {
      this.processing = false;
      logger.info('Job queue processing completed');
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    try {
      job.status = JobStatus.RUNNING;
      job.startedAt = new Date().toISOString();
      job.progress = 0;

      logger.info(`Processing job: ${job.name}`, { jobId: job.id });

      const handler = this.handlers.get(job.type);
      
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      // Execute job
      const result = await handler(job);

      // Mark as completed
      job.status = JobStatus.COMPLETED;
      job.progress = 100;
      job.result = result;
      job.completedAt = new Date().toISOString();

      logger.info(`Job completed: ${job.name}`, { jobId: job.id });

    } catch (error) {
      logger.error(`Job failed: ${job.name}`, error);

      job.retries++;

      if (job.retries < job.maxRetries) {
        // Retry
        job.status = JobStatus.PENDING;
        logger.info(`Job will be retried: ${job.name}`, {
          jobId: job.id,
          retry: job.retries,
          maxRetries: job.maxRetries
        });
      } else {
        // Max retries reached
        job.status = JobStatus.FAILED;
        job.error = error instanceof Error ? error.message : String(error);
        job.completedAt = new Date().toISOString();
        
        logger.error(`Job failed after ${job.maxRetries} retries: ${job.name}`);
      }
    }
  }

  /**
   * Get next job by priority
   */
  private getNextJob(): Job | null {
    const pendingJobs = this.getJobsByStatus(JobStatus.PENDING);
    
    if (pendingJobs.length === 0) {
      return null;
    }

    // Sort by priority (highest first), then by creation time (oldest first)
    pendingJobs.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return pendingJobs[0];
  }

  private generateJobId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const jobQueue = JobQueue.getInstance();

