import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface QueryPerformanceOptions {
  queryKey: string;
  enabled?: boolean;
  slowQueryThreshold?: number; // milliseconds
  timeoutThreshold?: number; // milliseconds
}

export const useQueryPerformanceMonitor = ({
  queryKey,
  enabled = true,
  slowQueryThreshold = 5000, // 5 seconds
  timeoutThreshold = 15000, // 15 seconds
}: QueryPerformanceOptions) => {
  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownWarningRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // Start timing when query begins
    startTimeRef.current = Date.now();
    hasShownWarningRef.current = false;

    // Set up timeout warning
    timeoutRef.current = setTimeout(() => {
      if (!hasShownWarningRef.current) {
        console.warn(`⚠️ [PERFORMANCE] Query "${queryKey}" taking longer than expected`);
        hasShownWarningRef.current = true;
      }
    }, timeoutThreshold);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [queryKey, enabled, timeoutThreshold]);

  const recordQueryEnd = (isSuccess: boolean, error?: Error) => {
    if (!enabled || !startTimeRef.current) return;

    const endTime = Date.now();
    const duration = endTime - startTimeRef.current;

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Log performance metrics
    console.log(`📊 [PERFORMANCE] Query "${queryKey}":`, {
      duration: `${duration}ms`,
      status: isSuccess ? 'success' : 'error',
      error: error?.message,
      timestamp: new Date().toISOString()
    });

    // Show warning for slow queries
    if (duration > slowQueryThreshold && isSuccess) {
      console.warn(`🐌 [PERFORMANCE] Slow query detected: "${queryKey}" took ${duration}ms`);
    }

    // Show performance toast for very slow queries
    if (duration > timeoutThreshold && isSuccess) {
      toast.warning(`استعلام "${queryKey}" استغرق وقتاً طويلاً (${Math.round(duration / 1000)}ث)`, {
        description: 'قد تحتاج إلى تحسين الاستعلام أو التحقق من الاتصال'
      });
    }

    // Reset for next query
    startTimeRef.current = null;
  };

  return { recordQueryEnd };
};