import { describe, expect, it } from 'vitest';
import {
  buildFactsAdditions,
  buildTaqadiClaims,
  getVehicleCustody,
  isContractActive,
  isContractEnded,
  type TaqadiNarrativeInput,
} from '../taqadiNarrative';

const TODAY = new Date('2026-07-29T00:00:00Z');

function baseInput(overrides: Partial<TaqadiNarrativeInput> = {}): TaqadiNarrativeInput {
  return {
    claimAmount: 25000,
    violationsCount: 0,
    violationsFines: 0,
    paidTotal: 0,
    reminders: { count: 0, lastSentDate: null, sendMethods: [] },
    vehicleStatus: null,
    contractEndDate: null,
    contractStatus: 'active',
    today: TODAY,
    ...overrides,
  };
}

describe('getVehicleCustody', () => {
  it('returns with_defendant only when the vehicle is rented', () => {
    expect(getVehicleCustody('rented')).toBe('with_defendant');
  });

  it('treats known non-rented statuses as returned', () => {
    expect(getVehicleCustody('available')).toBe('returned');
    expect(getVehicleCustody('maintenance')).toBe('returned');
  });

  it('returns unknown when status is missing', () => {
    expect(getVehicleCustody(null)).toBe('unknown');
    expect(getVehicleCustody(undefined)).toBe('unknown');
    expect(getVehicleCustody('')).toBe('unknown');
  });
});

describe('isContractActive / isContractEnded', () => {
  it('treats active and under_legal_procedure as active', () => {
    expect(isContractActive('active')).toBe(true);
    expect(isContractActive('under_legal_procedure')).toBe(true);
    expect(isContractActive('cancelled')).toBe(false);
    expect(isContractActive(null)).toBe(false);
  });

  it('detects an ended contract only for past end dates', () => {
    expect(isContractEnded('2026-01-01', TODAY)).toBe(true);
    expect(isContractEnded('2026-12-31', TODAY)).toBe(false);
    expect(isContractEnded(null, TODAY)).toBe(false);
    expect(isContractEnded('not-a-date', TODAY)).toBe(false);
  });
});

describe('buildFactsAdditions', () => {
  it('returns nothing for a plain standard case', () => {
    expect(buildFactsAdditions(baseInput())).toEqual([]);
  });

  it('mentions partial payments with the paid amount', () => {
    const paragraphs = buildFactsAdditions(baseInput({ paidTotal: 5000 }));
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toContain('(5,000)');
    expect(paragraphs[0]).toContain('جزءًا من مستحقاته');
  });

  it('keeps the approved violations paragraph wording', () => {
    const paragraphs = buildFactsAdditions(
      baseInput({ violationsCount: 3, violationsFines: 1500 }),
    );
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toContain('بعدد (3) مخالفة');
    expect(paragraphs[0]).toContain('(1,500)');
  });

  it('cites the reminder log as legal notice with count, channel and last date', () => {
    const paragraphs = buildFactsAdditions(
      baseInput({
        reminders: {
          count: 4,
          lastSentDate: '2026-07-01',
          sendMethods: ['whatsapp', 'whatsapp', 'sms'],
        },
      }),
    );
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toContain('عدد (4) إشعارًا');
    expect(paragraphs[0]).toContain('واتساب');
    expect(paragraphs[0]).toContain('الرسائل النصية');
    expect(paragraphs[0]).toContain('01/07/2026');
  });

  it('omits the channel and date when only a count is known', () => {
    const paragraphs = buildFactsAdditions(
      baseInput({ reminders: { count: 2, lastSentDate: null, sendMethods: [] } }),
    );
    expect(paragraphs[0]).toContain('عدد (2) إشعارًا');
    expect(paragraphs[0]).not.toContain('عبر');
    expect(paragraphs[0]).not.toContain('آخرها');
  });

  it('combines contract end and vehicle retention in one paragraph', () => {
    const paragraphs = buildFactsAdditions(
      baseInput({
        vehicleStatus: 'rented',
        contractEndDate: '2026-05-31',
        contractStatus: 'expired',
      }),
    );
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toContain('31/05/2026');
    expect(paragraphs[0]).toContain('في حوزة المدعى عليه');
  });

  it('notes vehicle retention for an ongoing contract', () => {
    const paragraphs = buildFactsAdditions(baseInput({ vehicleStatus: 'rented' }));
    expect(paragraphs).toEqual(['ولا تزال المركبة محل العقد في حوزة المدعى عليه حتى تاريخه.']);
  });

  it('notes that the company received the vehicle back', () => {
    const paragraphs = buildFactsAdditions(baseInput({ vehicleStatus: 'available' }));
    expect(paragraphs).toEqual(['وقد استلمت المدعية المركبة محل العقد من المدعى عليه.']);
  });

  it('mentions the contract end alone when vehicle custody is unknown', () => {
    const paragraphs = buildFactsAdditions(
      baseInput({ contractEndDate: '2026-03-01', contractStatus: 'expired' }),
    );
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toContain('01/03/2026');
    expect(paragraphs[0]).toContain('دون أن يسدد المدعى عليه مستحقاته');
  });

  it('orders paragraphs: payment, violations, notice, then vehicle/contract', () => {
    const paragraphs = buildFactsAdditions(
      baseInput({
        paidTotal: 1000,
        violationsCount: 1,
        violationsFines: 500,
        reminders: { count: 1, lastSentDate: '2026-06-15', sendMethods: ['whatsapp'] },
        vehicleStatus: 'rented',
      }),
    );
    expect(paragraphs).toHaveLength(4);
    expect(paragraphs[0]).toContain('جزءًا');
    expect(paragraphs[1]).toContain('مخالفات مرورية');
    expect(paragraphs[2]).toContain('إشعارًا');
    expect(paragraphs[3]).toContain('حوزة المدعى عليه');
  });
});

