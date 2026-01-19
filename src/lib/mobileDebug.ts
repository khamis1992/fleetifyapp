/**
 * Mobile Debugging Utility
 * 
 * Provides detailed logging for mobile app debugging
 * Logs are visible in Chrome DevTools when connected via chrome://inspect
 */

import { Capacitor } from '@capacitor/core';

export class MobileDebugger {
  private static logs: string[] = [];
  private static readonly MAX_LOGS = 100;

  static log(category: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${category}] ${message}`;
    
    // Console log for Chrome DevTools
    console.log(logMessage, data || '');
    
    // Store in memory for later retrieval
    this.logs.push(logMessage + (data ? ` ${JSON.stringify(data)}` : ''));
    
    // Keep only last MAX_LOGS entries
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }
    
    // Also log to alert for critical errors on mobile
    if (Capacitor.isNativePlatform() && category === 'ERROR') {
      // Don't alert every error, just log it
      console.error('🚨 MOBILE ERROR:', message, data);
    }
  }

  static error(category: string, message: string, error?: any) {
    this.log('ERROR', `[${category}] ${message}`, {
      error: error?.message || error,
      stack: error?.stack
    });
  }

  static getLogs(): string[] {
    return [...this.logs];
  }

  static clearLogs() {
    this.logs = [];
  }

  static async exportLogs(): Promise<string> {
    return this.logs.join('\n');
  }

  static isPlatform(platform: 'web' | 'android' | 'ios'): boolean {
    if (platform === 'web') {
      return !Capacitor.isNativePlatform();
    }
    return Capacitor.getPlatform() === platform;
  }

  static async getDeviceInfo() {
    const info = {
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    };
    
    this.log('DEVICE_INFO', 'Device information collected', info);
    return info;
  }
}

// Global debug helper
if (typeof window !== 'undefined') {
  (window as any).mobileDebug = MobileDebugger;
}
