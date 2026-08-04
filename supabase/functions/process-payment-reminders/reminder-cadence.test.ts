import { describe, expect, it } from 'vitest';
import { getOverdueReminderType } from './reminder-cadence.ts';

describe('payment reminder cadence', () => {
  it('reminds on days 1, 3 and 7, then weekly', () => {
    expect(getOverdueReminderType(1)).toBe('overdue_day_1');
    expect(getOverdueReminderType(3)).toBe('overdue_day_3');
    expect(getOverdueReminderType(7)).toBe('overdue_day_7');
    expect(getOverdueReminderType(14)).toBe('overdue_week_2');
    expect(getOverdueReminderType(21)).toBe('overdue_week_3');
  });

  it('does not send on every overdue day', () => {
    for (const day of [0, 2, 4, 5, 6, 8, 9, 13, 15, 20]) {
      expect(getOverdueReminderType(day)).toBeNull();
    }
  });
});
