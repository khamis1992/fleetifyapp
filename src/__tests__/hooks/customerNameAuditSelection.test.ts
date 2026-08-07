import { describe, expect, it } from 'vitest';
import { selectAuditedNameCandidate } from '@/hooks/useCustomerIdProposals';

describe('customer contract name audit selection', () => {
  it('selects the high-confidence name supported by more contract evidence', () => {
    const selected = selectAuditedNameCandidate([
      {
        firstName: 'نبيل',
        lastName: 'عوض قسم فرج الله',
        confidence: 0.95,
        proposalIds: ['contract-copy', 'id-card'],
      },
      {
        firstName: 'نبيل',
        lastName: 'عوض قسم فرج',
        confidence: 0.95,
        proposalIds: ['unclear-scan'],
      },
    ]);

    expect(selected?.lastName).toBe('عوض قسم فرج الله');
  });

  it('requires human review when different names have equally strong evidence', () => {
    const selected = selectAuditedNameCandidate([
      {
        firstName: 'عمر',
        lastName: 'محمد الجمعي مرايحي',
        confidence: 0.95,
        proposalIds: ['contract-copy'],
      },
      {
        firstName: 'عمر',
        lastName: 'محمد الجمعي مرائحي',
        confidence: 0.95,
        proposalIds: ['id-card'],
      },
    ]);

    expect(selected).toBeNull();
  });

  it('does not auto-apply a single low-confidence OCR reading', () => {
    const selected = selectAuditedNameCandidate([
      {
        firstName: 'عمر',
        lastName: 'محمد',
        confidence: 0.85,
        proposalIds: ['single-scan'],
      },
    ]);

    expect(selected).toBeNull();
  });
});
