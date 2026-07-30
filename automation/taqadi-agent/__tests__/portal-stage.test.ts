import { describe, expect, it } from 'vitest';
import { classifyPortalStage } from '../portal-stage';

const noSignals = {
  login: false,
  classification: false,
  caseDetails: false,
  parties: false,
  documents: false,
  review: false,
};

describe('Taqadi portal stage detection', () => {
  it('detects a manually opened case details page', () => {
    expect(classifyPortalStage({
      ...noSignals,
      caseDetails: true,
    })).toEqual({
      stage: 'case_details',
      label: 'تفاصيل الدعوى',
      confidence: 'high',
    });
  });

  it('prefers an active party pane over broad review text', () => {
    expect(classifyPortalStage({
      ...noSignals,
      parties: true,
      review: true,
    })).toMatchObject({
      stage: 'parties',
      confidence: 'low',
    });
  });

  it('does not guess when no known page signal is visible', () => {
    expect(classifyPortalStage(noSignals)).toEqual({
      stage: 'unknown',
      label: 'صفحة غير معروفة',
      confidence: 'low',
    });
  });
});
