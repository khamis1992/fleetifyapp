import { describe, expect, it } from 'vitest';
import {
  applyOverrides,
  parseSelectorOverrides,
  type SelectorOverrides,
} from '../selector-overrides';

describe('parseSelectorOverrides', () => {
  it('keeps only valid string entries', () => {
    const parsed = parseSelectorOverrides(JSON.stringify({
      fields: {
        'رقم السجل التجاري': {
          labels: ['رقم السجل التجاري الجديد', '', 42],
          controlIds: ['officialRegistrationNumber'],
        },
        broken: null,
      },
    }));
    expect(parsed.fields['رقم السجل التجاري']).toEqual({
      labels: ['رقم السجل التجاري الجديد'],
      controlIds: ['officialRegistrationNumber'],
    });
    expect(parsed.fields.broken).toBeUndefined();
  });

  it('throws on invalid JSON so the loader can ignore the file', () => {
    expect(() => parseSelectorOverrides('{oops')).toThrow();
  });
});

describe('applyOverrides', () => {
  const overrides: SelectorOverrides = {
    fields: {
      'رقم السجل التجاري': {
        labels: ['رقم السجل التجاري الجديد'],
        controlIds: ['officialRegistrationNumber'],
      },
    },
  };

  it('extends labels and control ids without removing the originals', () => {
    const result = applyOverrides(overrides, {
      labels: ['رقم السجل التجاري', 'رقم قيد المنشأة'],
      controlIds: ['crNo'],
    });
    expect(result.labels).toEqual([
      'رقم السجل التجاري',
      'رقم قيد المنشأة',
      'رقم السجل التجاري الجديد',
    ]);
    expect(result.controlIds).toEqual(['crNo', 'officialRegistrationNumber']);
  });

  it('returns the input untouched when no override matches', () => {
    const input = { labels: ['بلد البنك'], controlIds: [] };
    expect(applyOverrides(overrides, input)).toBe(input);
  });

  it('does not duplicate values already present', () => {
    const result = applyOverrides(overrides, {
      labels: ['رقم السجل التجاري', 'رقم السجل التجاري الجديد'],
      controlIds: ['officialRegistrationNumber'],
    });
    expect(result.labels).toHaveLength(2);
    expect(result.controlIds).toEqual(['officialRegistrationNumber']);
  });
});
