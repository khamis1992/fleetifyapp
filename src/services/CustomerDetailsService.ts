/**
 * Customer Details Service
 * 
 * Centralized service for accessing and caching customer information
 * Improves performance by reducing redundant database queries
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Customer Details
 * Cached customer information
 */
export interface CustomerDetails {
  id: string;
  companyId: string;
  
  // Basic info
  customerType: string; // individual, business, etc.
  firstName: string;
  lastName: string;
  firstNameAr: string;
  lastNameAr: string;
  companyName: string;
  companyNameAr: string;
  
  // Contact info
  phone: string;
  email?: string;
  
  // Business info
  customerSince: string; // Customer since date
  totalPayments: number;
  totalAmount: number;
  averagePaymentAmount: number;
  lastPaymentDate: string;
  daysSinceLastPayment: number;
  activeContracts: number;
  
  // Payment behavior
  preferredPaymentMethod: string;
  paymentFrequency: number; // Average payments per month
  onTimePaymentRate: number; // Percentage of on-time payments
  averageDaysLate: number;
  riskLevel: 'low' | 'medium' | 'high';
  
  // Metadata
  paymentHistory?: Array<{
    paymentId: string;
    amount: number;
    paymentDate: string;
    daysLate: number;
  }>;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Customer Payment Summary
 * Quick payment summary for a customer
 */
export interface CustomerPaymentSummary {
  customerId: string;
  customerName: string;
  customerNameAr: string;
  phone: string;
  
  // Payment metrics
  totalPayments: number;
  totalPaid: number;
  totalOutstanding: number;
  averagePayment: number;
  highestPayment: number;
  lowestPayment: number;
  
  // Recent payments
  recentPayments: Array<{
    paymentId: string;
    paymentNumber: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    paymentStatus: string;
    daysLate?: number;
  }>;
  
  // Overdue status
  overdueContracts: number;
  overdueAmount: number;
  
  // Calculated at
  calculatedAt: string;
}

/**
 * Customer Details Service
 * Main service class
 */
export class CustomerDetailsService {
  private cache: Map<string, CustomerDetails> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Get customer details
   * Retrieves customer information with caching
   */
  async getCustomerDetails(
    customerId: string,
    options?: {
      includePaymentHistory?: boolean;
      includeActiveContracts?: boolean;
      forceRefresh?: boolean; // Bypass cache
    }
  ): Promise<CustomerDetails> {
    try {
      logger.debug('Fetching customer details', {
        customerId,
        options
      });

      // Check cache first
      if (!options?.forceRefresh && this.cache.has(customerId)) {
        const cached = this.cache.get(customerId);
        
        // Check if cache is still valid
        const cacheAge = Date.now() - new Date(cached.updatedAt).getTime();
        if (cacheAge < this.cacheTimeout) {
          logger.debug('Using cached customer details', { customerId, cacheAge });
          return cached;
        }
        
        // Cache expired, remove and fetch fresh
        this.cache.delete(customerId);
      }

      // Fetch customer data
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) {
        logger.error('Failed to fetch customer', { customerId, error: customerError });
        throw customerError;
      }

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Build customer details
      const details: CustomerDetails = {
        id: customer.id,
        companyId: customer.company_id,
        
        // Basic info
        customerType: customer.customer_type || 'individual',
        firstName: customer.first_name || '',
        lastName: customer.last_name || '',
        firstNameAr: customer.first_name_ar || '',
        lastNameAr: customer.last_name_ar || '',
        companyName: customer.company_name || '',
        companyNameAr: customer.company_name_ar || 
                        `${customer.first_name_ar || customer.first_name} ${customer.last_name_ar || customer.last_name}`,
        
        // Contact info
        phone: customer.phone || '',
        email: customer.email || '',
        
        // Business info
        customerSince: customer.created_at || '',
        
        // Payment history
        paymentHistory: options?.includePaymentHistory 
          ? await this.getCustomerPaymentHistory(customerId)
          : [],
        
        // Active contracts
        activeContracts: options?.includeActiveContracts
          ? await this.getCustomerActiveContracts(customerId)
          : 0,
        
        // Payment metrics
        paymentFrequency: 0,
        averagePaymentAmount: 0,
        onTimePaymentRate: 0,
        averageDaysLate: 0,
        riskLevel: 'low',
        
        // Timestamps
        createdAt: customer.created_at || new Date().toISOString(),
        updatedAt: customer.updated_at || new Date().toISOString()
      };

      // Enrich with payment data if requested
      if (options?.includePaymentHistory) {
        const paymentStats = this.calculatePaymentStatistics(details.paymentHistory);
        details.totalPayments = paymentStats.totalPayments;
        details.totalAmount = paymentStats.totalAmount;
        details.averagePaymentAmount = paymentStats.averageAmount;
        details.lastPaymentDate = paymentStats.lastPaymentDate || '';
        details.daysSinceLastPayment = paymentStats.daysSinceLastPayment || 0;
        details.paymentFrequency = paymentStats.frequency;
        details.onTimePaymentRate = paymentStats.onTimeRate;
        details.averageDaysLate = paymentStats.averageDaysLate;
        details.riskLevel = this.calculateRiskLevel(paymentStats, details.totalPayments);
      }

      // Enrich with contract data if requested
      if (options?.includeActiveContracts) {
        const contractStats = this.calculateContractStatistics(details);
        details.overdueContracts = contractStats.overdueCount;
        details.overdueAmount = contractStats.overdueAmount;
      }

      // Cache the result
      this.cache.set(customerId, details);

      logger.info('Customer details fetched', {
        customerId,
        cacheHit: !options?.forceRefresh,
        totalPayments: details.totalPayments
      });

      return details;

    } catch (error) {
      logger.error('Exception fetching customer details', {
        customerId,
        error
      });
      throw error;
    }
  }

