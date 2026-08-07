import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const reviewSource = readFileSync(
  resolve(process.cwd(), 'src/components/customers/CustomerDataReviewCenter.tsx'),
  'utf8',
);
const proposalHookSource = readFileSync(
  resolve(process.cwd(), 'src/hooks/useCustomerIdProposals.ts'),
  'utf8',
);

describe('customer data review manual editing', () => {
  it('renders an editable value for every proposed field', () => {
    expect(reviewSource).toContain('editedValues');
    expect(reviewSource).toContain('من البطاقة - قابل للتعديل');
    expect(reviewSource).toContain('استعادة قراءة البطاقة');
  });

  it('automatically selects a field when its value is edited', () => {
    expect(reviewSource).toContain('setSelected((current) => new Set(current).add(change.field))');
  });

  it('applies and audits the manual value instead of the OCR proposal', () => {
    expect(proposalHookSource).toContain("method: 'manual' as const");
    expect(proposalHookSource).toContain('original_proposed_changes: proposal.proposed_changes');
    expect(proposalHookSource).toContain('applied_values: appliedManualValues');
  });
});
