import { parseNumber, cleanNumericString } from './numberFormatter';
import { format } from 'date-fns';

export interface AutoFixConfig {
  autoFillEmptyDates: boolean;
  autoFillEmptyPaymentMethods: boolean;
  autoFillEmptyTypes: boolean;
  autoCreateCustomers: boolean;
  normalizePaymentMethods: boolean;
  cleanNumericFields: boolean;
  defaultPaymentMethod: string;
  defaultType: string;
}

export const DEFAULT_AUTO_FIX_CONFIG: AutoFixConfig = {
  autoFillEmptyDates: true,
  autoFillEmptyPaymentMethods: true,
  autoFillEmptyTypes: true,
  autoCreateCustomers: true,
  normalizePaymentMethods: true,
  cleanNumericFields: true,
  defaultPaymentMethod: 'cash',
  defaultType: 'receipt'
};

// Enhanced payment method mappings
const PAYMENT_METHOD_MAPPINGS: Record<string, string> = {
  // Arabic
  'نقد': 'cash',
  'نقدي': 'cash',
  'كاش': 'cash',
  'شيك': 'check',
  'شيكات': 'check',
  'تحويل': 'bank_transfer',
  'تحويل بنكي': 'bank_transfer',
  'بنك': 'bank_transfer',
  'بطاقة': 'credit_card',
  'بطاقة ائتمان': 'credit_card',
  'فيزا': 'credit_card',
  'ماستر': 'credit_card',
  
  // English variations
  'cash': 'cash',
  'money': 'cash',
  'received': 'cash',
  'paid': 'cash',
  'check': 'check',
  'cheque': 'check',
  'transfer': 'bank_transfer',
  'bank': 'bank_transfer',
  'wire': 'bank_transfer',
  'card': 'credit_card',
  'credit': 'credit_card',
  'debit': 'debit_card',
  'visa': 'credit_card',
  'mastercard': 'credit_card',
  'master': 'credit_card',
  
  // Common misspellings
  'cassh': 'cash',
  'chash': 'cash',
  'cach': 'cash',
  'transfert': 'bank_transfer',
  'banktransfer': 'bank_transfer',
  'creditcard': 'credit_card',
  'debitcard': 'debit_card'
};

const TYPE_MAPPINGS: Record<string, string> = {
  // Arabic
  'ايصال': 'receipt',
  'استلام': 'receipt',
  'دفع': 'payment',
  'دفعة': 'receipt',
  'سداد': 'receipt',
  'ايجار': 'receipt',
  'رسوم': 'receipt',
  'غرامة': 'receipt',
  
  // English
  'receipt': 'receipt',
  'received': 'receipt',
  'payment': 'receipt',
  'rent': 'receipt',
  'fee': 'receipt',
  'fine': 'receipt',
  'late_payment_fee': 'receipt',
  'late_fee': 'receipt'
};

export class CSVAutoFix {
  private config: AutoFixConfig;
  private fixes: Array<{ row: number; field: string; original: any; fixed: any; reason: string }> = [];

  constructor(config: Partial<AutoFixConfig> = {}) {
    this.config = { ...DEFAULT_AUTO_FIX_CONFIG, ...config };
  }

  public autoFixData(data: any[]): { fixedData: any[]; fixes: typeof this.fixes } {
    this.fixes = [];
    const fixedData = data.map((row, index) => this.autoFixRow(row, index));
    return { fixedData, fixes: this.fixes };
  }

