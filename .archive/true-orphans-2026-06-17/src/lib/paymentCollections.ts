/**
 * Payment Collections Service
 * 
 * Comprehensive payment tracking, customer scoring, and collections management
 */

import { supabase } from '@/integrations/supabase/client';
import { addDays, differenceInDays, format, isWeekend, parseISO } from 'date-fns';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type PaymentScoreCategory = 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type PromiseStatus = 'pending' | 'kept' | 'broken' | 'partially_kept';
export type ReminderStage = 'initial' | 'first_reminder' | 'second_reminder' | 'final_notice' | 'legal_notice';

export interface PaymentScore {
  score: number; // 0-100
  category: PaymentScoreCategory;
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
  breakdown: {
    latePayments: number;
    brokenPromises: number;
    disputes: number;
    failedPayments: number;
    earlyPayments: number;
    bonuses: number;
  };
}

export interface CustomerPaymentBehavior {
  customerId: string;
  averageDaysToPay: number;
  preferredPaymentMethod: string;
  bestDayToContact: string;
  bestTimeToContact: string;
  responseRate: number; // 0-100
  promiseKeepingRate: number; // 0-100
  onTimePaymentRate: number; // 0-100
}

export interface PaymentPromise {
  id: string;
  customerId: string;
  invoiceId: string;
  promiseDate: string;
  promisedAmount: number;
  actualPaidAmount?: number;
  actualPaidDate?: string;
  status: PromiseStatus;
  notes: string;
  contactMethod: string;
  createdBy: string;
  createdAt: string;
}

export interface PaymentPlan {
  id: string;
  customerId: string;
  invoiceId: string;
  totalAmount: number;
  numberOfPayments: number;
  frequency: 'weekly' | 'bi-weekly' | 'monthly';
  installments: PaymentInstallment[];
  status: 'active' | 'completed' | 'defaulted';
  createdAt: string;
}

export interface PaymentInstallment {
  id: string;
  paymentPlanId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount?: number;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue' | 'missed';
}

export interface RiskIndicator {
  type: 'red_flag' | 'warning' | 'positive';
  message: string;
  severity: RiskLevel;
  date: string;
}

export interface CollectionsSummary {
  totalOverdue: number;
  overdueCustomersCount: number;
  averageDaysOverdue: number;
  collectionSuccessRate: number;
  trend: 'improving' | 'stable' | 'worsening';
}

export interface PaymentHealthScore {
  score: number; // 0-100
  category: 'healthy' | 'warning' | 'critical';
  breakdown: {
    onTime: number;
    late: number;
    veryLate: number;
    defaulted: number;
  };
}

export interface PriorityCustomer {
  customerId: string;
  customerName: string;
  totalOverdue: number;
  daysOverdue: number;
  riskScore: number;
  paymentScore: number;
  priority: number; // Calculated priority score
}

// ============================================================================
// PAYMENT SCORE CALCULATION
// ============================================================================

/**
 * Calculate customer payment score (0-100)
 * Based on payment history and behavior
 */
