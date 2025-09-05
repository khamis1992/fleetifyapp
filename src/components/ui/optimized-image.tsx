import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useResponsiveBreakpoint } from '@/hooks/use-mobile';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  
  // أحجام مختلفة للأجهزة
  mobileSrc?: string;
  tabletSrc?: string;
  desktopSrc?: string;
  
  // تحسينات الأداء
  lazy?: boolean;
  webp?: boolean;
  quality?: number;
  
  // أحجام مخصصة
  sizes?: string;
  srcSet?: string;
  
  // تحسينات التحميل
  priority?: boolean;
  placeholder?: 'blur' | 'empty' | string;
  blurDataURL?: string;
  
  // تحسينات الاستجابة
  responsive?: boolean;
  aspectRatio?: string;
  
  // معالجات الأحداث
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onError?: (error: string) => void;
  
  // تخصيص الأنماط
  containerClassName?: string;
  imageClassName?: string;
  placeholderClassName?: string;
}

/**
 * مكون صورة محسن للأداء والاستجابة
 * يدعم التحميل الكسول، تحسين الأحجام، والتنسيقات المتقدمة
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  mobileSrc,
  tabletSrc,
  desktopSrc,
  lazy = true,
  webp = true,
  quality = 85,
  sizes,
  srcSet,
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  responsive = true,
  aspectRatio,
  onLoadStart,
  onLoadComplete,
  onError,
  containerClassName,
  imageClassName,
  placeholderClassName,
  className,
  ...props
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsiveBreakpoint();
  const { getOptimizedImageSrc, createIntersectionObserver } = usePerformanceOptimization();
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(!lazy || priority);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // تحديد المصدر المناسب حسب الجهاز
  const getDeviceSpecificSrc = useCallback(() => {
    if (isMobile && mobileSrc) return mobileSrc;
    if (isTablet && tabletSrc) return tabletSrc;
    if (isDesktop && desktopSrc) return desktopSrc;
    return src;
  }, [isMobile, isTablet, isDesktop, mobileSrc, tabletSrc, desktopSrc, src]);

  // تحسين المصدر
  const optimizedSrc = useMemo(() => {
    const deviceSrc = getDeviceSpecificSrc();
    return getOptimizedImageSrc(deviceSrc, {
      quality,
      format: webp ? 'webp' : undefined
    });
  }, [getDeviceSpecificSrc, getOptimizedImageSrc, quality, webp]);

  // إنشاء srcSet محسن
  const generateSrcSet = useCallback(() => {
    if (srcSet) return srcSet;
    
    const baseSrc = getDeviceSpecificSrc();
    const densities = [1, 1.5, 2, 3];
    
    return densities
      .map(density => {
        const optimized = getOptimizedImageSrc(baseSrc, {
          quality: Math.max(60, quality - (density - 1) * 10),
          format: webp ? 'webp' : undefined
        });
        return `${optimized} ${density}x`;
      })
      .join(', ');
  }, [srcSet, getDeviceSpecificSrc, getOptimizedImageSrc, quality, webp]);

  // إنشاء sizes محسن
  const generateSizes = useCallback(() => {
    if (sizes) return sizes;
    
    return [
      '(max-width: 640px) 100vw',
      '(max-width: 1024px) 50vw',
      '33vw'
    ].join(', ');
  }, [sizes]);

  // مراقبة الرؤية للتحميل الكسول
  useEffect(() => {
    if (!lazy || priority) return;

    const observer = createIntersectionObserver?.(
      (visible) => setIsVisible(visible),
      { rootMargin: '50px' }
    );

    if (observer && containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [lazy, priority, createIntersectionObserver]);

  // معالجة تحميل الصورة
  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
    setIsLoading(false);
    setError(null);
    onLoadComplete?.();
  }, [onLoadComplete]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const errorMessage = 'فشل في تحميل الصورة';
    setError(errorMessage);
    setIsLoading(false);
    onError?.(errorMessage);
  }, [onError]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    onLoadStart?.();
  }, [onLoadStart]);

  // تحديد أنماط الحاوية
  const containerStyles = useMemo(() => {
    const baseStyles = 'relative overflow-hidden';
    const responsiveStyles = responsive ? 'w-full' : '';
    const aspectRatioStyles = aspectRatio ? `aspect-[${aspectRatio}]` : '';
    
    return cn(baseStyles, responsiveStyles, aspectRatioStyles, containerClassName);
  }, [responsive, aspectRatio, containerClassName]);

  // تحديد أنماط الصورة
  const imageStyles = useMemo(() => {
    const baseStyles = 'transition-opacity duration-300';
    const loadingStyles = isLoaded ? 'opacity-100' : 'opacity-0';
    const responsiveStyles = responsive ? 'w-full h-full object-cover' : '';
    
    return cn(baseStyles, loadingStyles, responsiveStyles, imageClassName, className);
  }, [isLoaded, responsive, imageClassName, className]);

  // عنصر placeholder
  const renderPlaceholder = () => {
    if (isLoaded || !placeholder) return null;

    const placeholderStyles = cn(
      'absolute inset-0 flex items-center justify-center bg-muted',
      placeholderClassName
    );

    if (placeholder === 'blur' && blurDataURL) {
      return (
        <div className={placeholderStyles}>
          <img
            src={blurDataURL}
            alt=""
            className="w-full h-full object-cover filter blur-sm scale-110"
          />
        </div>
      );
    }

    if (placeholder === 'empty') {
      return <div className={placeholderStyles} />;
    }

    if (typeof placeholder === 'string') {
      return (
        <div className={placeholderStyles}>
          <span className="text-muted-foreground text-sm">{placeholder}</span>
        </div>
      );
    }

    return (
      <div className={placeholderStyles}>
        <div className="w-8 h-8 bg-muted-foreground/20 rounded animate-pulse" />
      </div>
    );
  };

  // عنصر التحميل
  const renderLoadingIndicator = () => {
    if (!isLoading) return null;

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  };

  // عنصر الخطأ
  const renderError = () => {
    if (!error) return null;

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-2 text-destructive">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <span className="text-xs text-destructive">{error}</span>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={containerStyles}>
      {renderPlaceholder()}
      {renderLoadingIndicator()}
      {renderError()}
      
      {isVisible && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          alt={alt}
          srcSet={generateSrcSet()}
          sizes={generateSizes()}
          loading={lazy && !priority ? 'lazy' : 'eager'}
          decoding="async"
          className={imageStyles}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onLoadStart={handleLoadStart}
          {...props}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
