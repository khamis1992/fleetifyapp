/**
 * Batch Processing System
 *
 * Efficient bulk operations with progress tracking and error handling
 * Supports chunking, parallel processing, and transaction management
 * Optimized for large-scale data operations in FleetifyApp
 */

import { logger } from '@/lib/logger';

export interface BatchOperation<T = any, R = any> {
  id: string;
  items: T[];
  processor: (items: T[], batchIndex: number) => Promise<R[]>;
  options?: BatchProcessorOptions;
}

export interface BatchProcessorOptions {
  batchSize?: number;
  maxConcurrency?: number;
  enableProgressTracking?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  enableTransactions?: boolean;
  timeoutMs?: number;
  onProgress?: (progress: BatchProgress) => void;
  onError?: (error: Error, item: any, batchIndex: number) => void;
  onSuccess?: (result: any, item: any, batchIndex: number) => void;
}

export interface BatchProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining?: number;
  itemsPerSecond?: number;
}

export interface BatchResult<T, R> {
  success: boolean;
  results: R[];
  errors: Array<{
    item: T;
    error: Error;
    batchIndex: number;
  }>;
  progress: BatchProgress;
  metrics: {
    totalProcessingTime: number;
    averageBatchTime: number;
    itemsPerSecond: number;
    successRate: number;
  };
}

export interface ChunkedResult<T, R> {
  chunks: Array<{
    items: T[];
    results: R[];
    errors: Array<{ item: T; error: Error }>;
    batchIndex: number;
    processingTime: number;
  }>;
  totalResults: R[];
  totalErrors: Array<{ item: T; error: Error }>;
  metrics: BatchResult<T, R>['metrics'];
}

/**
 * Batch Processor for efficient bulk operations
 */
export class BatchProcessor {
  private config: Required<BatchProcessorOptions>;
  private activeOperations = new Map<string, BatchOperation>();

  constructor(config: Partial<BatchProcessorOptions> = {}) {
    this.config = {
      batchSize: config.batchSize || 100,
      maxConcurrency: config.maxConcurrency || 5,
      enableProgressTracking: config.enableProgressTracking ?? true,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      enableTransactions: config.enableTransactions ?? false,
      timeoutMs: config.timeoutMs || 30000,
      onProgress: config.onProgress,
      onError: config.onError,
      onSuccess: config.onSuccess
    };

    logger.info('BatchProcessor initialized', {
      config: this.config
    });
  }

