import { describe, expect, it } from 'vitest';
import {
  isDangerousNavigationTarget,
  shouldFollowAdvisor,
  toNavigationProposal,
  verifyNavigationTarget,
  type NavigationProposal,
} from '../navigation-advisor';
import type { PortalObservation } from '../portal-observer';

function observation(partial: Partial<PortalObservation>): PortalObservation {
  return {
    capturedAt: '2026-07-30T00:00:00Z',
    url: 'https://taqadi.sjc.gov.qa/home',
    title: '',
    headings: [],
    activeTabs: [],
    buttons: [],
    links: [],
    dialogs: [],
    validationMessages: [],
    controls: [],
    knownValueMatches: [],
    ...partial,
  };
}

function proposal(partial: Partial<NavigationProposal> = {}): NavigationProposal {
  return {
    found: true,
    targetText: 'إدارة القضايا',
    targetKind: 'link',
    confidence: 'high',
    rationale: '',
    ...partial,
  };
}

describe('isDangerousNavigationTarget', () => {
  it('blocks submission, approval, deletion and payment actions', () => {
    expect(isDangerousNavigationTarget('اعتماد نهائي')).toBe(true);
    expect(isDangerousNavigationTarget('تقديم الدعوى')).toBe(true);
    expect(isDangerousNavigationTarget('إرسال')).toBe(true);
    expect(isDangerousNavigationTarget('حذف المسودة')).toBe(true);
    expect(isDangerousNavigationTarget('إلغاء')).toBe(true);
    expect(isDangerousNavigationTarget('سداد الرسوم')).toBe(true);
  });

  it('blocks dangerous words regardless of hamza form', () => {
    expect(isDangerousNavigationTarget('إرسال الطلب')).toBe(true);
    expect(isDangerousNavigationTarget('ارسال الطلب')).toBe(true);
  });

  it('allows safe navigation targets', () => {
    expect(isDangerousNavigationTarget('إدارة القضايا')).toBe(false);
    expect(isDangerousNavigationTarget('التالي')).toBe(false);
    expect(isDangerousNavigationTarget('رجوع')).toBe(false);
  });
});

describe('toNavigationProposal', () => {
  it('parses a complete proposal', () => {
    const parsed = toNavigationProposal({
      found: true,
      targetText: 'إدارة القضايا',
      targetKind: 'link',
      confidence: 'high',
      rationale: 'تقود إلى قائمة المسودات',
    });
    expect(parsed).toEqual({
      found: true,
      targetText: 'إدارة القضايا',
      targetKind: 'link',
      confidence: 'high',
      rationale: 'تقود إلى قائمة المسودات',
    });
  });

  it('forces found=false when the target is unusable', () => {
    expect(toNavigationProposal({
      found: true,
      targetText: '',
      targetKind: 'link',
      confidence: 'high',
      rationale: '',
    })?.found).toBe(false);

    expect(toNavigationProposal({
      found: true,
      targetText: 'زر ما',
      targetKind: 'tab',
      confidence: 'high',
      rationale: '',
    })?.found).toBe(false);
  });

  it('downgrades unknown confidence values to low', () => {
    const parsed = toNavigationProposal({
      found: true,
      targetText: 'إدارة القضايا',
      targetKind: 'link',
      confidence: 'very-high',
      rationale: '',
    });
    expect(parsed?.confidence).toBe('low');
  });

  it('returns null for non-object payloads', () => {
    expect(toNavigationProposal(null)).toBeNull();
    expect(toNavigationProposal('x')).toBeNull();
  });
});

describe('verifyNavigationTarget', () => {
  it('verifies an exact visible link match', () => {
    const result = verifyNavigationTarget(
      proposal(),
      observation({ links: ['الرئيسية', 'إدارة القضايا'] }),
    );
    expect(result.verified).toBe(true);
    expect(result.targetText).toBe('إدارة القضايا');
  });

  it('matches despite hamza differences in the visible text', () => {
    const result = verifyNavigationTarget(
      proposal({ targetText: 'ادارة القضايا' }),
      observation({ links: ['إدارة القضايا'] }),
    );
    expect(result.verified).toBe(true);
  });

  it('rejects targets absent from the visible pool', () => {
    const result = verifyNavigationTarget(
      proposal(),
      observation({ links: ['الرئيسية'] }),
    );
    expect(result.verified).toBe(false);
  });

  it('rejects buttons looked up in the links pool and vice versa', () => {
    const result = verifyNavigationTarget(
      proposal({ targetKind: 'button' }),
      observation({ links: ['إدارة القضايا'], buttons: ['حفظ'] }),
    );
    expect(result.verified).toBe(false);
  });

  it('rejects dangerous targets even when visible', () => {
    const result = verifyNavigationTarget(
      proposal({ targetText: 'اعتماد نهائي', targetKind: 'button' }),
      observation({ buttons: ['اعتماد نهائي'] }),
    );
    expect(result.verified).toBe(false);
  });
});

describe('shouldFollowAdvisor', () => {
  const verified = {
    verified: true,
    targetText: 'إدارة القضايا',
    targetKind: 'link' as const,
    reason: '',
  };

  it('follows only high-confidence verified proposals', () => {
    expect(shouldFollowAdvisor(proposal(), verified)).toBe(true);
  });

  it('refuses medium confidence', () => {
    expect(shouldFollowAdvisor(proposal({ confidence: 'medium' }), verified)).toBe(false);
  });

  it('refuses unverified targets', () => {
    expect(
      shouldFollowAdvisor(proposal(), { ...verified, verified: false }),
    ).toBe(false);
  });
});
