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
  [key: string]: any;
}

const imageLoadQueue = new Set<string>();

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  quality,
  onLoad,
  onError,
  enableLazyLoading = true,
  maxConcurrentImages = 5,
  getOptimizedImageSrc = (src) => src,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(!enableLazyLoading);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!enableLazyLoading) {
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
      { rootMargin: '50px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [enableLazyLoading]);

  // Load image when visible
  useEffect(() => {
    if (!isVisible || imageLoadQueue.size >= maxConcurrentImages) {
      return;
    }

    const optimizedSrc = getOptimizedImageSrc(src, { width, height, quality });
    imageLoadQueue.add(optimizedSrc);

    const img = new Image();
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
  }, [isVisible, src, width, height, quality, onLoad, onError, maxConcurrentImages, getOptimizedImageSrc]);

  const optimizedSrc = getOptimizedImageSrc(src, { width, height, quality });

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {isVisible && (
        <>
          {!isLoaded && !error && (
            <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error ? (
            <div className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground">
              <span className="text-sm">فشل في تحميل الصورة</span>
            </div>
          ) : (
            <img
              ref={imgRef}
              src={optimizedSrc}
              alt={alt}
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