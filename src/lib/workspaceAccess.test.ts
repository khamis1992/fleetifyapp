import { describe, expect, it } from 'vitest';

import { canAccessWorkspaceOnlyPath } from './workspaceAccess';

describe('canAccessWorkspaceOnlyPath', () => {
  it('allows an employee to open an assigned verification task', () => {
    expect(canAccessWorkspaceOnlyPath('/legal/verify/task-id')).toBe(true);
  });

  it('does not grant access to the rest of the legal module', () => {
    expect(canAccessWorkspaceOnlyPath('/legal/delinquency')).toBe(false);
    expect(canAccessWorkspaceOnlyPath('/legal/cases')).toBe(false);
  });
});
