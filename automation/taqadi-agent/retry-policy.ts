import { HumanInterventionError } from './types';

export interface PortalRetryState {
  caseDraftStarted: boolean;
  submissionStarted: boolean;
}

export function shouldRefundClaimAttempt(
  error: unknown,
  state: PortalRetryState,
): boolean {
  return error instanceof HumanInterventionError
    && error.code === 'LOGIN_REQUIRED'
    && !state.caseDraftStarted
    && !state.submissionStarted;
}

export function shouldRestartPortalFlow(
  error: unknown,
  state: PortalRetryState,
): boolean {
  if (
    state.submissionStarted
    || !(error instanceof HumanInterventionError)
  ) return false;

  const classificationValidationFailed = error.code
    === 'CASE_CLASSIFICATION_VALIDATION_FAILED';
  const portalRequestRejected = error.code === 'TAQADI_REQUEST_REJECTED'
    || error.details.rejected === true
    || /the requested url was rejected/i.test(error.message);
  if (
    state.caseDraftStarted
    && !classificationValidationFailed
    && !portalRequestRejected
  ) return false;

  const emptyRemoteOptionList = error.code === 'TAQADI_OPTION_MISSING'
    && Array.isArray(error.details.availableOptions)
    && error.details.availableOptions.length === 0;

  return [
    'TAQADI_REQUEST_REJECTED',
    'TAQADI_OPTION_UNSTABLE',
    'TAQADI_UI_CHANGED',
  ].includes(error.code)
    || emptyRemoteOptionList
    || portalRequestRejected
    || classificationValidationFailed;
}
