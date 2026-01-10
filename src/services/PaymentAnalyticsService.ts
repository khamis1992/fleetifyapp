/**
 * Payment Analytics Service
 * 
 * Service for payment analytics and reporting:
 * - KPIs and metrics
 * - Cash flow predictions
 * - Trend analysis
 * - Customer payment behavior analysis
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Payment KPIs
 * Key Performance Indicators for payments
 */
export interface PaymentKPIs {
  // Volume metrics
  totalPayments: number;
  totalAmount: number;
  averagePaymentAmount: number;
  medianPaymentAmount: number;
  
  // Status metrics
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  completedRate: number; // Percentage
  
  // Timeliness metrics
  onTimePayments: number;
  latePayments: number;
  onTimeRate: number; // Percentage
  averageDaysLate: number;
  
  // Method distribution
  paymentByMethod: Record<string, number>; // method -> count
  paymentByType: Record<string, number>;   // type -> count
  
  // Revenue metrics
  totalIncome: number;
  totalLateFees: number;
  netRevenue: number;
  
  // Customer metrics
  uniqueCustomers: number;
  topPayingCustomers: Array<{
    customerId: string;
    customerName: string;
    totalAmount: number;
    paymentCount: number;
  }>;
  
  // Trends
  dailyAverage: number;
  weeklyTrend: Array<{
    week: string;
    amount: number;
    count: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
}

/**
 * Cash Flow Prediction
 * Predicted cash flow for future periods
 */
export interface CashFlowPrediction {
  period: string; // Day, week, or month
  startDate: string;
  endDate: string;
  
  // Predictions
  expectedPayments: number;
  expectedAmount: number;
  expectedIncome: number;
  expectedExpenses: number;
  netCashFlow: number;
  
  // Confidence
  confidence: number; // 0-100, higher is more confident
  factors: Array<{
    factor: string;
    impact: string;
    weight: number; // Contribution to prediction
  }>;
  
  // Comparison
  samePeriodLastYear?: {
    amount: number;
    count: number;
    changePercent: number;
  };
  
  calculatedAt: string;
}

/**
 * Payment Trend
 * Historical payment trends
 */
export interface PaymentTrend {
  period: string; // Day, week, month, quarter, year
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  
  // Volume
  paymentCount: number;
  totalAmount: number;
  averageAmount: number;
  
  // Breakdown
  byMethod: Record<string, number>;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  
  // Comparison
  previousPeriod?: {
    paymentCount: number;
    totalAmount: number;
    changePercent: number;
  };
  
  startDate: string;
  endDate: string;
}

/**
 * Customer Payment Behavior
 * Analysis of customer payment patterns
 */
export interface CustomerPaymentBehavior {
  customerId: string;
  customerName: string;
  
  // Payment patterns
  totalPayments: number;
  totalAmount: number;
  averagePaymentAmount: number;
  paymentFrequency: number; // Payments per month
  
  // Timeliness
  onTimePayments: number;
  latePayments: number;
  onTimeRate: number;
  averageDaysLate: number;
  maxDaysLate: number;
  
  // Preferred methods
  preferredPaymentMethod: string;
  paymentMethodDistribution: Record<string, number>;
  
  // Risk assessment
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number; // 0-100, higher is riskier
  
  // Account activity
  lastPaymentDate: string;
  daysSinceLastPayment: number;
  
  calculatedAt: string;
}

/**
 * Analytics Query Options
 * Configuration for analytics queries
 */
export interface AnalyticsQueryOptions {
  companyId: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: string[];
  paymentMethod?: string[];
  includeLateFees?: boolean;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  customerIds?: string[]; // Filter by specific customers
}

/**
 * Payment Analytics Service
 * Main service class
 */
export class PaymentAnalyticsService {
  
