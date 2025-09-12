// Lightweight app logger with opt-in debug in dev only
// Usage: window.__APP_DEBUG__ = true  // to enable debug logs at runtime

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private onceKeys = new Set<string>()
  public enabled = false

  constructor() {
    const isDev = typeof import.meta !== 'undefined' && (import.meta as any)?.env?.DEV
    if (typeof window !== 'undefined' && isDev) {
      this.enabled = Boolean((window as any).__APP_DEBUG__)
    } else {
      this.enabled = false
    }
  }

  setEnabled(v: boolean) {
    this.enabled = v
  }

  debug(message?: any, ...optionalParams: any[]) {
    if (!this.enabled) return
    console.debug(message, ...optionalParams)
  }

  debugOnce(key: string, message?: any, ...optionalParams: any[]) {
    if (!this.enabled) return
    if (this.onceKeys.has(key)) return
    this.onceKeys.add(key)
    console.debug(message ?? key, ...optionalParams)
  }

  info(message?: any, ...optionalParams: any[]) {
    if (!this.enabled) return
    console.info(message, ...optionalParams)
  }

  warn(message?: any, ...optionalParams: any[]) {
    console.warn(message, ...optionalParams)
  }

  error(message?: any, ...optionalParams: any[]) {
    console.error(message, ...optionalParams)
  }
}

export const logger = new Logger()
