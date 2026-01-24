/**
 * Excel Reader Utility for Legal Case Automation
 * Reads customer data from Excel files
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { CustomerData } from '../types/automation.types';
import { getExcelPath } from '../config/automation.config';

/**
 * Read customer data from Excel file
 */
export function readCustomerData(customerName: string): CustomerData {
  const excelPath = getExcelPath(customerName);

  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }

  try {
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      throw new Error(`Excel file is empty: ${excelPath}`);
    }

    // Assuming first row contains customer data
    const row = data[0] as any;

    return {
      firstName: parseString(row.FirstName, 'الاسم الأول'),
      familyName: parseString(row.FamilyName, 'اسم العائلة'),
      nationality: parseString(row.Nationality, 'الجنسية'),
      idNumber: parseString(row.IDNumber, 'رقم الهوية'),
      mobile: parseString(row.Mobile, 'رقم الجوال'),
      amount: parseNumber(row.Amount, 'المبلغ الإجمالي'),
      facts: parseString(row.Facts, 'الوقائع'),
      requests: parseString(row.Requests, 'الطلبات')
    };
  } catch (error) {
    throw new Error(`Failed to read Excel file: ${error.message}`);
  }
}

/**
 * Parse string value from row (supports both English and Arabic keys)
 */
function parseString(value: any, fallbackKey: string): string {
  if (value !== undefined && value !== null) {
    return String(value).trim();
  }
  return ''; // Return empty string if not found
}

/**
 * Parse number value from row
 */
function parseNumber(value: any, fallbackKey: string): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    // Remove any non-numeric characters (except decimal point)
    const cleaned = value.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;
}

/**
 * Find document files in customer folder
 */
export function findCustomerDocuments(customerName: string): Map<string, string[]> {
  const customerPath = path.join(process.cwd(), 'data', 'customers', customerName);
  const documents = new Map<string, string[]>();

  if (!fs.existsSync(customerPath)) {
    throw new Error(`Customer folder not found: ${customerPath}`);
  }

  const files = fs.readdirSync(customerPath);

  // Define document patterns
  const patterns = {
    memo: /^(المذكرة الشارحة)\.(pdf|docx)$/i,
    portfolio: /^(حافظة المستندات)\.(pdf|docx)$/i,
    iban: /^(رقم الحساب الدولي|IBAN).*\.(pdf|jpeg|jpg|png)$/i,
    idCard: /^(بطاقة شخصية|هوية).*\.(pdf|jpeg|jpg|png)$/i,
    commercialRecord: /^(سجل تجاري).*\.(pdf|jpeg|jpg|png)$/i
  };

  files.forEach(file => {
    const fullPath = path.join(customerPath, file);

    // Skip directories and Excel file
    if (fs.statSync(fullPath).isDirectory() || file.endsWith('.xlsx')) {
      return;
    }

    // Match against patterns
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(file)) {
        if (!documents.has(type)) {
          documents.set(type, []);
        }
        documents.get(type)!.push(fullPath);
        break;
      }
    }
  });

  return documents;
}

/**
 * Validate customer data completeness
 */
export function validateCustomerData(data: CustomerData): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!data.firstName) missing.push('First Name (الاسم الأول)');
  if (!data.familyName) missing.push('Family Name (اسم العائلة)');
  if (!data.nationality) missing.push('Nationality (الجنسية)');
  if (!data.idNumber) missing.push('ID Number (رقم الهوية)');
  if (!data.mobile) missing.push('Mobile (رقم الجوال)');
  if (data.amount <= 0) missing.push('Amount (المبلغ)');
  if (!data.facts) missing.push('Facts (الوقائع)');
  if (!data.requests) missing.push('Requests (الطلبات)');

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Validate required documents exist
 */
export function validateDocuments(documents: Map<string, string[]>): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  const required = ['memo', 'portfolio', 'iban', 'idCard', 'commercialRecord'];

  required.forEach(type => {
    if (!documents.has(type) || documents.get(type)!.length === 0) {
      const typeNames: Record<string, string> = {
        memo: 'المذكرة الشارحة (PDF & DOCX)',
        portfolio: 'حافظة المستندات',
        iban: 'رقم الحساب الدولي (IBAN)',
        idCard: 'بطاقة شخصية',
        commercialRecord: 'سجل تجاري'
      };
      missing.push(typeNames[type]);
    }
  });

  // Special check: memo needs both PDF and DOCX
  if (documents.has('memo')) {
    const memoFiles = documents.get('memo')!;
    const hasPdf = memoFiles.some(f => f.endsWith('.pdf'));
    const hasDocx = memoFiles.some(f => f.endsWith('.docx'));

    if (!hasPdf) missing.push('المذكرة الشارحة (PDF)');
    if (!hasDocx) missing.push('المذكرة الشارحة (DOCX)');
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

export default {
  readCustomerData,
  findCustomerDocuments,
  validateCustomerData,
  validateDocuments
};
