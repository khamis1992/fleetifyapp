// Advanced Application Logger with Monitoring Integration
// Integrates with comprehensive APM and error tracking systems

import { monitoring } from './monitoring/core'
import { errorTracking } from './monitoring/errorTracking'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
  context?: {
    component?: string
    action?: string
    userId?: string
    sessionId?: string
    additionalData?: Record<string, any>
  }
  tags?: Record<string, string>
}

class Logger {
  private onceKeys = new Set<string>()
  public enabled = false
  public monitoringEnabled = false
  private logBuffer: LogEntry[] = []
  private maxBufferSize = 1000
  private flushInterval = 10000 // 10 seconds
  private flushTimer: NodeJS.Timeout | null = null

  constructor() {
    const isDev = typeof import.meta !== 'undefined' && (import.meta as any)?.env?.DEV
    if (typeof window !== 'undefined') {
      this.enabled = isDev ? Boolean((window as any).__APP_DEBUG__) : false
      this.monitoringEnabled = Boolean((window as any).__MONITORING_ENABLED__) || import.meta.env.PROD
    } else {
      this.enabled = false
      this.monitoringEnabled = import.meta.env.PROD
    }

    // Start periodic log flushing
    this.startLogFlushing()
  }

  setEnabled(v: boolean) {
    this.enabled = v
  }

  setMonitoringEnabled(v: boolean) {
    this.monitoringEnabled = v
  }

  debug(message?: any, ...optionalParams: any[]) {
    if (!this.enabled) return
    console.debug(message, ...optionalParams)

    if (this.monitoringEnabled) {
      this.createLogEntry('debug', this.stringifyMessage(message), undefined, optionalParams)
    }
  }

  debugOnce(key: string, message?: any, ...optionalParams: any[]) {
    if (!this.enabled) return
    if (this.onceKeys.has(key)) return
    this.onceKeys.add(key)
    console.debug(message ?? key, ...optionalParams)

    if (this.monitoringEnabled) {
      this.createLogEntry('debug', this.stringifyMessage(message ?? key), { action: 'once' }, optionalParams)
    }
  }

  info(message?: any, ...optionalParams: any[]) {
    if (!this.enabled) return
    console.info(message, ...optionalParams)

    if (this.monitoringEnabled) {
      this.createLogEntry('info', this.stringifyMessage(message), undefined, optionalParams)
    }
  }

  warn(message?: any, ...optionalParams: any[]) {
    console.warn(message, ...optionalParams)

    if (this.monitoringEnabled) {
      this.createLogEntry('warn', this.stringifyMessage(message), undefined, optionalParams)
    }
  }

  error(message?: any, ...optionalParams: any[]) {
    console.error(message, ...optionalParams)

    if (this.monitoringEnabled) {
      // Convert to Error object if it's not already
      const error = message instanceof Error ? message : new Error(this.stringifyMessage(message))

      this.createLogEntry('error', this.stringifyMessage(message), undefined, optionalParams)

      // Also track as error in the error tracking system
      errorTracking.trackError(error, {
        component: 'logger',
        action: 'error_log',
        additionalData: {
          params: optionalParams,
          level: 'error'
        }
      })
    }
  }

  // Structured logging methods
  logComponent(componentName: string, level: LogLevel, message: string, additionalData?: Record<string, any>) {
    if (!this.enabled && !this.monitoringEnabled) return

    const consoleMethod = this.getConsoleMethod(level)
    if (consoleMethod) {
      consoleMethod(`[${componentName}] ${message}`, additionalData)
    }

    if (this.monitoringEnabled) {
      this.createLogEntry(level, message, { component: componentName, additionalData })
    }
  }

