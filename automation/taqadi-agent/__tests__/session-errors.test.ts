import { describe, expect, it } from 'vitest';
import { classifyPortalSessionFailure } from '../session-errors';
import { HumanInterventionError } from '../types';

describe('portal session expiry', () => {
  const timeout = new Error('locator.evaluate: Timeout 30000ms exceeded');
  it('turns a locator timeout on the login page into actionable draft recovery', () => {
    expect(classifyPortalSessionFailure(timeout, 'https://taqadi.sjc.gov.qa/itc/login', {
      submissionStarted: false, caseDraftStarted: true,
    })).toMatchObject({ code: 'LOGIN_REQUIRED', details: { existingDraftRequired: true, resumeSupported: true } });
  });
  it('keeps post-submission uncertainty for receipt verification', () => {
    expect(classifyPortalSessionFailure(timeout, 'https://taqadi.sjc.gov.qa/itc/login', {
      submissionStarted: true, caseDraftStarted: true,
    })).toBe(timeout);
  });
  it('does not misclassify field errors on an authenticated page or a foreign host', () => {
    for (const url of ['https://taqadi.sjc.gov.qa/itc/home', 'https://example.test/itc/login']) {
      expect(classifyPortalSessionFailure(timeout, url, { submissionStarted: false, caseDraftStarted: true })).toBe(timeout);
    }
  });
  it('preserves precise smart-card intervention errors', () => {
    const error = new HumanInterventionError('PIN limit', 'SMART_CARD_PIN_RETRY_LIMIT');
    expect(classifyPortalSessionFailure(error, 'https://www.tawtheeq.gov.qa/idp/public/authn/smart-card', {
      submissionStarted: false, caseDraftStarted: false,
    })).toBe(error);
  });
});
