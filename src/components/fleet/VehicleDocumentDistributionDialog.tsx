/**
 * مكون توزيع المستندات على المركبات
 * يقوم بقراءة رقم اللوحة من صور الاستمارات وتوزيعها على المركبات المناسبة
 * مع معالجة متزامنة محسّنة وإمكانية الاستئناف
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  FileImage,
  Car,
  Check,
  X,
  AlertTriangle,
  Loader2,
  ScanSearch,
  FileCheck,
  Trash2,
  RefreshCw,
  Database,
  Settings,
  Eye,
  EyeOff,
  Edit3,
  Pause,
  Play,
  SkipForward,
  RotateCcw,
  Download,
  MoreHorizontal,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Tesseract from 'tesseract.js';

// استخدام Vehicle OCR عبر Supabase Edge Function (Google Cloud Vision)
interface VehicleOCRResult {
  success: boolean;
  rawText: string;
  extractedData: ExtractedVehicleData;
  confidence: number;
  error?: string;
}

const extractWithVehicleOCR = async (file: File, signal?: AbortSignal): Promise<VehicleOCRResult> => {
  // تحويل الملف إلى base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    if (signal) {
      signal.addEventListener('abort', () => reject(new Error('Aborted')));
    }
    reader.readAsDataURL(file);
  });

  // الحصول على session للتوثيق
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  // إرسال الطلب إلى Edge Function مع timeout أقصر (30s بدلاً من 60s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for faster fallback

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await supabase.functions.invoke('vehicle-ocr', {
      body: { imageBase64: base64 },
    });

    if (response.error) {
      throw new Error(response.error.message || 'OCR failed');
    }

    return response.data as VehicleOCRResult;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Check if it was a timeout or function not found
    if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('Aborted')) {
      console.warn('⏰ Google Cloud Vision timeout (30s), falling back to Tesseract');
      throw new Error('TIMEOUT_FALLBACK_TO_TESSERACT');
    }

    // If function doesn't exist or other error, also fall back
    console.warn('⚠️ Google Cloud Vision unavailable, falling back to Tesseract:', error.message);
    throw new Error('FALLBACK_TO_TESSERACT');
  } finally {
    clearTimeout(timeoutId);
  }
};

interface VehicleDocumentDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// البيانات المستخرجة من استمارة المركبة
interface ExtractedVehicleData {
  plateNumber?: string;
  normalizedPlateNumber?: string;
  vin?: string;
  engineNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  seatingCapacity?: number;
  registrationDate?: string;
  registrationExpiry?: string;
  insuranceExpiry?: string;
}

enum ProcessingError {
  OCR_FAILED = 'ocr_failed',
  NO_ID_FOUND = 'no_id_found',
  VEHICLE_NOT_FOUND = 'not_found',
  UPLOAD_FAILED = 'upload_failed',
  UPDATE_FAILED = 'update_failed',
  NETWORK_ERROR = 'network_error',
}

interface BatchProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  inProgress: number;
  pending: number;
  currentChunk: number;
  totalChunks: number;
  isPaused: boolean;
  stopped: boolean;
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'scanning' | 'matched' | 'not_found' | 'uploaded' | 'error' | 'skipped';
  extractedNumber?: string;
  normalizedNumber?: string;
  extractedData?: ExtractedVehicleData;
  extractedText?: string;
  matchedVehicle?: {
    id: string;
    plate_number: string;
    make: string;
    model: string;
  };
  dataUpdated?: boolean;
  error?: string;
  progress?: number;
  retryCount?: number;
  processingDuration?: number; // بالمللي ثانية
}

// حالة المعالجة المحفوظة للاستئناف
interface ProcessingState {
  completedFileIds: string[];
  failedFileIds: string[];
  skippedFileIds: string[];
  currentFileIndex: number;
  timestamp: number;
  totalFiles: number;
}

// Constants للمعالجة المتزامنة
const CHUNK_SIZE = 10;
const DELAY_BETWEEN_CHUNKS = 2000;
const DELAY_BETWEEN_FILES = 500;
const MAX_RETRIES = 2;
const MAX_CONCURRENT = 2; // Reduced from 3 to 2 for better timeout handling
const LOCAL_STORAGE_KEY = 'vehicle-ocr-processing-state';
const RETRY_DELAYS = [1000, 2000]; // تأخير بالمللي ثانية (exponential backoff)
const PROGRESS_SAVE_INTERVAL = 10; // حفظ الحالة كل 10 ملفات
const STORAGE_KEY_PREFIX = 'vehicle-doc-processing-';

// ==================== Queue Manager ====================
type ProcessingStatus = 'idle' | 'processing' | 'paused' | 'completed' | 'cancelled';

interface QueueManagerOptions {
  onProgress?: (completed: number, total: number, currentFile: UploadedFile) => void;
  onFileComplete?: (file: UploadedFile) => void;
  onFileError?: (file: UploadedFile, error: Error) => void;
  onChunkComplete?: (chunkIndex: number, completedInChunk: number, totalInChunk: number) => void;
  onSaveState?: (state: ProcessingState) => void;
}

class ProcessingQueueManager {
  private files: UploadedFile[] = [];
  private queue: UploadedFile[] = [];
  private status: ProcessingStatus = 'idle';
  private completedFiles: Map<string, UploadedFile> = new Map();
  private failedFiles: Map<string, UploadedFile> = new Map();
  private skippedFiles: Map<string, UploadedFile> = new Map();
  private processingCount = 0;
  private currentChunkIndex = 0;
  private abortController: AbortController | null = null;
  private options: QueueManagerOptions;
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

      // إشعار ب завершاء الـ chunk
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
      // حساب متوقع بناءً على المعدل الحالي والوقت المتوسط
      const concurrentFactor = Math.min(MAX_CONCURRENT, remaining);
      const estimatedMs = (remaining / concurrentFactor) * avgTime;
      return Math.round(estimatedMs / 1000); // بالثواني
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

// ==================== LocalStorage Helpers ====================
const saveProcessingState = (dialogId: string, state: ProcessingState): void => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${dialogId}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save processing state:', error);
  }
};

const loadProcessingState = (dialogId: string): ProcessingState | null => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${dialogId}`;
    const data = localStorage.getItem(key);
    if (data) {
      const state = JSON.parse(data) as ProcessingState;
      // تحقق من أن الحالة ليست قديمة (أقدم من 24 ساعة)
      const dayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - state.timestamp < dayInMs) {
        return state;
      } else {
        // حذف الحالة القديمة
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error('Failed to load processing state:', error);
  }
  return null;
};

const clearProcessingState = (dialogId: string): void => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${dialogId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear processing state:', error);
  }
};

// ==================== Helper Functions ====================
const normalizeVehicleNumber = (number: string): string => {
  const digitsOnly = number.replace(/\D/g, '');
  const normalized = digitsOnly.replace(/^0+/, '');
  return normalized || '0';
};

const extractVehicleNumbers = (text: string): string[] => {
  const numbers: string[] = [];
  let match;

  const cleanText = text
    .replace(/[‏‎]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const vehicleNoPatterns = [
    /vehicle\s*no\.?\s*[:\.]?\s*(\d{3,8})/gi,
    /vehicle\s*n[o0]\.?\s*[:\.]?\s*(\d{3,8})/gi,
    /veh(?:icle)?\s*n[o0]\.?\s*(\d{3,8})/gi,
    /vehicle[^0-9]*(\d{4,8})/gi,
  ];

  for (const pattern of vehicleNoPatterns) {
    while ((match = pattern.exec(cleanText)) !== null) {
      if (!numbers.includes(match[1])) {
        numbers.push(match[1]);
      }
    }
  }

  const arabicPatterns = [
    /رقم\s*اللوح[ةه]\s*[:\.]?\s*(\d{3,8})/g,
    /اللوح[ةه]\s*[:\.]?\s*(\d{3,8})/g,
  ];

  for (const pattern of arabicPatterns) {
    while ((match = pattern.exec(cleanText)) !== null) {
      if (!numbers.includes(match[1])) {
        numbers.push(match[1]);
      }
    }
  }

  const barcodePatterns = [
    /\*\s*([\d\s]{5,20})\s*\*/g,
    /\*\s*(\d[\d\s]*\d)\s*\*/g,
  ];
  for (const pattern of barcodePatterns) {
    while ((match = pattern.exec(cleanText)) !== null) {
      const digits = match[1].replace(/\s/g, '');
      if (digits.length >= 4 && digits.length <= 8 && !numbers.includes(digits)) {
        numbers.push(digits);
      }
    }
  }

  const spacedDigitsPattern = /(\d\s+\d\s+\d\s+\d(?:\s+\d)*)/g;
  while ((match = spacedDigitsPattern.exec(cleanText)) !== null) {
    const digits = match[1].replace(/\s/g, '');
    if (digits.length >= 4 && digits.length <= 8 && !numbers.includes(digits)) {
      numbers.push(digits);
    }
  }

  const qatarPlatePattern = /\b(0{1,3}\d{3,6})\b/g;
  while ((match = qatarPlatePattern.exec(cleanText)) !== null) {
    const num = match[1];
    if (!numbers.includes(num) && num.length >= 4 && num.length <= 8) {
      numbers.push(num);
    }
  }

  const generalNumberPattern = /(?<!\d)(\d{5,8})(?!\d)/g;
  while ((match = generalNumberPattern.exec(cleanText)) !== null) {
    const num = match[1];
    const isYear = /^(19|20)\d{2}$/.test(num);
    const isDate = /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(num);
    if (!numbers.includes(num) && !isYear && !isDate) {
      numbers.push(num);
    }
  }

  const afterVehiclePattern = /vehicle[^\d]*?(\d+)/gi;
  while ((match = afterVehiclePattern.exec(cleanText)) !== null) {
    const num = match[1];
    if (!numbers.includes(num) && num.length >= 4 && num.length <= 8) {
      numbers.push(num);
    }
  }

  return numbers;
};