  logAPI(endpoint: string, method: string, statusCode: number, duration: number, error?: Error) {
    if (error) {
      this.error(`API Error: ${method} ${endpoint} - ${error.message}`, {
        endpoint,
        method,
        statusCode,
        duration,
        error: error.stack
      })
    } else {
      this.info(`API Success: ${method} ${endpoint} - ${statusCode} (${duration}ms)`, {
        endpoint,
        method,
        statusCode,
        duration
      })
    }

    if (this.monitoringEnabled) {
      monitoring.trackPerformance({
        name: 'api.request',
        value: duration,
        unit: 'milliseconds',
        timestamp: Date.now(),
        tags: {
          endpoint,
          method,
          status_code: statusCode.toString(),
          success: error ? 'false' : 'true'
        },
        context: {
          operation: `API: ${method} ${endpoint}`
        }
      })
    }
  }

  logDatabase(query: string, duration: number, rowCount?: number, error?: Error) {
    if (error) {
      this.error(`Database Error: ${query.substring(0, 100)}... - ${error.message}`, {
        query: query.substring(0, 200),
        duration,
        rowCount,
        error: error.stack
      })
    } else {
      this.debug(`Database Query: ${query.substring(0, 100)}... (${duration}ms, ${rowCount || 0} rows)`, {
        query: query.substring(0, 200),
        duration,
        rowCount
      })
    }

    if (this.monitoringEnabled) {
      monitoring.trackPerformance({
        name: 'database.query',
        value: duration,
        unit: 'milliseconds',
        timestamp: Date.now(),
        tags: {
          operation: this.extractDatabaseOperation(query),
          success: error ? 'false' : 'true'
        },
        context: {
          operation: `Database: ${query.substring(0, 50)}...`
        }
      })
    }
  }

  logUserAction(action: string, component?: string, additionalData?: Record<string, any>) {
    this.info(`User Action: ${action}`, { component, ...additionalData })

    if (this.monitoringEnabled) {
      monitoring.trackUserInteraction({
        type: 'click',
        target: action,
        timestamp: Date.now(),
        properties: { component, ...additionalData }
      })
    }
  }

  logPerformance(operation: string, duration: number, additionalData?: Record<string, any>) {
    this.info(`Performance: ${operation} took ${duration}ms`, additionalData)

    if (this.monitoringEnabled) {
      monitoring.trackPerformance({
        name: `performance.${operation}`,
        value: duration,
        unit: 'milliseconds',
        timestamp: Date.now(),
        tags: { operation },
        context: { operation: `Performance: ${operation}` }
      })
    }
  }

  logBusinessMetric(name: string, value: number, category: 'fleet' | 'financial' | 'user' | 'operational', dimensions?: Record<string, string>) {
    this.info(`Business Metric: ${name} = ${value}`, { category, dimensions })

    if (this.monitoringEnabled) {
      monitoring.trackBusinessMetric({
        name,
        value,
        category,
        timestamp: Date.now(),
        dimensions
      })
    }
  }

