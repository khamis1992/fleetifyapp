import { useEffect, useCallback, useRef, useState } from 'react';
import { batteryManager } from '@/lib/mobile/BatteryManager';
import { memoryLeakDetector } from '@/lib/mobile/MemoryLeakDetector';
import { useMobileAnalytics } from '@/services/mobile/MobileAnalytics';
import { useBackgroundSync } from '@/services/mobile/BackgroundSync';
import { useTouchOptimization } from '@/components/mobile/TouchOptimization';
import { logger } from '@/lib/logger';

interface MobilePerformanceConfig {
  enableBatteryOptimization: boolean;
  enableMemoryLeakDetection: boolean;
  enableAnalytics: boolean;
  enableBackgroundSync: boolean;
  enableTouchOptimization: boolean;
  monitoringInterval: number; // milliseconds
  autoCleanupThreshold: number; // memory percentage
  enablePerformanceDashboard: boolean;
  enableHapticFeedback: boolean;
  enableOfflineSupport: boolean;
}

interface MobilePerformanceState {
  isOnline: boolean;
  batteryLevel: number;
  isCharging: boolean;
  performanceMode: 'high' | 'medium' | 'low';
  memoryUsage: number;
  memoryPercentage: number;
  activeComponents: number;
  memoryLeaks: number;
  syncStatus: {
    pending: number;
    successful: number;
    failed: number;
    lastSync: number;
  };
  networkStatus: {
    type: string;
    speed: number;
    latency: number;
  };
  sessionMetrics: {
    duration: number;
    pageViews: number;
    interactions: number;
    errors: number;
  };
  isOptimized: boolean;
  lastOptimization: number;
}

interface PerformanceMetrics {
  timestamp: number;
  memoryUsage: number;
  batteryLevel: number;
  networkLatency: number;
  renderTime: number;
  errorRate: number;
}

