import type { QueueClaimResult } from './legalQueueClaims';
export function legalCandidateAmounts(claim?: QueueClaimResult) {
 const amounts=claim?.amounts;
 return {
  amount: amounts?.total ?? null, detailedClaimTotal: amounts?.total ?? null,
  overdueRent: amounts?.overdueRent ?? null, lateFees: amounts?.lateFees ?? null,
  trafficViolations: amounts?.violationsFines ?? null, damages: amounts?.damagesFee ?? null,
  retention: amounts?.retentionCompensation ?? null, depositDeduction: amounts?.securityDepositDeduction ?? null,
  financialReview: claim?.error ?? (!amounts ? 'تعذر التحقق من المطالبة المالية' : null),
  canConvert: Boolean(amounts && amounts.total>0),
 };
}