  // Get log statistics
  getLogStats(timeRange: number = 3600000): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byComponent: Record<string, number>;
    errorRate: number;
  } {
    const now = Date.now()
    const cutoffTime = now - timeRange
    const recentLogs = this.logBuffer.filter(log => log.timestamp > cutoffTime)

    const stats = {
      total: recentLogs.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0
      } as Record<LogLevel, number>,
      byComponent: {} as Record<string, number>,
      errorRate: 0
    }

    recentLogs.forEach(log => {
      stats.byLevel[log.level]++

      if (log.context?.component) {
        stats.byComponent[log.context.component] = (stats.byComponent[log.context.component] || 0) + 1
      }
    })

    stats.errorRate = stats.total > 0 ? (stats.byLevel.error / stats.total) * 100 : 0

    return stats
  }

  // Flush logs to monitoring service
  flushLogs(): void {
    if (!this.monitoringEnabled || this.logBuffer.length === 0) return

    const logsToFlush = [...this.logBuffer]
    this.logBuffer = []

    // Send logs to monitoring service
    try {
      fetch('/api/monitoring/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logs: logsToFlush,
          timestamp: Date.now()
        })
      }).catch(error => {
        console.error('Failed to flush logs to monitoring service:', error)
        // Re-add logs to buffer if flush failed
        this.logBuffer.unshift(...logsToFlush)
        this.logBuffer = this.logBuffer.slice(0, this.maxBufferSize)
      })
    } catch (error) {
      console.error('Error while flushing logs:', error)
    }
  }

  // Get current logs
  getLogs(filter?: {
    level?: LogLevel;
    component?: string;
    timeRange?: number;
    limit?: number;
  }): LogEntry[] {
    let logs = [...this.logBuffer]

    if (filter) {
      if (filter.level) {
        logs = logs.filter(log => log.level === filter.level)
      }
      if (filter.component) {
        logs = logs.filter(log => log.context?.component === filter.component)
      }
      if (filter.timeRange) {
        const cutoffTime = Date.now() - filter.timeRange
        logs = logs.filter(log => log.timestamp > cutoffTime)
      }
      if (filter.limit) {
        logs = logs.slice(-filter.limit)
      }
    }

    return logs.sort((a, b) => b.timestamp - a.timestamp)
  }

  // Clear logs
  clearLogs(): void {
    this.logBuffer = []
  }

  // Private methods
  private createLogEntry(level: LogLevel, message: string, context?: LogEntry['context'], params?: any[]): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context: {
        ...context,
        additionalData: {
          ...context?.additionalData,
          params
        }
      },
      tags: {
        environment: import.meta.env.MODE || 'unknown',
        level
      }
    }

    this.logBuffer.push(entry)

    // Maintain buffer size
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize)
    }
  }

  private getConsoleMethod(level: LogLevel) {
    switch (level) {
      case 'debug': return console.debug.bind(console)
      case 'info': return console.info.bind(console)
      case 'warn': return console.warn.bind(console)
      case 'error': return console.error.bind(console)
      default: return console.log.bind(console)
    }
  }

  private stringifyMessage(message: any): string {
    if (typeof message === 'string') return message
    if (message instanceof Error) return message.message
    try {
      return JSON.stringify(message)
    } catch {
      return String(message)
    }
  }

  private extractDatabaseOperation(query: string): string {
    const normalizedQuery = query.trim().toLowerCase()
    if (normalizedQuery.startsWith('select')) return 'select'
    if (normalizedQuery.startsWith('insert')) return 'insert'
    if (normalizedQuery.startsWith('update')) return 'update'
    if (normalizedQuery.startsWith('delete')) return 'delete'
    if (normalizedQuery.startsWith('create')) return 'create'
    if (normalizedQuery.startsWith('alter')) return 'alter'
    if (normalizedQuery.startsWith('drop')) return 'drop'
    return 'other'
  }

  private startLogFlushing(): void {
    if (this.flushTimer) return

    this.flushTimer = setInterval(() => {
      this.flushLogs()
    }, this.flushInterval)

    // Flush logs on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushLogs()
      })
    }
  }

  // Stop log flushing (for cleanup)
  stopLogFlushing(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    this.flushLogs() // Final flush
  }
}

export const logger = new Logger()

// Export convenience functions for structured logging
export const logComponent = (componentName: string, level: LogLevel, message: string, additionalData?: Record<string, any>) => {
  logger.logComponent(componentName, level, message, additionalData)
}

export const logAPI = (endpoint: string, method: string, statusCode: number, duration: number, error?: Error) => {
  logger.logAPI(endpoint, method, statusCode, duration, error)
}

export const logDatabase = (query: string, duration: number, rowCount?: number, error?: Error) => {
  logger.logDatabase(query, duration, rowCount, error)
}

export const logUserAction = (action: string, component?: string, additionalData?: Record<string, any>) => {
  logger.logUserAction(action, component, additionalData)
}

export const logPerformance = (operation: string, duration: number, additionalData?: Record<string, any>) => {
  logger.logPerformance(operation, duration, additionalData)
}

export const logBusinessMetric = (name: string, value: number, category: 'fleet' | 'financial' | 'user' | 'operational', dimensions?: Record<string, string>) => {
  logger.logBusinessMetric(name, value, category, dimensions)
}
