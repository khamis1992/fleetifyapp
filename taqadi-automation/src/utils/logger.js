/**
 * نظام السجلات
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, '../../logs/automation.log');

/**
 * كتابة سجل
 */
export function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data }),
  };
  
  const logLine = `[${timestamp}] [${level}] ${message}${data ? ' | ' + JSON.stringify(data) : ''}\n`;
  
  // كتابة في الملف
  fs.appendFileSync(LOG_FILE, logLine, 'utf8');
  
  // طباعة في Console
  const icon = {
    INFO: 'ℹ️',
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
  }[level] || '📝';
  
  console.log(`${icon} ${message}`);
  
  return logEntry;
}

export const logger = {
  info: (msg, data) => log('INFO', msg, data),
  success: (msg, data) => log('SUCCESS', msg, data),
  error: (msg, data) => log('ERROR', msg, data),
  warning: (msg, data) => log('WARNING', msg, data),
};
