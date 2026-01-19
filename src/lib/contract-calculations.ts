/**
 * Enhanced Contract Calculations Module - Version 2.0
 *
 * Comprehensive financial calculations for fleet management contracts
 * including payment processing, fee calculations, revenue projections,
 * profitability analysis, and contract lifecycle financial management.
 *
 * Enhanced features:
 * - Mixed billing models (daily, weekly, monthly, yearly, custom)
 * - Tiered pricing structures
 * - Advanced discount calculations
 * - Multi-currency support
 * - Pro-rated calculations
 * - Revenue recognition
 * - Performance caching
 */

import { addDays, addMonths, differenceInDays, differenceInMonths, isLeapYear } from 'date-fns';

export type BillingFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type PricingModel = 'fixed' | 'tiered' | 'usage_based' | 'subscription';

export interface Contract {
  id: string;
  agreement_number: string;
  monthly_rate: number;
  start_date: string;
  end_date: string;
  currency: string;
  financial_terms: FinancialTerms;
  billing_frequency: BillingFrequency;
  pricing_model: PricingModel;
  tiered_pricing?: TieredPricingStructure;
  usage_based?: UsageBasedPricing;
  custom_billing?: CustomBillingConfiguration;
}

export interface TieredPricingStructure {
  tiers: Array<{
    min_units: number;
    max_units?: number;
    rate_per_unit: number;
    description?: string;
  }>;
  unit_type: 'days' | 'kilometers' | 'hours' | 'months';
}

export interface UsageBasedPricing {
  base_fee: number;
  variable_rate: number;
  usage_unit: 'kilometers' | 'hours' | 'days';
  included_usage?: number;
  billing_cycle: 'weekly' | 'monthly';
}

export interface CustomBillingConfiguration {
  billing_periods: Array<{
    start_date: string;
    end_date: string;
    amount: number;
    description?: string;
  }>;
  billing_calendar: 'calendar_month' | 'anniversary' | 'custom';
}

export interface FinancialTerms {
  deposit_amount: number;
  insurance_fees: number;
  service_fees: number;
  tax_rate: number;
  late_fee_rate: number;
  early_termination_rate: number;
  discount_rate?: number;
}

export interface MonthlyPaymentResult {
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  breakdown: {
    base_rate: number;
    insurance_fees: number;
    service_fees: number;
  };
}

export interface TotalRevenueResult {
  monthlyRevenue: number;
  totalRevenue: number;
  contractDurationMonths: number;
  projectedAnnualRevenue?: number;
}

export interface LateFeesResult {
  baseFee: number;
  dailyPenalty: number;
  totalLateFee: number;
  daysLate: number;
}

export interface EarlyTerminationResult {
  terminationFee: number;
  remainingMonths: number;
  forfeitedRevenue: number;
  penaltyRate: number;
}

export interface ProRatedRevenueResult {
  proRatedRevenue: number;
  daysInMonth: number;
  billingDays: number;
  dailyRate: number;
}

export interface OperationalCosts {
  vehicle_cost: number;
  insurance_cost: number;
  admin_cost: number;
  marketing_cost: number;
}

export interface ProfitabilityResult {
  monthlyRevenue: number;
  monthlyCosts: number;
  monthlyProfit: number;
  profitMargin: number;
  annualProfit: number;
  isProfitable: boolean;
}

export interface DiscountResult {
  originalAmount: number;
  discountRate: number;
  discountAmount: number;
  discountedAmount: number;
}

export interface EnhancedPaymentResult {
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  breakdown: PaymentBreakdown;
  billing_period: BillingPeriod;
  pro_rata_adjustment?: number;
  discounts_applied: DiscountResult[];
  fees_applied: Array<{
    type: string;
    amount: number;
    description: string;
  }>;
}

export interface PaymentBreakdown {
  base_rate: number;
  insurance_fees: number;
  service_fees: number;
  usage_fees?: number;
  tier_fees?: number;
  custom_fees?: number;
}

export interface BillingPeriod {
  start_date: string;
  end_date: string;
  days: number;
  billing_frequency: BillingFrequency;
}

