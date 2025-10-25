/**
 * Delinquency Calculations Utility
 * Handles all calculations for delinquent customers risk assessment
 */

// Constants
export const DAILY_PENALTY_RATE = 0.001; // 0.1% per day
export const MAX_PENALTY_RATE = 0.20; // Maximum 20% of overdue amount
export const GRACE_PERIOD_DAYS = 5; // No penalty for first 5 days

// Risk Score Weights
export const RISK_WEIGHTS = {
  daysOverdue: 0.40,      // 40%
  amountOverdue: 0.30,    // 30%
  violations: 0.15,       // 15%
  paymentHistory: 0.10,   // 10%
  legalHistory: 0.05,     // 5%
} as const;

// Risk Levels
export const RISK_LEVELS = {
  CRITICAL: { min: 85, max: 100, label: 'خطر حرج', labelEn: 'Critical', color: 'red', variant: 'destructive' },
  HIGH: { min: 70, max: 84, label: 'خطر عالي', labelEn: 'High', color: 'red', variant: 'destructive' },
  MEDIUM: { min: 60, max: 69, label: 'خطر متوسط', labelEn: 'Medium', color: 'orange', variant: 'default' },
  LOW: { min: 40, max: 59, label: 'خطر منخفض', labelEn: 'Low', color: 'yellow', variant: 'secondary' },
  MONITOR: { min: 0, max: 39, label: 'مراقبة', labelEn: 'Monitor', color: 'green', variant: 'outline' },
} as const;

export type RecommendedAction = {
  action: 'BLACKLIST_AND_FILE_CASE' | 'FILE_LEGAL_CASE' | 'SEND_FORMAL_NOTICE' | 'SEND_WARNING' | 'MONITOR';
  label: string;
  labelEn: string;
  color: string;
  priority: 'CRITICAL' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
};

/**
 * Calculate late payment penalty
 */
export function calculatePenalty(overdueAmount: number, daysOverdue: number): number {
  if (daysOverdue <= GRACE_PERIOD_DAYS) {
    return 0;
  }

  const penaltyDays = daysOverdue - GRACE_PERIOD_DAYS;
  const calculatedPenalty = overdueAmount * DAILY_PENALTY_RATE * penaltyDays;
  const maxPenalty = overdueAmount * MAX_PENALTY_RATE;

  return Math.min(calculatedPenalty, maxPenalty);
}

/**
 * Calculate days overdue factor for risk score
 */
function calculateDaysOverdueFactor(daysOverdue: number): number {
  return Math.min(daysOverdue / 120, 1) * 100;
}

/**
 * Calculate amount overdue factor for risk score
 */
function calculateAmountFactor(overdueAmount: number, creditLimit: number): number {
  if (creditLimit === 0) return 100; // If no credit limit, consider high risk
  return Math.min(overdueAmount / creditLimit, 1) * 100;
}

/**
 * Calculate violations factor for risk score
 */
function calculateViolationsFactor(violationsCount: number): number {
  return Math.min(violationsCount / 5, 1) * 100;
}

/**
 * Calculate payment history factor for risk score
 */
function calculatePaymentHistoryFactor(missedPayments: number, totalExpectedPayments: number): number {
  if (totalExpectedPayments === 0) return 0;
  return (missedPayments / totalExpectedPayments) * 100;
}

/**
 * Calculate legal history factor for risk score
 */
function calculateLegalHistoryFactor(hasPreviousLegalCases: boolean): number {
  return hasPreviousLegalCases ? 100 : 0;
}

/**
 * Calculate comprehensive risk score (0-100)
 */
export function calculateRiskScore(params: {
  daysOverdue: number;
  overdueAmount: number;
  creditLimit: number;
  violationsCount: number;
  missedPayments: number;
  totalExpectedPayments: number;
  hasPreviousLegalCases: boolean;
}): number {
  const daysOverdueFactor = calculateDaysOverdueFactor(params.daysOverdue);
  const amountFactor = calculateAmountFactor(params.overdueAmount, params.creditLimit);
  const violationsFactor = calculateViolationsFactor(params.violationsCount);
  const paymentHistoryFactor = calculatePaymentHistoryFactor(params.missedPayments, params.totalExpectedPayments);
  const legalHistoryFactor = calculateLegalHistoryFactor(params.hasPreviousLegalCases);

  const riskScore =
    daysOverdueFactor * RISK_WEIGHTS.daysOverdue +
    amountFactor * RISK_WEIGHTS.amountOverdue +
    violationsFactor * RISK_WEIGHTS.violations +
    paymentHistoryFactor * RISK_WEIGHTS.paymentHistory +
    legalHistoryFactor * RISK_WEIGHTS.legalHistory;

  return Math.round(Math.min(riskScore, 100));
}

/**
 * Get risk level based on risk score
 */
export function getRiskLevel(riskScore: number): typeof RISK_LEVELS[keyof typeof RISK_LEVELS] {
  if (riskScore >= RISK_LEVELS.CRITICAL.min) return RISK_LEVELS.CRITICAL;
  if (riskScore >= RISK_LEVELS.HIGH.min) return RISK_LEVELS.HIGH;
  if (riskScore >= RISK_LEVELS.MEDIUM.min) return RISK_LEVELS.MEDIUM;
  if (riskScore >= RISK_LEVELS.LOW.min) return RISK_LEVELS.LOW;
  return RISK_LEVELS.MONITOR;
}

/**
 * Get recommended action based on risk score and days overdue
 */
export function getRecommendedAction(daysOverdue: number, riskScore: number): RecommendedAction {
  // Critical: Blacklist and file case
  if (daysOverdue > 120 || riskScore >= 85) {
    return {
      action: 'BLACKLIST_AND_FILE_CASE',
      label: 'قائمة سوداء + رفع قضية',
      labelEn: 'Blacklist & File Case',
      color: 'red',
      priority: 'CRITICAL',
    };
  }

  // Urgent: File legal case
  if (daysOverdue > 90 || riskScore >= 70) {
    return {
      action: 'FILE_LEGAL_CASE',
      label: 'رفع قضية قانونية',
      labelEn: 'File Legal Case',
      color: 'red',
      priority: 'URGENT',
    };
  }

  // High: Send formal notice
  if (daysOverdue > 60 || riskScore >= 60) {
    return {
      action: 'SEND_FORMAL_NOTICE',
      label: 'إنذار رسمي',
      labelEn: 'Formal Notice',
      color: 'orange',
      priority: 'HIGH',
    };
  }

  // Medium: Send warning
  if (daysOverdue > 30 || riskScore >= 50) {
    return {
      action: 'SEND_WARNING',
      label: 'إرسال تنبيه',
      labelEn: 'Send Warning',
      color: 'yellow',
      priority: 'MEDIUM',
    };
  }

  // Low: Monitor
  return {
    action: 'MONITOR',
    label: 'مراقبة',
    labelEn: 'Monitor',
    color: 'blue',
    priority: 'LOW',
  };
}

/**
 * Calculate months unpaid
 */
export function calculateMonthsUnpaid(contractStartDate: Date, actualPaymentsCount: number): number {
  const today = new Date();
  const monthsSinceStart = Math.floor(
    (today.getTime() - contractStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  return Math.max(0, monthsSinceStart - actualPaymentsCount);
}

/**
 * Calculate days between two dates
 */
export function calculateDaysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'KWD'): string {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
}
