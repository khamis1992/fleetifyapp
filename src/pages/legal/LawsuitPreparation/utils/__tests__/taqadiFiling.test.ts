import { describe, expect, it } from 'vitest';
import {
  extractTaqadiFilingDetails,
  selectCurrentLegalCase,
  type LawsuitLegalCase,
} from '../taqadiFiling';

const legalCase = (
  id: string,
  status: string,
  createdAt: string,
): LawsuitLegalCase => ({
  id,
  case_number: `CASE-${id}`,
  case_status: status,
  workflow_stage: 'preparation',
  case_reference: null,
  court_fees: null,
  filing_date: null,
  created_at: createdAt,
});

describe('taqadi filing helpers', () => {
  it('extracts filing metadata from a nested automation response', () => {
    expect(extractTaqadiFilingDetails({
      success: true,
      data: {
        case_number: '20260010515',
        reference_number: 'REF-2026-10515',
        court_fees: 'QAR 3,000.00',
      },
    })).toEqual({
      caseNumber: '20260010515',
      referenceNumber: 'REF-2026-10515',
      courtFees: 3000,
    });
  });

  it('uses the Taqadi case number as the reference when no separate reference exists', () => {
    expect(extractTaqadiFilingDetails({
      success: true,
      result: { caseNumber: 20260010515 },
    })).toEqual({
      caseNumber: '20260010515',
      referenceNumber: '20260010515',
      courtFees: null,
    });
  });

  it('prefers a live case over a newer closed case', () => {
    const closed = legalCase('closed', 'closed', '2026-07-28T10:00:00Z');
    const active = legalCase('active', 'active', '2026-07-20T10:00:00Z');

    expect(selectCurrentLegalCase([closed, active])?.id).toBe('active');
  });
});