export interface ContractSummary {
  agreementNumber: string;
  contractDuration: number;
  monthlyPayment: MonthlyPaymentResult;
  enhancedPayment?: EnhancedPaymentResult;
  totalRevenue: number;
  depositRequired: number;
  currency: string;
  profitability?: ProfitabilityResult;
  billing_frequency: BillingFrequency;
  pricing_model: PricingModel;
  terms: {
    paymentTerms: string;
    cancellationPolicy: string;
    lateFeePolicy: string;
  };
}

export interface CalculationCache {
  [key: string]: {
    result: any;
    timestamp: number;
    ttl: number;
  };
}

export interface CalculationMetrics {
  calculation_time_ms: number;
  cache_hit_rate: number;
  error_count: number;
  last_calculation: string;
}

// Enhanced Calculation Engine with Caching
const calculationCache: CalculationCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let calculationMetrics: CalculationMetrics = {
  calculation_time_ms: 0,
  cache_hit_rate: 0,
  error_count: 0,
  last_calculation: ''
};

/**
 * Enhanced contract calculation engine with mixed billing models
 */
export function calculateEnhancedPayment(
  contract: Contract,
  billingPeriod?: Partial<BillingPeriod>,
  usageData?: { [unit: string]: number },
  discounts?: Array<{ type: string; rate: number; description: string }>
): EnhancedPaymentResult {
  const startTime = Date.now();

  try {
    // Generate cache key
    const cacheKey = generateCacheKey(contract, billingPeriod, usageData, discounts);

    // Check cache
    const cached = getFromCache(cacheKey);
    if (cached) {
      calculationMetrics.cache_hit_rate = updateCacheHitRate(true);
      return cached;
    }

    // Validate contract
    validateContract(contract);

    // Calculate based on pricing model
    let baseAmount: number;
    let breakdown: PaymentBreakdown;

    switch (contract.pricing_model) {
      case 'tiered':
        const tieredResult = calculateTieredPricing(contract, usageData);
        baseAmount = tieredResult.baseAmount;
        breakdown = { ...tieredResult.breakdown, tier_fees: tieredResult.tierFees };
        break;

      case 'usage_based':
        const usageResult = calculateUsageBasedPricing(contract, usageData);
        baseAmount = usageResult.baseAmount;
        breakdown = { ...usageResult.breakdown, usage_fees: usageResult.usageFees };
        break;

      case 'custom':
        const customResult = calculateCustomBilling(contract, billingPeriod);
        baseAmount = customResult.baseAmount;
        breakdown = { ...customResult.breakdown, custom_fees: customResult.customFees };
        break;

      default: // 'fixed'
        baseAmount = calculateFixedRatePayment(contract, billingPeriod);
        breakdown = {
          base_rate: baseAmount,
          insurance_fees: contract.financial_terms.insurance_fees,
          service_fees: contract.financial_terms.service_fees
        };
    }

    // Add standard fees
    const subtotal = baseAmount + contract.financial_terms.insurance_fees + contract.financial_terms.service_fees;

    // Apply discounts
    const discountsApplied = discounts?.map(d => calculateDiscountAmount(subtotal, d.rate)) || [];
    const totalDiscounts = discountsApplied.reduce((sum, d) => sum + d.discountAmount, 0);
    const discountedSubtotal = Math.max(0, subtotal - totalDiscounts);

    // Calculate tax
    const tax = discountedSubtotal * contract.financial_terms.tax_rate;
    const total = discountedSubtotal + tax;

    const result: EnhancedPaymentResult = {
      subtotal,
      tax,
      total,
      currency: contract.currency,
      breakdown,
      billing_period: calculateBillingPeriod(contract, billingPeriod),
      pro_rata_adjustment: calculateProRataAdjustment(contract, billingPeriod),
      discounts_applied: discountsApplied,
      fees_applied: [
        { type: 'insurance', amount: contract.financial_terms.insurance_fees, description: 'Insurance fees' },
        { type: 'service', amount: contract.financial_terms.service_fees, description: 'Service fees' }
      ]
    };

    // Cache result
    setCache(cacheKey, result);

    // Update metrics
    calculationMetrics.calculation_time_ms = Date.now() - startTime;
    calculationMetrics.cache_hit_rate = updateCacheHitRate(false);
    calculationMetrics.last_calculation = new Date().toISOString();

    return result;

  } catch (error) {
    calculationMetrics.error_count++;
    console.error('Enhanced payment calculation error:', error);
    throw error;
  }
}

