import type { Page } from 'playwright';
import type { FilingPayload } from './types';

export interface ObservedControl {
  tag: string;
  type: string | null;
  id: string | null;
  name: string | null;
  role: string | null;
  label: string;
  required: boolean;
  invalid: boolean;
  disabled: boolean;
  hasValue: boolean;
  /** false للحقول المخفية خلف ودجات Kendo (تبقى مفيدة لمطابقة المعرفات) */
  visible?: boolean;
}

export interface PortalObservation {
  capturedAt: string;
  url: string;
  title: string;
  headings: string[];
  activeTabs: string[];
  buttons: string[];
  links: string[];
  dialogs: string[];
  validationMessages: string[];
  controls: ObservedControl[];
  knownValueMatches: string[];
  /** High-level shell identity, independent from the current wizard step. */
  pageKind?: 'login' | 'account_prompt' | 'home' | 'case_wizard' | 'unknown';
  /** Visible wizard step selected by Taqadi (for example 60% / المستندات). */
  activeWizardSteps?: string[];
  /** Identity/text of the currently rendered content pane, excluding side navigation. */
  activePanels?: string[];
}

const unique = (values: string[]) =>
  [...new Set(values.map((value) => value.replace(/\s+/g, ' ').trim())
    .filter(Boolean))];

