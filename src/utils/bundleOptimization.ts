/**
 * نظام تحسين حزم البناء للتطبيق المتجاوب
 * يقوم بتقسيم الكود وتحسين التحميل حسب الجهاز
 */

// تقسيم الكود حسب الميزات
export const featureBasedChunks = {
  // الميزات الأساسية - تحميل فوري
  core: [
    'react',
    'react-dom',
    'react-router-dom',
    '@tanstack/react-query'
  ],
  
  // مكونات UI - تحميل حسب الحاجة
  ui: [
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-tabs',
    'lucide-react'
  ],
  
  // المكونات المتجاوبة - تحميل ذكي
  responsive: [
    'src/hooks/use-mobile',
    'src/hooks/useAdaptiveLayout',
    'src/components/responsive/',
    'src/components/ui/responsive-'
  ],
  
  // الرسوم البيانية - تحميل كسول
  charts: [
    'recharts',
    'src/components/charts/'
  ],
  
  // الوحدات التجارية - تحميل منفصل
  business: {
    customers: ['src/pages/Customers', 'src/components/customers/'],
    contracts: ['src/pages/Contracts', 'src/components/contracts/'],
    fleet: ['src/pages/Fleet', 'src/components/fleet/'],
    finance: ['src/pages/Finance', 'src/components/finance/'],
    reports: ['src/pages/Reports', 'src/components/reports/']
  },
  
  // المكتبات الثقيلة - تحميل عند الطلب
  heavy: [
    'date-fns',
    'zod',
    'react-hook-form'
  ]
};

// تكوين Webpack للتحسين
export const webpackOptimizationConfig = {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      // حزمة البائعين الأساسية
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 10
      },
      
      // المكونات المتجاوبة
      responsive: {
        test: /[\\/]src[\\/](hooks|components)[\\/].*responsive/,
        name: 'responsive',
        chunks: 'all',
        priority: 20
      },
      
      // الوحدات التجارية
      business: {
        test: /[\\/]src[\\/](pages|components)[\\/](customers|contracts|fleet|finance|reports)/,
        name(module: any) {
          const match = module.context.match(/[\\/](customers|contracts|fleet|finance|reports)[\\/]/);
          return match ? `business-${match[1]}` : 'business-common';
        },
        chunks: 'all',
        priority: 15
      },
      
      // المكتبات الثقيلة
      heavy: {
        test: /[\\/]node_modules[\\/](date-fns|zod|react-hook-form)/,
        name: 'heavy-libs',
        chunks: 'async',
        priority: 25
      },
      
      // الرسوم البيانية
      charts: {
        test: /[\\/]node_modules[\\/]recharts/,
        name: 'charts',
        chunks: 'async',
        priority: 30
      }
    }
  },
  
  // تحسين الحجم
  minimize: true,
  minimizer: [
    // تحسين JavaScript
    {
      terserOptions: {
        compress: {
          drop_console: process.env.NODE_ENV === 'production',
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info']
        },
        mangle: {
          safari10: true
        },
        format: {
          comments: false
        }
      }
    },
    
    // تحسين CSS
    {
      cssProcessorOptions: {
        map: {
          inline: false,
          annotation: true
        }
      }
    }
  ]
};

// تحسين Vite للتطوير والإنتاج
export const viteOptimizationConfig = {
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // المكتبات الأساسية
          if (id.includes('node_modules/react')) return 'react-vendor';
          if (id.includes('node_modules/@tanstack')) return 'query-vendor';
          
          // المكونات المتجاوبة
          if (id.includes('responsive') || id.includes('adaptive')) return 'responsive';
          
          // الوحدات التجارية
          if (id.includes('/customers/')) return 'customers';
          if (id.includes('/contracts/')) return 'contracts';
          if (id.includes('/fleet/')) return 'fleet';
          if (id.includes('/finance/')) return 'finance';
          if (id.includes('/reports/')) return 'reports';
          
          // المكتبات الثقيلة
          if (id.includes('recharts')) return 'charts';
          if (id.includes('date-fns')) return 'date-utils';
          if (id.includes('zod') || id.includes('react-hook-form')) return 'form-utils';
          
          // UI المكتبات
          if (id.includes('@radix-ui')) return 'ui-vendor';
          if (id.includes('lucide-react')) return 'icons';
        }
      }
    },
    
    // تحسين الأصول
    assetsInlineLimit: 4096, // 4KB
    cssCodeSplit: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    
    // تحسين الضغط
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true
      }
    }
  },
  
  // تحسين التطوير
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query'
    ],
    exclude: [
      // استبعاد المكونات الثقيلة من التحسين المسبق
      'recharts',
      'date-fns'
    ]
  }
};

// تحليل حجم الحزم
export const bundleAnalysisConfig = {
  // تحليل حجم الملفات
  analyzeBundle: () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        totalSize: navigation.transferSize || 0,
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    }
    return null;
  },
  
  // تحليل استخدام الذاكرة
  analyzeMemoryUsage: () => {
    if (typeof window !== 'undefined' && 'performance' in window && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }
    return null;
  },
  
  // تحليل أداء الشبكة
  analyzeNetworkPerformance: () => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }
};

// استراتيجيات التحميل المتقدمة
export const loadingStrategies = {
  // تحميل حسب الأولوية
  priorityLoading: {
    critical: ['core', 'ui'], // تحميل فوري
    important: ['responsive'], // تحميل مبكر
    normal: ['business'], // تحميل عند الحاجة
    low: ['charts', 'heavy'] // تحميل كسول
  },
  
  // تحميل حسب الجهاز
  deviceBasedLoading: {
    mobile: {
      preload: ['core', 'responsive'],
      lazy: ['charts', 'heavy', 'business']
    },
    tablet: {
      preload: ['core', 'ui', 'responsive'],
      lazy: ['charts', 'heavy']
    },
    desktop: {
      preload: ['core', 'ui', 'responsive', 'business'],
      lazy: ['charts']
    }
  },
  
  // تحميل حسب الاتصال
  connectionBasedLoading: {
    slow: {
      // 2G/3G - تحميل أساسي فقط
      preload: ['core'],
      lazy: ['ui', 'responsive', 'business', 'charts', 'heavy']
    },
    fast: {
      // 4G/5G/WiFi - تحميل متقدم
      preload: ['core', 'ui', 'responsive'],
      lazy: ['business', 'charts', 'heavy']
    }
  }
};

// مساعد لتطبيق استراتيجية التحميل
export const applyLoadingStrategy = (deviceType: string, connectionType: string) => {
  const deviceStrategy = loadingStrategies.deviceBasedLoading[deviceType as keyof typeof loadingStrategies.deviceBasedLoading];
  const connectionStrategy = loadingStrategies.connectionBasedLoading[connectionType as keyof typeof loadingStrategies.connectionBasedLoading];
  
  // دمج الاستراتيجيات
  const combinedStrategy = {
    preload: [...(deviceStrategy?.preload || []), ...(connectionStrategy?.preload || [])],
    lazy: [...(deviceStrategy?.lazy || []), ...(connectionStrategy?.lazy || [])]
  };
  
  // إزالة التكرارات
  return {
    preload: [...new Set(combinedStrategy.preload)],
    lazy: [...new Set(combinedStrategy.lazy)]
  };
};

export default {
  featureBasedChunks,
  webpackOptimizationConfig,
  viteOptimizationConfig,
  bundleAnalysisConfig,
  loadingStrategies,
  applyLoadingStrategy
};