/**
 * Calculate payment for tiered pricing model
 */
function calculateTieredPricing(
  contract: Contract,
  usageData?: { [unit: string]: number }
): { baseAmount: number; breakdown: PaymentBreakdown; tierFees: number } {
  if (!contract.tiered_pricing) {
    throw new Error('Tiered pricing structure not defined');
  }

  const tiers = contract.tiered_pricing.tiers;
  const unitType = contract.tiered_pricing.unit_type;
  const usage = usageData?.[unitType] || 0;

  let tierFees = 0;
  for (const tier of tiers) {
    if (usage >= tier.min_units && (!tier.max_units || usage < tier.max_units)) {
      tierFees = usage * tier.rate_per_unit;
      break;
    }
  }

  return {
    baseAmount: tierFees,
    breakdown: {
      base_rate: 0,
      insurance_fees: contract.financial_terms.insurance_fees,
      service_fees: contract.financial_terms.service_fees,
      tier_fees: tierFees
    },
    tierFees
  };
}

/**
 * Calculate payment for usage-based pricing model
 */
function calculateUsageBasedPricing(
  contract: Contract,
  usageData?: { [unit: string]: number }
): { baseAmount: number; breakdown: PaymentBreakdown; usageFees: number } {
  if (!contract.usage_based) {
    throw new Error('Usage-based pricing not defined');
  }

  const { base_fee, variable_rate, usage_unit, included_usage = 0 } = contract.usage_based;
  const usage = usageData?.[usage_unit] || 0;

  const billableUsage = Math.max(0, usage - included_usage);
  const usageFees = base_fee + (billableUsage * variable_rate);

  return {
    baseAmount: usageFees,
    breakdown: {
      base_rate: base_fee,
      insurance_fees: contract.financial_terms.insurance_fees,
      service_fees: contract.financial_terms.service_fees,
      usage_fees: billableUsage * variable_rate
    },
    usageFees: billableUsage * variable_rate
  };
}

/**
 * Calculate payment for custom billing configuration
 */
function calculateCustomBilling(
  contract: Contract,
  billingPeriod?: Partial<BillingPeriod>
): { baseAmount: number; breakdown: PaymentBreakdown; customFees: number } {
  if (!contract.custom_billing) {
    throw new Error('Custom billing configuration not defined');
  }

  // For custom billing, use the predefined billing periods
  const today = new Date();
  const relevantPeriod = contract.custom_billing.billing_periods.find(period => {
    const start = new Date(period.start_date);
    const end = new Date(period.end_date);
    return today >= start && today <= end;
  });

  const customFees = relevantPeriod?.amount || contract.monthly_rate;

  return {
    baseAmount: customFees,
    breakdown: {
      base_rate: customFees,
      insurance_fees: contract.financial_terms.insurance_fees,
      service_fees: contract.financial_terms.service_fees,
      custom_fees: customFees
    },
    customFees
  };
}

/**
 * Calculate payment for fixed rate model
 */
function calculateFixedRatePayment(
  contract: Contract,
  billingPeriod?: Partial<BillingPeriod>
): number {
  switch (contract.billing_frequency) {
    case 'daily':
      return contract.monthly_rate / 30.44; // Average days in month
    case 'weekly':
      return contract.monthly_rate / 4.33; // Average weeks in month
    case 'monthly':
      return contract.monthly_rate;
    case 'yearly':
      return contract.monthly_rate * 12;
    default:
      return contract.monthly_rate;
  }
}

/**
 * Calculate billing period details
 */
function calculateBillingPeriod(
  contract: Contract,
  customPeriod?: Partial<BillingPeriod>
): BillingPeriod {
  if (customPeriod) {
    return {
      start_date: customPeriod.start_date || contract.start_date,
      end_date: customPeriod.end_date || contract.end_date,
      days: customPeriod.days || 0,
      billing_frequency: customPeriod.billing_frequency || contract.billing_frequency
    };
  }

  const start = new Date(contract.start_date);
  const end = new Date(contract.end_date);
  const days = differenceInDays(end, start);

  return {
    start_date: contract.start_date,
    end_date: contract.end_date,
    days: Math.max(1, days),
    billing_frequency: contract.billing_frequency
  };
}

/**
 * Calculate pro-rata adjustment for partial periods
 */
