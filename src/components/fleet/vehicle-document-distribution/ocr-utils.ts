/**
 * OCR utilities for Vehicle Document Distribution
 */

import { supabase } from '@/integrations/supabase/client';
import { VehicleOCRResult } from './types';

export const extractWithVehicleOCR = async (file: File, signal?: AbortSignal): Promise<VehicleOCRResult> => {
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
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('OCR_TIMEOUT')), 30000);
  });

  const abortPromise = new Promise<never>((_, reject) => {
    if (signal) {
      signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
    }
  });

  try {
    const response = await Promise.race([
      supabase.functions.invoke('vehicle-ocr', {
        body: { imageBase64: base64 },
      }),
      timeoutPromise,
      abortPromise,
    ]);

    if (response.error) {
      throw new Error(response.error.message || 'OCR failed');
    }

    return response.data as VehicleOCRResult;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Check if it was a timeout or function not found
    if (error.name === 'AbortError' || error.message === 'OCR_TIMEOUT' || error.message?.includes('timeout') || error.message?.includes('Aborted')) {
      console.warn('⏰ Google Cloud Vision timeout (30s), falling back to Tesseract');
      throw new Error('TIMEOUT_FALLBACK_TO_TESSERACT');
    }

    // If function doesn't exist or other error, also fall back
    console.warn('⚠️ Google Cloud Vision unavailable, falling back to Tesseract:', error.message);
    throw new Error('FALLBACK_TO_TESSERACT');
  } finally {
    clearTimeout(timeoutId!);
  }
};
