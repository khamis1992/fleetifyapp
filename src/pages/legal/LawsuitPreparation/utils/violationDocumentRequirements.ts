import type { LawsuitPreparationState } from '../store/types';

/** Requirements follow the filed claim, not all penalties on the contract. */
export function requiresViolationDocuments(
  state: Pick<LawsuitPreparationState, 'calculations' | 'legalCase'>,
): boolean {
  return Number(state.calculations?.violationsCount || 0) > 0
    || Number(state.calculations?.violationsFines || 0) > 0
    || state.legalCase?.claim_scope === 'traffic_violations_only';
}
