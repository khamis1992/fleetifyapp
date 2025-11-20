/**
 * Advanced Error Tracking System
 * Provides comprehensive error collection, analysis, and alerting
 */

import { monitoring, ErrorContext } from './core';

export interface ErrorEntry {
  id: string;
  message: string;
  stack?: string;
  name: string;
  type: 'javascript' | 'network' | 'promise' | 'react' | 'database' | 'api' | 'business';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: ErrorContext;
  timestamp: number;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  resolved: boolean;
  occurrences: number;
  firstSeen: number;
  lastSeen: number;
  tags: Record<string, string>;
  fingerprint: string;
}

export interface ErrorAlert {
  id: string;
  errorId: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  notified: boolean;
  notifications: NotificationAttempt[];
}

export interface NotificationAttempt {
  channel: 'email' | 'slack' | 'webhook' | 'sms';
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface ErrorRule {
  id: string;
  name: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notificationChannels: string[];
  cooldown: number; // milliseconds
  threshold: number; // occurrences per window
  window: number; // milliseconds
}

class ErrorTrackingService {
  private errors: Map<string, ErrorEntry> = new Map();
  private alerts: ErrorAlert[] = [];
  private rules: Map<string, ErrorRule> = new Map();
  private notificationQueue: ErrorAlert[] = [];
  private isProcessingNotifications = false;

  constructor() {
    this.initializeErrorTracking();
  }

  private initializeErrorTracking(): void {
    // Setup global error handlers
    this.setupGlobalErrorHandlers();
    this.setupPromiseRejectionHandler();
    this.setupNetworkErrorHandling();
    this.setupReactErrorHandling();

    // Initialize default error rules
    this.initializeDefaultRules();

    // Start notification processing
    this.startNotificationProcessor();
  }

  // Track Error
  trackError(error: Error, context?: ErrorContext, type?: ErrorEntry['type'], severity?: ErrorEntry['severity']): void {
    const errorId = this.generateErrorFingerprint(error, context);
    const existingError = this.errors.get(errorId);

    const errorEntry: ErrorEntry = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      name: error.name,
      type: type || this.determineErrorType(error, context),
      severity: severity || this.determineErrorSeverity(error, context),
      context: {
        ...context,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      },
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: context?.userId,
      sessionId: context?.sessionId || this.getSessionId(),
      resolved: false,
      occurrences: existingError ? existingError.occurrences + 1 : 1,
      firstSeen: existingError?.firstSeen || Date.now(),
      lastSeen: Date.now(),
      tags: this.extractErrorTags(error, context),
      fingerprint: errorId
    };

    this.errors.set(errorId, errorEntry);

    // Send to monitoring service
    monitoring.trackError(error, errorEntry.context);

    // Check alert rules
    this.checkErrorRules(errorEntry);

    // Cleanup old errors
    this.cleanupOldErrors();
  }

  // Track Network Error
  trackNetworkError(url: string, method: string, statusCode: number, error?: Error): void {
    const errorMessage = error?.message || `HTTP ${statusCode} error`;
    const networkError = new Error(`Network Error: ${method} ${url} - ${errorMessage}`);

    this.trackError(networkError, {
      url,
      component: 'network',
      action: 'api_call',
      additionalData: {
        method,
        statusCode,
        url: url
      }
    }, 'api');
  }

  // Track Database Error
  trackDatabaseError(query: string, error: Error, context?: Record<string, any>): void {
    const dbError = new Error(`Database Error: ${error.message}`);
    dbError.stack = error.stack;

    this.trackError(dbError, {
      component: 'database',
      action: 'query_execution',
      additionalData: {
        query: query.substring(0, 200), // Limit query length
        ...context
      }
    }, 'database');
  }

  // Track Business Logic Error
  trackBusinessError(operation: string, error: Error, context?: Record<string, any>): void {
    const businessError = new Error(`Business Logic Error: ${operation} - ${error.message}`);
    businessError.stack = error.stack;

    this.trackError(businessError, {
      component: 'business',
      action: operation,
      additionalData: context
    }, 'business');
  }

