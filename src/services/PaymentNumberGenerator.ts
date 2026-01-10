/**
 * Payment Number Generator
 * 
 * Centralized service for generating unique payment numbers
 * Follows consistent format: PAY-{timestamp}-{sequence}
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Payment Number Generator
 * Generates unique payment numbers with format: PAY-{YYYYMMDD}-{sequence}
 */
export class PaymentNumberGenerator {
  
  /**
   * Generate next payment number
   * Returns next number in sequence for given date
   */
  async generatePaymentNumber(
    companyId: string,
    options?: {
      date?: Date;
      forceIncrement?: boolean;
    }
  ): Promise<string> {
    try {
      const date = options?.date || new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

      logger.debug('Generating payment number', { companyId, dateStr });

      // Get current sequence for this date
      const { data: existingPayments, error: fetchError } = await supabase
        .from('payments')
        .select('payment_number')
        .eq('company_id', companyId)
        .like('payment_number', `PAY-${dateStr}%`)
        .order('payment_number', { ascending: false })
        .limit(1);

      if (fetchError) {
        logger.error('Failed to fetch existing payment numbers', { companyId, error: fetchError });
        throw fetchError;
      }

      // Extract sequence from existing payment number
      let nextSequence = 1;
      if (existingPayments && existingPayments.length > 0) {
        const lastPaymentNumber = existingPayments[0].payment_number;
        const match = lastPaymentNumber.match(new RegExp(`PAY-${dateStr}-(\\d+)$`));
        
        if (match) {
          const sequence = parseInt(match[1], 10);
          nextSequence = sequence + 1;
        }
      }

      // Force increment if requested
      if (options?.forceIncrement) {
        // Get max sequence for this date
        const { data: allPayments, error: maxError } = await supabase
          .from('payments')
          .select('payment_number')
          .eq('company_id', companyId)
          .like('payment_number', `PAY-${dateStr}%`);

        if (maxError) {
          logger.error('Failed to fetch max payment sequence', { companyId, error: maxError });
          throw maxError;
        }

        if (allPayments && allPayments.length > 0) {
          const sequences = allPayments
            .map(p => {
              const match = p.payment_number.match(new RegExp(`PAY-${dateStr}-(\\d+)$`));
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter(seq => seq > 0);

          if (sequences.length > 0) {
            nextSequence = Math.max(...sequences) + 1;
          }
        }
      }

      // Generate payment number
      const paymentNumber = `PAY-${dateStr}-${String(nextSequence).padStart(4, '0')}`;

      logger.info('Payment number generated', {
        companyId,
        paymentNumber,
        date: dateStr,
        sequence: nextSequence
      });

      return paymentNumber;

    } catch (error) {
      logger.error('Exception generating payment number', {
        companyId,
        error
      });
      throw error;
    }
  }

  /**
   * Generate batch of payment numbers
   * Useful for bulk payment creation
   */
  async generatePaymentNumberBatch(
    companyId: string,
    count: number,
    options?: {
      date?: Date;
    }
  ): Promise<string[]> {
    try {
      logger.info('Generating payment number batch', { companyId, count });

      const paymentNumbers: string[] = [];
      const date = options?.date || new Date();
      
      // Use date prefix for all numbers
      for (let i = 0; i < count; i++) {
        const paymentNumber = await this.generatePaymentNumber(companyId, { 
          date,
          forceIncrement: i === 0 // Force increment only on first one to use correct starting point
        });
        paymentNumbers.push(paymentNumber);
      }

      logger.info('Payment number batch generated', {
        companyId,
        count,
        firstNumber: paymentNumbers[0],
        lastNumber: paymentNumbers[paymentNumbers.length - 1]
      });

      return paymentNumbers;

    } catch (error) {
      logger.error('Exception generating payment number batch', {
        companyId,
        count,
        error
      });
      throw error;
    }
  }

  /**
   * Validate payment number format
   */
  validatePaymentNumberFormat(paymentNumber: string): boolean {
    const regex = /^PAY-\d{8}-\d{4}$/;
    return regex.test(paymentNumber);
  }

  /**
   * Get next available payment number (without consuming)
   * Preview next number without incrementing
   */
  async previewNextPaymentNumber(
    companyId: string,
    options?: {
      date?: Date;
    }
  ): Promise<string> {
    const date = options?.date || new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // Get max sequence for this date
    const { data: allPayments } = await supabase
      .from('payments')
      .select('payment_number')
      .eq('company_id', companyId)
      .like('payment_number', `PAY-${dateStr}%`)
      .order('payment_number', { ascending: false });

    let nextSequence = 1;
    if (allPayments && allPayments.length > 0) {
      const sequences = allPayments
        .map(p => {
          const match = p.payment_number.match(new RegExp(`PAY-${dateStr}-(\\d+)$`));
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(seq => seq > 0);

      if (sequences.length > 0) {
        nextSequence = Math.max(...sequences) + 1;
      }
    }

    const previewNumber = `PAY-${dateStr}-${String(nextSequence).padStart(4, '0')}`;

    logger.debug('Payment number preview', {
      companyId,
      previewNumber
    });

    return previewNumber;
  }

  /**
   * Get current payment number statistics
   */
  async getPaymentNumberStats(
    companyId: string,
    options?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    totalPayments: number;
    paymentsByDate: Record<string, number>;
    lastPaymentNumber?: string;
    firstPaymentNumber?: string;
  }> {
    try {
      logger.info('Getting payment number statistics', {
        companyId,
        options
      });

      let query = supabase
        .from('payments')
        .select('payment_number, payment_date')
        .eq('company_id', companyId)
        .not('payment_number', 'is', null);

      if (options?.startDate) {
        query = query.gte('payment_date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('payment_date', options.endDate);
      }

      query = query.order('payment_date', { ascending: false });

      const { data: payments, error } = await query;

      if (error) {
        logger.error('Failed to fetch payment statistics', { companyId, error });
        throw error;
      }

      if (!payments || payments.length === 0) {
        return {
          totalPayments: 0,
          paymentsByDate: {},
          lastPaymentNumber: undefined,
          firstPaymentNumber: undefined
        };
      }

      const totalPayments = payments.length;
      const lastPaymentNumber = payments[0]?.payment_number;
      const firstPaymentNumber = payments[payments.length - 1]?.payment_number;

      // Group by date
      const paymentsByDate: Record<string, number> = {};
      payments.forEach(payment => {
        const date = payment.payment_date.split('T')[0];
        paymentsByDate[date] = (paymentsByDate[date] || 0) + 1;
      });

      logger.info('Payment number statistics retrieved', {
        companyId,
        totalPayments,
        lastPaymentNumber,
        firstPaymentNumber,
        dateGroups: Object.keys(paymentsByDate).length
      });

      return {
        totalPayments,
        paymentsByDate,
        lastPaymentNumber,
        firstPaymentNumber
      };

    } catch (error) {
      logger.error('Exception getting payment number statistics', {
        companyId,
        error
      });
      throw error;
    }
  }
}

// Export singleton instance
export const paymentNumberGenerator = new PaymentNumberGenerator();
