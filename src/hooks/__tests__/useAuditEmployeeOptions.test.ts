import { describe, expect, it } from 'vitest';

import { mapAuditEmployeeOptions } from '../useAuditEmployeeOptions';

describe('mapAuditEmployeeOptions', () => {
  it('prefers Arabic employee names and keeps the auth user id for filtering', () => {
    const options = mapAuditEmployeeOptions([
      {
        id: 'profile-1',
        user_id: 'auth-1',
        first_name: 'Khamis',
        last_name: 'Mohammed',
        first_name_ar: 'خميس',
        last_name_ar: 'محمد',
        email: 'khamis@example.com',
        role: 'employee',
      },
    ]);

    expect(options).toEqual([
      {
        id: 'profile-1',
        userId: 'auth-1',
        name: 'خميس محمد',
        email: 'khamis@example.com',
        role: 'employee',
      },
    ]);
  });

  it('falls back to the profile email when no employee name exists', () => {
    expect(mapAuditEmployeeOptions([
      {
        id: 'profile-2',
        user_id: 'auth-2',
        first_name: null,
        last_name: null,
        first_name_ar: null,
        last_name_ar: null,
        email: 'finance@example.com',
        role: 'admin',
      },
    ])[0].name).toBe('finance@example.com');
  });
});