export async function calculatePaymentScore(
  customerId: string,
  companyId: string
): Promise<PaymentScore> {
  let score = 100;
  const breakdown = {
    latePayments: 0,
    brokenPromises: 0,
    disputes: 0,
    failedPayments: 0,
    earlyPayments: 0,
    bonuses: 0
  };

  try {
    // Get payment history (last 12 months)
    const twelveMonthsAgo = addDays(new Date(), -365);
    
    const { data: payments } = await supabase
      .from('payments')
      .select('*, invoices!inner(*)')
      .eq('invoices.company_id', companyId)
      .eq('invoices.customer_id', customerId)
      .gte('payment_date', format(twelveMonthsAgo, 'yyyy-MM-dd'));

    // Calculate late payment deductions
    if (payments) {
      for (const payment of payments) {
        const invoice = payment.invoices;
        if (!invoice?.due_date || !payment.payment_date) continue;

        const daysLate = differenceInDays(
          parseISO(payment.payment_date),
          parseISO(invoice.due_date)
        );

        if (daysLate > 0 && daysLate <= 7) {
          score -= 5;
          breakdown.latePayments -= 5;
        } else if (daysLate > 7 && daysLate <= 15) {
          score -= 10;
          breakdown.latePayments -= 10;
        } else if (daysLate > 15 && daysLate <= 30) {
          score -= 20;
          breakdown.latePayments -= 20;
        } else if (daysLate > 30) {
          score -= 40;
          breakdown.latePayments -= 40;
        } else if (daysLate < 0) {
          // Early payment bonus
          score += 5;
          breakdown.earlyPayments += 5;
        }
      }
    }

    // Check for broken promises
    const { data: promises } = await supabase
      .from('payment_promises')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'broken')
      .gte('created_at', format(twelveMonthsAgo, 'yyyy-MM-dd'));

    if (promises) {
      const brokenPromisesCount = promises.length;
      score -= brokenPromisesCount * 15;
      breakdown.brokenPromises = brokenPromisesCount * -15;
    }

    // Check for disputed invoices
    const { data: disputes } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', customerId)
      .eq('company_id', companyId)
      .eq('status', 'disputed')
      .gte('created_at', format(twelveMonthsAgo, 'yyyy-MM-dd'));

    if (disputes) {
      const disputeCount = disputes.length;
      score -= disputeCount * 10;
      breakdown.disputes = disputeCount * -10;
    }

    // Check for failed payments
    const { data: failedPayments } = await supabase
      .from('payment_attempts')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'failed')
      .gte('created_at', format(twelveMonthsAgo, 'yyyy-MM-dd'));

    if (failedPayments) {
      const failedCount = failedPayments.length;
      score -= failedCount * 25;
      breakdown.failedPayments = failedCount * -25;
    }

    // Bonuses
    // Check for auto-pay enrollment
    const { data: customer } = await supabase
      .from('customers')
      .select('auto_pay_enabled')
      .eq('id', customerId)
      .single();

    if (customer?.auto_pay_enabled) {
      score += 10;
      breakdown.bonuses += 10;
    }

    // Check for perfect payment history (12+ months)
    if (payments && payments.length >= 12) {
      const allOnTime = payments.every(p => {
        if (!p.invoices?.due_date || !p.payment_date) return false;
        return differenceInDays(
          parseISO(p.payment_date),
          parseISO(p.invoices.due_date)
        ) <= 0;
      });

      if (allOnTime) {
        score += 20;
        breakdown.bonuses += 20;
      }
    }

    // Ensure score is within 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine category
    let category: PaymentScoreCategory;
    if (score >= 90) category = 'excellent';
    else if (score >= 70) category = 'good';
    else if (score >= 50) category = 'fair';
    else if (score >= 30) category = 'poor';
    else category = 'very_poor';

    // Determine trend (compare with score from 30 days ago)
    // This would require historical score tracking
    const trend = 'stable'; // Simplified for now

    return {
      score,
      category,
      trend,
      lastUpdated: new Date().toISOString(),
      breakdown
    };
  } catch (error) {
    console.error('Error calculating payment score:', error);
    throw error;
  }
}

// ============================================================================
// COLLECTIONS SUMMARY
// ============================================================================

/**
 * Get collections command center summary
 */
