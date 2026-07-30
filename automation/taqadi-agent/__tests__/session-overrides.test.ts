import { beforeEach, describe, expect, it } from 'vitest';
import {
  addSessionOverride,
  clearSessionOverrides,
  expandFieldLookup,
  getSessionOverrides,
} from '../selector-overrides';

describe('session overrides (Level 2)', () => {
  beforeEach(() => {
    clearSessionOverrides();
  });

  it('adds session entries on top of the base lookup', () => {
    addSessionOverride('رقم السجل التجاري', {
      labels: ['رقم السجل الجديد'],
      controlIds: ['officialRegistrationNumber'],
    });

    const result = expandFieldLookup(['رقم السجل التجاري'], ['crNo']);
    expect(result.labels).toEqual(['رقم السجل التجاري', 'رقم السجل الجديد']);
    expect(result.controlIds).toEqual(['crNo', 'officialRegistrationNumber']);
  });

  it('merges repeated entries for the same field without duplicates', () => {
    addSessionOverride('الجنسية', { labels: ['البلد'], controlIds: ['country'] });
    addSessionOverride('الجنسية', { labels: ['البلد', 'بلد الإقامة'], controlIds: ['country'] });

    const entry = getSessionOverrides().fields['الجنسية'];
    expect(entry.labels).toEqual(['البلد', 'بلد الإقامة']);
    expect(entry.controlIds).toEqual(['country']);
  });

  it('ignores empty canonical labels', () => {
    addSessionOverride('   ', { labels: ['x'], controlIds: ['y'] });
    expect(getSessionOverrides().fields).toEqual({});
  });

  it('clears all session entries for the next job', () => {
    addSessionOverride('الجنسية', { labels: ['البلد'], controlIds: [] });
    clearSessionOverrides();

    const result = expandFieldLookup(['الجنسية'], []);
    expect(result.labels).toEqual(['الجنسية']);
  });

  it('does not affect unrelated fields', () => {
    addSessionOverride('الجنسية', { labels: ['البلد'], controlIds: [] });

    const result = expandFieldLookup(['رقم الهاتف'], []);
    expect(result.labels).toEqual(['رقم الهاتف']);
  });
});
