import { logger } from '@/lib/logger';

interface BatteryLevel {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

interface BatteryOptimizationConfig {
  enableLowPowerMode: boolean;
  reduceAnimations: boolean;
  limitBackgroundTasks: boolean;
  optimizeImages: boolean;
  reduceNetworkRequests: boolean;
  enableAdaptivePerformance: boolean;
}

export class BatteryManager {
  private battery: Battery | null = null;
  private listeners: Set<(batteryInfo: BatteryLevel) => void> = new Set();
  private config: BatteryOptimizationConfig;
  private isLowPowerMode: boolean = false;
  private performanceLevel: 'high' | 'medium' | 'low' = 'high';

  constructor(config: Partial<BatteryOptimizationConfig> = {}) {
    this.config = {
      enableLowPowerMode: true,
      reduceAnimations: true,
      limitBackgroundTasks: true,
      optimizeImages: true,
      reduceNetworkRequests: true,
      enableAdaptivePerformance: true,
      ...config
    };
  }

  async initialize(): Promise<boolean> {
    try {
      if ('getBattery' in navigator) {
        this.battery = await (navigator as any).getBattery();
        this.setupEventListeners();
        this.updatePerformanceLevel();
        logger.info('Battery Manager initialized successfully');
        return true;
      } else {
        logger.warn('Battery API not supported on this device');
        // Fallback to performance-based detection
        this.initializePerformanceBasedDetection();
        return false;
      }
    } catch (error) {
      logger.error('Failed to initialize Battery Manager:', error);
      this.initializePerformanceBasedDetection();
      return false;
    }
  }

  private initializePerformanceBasedDetection() {
    // Fallback: Detect low-end devices by hardware capabilities
    const isLowEnd = this.detectLowEndDevice();
    this.isLowPowerMode = isLowEnd;
    this.performanceLevel = isLowEnd ? 'low' : 'medium';
    logger.info(`Performance-based detection: ${isLowEnd ? 'Low-end' : 'High-end'} device detected`);
  }

  private detectLowEndDevice(): boolean {
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory || 4;
    const connection = (navigator as any).connection;

    // Consider device low-end if it has limited resources
    const isLowCPU = hardwareConcurrency <= 2;
    const isLowMemory = deviceMemory <= 2;
    const isSlowConnection = connection && (
      connection.effectiveType === 'slow-2g' ||
      connection.effectiveType === '2g' ||
      connection.downlink < 1
    );

    return isLowCPU || isLowMemory || isSlowConnection;
  }

  private setupEventListeners() {
    if (!this.battery) return;

    const handleBatteryChange = () => {
      const batteryInfo = this.getBatteryInfo();
      this.updatePerformanceLevel();
      this.notifyListeners(batteryInfo);

      // Log significant battery level changes
      if (batteryInfo.level < 0.2 && !batteryInfo.charging) {
        logger.warn(`Critical battery level: ${Math.round(batteryInfo.level * 100)}%`);
      }
    };

    this.battery.addEventListener('levelchange', handleBatteryChange);
    this.battery.addEventListener('chargingchange', handleBatteryChange);
    this.battery.addEventListener('chargingtimechange', handleBatteryChange);
    this.battery.addEventListener('dischargingtimechange', handleBatteryChange);
  }

  private updatePerformanceLevel() {
    const batteryInfo = this.getBatteryInfo();

    if (batteryInfo.charging) {
      this.performanceLevel = 'high';
    } else if (batteryInfo.level < 0.2) {
      this.performanceLevel = 'low';
    } else if (batteryInfo.level < 0.5) {
      this.performanceLevel = 'medium';
    } else {
      this.performanceLevel = 'high';
    }

    this.isLowPowerMode = this.performanceLevel === 'low';
    this.applyOptimizations();
  }

  private applyOptimizations() {
    if (!this.config.enableLowPowerMode) return;

    const root = document.documentElement;

    switch (this.performanceLevel) {
      case 'low':
        root.setAttribute('data-battery-mode', 'low');
        this.applyLowPowerOptimizations();
        break;
      case 'medium':
        root.setAttribute('data-battery-mode', 'medium');
        this.applyMediumPowerOptimizations();
        break;
      case 'high':
        root.removeAttribute('data-battery-mode');
        this.removeOptimizations();
        break;
    }
  }

  private applyLowPowerOptimizations() {
    if (!this.config.reduceAnimations) return;

    // Inject CSS for performance optimizations
    let style = document.getElementById('battery-optimizations');
    if (!style) {
      style = document.createElement('style');
      style.id = 'battery-optimizations';
      document.head.appendChild(style);
    }

    style.textContent = `
      /* Low Power Mode Optimizations */
      [data-battery-mode="low"] * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }

      [data-battery-mode="low"] .video,
      [data-battery-mode="low"] iframe {
        display: none !important;
      }

      [data-battery-mode="low"] img {
        image-rendering: pixelated;
        filter: contrast(0.9);
      }

      [data-battery-mode="low"] .backdrop-blur {
        backdrop-filter: none !important;
      }

      [data-battery-mode="low"] .shadow-lg,
      [data-battery-mode="low"] .shadow-xl {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
      }
    `;
  }

