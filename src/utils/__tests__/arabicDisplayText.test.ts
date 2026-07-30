import { describe, expect, it } from 'vitest';
import {
  decodeDisplayText,
  decodeLegalTaskTitle,
  decodePossiblyMojibake,
  hasCorruptedArabic,
  repairLegalWorkflowTitle,
} from '../arabicDisplayText';

describe('arabicDisplayText', () => {
  it('decodes classic latin1 mojibake', () => {
    const mojibake = Buffer.from('مرحبا', 'utf8').toString('latin1');
    expect(decodePossiblyMojibake(mojibake)).toBe('مرحبا');
    expect(hasCorruptedArabic(mojibake)).toBe(true);
  });

  it('repairs garbled appeal task title with control chars', () => {
    const garbled = 'استْ &ا \u001e تج ! `ز CASE-26-0028';
    expect(hasCorruptedArabic(garbled)).toBe(true);
    expect(decodeDisplayText(garbled)).toBe('استئناف القضية CASE-26-0028');
  });

  it('uses workflow_key for clean legal task titles', () => {
    expect(
      decodeLegalTaskTitle(
        {
          title: 'استْ &ا \u001e تج ! `ز CASE-26-0028',
          metadata: { workflow_key: 'appeal:abc:2026-01-01' },
        },
        'CASE-26-0028',
      ),
    ).toBe('قرار الاستئناف للقضية CASE-26-0028');

    expect(
      repairLegalWorkflowTitle('x', 'daily-appeal:1', 'CASE-26-0028'),
    ).toBe('مهلة استئناف: CASE-26-0028');
  });

  it('leaves clean Arabic unchanged', () => {
    expect(decodeDisplayText('نص سليم')).toBe('نص سليم');
    expect(hasCorruptedArabic('نص سليم')).toBe(false);
  });
});
