/**
 * Page Load Diagnostics
 * 
 * Utility to diagnose why pages don't show content without hard refresh
 * Logs detailed information about loading states, cache status, and errors
 */

interface DiagnosticEvent {
  timestamp: number;
  type: 'navigation' | 'cache' | 'query' | 'component' | 'service_worker' | 'error';
  page: string;
  details: Record<string, any>;
}

class PageLoadDiagnostics {
  private events: DiagnosticEvent[] = [];
  private startTime: number = Date.now();
  private navigationCount = 0;

  log(type: DiagnosticEvent['type'], page: string, details: Record<string, any> = {}) {
    const event: DiagnosticEvent = {
      timestamp: Date.now(),
      type,
      page,
      details
    };

    this.events.push(event);
    console.log(`🔍 [DIAGNOSTIC] ${type.toUpperCase()} on ${page}:`, details);

    // Keep only last 50 events to prevent memory issues
    if (this.events.length > 50) {
      this.events = this.events.slice(-50);
    }
  }

  // Navigation diagnostics
  logNavigation(page: string, from: string, method: 'push' | 'pop' | 'replace') {
    this.navigationCount++;
    this.log('navigation', page, {
      from,
      method,
      navigationCount: this.navigationCount,
      url: window.location.href,
      referrer: document.referrer
    });
  }

  // Cache diagnostics
  logCacheStatus(page: string, cacheName: string, isHit: boolean, data?: any) {
    this.log('cache', page, {
      cacheName,
      isHit,
      hasData: !!data,
      cacheSize: this.events.length
    });
  }

  // Query diagnostics
  logQueryStatus(page: string, queryKey: string[], status: 'fetching' | 'success' | 'error', data?: any, error?: any) {
    this.log('query', page, {
      queryKey: queryKey.join('.'),
      status,
      hasData: !!data,
      errorMessage: error?.message,
      isStale: false // Will be updated by query observer
    });
  }

  // Component lifecycle diagnostics
  logComponentLifecycle(page: string, component: string, phase: 'mount' | 'update' | 'unmount', props?: any) {
    this.log('component', page, {
      component,
      phase,
      hasProps: !!props,
      propKeys: props ? Object.keys(props) : []
    });
  }

  // Service worker diagnostics
  logServiceWorkerStatus(page: string, status: 'active' | 'inactive' | 'updating', controller?: string) {
    this.log('service_worker', page, {
      status,
      controller,
      hasController: !!controller
    });
  }

