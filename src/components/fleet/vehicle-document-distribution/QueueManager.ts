/**
 * Processing Queue Manager for Vehicle Document Distribution
 */

import { UploadedFile, ProcessingState, ProcessingStatus, QueueManagerOptions } from './types';
import { CHUNK_SIZE, MAX_RETRIES, RETRY_DELAYS, PROGRESS_SAVE_INTERVAL, MAX_CONCURRENT } from './constants';

export class ProcessingQueueManager {
  private files: UploadedFile[] = [];
  private queue: UploadedFile[] = [];
  private status: ProcessingStatus = 'idle';
  private completedFiles: Map<string, UploadedFile> = new Map();
  private failedFiles: Map<string, UploadedFile> = new Map();
  private skippedFiles: Map<string, UploadedFile> = new Map();
  private processingCount = 0;
  private currentChunkIndex = 0;
  private abortController: AbortController | null = null;
  public options: QueueManagerOptions;
  private resumeState: ProcessingState | null = null;
  private startTime: number = 0;
  private completedCount = 0;

  constructor(options: QueueManagerOptions = {}) {
    this.options = options;
  }

  // تحميل حالة محفوظة
  loadResumeState(state: ProcessingState | null): void {
    this.resumeState = state;
    if (state) {
      console.log('📂 Loaded resume state:', state);
    }
  }

  // إعداد الملفات للمعالجة
  setFiles(files: UploadedFile[]): void {
    this.files = files;
    this.queue = [];

    // تصفية الملفات بناءً على حالة الاستئناف
    for (const file of files) {
      if (this.resumeState?.completedFileIds.includes(file.id)) {
        this.completedFiles.set(file.id, file);
      } else if (this.resumeState?.failedFileIds.includes(file.id)) {
        this.failedFiles.set(file.id, file);
      } else if (this.resumeState?.skippedFileIds.includes(file.id)) {
        this.skippedFiles.set(file.id, file);
      } else if (file.status === 'pending') {
        this.queue.push(file);
      }
    }

    console.log(`📊 Queue initialized: ${this.queue.length} pending, ${this.completedFiles.size} completed, ${this.failedFiles.size} failed`);
  }

  // بدء المعالجة
  async start(processFileFn: (file: UploadedFile, signal?: AbortSignal) => Promise<UploadedFile>): Promise<void> {
    if (this.status === 'processing') {
      console.warn('⚠️ Already processing');
      return;
    }

    this.status = 'processing';
    this.abortController = new AbortController();
    this.startTime = Date.now();
    this.completedCount = this.completedFiles.size;

    console.log('🚀 Starting queue processing...');
    console.log(`📦 Total files: ${this.files.length}`);
    console.log(`⏭️  Pre-completed: ${this.completedFiles.size}`);
    console.log(`📝 Pending: ${this.queue.length}`);

    try {
      await this.processQueue(processFileFn);
    } catch (error: any) {
      if (error.message === 'Cancelled') {
        console.log('🛑 Processing cancelled');
        this.status = 'cancelled';
      } else {
        console.error('❌ Queue processing error:', error);
        throw error;
      }
    }

    if (this.status !== 'cancelled') {
      this.status = 'completed';
      console.log('✅ Queue processing completed');
    }
  }

