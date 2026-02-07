import { lazy, ComponentType, LazyExoticComponent } from 'react';

// Retry configuration
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 1000; // 1 second

// Track failed chunks to avoid infinite loops
const failedChunks = new Set<string>();

/**
 * Enhanced lazy loading with retry mechanism and better error handling
 * This helps prevent "Failed to fetch dynamically imported module" errors
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T } | { [key: string]: T }>,
  componentName?: string,
  namedExport?: string
): LazyExoticComponent<T> {
  return lazy(async () => {
    let retryCount = 0;
    const chunkName = componentName || 'Component';

    const attemptImport = async (): Promise<{ default: T }> => {
      try {
        const module = await importFn();

        // Handle named exports
        if (namedExport) {
          if (namedExport in module) {
            return { default: (module as any)[namedExport] };
          }
          throw new Error(`Named export '${namedExport}' not found in module`);
        }

        // Check if module has default export
        if ('default' in module) {
          return module as { default: T };
        }

        // If no default export, try to use the first export
        const keys = Object.keys(module);
        if (keys.length === 1) {
          return { default: (module as any)[keys[0]] };
        }

        throw new Error('No default export found in module');
      } catch (error) {
        retryCount++;

        // Check if we've exceeded max retries
        if (retryCount > MAX_RETRY_COUNT) {
          console.error(
            `Failed to load ${chunkName} after ${MAX_RETRY_COUNT} attempts:`,
            error
          );

          // Mark this chunk as failed to prevent future attempts
          failedChunks.add(chunkName);

          // Check if this is a network error
          if (error instanceof Error) {
            if (error.message.includes('Failed to fetch')) {
              // Network error - might be offline or chunk deleted
              handleChunkLoadError(chunkName);
            }
          }

          throw error;
        }

        // Log retry attempt
        console.warn(
          `Retrying to load ${chunkName} (attempt ${retryCount}/${MAX_RETRY_COUNT})...`
        );

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount));

        // Clear module cache if possible (for Vite)
        if (import.meta.hot) {
          try {
            // Invalidate the module cache
            import.meta.hot.invalidate();
          } catch (e) {
            // Ignore cache clearing errors
          }
        }

        // Retry the import
        return attemptImport();
      }
    };

    return attemptImport();
  });
}

/**
 * Handle chunk load errors - typically happens when deployment creates new chunks
 */
function handleChunkLoadError(chunkName: string) {
  // Check if we're in production
  if (import.meta.env.PROD) {
    // Store the error in session storage
    const errors = JSON.parse(
      sessionStorage.getItem('chunkLoadErrors') || '[]'
    );
    errors.push({
      chunk: chunkName,
      timestamp: Date.now(),
      url: window.location.href
    });
    sessionStorage.setItem('chunkLoadErrors', JSON.stringify(errors));

    // If too many chunk errors, suggest page refresh
    if (errors.length > 2) {
      const shouldReload = window.confirm(
        'يبدو أن هناك تحديث جديد للتطبيق. هل تريد إعادة تحميل الصفحة للحصول على أحدث إصدار؟\n\n' +
        'It seems there\'s a new app update. Would you like to reload the page to get the latest version?'
      );

      if (shouldReload) {
        // Clear the error tracking
        sessionStorage.removeItem('chunkLoadErrors');
        // Force a hard reload to bypass cache
        window.location.reload();
      }
    }
  }
}

/**
 * Preload a lazy component to improve performance
 */
export function preloadComponent(
  lazyComponent: LazyExoticComponent<any>
): void {
  try {
    // Trigger the lazy loading without rendering
    const componentPromise = (lazyComponent as any)._payload;
    if (componentPromise && typeof componentPromise === 'function') {
      componentPromise();
    }
  } catch (error) {
    // Ignore preload errors - component will be loaded when needed
    console.debug('Preload failed, will load on demand:', error);
  }
}

/**
 * Clear failed chunks cache - useful after successful navigation
 */
export function clearFailedChunks(): void {
  failedChunks.clear();
  sessionStorage.removeItem('chunkLoadErrors');
}

/**
 * Check if a chunk has previously failed to load
 */
export function hasChunkFailed(chunkName: string): boolean {
  return failedChunks.has(chunkName);
}

/**
 * Dynamic import with retry and reload fallback.
 * Use this for non-component dynamic imports (e.g., utility modules).
 * Handles "Failed to fetch dynamically imported module" errors that occur
 * after deployments when old chunk hashes no longer exist on the server.
 */
export async function dynamicImportWithRetry<T>(
  importFn: () => Promise<T>,
  retries = 2
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    if (retries > 0 && error instanceof Error && error.message.includes('Failed to fetch')) {
      // Wait and retry
      await new Promise(r => setTimeout(r, 1000));
      return dynamicImportWithRetry(importFn, retries - 1);
    }

    // All retries failed — prompt page reload to get new chunk references
    if (import.meta.env.PROD && error instanceof Error && error.message.includes('Failed to fetch')) {
      const shouldReload = window.confirm(
        'تم تحديث التطبيق. يرجى إعادة تحميل الصفحة.\n\nThe app has been updated. Please reload the page.'
      );
      if (shouldReload) {
        sessionStorage.removeItem('chunkLoadErrors');
        window.location.reload();
      }
    }

    throw error;
  }
}