  // Error diagnostics
  logError(page: string, error: Error, context?: string) {
    this.log('error', page, {
      errorMessage: error.message,
      errorStack: error.stack,
      context,
      errorType: this.classifyError(error)
    });
  }

  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('chunk') || message.includes('dynamically imported')) {
      return 'CHUNK_LOAD';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'NETWORK';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'PERMISSION';
    }
    if (message.includes('timeout')) {
      return 'TIMEOUT';
    }
    
    return 'UNKNOWN';
  }

  // Analysis methods
  getEventsByType(type: DiagnosticEvent['type']): DiagnosticEvent[] {
    return this.events.filter(event => event.type === type);
  }

  getEventsByPage(page: string): DiagnosticEvent[] {
    return this.events.filter(event => event.page === page);
  }

  getLastNEvents(n: number): DiagnosticEvent[] {
    return this.events.slice(-n);
  }

  // Check for common issues
  analyzePageLoad(page: string): {
    issues: string[];
    recommendations: string[];
    severity: 'low' | 'medium' | 'high';
  } {
    const pageEvents = this.getEventsByPage(page);
    const issues: string[] = [];
    const recommendations: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    // Check for navigation without component mount
    const navigationEvents = pageEvents.filter(e => e.type === 'navigation');
    const componentMountEvents = pageEvents.filter(e => e.type === 'component' && e.details.phase === 'mount');

    if (navigationEvents.length > 0 && componentMountEvents.length === 0) {
      issues.push('Navigation detected but no component mounted');
      recommendations.push('Check if component is stuck in loading state');
      severity = 'high';
    }

    // Check for query errors
    const queryErrorEvents = pageEvents.filter(e => e.type === 'query' && e.details.status === 'error');
    if (queryErrorEvents.length > 0) {
      issues.push(`Query errors detected: ${queryErrorEvents.length} errors`);
      recommendations.push('Check network connectivity and API endpoints');
      severity = 'high';
    }

    // Check for chunk load errors
    const chunkErrors = pageEvents.filter(e => e.type === 'error' && e.details.errorType === 'CHUNK_LOAD');
    if (chunkErrors.length > 0) {
      issues.push('Chunk loading errors detected');
      recommendations.push('Clear browser cache and hard refresh');
      severity = 'high';
    }

    // Check for service worker issues
    const swEvents = pageEvents.filter(e => e.type === 'service_worker');
    const inactiveSW = swEvents.find(e => e.details.status === 'inactive');
    if (inactiveSW) {
      issues.push('Service worker is inactive');
      recommendations.push('Check service worker registration');
      severity = 'medium';
    }

    // Check for timeout issues
    const timeoutErrors = pageEvents.filter(e => e.type === 'error' && e.details.errorType === 'TIMEOUT');
    if (timeoutErrors.length > 0) {
      issues.push('Timeout errors detected');
      recommendations.push('Check network speed and server response times');
      severity = 'medium';
    }

    return { issues, recommendations, severity };
  }

  // Export diagnostic report
  exportDiagnosticReport(): string {
    const report = {
      sessionInfo: {
        startTime: new Date(this.startTime).toISOString(),
        duration: Date.now() - this.startTime,
        navigationCount: this.navigationCount,
        totalEvents: this.events.length
      },
      summary: {
        navigationEvents: this.getEventsByType('navigation').length,
        cacheEvents: this.getEventsByType('cache').length,
        queryEvents: this.getEventsByType('query').length,
        componentEvents: this.getEventsByType('component').length,
        serviceWorkerEvents: this.getEventsByType('service_worker').length,
        errorEvents: this.getEventsByType('error').length
      },
      recentEvents: this.getLastNEvents(10),
      pageAnalysis: {} as Record<string, any>
    };

    // Analyze each page that had events
    const pagesWithEvents = [...new Set(this.events.map(e => e.page))];
    pagesWithEvents.forEach(page => {
      report.pageAnalysis[page] = this.analyzePageLoad(page);
    });

    return JSON.stringify(report, null, 2);
  }

  // Clear diagnostics
  clear() {
    this.events = [];
    this.startTime = Date.now();
    this.navigationCount = 0;
    console.log('🔍 [DIAGNOSTIC] Diagnostics cleared');
  }
}

// Singleton instance
export const pageDiagnostics = new PageLoadDiagnostics();

// Export functions for easy access
export const logNavigation = (page: string, from: string, method: 'push' | 'pop' | 'replace') => 
  pageDiagnostics.logNavigation(page, from, method);

export const logCacheStatus = (page: string, cacheName: string, isHit: boolean, data?: any) => 
  pageDiagnostics.logCacheStatus(page, cacheName, isHit, data);

export const logQueryStatus = (page: string, queryKey: string[], status: 'fetching' | 'success' | 'error', data?: any, error?: any) => 
  pageDiagnostics.logQueryStatus(page, queryKey, status, data, error);

export const logComponentLifecycle = (page: string, component: string, phase: 'mount' | 'update' | 'unmount', props?: any) => 
  pageDiagnostics.logComponentLifecycle(page, component, phase, props);

export const logServiceWorkerStatus = (page: string, status: 'active' | 'inactive' | 'updating', controller?: string) => 
  pageDiagnostics.logServiceWorkerStatus(page, status, controller);

export const logError = (page: string, error: Error, context?: string) => 
  pageDiagnostics.logError(page, error, context);

export const getDiagnosticReport = () => pageDiagnostics.exportDiagnosticReport();
export const clearDiagnostics = () => pageDiagnostics.clear();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).pageDiagnostics = pageDiagnostics;
  (window as any).getDiagnosticReport = getDiagnosticReport;
  (window as any).clearDiagnostics = clearDiagnostics;
}