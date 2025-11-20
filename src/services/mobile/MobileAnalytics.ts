import { logger } from '@/lib/logger';

interface DeviceInfo {
  userAgent: string;
  platform: string;
  vendor: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  screenResolution: string;
  viewportSize: string;
  pixelRatio: number;
  connectionType?: string;
  effectiveConnectionType?: string;
  downlink?: number;
  rtt?: number;
  language: string;
  timezone: string;
}

interface PerformanceMetrics {
  // Core Web Vitals
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;

  // Custom metrics
  appLoadTime: number;
  routeLoadTime: number;
  componentRenderTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  batteryLevel?: number;
  networkLatency: number;
  errorRate: number;
}

interface CrashReport {
  id: string;
  timestamp: number;
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  userAgent: string;
  url: string;
  line?: number;
  column?: number;
  source?: string;
  deviceInfo: DeviceInfo;
  performanceMetrics: PerformanceMetrics;
  userAction: string;
  sessionDuration: number;
  memorySnapshot?: any;
  batteryInfo?: any;
  networkInfo?: any;
  appVersion: string;
  buildNumber: string;
}

interface UserSession {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number;
  pageViews: string[];
  interactions: UserInteraction[];
  errors: string[];
  performanceMetrics: PerformanceMetrics[];
  deviceInfo: DeviceInfo;
  networkConditions: NetworkCondition[];
  batteryLevels: number[];
}

interface UserInteraction {
  type: 'click' | 'tap' | 'swipe' | 'scroll' | 'input' | 'navigation' | 'form_submit';
  element?: string;
  timestamp: number;
  duration?: number;
  coordinates?: { x: number; y: number };
  value?: string;
  route?: string;
}

interface NetworkCondition {
  timestamp: number;
  type: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface AnalyticsConfig {
  enablePerformanceTracking: boolean;
  enableCrashReporting: boolean;
  enableUserInteractionTracking: boolean;
  enableNetworkMonitoring: boolean;
  enableBatteryMonitoring: boolean;
  samplingRate: number; // 0.0 to 1.0
  batchSize: number;
  flushInterval: number; // milliseconds
  endpoint?: string;
  apiKey?: string;
  debug: boolean;
}

export class MobileAnalytics {
  private config: AnalyticsConfig;
  private session: UserSession;
  private eventQueue: any[] = [];
  private performanceObserver: PerformanceObserver | null = null;
  private isInitialized: boolean = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private deviceInfo: DeviceInfo;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enablePerformanceTracking: true,
      enableCrashReporting: true,
      enableUserInteractionTracking: true,
      enableNetworkMonitoring: true,
      enableBatteryMonitoring: true,
      samplingRate: 1.0,
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      debug: process.env.NODE_ENV === 'development',
      ...config
    };

    this.deviceInfo = this.collectDeviceInfo();
    this.session = this.createSession();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize performance observers
      if (this.config.enablePerformanceTracking) {
        this.setupPerformanceObservers();
      }

      // Setup error handlers for crash reporting
      if (this.config.enableCrashReporting) {
        this.setupErrorHandlers();
      }

      // Setup user interaction tracking
      if (this.config.enableUserInteractionTracking) {
        this.setupInteractionTracking();
      }

      // Setup network monitoring
      if (this.config.enableNetworkMonitoring) {
        this.setupNetworkMonitoring();
      }

      // Setup battery monitoring
      if (this.config.enableBatteryMonitoring) {
        this.setupBatteryMonitoring();
      }

      // Start periodic flush timer
      this.startFlushTimer();

      this.isInitialized = true;
      logger.info('Mobile Analytics initialized successfully');