describe('buildTaqadiClaims', () => {
  it('builds the minimal claim list for a standard case', () => {
    const claims = buildTaqadiClaims(baseInput());
    expect(claims).toBe(
      '1. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (25,000) ريال قطري.\n'
      + '2. الحكم بفسخ عقد الإيجار.\n'
      + '3. إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.',
    );
  });

  it('adds the violations transfer claim when violations exist', () => {
    const claims = buildTaqadiClaims(baseInput({ violationsCount: 2, violationsFines: 800 }));
    expect(claims).toContain('2. الأمر بتحويل المخالفات المرورية المسجلة على المركبة إلى الرقم الشخصي للمدعى عليه.');
  });

  it('demands vehicle delivery while it remains with the defendant', () => {
    const claims = buildTaqadiClaims(baseInput({ vehicleStatus: 'rented' }));
    expect(claims).toContain('إلزام المدعى عليه بتسليم المركبة محل العقد إلى المدعية.');
  });

  it('omits the delivery claim once the vehicle is returned', () => {
    const claims = buildTaqadiClaims(baseInput({ vehicleStatus: 'available' }));
    expect(claims).not.toContain('تسليم المركبة');
  });

  it('omits the termination claim for an already-cancelled contract', () => {
    const claims = buildTaqadiClaims(baseInput({ contractStatus: 'cancelled' }));
    expect(claims).not.toContain('فسخ عقد الإيجار');
  });

  it('keeps the termination claim when the status is unknown (legacy behavior)', () => {
    const claims = buildTaqadiClaims(baseInput({ contractStatus: null }));
    expect(claims).toContain('الحكم بفسخ عقد الإيجار.');
  });

  it('renumbers claims sequentially as branches are added', () => {
    const claims = buildTaqadiClaims(
      baseInput({
        violationsCount: 1,
        violationsFines: 300,
        vehicleStatus: 'rented',
      }),
    );
    const lines = claims.split('\n');
    expect(lines).toHaveLength(5);
    lines.forEach((line, index) => {
      expect(line.startsWith(`${index + 1}. `)).toBe(true);
    });
    expect(lines[4]).toContain('الرسوم والمصاريف');
  });
});
