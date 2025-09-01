import React, { useEffect } from 'react'
import { usePerformanceOptimization, useLazyLoading } from '@/hooks/usePerformanceOptimization'

// Performance monitoring HOC
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    const { measureRenderTime } = usePerformanceOptimization()
    
    useEffect(() => {
      const endMeasure = measureRenderTime(componentName)
      return endMeasure
    })

    return <Component {...props} />
  }
}

// Image lazy loading component
interface LazyImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  placeholder?: string
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  className,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="100%25" height="100%25" fill="%23f0f0f0"/%3E%3C/svg%3E'
}: LazyImageProps) {
  const { getOptimizedImageSrc } = usePerformanceOptimization()
  const { ref, isVisible } = useLazyLoading()

  const optimizedSrc = getOptimizedImageSrc(src, width, height)

  return (
    <img
      ref={ref}
      src={isVisible ? optimizedSrc : placeholder}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
    />
  )
}