export async function getCollectionsSummary(
  companyId: string
): Promise<CollectionsSummary> {
  try {
    const today = new Date();
    
    // Get all overdue invoices
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('*, customers(*)')
      .eq('company_id', companyId)
      .lt('due_date', format(today, 'yyyy-MM-dd'))
      .neq('status', 'paid')
      .neq('status', 'cancelled');

    const totalOverdue = overdueInvoices?.reduce(
      (sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)),
      0
    ) || 0;

    const overdueCustomersCount = new Set(
      overdueInvoices?.map(inv => inv.customer_id)
    ).size;

    const averageDaysOverdue = overdueInvoices?.length
      ? overdueInvoices.reduce((sum, inv) => {
          return sum + differenceInDays(today, parseISO(inv.due_date));
        }, 0) / overdueInvoices.length
      : 0;

    // Calculate collection success rate (payments received this month / invoices due this month)
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const { data: dueThisMonth } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', companyId)
      .gte('due_date', format(firstDayOfMonth, 'yyyy-MM-dd'))
      .lte('due_date', format(today, 'yyyy-MM-dd'));

    const { data: paidThisMonth } = await supabase
      .from('payments')
      .select('*, invoices!inner(*)')
      .eq('invoices.company_id', companyId)
      .gte('payment_date', format(firstDayOfMonth, 'yyyy-MM-dd'))
      .lte('payment_date', format(today, 'yyyy-MM-dd'));

    const collectionSuccessRate = dueThisMonth?.length
      ? ((paidThisMonth?.length || 0) / dueThisMonth.length) * 100
      : 0;

    // Determine trend (simplified - would need historical data)
    const trend = collectionSuccessRate >= 80 ? 'improving' : 
                  collectionSuccessRate >= 60 ? 'stable' : 'worsening';

    return {
      totalOverdue,
      overdueCustomersCount,
      averageDaysOverdue: Math.round(averageDaysOverdue),
      collectionSuccessRate: Math.round(collectionSuccessRate),
      trend
    };
  } catch (error) {
    console.error('Error getting collections summary:', error);
    throw error;
  }
}

// ============================================================================
// PAYMENT HEALTH SCORE
// ============================================================================

/**
 * Calculate overall payment health score for company
 */
export async function getPaymentHealthScore(
  companyId: string
): Promise<PaymentHealthScore> {
  try {
    const today = new Date();
    const ninetyDaysAgo = addDays(today, -90);

    const { data: invoices } = await supabase
      .from('invoices')
      .select('*, payments(*)')
      .eq('company_id', companyId)
      .gte('due_date', format(ninetyDaysAgo, 'yyyy-MM-dd'));

    let onTime = 0;
    let late = 0; // 1-15 days
    let veryLate = 0; // 16-30 days
    let defaulted = 0; // 30+ days

    invoices?.forEach(invoice => {
      if (invoice.status === 'paid' && invoice.payments && invoice.payments.length > 0) {
        const payment = invoice.payments[0];
        const daysLate = differenceInDays(
          parseISO(payment.payment_date),
          parseISO(invoice.due_date)
        );

        if (daysLate <= 0) onTime++;
        else if (daysLate <= 15) late++;
        else if (daysLate <= 30) veryLate++;
        else defaulted++;
      } else if (invoice.due_date) {
        const daysOverdue = differenceInDays(today, parseISO(invoice.due_date));
        if (daysOverdue > 30) defaulted++;
        else if (daysOverdue > 15) veryLate++;
        else if (daysOverdue > 0) late++;
      }
    });

    const total = onTime + late + veryLate + defaulted;
    const score = total > 0 
      ? Math.round(((onTime * 100) + (late * 50) + (veryLate * 20)) / total)
      : 100;

    let category: 'healthy' | 'warning' | 'critical';
    if (score >= 80) category = 'healthy';
    else if (score >= 50) category = 'warning';
    else category = 'critical';

    return {
      score,
      category,
      breakdown: { onTime, late, veryLate, defaulted }
    };
  } catch (error) {
    console.error('Error calculating payment health score:', error);
    throw error;
  }
}

// ============================================================================
// PRIORITY COLLECTIONS QUEUE
// ============================================================================

/**
 * Get priority customers for collections (Top 10)
 */
