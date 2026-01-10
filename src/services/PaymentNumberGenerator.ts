/**
 * Payment Number Generator
 * 
 * Service موحد لإنشاء أرقام المدفوعات
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface PaymentNumberFormat {
  prefix?: string;
  separator?: string;
  serialLength?: number;
}

export interface NumberGenerationResult {
  success: boolean;
  number: string;
  error?: string;
}

class PaymentNumberGenerator {
  private readonly DEFAULT_PREFIX = 'PAY';
  private readonly DEFAULT_SEPARATOR = '-';

  async generatePaymentNumber(
    companyId: string,
    options: PaymentNumberFormat = {}
  ): Promise<NumberGenerationResult> {
    try {
      const { data: lastPayment } = await supabase
        .from('payments')
        .select('payment_number')
        .eq('company_id', companyId)
        .eq('payment_status', 'completed')
        .order('payment_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastNumber = lastPayment?.payment_number || null;
      const nextNumber = this.calculateNextNumber(lastNumber);

      return { success: true, number: nextNumber };
    } catch (error) {
      logger.error('Failed to generate payment number', { companyId, error });
      return { success: false, number: '', error: 'خطأ في إنشاء رقم الدفعة' };
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

export const paymentNumberGenerator = new PaymentNumberGenerator();
