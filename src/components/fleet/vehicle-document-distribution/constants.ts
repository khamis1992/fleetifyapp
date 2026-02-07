/**
 * Constants for Vehicle Document Distribution processing
 */

// Constants للمعالجة المتزامنة
export const CHUNK_SIZE = 10;
export const DELAY_BETWEEN_CHUNKS = 2000;
export const DELAY_BETWEEN_FILES = 500;
export const MAX_RETRIES = 2;
export const MAX_CONCURRENT = 2; // Reduced from 3 to 2 for better timeout handling
export const LOCAL_STORAGE_KEY = 'vehicle-ocr-processing-state';
export const RETRY_DELAYS = [1000, 2000]; // تأخير بالمللي ثانية (exponential backoff)
export const PROGRESS_SAVE_INTERVAL = 10; // حفظ الحالة كل 10 ملفات
export const STORAGE_KEY_PREFIX = 'vehicle-doc-processing-';
