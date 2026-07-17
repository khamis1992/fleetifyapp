import { describe, expect, it } from 'vitest';

import { TrafficViolationRegexParser } from '../../../supabase/functions/extract-traffic-violations/regex-parser';

describe('TrafficViolationRegexParser MOI English reports', () => {
  it('extracts wrapped and compact rows, including a zero-value violation', () => {
    const text = `
1 3301740845 2026-07-12
 17:49
007054/LIMOUSI
NE
Zone 52 Street
350
EXCEEDING THE SPEED LIMIT (ARTICLE 53, ITEM 1)
500.0 0
2 1400105630 2026-06-26
 02:42
002770/LIMOUSI
NE PERMIT FOR REPAIRING
MECHANICAL VEHICLE 100.0 0
3 1700001110 2025-06-25
 04:40
556199/PRIVATE
VEHICLE
Zone 61 Street
831
DRIVING A VEHICLE UNDER THE INFLUENCE OF ALCOHOL
0.0 0
`;

    const result = new TrafficViolationRegexParser(text).extract();

    expect(result.violations).toHaveLength(3);
    expect(result.violations).toEqual([
      expect.objectContaining({
        violation_number: '3301740845',
        plate_number: '007054',
        fine_amount: 500,
        location: 'Zone 52 Street 350',
      }),
      expect.objectContaining({
        violation_number: '1400105630',
        plate_number: '002770',
        fine_amount: 100,
        violation_type: 'PERMIT FOR REPAIRING MECHANICAL VEHICLE',
      }),
      expect.objectContaining({
        violation_number: '1700001110',
        plate_number: '556199',
        fine_amount: 0,
      }),
    ]);
    expect(result.header.total_amount).toBe(600);
  });
});