export async function observeTaqadiPage(
  page: Page,
  payload?: FilingPayload,
): Promise<PortalObservation> {
  const knownValues = payload
    ? {
        caseTitle: payload.case.title,
        defendantName: payload.defendant.fullName,
        contractNumber: payload.contract.number,
      }
    : {};

  const snapshot = await page.evaluate((expectedValues) => {
    const visible = (element: Element) => {
      const node = element as HTMLElement;
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    };
    const text = (element: Element | null) =>
      (element?.textContent || '').replace(/\s+/g, ' ').trim();
    const visibleTexts = (selector: string, limit = 80) =>
      Array.from(document.querySelectorAll(selector))
        .filter(visible)
        .map(text)
        .filter(Boolean)
        .slice(0, limit);
    const normalized = (value: string) => value.replace(/\s+/g, ' ').trim();
    const labelFor = (element: Element) => {
      const control = element as HTMLInputElement;
      const ariaLabel = control.getAttribute('aria-label');
      const labelledBy = control.getAttribute('aria-labelledby');
      const labelledText = labelledBy
        ? labelledBy
          .split(/\s+/)
          .map((id) => text(document.getElementById(id)))
          .filter(Boolean)
          .join(' ')
        : '';
      const explicitLabel = control.id
        ? text(document.querySelector(`label[for="${CSS.escape(control.id)}"]`))
        : '';
      const wrappingLabel = text(control.closest('label'));
      const groupText = text(
        control.closest(
          '.form-group, .field, .control-group, td, [role="group"]',
        )?.querySelector('label, .control-label, .field-label') || null,
      );
      return ariaLabel
        || labelledText
        || explicitLabel
        || wrappingLabel
        || groupText
        || control.getAttribute('placeholder')
        || '';
    };
    // Taqadi renders its dropdowns and numeric fields with Kendo, which hides
    // the original <select>/<input> that carries the stable id and shows a
    // `.k-widget` wrapper in its place. Filtering on the element's own
    // visibility would therefore drop exactly the ids the stage inference
    // relies on, so a hidden control counts as observable while its widget
    // wrapper is on screen (same rule as visibleWidgetForInput).
    const kendoWrapperSelector = '.k-widget, .k-dropdown, .k-combobox, '
      + '.k-numerictextbox, .k-datepicker, .k-datetimepicker, '
      + '.k-timepicker, .k-multiselect';
    const controlObservable = (element: Element) => {
      if (visible(element)) return true;
      const wrapper = element.closest(kendoWrapperSelector);
      return Boolean(wrapper && visible(wrapper));
    };
    const controls = Array.from(document.querySelectorAll(
      'input:not([type="hidden"]), textarea, select, '
      + '[role="combobox"], [role="listbox"], [aria-haspopup="listbox"]',
    ))
      .filter(controlObservable)
      .slice(0, 250)
      .map((element) => {
        const control = element as HTMLInputElement;
        // A Kendo widget wrapper carries no id of its own but points at the
        // backing control through `aria-owns="<id>_listbox"` — the same
        // identity fieldByControlIds resolves against.
        const ownedListbox = control.id
          ? null
          : (element.getAttribute('aria-owns') || '').match(/^(.+)_listbox$/);
        return {
          tag: element.tagName.toLowerCase(),
          type: control.type || null,
          id: control.id || (ownedListbox ? ownedListbox[1] : null),
          name: control.name || null,
          role: element.getAttribute('role'),
          label: labelFor(element).replace(/\s+/g, ' ').trim(),
          required: control.required
            || element.getAttribute('aria-required') === 'true',
          invalid: element.getAttribute('aria-invalid') === 'true'
            || element.classList.contains('input-validation-error'),
          disabled: control.disabled
            || element.getAttribute('aria-disabled') === 'true',
          hasValue: Boolean(control.value?.trim()),
          visible: visible(element),
        };
      });
    const bodyText = (document.body?.innerText || '')
      .replace(/\s+/g, ' ')
      .trim();
    const knownValueMatches = Object.entries(expectedValues)
      .filter(([, value]) =>
        typeof value === 'string' && value.length > 0 && bodyText.includes(value))
      .map(([key]) => key);

    const currentUrl = window.location.href;
    const hasCaseWizardUrl = /#\/itc\/f\/caseinfo\/create/i.test(currentUrl);
    const activePanels = Array.from(document.querySelectorAll(
      '.tab-pane.active, [data-tabpane-name].active, '
      + '[role="tabpanel"][aria-hidden="false"], .k-content.k-state-active',
    ))
      .filter(visible)
      .map((element) => {
        const identity = [
          element.id,
          element.getAttribute('data-tabpane-name'),
          text(element.querySelector('h1, h2, h3, legend, .panel-title')),
        ].filter(Boolean).join(' ');
        return normalized(identity || text(element).slice(0, 180));
      })
      .filter(Boolean)
      .slice(0, 20);

    // The case wizard keeps all step names in the DOM. Only the selected
    // marker (class/aria state or highlighted percentage circle) identifies
    // the page that the user can actually see.
    const wizardCandidates = Array.from(document.querySelectorAll(
      '[aria-current="step"], [class*="step"], [class*="wizard"] li, '
      + '[class*="progress"] li, [class*="progress"] [class*="item"]',
    )).filter(visible);
    const activeWizardSteps = wizardCandidates
      .filter((element) => {
        const className = String(element.getAttribute('class') || '').toLowerCase();
        const ariaCurrent = element.getAttribute('aria-current');
        const ariaSelected = element.getAttribute('aria-selected');
        if (ariaCurrent === 'step' || ariaSelected === 'true') return true;
        if (/(^|\s)(active|current|selected|in-progress|k-state-selected)(\s|$)/.test(className)) {
          return true;
        }
        const percentage = normalized(text(element)).match(/(?:^|\s)(0|20|40|60|80|100)%/);
        if (!percentage) return false;
        const circle = element.querySelector(
          '[class*="circle"], [class*="percent"], [class*="number"], .active, .current',
        ) as HTMLElement | null;
        if (!circle || !visible(circle)) return false;
        const style = window.getComputedStyle(circle);
        const background = style.backgroundColor;
        return background !== 'rgba(0, 0, 0, 0)'
          && background !== 'transparent'
          && background !== 'rgb(169, 169, 169)';
      })
      .map((element) => normalized(text(element)))
      .filter(Boolean)
      .slice(0, 10);

    const hasPassword = controls.some((control) => control.type === 'password');
    const pageKind = /\/nas\/user\/prompt/i.test(currentUrl)
      ? 'account_prompt'
      : (/\/login(?:[/?#]|$)/i.test(currentUrl) || hasPassword)
        ? 'login'
        : hasCaseWizardUrl || activeWizardSteps.length > 0
          ? 'case_wizard'
          : /\/itc\/home(?:[/?#]|$)/i.test(currentUrl)
            ? 'home'
            : 'unknown';

    return {
      title: document.title || '',
      headings: visibleTexts('h1, h2, h3, [role="heading"]', 40),
      activeTabs: visibleTexts(
        '.active[role="tab"], .nav-tabs .active, .tab.active, '
        + '[aria-selected="true"]',
        30,
      ),
      buttons: visibleTexts(
        'button, input[type="submit"], input[type="button"], [role="button"]',
        100,
      ),
      links: visibleTexts('a[href], [role="link"]', 80),
      dialogs: visibleTexts(
        '[role="dialog"], .modal.show, .modal.in, .k-window',
        20,
      ),
      validationMessages: visibleTexts(
        '.has-error, .field-validation-error, .help-block, '
        + '.mandatory-error, .validation-summary-errors, '
        + '[aria-invalid="true"] + span, [role="alert"]',
        30,
      ),
      controls,
      knownValueMatches,
      pageKind,
      activeWizardSteps,
      activePanels,
    };
  }, knownValues);

  return {
    capturedAt: new Date().toISOString(),
    url: page.url(),
    title: snapshot.title,
    headings: unique(snapshot.headings),
    activeTabs: unique(snapshot.activeTabs),
    buttons: unique(snapshot.buttons),
    links: unique(snapshot.links),
    dialogs: unique(snapshot.dialogs),
    validationMessages: unique(snapshot.validationMessages),
    controls: snapshot.controls,
    knownValueMatches: snapshot.knownValueMatches,
    pageKind: snapshot.pageKind as PortalObservation['pageKind'],
    activeWizardSteps: unique(snapshot.activeWizardSteps),
    activePanels: unique(snapshot.activePanels),
  };
}

export function summarizeObservation(observation: PortalObservation) {
  return {
    ...observation,
    buttons: observation.buttons.slice(0, 30),
    links: observation.links.slice(0, 30),
  };
}
