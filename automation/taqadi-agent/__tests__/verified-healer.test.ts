import { describe, expect, it } from 'vitest';
import type { PortalObservation } from '../portal-observer';
import type { HealSuggestion } from '../selector-healer';
import {
  shouldAutoApplyHeal,
  verifySuggestionAgainstObservation,
} from '../verified-healer';

function observation(controls: PortalObservation['controls']): PortalObservation {
  return {
    capturedAt: '2026-07-30T00:00:00Z',
    url: 'https://taqadi.sjc.gov.qa/case',
    title: '',
    headings: [],
    activeTabs: [],
    buttons: [],
    links: [],
    dialogs: [],
    validationMessages: [],
    controls,
    knownValueMatches: [],
  };
}

function control(partial: Partial<PortalObservation['controls'][number]>) {
  return {
    tag: 'input',
    type: 'text',
    id: null,
    name: null,
    role: null,
    label: '',
    required: false,
    invalid: false,
    disabled: false,
    hasValue: false,
    ...partial,
  };
}

function suggestion(partial: Partial<HealSuggestion> = {}): HealSuggestion {
  return {
    found: true,
    suggestedLabels: [],
    suggestedControlIds: [],
    confidence: 'high',
    rationale: '',
    overridesEntry: null,
    ...partial,
  };
}

describe('verifySuggestionAgainstObservation', () => {
  it('verifies a control-id match on a visible enabled control', () => {
    const result = verifySuggestionAgainstObservation(
      suggestion({ suggestedControlIds: ['officialRegistrationNumber'] }),
      observation([control({ id: 'officialRegistrationNumber', label: 'رقم السجل' })]),
    );
    expect(result.verified).toBe(true);
    expect(result.matchedBy).toBe('controlId');
  });

  it('matches control name when id is absent', () => {
    const result = verifySuggestionAgainstObservation(
      suggestion({ suggestedControlIds: ['crNo'] }),
      observation([control({ name: 'crNo' })]),
    );
    expect(result.verified).toBe(true);
  });

  it('verifies a label match despite hamza and diacritic differences', () => {
    const result = verifySuggestionAgainstObservation(
      suggestion({ suggestedLabels: ['رقم البطاقة'] }),
      observation([control({ label: 'رَقم البطاقَة *' })]),
    );
    expect(result.verified).toBe(true);
    expect(result.matchedBy).toBe('label');
  });

  it('rejects a suggestion whose control is disabled', () => {
    const result = verifySuggestionAgainstObservation(
      suggestion({ suggestedControlIds: ['crNo'], suggestedLabels: ['رقم السجل'] }),
      observation([control({ id: 'crNo', label: 'رقم السجل', disabled: true })]),
    );
    expect(result.verified).toBe(false);
  });

  it('rejects when nothing on the page matches', () => {
    const result = verifySuggestionAgainstObservation(
      suggestion({ suggestedControlIds: ['missing'], suggestedLabels: ['حقل غير موجود'] }),
      observation([control({ id: 'other', label: 'حقل آخر' })]),
    );
    expect(result.verified).toBe(false);
  });

  it('rejects suggestions that found nothing in the first place', () => {
    const result = verifySuggestionAgainstObservation(
      suggestion({ found: false }),
      observation([control({ id: 'crNo' })]),
    );
    expect(result.verified).toBe(false);
  });
});

describe('shouldAutoApplyHeal', () => {
  const verified = {
    verified: true,
    matchedBy: 'controlId' as const,
    matchedControl: { id: 'crNo', label: 'رقم السجل' },
    reason: '',
  };

  it('applies only high-confidence verified suggestions', () => {
    expect(shouldAutoApplyHeal(suggestion(), verified)).toBe(true);
  });

  it('refuses medium confidence even when verified', () => {
    expect(shouldAutoApplyHeal(suggestion({ confidence: 'medium' }), verified)).toBe(false);
  });

  it('refuses unverified suggestions even with high confidence', () => {
    expect(
      shouldAutoApplyHeal(suggestion(), {
        ...verified,
        verified: false,
      }),
    ).toBe(false);
  });

  it('refuses a null suggestion', () => {
    expect(shouldAutoApplyHeal(null, verified)).toBe(false);
  });
});
