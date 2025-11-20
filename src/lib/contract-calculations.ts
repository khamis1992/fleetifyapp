/**
 * Contract Calculations Module
 *
 * Comprehensive financial calculations for fleet management contracts
 * including payment processing, fee calculations, revenue projections,
 * profitability analysis, and contract lifecycle financial management.
 */

import { addDays, addMonths, differenceInDays, differenceInMonths, isLeapYear } from 'date-fns';

export interface Contract {
  id: string;
  agreement_number: string;
  monthly_rate: number;
  start_date: string;
  end_date: string;
  currency: string;
  financial_terms: FinancialTerms;
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

export interface ContractSummary {
  agreementNumber: string;
  contractDuration: number;
  monthlyPayment: MonthlyPaymentResult;
  totalRevenue: number;
  depositRequired: number;
  currency: string;
  profitability?: ProfitabilityResult;
  terms: {
    paymentTerms: string;
    cancellationPolicy: string;
    lateFeePolicy: string;
  };
}

/**
 * Calculate monthly payment including fees and taxes
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