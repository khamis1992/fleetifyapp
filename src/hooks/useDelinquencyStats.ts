import { useQuery } from "@tanstack/react-query";
import { useDelinquentCustomers } from "./useDelinquentCustomers";

export interface DelinquencyStats {
  // Overall counts
  totalDelinquent: number;
  totalAmountAtRisk: number;
  totalPenalties: number;
  totalViolations: number;
  totalDebt: number;

  // By risk level
  criticalRisk: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  monitor: number;

  // By overdue period
  under30Days: number;
  days30to60: number;
  days60to90: number;
  over90Days: number;

  // By action
  needBlacklist: number;
  needLegalCase: number;
  needFormalNotice: number;
  needWarning: number;
  needMonitoring: number;

  // Financial breakdown
  averageDebt: number;
  averageDaysOverdue: number;
  averageRiskScore: number;

  // Additional metrics
  customersWithViolations: number;
  blacklistedCustomers: number;
  customersWithLegalHistory: number;
}

export const useDelinquencyStats = () => {
  const { data: delinquentCustomers, isLoading, error } = useDelinquentCustomers();

  return useQuery({
    queryKey: ['delinquency-stats', delinquentCustomers],
    queryFn: (): DelinquencyStats => {
      // If there's an error or no data, return empty stats
      if (error || !delinquentCustomers || delinquentCustomers.length === 0) {
        return {
          totalDelinquent: 0,
          totalAmountAtRisk: 0,
          totalPenalties: 0,
          totalViolations: 0,
          totalDebt: 0,
          criticalRisk: 0,
          highRisk: 0,
          mediumRisk: 0,
          lowRisk: 0,
          monitor: 0,
          under30Days: 0,
          days30to60: 0,
          days60to90: 0,
          over90Days: 0,
          needBlacklist: 0,
          needLegalCase: 0,
          needFormalNotice: 0,
          needWarning: 0,
          needMonitoring: 0,
          averageDebt: 0,
          averageDaysOverdue: 0,
          averageRiskScore: 0,
          customersWithViolations: 0,
          blacklistedCustomers: 0,
          customersWithLegalHistory: 0,
        };
      }

      const stats: DelinquencyStats = {
        // Overall counts
        totalDelinquent: delinquentCustomers.length,
        totalAmountAtRisk: delinquentCustomers.reduce((sum, c) => sum + c.overdue_amount, 0),
        totalPenalties: delinquentCustomers.reduce((sum, c) => sum + c.late_penalty, 0),
        totalViolations: delinquentCustomers.reduce((sum, c) => sum + c.violations_amount, 0),
        totalDebt: delinquentCustomers.reduce((sum, c) => sum + c.total_debt, 0),

        // By risk level
        criticalRisk: delinquentCustomers.filter(c => c.risk_score >= 85).length,
        highRisk: delinquentCustomers.filter(c => c.risk_score >= 70 && c.risk_score < 85).length,
        mediumRisk: delinquentCustomers.filter(c => c.risk_score >= 60 && c.risk_score < 70).length,
        lowRisk: delinquentCustomers.filter(c => c.risk_score >= 40 && c.risk_score < 60).length,
        monitor: delinquentCustomers.filter(c => c.risk_score < 40).length,

        // By overdue period
        under30Days: delinquentCustomers.filter(c => c.days_overdue < 30).length,
        days30to60: delinquentCustomers.filter(c => c.days_overdue >= 30 && c.days_overdue < 60).length,
        days60to90: delinquentCustomers.filter(c => c.days_overdue >= 60 && c.days_overdue < 90).length,
        over90Days: delinquentCustomers.filter(c => c.days_overdue >= 90).length,

        // By action
        needBlacklist: delinquentCustomers.filter(c => c.recommended_action.action === 'BLACKLIST_AND_FILE_CASE').length,
        needLegalCase: delinquentCustomers.filter(c => c.recommended_action.action === 'FILE_LEGAL_CASE').length,
        needFormalNotice: delinquentCustomers.filter(c => c.recommended_action.action === 'SEND_FORMAL_NOTICE').length,
        needWarning: delinquentCustomers.filter(c => c.recommended_action.action === 'SEND_WARNING').length,
        needMonitoring: delinquentCustomers.filter(c => c.recommended_action.action === 'MONITOR').length,

        // Financial breakdown
        averageDebt: delinquentCustomers.reduce((sum, c) => sum + c.total_debt, 0) / delinquentCustomers.length,
        averageDaysOverdue: delinquentCustomers.reduce((sum, c) => sum + c.days_overdue, 0) / delinquentCustomers.length,
        averageRiskScore: delinquentCustomers.reduce((sum, c) => sum + c.risk_score, 0) / delinquentCustomers.length,

        // Additional metrics
        customersWithViolations: delinquentCustomers.filter(c => c.violations_count > 0).length,
        blacklistedCustomers: delinquentCustomers.filter(c => c.is_blacklisted).length,
        customersWithLegalHistory: delinquentCustomers.filter(c => c.has_previous_legal_cases).length,
      };

      return stats;
    },
    enabled: !isLoading && !error && !!delinquentCustomers,
    retry: false, // Don't retry if there's an error
  });
};