      // Track session start
      this.trackEvent('session_start', {
        sessionId: this.session.id,
        deviceInfo: this.deviceInfo
      });

    } catch (error) {
      logger.error('Failed to initialize Mobile Analytics:', error);
    }
  }

  private collectDeviceInfo(): DeviceInfo {
    const connection = (navigator as any).connection ||
                      (navigator as any).mozConnection ||
                      (navigator as any).webkitConnection;

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor || '',
      hardwareConcurrency: navigator.hardwareConcurrency || 1,
      deviceMemory: (navigator as any).deviceMemory || 4,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio || 1,
      connectionType: connection?.type,
      effectiveConnectionType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  private createSession(): UserSession {
    return {
      id: this.generateSessionId(),
      startTime: Date.now(),
      duration: 0,
      pageViews: [window.location.pathname],
      interactions: [],
      errors: [],
      performanceMetrics: [],
      deviceInfo: this.deviceInfo,
      networkConditions: [],
      batteryLevels: []
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupPerformanceObservers(): void {
    try {
      // Core Web Vitals
      if ('PerformanceObserver' in window) {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processPerformanceEntry(entry);
          }
        });

        this.performanceObserver.observe({ entryTypes: [
          'navigation',
          'paint',
          'layout-shift',
          'largest-contentful-paint',
          'first-input',
          'long-task'
        ]});
      }
    } catch (error) {
      logger.error('Failed to setup performance observers:', error);
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    const timestamp = Date.now();
    let metric: any = { timestamp, name: entry.name };

    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        metric = {
          ...metric,
          type: 'navigation',
          loadTime: navEntry.loadEventEnd - navEntry.loadEventStart,
          domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
          firstPaint: navEntry.loadEventStart,
          appLoadTime: navEntry.loadEventEnd - navEntry.fetchStart
        };
        break;

      case 'paint':
        metric = {
          ...metric,
          type: 'paint',
          time: entry.startTime
        };
        break;

      case 'largest-contentful-paint':
        metric = {
          ...metric,
          type: 'largest-contentful-paint',
          time: entry.startTime
        };
        break;

      case 'first-input':
        const inputEntry = entry as PerformanceEventTiming;
        metric = {
          ...metric,
          type: 'first-input-delay',
          delay: inputEntry.processingStart - inputEntry.startTime
        };
        break;

      case 'layout-shift':
        const layoutEntry = entry as PerformanceLayoutShift;
        if (!layoutEntry.hadRecentInput) {
          metric = {
            ...metric,
            type: 'layout-shift',
            value: layoutEntry.value
          };
        }
        break;

      case 'long-task':
        metric = {
          ...metric,
          type: 'long-task',
          duration: entry.duration
        };
        break;
    }

    this.addMetricToSession(metric);
  }

  private addMetricToSession(metric: any): void {
    this.session.performanceMetrics.push(metric);
  }

  private setupErrorHandlers(): void {
    // Global error handler
    const handleError = (event: ErrorEvent) => {
      this.reportCrash({
        id: this.generateCrashId(),
        timestamp: Date.now(),
        error: {
          message: event.message,
          stack: event.error?.stack,
          name: event.error?.name || 'Error'
        },
        userAgent: navigator.userAgent,
        url: event.filename || window.location.href,
        line: event.lineno,
        column: event.colno,
        source: 'global_error_handler',
        deviceInfo: this.deviceInfo,
        performanceMetrics: this.getCurrentPerformanceMetrics(),
        userAction: 'unknown',
        sessionDuration: Date.now() - this.session.startTime,
        appVersion: process.env.REACT_APP_VERSION || 'unknown',
        buildNumber: process.env.REACT_APP_BUILD_NUMBER || 'unknown'
      });
    };

    // Unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      this.reportCrash({
        id: this.generateCrashId(),
        timestamp: Date.now(),
        error: {
          message: String(event.reason),
          name: 'UnhandledPromiseRejection'
        },
        userAgent: navigator.userAgent,
        url: window.location.href,
        source: 'unhandled_promise_rejection',
        deviceInfo: this.deviceInfo,
        performanceMetrics: this.getCurrentPerformanceMetrics(),
        userAction: 'unknown',
        sessionDuration: Date.now() - this.session.startTime,
        appVersion: process.env.REACT_APP_VERSION || 'unknown',
        buildNumber: process.env.REACT_APP_BUILD_NUMBER || 'unknown'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
  }

  private generateCrashId(): string {
    return `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupInteractionTracking(): void {
    // Track user interactions
    ['click', 'tap', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        const target = event.target as Element;
        this.trackInteraction(eventType, target);
      });
    });

    // Track route changes
    window.addEventListener('popstate', () => {
      this.trackPageView(window.location.pathname);
    });

    // Override pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.trackPageView(window.location.pathname);
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.trackPageView(window.location.pathname);
    };
  }

  private trackInteraction(type: string, element: Element): void {
    const interaction: UserInteraction = {
      type: type as any,
      element: element.tagName.toLowerCase(),
      timestamp: Date.now(),
      coordinates: {
        x: (event as any).clientX,
        y: (event as any).clientY
      },
      route: window.location.pathname
    };

    this.session.interactions.push(interaction);
  }

  private setupNetworkMonitoring(): void {
    const connection = (navigator as any).connection ||
                      (navigator as any).mozConnection ||
                      (navigator as any).webkitConnection;

    if (connection) {
      const updateNetworkCondition = () => {
        const condition: NetworkCondition = {
          timestamp: Date.now(),
          type: connection.type || 'unknown',
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false
        };

        this.session.networkConditions.push(condition);
      };

      connection.addEventListener('change', updateNetworkCondition);
      updateNetworkCondition(); // Initial condition
    }
  }

  private setupBatteryMonitoring(): void {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: Battery) => {
        const updateBatteryLevel = () => {
          this.session.batteryLevels.push(battery.level);
        };

        battery.addEventListener('levelchange', updateBatteryLevel);
        updateBatteryLevel(); // Initial level
      });
    }
  }

  private getCurrentPerformanceMetrics(): PerformanceMetrics {
    const memory = (performance as any).memory;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    return {
      appLoadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
      routeLoadTime: 0, // Will be calculated separately
      componentRenderTime: 0, // Will be calculated separately
      apiResponseTime: 0, // Will be calculated separately
      memoryUsage: memory ? memory.usedJSHeapSize : 0,
      batteryLevel: this.session.batteryLevels[this.session.batteryLevels.length - 1],
      networkLatency: 0, // Will be calculated separately
      errorRate: this.session.errors.length / Math.max(1, this.session.interactions.length)
    };
  }

  // Public API methods
  trackEvent(eventName: string, properties?: object): void {
    if (!this.shouldTrack()) return;

    const event = {
      name: eventName,
      timestamp: Date.now(),
      sessionId: this.session.id,
      properties: properties || {},
      deviceInfo: this.deviceInfo
    };

    this.eventQueue.push(event);

    if (this.config.debug) {
      logger.debug('Analytics Event:', event);
    }
  }

  trackPageView(path: string): void {
    if (!this.shouldTrack()) return;

    this.session.pageViews.push(path);
    this.trackEvent('page_view', { path });
  }

  trackUserAction(action: string, properties?: object): void {
    if (!this.shouldTrack()) return;

    this.trackEvent('user_action', {
      action,
      ...properties
    });
  }

  trackPerformance(metric: string, value: number, properties?: object): void {
    if (!this.shouldTrack()) return;

    this.trackEvent('performance', {
      metric,
      value,
      ...properties
    });
  }

  trackError(error: Error, context?: object): void {
    if (!this.shouldTrack()) return;

    this.session.errors.push(error.message);

    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    });
  }

  reportCrash(crashReport: CrashReport): void {
    if (!this.config.enableCrashReporting) return;

    this.eventQueue.push({
      type: 'crash',
      timestamp: Date.now(),
      data: crashReport
    });

    // Immediately flush crashes
    this.flushEvents();
  }

  private shouldTrack(): boolean {
    return this.isInitialized && Math.random() <= this.config.samplingRate;
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0 || !this.config.endpoint) return;

    const events = this.eventQueue.splice(0, this.config.batchSize);

    try {
      // In a real implementation, send to your analytics endpoint
      await this.sendEvents(events);

      if (this.config.debug) {
        logger.debug(`Flushed ${events.length} analytics events`);
      }
    } catch (error) {
      logger.error('Failed to flush analytics events:', error);
      // Re-add events to queue on failure
      this.eventQueue.unshift(...events);
    }
  }

  private async sendEvents(events: any[]): Promise<void> {
    // Implementation depends on your analytics service
    // This is a placeholder for the actual API call

    if (this.config.debug) {
      console.log('Analytics Events to send:', events);
      return Promise.resolve();
    }

    const response = await fetch(this.config.endpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        events,
        session: this.session,
        deviceInfo: this.deviceInfo,
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  // Session management
  endSession(): void {
    this.session.endTime = Date.now();
    this.session.duration = this.session.endTime - this.session.startTime;

    this.trackEvent('session_end', {
      duration: this.session.duration,
      pageViews: this.session.pageViews.length,
      interactions: this.session.interactions.length,
      errors: this.session.errors.length
    });

    this.flushEvents();
  }

  getSessionInfo(): UserSession {
    return { ...this.session };
  }

  // Utility methods
  setConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  // Force immediate flush of all events
  forceFlush(): Promise<void> {
    return this.flushEvents();
  }

  // Clear all stored data
  clear(): void {
    this.eventQueue = [];
    this.session = this.createSession();
  }

  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    this.endSession();
  }
}

// Singleton instance
export const mobileAnalytics = new MobileAnalytics();

// React hook for easy integration
export const useMobileAnalytics = () => {
  const trackPageView = React.useCallback((path?: string) => {
    mobileAnalytics.trackPageView(path || window.location.pathname);
  }, []);

  const trackEvent = React.useCallback((name: string, properties?: object) => {
    mobileAnalytics.trackEvent(name, properties);
  }, []);

  const trackUserAction = React.useCallback((action: string, properties?: object) => {
    mobileAnalytics.trackUserAction(action, properties);
  }, []);

  const trackError = React.useCallback((error: Error, context?: object) => {
    mobileAnalytics.trackError(error, context);
  }, []);

  const trackPerformance = React.useCallback((metric: string, value: number, properties?: object) => {
    mobileAnalytics.trackPerformance(metric, value, properties);
  }, []);

  return {
    trackPageView,
    trackEvent,
    trackUserAction,
    trackError,
    trackPerformance,
    getSessionInfo: () => mobileAnalytics.getSessionInfo(),
    forceFlush: () => mobileAnalytics.forceFlush(),
    isReady: () => mobileAnalytics.isReady()
  };
};