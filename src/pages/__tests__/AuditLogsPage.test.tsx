import { describe, expect, it } from 'vitest';
import { FileText, User } from 'lucide-react';

import {
  getAuditActionPresentation,
  getAuditLogStats,
  getAuditUserInitials,
} from '../auditLogPresentation';
import type { AuditLog } from '@/types/auditLog';

describe('getAuditActionPresentation', () => {
  it('normalizes known audit actions before resolving their icon', () => {
    expect(getAuditActionPresentation('login').ActionIcon).toBe(User);
  });

  it('uses a safe fallback for actions that are not in the UI map', () => {
    const presentation = getAuditActionPresentation('daily_audit_agent_run');

    expect(presentation.ActionIcon).toBe(FileText);
    expect(presentation.actionColor).toContain('bg-slate-100');
  });

  it('builds initials from an employee name or email', () => {
    expect(getAuditUserInitials('خميس محمد', null)).toBe('خم');
    expect(getAuditUserInitials(null, 'finance.admin@example.com')).toBe('FA');
  });

  it('summarizes visible audit activity for the stats cards', () => {
    const logs = [
      { status: 'success', user_email: 'a@example.com' },
      { status: 'success', user_email: 'b@example.com' },
      { status: 'failed', user_email: 'a@example.com' },
    ] as AuditLog[];

    expect(getAuditLogStats(logs)).toEqual({
      total: 3,
      successful: 2,
      failed: 1,
      employees: 2,
    });
  });
});
