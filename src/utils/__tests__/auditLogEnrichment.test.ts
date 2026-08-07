import { describe, expect, it } from 'vitest';

import type { AuditLog } from '@/types/auditLog';
import {
  deriveAuditChangesSummary,
  deriveAuditEntityName,
  getAuditResourceAliases,
  normalizeAuditResourceType,
} from '../auditLogEnrichment';

describe('auditLogEnrichment', () => {
  it('normalizes trigger table names to the audit resource type', () => {
    expect(normalizeAuditResourceType('payments')).toBe('payment');
    expect(getAuditResourceAliases('payment')).toEqual(['payment', 'payments']);
  });

  it('derives the entity name from payment values stored by the trigger', () => {
    const log = {
      action: 'payments_updated',
      resource_type: 'payments',
      new_values: { payment_number: 'PAY-2026-001' },
    } as AuditLog;

    expect(deriveAuditEntityName(log)).toBe('PAY-2026-001');
  });

  it('creates an Arabic change summary from changed values', () => {
    const log = {
      action: 'payments_updated',
      resource_type: 'payments',
      old_values: { payment_status: 'pending', amount: 100 },
      new_values: { payment_status: 'paid', amount: 100, payment_number: 'PAY-001' },
      metadata: { changed_fields: { payment_status: 'paid' } },
    } as AuditLog;

    expect(deriveAuditChangesSummary(log)).toBe(
      'تم تحديث دفعة PAY-001 — حالة الدفع: pending ← paid'
    );
  });
});