const extractAllVehicleData = (text: string): ExtractedVehicleData => {
  const data: ExtractedVehicleData = {};
  const cleanText = text.replace(/\s+/g, ' ').trim();

  const platePatterns = [
    /vehicle\s*n[o0]\.?\s*[:\.]?\s*(\d{3,8})/i,
    /veh(?:icle)?\s*n[o0]\.?\s*(\d{3,8})/i,
    /رقم\s*اللوح[ةه]\s*[:\.]?\s*(\d{3,8})/,
    /\*\s*([\d\s]{5,15})\s*\*/,
  ];
  for (const pattern of platePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const plateNum = match[1].replace(/\s/g, '');
      if (plateNum.length >= 4) {
        data.plateNumber = plateNum;
        data.normalizedPlateNumber = normalizeVehicleNumber(plateNum);
        break;
      }
    }
  }

  const vinPatterns = [
    /chassis\s*n[o0]\.?\s*[:\.]?\s*([A-Z0-9]{15,17})/i,
    /رقم\s*القاعد[ةه]\s*[:\.]?\s*([A-Z0-9]{15,17})/i,
    /vin\s*[:\.]?\s*([A-Z0-9]{15,17})/i,
    /([A-Z][A-Z0-9]{15,16})/i,
  ];
  for (const pattern of vinPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const vin = match[1].replace(/\s/g, '').toUpperCase();
      if (vin.length >= 15 && /[A-Z]/.test(vin) && /\d/.test(vin)) {
        data.vin = vin;
        break;
      }
    }
  }

  const enginePatterns = [
    /engine\s*n[o0]\.?\s*[:\.]?\s*([A-Z0-9]{4,15})/i,
    /رقم\s*المحرك\s*[:\.]?\s*([A-Z0-9]{4,15})/i,
    /(?:engine|محرك)[:\s]+([A-Z]?\d{4,10})/i,
  ];
  for (const pattern of enginePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.engineNumber = match[1].replace(/\s/g, '').toUpperCase();
      break;
    }
  }

  const yearPatterns = [
    /سن[ةه]\s*الصنع\s*[:\.]?\s*(\d{4})/,
    /year\s*[:\.]?\s*(\d{4})/i,
    /model\s*year\s*[:\.]?\s*(\d{4})/i,
    /(\d{4})\s*سن[ةه]\s*الصنع/,
  ];
  for (const pattern of yearPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const year = parseInt(match[1]);
      if (year >= 1990 && year <= new Date().getFullYear() + 1) {
        data.year = year;
        break;
      }
    }
  }

  const modelPatterns = [
    /الطراز\s*[:\.]?\s*([A-Z0-9\-]+)/i,
    /model\s*[:\.]?\s*([A-Z0-9\-]+)/i,
    /([A-Z]{2,3}\d{1,2})/i,
  ];
  for (const pattern of modelPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const model = match[1].trim().toUpperCase();
      if (model.length >= 2 && model.length <= 20) {
        data.model = model;
        break;
      }
    }
  }

  const knownMakes = [
    'تويوتا', 'نيسان', 'هوندا', 'مازدا', 'ميتسوبيشي', 'سوزوكي', 'لكزس', 'إنفينيتي',
    'هيونداي', 'كيا', 'جينيسيس', 'فورد', 'شيفروليه', 'جي ام سي', 'دودج', 'جيب', 'كرايسلر',
    'مرسيدس', 'بي ام دبليو', 'أودي', 'فولكس واجن', 'بورش', 'لاند روفر', 'جاكوار', 'رينج روفر',
    'جي ايه سي', 'جيلي', 'شيري', 'ام جي', 'بي واي دي', 'جريت وول', 'هافال', 'چانجان',
    'TOYOTA', 'NISSAN', 'HONDA', 'MAZDA', 'MITSUBISHI', 'SUZUKI', 'LEXUS', 'INFINITI',
    'HYUNDAI', 'KIA', 'GENESIS', 'FORD', 'CHEVROLET', 'GMC', 'DODGE', 'JEEP', 'CHRYSLER',
    'MERCEDES', 'BMW', 'AUDI', 'VOLKSWAGEN', 'PORSCHE', 'LAND ROVER', 'JAGUAR', 'RANGE ROVER',
    'GAC', 'GEELY', 'CHERY', 'MG', 'BYD', 'GREAT WALL', 'HAVAL', 'CHANGAN',
    'جي ايه سي موتور', 'GAC MOTOR'
  ];

  for (const make of knownMakes) {
    if (cleanText.includes(make)) {
      data.make = make;
      break;
    }
  }

  const arabicColors: Record<string, string> = {
    'بني': 'بني', 'brown': 'بني',
    'ابيض': 'أبيض', 'أبيض': 'أبيض', 'white': 'أبيض',
    'اسود': 'أسود', 'أسود': 'أسود', 'black': 'أسود',
    'فضي': 'فضي', 'silver': 'فضي',
    'رمادي': 'رمادي', 'grey': 'رمادي', 'gray': 'رمادي',
    'احمر': 'أحمر', 'أحمر': 'أحمر', 'red': 'أحمر',
    'ازرق': 'أزرق', 'أزرق': 'أزرق', 'blue': 'أزرق',
    'اخضر': 'أخضر', 'أخضر': 'أخضر', 'green': 'أخضر',
    'ذهبي': 'ذهبي', 'gold': 'ذهبي',
    'برتقالي': 'برتقالي', 'orange': 'برتقالي',
    'بيج': 'بيج', 'beige': 'بيج',
  };

  for (const [key, value] of Object.entries(arabicColors)) {
    if (cleanText.toLowerCase().includes(key.toLowerCase())) {
      data.color = value;
      break;
    }
  }

  const seatsPatterns = [
    /المقاعد\s*[:\.]?\s*0*(\d{1,2})/,
    /seats?\s*[:\.]?\s*0*(\d{1,2})/i,
    /seating\s*(?:capacity)?\s*[:\.]?\s*0*(\d{1,2})/i,
    /0{0,2}(\d{1,2})\s*مقاعد/,
  ];
  for (const pattern of seatsPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const seats = parseInt(match[1]);
      if (seats >= 2 && seats <= 50) {
        data.seatingCapacity = seats;
        break;
      }
    }
  }

  const datePattern = /(\d{4})[-/](\d{2})[-/](\d{2})/g;
  const dates: string[] = [];
  let dateMatch;
  while ((dateMatch = datePattern.exec(cleanText)) !== null) {
    dates.push(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
  }

  if (cleanText.includes('انتهاء') || cleanText.includes('Exp')) {
    const expiryMatch = cleanText.match(/(?:exp\.?\s*date|انتهاء\s*الترخيص)[:\s]*(\d{4}[-/]\d{2}[-/]\d{2})/i);
    if (expiryMatch) {
      data.registrationExpiry = parseDate(expiryMatch[1]);
    }
  }

  if (cleanText.includes('Reg') || cleanText.includes('تسجيل')) {
    const regMatch = cleanText.match(/(?:reg\.?\s*date|تاريخ\s*(?:أول\s*)?تسجيل)[:\s]*(\d{4}[-/]\d{2}[-/]\d{2})/i);
    if (regMatch) {
      data.registrationDate = parseDate(regMatch[1]);
    }
  }

  if (cleanText.includes('انتهاء التأمين') || cleanText.includes('insurance')) {
    const insMatch = cleanText.match(/(?:انتهاء\s*التأمين|insurance\s*expiry)[:\s]*(\d{4}[-/]\d{2}[-/]\d{2})/i);
    if (insMatch) {
      data.insuranceExpiry = parseDate(insMatch[1]);
    }
  }

  if (dates.length > 0 && !data.registrationExpiry) {
    data.registrationExpiry = dates[dates.length - 1];
  }

  return data;
};