  /**
   * Process items in batches
   */
  async process<T, R>(
    items: T[],
    processor: (items: T[], batchIndex: number) => Promise<R[]>,
    options?: Partial<BatchProcessorOptions>
  ): Promise<BatchResult<T, R>> {
    const operationId = this.generateOperationId();
    const mergedOptions = { ...this.config, ...options };

    const operation: BatchOperation<T, R> = {
      id: operationId,
      items,
      processor,
      options: mergedOptions
    };

    this.activeOperations.set(operationId, operation);

    try {
      logger.info('Batch processing started', {
        operationId,
        totalItems: items.length,
        batchSize: mergedOptions.batchSize,
        maxConcurrency: mergedOptions.maxConcurrency
      });

      const startTime = performance.now();
      const result = await this.executeBatchOperation(operation);
      const totalTime = performance.now() - startTime;

      // Calculate final metrics
      result.metrics.totalProcessingTime = totalTime;
      result.metrics.averageBatchTime = totalTime / Math.ceil(items.length / mergedOptions.batchSize);
      result.metrics.itemsPerSecond = result.progress.processed / (totalTime / 1000);
      result.metrics.successRate = result.progress.successful / result.progress.total;

      logger.info('Batch processing completed', {
        operationId,
        success: result.success,
        totalItems: result.progress.total,
        successful: result.progress.successful,
        failed: result.progress.failed,
        processingTime: totalTime.toFixed(2) + 'ms',
        itemsPerSecond: result.metrics.itemsPerSecond.toFixed(2)
      });

      return result;

    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Process items with chunking strategy
   */
  async processChunked<T, R>(
    items: T[],
    processor: (items: T[], batchIndex: number) => Promise<R[]>,
    options?: Partial<BatchProcessorOptions>
  ): Promise<ChunkedResult<T, R>> {
    const mergedOptions = { ...this.config, ...options };
    const chunks = this.chunkItems(items, mergedOptions.batchSize);

    logger.info('Chunked processing started', {
      totalItems: items.length,
      chunkCount: chunks.length,
      batchSize: mergedOptions.batchSize
    });

    const startTime = performance.now();
    const results: ChunkedResult<T, R>['chunks'] = [];
    const totalErrors: Array<{ item: T; error: Error }> = [];
    const allResults: R[] = [];

    // Process chunks with concurrency control
    const semaphore = new Semaphore(mergedOptions.maxConcurrency);

    for (let i = 0; i < chunks.length; i++) {
      const chunkIndex = i;
      const chunk = chunks[i];

      const processChunk = async () => {
        await semaphore.acquire();

        try {
          const chunkStartTime = performance.now();
          const chunkResults = await this.executeWithRetry(
            () => processor(chunk, chunkIndex),
            mergedOptions.retryAttempts,
            mergedOptions.retryDelay
          );
          const chunkTime = performance.now() - chunkStartTime;

          // Extract errors from chunk results (assuming processor returns { success, data, error } format)
          const chunkErrors: Array<{ item: T; error: Error }> = [];
          const validResults: R[] = [];

          for (const result of chunkResults) {
            if (result && typeof result === 'object' && 'error' in result) {
              chunkErrors.push({ item: chunk[chunkResults.indexOf(result)], error: result.error });
            } else {
              validResults.push(result);
            }
          }

          results.push({
            items: chunk,
            results: validResults,
            errors: chunkErrors,
            batchIndex: chunkIndex,
            processingTime: chunkTime
          });

          allResults.push(...validResults);
          totalErrors.push(...chunkErrors);

        } catch (error) {
          const processedError = error instanceof Error ? error : new Error(String(error));

          results.push({
            items: chunk,
            results: [],
            errors: chunk.map(item => ({ item, error: processedError })),
            batchIndex: chunkIndex,
            processingTime: 0
          });

          totalErrors.push(...chunk.map(item => ({ item, error: processedError })));

        } finally {
          semaphore.release();
        }
      };

      // Wait for all chunks to complete
      if (mergedOptions.maxConcurrency > 1) {
        // Process in parallel with concurrency limit
        const processPromise = processChunk();

        if (i === chunks.length - 1) {
          // Wait for the last chunk
          await processPromise;
        }
      } else {
        // Process sequentially
        await processChunk();
      }
    }

    const totalTime = performance.now() - startTime;

    const finalResult: ChunkedResult<T, R> = {
      chunks: results,
      totalResults: allResults,
      totalErrors,
      metrics: {
        totalProcessingTime: totalTime,
        averageBatchTime: totalTime / chunks.length,
        itemsPerSecond: items.length / (totalTime / 1000),
        successRate: allResults.length / items.length
      }
    };

    logger.info('Chunked processing completed', {
      totalChunks: chunks.length,
      successfulChunks: results.filter(r => r.errors.length === 0).length,
      totalResults: allResults.length,
      totalErrors: totalErrors.length,
      processingTime: totalTime.toFixed(2) + 'ms'
    });

    return finalResult;
  }

  /**
   * Cancel active operation
   */
  cancelOperation(operationId: string): boolean {
    return this.activeOperations.delete(operationId);
  }

  /**
   * Get active operations count
   */
  getActiveOperationsCount(): number {
    return this.activeOperations.size;
  }

  /**
   * Get active operations
   */
  getActiveOperations(): BatchOperation[] {
    return Array.from(this.activeOperations.values());
  }

  /**
   * Cancel all operations
   */
  cancelAllOperations(): number {
    const count = this.activeOperations.size;
    this.activeOperations.clear();

    logger.info('All batch operations cancelled', { count });
    return count;
  }

  /**
   * Create progress tracker
   */
  createProgressTracker(total: number): {
    update: (processed: number, successful: number, failed: number) => BatchProgress;
    getProgress: () => BatchProgress;
  } {
    let startTime = Date.now();
    let lastUpdateTime = startTime;
    let lastProcessedCount = 0;

    const update = (processed: number, successful: number, failed: number): BatchProgress => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTime;
      const itemsSinceLastUpdate = processed - lastProcessedCount;

      let estimatedTimeRemaining: number | undefined;
      let itemsPerSecond: number | undefined;

      if (processed > 0 && timeSinceLastUpdate > 1000) {
        itemsPerSecond = itemsSinceLastUpdate / (timeSinceLastUpdate / 1000);
        const remainingItems = total - processed;
        estimatedTimeRemaining = remainingItems / itemsPerSecond * 1000;
      }

      const progress: BatchProgress = {
        total,
        processed,
        successful,
        failed,
        percentage: (processed / total) * 100,
        currentBatch: Math.ceil(processed / this.config.batchSize),
        totalBatches: Math.ceil(total / this.config.batchSize),
        estimatedTimeRemaining,
        itemsPerSecond
      };

      lastUpdateTime = now;
      lastProcessedCount = processed;

      return progress;
    };

    const getProgress = (): BatchProgress => {
      return update(0, 0, 0);
    };

    return { update, getProgress };
  }

  // ============ Private Methods ============

  private async executeBatchOperation<T, R>(
    operation: BatchOperation<T, R>
  ): Promise<BatchResult<T, R>> {
    const { items, processor, options } = operation;
    const chunks = this.chunkItems(items, options.batchSize);

    const progressTracker = this.createProgressTracker(items.length);
    let processed = 0;
    let successful = 0;
    let failed = 0;

    const results: R[] = [];
    const errors: Array<{ item: T; error: Error; batchIndex: number }> = [];

    // Process chunks with concurrency control
    const semaphore = new Semaphore(options.maxConcurrency);
    const batchPromises: Promise<void>[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const batchIndex = i;
      const batch = chunks[i];

      const processBatch = async () => {
        await semaphore.acquire();

        try {
          const batchResults = await this.executeWithRetry(
            () => processor(batch, batchIndex),
            options.retryAttempts,
            options.retryDelay
          );

          // Assume processor returns array of results
          results.push(...batchResults);
          processed += batch.length;
          successful += batchResults.length;

          // Call success callback
          if (options.onSuccess) {
            batchResults.forEach(result => {
              options.onSuccess!(result, batch[0], batchIndex);
            });
          }

        } catch (error) {
          const processedError = error instanceof Error ? error : new Error(String(error));

          batch.forEach(item => {
            errors.push({ item, error: processedError, batchIndex });
          });

          processed += batch.length;
          failed += batch.length;

          // Call error callback
          if (options.onError) {
            batch.forEach(item => {
              options.onError!(processedError, item, batchIndex);
            });
          }

          logger.warn('Batch processing failed', {
            batchIndex,
            batchSize: batch.length,
            error: processedError.message
          });

        } finally {
          semaphore.release();

          // Update progress
          if (options.enableProgressTracking && options.onProgress) {
            const progress = progressTracker.update(processed, successful, failed);
            options.onProgress(progress);
          }
        }
      };

      batchPromises.push(processBatch());
    }

    // Wait for all batches to complete
    await Promise.all(batchPromises);

    const finalProgress = progressTracker.update(processed, successful, failed);

    return {
      success: errors.length === 0,
      results,
      errors,
      progress: finalProgress,
      metrics: {
        totalProcessingTime: 0, // Will be set by caller
        averageBatchTime: 0,    // Will be set by caller
        itemsPerSecond: 0,      // Will be set by caller
        successRate: successful / processed
      }
    };
  }

  private chunkItems<T>(items: T[], batchSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      chunks.push(items.slice(i, i + batchSize));
    }
    return chunks;
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    attempts: number,
    delay: number
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (i < attempts - 1) {
          logger.debug('Retrying batch operation', {
            attempt: i + 1,
            maxAttempts: attempts,
            delay,
            error: lastError.message
          });

          await this.sleep(delay * Math.pow(2, i)); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateOperationId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;

    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }

  availablePermits(): number {
    return this.permits;
  }
}

/**
 * Batch processing utilities for common use cases
 */
export const batchProcessingUtils = {
  /**
   * Batch database operations
   */
  async batchDatabaseOperation<T>(
    items: T[],
    operation: (items: T[]) => Promise<void>,
    batchSize: number = 100
  ): Promise<{ successful: number; failed: number; errors: Error[] }> {
    const processor = new BatchProcessor({ batchSize });

    const result = await processor.process(
      items,
      async (batch, batchIndex) => {
        await operation(batch);
        return batch.map(() => ({ success: true })); // Return success indicator
      }
    );

    return {
      successful: result.progress.successful,
      failed: result.progress.failed,
      errors: result.errors.map(e => e.error)
    };
  },

  /**
   * Batch API calls with rate limiting
   */
  async batchApiCalls<T, R>(
    items: T[],
    apiCall: (item: T) => Promise<R>,
    options: {
      batchSize?: number;
      maxConcurrency?: number;
      delayBetweenBatches?: number;
    } = {}
  ): Promise<Array<{ item: T; result?: R; error?: Error }>> {
    const processor = new BatchProcessor({
      batchSize: options.batchSize || 10,
      maxConcurrency: options.maxConcurrency || 3
    });

    const results: Array<{ item: T; result?: R; error?: Error }> = [];

    await processor.process(
      items,
      async (batch, batchIndex) => {
        const batchResults = await Promise.allSettled(
          batch.map(item => apiCall(item))
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push({ item: batch[index], result: result.value });
          } else {
            results.push({
              item: batch[index],
              error: result.reason instanceof Error ? result.reason : new Error(String(result.reason))
            });
          }
        });

        // Add delay between batches if specified
        if (options.delayBetweenBatches && batchIndex > 0) {
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches!));
        }