  private applyMediumPowerOptimizations() {
    // Moderate optimizations
    let style = document.getElementById('battery-optimizations');
    if (style) {
      style.textContent = `
        /* Medium Power Mode Optimizations */
        [data-battery-mode="medium"] * {
          animation-duration: 0.1s !important;
          transition-duration: 0.1s !important;
        }

        [data-battery-mode="medium"] .backdrop-blur {
          backdrop-filter: blur(2px) !important;
        }
      `;
    }
  }

  private removeOptimizations() {
    const style = document.getElementById('battery-optimizations');
    if (style) {
      style.remove();
    }
  }

  getBatteryInfo(): BatteryLevel {
    if (!this.battery) {
      // Fallback values
      return {
        level: this.isLowPowerMode ? 0.15 : 0.8,
        charging: false,
        chargingTime: Infinity,
        dischargingTime: this.isLowPowerMode ? 3600 : 7200
      };
    }

    return {
      level: this.battery.level,
      charging: this.battery.charging,
      chargingTime: this.battery.chargingTime,
      dischargingTime: this.battery.dischargingTime
    };
  }

  getPerformanceLevel(): 'high' | 'medium' | 'low' {
    return this.performanceLevel;
  }

  isLowPowerModeActive(): boolean {
    return this.isLowPowerMode;
  }

  shouldOptimizeForBattery(): boolean {
    return this.config.enableLowPowerMode &&
           (this.isLowPowerMode || this.performanceLevel !== 'high');
  }

  getOptimalConfigForBattery() {
    const batteryLevel = this.getBatteryInfo().level;
    const baseConfig = {
      enableLazyLoading: true,
      reduceAnimations: this.config.reduceAnimations,
      limitBackgroundTasks: this.config.limitBackgroundTasks,
      optimizeImages: this.config.optimizeImages,
      reduceNetworkRequests: this.config.reduceNetworkRequests
    };

    if (this.isLowPowerMode || batteryLevel < 0.3) {
      return {
        ...baseConfig,
        maxConcurrentRequests: 2,
        imageQuality: 'low',
        videoAutoPlay: false,
        refreshInterval: 60000, // 1 minute
        cacheSize: 50 * 1024 * 1024 // 50MB
      };
    } else if (batteryLevel < 0.6) {
      return {
        ...baseConfig,
        maxConcurrentRequests: 4,
        imageQuality: 'medium',
        videoAutoPlay: false,
        refreshInterval: 30000, // 30 seconds
        cacheSize: 100 * 1024 * 1024 // 100MB
      };
    } else {
      return {
        ...baseConfig,
        maxConcurrentRequests: 6,
        imageQuality: 'high',
        videoAutoPlay: true,
        refreshInterval: 15000, // 15 seconds
        cacheSize: 200 * 1024 * 1024 // 200MB
      };
    }
  }

  onBatteryChange(callback: (batteryInfo: BatteryLevel) => void): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(batteryInfo: BatteryLevel) {
    this.listeners.forEach(callback => {
      try {
        callback(batteryInfo);
      } catch (error) {
        logger.error('Error in battery change listener:', error);
      }
    });
  }

  updateConfig(newConfig: Partial<BatteryOptimizationConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.applyOptimizations();
  }

  getConfig(): BatteryOptimizationConfig {
    return { ...this.config };
  }

  // Utility methods for specific battery-aware actions
  shouldDelayBackgroundTask(): boolean {
    return this.shouldOptimizeForBattery() && !this.getBatteryInfo().charging;
  }

  getOptimalRetryDelay(baseDelay: number): number {
    if (this.performanceLevel === 'low') {
      return baseDelay * 3;
    } else if (this.performanceLevel === 'medium') {
      return baseDelay * 1.5;
    }
    return baseDelay;
  }

  shouldPreloadResource(priority: 'high' | 'medium' | 'low' = 'medium'): boolean {
    if (!this.shouldOptimizeForBattery()) return true;

    const batteryLevel = this.getBatteryInfo().level;
    const isCharging = this.getBatteryInfo().charging;

    if (isCharging) return true;
    if (priority === 'high') return batteryLevel > 0.3;
    if (priority === 'medium') return batteryLevel > 0.5;
    return false; // low priority
  }

  cleanup() {
    this.listeners.clear();
    this.removeOptimizations();
  }
}

// Singleton instance
export const batteryManager = new BatteryManager();

// Auto-initialize when available
if (typeof window !== 'undefined') {
  batteryManager.initialize().catch(error => {
    logger.error('Failed to auto-initialize Battery Manager:', error);
  });
}