  private autoFixRow(row: any, rowIndex: number): any {
    const fixed = { ...row };

    // Clean and normalize all string fields
    Object.keys(fixed).forEach(key => {
      if (typeof fixed[key] === 'string') {
        const original = fixed[key];
        fixed[key] = this.cleanString(fixed[key]);
        if (original !== fixed[key] && original.trim() !== '') {
          this.addFix(rowIndex, key, original, fixed[key], 'تنظيف النص وإزالة المسافات الزائدة');
        }
      }
    });

    // Auto-fix payment date
    if (this.config.autoFillEmptyDates && this.isEmptyField(fixed.payment_date)) {
      const today = format(new Date(), 'yyyy-MM-dd');
      this.addFix(rowIndex, 'payment_date', fixed.payment_date, today, 'تعبئة تاريخ اليوم تلقائياً');
      fixed.payment_date = today;
    }

    // Normalize and fix payment method
    if (this.config.normalizePaymentMethods && fixed.payment_method) {
      const normalized = this.normalizePaymentMethod(fixed.payment_method);
      if (normalized !== fixed.payment_method) {
        this.addFix(rowIndex, 'payment_method', fixed.payment_method, normalized, 'توحيد طريقة الدفع');
        fixed.payment_method = normalized;
      }
    }

    // Auto-fill empty payment method
    if (this.config.autoFillEmptyPaymentMethods && this.isEmptyField(fixed.payment_method)) {
      this.addFix(rowIndex, 'payment_method', fixed.payment_method, this.config.defaultPaymentMethod, 'تعبئة طريقة الدفع الافتراضية');
      fixed.payment_method = this.config.defaultPaymentMethod;
    }

    // Normalize and fix type
    if (fixed.type) {
      const normalizedType = this.normalizeType(fixed.type);
      if (normalizedType !== fixed.type) {
        this.addFix(rowIndex, 'type', fixed.type, normalizedType, 'توحيد نوع العملية');
        fixed.type = normalizedType;
      }
    }

    // Auto-fill empty type
    if (this.config.autoFillEmptyTypes && this.isEmptyField(fixed.type)) {
      this.addFix(rowIndex, 'type', fixed.type, this.config.defaultType, 'تعبئة نوع العملية الافتراضي');
      fixed.type = this.config.defaultType;
    }

    // Clean and fix numeric fields
    if (this.config.cleanNumericFields) {
      ['amount', 'amount_paid', 'balance', 'late_fine_amount'].forEach(field => {
        if (fixed[field] !== undefined && fixed[field] !== null) {
          const original = fixed[field];
          const cleaned = this.cleanAndParseNumber(fixed[field]);
          if (original !== cleaned && !isNaN(cleaned)) {
            this.addFix(rowIndex, field, original, cleaned, 'تنظيف وتحويل الرقم');
            fixed[field] = cleaned;
          }
        }
      });
    }

    // Generate payment number if missing
    if (this.isEmptyField(fixed.payment_number)) {
      const paymentNumber = `PAY-${Date.now()}-${rowIndex + 1}`;
      this.addFix(rowIndex, 'payment_number', fixed.payment_number, paymentNumber, 'توليد رقم الدفعة تلقائياً');
      fixed.payment_number = paymentNumber;
    }

    // Set default currency
    if (this.isEmptyField(fixed.currency)) {
      this.addFix(rowIndex, 'currency', fixed.currency, 'KWD', 'تعبئة العملة الافتراضية');
      fixed.currency = 'KWD';
    }

    return fixed;
  }

  private cleanString(value: string): string {
    if (typeof value !== 'string') return value;
    return value.trim().replace(/\s+/g, ' ').replace(/[^\S ]/g, '');
  }

  private normalizePaymentMethod(method: string): string {
    if (!method) return method;
    
    const cleaned = this.cleanString(method).toLowerCase();
    const mapped = PAYMENT_METHOD_MAPPINGS[cleaned];
    
    if (mapped) return mapped;
    
    // Try partial matching
    for (const [key, value] of Object.entries(PAYMENT_METHOD_MAPPINGS)) {
      if (cleaned.includes(key) || key.includes(cleaned)) {
        return value;
      }
    }
    
    // Default to cash for unknown methods
    return this.config.defaultPaymentMethod;
  }

  private normalizeType(type: string): string {
    if (!type) return type;
    
    const cleaned = this.cleanString(type).toLowerCase();
    const mapped = TYPE_MAPPINGS[cleaned];
    
    if (mapped) return mapped;
    
    // Try partial matching
    for (const [key, value] of Object.entries(TYPE_MAPPINGS)) {
      if (cleaned.includes(key) || key.includes(cleaned)) {
        return value;
      }
    }
    
    return type;
  }

  private cleanAndParseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    const stringValue = String(value);
    const cleaned = cleanNumericString(stringValue);
    const parsed = parseNumber(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
  }

  private isEmptyField(value: any): boolean {
    return value === undefined || value === null || 
           (typeof value === 'string' && value.trim() === '') ||
           value === '';
  }

  private addFix(row: number, field: string, original: any, fixed: any, reason: string) {
    this.fixes.push({ row: row + 1, field, original, fixed, reason });
  }

  public generateCleanedCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains comma or quote
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  public getFixesSummary(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    
    this.fixes.forEach(fix => {
      byType[fix.reason] = (byType[fix.reason] || 0) + 1;
    });
    
    return {
      total: this.fixes.length,
      byType
    };
  }

  // Legacy methods for compatibility
  public static fixCSVData(data: any[], config?: Partial<AutoFixConfig>) {
    const fixer = new CSVAutoFix(config);
    return fixer.autoFixData(data);
  }

  public fixRow(row: any, index: number) {
    return this.autoFixRow(row, index);
  }
}

// Export types for compatibility
export type CSVRowFix = {
  row: number;
  field: string; 
  original: any;
  fixed: any;
  reason: string;
};