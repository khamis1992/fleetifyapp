import { describe, expect, it } from 'vitest';
import {
  buildHealPrompt,
  toHealSuggestion,
} from '../selector-healer';

describe('buildHealPrompt', () => {
  it('includes the failure context and the snapshot', () => {
    const prompt = buildHealPrompt({
      step: 'taqadi_ui_changed',
      errorMessage: 'لم يجد الوكيل حقل «رقم السجل التجاري»',
      url: 'https://taqadi.sjc.gov.qa/itc/case',
      expectedLabels: ['رقم السجل التجاري'],
      expectedControlIds: ['crNo'],
      ariaSnapshot: '- textbox "رقم السجل التجاري الجديد"',
    });
    expect(prompt).toContain('رقم السجل التجاري');
    expect(prompt).toContain('crNo');
    expect(prompt).toContain('<accessibility_snapshot>');
    expect(prompt).toContain('رقم السجل التجاري الجديد');
  });

  it('truncates oversized snapshots', () => {
    const prompt = buildHealPrompt({
      step: 's',
      errorMessage: 'e',
      url: null,
      expectedLabels: [],
      expectedControlIds: [],
      ariaSnapshot: 'x'.repeat(100_000),
    });
    expect(prompt.length).toBeLessThan(70_000);
    expect(prompt).toContain('…(truncated)');
  });
});

describe('toHealSuggestion', () => {
  it('builds a ratifiable overrides entry keyed by the canonical label', () => {
    const suggestion = toHealSuggestion(
      {
        found: true,
        suggestedLabels: ['رقم السجل التجاري *'],
        suggestedControlIds: ['officialRegistrationNumber'],
        confidence: 'high',
        rationale: 'الحقل أعيدت تسميته',
      },
      ['رقم السجل التجاري', 'رقم قيد المنشأة'],
    );
    expect(suggestion).not.toBeNull();
    expect(suggestion?.found).toBe(true);
    expect(suggestion?.overridesEntry).toEqual({
      'رقم السجل التجاري': {
        labels: ['رقم السجل التجاري *'],
        controlIds: ['officialRegistrationNumber'],
      },
    });
  });

  it('marks not-found when the model returns no usable candidates', () => {
    const suggestion = toHealSuggestion(
      {
        found: true,
        suggestedLabels: [],
        suggestedControlIds: [],
        confidence: 'high',
        rationale: '',
      },
      ['رقم السجل التجاري'],
    );
    expect(suggestion?.found).toBe(false);
    expect(suggestion?.overridesEntry).toBeNull();
  });

  it('defaults confidence to low on unexpected values', () => {
    const suggestion = toHealSuggestion(
      {
        found: true,
        suggestedLabels: ['حقل'],
        suggestedControlIds: [],
        confidence: 'certain',
        rationale: 7,
      },
      ['حقل قديم'],
    );
    expect(suggestion?.confidence).toBe('low');
    expect(suggestion?.rationale).toBe('');
  });

  it('rejects non-object payloads', () => {
    expect(toHealSuggestion('nope', ['x'])).toBeNull();
    expect(toHealSuggestion(null, ['x'])).toBeNull();
  });
});
