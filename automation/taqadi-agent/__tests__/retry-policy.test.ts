import { describe, expect, it } from 'vitest';
import {
  shouldRefundClaimAttempt,
  shouldRestartPortalFlow,
} from '../retry-policy';
import { HumanInterventionError } from '../types';

describe('Taqadi portal retry policy', () => {
  it('refunds a claimed attempt when login times out before opening a case', () => {
    const error = new HumanInterventionError(
      'Login is required',
      'LOGIN_REQUIRED',
    );

    expect(shouldRefundClaimAttempt(error, {
      caseDraftStarted: false,
      submissionStarted: false,
    })).toBe(true);
    expect(shouldRefundClaimAttempt(error, {
      caseDraftStarted: true,
      submissionStarted: false,
    })).toBe(false);
    expect(shouldRefundClaimAttempt(error, {
      caseDraftStarted: false,
      submissionStarted: true,
    })).toBe(false);
  });

  it('does not refund other human-intervention failures', () => {
    const error = new HumanInterventionError(
      'Portal UI changed',
      'TAQADI_UI_CHANGED',
    );

    expect(shouldRefundClaimAttempt(error, {
      caseDraftStarted: false,
      submissionStarted: false,
    })).toBe(false);
  });

  it('never restarts the page after the case draft has started', () => {
    const partyError = new HumanInterventionError(
      'تعذر فتح نموذج الطرف',
      'PARTY_EDITOR_NOT_OPENED',
    );
    const transientError = new HumanInterventionError(
      'واجهة تقاضي غير مستقرة',
      'TAQADI_UI_CHANGED',
    );

    expect(shouldRestartPortalFlow(partyError, {
      caseDraftStarted: true,
      submissionStarted: false,
    })).toBe(false);
    expect(shouldRestartPortalFlow(transientError, {
      caseDraftStarted: true,
      submissionStarted: false,
    })).toBe(false);
  });

  it('allows a transient retry only before opening a case draft', () => {
    const error = new HumanInterventionError(
      'واجهة الدخول غير مستقرة',
      'TAQADI_UI_CHANGED',
    );

    expect(shouldRestartPortalFlow(error, {
      caseDraftStarted: false,
      submissionStarted: false,
    })).toBe(true);
  });

  it('restarts a rejected classification before any case data is submitted', () => {
    const error = new HumanInterventionError(
      'رفض تقاضي الانتقال من تصنيف الدعوى إلى تفاصيلها',
      'CASE_CLASSIFICATION_VALIDATION_FAILED',
    );

    expect(shouldRestartPortalFlow(error, {
      caseDraftStarted: true,
      submissionStarted: false,
    })).toBe(true);
    expect(shouldRestartPortalFlow(error, {
      caseDraftStarted: true,
      submissionStarted: true,
    })).toBe(false);
  });

  it('restarts the whole draft when Taqadi rejects a party request', () => {
    const error = new HumanInterventionError(
      'رفض موقع تقاضي الطلب مؤقتًا أثناء فتح بيانات الطرف',
      'TAQADI_REQUEST_REJECTED',
      {
        rejected: true,
        url: 'https://taqadi.sjc.gov.qa/itc/f/caseinfo/party',
      },
    );

    expect(shouldRestartPortalFlow(error, {
      caseDraftStarted: true,
      submissionStarted: false,
    })).toBe(true);
    expect(shouldRestartPortalFlow(error, {
      caseDraftStarted: true,
      submissionStarted: true,
    })).toBe(false);
  });
});
