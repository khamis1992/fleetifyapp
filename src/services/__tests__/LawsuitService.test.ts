import { describe, expect, it } from 'vitest';
import { lawsuitService } from '../LawsuitService';

describe('LawsuitService.convertAmountToWords', () => {
  it('uses the plural scale for 205 thousand', () => {
    expect(lawsuitService.convertAmountToWords(205_280)).toBe(
      'مائتان وخمسة آلاف ومائتان وثمانون ريال قطري',
    );
  });
});

describe('LawsuitService.generateFactsText', () => {
  it('does not invent delivery or friendly demands when they are not provided', () => {
    const facts = lawsuitService.generateFactsText(
      'عصام المزوغي',
      '2024-08-26',
      '',
      36_000,
    );

    expect(facts).toContain('المركبة المبينة بياناتها في عقد الإيجار المرفق');
    expect(facts).toContain('36,000 ريال قطري');
    expect(facts).not.toContain('وضعت المدعية المركبة تحت تصرف');
    expect(facts).not.toContain('المطالبات الودية المتكررة');
  });

  it('describes a traffic-violations-only claim without rental debt', () => {
    const facts = lawsuitService.generateFactsText(
      'عميل تجريبي',
      '2024-08-26',
      'GAC GS3',
      6_300,
      'traffic_violations_only',
    );

    expect(facts).toContain('المخالفات المرورية فقط');
    expect(facts).toContain('6,300 ريال قطري');
    expect(facts).toContain('لا تشمل المطالبة رصيد الأجرة');
    expect(facts).not.toContain('امتنع عن سداد الأجرة');
  });
});
