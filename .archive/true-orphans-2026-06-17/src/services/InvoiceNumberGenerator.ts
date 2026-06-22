/**
 * Invoice Number Generator
 * 
 * Centralized service for generating unique invoice numbers
 * Follows consistent format: INV-{timestamp}-{sequence}
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Invoice Number Generator
 * Generates unique invoice numbers with format: INV-{YYYYMMDD}-{sequence}
 */
export class InvoiceNumberGenerator {
  
  /**
   * Generate next invoice number
   * Returns next number in sequence for given date
   */
  async generateInvoiceNumber(
    companyId: string,
    options?: {
      date?: Date;
      forceIncrement?: boolean;
    }
  ): Promise<string> {
    try {
      const date = options?.date || new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

      logger.debug('Generating invoice number', { companyId, dateStr });

      // Get current sequence for this date
      const { data: existingInvoices, error: fetchError } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('company_id', companyId)
        .like('invoice_number', `INV-${dateStr}%`)
        .order('invoice_number', { ascending: false })
        .limit(1);

      if (fetchError) {
        logger.error('Failed to fetch existing invoice numbers', { companyId, error: fetchError });
        throw fetchError;
      }

      // Extract sequence from existing invoice number
      let nextSequence = 1;
      if (existingInvoices && existingInvoices.length > 0) {
        const lastInvoiceNumber = existingInvoices[0].invoice_number;
        const match = lastInvoiceNumber.match(new RegExp(`INV-${dateStr}-(\\d+)$`));
        
        if (match) {
          const sequence = parseInt(match[1], 10);
          nextSequence = sequence + 1;
        }
      }

      // Force increment if requested
      if (options?.forceIncrement) {
        // Get max sequence for this date
        const { data: allInvoices, error: maxError } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('company_id', companyId)
          .like('invoice_number', `INV-${dateStr}%`);

        if (maxError) {
          logger.error('Failed to fetch max invoice sequence', { companyId, error: maxError });
          throw maxError;
        }

        if (allInvoices && allInvoices.length > 0) {
          const sequences = allInvoices
            .map(inv => {
              const match = inv.invoice_number.match(new RegExp(`INV-${dateStr}-(\\d+)$`));
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter(seq => seq > 0);

          if (sequences.length > 0) {
            nextSequence = Math.max(...sequences) + 1;
          }
        }
      }

      // Generate invoice number
      const invoiceNumber = `INV-${dateStr}-${String(nextSequence).padStart(4, '0')}`;

      logger.info('Invoice number generated', {
        companyId,
        invoiceNumber,
        date: dateStr,
        sequence: nextSequence
      });

      return invoiceNumber;

    } catch (error) {
      logger.error('Exception generating invoice number', {
        companyId,
        error
      });
      throw error;
    }
  }

  /**
   * Generate batch of invoice numbers
   * Useful for bulk invoice creation
   */
  async generateInvoiceNumberBatch(
    companyId: string,
    count: number,
    options?: {
      date?: Date;
    }
  ): Promise<string[]> {
    try {
      logger.info('Generating invoice number batch', { companyId, count });

      const invoiceNumbers: string[] = [];
      const date = options?.date || new Date();
      
      // Use date prefix for all numbers
      for (let i = 0; i < count; i++) {
        const invoiceNumber = await this.generateInvoiceNumber(companyId, {
          date,
          forceIncrement: i === 0 // Only force first one
        });
        invoiceNumbers.push(invoiceNumber);
      }

      logger.info('Invoice number batch generated', {
        companyId,
        count,
        firstNumber: invoiceNumbers[0],
        lastNumber: invoiceNumbers[invoiceNumbers.length - 1]
      });

      return invoiceNumbers;

    } catch (error) {
      logger.error('Exception generating invoice number batch', {
        companyId,
        count,
        error
      });
      throw error;
    }
  }

  /**
   * Validate invoice number format
   */
  validateInvoiceNumberFormat(invoiceNumber: string): boolean {
    const regex = /^INV-\d{8}-\d{4}$/;
    return regex.test(invoiceNumber);
  }

  /**
   * Get next available invoice number (without consuming)
   * Preview next number without incrementing
   */
  async previewNextInvoiceNumber(
    companyId: string,
    options?: {
      date?: Date;
    }
  ): Promise<string> {
    const date = options?.date || new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

    // Get max sequence for this date
    const { data: allInvoices, error: maxError } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('company_id', companyId)
      .like('invoice_number', `INV-${dateStr}%`);

    if (maxError) {
      logger.error('Failed to fetch max invoice sequence', { companyId, error: maxError });
      throw maxError;
    }

    let nextSequence = 1;
    if (allInvoices && allInvoices.length > 0) {
      const sequences = allInvoices
        .map(inv => {
          const match = inv.invoice_number.match(new RegExp(`INV-${dateStr}-(\\d+)$`));
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(seq => seq > 0);

      if (sequences.length > 0) {
        nextSequence = Math.max(...sequences) + 1;
      }
    }

    const previewNumber = `INV-${dateStr}-${String(nextSequence).padStart(4, '0')}`;

    logger.debug('Invoice number preview', {
      companyId,
      previewNumber,
      date: dateStr,
      sequence: nextSequence
    });

    return previewNumber;
  }

  /**
   * Get current invoice number statistics
   */
  async getInvoiceNumberStats(
    companyId: string,
    options?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    totalInvoices: number;
    invoicesByDate: Record<string, number>;
    lastInvoiceNumber?: string;
    firstInvoiceNumber?: string;
  }> {
    try {
      logger.info('Getting invoice number statistics', {
        companyId,
        options
      });

      let query = supabase
        .from('invoices')
        .select('invoice_number, invoice_date')
        .eq('company_id', companyId)
        .not('invoice_number', 'is', null);

      if (options?.startDate) {
        query = query.gte('invoice_date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('invoice_date', options.endDate);
      }

      query = query.order('invoice_date', { ascending: false });

      const { data: invoices, error: statsError } = await query;

      if (statsError) {
        logger.error('Failed to fetch invoice statistics', { companyId, error: statsError });
        throw statsError;
      }

      if (!invoices || invoices.length === 0) {
        return {
          totalInvoices: 0,
          invoicesByDate: {},
          lastInvoiceNumber: undefined,
          firstInvoiceNumber: undefined
        };
      }

      const totalInvoices = invoices.length;
      const lastInvoiceNumber = invoices[0]?.invoice_number;
      const firstInvoiceNumber = invoices[invoices.length - 1]?.invoice_number;

      // Group by date
      const invoicesByDate: Record<string, number> = {};
      invoices.forEach(inv => {
        const date = inv.invoice_date.split('T')[0];
        invoicesByDate[date] = (invoicesByDate[date] || 0) + 1;
      });

      logger.info('Invoice number statistics retrieved', {
        companyId,
        totalInvoices,
        lastInvoiceNumber,
        firstInvoiceNumber,
        dateGroups: Object.keys(invoicesByDate).length
      });

      return {
        totalInvoices,
        invoicesByDate,
        lastInvoiceNumber,
        firstInvoiceNumber
      };

    } catch (error) {
      logger.error('Exception getting invoice number statistics', {
        companyId,
        error
      });
      throw error;
    }
  }
}

// Export singleton instance
export const invoiceNumberGenerator = new InvoiceNumberGenerator();
