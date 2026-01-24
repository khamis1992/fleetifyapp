/**
 * Configuration File for Legal Case Automation
 * Qatar Court System
 */

import path from 'path';
import { AutomationConfig } from '../types/automation.types';

export const config: AutomationConfig = {
  credentials: {
    username: process.env.QATAR_COURT_USERNAME || '29263400736',
    password: process.env.QATAR_COURT_PASSWORD || 'Khamees1992#'
  },

  court: {
    courtName: 'محكمة الاستثمار والتجارة',
    proceedingType: 'استثمار',
    litigationDegree: 'إبتدائي',
    type: 'عقود الخدمات التجارية',
    subtype: 'عقود إيجار السيارات وخدمات الليموزين',
    subject: 'لا ينطبق',
    classification: 'تجاري'
  },

  case: {
    title: 'مطالبة مالية-إيجار سيارة',
    claimType: 'قيمة المطالبة',
    address: 'الجوحة - قطر',
    email: 'khamis-1992@hotmail.com'
  },

  documents: {
    memo: {
      pdf: 'المذكرة الشارحة.pdf',
      docx: 'المذكرة الشارحة.docx'
    },
    portfolio: 'حافظة المستندات',
    iban: 'رقم الحساب الدولي (IBAN)',
    idCard: 'بطاقة شخصية',
    commercialRecord: 'سجل تجاري'
  },

  automation: {
    headless: process.env.HEADLESS === 'true',
    slowMo: 50, // milliseconds between actions for stability
    timeout: 30000, // 30 seconds default timeout
    screenshotsDir: path.join(process.cwd(), 'logs', 'screenshots'),
    logsDir: path.join(process.cwd(), 'logs', 'automation'),
    retryAttempts: 3,
    retryDelay: 2000 // 2 seconds
  }
};

/**
 * Get customer data path
 */
export function getCustomerDataPath(customerName: string): string {
  return path.join(process.cwd(), 'data', 'customers', customerName);
}

/**
 * Get Excel file path for customer
 */
export function getExcelPath(customerName: string): string {
  return path.join(getCustomerDataPath(customerName), 'data.xlsx');
}

/**
 * Get documents path for customer
 */
export function getDocumentsPath(customerName: string): string {
  return path.join(getCustomerDataPath(customerName));
}

/**
 * Get screenshot path
 */
export function getScreenshotPath(customerName: string, step: number): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(
    config.automation.screenshotsDir,
    customerName,
    `step-${step}-${timestamp}.png`
  );
}

/**
 * Get log file path
 */
export function getLogFilePath(customerName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(
    config.automation.logsDir,
    `${customerName}-${timestamp}.log`
  );
}

export default config;
