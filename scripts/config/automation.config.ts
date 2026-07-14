/**
 * Configuration File for Legal Case Automation
 * Qatar Court System
 */

import 'dotenv/config';
import path from 'path';
import { AutomationConfig } from '../types/automation.types';

export const config: AutomationConfig = {
  credentials: {
    username: process.env.QATAR_COURT_USERNAME || '',
    password: process.env.QATAR_COURT_PASSWORD || ''
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
    email: process.env.LEGAL_CASE_CONTACT_EMAIL || ''
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

export function assertAutomationConfig(): void {
  const missing = [
    ['QATAR_COURT_USERNAME', config.credentials.username],
    ['QATAR_COURT_PASSWORD', config.credentials.password],
    ['LEGAL_CASE_CONTACT_EMAIL', config.case.email],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required automation environment variables: ${missing.join(', ')}`);
  }
}

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