function calculateProRataAdjustment(
  contract: Contract,
  billingPeriod?: Partial<BillingPeriod>
): number | undefined {
  if (contract.billing_frequency === 'monthly' && billingPeriod?.days) {
    const dailyRate = contract.monthly_rate / 30.44;
    return billingPeriod.days * dailyRate - contract.monthly_rate;
  }
  return undefined;
}

/**
 * Generate cache key for calculations
 */
function generateCacheKey(
  contract: Contract,
  billingPeriod?: Partial<BillingPeriod>,
  usageData?: { [unit: string]: number },
  discounts?: Array<{ type: string; rate: number; description: string }>
): string {
  const key = {
    contract_id: contract.id,
    billing_frequency: contract.billing_frequency,
    pricing_model: contract.pricing_model,
    monthly_rate: contract.monthly_rate,
    billing_period: billingPeriod,
    usage: usageData,
    discounts: discounts,
    timestamp: Date.now()
  };

  return btoa(JSON.stringify(key));
}

/**
 * Get result from cache
 */
function getFromCache(key: string): any {
  const cached = calculationCache[key];
  if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
    return cached.result;
  }
  delete calculationCache[key];
  return null;
}

/**
 * Set result in cache
 */
function setCache(key: string, result: any): void {
  calculationCache[key] = {
    result,
    timestamp: Date.now(),
    ttl: CACHE_TTL
  };
}

/**
 * Update cache hit rate metric
 */
function updateCacheHitRate(hit: boolean): number {
  // Simple moving average for cache hit rate
  const currentRate = calculationMetrics.cache_hit_rate;
  return hit ? (currentRate * 0.9 + 0.1) : (currentRate * 0.9);
}

/**
 * Validate contract data
 */
function validateContract(contract: Contract): void {
  if (!contract.id) throw new Error('Contract ID is required');
  if (!contract.monthly_rate || contract.monthly_rate < 0) throw new Error('Invalid monthly rate');
  if (!contract.currency) throw new Error('Currency is required');
  if (!new Date(contract.start_date)) throw new Error('Invalid start date');
  if (!new Date(contract.end_date)) throw new Error('Invalid end date');
  if (new Date(contract.end_date) <= new Date(contract.start_date)) throw new Error('End date must be after start date');
}

/**
 * Get calculation metrics
 */
export function getCalculationMetrics(): CalculationMetrics {
  return { ...calculationMetrics };
}

/**
 * Clear calculation cache
 */
export function clearCalculationCache(): void {
  Object.keys(calculationCache).forEach(key => delete calculationCache[key]);
  calculationMetrics.cache_hit_rate = 0;
}

/**
 * Legacy monthly payment calculation for backward compatibility
 */
export function calculateMonthlyPayment(contract: Contract): MonthlyPaymentResult {
  if (!contract) {
    throw new Error('Contract data is required');
  }

  if (contract.monthly_rate < 0) {
    throw new Error('Monthly rate cannot be negative');
  }

  const { monthly_rate, financial_terms, currency } = contract;
  const { insurance_fees, service_fees, tax_rate } = financial_terms;

  const breakdown = {
    base_rate: monthly_rate,
    insurance_fees,
    service_fees,
  };

  const subtotal = monthly_rate + insurance_fees + service_fees;
  const tax = subtotal * tax_rate;
  const total = subtotal + tax;

  return {
    subtotal,
    tax,
    total,
    currency,
    breakdown,
  };
}

/**
 * Calculate total revenue for the entire contract duration
 */
export function calculateTotalRevenue(contract: Contract): TotalRevenueResult {
  if (!contract) {
    throw new Error('Contract data is required');
  }

  const startDate = new Date(contract.start_date);
  const endDate = new Date(contract.end_date);

  if (endDate < startDate) {
    throw new Error('End date must be after start date');
  }

  const monthlyPaymentResult = calculateMonthlyPayment(contract);
  const contractDurationMonths = Math.max(1, differenceInMonths(endDate, startDate) + 1);
  const totalRevenue = monthlyPaymentResult.total * contractDurationMonths;

  return {
    monthlyRevenue: monthlyPaymentResult.total,
    totalRevenue,
    contractDurationMonths,
  };
}

/**
 * Calculate late fees for overdue payments
 */
