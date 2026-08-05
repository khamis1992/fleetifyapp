import { describe, expect, it } from 'vitest';
import { planPortalAction, stageReached } from '../adaptive-flow';
import type { TaqadiPortalPosition } from '../portal-stage';

const position = (
  overrides: Partial<TaqadiPortalPosition>,
): TaqadiPortalPosition => ({
  stage: 'unknown',
  label: 'صفحة غير معروفة',
  confidence: 'low',
  score: 0,
  evidence: [],
  url: 'https://taqadi.sjc.gov.qa/itc/home',
  validationMessages: [],
  ...overrides,
});

describe('adaptive Taqadi flow planning', () => {
  it('recovers from the authenticated home page by opening a new case', () => {
    expect(planPortalAction(position({
      stage: 'home',
      label: 'الصفحة الرئيسية لتقاضي',
      confidence: 'high',
      score: 18,
      evidence: ['authenticated_home'],
    }))).toMatchObject({
      action: 'open_new_case',
      expectedStage: 'case_classification',
      safeToRun: true,
    });
  });

  it('plans one action from the page that is actually visible', () => {
    expect(planPortalAction(position({
      stage: 'parties',
      label: 'أطراف الدعوى',
      confidence: 'high',
      score: 14,
      evidence: ['active_parties_tab'],
    }))).toMatchObject({
      action: 'process_parties',
      currentStage: 'parties',
      expectedStage: 'documents',
      safeToRun: true,
    });
  });

  it('does not act when the page identity is ambiguous with a close runner-up', () => {
    expect(planPortalAction(position({
      stage: 'case_details',
      label: 'تفاصيل الدعوى',
      confidence: 'low',
      score: 7,
      candidates: [
        { stage: 'case_details', score: 7, evidence: ['details_text'] },
        { stage: 'parties', score: 6, evidence: ['parties_text'] },
      ],
    }))).toMatchObject({
      action: 'fill_case_details',
      safeToRun: false,
    });
  });

  it('acts on uncontested parties page even with moderate score (post case_details save)', () => {
    expect(planPortalAction(position({
      stage: 'parties',
      label: 'أطراف الدعوى',
      confidence: 'low',
      score: 7,
      evidence: ['parties_text'],
      candidates: [
        { stage: 'parties', score: 7, evidence: ['parties_text'] },
      ],
    }))).toMatchObject({
      action: 'process_parties',
      expectedStage: 'documents',
      safeToRun: true,
    });
  });

  it('accepts a later stage when Taqadi skips an intermediate screen', () => {
    expect(stageReached('review', 'documents')).toBe(true);
    expect(stageReached('case_details', 'parties')).toBe(false);
  });

  it('recovers an already-issued receipt without submitting again', () => {
    expect(planPortalAction(position({
      stage: 'receipt',
      label: 'إيصال قيد الدعوى',
      confidence: 'high',
      score: 20,
      evidence: ['filing_receipt'],
    }))).toMatchObject({
      action: 'recover_receipt',
      expectedStage: null,
      safeToRun: true,
    });
  });
});
