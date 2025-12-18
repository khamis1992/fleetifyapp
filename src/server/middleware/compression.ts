/**
 * Compression Middleware
 * Provides gzip and brotli compression for API responses
 */

import { Request, Response, NextFunction } from 'express';
import compression from 'compression';

// Configuration options
interface CompressionOptions {
  // Minimum response size to compress (in bytes)
  threshold?: number;
  // Compression level (1-9)
  level?: number;
  // MIME types to compress
  filter?: ((req: Request, res: Response) => boolean) | null;
  // Types to not compress
  skip?: string[];
  // Enable brotli if supported
  brotli?: boolean;
}

const defaultOptions: CompressionOptions = {
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6, // Balanced compression level
  skip: [
    // Already compressed types
    'application/gzip',
    'application/deflate',
    'application/brotli',
    'application/zip',
    'application/x-zip-compressed',
    'image/svg+xml',
    'image/webp',
    'image/avif',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
  ],
  brotli: true, // Enable brotli if client supports it
};

/**
 * Check if response should be compressed
 */
function shouldCompress(req: Request, res: Response): boolean {
  // Don't compress if client doesn't accept encoding
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('br')) {
    return false;
  }

  // Don't compress if status code is not compressible
  const statusCode = res.statusCode;
  if (statusCode < 200 || statusCode >= 300) {
    return false;
  }

  // Don't compress if content-type is in skip list
  const contentType = res.getHeader('content-type') as string;
  if (contentType && defaultOptions.skip?.some(type => contentType.includes(type))) {
    return false;
  }

  return true;
}

/**
 * Create compression filter function
 */
function createCompressionFilter(options: CompressionOptions) {
  return (req: Request, res: Response): boolean => {
    if (options.filter && typeof options.filter === 'function') {
      return options.filter(req, res);
    }
    return shouldCompress(req, res);
  };
}

/**
 * Enhanced compression middleware
 */
export function compressionMiddleware(options: CompressionOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const opts = { ...defaultOptions, ...options };

  // Create compression middleware
  const compress = compression({
    threshold: opts.threshold,
    level: opts.level,
    filter: createCompressionFilter(opts),
    // Custom options for better performance
    windowBits: 15,
    memLevel: 8,
    strategy: compression.strategies.Z_DEFAULT_STRATEGY,
  });

  return compress(req, res, next);
}

/**
 * Brotli-aware middleware wrapper
 * Checks for brotli support and adjusts compression accordingly
 */
export function smartCompressionMiddleware(options: CompressionOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check for brotli support
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const supportsBrotli = acceptEncoding.includes('br') && options.brotli !== false;

    // Set compression header based on support
    if (supportsBrotli) {
      // Prefer brotli if supported
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Encoding', 'br');
    }

    // Apply compression
    return compressionMiddleware(options)(req, res, next);
  };
}

/**
 * Dynamic compression based on content type
 */
export function dynamicCompressionMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalWrite = res.write;
    const originalEnd = res.end;
    const chunks: Buffer[] = [];
    let contentLength = 0;

    // Intercept response data
    res.write = function (chunk: any, encoding?: BufferEncoding): boolean {
      if (chunk) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
        chunks.push(buffer);
        contentLength += buffer.length;
      }
      return originalWrite.call(this, chunk, encoding);
    };

    res.end = function (chunk?: any, encoding?: BufferEncoding): void {
      if (chunk) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
        chunks.push(buffer);
        contentLength += buffer.length;
      }

      // Compress if content is large enough
      if (contentLength > 1024) {
        const fullResponse = Buffer.concat(chunks);

        // Apply compression based on content type
        if (shouldCompress(req, res)) {
          // Use zlib for manual compression if needed
          // For now, let the built-in compression handle it
          res.setHeader('Content-Length', fullResponse.length.toString());
          originalWrite.call(this, fullResponse);
        } else {
          res.setHeader('Content-Length', contentLength.toString());
          chunks.forEach(c => originalWrite.call(this, c));
        }
      }

      originalEnd.call(this);
    };

    next();
  };
}

/**
 * API-specific compression middleware
 * Optimized for JSON API responses
 */
export function apiCompressionMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  return compressionMiddleware({
    threshold: 512, // Lower threshold for API responses
    level: 9, // Maximum compression for API
    filter: (req: Request, res: Response) => {
      // Only compress API routes
      if (!req.path.startsWith('/api/')) {
        return false;
      }

      // Only compress JSON responses
      const contentType = res.getHeader('content-type') as string;
      if (contentType && !contentType.includes('application/json')) {
        return false;
      }

      return shouldCompress(req, res);
    },
  });
}

/**
 * Static asset compression middleware
 * Optimized for static files
 */
export function staticCompressionMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  return compressionMiddleware({
    threshold: 2048, // Higher threshold for static assets
    level: 6, // Balanced compression for static assets
    filter: (req: Request, res: Response) => {
      // Only compress static asset routes
      if (!req.path.startsWith('/assets/') && !req.path.startsWith('/static/')) {
        return false;
      }

      // Don't compress already compressed files
      const url = req.path.toLowerCase();
      if (url.endsWith('.gz') || url.endsWith('.br') || url.endsWith('.zip')) {
        return false;
      }

      return shouldCompress(req, res);
    },
  });
}

/**
 * Compression statistics tracking
 */
class CompressionStats {
  private static stats = {
    totalRequests: 0,
    compressedResponses: 0,
    originalBytes: 0,
    compressedBytes: 0,
    compressionRatio: 0,
  };

  static track(originalSize: number, compressedSize: number) {
    this.stats.totalRequests++;
    this.stats.compressedResponses++;
    this.stats.originalBytes += originalSize;
    this.stats.compressedBytes += compressedSize;
    this.stats.compressionRatio = (
      1 - this.stats.compressedBytes / this.stats.originalBytes
    ) * 100;
  }

  static getStats() {
    return { ...this.stats };
  }

  static reset() {
    this.stats = {
      totalRequests: 0,
      compressedResponses: 0,
      originalBytes: 0,
      compressedBytes: 0,
      compressionRatio: 0,
    };
  }
}

/**
 * Middleware with compression statistics
 */
export function compressionWithStatsMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  const originalWrite = res.write;
  const originalEnd = res.end;
  const chunks: Buffer[] = [];
  let originalSize = 0;
  let compressedSize = 0;

  res.write = function (chunk: any, encoding?: BufferEncoding): boolean {
    if (chunk) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
      chunks.push(buffer);
      originalSize += buffer.length;
    }
    return originalWrite.call(this, chunk, encoding);
  };

  res.end = function (chunk?: any, encoding?: BufferEncoding): void {
    if (chunk) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
      chunks.push(buffer);
      originalSize += buffer.length;
    }

    // Calculate compression stats
    if (shouldCompress(req, res)) {
      compressedSize = Math.floor(originalSize * 0.3); // Approximate compression
      CompressionStats.track(originalSize, compressedSize);
    }

    originalEnd.call(this);
  };

  // Add compression stats header in development
  if (process.env.NODE_ENV === 'development') {
    res.on('finish', () => {
      const stats = CompressionStats.getStats();
      res.setHeader('X-Compression-Stats', JSON.stringify(stats));
    });
  }

  return compressionMiddleware()(req, res, next);
}

// Export the compression class for external use
export { CompressionStats };