export function calculateLateFees(
  overdueAmount: number,
  daysLate: number,
  lateFeeRate: number
): LateFeesResult {
  if (daysLate < 0) {
    throw new Error('Days late cannot be negative');
  }

  if (daysLate === 0) {
    return {
      baseFee: 0,
      dailyPenalty: 0,
      totalLateFee: 0,
      daysLate: 0,
    };
  }

  const baseFee = overdueAmount * lateFeeRate;
  const dailyPenaltyRate = 0.01; // 1% of base fee per day
  const dailyPenalty = baseFee * dailyPenaltyRate;
  const totalLateFee = Math.min(
    baseFee + (dailyPenalty * daysLate),
    overdueAmount * 0.30 // Cap at 30% of overdue amount
  );

  return {
    baseFee,
    dailyPenalty,
    totalLateFee,
    daysLate,
  };
}

/**
 * Calculate early termination fees
 */
export function calculateEarlyTerminationFee(
  contract: Contract,
  monthsCompleted: number
): EarlyTerminationResult {
  const startDate = new Date(contract.start_date);
  const endDate = new Date(contract.end_date);
  const totalContractMonths = Math.max(1, differenceInMonths(endDate, startDate) + 1);
  const remainingMonths = Math.max(0, totalContractMonths - monthsCompleted);

  if (monthsCompleted >= totalContractMonths) {
    return {
      terminationFee: 0,
      remainingMonths: 0,
      forfeitedRevenue: 0,
      penaltyRate: contract.financial_terms.early_termination_rate,
    };
  }

  const monthlyPaymentResult = calculateMonthlyPayment(contract);
  const terminationFee = remainingMonths * contract.monthly_rate * contract.financial_terms.early_termination_rate;
  const forfeitedRevenue = remainingMonths * monthlyPaymentResult.total;

  return {
    terminationFee,
    remainingMonths,
    forfeitedRevenue,
    penaltyRate: contract.financial_terms.early_termination_rate,
  };
}

/**
 * Calculate pro-rated revenue for partial month
 */
export function calculateProRatedRevenue(contract: Contract, billingDays: number): ProRatedRevenueResult {
  if (billingDays < 0) {
    throw new Error('Days cannot be negative');
  }

  const startDate = new Date(contract.start_date);
  const month = startDate.getMonth();
  const year = startDate.getFullYear();

  const daysInMonth = new Date(year, month + 1, 0).getDate(); // Get last day of the month

  const monthlyPaymentResult = calculateMonthlyPayment(contract);
  const dailyRate = monthlyPaymentResult.total / daysInMonth;
  const proRatedRevenue = dailyRate * billingDays;

  return {
    proRatedRevenue,
    daysInMonth,
    billingDays,
    dailyRate,
  };
}

/**
 * Calculate contract profitability
 */
export function calculateContractProfitability(
  contract: Contract,
  operationalCosts: OperationalCosts
): ProfitabilityResult {
  const monthlyPaymentResult = calculateMonthlyPayment(contract);
  const monthlyRevenue = monthlyPaymentResult.total;

  const totalMonthlyCosts = Object.values(operationalCosts).reduce((sum, cost) => sum + cost, 0);
  const monthlyProfit = monthlyRevenue - totalMonthlyCosts;
  const profitMargin = monthlyRevenue > 0 ? monthlyProfit / monthlyRevenue : 0;
  const annualProfit = monthlyProfit * 12;
  const isProfitable = monthlyProfit > 0;

  return {
    monthlyRevenue,
    monthlyCosts: totalMonthlyCosts,
    monthlyProfit,
    profitMargin,
    annualProfit,
    isProfitable,
  };
}

/**
 * Calculate discount amount for promotional offers
 */
export function calculateDiscountAmount(originalAmount: number, discountRate: number): DiscountResult {
  if (originalAmount < 0) {
    throw new Error('Original amount cannot be negative');
  }

  if (discountRate < 0) {
    throw new Error('Discount rate cannot be negative');
  }

  if (discountRate > 0.50) {
    throw new Error('Discount rate cannot exceed 50%');
  }

  const discountAmount = originalAmount * discountRate;
  const discountedAmount = originalAmount - discountAmount;

  return {
    originalAmount,
    discountRate,
    discountAmount,
    discountedAmount,
  };
}