  /**
   * Get customer payment history
   */
  private async getCustomerPaymentHistory(
    customerId: string,
    limit: number = 10
  ): Promise<CustomerDetails['paymentHistory']> {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          id,
          payment_number,
          payment_date,
          amount,
          payment_method,
          payment_status,
          days_overdue
        `)
        .eq('customer_id', customerId)
        .eq('payment_status', 'completed')
        .order('payment_date', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to fetch customer payment history', { customerId, error });
        return [];
      }

      if (!payments || payments.length === 0) {
        return [];
      }

      // Map to payment history format
      const paymentHistory = payments.map(payment => ({
        paymentId: payment.id,
        paymentNumber: payment.payment_number,
        amount: payment.amount,
        paymentDate: payment.payment_date,
        paymentMethod: payment.payment_method,
        paymentStatus: payment.payment_status,
        daysLate: payment.days_overdue || 0
      }));

      return paymentHistory;

    } catch (error) {
      logger.error('Exception fetching customer payment history', { customerId, error });
      return [];
    }
  }

  /**
   * Get customer active contracts
   */
  private async getCustomerActiveContracts(
    customerId: string
  ): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: false })
        .eq('customer_id', customerId)
        .in('status', ['active', 'expiring_soon']);

      if (error) {
        logger.error('Failed to fetch customer active contracts', { customerId, error });
        return 0;
      }

      return count || 0;

    } catch (error) {
      logger.error('Exception fetching customer active contracts', { customerId, error });
      return 0;
    }
  }

  /**
   * Calculate payment statistics
   */
  private calculatePaymentStatistics(
    payments: CustomerDetails['paymentHistory']
  ): {
    totalPayments: number;
    totalAmount: number;
    averageAmount: number;
    highestAmount: number;
    lowestAmount: number;
    lastPaymentDate?: string;
    daysSinceLastPayment?: number;
    onTimeRate: number;
    averageDaysLate: number;
    frequency: number;
  } {
    if (payments.length === 0) {
      return {
        totalPayments: 0,
        totalAmount: 0,
        averageAmount: 0,
        highestAmount: 0,
        lowestAmount: 0,
        onTimeRate: 0,
        averageDaysLate: 0,
        frequency: 0
      };
    }

    const amounts = payments.map(p => p.amount);
    const totalAmount = amounts.reduce((sum, a) => sum + a, 0);
    const averageAmount = totalAmount / amounts.length;
    const highestAmount = Math.max(...amounts);
    const lowestAmount = Math.min(...amounts);

    const lastPaymentDate = payments[0]?.paymentDate;
    const daysSinceLastPayment = lastPaymentDate
      ? Math.floor((Date.now() - new Date(lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // On-time rate (payments not late)
    const onTimePayments = payments.filter(p => (p.daysLate || 0) === 0 || p.daysLate <= 1);
    const onTimeRate = (onTimePayments.length / payments.length) * 100;

    // Average days late (only late payments)
    const latePayments = payments.filter(p => p.daysLate && p.daysLate > 1);
    const averageDaysLate = latePayments.length > 0
      ? latePayments.reduce((sum, p) => sum + p.daysLate, 0) / latePayments.length
      : 0;

    // Payment frequency (payments in last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recentPayments = payments.filter(p => 
      new Date(p.payment_date) >= ninetyDaysAgo
    );
    
    const frequency = recentPayments.length > 0 
      ? Math.round(recentPayments.length / 3) // Average quarterly
      : 0;

    return {
      totalPayments: payments.length,
      totalAmount,
      averageAmount,
      highestAmount,
      lowestAmount,
      lastPaymentDate,
      daysSinceLastPayment,
      onTimeRate,
      averageDaysLate,
      frequency
    };
  }

  /**
   * Calculate contract statistics
   */
  private calculateContractStatistics(
    details: CustomerDetails
  ): {
    overdueCount: number;
    overdueAmount: number;
  } {
    // This would require fetching contract details
    // For now, just return placeholder
    return {
      overdueCount: details.overdueContracts || 0,
      overdueAmount: 0
    };
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(
    paymentStats: ReturnType<typeof CustomerDetailsService.prototype.calculatePaymentStatistics>,
    totalPayments: number
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // On-time rate impact (higher is better)
    riskScore += (paymentStats.onTimeRate / 100) * 40; // 40 points max

    // Average days late impact (lower is better)
    if (paymentStats.averageDaysLate > 0) {
      riskScore -= Math.min(paymentStats.averageDaysLate, 10) * 3; // Up to 30 points penalty
    } else {
      riskScore += 10; // No late payments bonus
    }

    // Payment frequency impact (higher is better)
    if (paymentStats.frequency >= 4) {
      riskScore -= 10;
    } else if (paymentStats.frequency <= 1) {
      riskScore += 10;
    }

    // Determine risk level
    if (riskScore >= 60) {
      return 'high';
    } else if (riskScore >= 30) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get customer payment summary
   * Comprehensive payment summary for dashboard
   */
  async getCustomerPaymentSummary(
    customerId: string,
    options?: {
      recentPaymentsCount?: number;
      includeContractDetails?: boolean;
    }
  ): Promise<CustomerPaymentSummary> {
    try {
      logger.info('Generating customer payment summary', { customerId, options });

      // Get customer details
      const details = await this.getCustomerDetails(customerId, {
        includePaymentHistory: true,
        includeActiveContracts: true,
        forceRefresh: false
      });

      // Get recent payments
      const recentPaymentsCount = options?.recentPaymentsCount || 10;
      const recentPayments = details.paymentHistory.slice(0, recentPaymentsCount);

      // Calculate payment statistics
      const paymentStats = this.calculatePaymentStatistics(details.paymentHistory);

      // Build summary
      const summary: CustomerPaymentSummary = {
        customerId,
        customerName: details.customerName,
        customerNameAr: details.customerNameAr,
        phone: details.phone,
        
        // Payment metrics
        totalPayments: paymentStats.totalPayments,
        totalPaid: paymentStats.totalAmount,
        totalOutstanding: 0, // Would need invoice calculations
        averagePayment: paymentStats.averageAmount,
        highestPayment: paymentStats.highestAmount,
        lowestPayment: paymentStats.lowestAmount,
        
        // Recent payments
        recentPayments: recentPayments,
        
        // Overdue status
        overdueContracts: details.overdueContracts,
        overdueAmount: details.overdueAmount,
        
        calculatedAt: new Date().toISOString()
      };

      logger.info('Customer payment summary generated', {
        customerId,
        totalPayments: summary.totalPayments,
        totalPaid: summary.totalPaid
      });

      return summary;

    } catch (error) {
      logger.error('Exception generating customer payment summary', {
        customerId,
        error
      });
      throw error;
    }
  }

  /**
   * Batch get customer details
   * Efficiently fetch details for multiple customers
   */
  async getBatchCustomerDetails(
    customerIds: string[],
    options?: {
      includePaymentHistory?: boolean;
    }
  ): Promise<Map<string, CustomerDetails>> {
    try {
      logger.info('Fetching batch customer details', {
        customerIds: customerIds.length,
        options
      });

      const detailsMap: Map<string, CustomerDetails> = new Map();

      // Process in parallel batches
      const batchSize = 20;
      for (let i = 0; i < customerIds.length; i += batchSize) {
        const batch = customerIds.slice(i, i + batchSize);
        
        const promises = batch.map(customerId =>
          this.getCustomerDetails(customerId, options)
        );

        const results = await Promise.all(promises);

        results.forEach(details => {
          if (details) {
            detailsMap.set(details.id, details);
          }
        });
      }

      logger.info('Batch customer details fetched', {
        totalRequested: customerIds.length,
        successfullyFetched: detailsMap.size
      });

      return detailsMap;

    } catch (error) {
      logger.error('Exception fetching batch customer details', {
        customerIds,
        error
      });
      throw error;
    }
  }

  /**
   * Clear cache for specific customer
   */
  async clearCustomerCache(customerId: string): Promise<void> {
    this.cache.delete(customerId);
    logger.debug('Customer cache cleared', { customerId });
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    const cacheSize = this.cache.size;
    this.cache.clear();
    logger.info('All customer caches cleared', { cacheSize });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const customerDetailsService = new CustomerDetailsService();