  // معالجة الطابور بالكامل
  private async processQueue(processFileFn: (file: UploadedFile, signal?: AbortSignal) => Promise<UploadedFile>): Promise<void> {
    let fileIndex = this.resumeState?.currentFileIndex || 0;
    const totalFiles = this.files.length;
    let progressCounter = 0;

    while ((this.queue.length > 0 || this.processingCount > 0) && this.status === 'processing') {
      // معالجة chunk واحد في كل مرة
      const chunk: UploadedFile[] = [];

      while (chunk.length < CHUNK_SIZE && this.queue.length > 0 && this.status === 'processing') {
        const file = this.queue.shift();
        if (file) {
          chunk.push(file);
        }
      }

      if (chunk.length === 0) break;

      console.log(`📦 Processing chunk ${this.currentChunkIndex + 1} with ${chunk.length} files...`);

      // معالجة الملفات في الـ chunk بشكل متزامن
      const chunkPromises = chunk.map((file) =>
        this.processSingleFile(file, processFileFn, fileIndex++)
      );

      const results = await Promise.allSettled(chunkPromises);

      // تحديث الإحصائيات
      let completedInChunk = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          completedInChunk++;
        }
      });

      this.currentChunkIndex++;
      progressCounter += chunk.length;

      // حفظ الحالة بشكل دوري
      if (progressCounter >= PROGRESS_SAVE_INTERVAL) {
        this.saveProcessingState(fileIndex);
        progressCounter = 0;
      }

      // إشعار بإكمال الـ chunk
      if (this.options.onChunkComplete) {
        this.options.onChunkComplete(this.currentChunkIndex, completedInChunk, chunk.length);
      }

      // تحديث التقدم الكلي
      const totalCompleted = this.completedFiles.size;
      if (this.options.onProgress) {
        this.options.onProgress(totalCompleted, totalFiles, chunk[chunk.length - 1]);
      }

      // انتظار قصير بين الـ chunks (لتجنب overload)
      if (this.queue.length > 0 && this.status === 'processing') {
        await this.delay(500);
      }
    }

    // حفظ الحالة النهائية
    this.saveProcessingState(fileIndex);
  }

  // معالجة ملف واحد مع إعادة المحاولة
  private async processSingleFile(
    file: UploadedFile,
    processFileFn: (file: UploadedFile, signal?: AbortSignal) => Promise<UploadedFile>,
    fileIndex: number
  ): Promise<UploadedFile> {
    this.processingCount++;
    let lastError: Error | null = null;

    try {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (this.status !== 'processing') {
            throw new Error('Cancelled');
          }

          const startTime = Date.now();
          const result = await this.withTimeout(
            processFileFn(file, this.abortController?.signal),
            60000, // 60s timeout
            `Timeout processing ${file.file.name}`
          );
          const duration = Date.now() - startTime;
          result.processingDuration = duration;

          this.completedFiles.set(file.id, result);
          this.completedCount++;

          if (this.options.onFileComplete) {
            this.options.onFileComplete(result);
          }

          console.log(`✅ [${fileIndex + 1}] ${file.file.name} - ${duration}ms`);
          return result;

        } catch (error: any) {
          lastError = error;

          // إذا تم الإلغاء، أوقف فوراً
          if (error.message === 'Cancelled' || error.message === 'Aborted') {
            throw error;
          }

          // إذا كانت محاولة إعادة، انتظر قبل المحاولة التالية
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
            console.warn(`⚠️ [${fileIndex + 1}] ${file.file.name} - Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
            await this.delay(delay);
          }
        }
      }

      // نفذت جميع المحاولات
      throw lastError || new Error('Max retries exceeded');

    } catch (error: any) {
      const failedFile: UploadedFile = {
        ...file,
        status: error.message === 'Cancelled' ? 'pending' : 'error',
        error: error.message || 'Processing failed',
        retryCount: MAX_RETRIES,
      };

      if (error.message !== 'Cancelled') {
        this.failedFiles.set(file.id, failedFile);
        if (this.options.onFileError) {
          this.options.onFileError(failedFile, error);
        }
        console.error(`❌ [${fileIndex + 1}] ${file.file.name} - ${error.message}`);
      }

      return failedFile;

    } finally {
      this.processingCount--;
    }
  }

  // إيقاف مؤقت
  pause(): void {
    if (this.status === 'processing') {
      this.status = 'paused';
      console.log('⏸️  Processing paused');
    }
  }

  // استئناف
  resume(): void {
    if (this.status === 'paused') {
      this.status = 'processing';
      console.log('▶️  Processing resumed');
    }
  }

  // إلغاء
  cancel(): void {
    this.status = 'cancelled';
    if (this.abortController) {
      this.abortController.abort();
    }
    console.log('🛑 Processing cancelled');
  }

  // تخطي ملف معين
  skipFile(fileId: string): void {
    const file = this.queue.find(f => f.id === fileId);
    if (file) {
      this.queue = this.queue.filter(f => f.id !== fileId);
      const skippedFile: UploadedFile = { ...file, status: 'skipped' };
      this.skippedFiles.set(fileId, skippedFile);
      console.log(`⏭️  Skipped file: ${file.file.name}`);
    }
  }

  // إعادة معالجة الملفات الفاشلة
  retryFailed(): void {
    const failedFiles = Array.from(this.failedFiles.values());
    this.failedFiles.clear();

    for (const file of failedFiles) {
      const retryFile: UploadedFile = {
        ...file,
        status: 'pending',
        error: undefined,
        retryCount: 0,
      };
      this.queue.push(retryFile);
    }

    console.log(`🔄 Queued ${failedFiles.length} failed files for retry`);
  }

  // حفظ حالة المعالجة
  private saveProcessingState(currentFileIndex: number): void {
    const state: ProcessingState = {
      completedFileIds: Array.from(this.completedFiles.keys()),
      failedFileIds: Array.from(this.failedFiles.keys()),
      skippedFileIds: Array.from(this.skippedFiles.keys()),
      currentFileIndex,
      timestamp: Date.now(),
      totalFiles: this.files.length,
    };

    if (this.options.onSaveState) {
      this.options.onSaveState(state);
    }
  }

  // الحصول على التقدم
  getProgress(): { completed: number; total: number; percentage: number } {
    const total = this.files.length;
    const completed = this.completedFiles.size;
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  // الحصول على جميع الملفات المكتملة
  getCompletedFiles(): UploadedFile[] {
    return Array.from(this.completedFiles.values());
  }

  // الحصول على الملفات الفاشلة
  getFailedFiles(): UploadedFile[] {
    return Array.from(this.failedFiles.values());
  }

  // الحصول على الملفات المتخطاة
  getSkippedFiles(): UploadedFile[] {
    return Array.from(this.skippedFiles.values());
  }

  // الحصول على الإحصائيات
  getStats(): {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    pending: number;
    processing: number;
    averageTime: number;
  } {
    const completed = Array.from(this.completedFiles.values());
    const avgTime = completed.length > 0
      ? completed.reduce((sum, f) => sum + (f.processingDuration || 0), 0) / completed.length
      : 0;

    return {
      total: this.files.length,
      completed: this.completedFiles.size,
      failed: this.failedFiles.size,
      skipped: this.skippedFiles.size,
      pending: this.queue.length,
      processing: this.processingCount,
      averageTime: Math.round(avgTime),
    };
  }

  // تقدير الوقت المتبقي
  getEstimatedTimeRemaining(): number {
    const stats = this.getStats();
    const avgTime = stats.averageTime;
    const remaining = stats.pending + stats.processing;

    if (avgTime > 0 && remaining > 0 && this.status === 'processing') {
      const concurrentFactor = Math.min(MAX_CONCURRENT, remaining);
      const estimatedMs = (remaining / concurrentFactor) * avgTime;
      return Math.round(estimatedMs / 1000);
    }

    return 0;
  }

  // الحصول على الحالة
  getStatus(): ProcessingStatus {
    return this.status;
  }

  // مسح الحالة المحفوظة
  clearSavedState(): void {
    // سيتم تنفيذها من خلال localStorage
  }

  // Timeout helper
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new Error(errorMessage)));
        }),
      ]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Delay helper
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
