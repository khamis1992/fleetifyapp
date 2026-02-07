/**
 * Types and interfaces for Vehicle Document Distribution
 */

// استخدام Vehicle OCR عبر Supabase Edge Function (Google Cloud Vision)
export interface VehicleOCRResult {
  success: boolean;
  rawText: string;
  extractedData: ExtractedVehicleData;
  confidence: number;
  error?: string;
}

// البيانات المستخرجة من استمارة المركبة
export interface ExtractedVehicleData {
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

export interface BatchProgress {
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

export interface UploadedFile {
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
export interface ProcessingState {
  completedFileIds: string[];
  failedFileIds: string[];
  skippedFileIds: string[];
  currentFileIndex: number;
  timestamp: number;
  totalFiles: number;
}

export type ProcessingStatus = 'idle' | 'processing' | 'paused' | 'completed' | 'cancelled';

export interface QueueManagerOptions {
  onProgress?: (completed: number, total: number, currentFile: UploadedFile) => void;
  onFileComplete?: (file: UploadedFile) => void;
  onFileError?: (file: UploadedFile, error: Error) => void;
  onChunkComplete?: (chunkIndex: number, completedInChunk: number, totalInChunk: number) => void;
  onSaveState?: (state: ProcessingState) => void;
}