export async function getPriorityCustomers(
  companyId: string
): Promise<PriorityCustomer[]> {
  try {
    const today = new Date();
    
    // Get all customers with overdue invoices
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('*, customers(*)')
      .eq('company_id', companyId)
      .lt('due_date', format(today, 'yyyy-MM-dd'))
      .neq('status', 'paid')
      .neq('status', 'cancelled');

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return [];
    }

    // Group by customer
    const customerMap = new Map<string, {
      customerId: string;
      customerName: string;
      totalOverdue: number;
      maxDaysOverdue: number;
      invoiceCount: number;
    }>();

    overdueInvoices.forEach(invoice => {
      const customerId = invoice.customer_id;
      const existing = customerMap.get(customerId);
      const daysOverdue = differenceInDays(today, parseISO(invoice.due_date));
      const amountOverdue = invoice.total_amount - (invoice.paid_amount || 0);

      if (existing) {
        existing.totalOverdue += amountOverdue;
        existing.maxDaysOverdue = Math.max(existing.maxDaysOverdue, daysOverdue);
        existing.invoiceCount++;
      } else {
        customerMap.set(customerId, {
          customerId,
          customerName: invoice.customers?.name || 'Unknown',
          totalOverdue: amountOverdue,
          maxDaysOverdue: daysOverdue,
          invoiceCount: 1
        });
      }
    });

    // Calculate priority scores and payment scores
    const priorities: PriorityCustomer[] = [];

    for (const customer of customerMap.values()) {
      // Get payment score
      const paymentScore = await calculatePaymentScore(customer.customerId, companyId);
      
      // Calculate risk score (0-100, higher = more risk)
      const riskScore = Math.min(100, 
        (customer.maxDaysOverdue / 90 * 40) + // Days factor (max 40 points)
        (customer.totalOverdue / 10000 * 30) + // Amount factor (max 30 points)
        ((100 - paymentScore.score) * 0.3) // Payment history factor (max 30 points)
      );

      // Calculate priority (weighted combination)
      const priority = 
        (customer.totalOverdue * 0.4) + // 40% weight on amount
        (customer.maxDaysOverdue * 100 * 0.3) + // 30% weight on days
        (riskScore * 10 * 0.3); // 30% weight on risk

      priorities.push({
        customerId: customer.customerId,
        customerName: customer.customerName,
        totalOverdue: customer.totalOverdue,
        daysOverdue: customer.maxDaysOverdue,
        riskScore: Math.round(riskScore),
        paymentScore: paymentScore.score,
        priority: Math.round(priority)
      });
    }

    // Sort by priority (descending) and return top 10
    return priorities
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);
  } catch (error) {
    console.error('Error getting priority customers:', error);
    throw error;
  }
}

// ============================================================================
// PAYMENT REMINDER AUTOMATION
// ============================================================================

/**
 * Determine which reminder stage an invoice needs
 */
export function determineReminderStage(daysOverdue: number): ReminderStage | null {
  if (daysOverdue < 0) return null; // Not due yet
  if (daysOverdue === 0 || daysOverdue === 1) return 'initial';
  if (daysOverdue >= 3 && daysOverdue <= 7) return 'first_reminder';
  if (daysOverdue >= 10 && daysOverdue <= 15) return 'second_reminder';
  if (daysOverdue >= 20 && daysOverdue <= 25) return 'final_notice';
  if (daysOverdue >= 30) return 'legal_notice';
  return null;
}

/**
 * Check if we should send reminder (respects timing rules)
 */
export function shouldSendReminder(
  reminderDate: Date,
  customerPreferences?: {
    doNotDisturb?: boolean;
    preferredTime?: string;
    timezone?: string;
  }
): boolean {
  // Don't send on weekends
  if (isWeekend(reminderDate)) return false;

  // Check do not disturb
  if (customerPreferences?.doNotDisturb) return false;

  // Check if it's within business hours (9 AM - 6 PM)
  const hour = reminderDate.getHours();
  if (hour < 9 || hour >= 18) return false;

  return true;
}

// ============================================================================
// CUSTOMER PAYMENT BEHAVIOR ANALYTICS
// ============================================================================

/**
 * Analyze customer payment behavior and patterns
 */