  /**
   * Get payment KPIs
   * Calculates key performance indicators for payments
   */
  async getPaymentKPIs(
    options: AnalyticsQueryOptions
  ): Promise<PaymentKPIs> {
    try {
      logger.info('Calculating payment KPIs', {
        companyId: options.companyId,
        startDate: options.startDate,
        endDate: options.endDate
      });

      // Build query
      let query = supabase
        .from('payments')
        .select(`
          *,
          customers!payments_customer_id_fkey (
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar
          )
        `)
        .eq('company_id', options.companyId);

      // Apply date filters
      if (options.startDate) {
        query = query.gte('payment_date', options.startDate);
      }

      if (options.endDate) {
        query = query.lte('payment_date', options.endDate);
      }

      // Apply status filter
      if (options.paymentStatus && options.paymentStatus.length > 0) {
        query = query.in('payment_status', options.paymentStatus);
      }

      // Apply method filter
      if (options.paymentMethod && options.paymentMethod.length > 0) {
        query = query.in('payment_method', options.paymentMethod);
      }

      // Execute query
      const { data: payments, error } = await query;

      if (error) {
        logger.error('Failed to fetch payments for KPIs', {
          companyId: options.companyId,
          error
        });
        throw error;
      }

      if (!payments || payments.length === 0) {
        return this.getEmptyKPIs(options.companyId);
      }

      // Calculate KPIs
      const totalPayments = payments.length;
      const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const averagePaymentAmount = totalAmount / totalPayments;
      
      // Calculate median
      const sortedAmounts = payments.map(p => p.amount || 0).sort((a, b) => a - b);
      const medianPaymentAmount = sortedAmounts.length % 2 === 0
        ? sortedAmounts[Math.floor(sortedAmounts.length / 2)]
        : (sortedAmounts[sortedAmounts.length / 2 - 1] + sortedAmounts[sortedAmounts.length / 2]) / 2;

      // Status breakdown
      const completedPayments = payments.filter(p => p.payment_status === 'completed').length;
      const pendingPayments = payments.filter(p => p.payment_status === 'pending').length;
      const failedPayments = payments.filter(p => p.payment_status === 'failed').length;
      const completedRate = totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0;

      // Timeliness metrics
      const onTimePayments = payments.filter(p => 
        p.payment_status === 'completed' && 
        p.days_overdue === 0
      ).length;
      
      const latePayments = payments.filter(p => 
        p.payment_status === 'completed' && 
        p.days_overdue > 0
      ).length;

      const onTimeRate = completedPayments > 0 ? (onTimePayments / completedPayments) * 100 : 0;
      
      const latePaymentsData = payments.filter(p => p.days_overdue && p.days_overdue > 0);
      const averageDaysLate = latePaymentsData.length > 0
        ? latePaymentsData.reduce((sum, p) => sum + (p.days_overdue || 0), 0) / latePaymentsData.length
        : 0;

      // Method distribution
      const paymentByMethod: Record<string, number> = {};
      payments.forEach(p => {
        const method = p.payment_method || 'unknown';
        paymentByMethod[method] = (paymentByMethod[method] || 0) + 1;
      });

      // Type distribution
      const paymentByType: Record<string, number> = {};
      payments.forEach(p => {
        const type = p.payment_type || 'unknown';
        paymentByType[type] = (paymentByType[type] || 0) + 1;
      });

      // Revenue metrics
      const totalLateFees = payments.reduce((sum, p) => sum + (p.late_fine_amount || 0), 0);
      const netRevenue = totalAmount - totalLateFees;
      const totalIncome = payments
        .filter(p => p.transaction_type === 'income')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // Customer metrics
      const uniqueCustomers = new Set(payments.map(p => p.customer_id)).size;
      
      const customerTotals: Map<string, { count: number; total: number }> = new Map();
      payments.forEach(p => {
        const customer = p.customer_id;
        const current = customerTotals.get(customer) || { count: 0, total: 0 };
        current.count += 1;
        current.total += (p.amount || 0);
        customerTotals.set(customer, current);
      });

      const topPayingCustomers = Array.from(customerTotals.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10) // Top 10 customers
        .map(([customerId, data]) => ({
          customerId,
          customerName: payments.find(p => p.customer_id === customerId)?.customers?.company_name_ar || 
                     payments.find(p => p.customer_id === customerId)?.customers?.company_name || 'Unknown',
          totalAmount: data.total,
          paymentCount: data.count
        }));

      // Daily average
      const daysRange = this.getDateRange(options.startDate, options.endDate);
      const dailyAverage = daysRange > 0 ? totalAmount / daysRange : 0;

      // Calculate trends
      const weeklyTrend = await this.calculateTrend(payments, 'weekly', options);
      const monthlyTrend = await this.calculateTrend(payments, 'monthly', options);

      const kpis: PaymentKPIs = {
        totalPayments,
        totalAmount,
        averagePaymentAmount,
        medianPaymentAmount,
        
        completedPayments,
        pendingPayments,
        failedPayments,
        completedRate,
        
        onTimePayments,
        latePayments,
        onTimeRate,
        averageDaysLate,
        
        paymentByMethod,
        paymentByType,
        
        totalIncome,
        totalLateFees,
        netRevenue,
        
        uniqueCustomers,
        topPayingCustomers,
        
        dailyAverage,
        weeklyTrend,
        monthlyTrend
      };

      logger.info('Payment KPIs calculated', {
        companyId: options.companyId,
        totalPayments,
        totalAmount,
        completedRate: completedRate.toFixed(2) + '%'
      });

      return kpis;

    } catch (error) {
      logger.error('Exception calculating payment KPIs', {
        companyId: options.companyId,
        error
      });
      throw error;
    }
  }