        return batchResults.map(() => ({ success: true }));
      }
    );

    return results;
  },

  /**
   * Batch data transformation
   */
  async batchTransform<T, R>(
    items: T[],
    transform: (item: T) => Promise<R>,
    batchSize: number = 50
  ): Promise<R[]> {
    const processor = new BatchProcessor({ batchSize, maxConcurrency: 4 });

    const result = await processor.process(
      items,
      async (batch, batchIndex) => {
        return Promise.all(batch.map(item => transform(item)));
      }
    );

    return result.results;
  },

  /**
   * Batch validation
   */
  async batchValidate<T>(
    items: T[],
    validate: (item: T) => Promise<{ valid: boolean; errors?: string[] }>,
    batchSize: number = 100
  ): Promise<Array<{ item: T; valid: boolean; errors?: string[] }>> {
    const processor = new BatchProcessor({ batchSize, maxConcurrency: 6 });

    const result = await processor.process(
      items,
      async (batch, batchIndex) => {
        return Promise.all(batch.map(item => validate(item)));
      }
    );

    return result.results.map((validationResult, index) => ({
      item: items[index],
      ...validationResult
    }));
  }
};

// Global batch processor instance
export const globalBatchProcessor = new BatchProcessor({
  batchSize: 100,
  maxConcurrency: 5,
  enableProgressTracking: true,
  retryAttempts: 3,
  retryDelay: 1000
});

export default BatchProcessor;