export async function analyzeCustomerPaymentBehavior(
  customerId: string,
  companyId: string
): Promise<CustomerPaymentBehavior> {
  try {
    // Get payment history
    const { data: payments } = await supabase
      .from('payments')
      .select('*, invoices!inner(*)')
      .eq('invoices.company_id', companyId)
      .eq('invoices.customer_id', customerId)
      .order('payment_date', { ascending: false })
      .limit(50);

    if (!payments || payments.length === 0) {
      return {
        customerId,
        averageDaysToPay: 0,
        preferredPaymentMethod: 'unknown',
        bestDayToContact: 'Monday',
        bestTimeToContact: '10:00 AM',
        responseRate: 0,
        promiseKeepingRate: 0,
        onTimePaymentRate: 0
      };
    }

    // Calculate average days to pay
    const daysToPay = payments
      .filter(p => p.invoices?.due_date && p.payment_date)
      .map(p => differenceInDays(
        parseISO(p.payment_date),
        parseISO(p.invoices.due_date)
      ));

    const averageDaysToPay = daysToPay.length
      ? Math.round(daysToPay.reduce((a, b) => a + b, 0) / daysToPay.length)
      : 0;

    // Determine preferred payment method
    const methodCounts = new Map<string, number>();
    payments.forEach(p => {
      const method = p.payment_method || 'unknown';
      methodCounts.set(method, (methodCounts.get(method) || 0) + 1);
    });
    const preferredPaymentMethod = Array.from(methodCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

    // Calculate on-time payment rate
    const onTimePayments = daysToPay.filter(days => days <= 0).length;
    const onTimePaymentRate = Math.round((onTimePayments / daysToPay.length) * 100);

    // Get response and promise keeping rates (would need additional tables)
    // Simplified for now
    const responseRate = 70;
    const promiseKeepingRate = 60;

    return {
      customerId,
      averageDaysToPay,
      preferredPaymentMethod,
      bestDayToContact: 'Thursday', // Would analyze actual response data
      bestTimeToContact: '10:00 AM', // Would analyze actual response data
      responseRate,
      promiseKeepingRate,
      onTimePaymentRate
    };
  } catch (error) {
    console.error('Error analyzing customer payment behavior:', error);
    throw error;
  }
}

// ============================================================================
// RISK INDICATORS
// ============================================================================

/**
 * Get risk indicators for a customer
 */
export async function getCustomerRiskIndicators(
  customerId: string,
  companyId: string
): Promise<RiskIndicator[]> {
  const indicators: RiskIndicator[] = [];
  const today = new Date();

  try {
    // Check for multiple overdue invoices
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', customerId)
      .eq('company_id', companyId)
      .lt('due_date', format(today, 'yyyy-MM-dd'))
      .neq('status', 'paid');

    if (overdueInvoices && overdueInvoices.length >= 3) {
      indicators.push({
        type: 'red_flag',
        message: `Currently has ${overdueInvoices.length} overdue invoices`,
        severity: 'high',
        date: new Date().toISOString()
      });
    }

    // Check for broken promises
    const { data: brokenPromises } = await supabase
      .from('payment_promises')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'broken')
      .order('created_at', { ascending: false })
      .limit(5);

    if (brokenPromises && brokenPromises.length >= 2) {
      indicators.push({
        type: 'red_flag',
        message: `Broke last ${brokenPromises.length} payment promises`,
        severity: 'critical',
        date: new Date().toISOString()
      });
    }

    // Check payment score trend
    const paymentScore = await calculatePaymentScore(customerId, companyId);
    if (paymentScore.trend === 'declining') {
      indicators.push({
        type: 'warning',
        message: `Payment score dropped (trend worsening)`,
        severity: 'medium',
        date: new Date().toISOString()
      });
    }

    // Positive signals
    if (paymentScore.score >= 90) {
      indicators.push({
        type: 'positive',
        message: `Excellent payment score (${paymentScore.score}/100)`,
        severity: 'low',
        date: new Date().toISOString()
      });
    }

    return indicators;
  } catch (error) {
    console.error('Error getting risk indicators:', error);
    return [];
  }
}

export default {
  calculatePaymentScore,
  getCollectionsSummary,
  getPaymentHealthScore,
  getPriorityCustomers,
  determineReminderStage,
  shouldSendReminder,
  analyzeCustomerPaymentBehavior,
  getCustomerRiskIndicators
};