  /**
   * Get cash flow prediction
   * Predicts cash flow for next 30 days
   */
  async getCashFlowPrediction(
    options: AnalyticsQueryOptions & {
      predictionDays?: number;
    } = {}
  ): Promise<CashFlowPrediction[]> {
    try {
      const predictionDays = options.predictionDays || 30;
      
      logger.info('Generating cash flow prediction', {
        companyId: options.companyId,
        predictionDays
      });

      // Get historical payments for the last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: historicalPayments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('company_id', options.companyId)
        .gte('payment_date', ninetyDaysAgo.toISOString())
        .eq('payment_status', 'completed')
        .order('payment_date', { ascending: true });

      if (error) {
        logger.error('Failed to fetch historical payments', {
          companyId: options.companyId,
          error
        });
        throw error;
      }

      if (!historicalPayments || historicalPayments.length === 0) {
        // Return empty prediction if no historical data
        return [];
      }

      // Analyze payment patterns
      const dailyAverage = historicalPayments.length / 90;
      const averagePaymentAmount = historicalPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / historicalPayments.length;
      
      // Calculate day-of-week distribution
      const dayOfWeekTotals: Record<number, { count: number; amount: number }> = {};
      historicalPayments.forEach(p => {
        const dayOfWeek = new Date(p.payment_date).getDay();
        const current = dayOfWeekTotals[dayOfWeek] || { count: 0, amount: 0 };
        current.count += 1;
        current.amount += (p.amount || 0);
        dayOfWeekTotals[dayOfWeek] = current;
      });

      // Calculate day-of-month distribution
      const dayOfMonthTotals: Record<number, { count: number; amount: number }> = {};
      historicalPayments.forEach(p => {
        const dayOfMonth = new Date(p.payment_date).getDate();
        const current = dayOfMonthTotals[dayOfMonth] || { count: 0, amount: 0 };
        current.count += 1;
        current.amount += (p.amount || 0);
        dayOfMonthTotals[dayOfMonth] = current;
      });

      // Generate predictions
      const predictions: CashFlowPrediction[] = [];
      const startDate = new Date();
      
      for (let i = 0; i < predictionDays; i++) {
        const predictionDate = new Date(startDate);
        predictionDate.setDate(startDate.getDate() + i);
        
        const dayOfWeek = predictionDate.getDay();
        const dayOfMonth = predictionDate.getDate();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Calculate expected payments based on patterns
        let expectedPayments = 0;
        let expectedIncome = 0;
        let confidence = 0;
        const factors: Array<{ factor: string; impact: string; weight: number }> = [];

        // Factor 1: Day of week pattern (weight: 30)
        const dayOfWeekAvg = dayOfWeekTotals[dayOfWeek];
        if (dayOfWeekAvg && dayOfWeekAvg.count > 0) {
          const weeklyPaymentRate = dayOfWeekAvg.amount / dayOfWeekAvg.count;
          expectedPayments = dailyAverage * (weeklyPaymentRate / (averagePaymentAmount || 1));
          expectedIncome = expectedPayments;
          confidence += 30;
          factors.push({
            factor: 'Day of week pattern',
            impact: dayOfWeekAvg.amount > averagePaymentAmount ? 'Higher payment day' : 'Lower payment day',
            weight: 30
          });
        }

        // Factor 2: Day of month pattern (weight: 20)
        const dayOfMonthAvg = dayOfMonthTotals[dayOfMonth];
        if (dayOfMonthAvg && dayOfMonthAvg.count > 0) {
          const monthlyPaymentRate = dayOfMonthAvg.amount / dayOfMonthAvg.count;
          const adjustedPayments = expectedPayments * (monthlyPaymentRate / (averagePaymentAmount || 1));
          expectedPayments = Math.max(0, (expectedPayments + adjustedPayments) / 2);
          expectedIncome = expectedPayments;
          confidence += 20;
          factors.push({
            factor: 'Day of month pattern',
            impact: 'Payday adjustment',
            weight: 20
          });
        }

        // Factor 3: Weekend adjustment (weight: 15)
        if (isWeekend) {
          expectedPayments *= 0.3; // 30% of normal weekend payments
          expectedIncome = expectedPayments;
          factors.push({
            factor: 'Weekend adjustment',
            impact: 'Reduced activity',
            weight: 15
          });
        }

        // Factor 4: Seasonal trend (weight: 25)
        const monthNumber = predictionDate.getMonth();
        const isSummer = monthNumber >= 5 && monthNumber <= 8;
        if (isSummer) {
          expectedPayments *= 0.7; // 30% lower in summer
          factors.push({
            factor: 'Seasonal trend',
            impact: 'Summer slowdown',
            weight: 25
          });
        }

        // Normalize confidence (0-100)
        const normalizedConfidence = Math.min(100, confidence / 45); // 45 is max possible (30+20+15-25=40)

        // Net cash flow (income - expenses, assuming minimal expenses)
        const netCashFlow = expectedIncome - (expectedIncome * 0.05); // 5% expenses

        // Compare with same period last year
        let samePeriodLastYear;
        if (i < 30) {
          const lastYearDate = new Date(predictionDate);
          lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
          
          const samePeriodPayments = historicalPayments.filter(p => {
            const paymentDate = new Date(p.payment_date);
            return paymentDate.getMonth() === lastYearDate.getMonth() &&
                   paymentDate.getDate() === lastYearDate.getDate();
          });

          if (samePeriodPayments.length > 0) {
            const lastYearAmount = samePeriodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            samePeriodLastYear = {
              amount: lastYearAmount,
              count: samePeriodPayments.length,
              changePercent: lastYearAmount > 0 ? ((expectedIncome - lastYearAmount) / lastYearAmount) * 100 : 0
            };
          }
        }

        predictions.push({
          period: predictionDate.toISOString().split('T')[0], // YYYY-MM-DD
          startDate: predictionDate.toISOString(),
          endDate: predictionDate.toISOString(),
          
          expectedPayments,
          expectedAmount: expectedIncome,
          expectedIncome,
          expectedExpenses: expectedIncome * 0.05,
          netCashFlow,
          
          confidence: normalizedConfidence,
          factors,
          
          samePeriodLastYear,
          
          calculatedAt: new Date().toISOString()
        });
      }

      logger.info('Cash flow prediction generated', {
        companyId: options.companyId,
        predictionDays,
        predictionsCount: predictions.length
      });

      return predictions;

    } catch (error) {
      logger.error('Exception generating cash flow prediction', {
        companyId: options.companyId,
        error
      });
      throw error;
    }
  }