/**
 * Generate comprehensive contract summary
 */
export function generateContractSummary(
  contract: Contract,
  operationalCosts?: OperationalCosts
): ContractSummary {
  const monthlyPayment = calculateMonthlyPayment(contract);
  const totalRevenueResult = calculateTotalRevenue(contract);

  const summary: ContractSummary = {
    agreementNumber: contract.agreement_number,
    contractDuration: totalRevenueResult.contractDurationMonths,
    monthlyPayment,
    totalRevenue: totalRevenueResult.totalRevenue,
    depositRequired: contract.financial_terms.deposit_amount,
    currency: contract.currency,
    terms: {
      paymentTerms: 'Monthly payments due on the 1st of each month',
      cancellationPolicy: `Early termination fee: ${contract.financial_terms.early_termination_rate * 100}% of remaining contract value`,
      lateFeePolicy: `Late payment fee: ${contract.financial_terms.late_fee_rate * 100}% of overdue amount plus daily penalties`,
    },
  };

  if (operationalCosts) {
    summary.profitability = calculateContractProfitability(contract, operationalCosts);
  }

  return summary;
}

/**
 * Validate contract financial terms
 */
export function validateContractFinancials(contract: Contract): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (contract.monthly_rate <= 0) {
    errors.push('Monthly rate must be greater than 0');
  }

  if (contract.financial_terms.tax_rate < 0 || contract.financial_terms.tax_rate > 1) {
    errors.push('Tax rate must be between 0 and 1');
  }

  if (contract.financial_terms.late_fee_rate < 0 || contract.financial_terms.late_fee_rate > 1) {
    errors.push('Late fee rate must be between 0 and 1');
  }

  if (contract.financial_terms.early_termination_rate < 0 || contract.financial_terms.early_termination_rate > 1) {
    errors.push('Early termination rate must be between 0 and 1');
  }

  const startDate = new Date(contract.start_date);
  const endDate = new Date(contract.end_date);
  if (endDate <= startDate) {
    errors.push('End date must be after start date');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate payment schedule for the entire contract
 */
export function generatePaymentSchedule(contract: Contract): Array<{
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  description: string;
}> {
  const monthlyPayment = calculateMonthlyPayment(contract);
  const startDate = new Date(contract.start_date);
  const endDate = new Date(contract.end_date);
  const totalMonths = differenceInMonths(endDate, startDate) + 1;

  const schedule = [];
  for (let i = 0; i < totalMonths; i++) {
    const dueDate = addMonths(startDate, i);
    schedule.push({
      dueDate: dueDate.toISOString().split('T')[0],
      amount: monthlyPayment.total,
      status: 'pending' as const,
      description: `Monthly payment for ${dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    });
  }

  return schedule;
}

/**
 * Calculate contract value metrics for reporting
 */
export function calculateContractValueMetrics(contracts: Contract[]): {
  totalContractValue: number;
  averageMonthlyRevenue: number;
  totalAnnualRevenue: number;
  totalDepositsHeld: number;
  weightedAverageContractLength: number;
} {
  if (contracts.length === 0) {
    return {
      totalContractValue: 0,
      averageMonthlyRevenue: 0,
      totalAnnualRevenue: 0,
      totalDepositsHeld: 0,
      weightedAverageContractLength: 0,
    };
  }

  const totalContractValue = contracts.reduce((sum, contract) => {
    const revenueResult = calculateTotalRevenue(contract);
    return sum + revenueResult.totalRevenue;
  }, 0);

  const totalMonthlyRevenue = contracts.reduce((sum, contract) => {
    const monthlyPayment = calculateMonthlyPayment(contract);
    return sum + monthlyPayment.total;
  }, 0);

  const totalDepositsHeld = contracts.reduce((sum, contract) => {
    return sum + contract.financial_terms.deposit_amount;
  }, 0);

  const totalMonths = contracts.reduce((sum, contract) => {
    const revenueResult = calculateTotalRevenue(contract);
    return sum + revenueResult.contractDurationMonths;
  }, 0);

  return {
    totalContractValue,
    averageMonthlyRevenue: totalMonthlyRevenue / contracts.length,
    totalAnnualRevenue: totalMonthlyRevenue * 12,
    totalDepositsHeld,
    weightedAverageContractLength: totalMonths / contracts.length,
  };
}