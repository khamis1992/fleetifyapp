/**
 * Optimized Image Component
 * Supports WebP/AVIF formats with fallbacks
 * Implements lazy loading and blur placeholders
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  blurDataURL?: string;
  placeholder?: 'blur' | 'empty';
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  blurDataURL,
  placeholder = 'blur',
  objectFit = 'cover'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [currentSrc, setCurrentSrc] = useState<string>('');

  // Generate optimized image URLs
  const generateImageURLs = (originalSrc: string) => {
    // If it's already an external URL, return as is
    if (originalSrc.startsWith('http')) {
      return {
        webp: originalSrc,
        avif: originalSrc,
        original: originalSrc
      };
    }

    // For local images, generate different formats
    const base = originalSrc.replace(/\.[^/.]+$/, '');
    return {
      avif: `${base}.avif`,
      webp: `${base}.webp`,
      original: originalSrc
    };
  };

  const { avif, webp, original } = generateImageURLs(src);

  useEffect(() => {
    if (!priority && imgRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              loadImage();
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(imgRef.current);

      return () => {
        if (imgRef.current) {
          observer.unobserve(imgRef.current);
        }
      };
    } else if (priority) {
      loadImage();
    }
  }, [priority]);

  const loadImage = async () => {
    // Try AVIF first (best compression)
    try {
      const img = new Image();
      img.src = avif;
      await img.decode();
      setCurrentSrc(avif);
      setIsLoaded(true);
      return;
    } catch {}

    // Try WebP second
    try {
      const img = new Image();
      img.src = webp;
      await img.decode();
      setCurrentSrc(webp);
      setIsLoaded(true);
      return;
    } catch {}

    // Fallback to original
    try {
      const img = new Image();
      img.src = original;
      await img.decode();
      setCurrentSrc(original);
      setIsLoaded(true);
    } catch {
      setError(true);
    }
  };

  // Generate blur placeholder if not provided
  const defaultBlur = blurDataURL || `data:image/svg+xml;base64,${btoa(`
    <svg width="${width || 400}" height="${height || 300}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <rect width="100%" height="100%" fill="#e5e7eb" opacity="0.5"/>
    </svg>
  `)}`;

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        className
      )}
      style={{ width, height }}
    >
      {/* Blur placeholder */}
      {placeholder === 'blur' && !isLoaded && (
        <img
          src={defaultBlur}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm scale-110"
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={cn(
          'w-full h-full transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          objectFit === 'cover' ? 'object-cover' :
          objectFit === 'contain' ? 'object-contain' :
          objectFit === 'fill' ? 'object-fill' :
          objectFit === 'scale-down' ? 'object-scale-down' :
          objectFit === 'none' ? 'object-none' : 'object-cover'
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
      />

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-500">
          <div className="text-center p-4">
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="mt-2 text-sm">فشل تحميل الصورة</p>
          </div>
        </div>
      )}

      {/* Loading spinner */}
      {!isLoaded && !error && priority && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};

// Memoized component for better performance
export default React.memo(OptimizedImage);