  // Manual Error Tracking
  trackCustomError(message: string, type: ErrorEntry['type'], severity: ErrorEntry['severity'], context?: Record<string, any>): void {
    const customError = new Error(message);

    this.trackError(customError, {
      component: 'custom',
      action: 'manual_tracking',
      additionalData: context
    }, type, severity);
  }

  // Error Management
  resolveError(errorId: string, resolutionNotes?: string): void {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
      if (resolutionNotes) {
        error.context = {
          ...error.context,
          resolutionNotes,
          resolvedAt: Date.now(),
          resolvedBy: 'user'
        };
      }
    }
  }

  unresolveError(errorId: string): void {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = false;
      delete error.context?.resolutionNotes;
      delete error.context?.resolvedAt;
      delete error.context?.resolvedBy;
    }
  }

  // Error Rules Management
  createErrorRule(rule: Omit<ErrorRule, 'id'>): string {
    const ruleId = this.generateRuleId();
    const fullRule: ErrorRule = {
      id: ruleId,
      ...rule
    };

    this.rules.set(ruleId, fullRule);
    return ruleId;
  }

  updateErrorRule(ruleId: string, updates: Partial<ErrorRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
    }
  }

  deleteErrorRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  // Error Analysis
  getErrorSummary(timeRange: number = 3600000): {
    totalErrors: number;
    uniqueErrors: number;
    resolvedErrors: number;
    criticalErrors: number;
    errorsByType: Record<string, number>;
    errorsByComponent: Record<string, number>;
    topErrors: ErrorEntry[];
  } {
    const now = Date.now();
    const cutoffTime = now - timeRange;

    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.lastSeen > cutoffTime);

    const totalErrors = recentErrors.reduce((sum, error) => sum + error.occurrences, 0);
    const uniqueErrors = recentErrors.length;
    const resolvedErrors = recentErrors.filter(error => error.resolved).length;
    const criticalErrors = recentErrors.filter(error => error.severity === 'critical').length;

    const errorsByType: Record<string, number> = {};
    const errorsByComponent: Record<string, number> = {};

    recentErrors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + error.occurrences;
      if (error.context?.component) {
        errorsByComponent[error.context.component] = (errorsByComponent[error.context.component] || 0) + error.occurrences;
      }
    });

    const topErrors = recentErrors
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10);

    return {
      totalErrors,
      uniqueErrors,
      resolvedErrors,
      criticalErrors,
      errorsByType,
      errorsByComponent,
      topErrors
    };
  }

  getErrorTrends(timeRange: number = 86400000): Array<{
    timestamp: number;
    errorCount: number;
    criticalCount: number;
    resolvedCount: number;
  }> {
    const now = Date.now();
    const cutoffTime = now - timeRange;
    const interval = 3600000; // 1 hour intervals

    const trends: Array<{
      timestamp: number;
      errorCount: number;
      criticalCount: number;
      resolvedCount: number;
    }> = [];

    for (let time = cutoffTime; time <= now; time += interval) {
      const windowEnd = time + interval;
      const errorsInWindow = Array.from(this.errors.values()).filter(
        error => error.lastSeen >= time && error.lastSeen < windowEnd
      );

      trends.push({
        timestamp: time,
        errorCount: errorsInWindow.reduce((sum, error) => sum + error.occurrences, 0),
        criticalCount: errorsInWindow.filter(error => error.severity === 'critical')
          .reduce((sum, error) => sum + error.occurrences, 0),
        resolvedCount: errorsInWindow.filter(error => error.resolved).length
      });
    }

    return trends;
  }

  // Public API
  getErrors(filter?: {
    type?: ErrorEntry['type'];
    severity?: ErrorEntry['severity'];
    resolved?: boolean;
    component?: string;
    timeRange?: number;
  }): ErrorEntry[] {
    let errors = Array.from(this.errors.values());

    if (filter) {
      if (filter.type) {
        errors = errors.filter(error => error.type === filter.type);
      }
      if (filter.severity) {
        errors = errors.filter(error => error.severity === filter.severity);
      }
      if (filter.resolved !== undefined) {
        errors = errors.filter(error => error.resolved === filter.resolved);
      }
      if (filter.component) {
        errors = errors.filter(error => error.context?.component === filter.component);
      }
      if (filter.timeRange) {
        const cutoffTime = Date.now() - filter.timeRange;
        errors = errors.filter(error => error.lastSeen > cutoffTime);
      }
    }

    return errors.sort((a, b) => b.lastSeen - a.lastSeen);
  }

  getAlerts(): ErrorAlert[] {
    return [...this.alerts].sort((a, b) => b.timestamp - a.timestamp);
  }

  getRules(): ErrorRule[] {
    return Array.from(this.rules.values());
  }

  // Private Methods
  private setupGlobalErrorHandlers(): void {
    window.addEventListener('error', (event) => {
      this.trackError(event.error || new Error(event.message), {
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        component: 'global'
      }, 'javascript');
    });
  }

  private setupPromiseRejectionHandler(): void {
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(
        new Error(event.reason),
        {
          component: 'promise',
          action: 'unhandled_rejection'
        },
        'promise'
      );
    });
  }

  private setupNetworkErrorHandling(): void {
    // This is handled in the APM service
  }

  private setupReactErrorHandling(): void {
    // React errors are handled by Error Boundary components
    // But we can also catch them here if needed
  }

  private initializeDefaultRules(): void {
    // Critical error rule
    this.createErrorRule({
      name: 'Critical Error Alert',
      condition: 'severity === "critical"',
      severity: 'critical',
      enabled: true,
      notificationChannels: ['email', 'slack'],
      cooldown: 300000, // 5 minutes
      threshold: 1,
      window: 300000 // 5 minutes
    });

    // High frequency error rule
    this.createErrorRule({
      name: 'High Frequency Error Alert',
      condition: 'occurrences > 10',
      severity: 'high',
      enabled: true,
      notificationChannels: ['email'],
      cooldown: 600000, // 10 minutes
      threshold: 10,
      window: 300000 // 5 minutes
    });

    // API error rate rule
    this.createErrorRule({
      name: 'High API Error Rate',
      condition: 'type === "api" && occurrences > 5',
      severity: 'high',
      enabled: true,
      notificationChannels: ['slack'],
      cooldown: 900000, // 15 minutes
      threshold: 5,
      window: 300000 // 5 minutes
    });
  }

  private startNotificationProcessor(): void {
    setInterval(() => {
      this.processNotifications();
    }, 10000); // Process every 10 seconds
  }

  private processNotifications(): void {
    if (this.isProcessingNotifications || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessingNotifications = true;

    while (this.notificationQueue.length > 0) {
      const alert = this.notificationQueue.shift()!;
      this.sendNotification(alert);
    }

    this.isProcessingNotifications = false;
  }

  private async sendNotification(alert: ErrorAlert): Promise<void> {
    const error = this.errors.get(alert.errorId);
    if (!error) return;

    for (const channel of ['email', 'slack', 'webhook'] as const) {
      try {
        // Simulate notification sending
        const success = await this.sendNotificationToChannel(channel, error, alert);

        alert.notifications.push({
          channel,
          timestamp: Date.now(),
          success
        });

        if (!success) {
          console.error(`Failed to send notification to ${channel}`);
        }
      } catch (error) {
        console.error(`Error sending notification to ${channel}:`, error);
        alert.notifications.push({
          channel,
          timestamp: Date.now(),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    alert.notified = true;
  }

  private async sendNotificationToChannel(
    channel: 'email' | 'slack' | 'webhook',
    error: ErrorEntry,
    alert: ErrorAlert
  ): Promise<boolean> {
    // In a real implementation, this would integrate with actual notification services
    console.log(`Sending ${channel} notification for error: ${error.message}`);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate success rate (95% success)
    return Math.random() > 0.05;
  }

  private checkErrorRules(error: ErrorEntry): void {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      if (this.evaluateRule(rule, error)) {
        const alert: ErrorAlert = {
          id: this.generateAlertId(),
          errorId: error.id,
          ruleId: rule.id,
          severity: rule.severity,
          message: this.generateAlertMessage(rule, error),
          timestamp: Date.now(),
          notified: false,
          notifications: []
        };

        this.alerts.push(alert);
        this.notificationQueue.push(alert);
      }
    }
  }

  private evaluateRule(rule: ErrorRule, error: ErrorEntry): boolean {
    // Simple rule evaluation - in a real implementation, this would be more sophisticated
    switch (rule.condition) {
      case 'severity === "critical"':
        return error.severity === 'critical';
      case 'occurrences > 10':
        return error.occurrences > 10;
      case 'type === "api" && occurrences > 5':
        return error.type === 'api' && error.occurrences > 5;
      default:
        return false;
    }
  }

  private generateAlertMessage(rule: ErrorRule, error: ErrorEntry): string {
    return `${rule.name}: ${error.message} (${error.occurrences} occurrences)`;
  }

  private determineErrorType(error: Error, context?: ErrorContext): ErrorEntry['type'] {
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return 'javascript';
    }
    if (context?.component === 'api' || context?.component === 'network') {
      return 'api';
    }
    if (context?.component === 'database') {
      return 'database';
    }
    if (context?.component === 'business') {
      return 'business';
    }
    return 'javascript';
  }

  private determineErrorSeverity(error: Error, context?: ErrorContext): ErrorEntry['severity'] {
    // Critical errors
    if (error.message.includes('Cannot read property') ||
        error.message.includes('Cannot access') ||
        error.message.includes('Network Error') ||
        context?.component === 'database') {
      return 'critical';
    }

    // High severity errors
    if (error.name === 'TypeError' ||
        error.name === 'ReferenceError' ||
        context?.component === 'api') {
      return 'high';
    }

    // Medium severity errors
    if (context?.component === 'business') {
      return 'medium';
    }

    return 'low';
  }

  private extractErrorTags(error: Error, context?: ErrorContext): Record<string, string> {
    const tags: Record<string, string> = {
      environment: process.env.NODE_ENV || 'unknown',
      userAgent: navigator.userAgent.split(' ')[0],
      url: window.location.pathname
    };

    if (context?.component) {
      tags.component = context.component;
    }
    if (context?.action) {
      tags.action = context.action;
    }
    if (error.name) {
      tags.errorName = error.name;
    }

    return tags;
  }

  private generateErrorFingerprint(error: Error, context?: ErrorContext): string {
    const fingerprintData = {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 500), // Limit stack trace length
      component: context?.component,
      action: context?.action
    };

    const fingerprintString = JSON.stringify(fingerprintData);
    return this.hashString(fingerprintString);
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('error_tracking_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error_tracking_session_id', sessionId);
    }
    return sessionId;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private cleanupOldErrors(): void {
    const cutoffTime = Date.now() - 2592000000; // Keep for 30 days

    for (const [errorId, error] of this.errors.entries()) {
      if (error.lastSeen < cutoffTime) {
        this.errors.delete(errorId);
      }
    }

    // Cleanup old alerts
    this.alerts = this.alerts.filter(alert =>
      alert.timestamp > Date.now() - 604800000 // Keep for 7 days
    );
  }
}

// Create singleton instance
export const errorTracking = new ErrorTrackingService();

// Export utility functions
export const trackError = (error: Error, context?: ErrorContext, type?: ErrorEntry['type'], severity?: ErrorEntry['severity']) => {
  errorTracking.trackError(error, context, type, severity);
};

export const trackNetworkError = (url: string, method: string, statusCode: number, error?: Error) => {
  errorTracking.trackNetworkError(url, method, statusCode, error);
};

export const trackDatabaseError = (query: string, error: Error, context?: Record<string, any>) => {
  errorTracking.trackDatabaseError(query, error, context);
};

export const trackBusinessError = (operation: string, error: Error, context?: Record<string, any>) => {
  errorTracking.trackBusinessError(operation, error, context);
};

export const trackCustomError = (message: string, type: ErrorEntry['type'], severity: ErrorEntry['severity'], context?: Record<string, any>) => {
  errorTracking.trackCustomError(message, type, severity, context);
};