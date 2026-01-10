/**
 * Invoice Number Generator
 * 
 * Service موحد لإنشاء أرقام الفواتير
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface InvoiceNumberFormat {
  prefix?: string;
  separator?: string;
  serialLength?: number;
}

export interface NumberGenerationResult {
  success: boolean;
  number: string;
  error?: string;
}

class InvoiceNumberGenerator {
  private readonly DEFAULT_PREFIX = 'INV';
  private readonly DEFAULT_SEPARATOR = '-';

  async generateInvoiceNumber(
    companyId: string,
    options: InvoiceNumberFormat = {}
  ): Promise<NumberGenerationResult> {
    try {
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('company_id', companyId)
        .eq('invoice_type', 'invoice')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastNumber = lastInvoice?.invoice_number || null;
      const nextNumber = this.calculateNextNumber(lastNumber);

      return { success: true, number: nextNumber };
    } catch (error) {
      logger.error('Failed to generate invoice number', { companyId, error });
      return { success: false, number: '', error: 'خطأ في إنشاء رقم الفاتورة' };
    }
  }

  private calculateNextNumber(lastNumber: string | null): string {
    if (!lastNumber) return `${this.DEFAULT_PREFIX}${this.DEFAULT_SEPARATOR}0001`;
    
    const parts = lastNumber.split(this.DEFAULT_SEPARATOR);
    const serial = parseInt(parts[1], 10) || 0;
    const nextSerial = (serial + 1).toString().padStart(4, '0');
    
    return `${this.DEFAULT_PREFIX}${this.DEFAULT_SEPARATOR}${nextSerial}`;
  }
}

export const invoiceNumberGenerator = new InvoiceNumberGenerator();
