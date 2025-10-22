import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PageLoadingTimeoutProps {
  /** The content to render */
  children: React.ReactNode;
  /** Whether the page is currently loading */
  isLoading: boolean;
  /** Timeout in milliseconds (default: 15000ms / 15 seconds) */
  timeoutMs?: number;
  /** Optional loading message */
  loadingMessage?: string;
  /** Callback when timeout is reached */
  onTimeout?: () => void;
  /** Callback for retry button */
  onRetry?: () => void;
  /** Show progress indicator */
  showProgress?: boolean;
}

/**
 * PageLoadingTimeout Component
 *
 * Wraps page content and shows a timeout error if loading takes too long.
 * Prevents infinite loading states by forcing an error UI after timeout.
 *
 * @example
 * ```tsx
 * <PageLoadingTimeout
 *   isLoading={isLoading || isFetching}
 *   timeoutMs={15000}
 *   onRetry={() => refetch()}
 * >
 *   <YourPageContent />
 * </PageLoadingTimeout>
 * ```
 */
export const PageLoadingTimeout: React.FC<PageLoadingTimeoutProps> = ({
  children,
  isLoading,
  timeoutMs = 15000,
  loadingMessage = 'Loading...',
  onTimeout,
  onRetry,
  showProgress = true,
}) => {
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (isLoading) {
      // Reset state when loading starts
      setTimeoutReached(false);
      setElapsedTime(0);
      startTimeRef.current = Date.now();

      // Start timeout timer
      timeoutRef.current = setTimeout(() => {
        console.warn(`⏱️ Page loading timeout reached after ${timeoutMs}ms`);
        setTimeoutReached(true);
        onTimeout?.();
      }, timeoutMs);

      // Start progress timer (update every 500ms)
      if (showProgress) {
        intervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current;
          setElapsedTime(elapsed);
        }, 500);
      }

      // Cleanup
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      // Reset when loading completes
      setTimeoutReached(false);
      setElapsedTime(0);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isLoading, timeoutMs, onTimeout, showProgress]);

  const handleRetry = () => {
    setTimeoutReached(false);
    setElapsedTime(0);
    onRetry?.();
  };

  const handleRefreshPage = () => {
    window.location.reload();
  };

  const progressPercentage = Math.min((elapsedTime / timeoutMs) * 100, 100);

  // Show timeout error UI
  if (timeoutReached && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Loading Timeout</AlertTitle>
            <AlertDescription>
              The page is taking too long to load. This might be due to:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Slow network connection</li>
                <li>Large amount of data being fetched</li>
                <li>Server processing delay</li>
                <li>Network connectivity issues</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-2">
            {onRetry && (
              <Button
                onClick={handleRetry}
                variant="default"
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
            <Button
              onClick={handleRefreshPage}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Page
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <Clock className="inline-block mr-1 h-3 w-3" />
            Timeout after {(timeoutMs / 1000).toFixed(0)} seconds
          </div>
        </div>
      </div>
    );
  }

  // Show loading state with progress
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="text-center space-y-4">
          <div className="relative inline-flex">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            {showProgress && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium">
                  {Math.floor((elapsedTime / timeoutMs) * 100)}%
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{loadingMessage}</p>
          {showProgress && (
            <div className="w-64 bg-secondary rounded-full h-2 mx-auto overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {(elapsedTime / 1000).toFixed(1)}s / {(timeoutMs / 1000).toFixed(0)}s
          </p>
        </div>
      </div>
    );
  }

  // Render content when not loading
  return <>{children}</>;
};

/**
 * Hook version of PageLoadingTimeout
 * Returns timeout state for more custom control
 *
 * @example
 * ```tsx
 * const { timeoutReached, elapsedTime } = usePageLoadingTimeout({
 *   isLoading,
 *   timeoutMs: 15000,
 *   onTimeout: () => console.warn('Timeout!'),
 * });
 * ```
 */
export const usePageLoadingTimeout = ({
  isLoading,
  timeoutMs = 15000,
  onTimeout,
}: {
  isLoading: boolean;
  timeoutMs?: number;
  onTimeout?: () => void;
}) => {
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (isLoading) {
      setTimeoutReached(false);
      setElapsedTime(0);
      startTimeRef.current = Date.now();

      timeoutRef.current = setTimeout(() => {
        console.warn(`⏱️ Loading timeout reached after ${timeoutMs}ms`);
        setTimeoutReached(true);
        onTimeout?.();
      }, timeoutMs);

      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setElapsedTime(elapsed);
      }, 500);

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setTimeoutReached(false);
      setElapsedTime(0);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isLoading, timeoutMs, onTimeout]);

  return {
    timeoutReached,
    elapsedTime,
    progressPercentage: Math.min((elapsedTime / timeoutMs) * 100, 100),
  };
};
