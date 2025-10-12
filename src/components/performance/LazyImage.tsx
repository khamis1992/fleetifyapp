import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
  enableLazyLoading?: boolean;
  maxConcurrentImages?: number;
  getOptimizedImageSrc?: (src: string, options: any) => string;
  placeholder?: 'blur' | 'shimmer' | 'none';
  priority?: boolean; // Disable lazy loading for above-the-fold images
  [key: string]: any;
}

const imageLoadQueue = new Set<string>();

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  quality = 75,
  onLoad,
  onError,
  enableLazyLoading = true,
  maxConcurrentImages = 5,
  getOptimizedImageSrc = (src) => src,
  placeholder = 'shimmer',
  priority = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(!enableLazyLoading || priority);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading with enhanced rootMargin for preloading
  useEffect(() => {
    if (!enableLazyLoading || priority) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '100px', // Increased for better preloading
        threshold: 0.01 // Load as soon as 1% is visible
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [enableLazyLoading, priority]);

  // Load image when visible
  useEffect(() => {
    if (!isVisible || imageLoadQueue.size >= maxConcurrentImages) {
      return;
    }

    const optimizedSrc = getOptimizedImageSrc(src, { width, height, quality });
    imageLoadQueue.add(optimizedSrc);

    const img = new Image();
    
    // Add loading attribute for native lazy loading support
    if (!priority) {
      img.loading = 'lazy';
    }
    
    img.onload = () => {
      setIsLoaded(true);
      imageLoadQueue.delete(optimizedSrc);
      onLoad?.();
    };
    img.onerror = () => {
      setError(true);
      imageLoadQueue.delete(optimizedSrc);
      onError?.();
    };
    img.src = optimizedSrc;

    return () => {
      imageLoadQueue.delete(optimizedSrc);
    };
  }, [isVisible, src, width, height, quality, onLoad, onError, maxConcurrentImages, getOptimizedImageSrc, priority]);

  const optimizedSrc = getOptimizedImageSrc(src, { width, height, quality });

  // Placeholder component
  const renderPlaceholder = () => {
    if (placeholder === 'none') return null;
    
    if (placeholder === 'blur') {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 backdrop-blur-sm" />
      );
    }
    
    // Default shimmer
    return (
      <div className="absolute inset-0 bg-muted animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer" />
      </div>
    );
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {isVisible && (
        <>
          {!isLoaded && !error && renderPlaceholder()}
          {error ? (
            <div className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground">
              <span className="text-sm">فشل في تحميل الصورة</span>
            </div>
          ) : (
            <img
              ref={imgRef}
              src={optimizedSrc}
              alt={alt}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              {...props}
            />
          )}
        </>
      )}
    </div>
  );
};

export default LazyImage;