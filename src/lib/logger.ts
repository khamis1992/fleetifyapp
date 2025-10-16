// Logging configuration utility
// Control logging verbosity across the application

// Log levels:
// - 'debug': Show all logs (development)
// - 'info': Show warnings and errors (default)
// - 'warn': Show only warnings and errors
// - 'error': Show only errors
// - 'silent': Show no logs

const LOG_LEVEL = import.meta.env?.DEV ? 'info' : 'warn';

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
};

const CURRENT_LOG_LEVEL = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.info;

// Create a safe console wrapper that won't be affected by minification
const safeConsole = {
  debug: console.debug.bind(console),
  log: console.log.bind(console),
  info: console.info.bind(console) || console.log.bind(console), // Fallback to log if info is not available
  warn: console.warn.bind(console),
  error: console.error.bind(console)
};

export const logger = {
  debug: (...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.debug) {
      safeConsole.debug(...args);
    }
  },
  
  log: (...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.info) {
      safeConsole.log(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.info) {
      safeConsole.info(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.warn) {
      safeConsole.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.error) {
      safeConsole.error(...args);
    }
  }
};