  /**
   * Analyze customer payment behavior
   */
  async getCustomerPaymentBehavior(
    customerId: string,
    options?: {
      lookbackDays?: number;
    }
  ): Promise<CustomerPaymentBehavior> {
    try {
      const lookbackDays = options?.lookbackDays || 90;
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

      logger.info('Analyzing customer payment behavior', {
        customerId,
        lookbackDays
      });

      // Get customer payments
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          *,
          customers!payments_customer_id_fkey (
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar
          )
        `)
        .eq('customer_id', customerId)
        .gte('payment_date', lookbackDate.toISOString())
        .order('payment_date', { ascending: false });

      if (error) {
        logger.error('Failed to fetch customer payments', { customerId, error });
        throw error;
      }

      if (!payments || payments.length === 0) {
        throw new Error('No payment history found for customer');
      }

      // Calculate behavior metrics
      const totalPayments = payments.length;
      const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const averagePaymentAmount = totalAmount / totalPayments;
      
      // Payment frequency (payments per month)
      const oldestPayment = payments[payments.length - 1];
      const newestPayment = payments[0];
      const dateRangeMonths = this.getDateRange(oldestPayment.payment_date, newestPayment.payment_date) / 30;
      const paymentFrequency = totalPayments / Math.max(1, dateRangeMonths);

      // Timeliness
      const onTimePayments = payments.filter(p => p.days_overdue === 0).length;
      const latePayments = payments.filter(p => p.days_overdue > 0).length;
      const onTimeRate = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 0;

      const latePaymentsData = payments.filter(p => p.days_overdue && p.days_overdue > 0);
      const averageDaysLate = latePaymentsData.length > 0
        ? latePaymentsData.reduce((sum, p) => sum + (p.days_overdue || 0), 0) / latePaymentsData.length
        : 0;
      
      const maxDaysLate = latePaymentsData.length > 0
        ? Math.max(...latePaymentsData.map(p => p.days_overdue || 0))
        : 0;

      // Preferred payment method
      const paymentMethodDistribution: Record<string, number> = {};
      payments.forEach(p => {
        const method = p.payment_method || 'unknown';
        paymentMethodDistribution[method] = (paymentMethodDistribution[method] || 0) + 1;
      });

      const preferredPaymentMethod = Object.entries(paymentMethodDistribution)
        .sort((a, b) => b[1] - a[1])[0][0];

      // Risk assessment
      let riskScore = 0;
      if (onTimeRate < 50) {
        riskScore += 30; // Low on-time rate
      }
      if (averageDaysLate > 7) {
        riskScore += 20; // Frequently late
      }
      if (maxDaysLate > 14) {
        riskScore += 25; // Very late payments
      }
      if (paymentFrequency < 1) {
        riskScore += 25; // Low payment frequency
      }

      // Risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (riskScore >= 60) {
        riskLevel = 'high';
      } else if (riskScore >= 30) {
        riskLevel = 'medium';
      }

      // Last payment date
      const lastPaymentDate = newestPayment.payment_date;
      const daysSinceLastPayment = Math.floor(
        (new Date().getTime() - new Date(lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      const behavior: CustomerPaymentBehavior = {
        customerId,
        customerName: payments[0].customers?.company_name_ar || 
                     payments[0].customers?.company_name || 'Unknown',
        
        totalPayments,
        totalAmount,
        averagePaymentAmount,
        paymentFrequency,
        
        onTimePayments,
        latePayments,
        onTimeRate,
        averageDaysLate,
        maxDaysLate,
        
        preferredPaymentMethod,
        paymentMethodDistribution,
        
        riskLevel,
        riskScore,
        
        lastPaymentDate,
        daysSinceLastPayment,
        
        calculatedAt: new Date().toISOString()
      };

      logger.info('Customer payment behavior analyzed', {
        customerId,
        riskLevel,
        onTimeRate: onTimeRate.toFixed(2) + '%'
      });

      return behavior;

    } catch (error) {
      logger.error('Exception analyzing customer payment behavior', {
        customerId,
        error
      });
      throw error;
    }
  }

  /**
   * Calculate payment trend
   */
  async getPaymentTrend(
    options: AnalyticsQueryOptions
  ): Promise<PaymentTrend[]> {
    try {
      logger.info('Calculating payment trend', {
        companyId: options.companyId,
        groupBy: options.groupBy
      });

      let query = supabase
        .from('payments')
        .select(`
          payment_date,
          amount,
          payment_method,
          payment_type,
          payment_status
        `)
        .eq('company_id', options.companyId);

      // Apply date filters
      if (options.startDate) {
        query = query.gte('payment_date', options.startDate);
      }

      if (options.endDate) {
        query = query.lte('payment_date', options.endDate);
      }

      // Execute query
      const { data: payments, error } = await query;

      if (error) {
        logger.error('Failed to fetch payments for trend', {
          companyId: options.companyId,
          error
        });
        throw error;
      }

      if (!payments || payments.length === 0) {
        return [];
      }

      return await this.calculateTrend(payments, options.groupBy || 'month', options);

    } catch (error) {
      logger.error('Exception calculating payment trend', {
        companyId: options.companyId,
        error
      });
      throw error;
    }
  }

  /**
   * Calculate trend for given grouping
   */
  private async calculateTrend(
    payments: any[],
    groupBy: 'day' | 'week' | 'month' | 'quarter' | 'year',
    options: AnalyticsQueryOptions
  ): Promise<PaymentTrend[]> {
    const trends: Map<string, any[]> = new Map();

    // Group payments by period
    for (const payment of payments) {
      let period: string;
      const date = new Date(payment.payment_date);

      switch (groupBy) {
        case 'day':
          period = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          period = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          period = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'year':
          period = String(date.getFullYear());
          break;
      }

      const current = trends.get(period) || [];
      current.push(payment);
      trends.set(period, current);
    }

    // Calculate trend metrics for each period
    const sortedPeriods = Array.from(trends.keys()).sort();
    const result: PaymentTrend[] = [];

    for (let i = 0; i < sortedPeriods.length; i++) {
      const period = sortedPeriods[i];
      const periodPayments = trends.get(period);
      
      const paymentCount = periodPayments.length;
      const totalAmount = periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const averageAmount = paymentCount > 0 ? totalAmount / paymentCount : 0;

      // Method distribution
      const byMethod: Record<string, number> = {};
      periodPayments.forEach(p => {
        const method = p.payment_method || 'unknown';
        byMethod[method] = (byMethod[method] || 0) + 1;
      });

      // Type distribution
      const byType: Record<string, number> = {};
      periodPayments.forEach(p => {
        const type = p.payment_type || 'unknown';
        byType[type] = (byType[type] || 0) + 1;
      });

      // Status distribution
      const byStatus: Record<string, number> = {};
      periodPayments.forEach(p => {
        const status = p.payment_status || 'unknown';
        byStatus[status] = (byStatus[status] || 0) + 1;
      });

      // Previous period comparison
      let previousPeriod;
      if (i > 0) {
        const prevPeriodPayments = trends.get(sortedPeriods[i - 1]);
        const prevTotalAmount = prevPeriodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        previousPeriod = {
          paymentCount: prevPeriodPayments.length,
          totalAmount: prevTotalAmount,
          changePercent: prevTotalAmount > 0 
            ? ((totalAmount - prevTotalAmount) / prevTotalAmount) * 100 
            : 0
        };
      }

      // Get date range for period
      const dates = periodPayments.map(p => new Date(p.payment_date));
      const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

      result.push({
        period,
        periodType: groupBy,
        paymentCount,
        totalAmount,
        averageAmount,
        byMethod,
        byType,
        byStatus,
        previousPeriod,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
    }

    return result;
  }

  /**
   * Get date range in days
   */
  private getDateRange(startDate?: string, endDate?: string): number {
    if (!startDate || !endDate) {
      return 30; // Default 30 days
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get empty KPIs
   */
  private getEmptyKPIs(companyId: string): PaymentKPIs {
    return {
      totalPayments: 0,
      totalAmount: 0,
      averagePaymentAmount: 0,
      medianPaymentAmount: 0,
      
      completedPayments: 0,
      pendingPayments: 0,
      failedPayments: 0,
      completedRate: 0,
      
      onTimePayments: 0,
      latePayments: 0,
      onTimeRate: 0,
      averageDaysLate: 0,
      
      paymentByMethod: {},
      paymentByType: {},
      
      totalIncome: 0,
      totalLateFees: 0,
      netRevenue: 0,
      
      uniqueCustomers: 0,
      topPayingCustomers: [],
      
      dailyAverage: 0,
      weeklyTrend: [],
      monthlyTrend: []
    };
  }

  /**
   * Get payment analytics report
   * Generates a comprehensive report for a company
   */
  async getAnalyticsReport(
    companyId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      includeKPIs?: boolean;
      includeCashFlow?: boolean;
      includeCustomerBehavior?: boolean;
      customerIds?: string[];
    }
  ): Promise<{
    kpis?: PaymentKPIs;
    cashFlow?: CashFlowPrediction[];
    customerBehaviors?: CustomerPaymentBehavior[];
    trends?: PaymentTrend[];
    generatedAt: string;
  }> {
    try {
      logger.info('Generating analytics report', {
        companyId,
        options
      });

      const report: any = {
        generatedAt: new Date().toISOString()
      };

      // Generate KPIs
      if (options?.includeKPIs !== false) {
        report.kpis = await this.getPaymentKPIs({
          companyId,
          startDate: options?.startDate,
          endDate: options?.endDate,
          customerIds: options?.customerIds
        });
      }

      // Generate cash flow prediction
      if (options?.includeCashFlow) {
        report.cashFlow = await this.getCashFlowPrediction({
          companyId,
          startDate: options?.startDate,
          endDate: options?.endDate,
          customerIds: options?.customerIds
        });
      }

      // Generate customer behaviors
      if (options?.includeCustomerBehavior) {
        const customersToAnalyze = options?.customerIds?.length > 0
          ? options.customerIds
          : [];

        report.customerBehaviors = [];
        for (const customerId of customersToAnalyze) {
          try {
            const behavior = await this.getCustomerPaymentBehavior(customerId);
            report.customerBehaviors.push(behavior);
          } catch (error) {
            logger.warn('Failed to analyze customer behavior', { customerId, error });
          }
        }
      }

      // Generate trends
      if (options?.includeKPIs !== false) {
        report.trends = await this.getPaymentTrend({
          companyId,
          startDate: options?.startDate,
          endDate: options?.endDate,
          customerIds: options?.customerIds
        });
      }

      logger.info('Analytics report generated', {
        companyId,
        components: Object.keys(report).length
      });

      return report;

    } catch (error) {
      logger.error('Exception generating analytics report', {
        companyId,
        error
      });
      throw error;
    }
  }
}

// Export singleton instance
export const paymentAnalyticsService = new PaymentAnalyticsService();
