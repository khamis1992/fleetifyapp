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

export const logger = {
  debug: (...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.debug) {
      console.debug(...args);
    }
  },
  
  log: (...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.info) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.warn) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.error) {
      console.error(...args);
    }
  }
};