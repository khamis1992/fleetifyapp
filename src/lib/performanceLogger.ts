/**
 * Performance Logger
 * 
 * Centralized logging for performance monitoring and debugging
 * Helps identify bottlenecks and validate optimization assumptions
 */

export interface PerformanceLog {
  timestamp: number;
  type: 'query' | 'navigation' | 'cache' | 'render' | 'network';
  operation: string;
  duration: number;
  details?: Record<string, any>;
  level: 'info' | 'warn' | 'error';
}

class PerformanceLogger {
  private logs: PerformanceLog[] = [];
  private maxLogs = 100; // Keep last 100 logs for memory management
  
  // Property declarations for metrics categorization
  private queryLogs: PerformanceLog[] = [];
  private navigationLogs: PerformanceLog[] = [];
  private cacheLogs: PerformanceLog[] = [];
  private renderLogs: PerformanceLog[] = [];
  private networkLogs: PerformanceLog[] = [];

  log(log: Omit<PerformanceLog, 'timestamp'>): void {
    const fullLog: PerformanceLog = {
      timestamp: Date.now(),
      ...log
    };

    this.logs.push(fullLog);

    // Keep only last maxLogs logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // DEBUG: Validate performance logger fixes
    console.log('[PERF-DEBUG] Logger initialized - TypeScript errors should be fixed');
    console.log('[PERF-DEBUG] Log method called with:', { type: log.type, operation: log.operation, duration: log.duration });

    // Also log to console for immediate visibility
    const level = log.level || 'info';
    const prefix = `[PERF-${level.toUpperCase()}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${log.operation}: ${log.duration}ms`, log.details);
        break;
      case 'warn':
        console.warn(`${prefix} ${log.operation}: ${log.duration}ms`, log.details);
        break;
      case 'info':
        console.log(`${prefix} ${log.operation}: ${log.duration}ms`, log.details);
        break;
      default:
        console.log(`${prefix} ${log.operation}: ${log.duration}ms`);
    }
  }

  // Query performance logging
  logQuery(operation: string, duration: number, details?: Record<string, any>): void {
    this.log({
      type: 'query',
      operation,
      duration,
      details,
      level: duration > 1000 ? 'warn' : 'info' // Warn if query takes > 1s
    });
  }

  // Navigation performance logging
  logNavigation(operation: string, duration: number, details?: Record<string, any>): void {
    this.log({
      type: 'navigation',
      operation,
      duration,
      details,
      level: duration > 500 ? 'warn' : 'info' // Warn if navigation takes > 500ms
    });
  }

  // Cache performance logging
  logCache(operation: string, duration: number, details?: Record<string, any>): void {
    this.log({
      type: 'cache',
      operation,
      duration,
      details,
      level: 'info'
    });
  }

  // Render performance logging
  logRender(component: string, duration: number, details?: Record<string, any>): void {
    this.log({
      type: 'render',
      operation: component,
      duration,
      details,
      level: duration > 100 ? 'warn' : 'info' // Warn if render takes > 100ms
    });
  }

  // Network performance logging
  logNetwork(operation: string, duration: number, details?: Record<string, any>): void {
    this.log({
      type: 'network',
      operation,
      duration,
      details,
      level: 'info'
    });
  }

  // Get performance metrics
  getMetrics() {
    // Categorize logs by type
    this.queryLogs = this.logs.filter(log => log.type === 'query');
    this.navigationLogs = this.logs.filter(log => log.type === 'navigation');
    this.cacheLogs = this.logs.filter(log => log.type === 'cache');
    this.renderLogs = this.logs.filter(log => log.type === 'render');
    this.networkLogs = this.logs.filter(log => log.type === 'network');

    return {
      queryLogs: this.queryLogs,
      navigationLogs: this.navigationLogs,
      cacheLogs: this.cacheLogs,
      renderLogs: this.renderLogs,
      networkLogs: this.networkLogs
    };
  }

  // Get recent logs (last 20)
  getRecentLogs(count: number = 20): PerformanceLog[] {
    return this.logs.slice(-count);
  }

  // Get performance summary
  getSummary(): string {
      const queryCount = this.queryLogs.length;
      const navigationCount = this.navigationLogs.length;
      const avgQueryTime = queryCount > 0
        ? this.queryLogs.reduce((sum: number, log: PerformanceLog) => sum + log.duration, 0) / queryCount
        : 0;

      const avgNavigationTime = navigationCount > 0
        ? this.navigationLogs.reduce((sum: number, log: PerformanceLog) => sum + log.duration, 0) / navigationCount
        : 0;

      const slowQueries = this.queryLogs.filter(log => log.duration > 1000).length;
      const slowNavigations = this.navigationLogs.filter(log => log.duration > 500).length;

      return `
📊 Performance Summary
==================
Queries: ${queryCount} total, ${slowQueries} slow (>1s)
- Avg Query Time: ${avgQueryTime.toFixed(0)}ms
Navigation: ${navigationCount} total, ${slowNavigations} slow (>500ms)
- Avg Navigation Time: ${avgNavigationTime.toFixed(0)}ms
Recent Logs: ${this.getRecentLogs(5).map(log =>
  `${log.type}: ${log.operation} (${log.duration}ms)`
).join('\n')}
==================
      `;
    }

  // Clear logs
  clear(): void {
      this.logs = [];
      console.log('[PERF] Performance logs cleared');
    }

  // Export logs for analysis
  exportLogs(): PerformanceLog[] {
      return [...this.logs];
    }
}

export const performanceLogger = new PerformanceLogger();