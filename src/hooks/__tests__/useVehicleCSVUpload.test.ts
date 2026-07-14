import { describe, expect, it } from 'vitest';

import {
  parseVehicleCSV,
  prepareVehicleRow,
} from '../useVehicleCSVUpload';

describe('vehicle CSV import helpers', () => {
  it('parses quoted commas without shifting vehicle columns', () => {
    const rows = parseVehicleCSV(
      'plate_number,make,model,year,notes\n"abc 123",Toyota,Camry,2024,"Clean, inspected"'
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].plate_number).toBe('abc 123');
    expect(rows[0].notes).toBe('Clean, inspected');
    expect(rows[0].rowNumber).toBe(2);
  });

  it('normalizes plates and maps the legacy reserved status to the database enum', () => {
    const result = prepareVehicleRow(
      {
        plate_number: ' qa  123 ',
        make: 'Toyota',
        model: 'Camry',
        year: '2024',
        status: 'reserved',
      },
      'company-1',
      2
    );

    expect(result.errors).toEqual([]);
    expect(result.vehicle?.payload.plate_number).toBe('QA 123');
    expect(result.vehicle?.payload.status).toBe('reserved_employee');
    expect(result.vehicle?.payload.company_id).toBe('company-1');
  });

  it('rejects invalid dates, negative prices, and unsupported statuses', () => {
    const result = prepareVehicleRow(
      {
        plate_number: 'QA-999',
        make: 'Toyota',
        model: 'Camry',
        year: '2024',
        status: 'unknown-status',
        insurance_expiry: '2026-02-31',
        daily_rate: '-1',
      },
      'company-1',
      2
    );

    expect(result.vehicle).toBeNull();
    expect(result.errors.join(' ')).toContain('حالة المركبة غير مدعومة');
    expect(result.errors.join(' ')).toContain('تاريخ انتهاء التأمين غير صالح');
    expect(result.errors.join(' ')).toContain('السعر اليومي يجب ألا يقل عن 0');
  });
});