const parseDate = (dateStr: string): string | undefined => {
  try {
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return undefined;

    let year: number, month: number, day: number;

    if (parts[0].length === 4) {
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
      day = parseInt(parts[2]);
    } else {
      day = parseInt(parts[0]);
      month = parseInt(parts[1]);
      year = parseInt(parts[2]);
    }

    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      return undefined;
    }

    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  } catch {
    return undefined;
  }
};

// ==================== Components ====================
const ExtractedDataPreview: React.FC<{ data: ExtractedVehicleData; dataUpdated?: boolean }> = ({ data, dataUpdated }) => {
  const fields = [
    { label: 'رقم الهيكل', value: data.vin },
    { label: 'رقم المحرك', value: data.engineNumber },
    { label: 'الشركة', value: data.make },
    { label: 'الطراز', value: data.model },
    { label: 'السنة', value: data.year?.toString() },
    { label: 'اللون', value: data.color },
    { label: 'المقاعد', value: data.seatingCapacity?.toString() },
    { label: 'انتهاء الترخيص', value: data.registrationExpiry },
    { label: 'انتهاء التأمين', value: data.insuranceExpiry },
  ].filter(f => f.value);

  if (fields.length === 0) return null;

  return (
    <div className={cn(
      "mt-2 p-2 rounded-lg text-xs",
      dataUpdated ? "bg-emerald-50 border border-emerald-200" : "bg-slate-100 border border-slate-200"
    )}>
      {dataUpdated && (
        <div className="flex items-center gap-1 text-emerald-600 font-medium mb-1">
          <Check className="w-3 h-3" />
          تم تحديث البيانات
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex items-center gap-1">
            <span className="text-slate-500">{label}:</span>
            <span className="font-medium text-slate-700 truncate" title={value}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}ثانية`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}د ${secs}ث`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}س ${minutes}د`;
  }
};

// ==================== Main Dialog Component ====================
const VehicleDocumentDistributionDialog: React.FC<VehicleDocumentDistributionDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const dialogId = useRef(`dialog-${Date.now()}`);

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [showDebugText, setShowDebugText] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [manualPlateNumber, setManualPlateNumber] = useState('');
  const [queueManager] = useState(() => new ProcessingQueueManager());
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [hasResumeState, setHasResumeState] = useState(false);
  const [showRetryFailed, setShowRetryFailed] = useState(false);
  const [visibleFileCount, setVisibleFileCount] = useState(50);

  // جلب جميع المركبات
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-for-matching', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model')
        .eq('company_id', companyId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!companyId,
  });

  // خريطة المركبات للمطابقة السريعة
  const vehicleMap = React.useMemo(() => {
    const map = new Map<string, typeof vehicles[0]>();
    vehicles.forEach(vehicle => {
      if (vehicle.plate_number) {
        map.set(vehicle.plate_number, vehicle);
        const normalized = normalizeVehicleNumber(vehicle.plate_number);
        map.set(normalized, vehicle);
      }
    });
    return map;
  }, [vehicles]);

  // التحقق من حالة الاستئناف عند فتح الحوار
  useEffect(() => {
    if (open) {
      const savedState = loadProcessingState(dialogId.current);
      if (savedState && savedState.completedFileIds.length > 0) {
        setHasResumeState(true);
        console.log('📂 Found resume state:', savedState);
      }
    }
  }, [open]);

  // مطابقة المركبة
  const findMatchingVehicle = useCallback((extractedNumbers: string[]) => {
    for (const num of extractedNumbers) {
      const normalized = normalizeVehicleNumber(num);

      if (vehicleMap.has(num)) {
        return { vehicle: vehicleMap.get(num)!, extractedNumber: num, normalizedNumber: normalized };
      }

      if (vehicleMap.has(normalized)) {
        return { vehicle: vehicleMap.get(normalized)!, extractedNumber: num, normalizedNumber: normalized };
      }

      for (const vehicle of vehicles) {
        if (vehicle.plate_number) {
          const vehicleNormalized = normalizeVehicleNumber(vehicle.plate_number);
          if (vehicleNormalized === normalized) {
            return { vehicle, extractedNumber: num, normalizedNumber: normalized };
          }
        }
      }
    }
    return null;
  }, [vehicleMap, vehicles]);

  // معالجة صورة واحدة
  const processImage = useCallback(async (uploadedFile: UploadedFile, signal?: AbortSignal): Promise<UploadedFile> => {
    try {
      setFiles(prev => prev.map(f =>
        f.id === uploadedFile.id ? { ...f, status: 'scanning' as const, progress: 0 } : f
      ));

      let extractedText = '';
      let extractedNumbers: string[] = [];
      let ocrMethod = 'tesseract';
      let serverExtractedData: ExtractedVehicleData = {};

      const updateProgress = (progress: number) => {
        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id ? { ...f, progress } : f
        ));
      };

      // Method 1: Google Cloud Vision (30s timeout, then fallback)
      try {
        console.log('🔍 Trying Google Cloud Vision (30s timeout)...');
        updateProgress(20);

        const ocrResult = await extractWithVehicleOCR(uploadedFile.file, signal);

        if (ocrResult.success && ocrResult.rawText) {
          extractedText = ocrResult.rawText;
          serverExtractedData = ocrResult.extractedData;
          ocrMethod = 'google-vision';

          console.log('✅ Google Vision result:', extractedText.substring(0, 300));

          if (serverExtractedData.plateNumber) {
            extractedNumbers = [serverExtractedData.plateNumber];
          } else {
            extractedNumbers = extractVehicleNumbers(extractedText);
          }

          updateProgress(90);
        } else {
          throw new Error(ocrResult.error || 'OCR failed');
        }
      } catch (error: any) {
        // Check if it's a timeout or fallback signal
        if (error.message === 'TIMEOUT_FALLBACK_TO_TESSERACT' ||
            error.message === 'FALLBACK_TO_TESSERACT') {
          console.warn('⚠️ Falling back to Tesseract due to timeout/unavailability');
          // Update UI to show fallback
          setFiles(prev => prev.map(f =>
            f.id === uploadedFile.id ? {
              ...f,
              status: 'scanning' as const,
              extractedData: { ...f.extractedData, note: 'Using fallback OCR method...' }
            } : f
          ));
        } else {
          console.warn('⚠️ Google Cloud Vision failed:', error.message);
        }

        // Method 2: Tesseract.js (immediate fallback)
        console.log('📝 Using Tesseract.js fallback...');
        ocrMethod = 'tesseract';
        updateProgress(40);

        const result = await Tesseract.recognize(uploadedFile.file, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              updateProgress(40 + Math.round(m.progress * 50));
            }
          },
        });

        extractedText = result.data.text;
        extractedNumbers = extractVehicleNumbers(extractedText);
        console.log('📝 Tesseract result:', extractedText.substring(0, 200));
      }

      updateProgress(100);

      const fullText = extractedText;
      const localExtractedData = extractAllVehicleData(fullText);
      const extractedData: ExtractedVehicleData = {
        ...localExtractedData,
        ...serverExtractedData,
      };

      if (!extractedData.plateNumber && extractedNumbers.length > 0) {
        extractedData.plateNumber = extractedNumbers[0];
        extractedData.normalizedPlateNumber = normalizeVehicleNumber(extractedNumbers[0]);
      }

      if (!extractedData.plateNumber && extractedNumbers.length === 0) {
        const anyNumber = fullText.match(/\d{4,8}/);
        if (anyNumber) {
          extractedData.plateNumber = anyNumber[0];
          extractedData.normalizedPlateNumber = normalizeVehicleNumber(anyNumber[0]);
          extractedNumbers.push(anyNumber[0]);
        }
      }

      if (!extractedData.plateNumber && extractedNumbers.length === 0) {
        const textPreview = fullText.substring(0, 500).replace(/\s+/g, ' ');
        return {
          ...uploadedFile,
          status: 'not_found',
          extractedData,
          extractedText: textPreview,
          error: `لم يتم العثور على رقم لوحة تلقائياً. يرجى إدخال الرقم يدوياً.`,
        };
      }

      const match = findMatchingVehicle(
        extractedData.plateNumber ? [extractedData.plateNumber, ...extractedNumbers] : extractedNumbers
      );

      if (match) {
        return {
          ...uploadedFile,
          status: 'matched',
          extractedNumber: match.extractedNumber,
          normalizedNumber: match.normalizedNumber,
          extractedData,
          extractedText: fullText.substring(0, 500),
          matchedVehicle: match.vehicle,
        };
      } else {
        return {
          ...uploadedFile,
          status: 'not_found',
          extractedNumber: extractedData.plateNumber || extractedNumbers[0],
          normalizedNumber: extractedData.normalizedPlateNumber || normalizeVehicleNumber(extractedNumbers[0]),
          extractedData,
          extractedText: fullText.substring(0, 500),
          error: `لم يتم العثور على مركبة بالرقم: ${extractedData.plateNumber || extractedNumbers[0]}`,
        };
      }
    } catch (error: any) {
      return {
        ...uploadedFile,
        status: 'error',
        error: error.message || 'فشل في قراءة الصورة',
      };
    }
  }, [findMatchingVehicle]);

  // تحديث بيانات المركبة
  const updateVehicleData = async (vehicleId: string, data: ExtractedVehicleData): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};

      if (data.vin) updateData.vin = data.vin;
      if (data.engineNumber) updateData.engine_number = data.engineNumber;
      if (data.make) updateData.make = data.make;
      if (data.model) updateData.model = data.model;
      if (data.year) updateData.year = data.year;
      if (data.color) updateData.color = data.color;
      if (data.seatingCapacity) updateData.seating_capacity = data.seatingCapacity;
      if (data.registrationDate) updateData.registration_date = data.registrationDate;
      if (data.registrationExpiry) updateData.registration_expiry = data.registrationExpiry;
      if (data.insuranceExpiry) updateData.insurance_expiry = data.insuranceExpiry;

      if (Object.keys(updateData).length === 0) {
        return false;
      }

      const { error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', vehicleId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['vehicle-details', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      return true;
    } catch (error) {
      console.error('Error updating vehicle:', error);
      return false;
    }
  };

  // رفع الملفات المطابقة
  const uploadMatchedFiles = async () => {
    setIsUploading(true);
    const matchedFiles = files.filter(f => f.status === 'matched' && f.matchedVehicle);
    let successCount = 0;
    let errorCount = 0;
    let dataUpdatedCount = 0;

    for (const file of matchedFiles) {
      try {
        const fileExt = file.file.name.split('.').pop();
        const fileName = `vehicle-documents/${file.matchedVehicle!.id}/${Date.now()}_registration.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('vehicle_documents')
          .insert({
            vehicle_id: file.matchedVehicle!.id,
            document_type: 'registration',
            document_name: `استمارة المركبة - ${file.matchedVehicle!.plate_number}`,
            document_url: fileName,
            is_active: true,
          });

        if (dbError) throw dbError;

        let dataUpdated = false;
        if (file.extractedData) {
          dataUpdated = await updateVehicleData(file.matchedVehicle!.id, file.extractedData);
          if (dataUpdated) dataUpdatedCount++;
        }

        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'uploaded' as const, dataUpdated } : f
        ));

        successCount++;

        queryClient.invalidateQueries({
          queryKey: ['vehicle-document-files', file.matchedVehicle!.id]
        });
      } catch (error: any) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'error' as const, error: error.message } : f
        ));
        errorCount++;
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      const msg = dataUpdatedCount > 0
        ? `تم رفع ${successCount} استمارة وتحديث بيانات ${dataUpdatedCount} مركبة`
        : `تم رفع ${successCount} استمارة بنجاح`;
      toast.success(msg);
    }
    if (errorCount > 0) {
      toast.error(`فشل رفع ${errorCount} استمارة`);
    }
  };

  // بدء معالجة جميع الملفات
  const processAllFiles = async () => {
    const savedState = loadProcessingState(dialogId.current);
    queueManager.loadResumeState(savedState);
    queueManager.setFiles(files);

    // إعداد callbacks
    queueManager.options = {
      onProgress: (completed, total) => {
        setOverallProgress(Math.round((completed / total) * 100));
      },
      onFileComplete: (file) => {
        setFiles(prev => prev.map(f => f.id === file.id ? file : f));
      },
      onFileError: (file, error) => {
        setFiles(prev => prev.map(f => f.id === file.id ? file : f));
      },
      onChunkComplete: (chunkIndex, completed, total) => {
        console.log(`📦 Chunk ${chunkIndex} completed: ${completed}/${total}`);
        // تحديث الوقت المتبقي
        setEstimatedTime(queueManager.getEstimatedTimeRemaining());
      },
      onSaveState: (state) => {
        saveProcessingState(dialogId.current, state);
      },
    };

    setProcessingStatus('processing');
    setHasResumeState(false);

    try {
      await queueManager.start(processImage);

      // الانتهاء من المعالجة
      const stats = queueManager.getStats();
      console.log('📊 Final stats:', stats);

      toast.success(
        `اكتملت المعالجة: ${stats.completed} نجح، ${stats.failed} فشل، ${stats.skipped} تم تخطيهم`
      );

      // مسح الحالة المحفوظة
      clearProcessingState(dialogId.current);

    } catch (error: any) {
      console.error('Processing error:', error);
      toast.error(`خطأ في المعالجة: ${error.message}`);
    }

    setProcessingStatus('completed');
    setEstimatedTime(0);
  };

  // إيقاف مؤقت
  const pauseProcessing = () => {
    queueManager.pause();
    setProcessingStatus('paused');
    toast.info('تم إيقاف المعالجة مؤقتاً');
  };

  // استئناف
  const resumeProcessing = () => {
    queueManager.resume();
    setProcessingStatus('processing');
    toast.info('تم استئناف المعالجة');
  };

  // إلغاء
  const cancelProcessing = () => {
    queueManager.cancel();
    setProcessingStatus('cancelled');
    setOverallProgress(0);
    setEstimatedTime(0);
    toast.info('تم إلغاء المعالجة');
  };

  // تخطي ملف
  const skipFile = (fileId: string) => {
    queueManager.skipFile(fileId);
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'skipped' as const } : f
    ));
    toast.info('تم تخطي الملف');
  };

  // إعادة معالجة الفاشلة
  const retryFailedFiles = () => {
    queueManager.retryFailed();
    setShowRetryFailed(false);

    // إعادة تعيين حالات الملفات
    setFiles(prev => prev.map(f => {
      if (f.status === 'error') {
        return { ...f, status: 'pending' as const, error: undefined, retryCount: 0 };
      }
      return f;
    }));

    toast.info('تمت إضافة الملفات الفاشلة إلى الطابور');
  };

  // استئناف من حالة محفوظة
  const resumeFromSavedState = () => {
    const savedState = loadProcessingState(dialogId.current);
    if (savedState) {
      queueManager.loadResumeState(savedState);
      queueManager.setFiles(files);

      // تحديث الملفات بناءً على الحالة المحفوظة
      setFiles(prev => prev.map(f => {
        if (savedState.completedFileIds.includes(f.id)) {
          return { ...f, status: 'matched' as const };
        }
        return f;
      }));

      setHasResumeState(false);
      toast.info(`تم استعادة الحالة: ${savedState.completedFileIds.length} ملف مكتمل`);
    }
  };

  // Export error report as CSV
  const exportErrorReport = () => {
    const failedFiles = files.filter(f => f.status === 'error' || f.status === 'not_found');

    if (failedFiles.length === 0) {
      toast.info('لا توجد أخطاء لتصديرها');
      return;
    }

    const headers = ['File Name', 'Status', 'Error', 'Extracted Plate', 'Retries'];
    const rows = failedFiles.map(f => [
      f.file.name,
      f.status,
      f.error || 'Unknown error',
      f.extractedNumber || 'N/A',
      (f.retryCount || 0).toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vehicle-ocr-errors-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast.success('تم تصدير تقرير الأخطاء بنجاح');
  };

  // السحب والإفلات
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff']
    },
    maxSize: 20 * 1024 * 1024,
    multiple: true,
  });

  // الإدخال اليدوي
  const handleManualPlateEntry = (fileId: string) => {
    if (!manualPlateNumber.trim()) return;

    const normalized = normalizeVehicleNumber(manualPlateNumber);
    const match = findMatchingVehicle([manualPlateNumber, normalized]);

    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;

      if (match) {
        return {
          ...f,
          status: 'matched' as const,
          extractedNumber: manualPlateNumber,
          normalizedNumber: normalized,
          matchedVehicle: match.vehicle,
          error: undefined,
        };
      } else {
        return {
          ...f,
          status: 'not_found' as const,
          extractedNumber: manualPlateNumber,
          normalizedNumber: normalized,
          error: `لم يتم العثور على مركبة بالرقم: ${manualPlateNumber}`,
        };
      }
    }));

    setEditingFileId(null);
    setManualPlateNumber('');

    if (match) {
      toast.success(`تم مطابقة المركبة: ${match.vehicle.plate_number}`);
    } else {
      toast.error(`لم يتم العثور على مركبة بالرقم: ${manualPlateNumber}`);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const clearAllFiles = () => {
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    clearProcessingState(dialogId.current);
    setHasResumeState(false);
  };

  const handleClose = () => {
    if (processingStatus === 'processing') {
      if (!confirm('المعالجة جارية. هل تريد الإلغاء والإغلاق؟')) {
        return;
      }
      cancelProcessing();
    }
    clearAllFiles();
    onOpenChange(false);
  };

  // الإحصائيات
  const stats = React.useMemo(() => {
    const matchedFiles = files.filter(f => f.status === 'matched');
    const withExtractedData = matchedFiles.filter(f =>
      f.extractedData && Object.keys(f.extractedData).filter(k =>
        k !== 'plateNumber' && k !== 'normalizedPlateNumber' && (f.extractedData as any)[k]
      ).length > 0
    );

    return {
      total: files.length,
      pending: files.filter(f => f.status === 'pending').length,
      scanning: files.filter(f => f.status === 'scanning').length,
      matched: matchedFiles.length,
      withData: withExtractedData.length,
      notFound: files.filter(f => f.status === 'not_found').length,
      uploaded: files.filter(f => f.status === 'uploaded').length,
      dataUpdated: files.filter(f => f.dataUpdated).length,
      error: files.filter(f => f.status === 'error').length,
      skipped: files.filter(f => f.status === 'skipped').length,
    };
  }, [files]);

  const getStatusBadge = (file: UploadedFile) => {
    switch (file.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-slate-50">في الانتظار</Badge>;
      case 'scanning':
        return <Badge className="bg-blue-100 text-blue-700">جاري المسح... {file.progress}%</Badge>;
      case 'matched':
        return <Badge className="bg-green-100 text-green-700">تم المطابقة</Badge>;
      case 'not_found':
        return <Badge className="bg-amber-100 text-amber-700">لم يتم العثور</Badge>;
      case 'uploaded':
        return <Badge className="bg-emerald-100 text-emerald-700">تم الرفع</Badge>;
      case 'error':
        return <Badge variant="destructive">خطأ</Badge>;
      case 'skipped':
        return <Badge variant="outline" className="bg-slate-100 text-slate-600">تم التخطي</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ScanSearch className="w-5 h-5 text-teal-600" />
            توزيع المستندات وتحديث البيانات
          </DialogTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            <span>قم برفع صور استمارات المركبات:</span>
            <ul className="list-disc list-inside text-xs space-y-0.5 mt-1 mr-2">
              <li>يستخدم النظام OCR متقدم مع دعم للصور غير الواضحة</li>
              <li>إذا استغرت المعالجة وقتاً طويلاً، سيتم التحويل التلقائي لطريقة بديلة</li>
              <li>يتم معالجة صورتين في كل مرة لضمان الجودة</li>
              <li>إمكانية الاستئناف عند الانقطاع</li>
              <li>إعادة محاولة تلقائية عند الفشل</li>
              <li>استخراج: رقم اللوحة، رقم الهيكل، المحرك، التواريخ</li>
            </ul>
            <div className="flex items-center gap-1 text-blue-600 mt-2">
              <Database className="w-3 h-3" />
              <span className="text-xs font-medium">OCR عبر Supabase Edge Function + Tesseract Fallback</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* منطقة السحب والإفلات */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
              isDragActive
                ? "border-teal-500 bg-teal-50 scale-[1.02] shadow-lg"
                : "border-slate-200 bg-slate-50/50 hover:border-teal-400 hover:bg-teal-50/50"
            )}
          >
            <input {...getInputProps()} />
            <motion.div
              animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Upload className={cn(
                "w-10 h-10 mx-auto mb-3 transition-colors",
                isDragActive ? "text-teal-600" : "text-slate-400"
              )} />
            </motion.div>
            {isDragActive ? (
              <p className="text-sm font-medium text-teal-700">
                أفلت الملفات هنا...
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700">
                  اسحب وأفلت صور الاستمارات هنا
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  أو اضغط لاختيار الملفات (PNG, JPG, JPEG, WebP)
                </p>
              </>
            )}
          </div>

          {/* شريط الإحصائيات */}
          {files.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 md:gap-4 p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium">{stats.total} ملف</span>
              </div>
              {stats.matched > 0 && (
                <Badge className="bg-green-100 text-green-700">
                  <Check className="w-3 h-3 ml-1" />
                  {stats.matched} مطابق
                </Badge>
              )}
              {stats.withData > 0 && (
                <Badge className="bg-blue-100 text-blue-700">
                  <Database className="w-3 h-3 ml-1" />
                  {stats.withData} بيانات
                </Badge>
              )}
              {stats.error > 0 && (
                <Badge className="bg-red-100 text-red-700">
                  <AlertTriangle className="w-3 h-3 ml-1" />
                  {stats.error} فشل
                </Badge>
              )}
              {stats.skipped > 0 && (
                <Badge className="bg-slate-200 text-slate-700">
                  <SkipForward className="w-3 h-3 ml-1" />
                  {stats.skipped} متخطي
                </Badge>
              )}
              {stats.uploaded > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  <FileCheck className="w-3 h-3 ml-1" />
                  {stats.uploaded} تم رفعه
                </Badge>
              )}
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFiles}
                className="text-slate-500 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4 ml-1" />
                مسح الكل
              </Button>
            </div>
          )}

          {/* شريط التحكم والمعالجة */}
          {files.length > 0 && (
            <div className="space-y-3">
              {/* شريط التقدم الرئيسي */}
              {(processingStatus === 'processing' || processingStatus === 'paused' || processingStatus === 'completed') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {processingStatus === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-teal-600" />}
                      {processingStatus === 'paused' && <Pause className="w-4 h-4 text-amber-600" />}
                      {processingStatus === 'completed' && <Check className="w-4 h-4 text-green-600" />}
                      <span className="text-slate-600">
                        {processingStatus === 'processing' && 'جاري المعالجة...'}
                        {processingStatus === 'paused' && 'متوقف مؤقتاً'}
                        {processingStatus === 'completed' && 'اكتملت المعالجة'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {estimatedTime > 0 && (
                        <span className="text-xs text-slate-500">
                          الوقت المتبقي: {formatTime(estimatedTime)}
                        </span>
                      )}
                      <span className="text-teal-600 font-medium">{overallProgress}%</span>
                    </div>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>
              )}

              {/* أزرار التحكم */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {hasResumeState && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={resumeFromSavedState}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <RotateCcw className="w-4 h-4 ml-1" />
                      استئناف من آخر حالة
                    </Button>
                  )}

                  {processingStatus === 'idle' && stats.pending > 0 && (
                    <Button
                      onClick={processAllFiles}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                      <ScanSearch className="w-4 h-4" />
                      مسح الصور ({stats.pending})
                    </Button>
                  )}

                  {processingStatus === 'processing' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={pauseProcessing}
                        className="text-amber-600 border-amber-200 hover:bg-amber-50"
                      >
                        <Pause className="w-4 h-4 ml-1" />
                        إيقاف مؤقت
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelProcessing}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 ml-1" />
                        إلغاء
                      </Button>
                    </>
                  )}

                  {processingStatus === 'paused' && (
                    <>
                      <Button
                        size="sm"
                        onClick={resumeProcessing}
                        className="bg-green-600 hover:bg-green-700 text-white gap-2"
                      >
                        <Play className="w-4 h-4 ml-1" />
                        استئناف
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelProcessing}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 ml-1" />
                        إلغاء
                      </Button>
                    </>
                  )}

                  {processingStatus === 'completed' && stats.error > 0 && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={retryFailedFiles}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <RefreshCw className="w-4 h-4 ml-1" />
                        إعادة محاولة الفاشلة ({stats.error})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={exportErrorReport}
                        className="text-slate-600 border-slate-200 hover:bg-slate-50"
                      >
                        <Download className="w-4 h-4 ml-1" />
                        تصدير تقرير الأخطاء
                      </Button>
                    </>
                  )}
                </div>

                <div>
                  {stats.matched > 0 && (
                    <Button
                      onClick={uploadMatchedFiles}
                      disabled={processingStatus === 'processing' || isUploading}
                      className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white gap-2"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          رفع وتحديث ({stats.matched})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* معلومات المعالجة المتزامنة */}
              {(processingStatus === 'processing' || processingStatus === 'paused') && (
                <div className="flex items-center gap-4 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                  <div className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>معالجة متزامنة: {MAX_CONCURRENT} ملفات</span>
                  </div>
                  <div>•</div>
                  <div>حجم الـ chunk: {CHUNK_SIZE} ملف</div>
                  <div>•</div>
                  <div>إعادة المحاولة: {MAX_RETRIES} مرات</div>
                </div>
              )}
            </div>
          )}

          {/* قائمة الملفات */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-600 px-1">
                <span>عرض {Math.min(visibleFileCount, files.length)} من {files.length} ملف</span>
                {files.length > visibleFileCount && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleFileCount(prev => prev + 50)}
                    className="text-teal-600 hover:text-teal-700"
                  >
                    <MoreHorizontal className="w-4 h-4 ml-1" />
                    عرض المزيد
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[300px] rounded-xl border border-slate-200">
                <div className="p-3 space-y-2">
                  <AnimatePresence>
                    {files.slice(0, visibleFileCount).map((file, index) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        file.status === 'matched' && "bg-green-50 border-green-200",
                        file.status === 'uploaded' && "bg-emerald-50 border-emerald-200",
                        file.status === 'not_found' && "bg-amber-50 border-amber-200",
                        file.status === 'error' && "bg-red-50 border-red-200",
                        file.status === 'scanning' && "bg-blue-50 border-blue-200",
                        file.status === 'skipped' && "bg-slate-50 border-slate-200",
                        file.status === 'pending' && "bg-white border-slate-200"
                      )}
                    >
                      {/* معاينة الصورة */}
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                        <img
                          src={file.preview}
                          alt="معاينة"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* معلومات الملف */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {file.file.name}
                        </p>
                        {file.matchedVehicle ? (
                          <div className="space-y-1 mt-1">
                            <div className="flex items-center gap-2">
                              <Car className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-green-700 font-medium">
                                {file.matchedVehicle.plate_number} - {file.matchedVehicle.make} {file.matchedVehicle.model}
                              </span>
                            </div>
                            {file.extractedData && (
                              <ExtractedDataPreview data={file.extractedData} dataUpdated={file.dataUpdated} />
                            )}
                          </div>
                        ) : file.extractedNumber ? (
                          <div className="space-y-1 mt-1">
                            <p className="text-xs text-amber-600">
                              رقم مستخرج: {file.extractedNumber} (المطبع: {file.normalizedNumber})
                            </p>
                            {file.extractedData && (
                              <ExtractedDataPreview data={file.extractedData} />
                            )}
                          </div>
                        ) : file.error ? (
                          <p className="text-xs text-red-600 mt-1">{file.error}</p>
                        ) : null}

                        {/* إدخال يدوي */}
                        {(file.status === 'not_found' || file.status === 'error') && (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs text-amber-700 mb-2 flex items-center gap-1">
                              <Edit3 className="w-3 h-3" />
                              أدخل رقم اللوحة يدوياً للمطابقة:
                            </p>
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                placeholder="مثال: 8205 أو 008205"
                                value={editingFileId === file.id ? manualPlateNumber : ''}
                                onChange={(e) => {
                                  setEditingFileId(file.id);
                                  setManualPlateNumber(e.target.value);
                                }}
                                onFocus={() => {
                                  setEditingFileId(file.id);
                                  if (!manualPlateNumber) {
                                    setManualPlateNumber(file.extractedNumber || '');
                                  }
                                }}
                                className="h-8 text-sm flex-1 bg-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleManualPlateEntry(file.id);
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleManualPlateEntry(file.id)}
                                disabled={editingFileId !== file.id || !manualPlateNumber.trim()}
                                className="h-8 bg-teal-600 hover:bg-teal-700"
                              >
                                <Check className="w-4 h-4 ml-1" />
                                مطابقة
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => skipFile(file.id)}
                                className="h-8"
                              >
                                <SkipForward className="w-4 h-4 ml-1" />
                                تخطي
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Debug */}
                        {showDebugText === file.id && file.extractedText && (
                          <div className="mt-2 p-2 bg-slate-800 text-slate-100 rounded text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
                            <div className="text-slate-400 mb-1">النص المستخرج من OCR:</div>
                            <pre className="whitespace-pre-wrap break-words">{file.extractedText}</pre>
                          </div>
                        )}
                      </div>

                      {/* الحالة والإجراءات */}
                      <div className="flex items-center gap-1">
                        {getStatusBadge(file)}

                        {file.extractedText && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDebugText(
                              showDebugText === file.id ? null : file.id
                            )}
                            className="h-8 w-8 text-slate-400 hover:text-blue-500"
                            title="عرض النص المستخرج"
                          >
                            {showDebugText === file.id ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        )}

                        {file.status !== 'uploaded' && file.status !== 'scanning' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(file.id)}
                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
            </div>
          )}

          {/* رسالة عدم وجود ملفات */}
          {files.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <FileImage className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">لم يتم رفع أي ملفات بعد</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={handleClose}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDocumentDistributionDialog;
