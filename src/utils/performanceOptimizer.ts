// Performance optimization utilities
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private memoryThreshold = 100; // MB
  private performanceObserver: PerformanceObserver | null = null;

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // Optimize React Query cache
  optimizeQueryCache(queryClient: any) {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    // Remove stale queries older than 10 minutes
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    
    queries.forEach((query: any) => {
      if (query.state.dataUpdatedAt < tenMinutesAgo && !query.getObserversCount()) {
        queryClient.removeQueries(query.queryKey);
      }
    });
  }

  // Monitor memory usage and cleanup when needed
  monitorMemoryUsage(onMemoryPressure?: () => void) {
    if (!('memory' in performance)) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1048576;
      
      if (usedMB > this.memoryThreshold) {
        console.warn(`High memory usage detected: ${usedMB.toFixed(2)}MB`);
        this.performMemoryCleanup();
        onMemoryPressure?.();
      }
    };

    // Check every 30 seconds
    setInterval(checkMemory, 30000);
  }

  // Perform memory cleanup
  private performMemoryCleanup() {
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }

    // Clear unused image caches
    this.clearImageCache();
    
    // Cleanup Three.js resources if available
    this.cleanupThreeJS();
  }

  // Clear image cache
  private clearImageCache() {
    const images = document.querySelectorAll('img[data-cached="true"]');
    images.forEach((img) => {
      const htmlImg = img as HTMLImageElement;
      if (!this.isImageInViewport(htmlImg)) {
        htmlImg.src = htmlImg.dataset.placeholder || '';
        htmlImg.removeAttribute('data-cached');
      }
    });
  }

  // Check if image is in viewport
  private isImageInViewport(img: HTMLImageElement): boolean {
    const rect = img.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }

  // Cleanup Three.js resources
  private cleanupThreeJS() {
    if (typeof window !== 'undefined' && (window as any).THREE_SCENE) {
      const scene = (window as any).THREE_SCENE;
      scene.traverse((object: any) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material: any) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }
  }

  // Preload critical resources
  preloadCriticalResources(resources: string[]) {
    resources.forEach((resource) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      
      if (resource.endsWith('.js')) {
        link.as = 'script';
      } else if (resource.endsWith('.css')) {
        link.as = 'style';
      } else if (resource.match(/\.(jpg|jpeg|png|webp|avif)$/)) {
        link.as = 'image';
      }
      
      link.href = resource;
      document.head.appendChild(link);
    });
  }

  // Optimize font loading
  optimizeFontLoading() {
    const fontFaces = Array.from(document.styleSheets)
      .flatMap(sheet => {
        try {
          return Array.from(sheet.cssRules);
        } catch {
          return [];
        }
      })
      .filter(rule => rule instanceof CSSFontFaceRule) as CSSFontFaceRule[];

    fontFaces.forEach((rule) => {
      const src = rule.style.getPropertyValue('src');
      if (src && src.includes('googleapis')) {
        // Preload Google Fonts
        const url = src.match(/url\((.*?)\)/)?.[1]?.replace(/['"]/g, '');
        if (url) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'font';
          link.type = 'font/woff2';
          link.crossOrigin = 'anonymous';
          link.href = url;
          document.head.appendChild(link);
        }
      }
    });
  }

  // Measure and track performance
  measurePerformanceMetrics() {
    if (!this.performanceObserver) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure') {
            console.log(`Performance: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
          }
        });
      });
      
      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
    }
  }

  // Bundle analyzer helper
  analyzeBundleSize() {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    
    const bundleInfo = {
      scripts: scripts.map(script => ({
        src: (script as HTMLScriptElement).src,
        size: 'unknown' // Would need actual size measurement
      })),
      styles: styles.map(style => ({
        href: (style as HTMLLinkElement).href,
        size: 'unknown'
      }))
    };
    
    console.table(bundleInfo.scripts);
    console.table(bundleInfo.styles);
    
    return bundleInfo;
  }

  // Image optimization helpers
  convertToWebP(imageUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const webpUrl = canvas.toDataURL('image/webp', 0.8);
        resolve(webpUrl);
      };
      
      img.src = imageUrl;
    });
  }

  // Network optimization
  optimizeNetworkRequests() {
    // Enable HTTP/2 Server Push hints
    const criticalResources = [
      '/assets/index.css',
      '/assets/index.js'
    ];
    
    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.css') ? 'style' : 'script';
      document.head.appendChild(link);
    });
  }
}