export const useMobilePerformance = (config: Partial<MobilePerformanceConfig> = {}) => {
  const {
    trackEvent,
    trackPerformance,
    trackError,
    forceFlush,
    getSessionInfo
  } = useMobileAnalytics();

  const {
    syncStats,
    isOnline,
    addToQueue,
    triggerSync,
    cacheData,
    getCachedData
  } = useBackgroundSync();

  const { triggerHapticFeedback } = useTouchOptimization();

  const fullConfig: MobilePerformanceConfig = {
    enableBatteryOptimization: true,
    enableMemoryLeakDetection: true,
    enableAnalytics: true,
    enableBackgroundSync: true,
    enableTouchOptimization: true,
    monitoringInterval: 5000,
    autoCleanupThreshold: 85,
    enablePerformanceDashboard: true,
    enableHapticFeedback: true,
    enableOfflineSupport: true,
    ...config
  };

  const [state, setState] = useState<MobilePerformanceState>({
    isOnline: navigator.onLine,
    batteryLevel: 100,
    isCharging: false,
    performanceMode: 'high',
    memoryUsage: 0,
    memoryPercentage: 0,
    activeComponents: 0,
    memoryLeaks: 0,
    syncStatus: {
      pending: 0,
      successful: 0,
      failed: 0,
      lastSync: 0
    },
    networkStatus: {
      type: 'unknown',
      speed: 0,
      latency: 0
    },
    sessionMetrics: {
      duration: 0,
      pageViews: 0,
      interactions: 0,
      errors: 0
    },
    isOptimized: false,
    lastOptimization: Date.now()
  });

  const [historicalMetrics, setHistoricalMetrics] = useState<PerformanceMetrics[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const batteryListenerRef = useRef<(() => void) | null>(null);
  const networkListenerRef = useRef<(() => void) | null>(null);

  // Initialize all mobile performance systems
  const initialize = useCallback(async () => {
    try {
      logger.info('Initializing Mobile Performance System');

      // Initialize battery manager
      if (fullConfig.enableBatteryOptimization) {
        await batteryManager.initialize();
        batteryListenerRef.current = batteryManager.onBatteryChange((batteryInfo) => {
          setState(prev => ({
            ...prev,
            batteryLevel: Math.round(batteryInfo.level * 100),
            isCharging: batteryInfo.charging,
            performanceMode: batteryManager.getPerformanceLevel()
          }));

          trackPerformance('battery_level', batteryInfo.level);
        });
      }

      // Initialize memory leak detection
      if (fullConfig.enableMemoryLeakDetection) {
        memoryLeakDetector.startMonitoring(fullConfig.monitoringInterval);
      }

      // Setup network monitoring
      const updateNetworkStatus = () => {
        const connection = (navigator as any).connection ||
                          (navigator as any).mozConnection ||
                          (navigator as any).webkitConnection;

        setState(prev => ({
          ...prev,
          isOnline: navigator.onLine,
          networkStatus: {
            type: connection?.effectiveType || 'unknown',
            speed: connection?.downlink || 0,
            latency: connection?.rtt || 0
          }
        }));

        trackPerformance('network_status', navigator.onLine ? 1 : 0);
      };

      window.addEventListener('online', updateNetworkStatus);
      window.addEventListener('offline', updateNetworkStatus);
      networkListenerRef.current = () => {
        window.removeEventListener('online', updateNetworkStatus);
        window.removeEventListener('offline', updateNetworkStatus);
      };

      updateNetworkStatus();

      setIsInitialized(true);
      trackEvent('mobile_performance_initialized', { config: fullConfig });

    } catch (error) {
      logger.error('Failed to initialize Mobile Performance System:', error);
      trackError(error as Error, { context: 'mobile_performance_init' });
    }
  }, [fullConfig, trackEvent, trackPerformance, trackError]);

  // Collect current performance metrics
  const collectMetrics = useCallback(() => {
    const memoryInfo = memoryLeakDetector.getCurrentMemoryInfo();
    const sessionInfo = getSessionInfo();

    const newState: Partial<MobilePerformanceState> = {
      memoryUsage: memoryLeakDetector.getMemoryUsageMB(),
      memoryPercentage: memoryLeakDetector.getMemoryUsagePercentage(),
      activeComponents: memoryLeakDetector.getComponentCount(),
      memoryLeaks: memoryLeakDetector.getMemoryLeaks().length,
      syncStatus: {
        pending: syncStats.pendingItems,
        successful: syncStats.successfulItems,
        failed: syncStats.failedItems,
        lastSync: syncStats.lastSyncTime
      },
      sessionMetrics: {
        duration: sessionInfo.duration || 0,
        pageViews: sessionInfo.pageViews?.length || 0,
        interactions: sessionInfo.interactions?.length || 0,
        errors: sessionInfo.errors?.length || 0
      }
    };

    setState(prev => ({ ...prev, ...newState }));

    // Add to historical data (keep last 100 entries)
    const newMetric: PerformanceMetrics = {
      timestamp: Date.now(),
      memoryUsage: newState.memoryUsage || 0,
      batteryLevel: state.batteryLevel,
      networkLatency: state.networkStatus.latency,
      renderTime: 0, // Would be calculated from actual render times
      errorRate: newState.sessionMetrics?.errors || 0
    };

    setHistoricalMetrics(prev => [...prev.slice(-99), newMetric]);

    // Auto-cleanup if memory threshold exceeded
    if (newState.memoryPercentage && newState.memoryPercentage > fullConfig.autoCleanupThreshold) {
      performAutoCleanup();
    }

    return newMetric;
  }, [getSessionInfo, syncStats, state.batteryLevel, state.networkStatus.latency, fullConfig.autoCleanupThreshold]);

  // Perform automatic cleanup
  const performAutoCleanup = useCallback(() => {
    try {
      logger.warn('Performing automatic cleanup due to high memory usage');

      // Force garbage collection
      memoryLeakDetector.forceGarbageCollection();

      // Clear background sync queue if too many items
      if (syncStats.pendingItems > 100) {
        // Keep only high priority items
        // This would be implemented in the background sync service
      }

      // Clear old cache entries
      // This would be implemented in the cache service

      setState(prev => ({
        ...prev,
        isOptimized: true,
        lastOptimization: Date.now()
      }));

      triggerHapticFeedback('warning');
      trackEvent('auto_cleanup_performed', {
        memoryPercentage: state.memoryPercentage,
        pendingItems: syncStats.pendingItems
      });

    } catch (error) {
      logger.error('Auto cleanup failed:', error);
      trackError(error as Error, { context: 'auto_cleanup' });
    }
  }, [state.memoryPercentage, syncStats.pendingItems, triggerHapticFeedback, trackEvent, trackError]);

  // Manual performance optimization
  const optimizePerformance = useCallback(async () => {
    try {
      logger.info('Performing manual performance optimization');

      // Optimize battery settings
      if (fullConfig.enableBatteryOptimization) {
        batteryManager.updateConfig({
          enableLowPowerMode: state.batteryLevel < 20,
          reduceAnimations: state.batteryLevel < 30,
          limitBackgroundTasks: state.batteryLevel < 40
        });
      }

      // Memory optimization
      if (fullConfig.enableMemoryLeakDetection) {
        memoryLeakDetector.forceGarbageCollection();
        const leaks = memoryLeakDetector.getMemoryLeaks();
        if (leaks.length > 0) {
          logger.warn(`${leaks.length} memory leaks detected`);
        }
      }

      // Sync optimization
      if (fullConfig.enableBackgroundSync && state.isOnline) {
        triggerSync();
      }

      // Analytics flush
      if (fullConfig.enableAnalytics) {
        await forceFlush();
      }

      setState(prev => ({
        ...prev,
        isOptimized: true,
        lastOptimization: Date.now()
      }));

      triggerHapticFeedback('success');
      trackEvent('manual_optimization_performed');

    } catch (error) {
      logger.error('Manual optimization failed:', error);
      trackError(error as Error, { context: 'manual_optimization' });
    }
  }, [
    fullConfig,
    state.batteryLevel,
    state.isOnline,
    triggerSync,
    forceFlush,
    triggerHapticFeedback,
    trackEvent,
    trackError
  ]);

  // Track component with memory leak detection
  const trackComponent = useCallback((componentName: string) => {
    if (!fullConfig.enableMemoryLeakDetection) return () => {};

    return memoryLeakDetector.trackComponent(componentName);
  }, [fullConfig.enableMemoryLeakDetection]);

  // Track render performance
  const trackRender = useCallback((componentName: string, renderFunction: () => void) => {
    const startTime = performance.now();
    renderFunction();
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    trackPerformance('component_render', renderTime, { component: componentName });

    if (renderTime > 16) { // More than one frame
      logger.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }

    return renderTime;
  }, [trackPerformance]);

  // Cache data with performance awareness
  const performantCacheData = useCallback(async (key: string, data: any, options?: any) => {
    const batteryConfig = batteryManager.getOptimalConfigForBattery();

    const cacheOptions = {
      ...options,
      compress: batteryConfig.optimizeImages,
      expiry: batteryManager.shouldOptimizeForBattery() ? 300000 : 600000 // 5min vs 10min
    };

    return cacheData(key, data, cacheOptions);
  }, [cacheData]);

  // Get cached data with network awareness
  const performantGetCachedData = useCallback(async (key: string) => {
    // Skip cache if on fast connection and charging
    if (state.isCharging && state.networkStatus.type !== 'slow-2g' && state.networkStatus.type !== '2g') {
      return null;
    }

    return getCachedData(key);
  }, [state.isCharging, state.networkStatus.type, getCachedData]);

  // Get performance insights
  const getPerformanceInsights = useCallback(() => {
    const insights = [];
    const metrics = historicalMetrics.slice(-10); // Last 10 entries

    // Memory trends
    if (metrics.length >= 2) {
      const memoryTrend = metrics[metrics.length - 1].memoryUsage - metrics[0].memoryUsage;
      if (memoryTrend > 10) {
        insights.push({ type: 'warning', message: 'Memory usage trending upward' });
      }
    }

    // Battery concerns
    if (state.batteryLevel < 20 && !state.isCharging) {
      insights.push({ type: 'error', message: 'Critical battery level' });
    } else if (state.batteryLevel < 50 && !state.isCharging) {
      insights.push({ type: 'warning', message: 'Low battery level' });
    }

    // Memory leaks
    if (state.memoryLeaks > 0) {
      insights.push({ type: 'error', message: `${state.memoryLeaks} memory leaks detected` });
    }

    // Network issues
    if (!state.isOnline) {
      insights.push({ type: 'error', message: 'Device offline' });
    } else if (state.networkStatus.latency > 1000) {
      insights.push({ type: 'warning', message: 'High network latency' });
    }

    // Sync issues
    if (state.syncStatus.failed > 10) {
      insights.push({ type: 'error', message: 'Multiple sync failures' });
    }

    return insights;
  }, [historicalMetrics, state]);

  // Export performance data
  const exportPerformanceData = useCallback(() => {
    return {
      config: fullConfig,
      state,
      historicalMetrics,
      insights: getPerformanceInsights(),
      batteryConfig: batteryManager.getConfig(),
      memoryThresholds: memoryLeakDetector.getThresholds(),
      sessionInfo: getSessionInfo(),
      timestamp: Date.now()
    };
  }, [fullConfig, state, historicalMetrics, getPerformanceInsights, getSessionInfo]);

  // Initialize on mount
  useEffect(() => {
    initialize();

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
      if (batteryListenerRef.current) {
        batteryListenerRef.current();
      }
      if (networkListenerRef.current) {
        networkListenerRef.current();
      }
      memoryLeakDetector.cleanup();
    };
  }, [initialize]);

  // Start monitoring after initialization
  useEffect(() => {
    if (isInitialized) {
      monitoringIntervalRef.current = setInterval(collectMetrics, fullConfig.monitoringInterval);
      collectMetrics(); // Initial collection

      return () => {
        if (monitoringIntervalRef.current) {
          clearInterval(monitoringIntervalRef.current);
        }
      };
    }
  }, [isInitialized, collectMetrics, fullConfig.monitoringInterval]);

  return {
    // State
    state,
    historicalMetrics,
    isInitialized,

    // Methods
    initialize,
    optimizePerformance,
    performAutoCleanup,
    trackComponent,
    trackRender,
    collectMetrics,
    getPerformanceInsights,
    exportPerformanceData,

    // Performance-aware caching
    performantCacheData,
    performantGetCachedData,

    // Haptic feedback
    triggerHapticFeedback,

    // Analytics
    trackEvent,
    trackPerformance,
    trackError,

    // Background sync
    addToQueue,
    triggerSync,

    // Utilities
    forceFlush,
    getSessionInfo
  };
};