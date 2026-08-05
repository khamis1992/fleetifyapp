import { describe, expect, it } from 'vitest';
import type { PortalObservation } from '../portal-observer';
import { inferPortalStage } from '../portal-stage';

const observation = (
  overrides: Partial<PortalObservation>,
): PortalObservation => ({
  capturedAt: '2026-07-30T00:00:00.000Z',
  url: 'https://taqadi.sjc.gov.qa/itc/home#/itc/f/caseinfo/create',
  title: 'تقاضي',
  headings: [],
  activeTabs: [],
  buttons: ['التالي'],
  links: [],
  dialogs: [],
  validationMessages: [],
  controls: [],
  knownValueMatches: [],
  ...overrides,
});

describe('semantic Taqadi page inference', () => {
  it('recognizes classification from stable control identities', () => {
    const result = inferPortalStage(observation({
      headings: ['تصنيف الدعوى'],
      controls: [
        {
          tag: 'select',
          type: 'select-one',
          id: 'tempctype_court',
          name: 'tempctype_court',
          role: 'combobox',
          label: 'درجة التقاضي',
          required: true,
          invalid: false,
          disabled: false,
          hasValue: false,
        },
        {
          tag: 'select',
          type: 'select-one',
          id: 'tempctype_category',
          name: 'tempctype_category',
          role: 'combobox',
          label: 'نوع الدعوى',
          required: true,
          invalid: false,
          disabled: false,
          hasValue: false,
        },
      ],
    }));

    expect(result).toMatchObject({
      stage: 'case_classification',
      confidence: 'high',
    });
    expect(result.evidence).toContain('litigation_degree_control');
  });

  it('prefers the active documents page over review text in the shell', () => {
    const result = inferPortalStage(observation({
      activeTabs: ['المستندات'],
      headings: ['مستندات الدعوى'],
      controls: [{
        tag: 'input',
        type: 'file',
        id: 'documentFile',
        name: 'documentFile',
        role: null,
        label: 'رفع ملف',
        required: true,
        invalid: false,
        disabled: false,
        hasValue: false,
      }],
      knownValueMatches: ['caseTitle', 'contractNumber'],
    }));

    expect(result).toMatchObject({
      stage: 'documents',
      confidence: 'high',
    });
  });

  it('uses the case values as evidence for the final review', () => {
    const result = inferPortalStage(observation({
      headings: ['مراجعة الدعوى'],
      buttons: ['اعتماد نهائي'],
      knownValueMatches: ['caseTitle', 'defendantName', 'contractNumber'],
    }));

    expect(result).toMatchObject({
      stage: 'review',
      confidence: 'high',
    });
  });

  it('recognizes the filing receipt after final approval', () => {
    const result = inferPortalStage(observation({
      pageKind: 'receipt',
      headings: ['إشعار تقديم الطلب'],
      buttons: ['عرض الدعوى', 'طباعة'],
      activePanels: ['إيصال طلب قيد دعوى رقم المرجع 20260010935'],
    }));

    expect(result).toMatchObject({
      stage: 'receipt',
      confidence: 'high',
    });
    expect(result.evidence).toContain('filing_receipt');
  });

  it('recognizes the fee details step between documents and final review', () => {
    const result = inferPortalStage(observation({
      headings: ['دعوى'],
      links: ['المستندات', 'تفاصيل الرسوم', 'ملخص الدعوى', 'التالي'],
      activePanels: ['tab-437-pane fee_details تفاصيل الرسوم'],
      activeWizardSteps: ['تفاصيل الرسوم'],
    }));

    expect(result).toMatchObject({
      stage: 'fees',
      confidence: 'high',
    });
    expect(result.evidence).toContain('active_wizard_step');
  });

  it('returns unknown instead of guessing from a generic next button', () => {
    expect(inferPortalStage(observation({}))).toMatchObject({
      stage: 'unknown',
      confidence: 'low',
    });
  });

  // Regression: job 2306577d failed on 2026-07-30 — the wizard side-nav lists
  // every stage name on every page, so parties/review text outscored the
  // actual classification page (Kendo listboxes without ids).
  it('recognizes classification despite wizard nav poisoning and id-less Kendo listboxes', () => {
    const result = inferPortalStage(observation({
      buttons: [],
      headings: ['دعوى'],
      links: [
        '34', 'English', 'خميس الجبر', 'لوحة المهام', 'التقويم',
        'ادارة الدعاوى', 'الطلبات العامة', 'طلبات الدعاوى', 'الدعاوى المتداولة',
        'جميع الدعاوى', 'نوع الدعوى', 'تفاصيل الدعوى', 'اطراف الدعوى',
        'المستندات', 'تفاصيل الرسوم', 'ملخص الدعوى',
        'السابق', 'حفظ', 'إلغاء', 'التالي',
      ],
      controls: [
        {
          tag: 'span', type: null, id: null, name: null, role: 'listbox',
          label: 'درجة التقاضي *', required: false, invalid: false,
          disabled: false, hasValue: false, visible: true,
        },
        {
          tag: 'span', type: null, id: null, name: null, role: 'listbox',
          label: 'النوع *', required: false, invalid: false,
          disabled: false, hasValue: false, visible: true,
        },
        {
          tag: 'span', type: null, id: null, name: null, role: 'listbox',
          label: 'النوع الفرعي *', required: false, invalid: false,
          disabled: true, hasValue: false, visible: true,
        },
        {
          tag: 'span', type: null, id: null, name: null, role: 'listbox',
          label: 'الموضوع الفرعي *', required: false, invalid: false,
          disabled: true, hasValue: false, visible: true,
        },
      ],
    }));

    expect(result).toMatchObject({
      stage: 'case_classification',
      confidence: 'high',
    });
    expect(result.evidence).toContain('litigation_degree_label');
  });

  it('finds hidden Kendo backing selects by id for classification', () => {
    const result = inferPortalStage(observation({
      headings: ['دعوى'],
      controls: [
        {
          tag: 'select', type: 'select-one', id: 'tempctype_court',
          name: 'tempctype_court', role: null, label: '',
          required: false, invalid: false, disabled: false,
          hasValue: false, visible: false,
        },
        {
          tag: 'select', type: 'select-one', id: 'tempctype_category',
          name: 'tempctype_category', role: null, label: '',
          required: false, invalid: false, disabled: false,
          hasValue: false, visible: false,
        },
        {
          tag: 'span', type: null, id: null, name: null, role: 'listbox',
          label: 'درجة التقاضي *', required: false, invalid: false,
          disabled: false, hasValue: false, visible: true,
        },
      ],
    }));

    expect(result).toMatchObject({
      stage: 'case_classification',
      confidence: 'high',
    });
    expect(result.evidence).toContain('litigation_degree_control');
  });

  it('does not treat nav links as review evidence on a non-review page', () => {
    const result = inferPortalStage(observation({
      links: ['ملخص الدعوى', 'اعتماد نهائي', 'مراجعة الدعوى'],
      controls: [],
    }));

    expect(result.stage).not.toBe('review');
  });

  // Regression: job 2306577d — after saving case details Taqadi lands on
  // parties with only the "إضافة طرف" button; score was 7/low and the agent
  // refused the transition even though actualStage was already parties.
  it('recognizes parties page from add-party button without active tab', () => {
    const result = inferPortalStage(observation({
      headings: ['دعوى'],
      buttons: ['إضافة طرف', 'مسح الفلاتر', 'select'],
      activeTabs: [],
      links: [
        'ادارة الدعاوى', 'نوع الدعوى', 'تفاصيل الدعوى', 'اطراف الدعوى',
        'المستندات', 'تفاصيل الرسوم', 'ملخص الدعوى',
        'الاسم', 'الفئة', 'النوع', 'الترتيب حسب صحيفة الدعوى',
      ],
      controls: [],
    }));

    expect(result).toMatchObject({
      stage: 'parties',
      confidence: 'high',
    });
    expect(result.evidence).toEqual(
      expect.arrayContaining(['add_party_button']),
    );
    expect(result.score || 0).toBeGreaterThanOrEqual(8);
  });

  it('recognizes the authenticated home page instead of requesting a human', () => {
    const result = inferPortalStage(observation({
      url: 'https://taqadi.sjc.gov.qa/itc/home',
      pageKind: 'home',
      buttons: ['لوحة المهام', 'إنشاء دعوى'],
      links: ['إدارة الدعاوى'],
    }));

    expect(result).toMatchObject({
      stage: 'home',
      confidence: 'high',
    });
    expect(result.evidence).toContain('authenticated_home');
  });

  it('uses the selected 60 percent wizard marker to recognize documents', () => {
    const result = inferPortalStage(observation({
      headings: ['دعوى', 'المستندات'],
      activeWizardSteps: ['60% المستندات'],
      buttons: ['إضافة وثيقة', 'مسح الفلاتر', 'التالي'],
      activePanels: ['case_documents_grid المستندات'],
      controls: [],
    }));

    expect(result).toMatchObject({
      stage: 'documents',
      confidence: 'high',
    });
    expect(result.evidence).toContain('active_wizard_step');
  });
});
