/**
 * Barrel exports for Vehicle Document Distribution utilities
 */

export type {
  VehicleOCRResult,
  ExtractedVehicleData,
  BatchProgress,
  UploadedFile,
  ProcessingState,
  ProcessingStatus,
  QueueManagerOptions,
} from './types';

export {
  CHUNK_SIZE,
  DELAY_BETWEEN_CHUNKS,
  DELAY_BETWEEN_FILES,
  MAX_RETRIES,
  MAX_CONCURRENT,
  LOCAL_STORAGE_KEY,
  RETRY_DELAYS,
  PROGRESS_SAVE_INTERVAL,
  STORAGE_KEY_PREFIX,
} from './constants';

export { extractWithVehicleOCR } from './ocr-utils';

export { ProcessingQueueManager } from './QueueManager';

export {
  saveProcessingState,
  loadProcessingState,
  clearProcessingState,
} from './storage';
