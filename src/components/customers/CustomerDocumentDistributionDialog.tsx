/**
 * مكون توزيع صور البطاقات الشخصية على العملاء
 * يقوم بقراءة رقم البطاقة الشخصية من الصور وتوزيعها على العملاء المناسبين
 * مع تحديث بيانات العميل بناءً على البيانات المستخرجة
 * واجهة مستخدم حديثة ومحسّنة مع تأثيرات بصرية انسيابية
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  FileImage,
  User,
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
  IdCard,
  Pause,
  Play,
  SkipForward,
  Square,
  Download,
  MoreHorizontal,
  Clock,
  Zap,
  FileText,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Tesseract from 'tesseract.js';

// استخدام Customer OCR عبر Supabase Edge Function (Google Cloud Vision)
interface CustomerOCRResult {
  success: boolean;
  rawText: string;
  extractedData: ExtractedCustomerData;
  confidence: number;
  error?: string;
}

const extractWithCustomerOCR = async (file: File, signal?: AbortSignal): Promise<CustomerOCRResult> => {
  // تحويل الملف إلى base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result); // نرسل data URL الكامل
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
    const response = await supabase.functions.invoke('customer-id-ocr', {
      body: { imageBase64: base64 },
    });

    if (response.error) {
      throw new Error(response.error.message || 'OCR failed');
    }

    return response.data as CustomerOCRResult;
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

// البيانات المستخرجة من البطاقة الشخصية
interface ExtractedCustomerData {
  nationalId?: string;
  name?: string;
  nameArabic?: string;
  firstName?: string;
  lastName?: string;
  firstNameArabic?: string;
  lastNameArabic?: string;
  dateOfBirth?: string;
  idExpiry?: string;
  nationality?: string;
  nationalityArabic?: string;
  passportNumber?: string;
  occupation?: string;
  occupationArabic?: string;
  confidence?: number;
}

enum ProcessingError {
  OCR_FAILED = 'ocr_failed',
  NO_ID_FOUND = 'no_id_found',
  CUSTOMER_NOT_FOUND = 'not_found',
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
  extractedData?: ExtractedCustomerData;
  extractedText?: string;
  matchedCustomer?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    national_id?: string;
  };
  dataUpdated?: boolean;
  error?: string;
  progress?: number;
  retryCount?: number;
  lastError?: ProcessingError;
  canSkip?: boolean;
  processingDuration?: number;
}

interface CustomerDocumentDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// استخراج البيانات من نص البطاقة الشخصية مع دعم العربية والأنماط القطرية
const extractCustomerData = (text: string): ExtractedCustomerData => {
  const data: ExtractedCustomerData = {};
  const cleanText = text.replace(/\s+/g, ' ').trim();
  console.log('Full OCR text for ID:', cleanText);

  // 1. رقم البطاقة الشخصية - ID No / ID Number / QID / رقم الهوية
  // يدعم: ID No, ID No., ID Number, QID, رقم الهوية, مع أو بدون نقطتين
  const idPatterns = [
    // أنماط الإنجليزية
    /(?:ID\s*\.\s*(?:No\s*\.\s*?|Number\s*?)?|QID)\s*[:\.]?\s*(\d{11})/i,
    /ID\s*No\s*[:\.]?\s*(\d{11})/i,
    /ID\s*Number\s*[:\.]?\s*(\d{11})/i,
    /(?:ID\s*\.?\s*No\s*\.?|رقم\s*الهوية)\s*[:\.]?\s*(\d{11})/i,
    // أنماط العربية
    /(?:رقم\s*(?:البطاقة|الهوية|الID)|QID)\s*[:\.]?\s*(\d{11})/i,
    // أي رقم 11 خانة (كخيار أخير)
    /\b(\d{11})\b/,
  ];

  for (const pattern of idPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.nationalId = match[1];
      break;
    }
  }

  // 2. تاريخ الميلاد - D.O.B / Date of Birth / تاريخ الميلاد
  // يدعم: D.O.B, DOB, Date of Birth, تاريخ الميلاد
  const dobPatterns = [
    /(?:D\.?O\.?B\.?|Date\s+of\s+Birth|تاريخ\s+الميلاد)\s*[:\.]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
    /(?:D\.?O\.?B\.?|DOB|تاريخ\s+الميلاد)\s*[:\.]?\s*(\d{4}[-/]\d{2}[-/]\d{2})/i,
    // نمط مرن مع مسافات اختيارية
    /(?:D\s*\.?\s*O\s*\.?\s*B|تاريخ\s+الميلاد)\s*[:\.]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
  ];

  for (const pattern of dobPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.dateOfBirth = parseDate(match[1]);
      if (data.dateOfBirth) break;
    }
  }

  // 3. تاريخ انتهاء البطاقة - Expiry / Exp Date / تاريخ الانتهاء
  // يدعم: Expiry, Exp Date, تاريخ الانتهاء
  const expiryPatterns = [
    /(?:Exp(?:iry|\.?)?(?:\s+Date)?|انتهاء\s+البطاقة|تاريخ\s+الانتهاء)\s*[:\.]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
    /(?:Exp(?:iry|\.?)?(?:\s+Date)?|انتهاء\s+البطاقة|تاريخ\s+الانتهاء)\s*[:\.]?\s*(\d{4}[-/]\d{2}[-/]\d{2})/i,
  ];

  for (const pattern of expiryPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.idExpiry = parseDate(match[1]);
      if (data.idExpiry) break;
    }
  }

  // 4. الجنسية - Nationality / الجنسية (بالإنجليزي والعربي)
  // يدعم: Nationality, الجنسية
  const nationalityPatterns = [
    // الإنجليزية
    /Nationality\s*[:\.]?\s*([A-Z][A-Z\s]+)/i,
    // العربية
    /الجنسية\s*[:\.]?\s*([A-Za-z\u0600-\u06FF\s]+)/i,
  ];

  for (const pattern of nationalityPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const nationality = match[1].trim();
      // تحديد ما إذا كانت عربية أو إنجليزية
      const hasArabic = /[\u0600-\u06FF]/.test(nationality);
      if (hasArabic) {
        data.nationalityArabic = nationality;
      } else {
        data.nationality = nationality;
      }
      break;
    }
  }

  // 5. الاسم الكامل - Name / الاسم (بالإنجليزي والعربي)
  // يدعم: Name, الاسم, الاسم بالعربي
  const namePatterns = [
    // الإنجليزية
    /Name\s*[:\.]?\s*([A-Z][A-Z\s]+)/i,
    // العربية - الاسم
    /(?:الاسم\s*[:\.]?\s*|الاسم\s+بالإنجليزي\s*[:\.]?\s*)([A-Za-z\s]+)/i,
    // العربية - الاسم بالعربي
    /(?:الاسم\s+بالعربي|الاسم\s*\([^)]*\))\s*[:\.]?\s*([\u0600-\u06FF\s]+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const fullName = match[1].trim();
      const hasArabic = /[\u0600-\u06FF]/.test(fullName);

      if (hasArabic) {
        data.nameArabic = fullName;
        // محاولة تقسيم الاسم العربي
        const nameParts = fullName.split(/\s+/).filter(n => n.length > 0);
        if (nameParts.length >= 2) {
          data.firstNameArabic = nameParts[0];
          data.lastNameArabic = nameParts.slice(1).join(' ');
        } else if (nameParts.length === 1) {
          data.firstNameArabic = nameParts[0];
        }
      } else {
        data.name = fullName;
        // محاولة تقسيم الاسم الإنجليزي
        const nameParts = fullName.split(/\s+/).filter(n => n.length > 0);
        if (nameParts.length >= 2) {
          data.firstName = nameParts[0];
          data.lastName = nameParts.slice(1).join(' ');
        } else if (nameParts.length === 1) {
          data.firstName = nameParts[0];
        }
      }
    }
  }

  // 6. المهنة - Occupation / المهنة (بالإنجليزي والعربي)
  const occupationPatterns = [
    /Occupation\s*[:\.]?\s*([A-Za-z\s]+)/i,
    /المهنة\s*[:\.]?\s*([A-Za-z\u0600-\u06FF\s]+)/i,
  ];

  for (const pattern of occupationPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const occupation = match[1].trim();
      const hasArabic = /[\u0600-\u06FF]/.test(occupation);
      if (hasArabic) {
        data.occupationArabic = occupation;
      } else {
        data.occupation = occupation;
      }
      break;
    }
  }

  // 7. رقم جواز السفر - Passport No
  const passportPatterns = [
    /Passport\s*No\s*[:\.]?\s*([A-Z0-9]{6,12})/i,
    /رقم\s*جواز\s*السفر\s*[:\.]?\s*([A-Z0-9]{6,12})/i,
  ];

  for (const pattern of passportPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.passportNumber = match[1].trim();
      break;
    }
  }

  console.log('Extracted customer data:', data);
  return data;
};

// تحويل التاريخ إلى صيغة YYYY-MM-DD
const parseDate = (dateStr: string): string | undefined => {
  try {
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return undefined;

    let year: number, month: number, day: number;

    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
      day = parseInt(parts[2]);
    } else {
      // DD-MM-YYYY or DD/MM/YYYY
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

// مكون عرض البيانات المستخرجة (يدعم الإنجليزية والعربية)
const ExtractedDataPreview: React.FC<{ data: ExtractedCustomerData; dataUpdated?: boolean }> = ({ data, dataUpdated }) => {
  const fields = [
    { label: 'رقم البطاقة', value: data.nationalId },
    { label: 'الاسم (EN)', value: data.name },
    { label: 'الاسم (AR)', value: data.nameArabic },
    { label: 'الاسم الأول (EN)', value: data.firstName },
    { label: 'الاسم الأول (AR)', value: data.firstNameArabic },
    { label: 'اسم العائلة (EN)', value: data.lastName },
    { label: 'اسم العائلة (AR)', value: data.lastNameArabic },
    { label: 'تاريخ الميلاد', value: data.dateOfBirth },
    { label: 'انتهاء البطاقة', value: data.idExpiry },
    { label: 'الجنسية (EN)', value: data.nationality },
    { label: 'الجنسية (AR)', value: data.nationalityArabic },
    { label: 'المهنة (EN)', value: data.occupation },
    { label: 'المهنة (AR)', value: data.occupationArabic },
    { label: 'رقم الجواز', value: data.passportNumber },
    { label: 'الثقة', value: data.confidence ? `${Math.round(data.confidence * 100)}%` : undefined },
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
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex items-center gap-1">
            <span className="text-slate-500">{label}:</span>
            <span
              className={cn(
                "font-medium truncate",
              value?.match(/[\u0600-\u06FF]/) ? "text-slate-800" : "text-slate-700"
              )}
              dir={value?.match(/[\u0600-\u06FF]/) ? "rtl" : "ltr"}
              title={value}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface SavedState {
  files: UploadedFile[];
  progress: BatchProgress;
  timestamp: number;
}

// Constants for batch processing
const CHUNK_SIZE = 10;
const DELAY_BETWEEN_CHUNKS = 2000;
const DELAY_BETWEEN_FILES = 500;
const MAX_RETRIES = 2;
const MAX_CONCURRENT = 2; // Reduced from 3 to 2 for better timeout handling
const LOCAL_STORAGE_KEY = 'customer-ocr-processing-state';
const RETRY_DELAYS = [1000, 2000]; // تأخير بالمللي ثانية (exponential backoff)
const PROGRESS_SAVE_INTERVAL = 10; // حفظ الحالة كل 10 ملفات
const STORAGE_KEY_PREFIX = 'customer-doc-processing-';

// ==================== Helper Functions ====================
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

// ==================== Queue Manager ====================
type ProcessingStatus = 'idle' | 'processing' | 'paused' | 'completed' | 'cancelled';

interface ProcessingState {
  completedFileIds: string[];
  failedFileIds: string[];
  skippedFileIds: string[];
  currentFileIndex: number;
  timestamp: number;
  totalFiles: number;
}

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

  loadResumeState(state: ProcessingState | null): void {
    this.resumeState = state;
    if (state) {
      console.log('📂 Loaded resume state:', state);
    }
  }

  setFiles(files: UploadedFile[]): void {
    this.files = files;
    this.queue = [];

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

  private async processQueue(processFileFn: (file: UploadedFile, signal?: AbortSignal) => Promise<UploadedFile>): Promise<void> {
    let fileIndex = this.resumeState?.currentFileIndex || 0;
    const totalFiles = this.files.length;
    let progressCounter = 0;

    while ((this.queue.length > 0 || this.processingCount > 0) && this.status === 'processing') {
      const chunk: UploadedFile[] = [];

      while (chunk.length < CHUNK_SIZE && this.queue.length > 0 && this.status === 'processing') {
        const file = this.queue.shift();
        if (file) {
          chunk.push(file);
        }
      }

      if (chunk.length === 0) break;

      console.log(`📦 Processing chunk ${this.currentChunkIndex + 1} with ${chunk.length} files...`);

      const chunkPromises = chunk.map((file) =>
        this.processSingleFile(file, processFileFn, fileIndex++)
      );

      const results = await Promise.allSettled(chunkPromises);

      let completedInChunk = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          completedInChunk++;
        }
      });

      this.currentChunkIndex++;
      progressCounter += chunk.length;

      if (progressCounter >= PROGRESS_SAVE_INTERVAL) {
        this.saveProcessingState(fileIndex);
        progressCounter = 0;
      }

      if (this.options.onChunkComplete) {
        this.options.onChunkComplete(this.currentChunkIndex, completedInChunk, chunk.length);
      }

      const totalCompleted = this.completedFiles.size;
      if (this.options.onProgress) {
        this.options.onProgress(totalCompleted, totalFiles, chunk[chunk.length - 1]);
      }

      if (this.queue.length > 0 && this.status === 'processing') {
        await this.delay(500);
      }
    }

    this.saveProcessingState(fileIndex);
  }

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
            60000,
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

          if (error.message === 'Cancelled' || error.message === 'Aborted') {
            throw error;
          }

          if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
            console.warn(`⚠️ [${fileIndex + 1}] ${file.file.name} - Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
            await this.delay(delay);
          }
        }
      }

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

  pause(): void {
    if (this.status === 'processing') {
      this.status = 'paused';
      console.log('⏸️  Processing paused');
    }
  }

  resume(): void {
    if (this.status === 'paused') {
      this.status = 'processing';
      console.log('▶️  Processing resumed');
    }
  }

  cancel(): void {
    this.status = 'cancelled';
    if (this.abortController) {
      this.abortController.abort();
    }
    console.log('🛑 Processing cancelled');
  }

  skipFile(fileId: string): void {
    const file = this.queue.find(f => f.id === fileId);
    if (file) {
      this.queue = this.queue.filter(f => f.id !== fileId);
      const skippedFile: UploadedFile = { ...file, status: 'skipped' };
      this.skippedFiles.set(fileId, skippedFile);
      console.log(`⏭️  Skipped file: ${file.file.name}`);
    }
  }

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

  getProgress(): { completed: number; total: number; percentage: number } {
    const total = this.files.length;
    const completed = this.completedFiles.size;
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  getCompletedFiles(): UploadedFile[] {
    return Array.from(this.completedFiles.values());
  }

  getFailedFiles(): UploadedFile[] {
    return Array.from(this.failedFiles.values());
  }

  getSkippedFiles(): UploadedFile[] {
    return Array.from(this.skippedFiles.values());
  }

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

  getStatus(): ProcessingStatus {
    return this.status;
  }

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
      const dayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - state.timestamp < dayInMs) {
        return state;
      } else {
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

const CustomerDocumentDistributionDialog: React.FC<CustomerDocumentDistributionDialogProps> = ({
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
  const [manualNationalId, setManualNationalId] = useState('');
  const [queueManager] = useState(() => new ProcessingQueueManager());
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [hasResumeState, setHasResumeState] = useState(false);
  const [showRetryFailed, setShowRetryFailed] = useState(false);
  const [visibleFileCount, setVisibleFileCount] = useState(50);

  // معالجة الملفات المسحوبة
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
      retryCount: 0,
      canSkip: true,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: true,
  });

  // جلب جميع العملاء للمطابقة
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-for-matching', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone, national_id')
        .eq('company_id', companyId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!companyId,
  });

  // إنشاء خريطة للمطابقة السريعة
  const customerMap = React.useMemo(() => {
    const map = new Map<string, typeof customers[0]>();
    customers.forEach(customer => {
      if (customer.national_id) {
        map.set(customer.national_id, customer);
      }
    });
    return map;
  }, [customers]);

  // مطابقة رقم البطاقة مع العملاء
  const findMatchingCustomer = (nationalId: string) => {
    if (customerMap.has(nationalId)) {
      return customerMap.get(nationalId)!;
    }
    return null;
  };

  // معالجة الصورة باستخدام OCR مع استراتيجية احتياطية محسّنة
  const processImage = async (uploadedFile: UploadedFile, signal?: AbortSignal): Promise<UploadedFile> => {
    try {
      setFiles(prev => prev.map(f =>
        f.id === uploadedFile.id ? { ...f, status: 'scanning' as const, progress: 0 } : f
      ));

      const updateProgress = (progress: number) => {
        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id ? { ...f, progress } : f
        ));
      };

      let extractedText = '';
      let extractedData: ExtractedCustomerData = {};
      let ocrMethod = 'tesseract';
      let serverExtractedData: ExtractedCustomerData = {};

      // Method 1: Google Cloud Vision (30s timeout, then fallback)
      try {
        console.log('🔍 Trying Google Cloud Vision (30s timeout)...');
        updateProgress(20);

        const ocrResult = await extractWithCustomerOCR(uploadedFile.file, signal);

        if (ocrResult.success && ocrResult.rawText) {
          extractedText = ocrResult.rawText;
          serverExtractedData = ocrResult.extractedData;
          ocrMethod = 'google-vision';

          console.log('✅ Google Vision result:', extractedText.substring(0, 300));
          console.log('✅ Server extracted data:', serverExtractedData);

          updateProgress(90);
        } else {
          console.warn('⚠️ Customer OCR failed:', ocrResult.error);
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
          console.warn('⚠️ Google Cloud Vision failed, trying Tesseract with Arabic...', error);
        }

        // Method 2: Tesseract.js كخيار احتياطي (مع دعم العربية والإنجليزية)
        ocrMethod = 'tesseract-arabic';
        updateProgress(40);

        try {
          const result = await Tesseract.recognize(uploadedFile.file, 'eng+ara', {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                updateProgress(40 + Math.round(m.progress * 50));
              }
            },
          });

          extractedText = result.data.text;
          console.log('📝 Tesseract (eng+ara) result:', extractedText.substring(0, 200));
        } catch (tesseractError) {
          console.warn('⚠️ Tesseract with Arabic failed, trying English only...', tesseractError);

          // Method 3: Tesseract بالإنجليزية فقط
          ocrMethod = 'tesseract-english';
          updateProgress(60);

          const result = await Tesseract.recognize(uploadedFile.file, 'eng', {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                updateProgress(60 + Math.round(m.progress * 30));
              }
            },
          });

          extractedText = result.data.text;
          console.log('📝 Tesseract (eng only) result:', extractedText.substring(0, 200));
        }
      }

      console.log(`📊 OCR Method: ${ocrMethod}`);
      updateProgress(100);

      // استخراج البيانات من النص (دمج البيانات من الخادم مع الاستخراج المحلي)
      const localExtractedData = extractCustomerData(extractedText);
      extractedData = {
        ...localExtractedData,
        ...serverExtractedData, // البيانات من الخادم لها الأولوية
        confidence: serverExtractedData.confidence || localExtractedData.confidence,
      };

      if (!extractedData.nationalId) {
        return {
          ...uploadedFile,
          status: 'not_found',
          extractedData,
          extractedText: extractedText.substring(0, 500),
          error: 'لم يتم العثور على رقم بطاقة شخصية. يرجى إدخال الرقم يدوياً.',
        };
      }

      const matchedCustomer = findMatchingCustomer(extractedData.nationalId);

      if (matchedCustomer) {
        return {
          ...uploadedFile,
          status: 'matched',
          extractedNumber: extractedData.nationalId,
          extractedData,
          extractedText: extractedText.substring(0, 500),
          matchedCustomer,
        };
      } else {
        return {
          ...uploadedFile,
          status: 'not_found',
          extractedNumber: extractedData.nationalId,
          extractedData,
          extractedText: extractedText.substring(0, 500),
          error: `لم يتم العثور على عميل برقم البطاقة: ${extractedData.nationalId}`,
        };
      }
    } catch (error: any) {
      console.error('OCR Error:', error);
      return {
        ...uploadedFile,
        status: 'error',
        error: error.message || 'فشل في قراءة الصورة',
      };
    }
  };

  // تحديث بيانات العميل مع دعم الحقول العربية
  const updateCustomerData = async (customerId: string, data: ExtractedCustomerData): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};

      // الحقول الإنجليزية
      if (data.nationalId) updateData.national_id = data.nationalId;
      if (data.firstName) updateData.first_name = data.firstName;
      if (data.lastName) updateData.last_name = data.lastName;
      if (data.dateOfBirth) updateData.date_of_birth = data.dateOfBirth;
      if (data.idExpiry) updateData.national_id_expiry = data.idExpiry;
      if (data.passportNumber) updateData.passport_number = data.passportNumber;

      // الحقول العربية - تُحدث فقط إذا كانت موجودة في قاعدة البيانات
      // هذه الحقول موجودة في جدول customers حسب DATABASE_REFERENCE.md
      if (data.firstNameArabic) updateData.first_name_ar = data.firstNameArabic;
      if (data.lastNameArabic) updateData.last_name_ar = data.lastNameArabic;
      // ملاحظة: nationality_arabic و occupation_arabic غير موجودين في جدول customers حالياً
      // يمكن إضافتهما لاحقاً كتحسين للنظام

      if (Object.keys(updateData).length === 0) {
        return false;
      }

      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customerId);

      if (error) {
        // التعامل مع خطأ العمود غير الموجود (للحقول العربية الجديدة)
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.warn('Some Arabic fields not found in database, updating only supported fields:', error);
          // إعادة المحاولة بدون الحقول العربية
          const englishData: Record<string, unknown> = {};
          if (data.nationalId) englishData.national_id = data.nationalId;
          if (data.firstName) englishData.first_name = data.firstName;
          if (data.lastName) englishData.last_name = data.lastName;
          if (data.dateOfBirth) englishData.date_of_birth = data.dateOfBirth;
          if (data.idExpiry) englishData.national_id_expiry = data.idExpiry;
          if (data.passportNumber) englishData.passport_number = data.passportNumber;

          const { error: retryError } = await supabase
            .from('customers')
            .update(englishData)
            .eq('id', customerId);

          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['customer-details', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });

      return true;
    } catch (error) {
      console.error('Error updating customer:', error);
      return false;
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

    const headers = ['File Name', 'Status', 'Error', 'Extracted ID', 'Retries'];
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
    link.download = `ocr-errors-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast.success('تم تصدير تقرير الأخطاء بنجاح');
  };

  // رفع الملفات المطابقة وتحديث بيانات العملاء
  const uploadMatchedFiles = async () => {
    setIsUploading(true);
    const matchedFiles = files.filter(f => f.status === 'matched' && f.matchedCustomer);
    let successCount = 0;
    let errorCount = 0;
    let dataUpdatedCount = 0;

    for (const file of matchedFiles) {
      try {
        // 1. Upload to storage with unique name
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const fileExt = file.file.name.split('.').pop();
        const fileName = `customer-documents/${file.matchedCustomer!.id}/${timestamp}_${randomId}_id_card.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // 2. Create database record with unique document name
        const uniqueDocumentName = `البطاقة الشخصية - ${file.matchedCustomer!.first_name} ${file.matchedCustomer!.last_name} - ${timestamp}`;
        const { error: dbError } = await supabase
          .from('customer_documents')
          .insert({
            customer_id: file.matchedCustomer!.id,
            company_id: companyId!,
            document_type: 'national_id',
            document_name: uniqueDocumentName,
            file_path: fileName,
            mime_type: file.file.type,
            file_size: file.file.size,
          });

        if (dbError) throw dbError;

        // تحديث بيانات العميل
        let dataUpdated = false;
        if (file.extractedData) {
          dataUpdated = await updateCustomerData(file.matchedCustomer!.id, file.extractedData);
          if (dataUpdated) dataUpdatedCount++;
        }

        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'uploaded' as const, dataUpdated } : f
        ));

        successCount++;

        queryClient.invalidateQueries({
          queryKey: ['customer-documents', file.matchedCustomer!.id]
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
        ? `تم رفع ${successCount} بطاقة وتحديث بيانات ${dataUpdatedCount} عميل`
        : `تم رفع ${successCount} بطاقة بنجاح`;
      toast.success(msg);
    }
    if (errorCount > 0) {
      toast.error(`فشل رفع ${errorCount} بطاقة`);
    }
  };

  // إدخال رقم البطاقة يدوياً
  const handleManualIdEntry = (fileId: string) => {
    if (!manualNationalId.trim()) return;

    const matchedCustomer = findMatchingCustomer(manualNationalId);

    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;

      if (matchedCustomer) {
        return {
          ...f,
          status: 'matched' as const,
          extractedNumber: manualNationalId,
          matchedCustomer,
          error: undefined,
        };
      } else {
        return {
          ...f,
          status: 'not_found' as const,
          extractedNumber: manualNationalId,
          error: `لم يتم العثور على عميل برقم البطاقة: ${manualNationalId}`,
        };
      }
    }));

    setEditingFileId(null);
    setManualNationalId('');

    if (matchedCustomer) {
      toast.success(`تم مطابقة العميل: ${matchedCustomer.first_name} ${matchedCustomer.last_name}`);
    } else {
      toast.error(`لم يتم العثور على عميل برقم البطاقة: ${manualNationalId}`);
    }
  };

  // حذف ملف
  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  // مسح جميع الملفات
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

  const stats = React.useMemo(() => {
    const matchedFiles = files.filter(f => f.status === 'matched');
    const withExtractedData = matchedFiles.filter(f =>
      f.extractedData && Object.keys(f.extractedData).filter(k =>
        k !== 'nationalId' && (f.extractedData as any)[k]
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
      <DialogContent className="sm:max-w-[950px] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>توزيع صور البطاقات الشخصية</DialogTitle>
          <DialogDescription>رفع ومطابقة تلقائية باستخدام OCR</DialogDescription>
        </VisuallyHidden>
        {/* Header مبسط وأنيق */}
        <div className="bg-teal-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <IdCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">توزيع صور البطاقات الشخصية</h2>
                <p className="text-teal-100 text-sm">رفع ومطابقة تلقائية باستخدام OCR</p>
              </div>
            </div>
            {files.length > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                  <FileImage className="w-4 h-4" />
                  <span>{stats.total} ملف</span>
                </div>
                {stats.matched > 0 && (
                  <div className="flex items-center gap-2 bg-green-500/30 px-3 py-1.5 rounded-lg">
                    <Check className="w-4 h-4" />
                    <span>{stats.matched} مطابق</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* منطقة السحب والإفلات - مصغرة عند وجود ملفات */}
          <div
            {...getRootProps()}
            className={cn(
              "relative border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-300",
              files.length > 0 ? "p-4" : "p-6",
              isDragActive
                ? "border-blue-500 bg-blue-50 scale-[1.01] shadow-lg shadow-blue-500/20"
                : "border-slate-200 bg-gradient-to-b from-slate-50 to-white hover:border-blue-400 hover:shadow-md"
            )}
          >
            <input {...getInputProps()} />
            <motion.div
              animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex flex-col items-center"
            >
              <div className={cn(
                "rounded-2xl flex items-center justify-center mb-3 transition-colors",
                files.length > 0 ? "w-12 h-12" : "w-16 h-16",
                isDragActive ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-400"
              )}>
                <Upload className={files.length > 0 ? "w-6 h-6" : "w-8 h-8"} />
              </div>
              {isDragActive ? (
                <p className="text-lg font-medium text-blue-700">أفلت الملفات هنا...</p>
              ) : (
                <>
                  <p className={cn("font-medium text-slate-700", files.length > 0 ? "text-sm" : "text-base")}>
                    {files.length > 0 ? "أضف المزيد من الصور" : "اسحب وأفلت صور البطاقات الشخصية"}
                  </p>
                  {files.length === 0 && (
                    <>
                      <p className="text-sm text-slate-400 mt-1">أو اضغط لاختيار الملفات</p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                        <Badge variant="outline" className="bg-white">PNG</Badge>
                        <Badge variant="outline" className="bg-white">JPG</Badge>
                        <Badge variant="outline" className="bg-white">WebP</Badge>
                      </div>
                    </>
                  )}
                </>
              )}
            </motion.div>
          </div>

          {/* شريط الإحصائيات المحسّن - مدمج مع أزرار التحكم */}
          {files.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                {stats.matched > 0 && (
                  <Badge className="bg-green-100 text-green-700">
                    <Check className="w-3 h-3 ml-1" />
                    {stats.matched} مطابق
                  </Badge>
                )}
                {stats.error > 0 && (
                  <Badge className="bg-red-100 text-red-700">
                    <AlertTriangle className="w-3 h-3 ml-1" />
                    {stats.error} فشل
                  </Badge>
                )}
                {stats.uploaded > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <FileCheck className="w-3 h-3 ml-1" />
                    {stats.uploaded} تم رفعه
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearAllFiles} className="text-slate-400 hover:text-red-500 rounded-lg h-8">
                  <Trash2 className="w-4 h-4 ml-1" />
                  مسح
                </Button>
              </div>
            </div>
          )}

          {/* شريط التحكم والمعالجة */}
          {files.length > 0 && (
            <div className="space-y-3">
              {/* شريط التقدم */}
              {(processingStatus === 'processing' || processingStatus === 'paused' || processingStatus === 'completed') && (
                <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {processingStatus === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                      {processingStatus === 'paused' && <Pause className="w-4 h-4 text-amber-600" />}
                      {processingStatus === 'completed' && <Check className="w-4 h-4 text-green-600" />}
                      <span className="text-sm font-medium text-slate-700">
                        {processingStatus === 'processing' && 'جاري المعالجة...'}
                        {processingStatus === 'paused' && 'متوقف مؤقتاً'}
                        {processingStatus === 'completed' && 'اكتملت المعالجة'}
                      </span>
                      {estimatedTime > 0 && <span className="text-xs text-slate-500">({formatTime(estimatedTime)})</span>}
                    </div>
                    <span className="text-lg font-bold text-blue-600">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>
              )}

              {/* أزرار التحكم */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {hasResumeState && (
                    <Button size="sm" variant="outline" onClick={resumeFromSavedState} className="text-blue-600 border-blue-200 rounded-xl h-9">
                      <RefreshCw className="w-4 h-4 ml-1" />
                      استئناف
                    </Button>
                  )}

                  {processingStatus === 'idle' && stats.pending > 0 && (
                    <Button onClick={processAllFiles} className="bg-gradient-to-l from-blue-600 to-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/25 h-9">
                      <ScanSearch className="w-4 h-4 ml-2" />
                      بدء المسح ({stats.pending})
                    </Button>
                  )}

                  {processingStatus === 'processing' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={pauseProcessing} className="rounded-xl text-amber-600 border-amber-200 h-9">
                        <Pause className="w-4 h-4 ml-1" />
                        إيقاف
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelProcessing} className="rounded-xl text-red-600 border-red-200 h-9">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {processingStatus === 'paused' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={resumeProcessing} className="rounded-xl bg-green-600 hover:bg-green-700 h-9">
                        <Play className="w-4 h-4 ml-1" />
                        استئناف
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelProcessing} className="rounded-xl text-red-600 border-red-200 h-9">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {processingStatus === 'completed' && stats.error > 0 && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={retryFailedFiles} className="rounded-xl text-blue-600 border-blue-200 h-9">
                        <RefreshCw className="w-4 h-4 ml-1" />
                        إعادة ({stats.error})
                      </Button>
                      <Button size="sm" variant="ghost" onClick={exportErrorReport} className="rounded-xl h-9">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {stats.matched > 0 && (
                  <Button
                    onClick={uploadMatchedFiles}
                    disabled={processingStatus === 'processing' || isUploading}
                    className="bg-gradient-to-l from-teal-500 to-teal-600 text-white rounded-xl shadow-lg shadow-teal-500/25 h-9"
                  >
                    {isUploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري الرفع...</>
                    ) : (
                      <><Upload className="w-4 h-4 ml-2" />رفع ({stats.matched})</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* قائمة الملفات */}
          {files.length > 0 && (
            <ScrollArea className="h-[280px] rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="p-3 space-y-2">
                <AnimatePresence mode="popLayout">
                  {files.slice(0, visibleFileCount).map((file, index) => (
                    <motion.div
                      key={file.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border bg-white transition-all hover:shadow-sm",
                        file.status === 'matched' && "border-green-200",
                        file.status === 'uploaded' && "border-emerald-200",
                        file.status === 'not_found' && "border-amber-200",
                        file.status === 'error' && "border-red-200",
                        file.status === 'scanning' && "border-blue-200",
                        file.status === 'pending' && "border-slate-200"
                      )}
                    >
                      {/* معاينة الصورة */}
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                        <img src={file.preview} alt="" className="w-full h-full object-cover" />
                        {file.status === 'scanning' && (
                          <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          </div>
                        )}
                      </div>

                      {/* معلومات الملف */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-slate-800 truncate">{file.file.name}</p>
                          {getStatusBadge(file)}
                        </div>
                        
                        {file.matchedCustomer && (
                          <div className="flex items-center gap-2 text-xs">
                            <User className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-green-700 font-medium">
                              {file.matchedCustomer.first_name} {file.matchedCustomer.last_name}
                            </span>
                            {file.dataUpdated && (
                              <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                                <Database className="w-2.5 h-2.5 ml-0.5" />
                                تم التحديث
                              </Badge>
                            )}
                          </div>
                        )}

                        {file.extractedNumber && !file.matchedCustomer && (
                          <p className="text-xs text-amber-600">رقم مستخرج: {file.extractedNumber}</p>
                        )}

                        {file.error && !file.matchedCustomer && (
                          <p className="text-xs text-red-500">{file.error}</p>
                        )}

                        {/* إدخال يدوي */}
                        {(file.status === 'not_found' || file.status === 'error') && (
                          <div className="mt-2 flex items-center gap-2">
                            <Input
                              type="text"
                              placeholder="أدخل رقم البطاقة..."
                              value={editingFileId === file.id ? manualNationalId : ''}
                              onChange={(e) => { setEditingFileId(file.id); setManualNationalId(e.target.value); }}
                              onFocus={() => { setEditingFileId(file.id); if (!manualNationalId) setManualNationalId(file.extractedNumber || ''); }}
                              className="h-8 text-xs flex-1 max-w-[180px] rounded-lg"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleManualIdEntry(file.id); }}
                            />
                            <Button size="sm" onClick={() => handleManualIdEntry(file.id)} disabled={editingFileId !== file.id || !manualNationalId.trim()} className="h-8 text-xs rounded-lg bg-blue-600">
                              مطابقة
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => skipFile(file.id)} className="h-8 text-xs text-slate-400">
                              تخطي
                            </Button>
                          </div>
                        )}

                        {/* Debug */}
                        {showDebugText === file.id && file.extractedText && (
                          <div className="mt-2 p-2 bg-slate-800 text-slate-100 rounded-lg text-[10px] font-mono max-h-24 overflow-y-auto">
                            <pre className="whitespace-pre-wrap">{file.extractedText}</pre>
                          </div>
                        )}
                      </div>

                      {/* أزرار الإجراءات */}
                      <div className="flex items-center gap-1">
                        {file.extractedText && (
                          <Button variant="ghost" size="icon" onClick={() => setShowDebugText(showDebugText === file.id ? null : file.id)} className="h-7 w-7 text-slate-400">
                            {showDebugText === file.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                        {file.status !== 'uploaded' && file.status !== 'scanning' && (
                          <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)} className="h-7 w-7 text-slate-400 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {files.length > visibleFileCount && (
                  <Button variant="ghost" onClick={() => setVisibleFileCount(prev => prev + 50)} className="w-full text-blue-600 hover:text-blue-700 mt-2">
                    <MoreHorizontal className="w-4 h-4 ml-2" />
                    عرض المزيد ({files.length - visibleFileCount} ملف)
                  </Button>
                )}
              </div>
            </ScrollArea>
          )}

          {/* رسالة عدم وجود ملفات */}
          {files.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <IdCard className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500">لم يتم رفع أي ملفات بعد</p>
              <p className="text-slate-400 text-sm mt-1">اسحب الصور أو اضغط للاختيار</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Database className="w-3.5 h-3.5" />
            <span>OCR: Google Vision + Tesseract</span>
          </div>
          <Button variant="outline" onClick={handleClose} className="rounded-xl">
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDocumentDistributionDialog;
