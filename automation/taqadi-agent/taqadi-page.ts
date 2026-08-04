import type {
  Locator,
  Page,
  Request,
  Response,
} from 'playwright';
import { agentConfig } from './config';
import { expandFieldLookup } from './selector-overrides';
import { stageReached } from './adaptive-flow';
import {
  observeTaqadiPage,
  summarizeObservation,
} from './portal-observer';
import {
  inferPortalStage,
  type TaqadiPortalPosition,
  type TaqadiPortalStage,
} from './portal-stage';
import {
  HumanInterventionError,
  SubmissionUncertainError,
  type FilingPayload,
  type FilingResult,
  type MaterializedDocument,
} from './types';

const normalizeText = (value: string) =>
  value.replace(/\s+/g, ' ').trim();

const normalizeNumerals = (value: string) =>
  value
    .replace(/[٠-٩]/g, (digit) =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) =>
      String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));

const phoneForTaqadi = (value: string | null | undefined) => {
  let digits = normalizeNumerals(value || '').replace(/\D/g, '');
  if (digits.startsWith('00974')) digits = digits.slice(2);
  if (digits.length === 8) return `974${digits}`;
  return digits;
};

// Taqadi's Kendo mobile widget always keeps the 974 country prefix, so the
// read-back value (11 digits) can never equal a local 8-digit expectation
// verbatim — the stability check must compare normalized local cores.
export const normalizeTaqadiPhone = (value: string | null | undefined) => {
  let digits = normalizeNumerals(value || '').replace(/\D/g, '');
  if (digits.startsWith('00974')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('974')) digits = digits.slice(3);
  return digits;
};

export const defendantFieldValueMatches = (
  key: string,
  currentValue: string | null,
  expectedValue: string,
) => {
  if (key === 'phone') {
    const current = normalizeTaqadiPhone(currentValue);
    const expected = normalizeTaqadiPhone(expectedValue);
    return current.length > 0 && current === expected;
  }
  return normalizeText(currentValue || '') === normalizeText(expectedValue);
};

const numericValuesInText = (value: string) =>
  (normalizeNumerals(value).match(
    /-?\d[\d,٬]*(?:[.٫]\d+)?/g,
  ) || [])
    .map((token) => Number(
      token
        .replace(/[,٬]/g, '')
        .replace(/٫/g, '.'),
    ))
    .filter(Number.isFinite);

const normalizeArabicText = (value: string) =>
  normalizeText(value)
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي');

const identityTypeForTaqadi = (
  idType: string,
  idNumber: string | null,
) => {
  const normalizedType = normalizeArabicText(idType);
  const normalizedIdNumber = (idNumber || '').replace(/\D/g, '');
  const residentAliases = [
    'اقامة',
    'بطاقة مقيم',
    'هوية مقيم',
    'رخصة اقامة',
    'رخصة مقيم',
  ].map(normalizeArabicText);

  if (
    residentAliases.includes(normalizedType)
    || (
      normalizedType === normalizeArabicText('جواز سفر')
      && normalizedIdNumber.length === 11
    )
  ) return 'رخصة مقيم';

  return idType;
};

const taqadiNationalityAliases = new Map(
  [
    ['أردني', 'الأردن'],
    ['إماراتي', 'الامارات العربية المتحدة'],
    ['إيراني', 'إيران، جمهورية إيران الإسلامية'],
    ['باكستاني', 'باكستان'],
    ['بنغلاديشي', 'بنغلاديش'],
    ['تونسي', 'تونس'],
    ['جزائري', 'الجزائر'],
    ['سعودي', 'السعودية'],
    ['سريلانكي', 'سريلانكا'],
    ['سوداني', 'سودان'],
    ['سوري', 'الجمهورية العربية السورية'],
    ['صومالي', 'الصومال'],
    ['عراقي', 'العراق'],
    ['عماني', 'سلطنة عمان'],
    ['فلسطيني', 'دولة فلسطين'],
    ['فلبيني', 'الفلبين'],
    ['قطري', 'قطر'],
    ['كويتي', 'الكويت'],
    ['لبناني', 'لبنان'],
    ['ليبي', 'ليبيا'],
    ['مصري', 'مصر'],
    ['مغربي', 'المغرب'],
    ['نيبالي', 'نيبال'],
    ['هندي', 'الهند'],
    ['يمني', 'اليمن'],
  ].map(([alias, option]) => [normalizeArabicText(alias), option]),
);

const nationalityForTaqadi = (nationality: string) =>
  taqadiNationalityAliases.get(normalizeArabicText(nationality))
  || nationality;

const partyStabilizationMs = process.env.NODE_ENV === 'test'
  ? 0
  : 10_000;
const maxDropdownOptionCount = 500;

type FieldRoot = Page | Locator;

type FieldLookupOptions = {
  exactLabel?: boolean;
  waitForMs?: number;
};

const normalizeFieldLabel = (value: string) =>
  normalizeArabicText(value)
    .replace(/[*＊]/g, '')
    .replace(/[:：]\s*$/g, '')
    .trim();

const fieldControlSelector = [
  'input:not([type="hidden"]):not([type="file"])',
  'textarea',
  'select',
  '[role="combobox"]',
  '[role="listbox"]',
  '[aria-haspopup="listbox"]',
  '.k-dropdown',
  '.p-dropdown',
  '.ui-dropdown',
  '.ui-selectonemenu',
  'ng-select',
  '.ng-select',
  'mat-select',
].join(', ');

const documentLabels: Record<string, string[]> = {
  memo: ['المذكرة الشارحة', 'مذكرة شارحة'],
  claims: ['كشف المطالبات المالية', 'كشف المطالبة المالية'],
  contract: ['عقد الإيجار', 'نسخة عقد الإيجار', 'العقد'],
  violationsEvidence: [
    'تقرير مخالفات وزارة الداخلية',
    'تقرير المخالفات',
    'مرفق وزارة الداخلية',
  ],
  violations: ['كشف المخالفات المرورية', 'المخالفات المرورية'],
  docsList: ['كشف المستندات المرفوعة', 'حافظة المستندات'],
  commercialRegister: ['السجل التجاري', 'نسخة السجل التجاري'],
  representativeId: ['البطاقة الشخصية', 'هوية المفوض', 'هوية الممثل'],
  ibanCertificate: ['شهادة IBAN', 'رقم الحساب الدولي', 'الآيبان'],
};

export class TaqadiPortal {
  private lastPriorityDiagnostics: Record<string, unknown> | null = null;
  private tawtheeqCredentialsFilled = false;
  private tawtheeqLoginSubmitted = false;

  constructor(private page: Page) {
    this.page.setDefaultTimeout(agentConfig.actionTimeoutMs);
  }

  private async firstVisible(locators: Locator[]): Promise<Locator | null> {
    for (const locator of locators) {
      const count = await locator.count();
      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        if (await candidate.isVisible().catch(() => false)) return candidate;
      }
    }
    return null;
  }

  private async clickAny(
    names: string[],
    description: string,
  ): Promise<void> {
    const locators = names.flatMap((name) => [
      this.page.getByRole('button', { name, exact: false }),
      this.page.getByRole('link', { name, exact: false }),
      this.page.getByText(name, { exact: false }),
    ]);
    let target = await this.firstVisible(locators);
    if (!target) {
      const candidates = this.page.locator(
        'button, a, [role="button"], [role="link"], li',
      );
      const expectedNames = names.map(normalizeArabicText);
      const candidateCount = Math.min(await candidates.count(), 300);
      for (let index = 0; index < candidateCount; index += 1) {
        const candidate = candidates.nth(index);
        if (!(await candidate.isVisible().catch(() => false))) continue;
        const candidateText = normalizeArabicText(
          await candidate.innerText().catch(() => ''),
        );
        if (
          candidateText
          && expectedNames.some((name) => candidateText.includes(name))
        ) {
          target = candidate;
          break;
        }
      }
    }
    if (!target) {
      throw new HumanInterventionError(
        `لم يجد الوكيل خيار «${description}» في صفحة تقاضي`,
        'TAQADI_UI_CHANGED',
        { expectedLabels: names, url: this.page.url() },
      );
    }
    await target.click();
  }

  private async confirmAccountPromptWithEnterIfNeeded() {
    const loginButton = await this.firstVisible([
      this.page.getByRole('button', { name: 'تسجيل الدخول', exact: false }),
      this.page.getByText('تسجيل الدخول', { exact: true }),
    ]);
    if (!loginButton) return;

    const accountPrompt = await this.firstVisible([
      this.page.getByText(/أكثر من نوع حساب|اختيار المستخدم/i),
      this.page.getByText('اختيار واحد', { exact: true }),
    ]);
    if (!accountPrompt) return;

    // Taqadi keeps the correct account as the server-side default. Opening the
    // account list can change that default, so confirm the prompt exactly as a
    // user pressing Enter without touching the dropdown.
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2_000);

    if (await loginButton.isVisible().catch(() => false)) {
      throw new HumanInterventionError(
        'لم يقبل موقع تقاضي تأكيد صفحة الدخول بزر Enter',
        'TAQADI_OPTION_UNSTABLE',
        { action: 'press_enter_without_account_selection', url: this.page.url() },
      );
    }
  }

  private isTaqadiLoginPage() {
    try {
      const currentUrl = new URL(this.page.url());
      const normalizedPath = currentUrl.pathname
        .replace(/\/+$/, '')
        .toLowerCase();
      const hostname = currentUrl.hostname.toLowerCase();
      return (
        (
          hostname === 'taqadi.sjc.gov.qa'
          || hostname.endsWith('.taqadi.sjc.gov.qa')
        )
        && normalizedPath === '/itc/login'
      );
    } catch {
      return false;
    }
  }

  private async startTawtheeqLoginIfNeeded() {
    if (!this.isTaqadiLoginPage()) return false;

    const deadline = Date.now() + 10_000;
    let prompt: Locator | null = null;
    do {
      // Taqadi can redirect to NAS while this lookup is in flight. Once the
      // browser leaves the portal login page, the Tawtheeq flow has started.
      if (!this.isTaqadiLoginPage()) return true;
      prompt = await this.firstVisible([
        this.page.getByText('الدخول عبر النظام الوطني', { exact: false }),
        this.page.getByText(/توثيق|TAWTHEEQ/i),
      ]).catch(() => null);
      if (prompt) break;
      await this.page.waitForTimeout(250);
    } while (Date.now() < deadline);
    if (!this.isTaqadiLoginPage()) return true;
    if (!prompt) {
      throw new HumanInterventionError(
        'لم يجد الوكيل بطاقة الدخول عبر توثيق في صفحة تقاضي',
        'TAWTHEEQ_LOGIN_CARD_NOT_FOUND',
        { url: this.page.url() },
      );
    }

    let container = prompt;
    for (let depth = 0; depth < 8; depth += 1) {
      const continueAction = await this.firstVisible([
        container.getByRole('button', { name: 'متابعة', exact: false }),
        container.getByRole('link', { name: 'متابعة', exact: false }),
        container.locator(
          'input[type="submit"][value*="متابعة"], '
          + 'input[type="button"][value*="متابعة"]',
        ),
      ]);
      if (continueAction) {
        await continueAction.click();
        await this.page.waitForTimeout(1_500);
        return true;
      }
      container = container.locator('xpath=..');
    }

    throw new HumanInterventionError(
      'وجد الوكيل بطاقة توثيق لكن لم يجد زر «متابعة» داخلها',
      'TAWTHEEQ_LOGIN_ACTION_NOT_FOUND',
      { url: this.page.url() },
    );
  }

  private async tawtheeqCaptchaSolved() {
    const responses = this.page.locator(
      'textarea[name="g-recaptcha-response"], '
      + 'input[name="g-recaptcha-response"], #g-recaptcha-response',
    );
    const responseCount = Math.min(await responses.count(), 10);
    for (let index = 0; index < responseCount; index += 1) {
      const value = await responses.nth(index).inputValue().catch(() => '');
      if (value.trim()) return true;
    }

    for (const frame of this.page.frames()) {
      if (!/recaptcha|captcha/i.test(frame.url())) continue;
      const checked = await frame
        .locator('#recaptcha-anchor')
        .getAttribute('aria-checked')
        .catch(() => null);
      if (checked === 'true') return true;
    }
    return false;
  }

  private async tawtheeqAuthenticationError() {
    if (!this.tawtheeqLoginSubmitted) return null;

    const candidate = await this.firstVisible([
      this.page.locator(
        'form#frm_mobileid_login [role="alert"], '
        + 'form#frm_mobileid_login .alert-danger, '
        + 'form#frm_mobileid_login .validation-summary-errors, '
        + 'form#frm_mobileid_login [class*="error"]',
      ),
      this.page.getByText(
        /اسم المستخدم أو كلمة المرور|بيانات الدخول غير صحيحة|تعذر تسجيل الدخول/i,
      ),
    ]);
    if (!candidate) return null;

    const message = normalizeText(
      await candidate.innerText().catch(() => ''),
    );
    return message || 'رفض نظام التوثيق الوطني بيانات الدخول';
  }

  private async continueTawtheeqLoginIfReady() {
    const { username, password } = agentConfig.tawtheeq;
    if (!username || !password || this.tawtheeqLoginSubmitted) return false;

    const url = this.page.url().toLowerCase();
    const nationalLoginUrl = url.includes('nas.gov.qa')
      || url.includes('/authn/');
    const form = await this.firstVisible([
      this.page.locator('form#frm_mobileid_login'),
      ...(nationalLoginUrl
        ? [this.page.locator('form').filter({
            has: this.page.locator(
              'input#username, input[name="username"]',
            ),
          })]
        : []),
    ]);
    if (!form) return false;

    const usernameInput = await this.firstVisible([
      form.locator('input#username'),
      form.locator('input[name="username"]'),
      form.getByLabel('اسم المستخدم', { exact: false }),
    ]);
    const passwordInput = await this.firstVisible([
      form.locator('input#password'),
      form.locator('input[name="password"]'),
      form.getByLabel('كلمة المرور', { exact: false }),
    ]);
    if (!usernameInput || !passwordInput) return false;

    if ((await usernameInput.inputValue().catch(() => '')) !== username) {
      await usernameInput.fill(username);
    }
    if ((await passwordInput.inputValue().catch(() => '')) !== password) {
      await passwordInput.fill(password);
    }

    if (!this.tawtheeqCredentialsFilled) {
      this.tawtheeqCredentialsFilled = true;
      console.log(
        '[TaqadiAgent] Tawtheeq credentials filled; '
        + 'waiting for human verification if required',
      );
    }

    if (
      await this.captchaVisible()
      && !(await this.tawtheeqCaptchaSolved())
    ) {
      await this.page.bringToFront().catch(() => undefined);
      return true;
    }

    const continueAction = await this.firstVisible([
      form.getByRole('button', { name: 'استمر', exact: false }),
      form.locator(
        'button[type="submit"], input[type="submit"][value*="استمر"]',
      ),
    ]);
    if (!continueAction) {
      throw new HumanInterventionError(
        'تم إدخال بيانات توثيق لكن لم يجد الوكيل زر «استمر»',
        'TAWTHEEQ_CONTINUE_ACTION_NOT_FOUND',
        { url: this.page.url() },
      );
    }

    this.tawtheeqLoginSubmitted = true;
    await continueAction.click();
    console.log('[TaqadiAgent] Tawtheeq login submitted');
    await this.page.waitForTimeout(1_000);
    return true;
  }

  private async visibleWidgetForInput(input: Locator): Promise<Locator | null> {
    if (await input.isVisible().catch(() => false)) return input;

    const widget = input.locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " k-widget ")][1]',
    );
    if (await widget.isVisible().catch(() => false)) return widget;
    return null;
  }

  private async fieldByControlIds(
    controlIds: string[],
    root: FieldRoot = this.page,
  ) {
    for (const controlId of controlIds) {
      const input = root.locator(`[id="${controlId}"]`);
      const inputCount = Math.min(await input.count(), 10);
      for (let index = 0; index < inputCount; index += 1) {
        const widget = await this.visibleWidgetForInput(input.nth(index));
        if (widget) return widget;
      }

      const listbox = root.locator(
        `[aria-owns="${controlId}_listbox"]`,
      );
      const listboxCount = Math.min(await listbox.count(), 10);
      for (let index = 0; index < listboxCount; index += 1) {
        const candidate = listbox.nth(index);
        if (await candidate.isVisible().catch(() => false)) return candidate;
      }
    }
    return null;
  }

  private async controlForLabelElement(
    labelElement: Locator,
    root: FieldRoot,
  ): Promise<Locator | null> {
    const forId = await labelElement.getAttribute('for');
    if (forId) {
      const escapedId = forId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const byId = root.locator(`[id="${escapedId}"]`);
      if (await byId.count()) {
        const widget = await this.visibleWidgetForInput(byId.first());
        if (widget) return widget;
      }

      const normalizedId = forId.replace(/\./g, '_');
      const normalizedInput = root.locator(`[id="${normalizedId}"]`);
      if (await normalizedInput.count()) {
        const widget = await this.visibleWidgetForInput(
          normalizedInput.first(),
        );
        if (widget) return widget;
      }
    }

    return await this.controlNearElement(labelElement);
  }

  private async exactFieldByLabel(
    baseLabels: string[],
    baseControlIds: string[],
    root: FieldRoot,
  ): Promise<Locator | null> {
    const { labels, controlIds } = expandFieldLookup(
      baseLabels,
      baseControlIds,
    );
    const byControlId = await this.fieldByControlIds(controlIds, root);
    if (byControlId) return byControlId;

    for (const label of labels) {
      const direct = await this.firstVisible([
        root.getByLabel(label, { exact: true }),
        root.getByPlaceholder(label, { exact: true }),
      ]);
      if (direct) return direct;

      const expectedLabel = normalizeFieldLabel(label);
      const labelElements = root.locator('label');
      const labelCount = Math.min(await labelElements.count(), 150);
      for (let index = 0; index < labelCount; index += 1) {
        const labelElement = labelElements.nth(index);
        if (!(await labelElement.isVisible().catch(() => false))) continue;
        const actualLabel = normalizeFieldLabel(
          await labelElement.innerText().catch(() => ''),
        );
        if (actualLabel !== expectedLabel) continue;

        const control = await this.controlForLabelElement(labelElement, root);
        if (control) return control;
      }
    }
    return null;
  }

  private async fieldByLabel(
    baseLabels: string[],
    baseControlIds: string[] = [],
    root: FieldRoot = this.page,
    options: FieldLookupOptions = {},
  ) {
    const { labels, controlIds } = expandFieldLookup(
      baseLabels,
      baseControlIds,
    );
    let exactField = await this.exactFieldByLabel(
      labels,
      controlIds,
      root,
    );
    if (exactField) return exactField;

    if (options.exactLabel) {
      const deadline = Date.now() + (options.waitForMs ?? 0);
      while (Date.now() < deadline) {
        await this.page.waitForTimeout(100);
        exactField = await this.exactFieldByLabel(
          labels,
          controlIds,
          root,
        );
        if (exactField) return exactField;
      }
      return null;
    }

    for (const label of labels) {
      const direct = await this.firstVisible([
        root.getByLabel(label, { exact: false }),
        root.locator(
          `input[placeholder*="${label}"], textarea[placeholder*="${label}"]`,
        ),
      ]);
      if (direct) return direct;

      const labelLocator = root.locator('label').filter({ hasText: label });
      const count = await labelLocator.count();
      for (let index = 0; index < count; index += 1) {
        const labelElement = labelLocator.nth(index);
        const control = await this.controlForLabelElement(labelElement, root);
        if (control) return control;
      }

      const textCandidates = root.getByText(label, { exact: false });
      const textCount = Math.min(await textCandidates.count(), 30);
      for (let index = 0; index < textCount; index += 1) {
        const textElement = textCandidates.nth(index);
        if (!(await textElement.isVisible().catch(() => false))) continue;
        const text = normalizeText(
          await textElement.innerText().catch(() => ''),
        );
        if (!text.includes(label) || text.length > label.length + 12) continue;

        const nearby = await this.controlNearElement(textElement);
        if (nearby) return nearby;
      }
    }

    if (controlIds.length > 0) {
      const deadline = Date.now() + 5_000;
      do {
        const lateControl = await this.fieldByControlIds(controlIds, root);
        if (lateControl) return lateControl;
        await this.page.waitForTimeout(100);
      } while (Date.now() < deadline);
    }
    return null;
  }

  private async controlNearElement(element: Locator) {
    let container = element;
    for (let depth = 0; depth < 6; depth += 1) {
      container = container.locator('xpath=..');
      const controls = container.locator(fieldControlSelector);
      const controlCount = Math.min(await controls.count(), 10);
      for (let index = 0; index < controlCount; index += 1) {
        const control = controls.nth(index);
        if (await control.isVisible().catch(() => false)) return control;
      }
    }
    return null;
  }

  private async setNumericWidgetValue(
    controlId: string,
    value: number,
  ): Promise<{
    applied: boolean;
    backingValue: string | null;
    formattedValue: string | null;
  }> {
    const numericArgs = JSON.stringify({ controlId, value });
    return await this.page.evaluate(`(() => {
      const args = ${numericArgs};
      const jq = window.jQuery || window.$;
      if (!jq) {
        return {
          applied: false,
          backingValue: null,
          formattedValue: null,
        };
      }

      const visible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && rect.width > 0
          && rect.height > 0;
      };
      const candidates = Array.from(document.querySelectorAll('[id]'))
        .filter((element) => element.id === args.controlId);
      const input = candidates.find((candidate) => {
        const dialog = candidate.closest(
          '#modal-dialog, .modal, [role="dialog"]',
        );
        if (dialog && !visible(dialog)) return false;
        const widgetRoot = candidate.closest('.k-widget');
        return widgetRoot ? visible(widgetRoot) : visible(candidate);
      });
      if (!input) {
        return {
          applied: false,
          backingValue: null,
          formattedValue: null,
        };
      }

      const widget = jq(input).data('kendoNumericTextBox');
      if (!widget || typeof widget.value !== 'function') {
        return {
          applied: false,
          backingValue: String(input.value || ''),
          formattedValue: null,
        };
      }
      widget.value(args.value);
      input.value = String(args.value);
      input.setAttribute('value', String(args.value));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      if (typeof widget.trigger === 'function') widget.trigger('change');
      const formattedInput = input.closest('.k-widget')
        ?.querySelector('input.k-formatted-value');
      return {
        applied: true,
        backingValue: String(input.value || ''),
        formattedValue: formattedInput
          ? String(formattedInput.value || '')
          : null,
      };
    })()`) as {
      applied: boolean;
      backingValue: string | null;
      formattedValue: string | null;
    };
  }

  private async fillField(
    labels: string[],
    value: string | null | undefined,
    required = true,
    controlIds: string[] = [],
    root: FieldRoot = this.page,
    options: FieldLookupOptions = {},
  ) {
    if (!value) {
      if (required) {
        throw new HumanInterventionError(
          `قيمة الحقل «${labels[0]}» غير متوفرة في النظام`,
          'MISSING_CASE_DATA',
          { field: labels[0] },
        );
      }
      return;
    }

    const field = await this.fieldByLabel(
      labels,
      controlIds,
      root,
      options,
    );
    if (!field) {
      if (!required) return;
      throw new HumanInterventionError(
        `لم يجد الوكيل حقل «${labels[0]}»`,
        'TAQADI_UI_CHANGED',
        {
          expectedLabels: labels,
          fieldRoot: await this.fieldRootDiagnostics(root),
          url: this.page.url(),
        },
      );
    }

    if (controlIds[0] && /^-?\d+(?:\.\d+)?$/.test(value)) {
      if (controlIds[0] === 'priority') {
        const priorityDiagnostics = await this.page.evaluate(`(() => {
          const input = document.getElementById('priority');
          const jq = window.jQuery || window.$;
          const widget = input && jq
            ? jq(input).data('kendoNumericTextBox')
            : null;
          return {
            input: input?.outerHTML || null,
            parent: input?.parentElement?.outerHTML?.slice(0, 4000) || null,
            widgetFound: Boolean(widget),
            widgetValue: widget ? widget.value() : null,
            visibleInputs: input?.parentElement
              ? Array.from(input.parentElement.querySelectorAll('input')).map(
                (element) => ({
                  className: element.className,
                  type: element.type,
                  value: element.value,
                  visible: element.getBoundingClientRect().width > 0,
                }),
              )
              : [],
          };
        })()`);
        console.log(
          '[TaqadiAgent] priority diagnostics:',
          JSON.stringify(priorityDiagnostics),
        );
        this.lastPriorityDiagnostics = {
          before: priorityDiagnostics,
        };
      }
      let numericControlId = controlIds[0];
      let numericResult = {
        applied: false,
        backingValue: null as string | null,
        formattedValue: null as string | null,
      };
      for (const controlId of controlIds) {
        const candidateResult = await this.setNumericWidgetValue(
          controlId,
          Number(value),
        );
        if (!candidateResult.applied) continue;
        numericControlId = controlId;
        numericResult = candidateResult;
        break;
      }
      if (numericResult.applied) {
        const expectedNumeric = Number(value);
        const backingMatches = Number(numericResult.backingValue)
          === expectedNumeric;
        const formattedMatches = numericResult.formattedValue === null
          || Number(numericResult.formattedValue) === expectedNumeric;
        if (!backingMatches || !formattedMatches) {
          throw new HumanInterventionError(
            `تعذر تثبيت قيمة حقل «${labels[0]}» في تقاضي`,
            'TAQADI_NUMERIC_VALUE_MISMATCH',
            {
              expectedValue: value,
              backingValue: numericResult.backingValue,
              formattedValue: numericResult.formattedValue,
              controlIds,
              url: this.page.url(),
            },
          );
        }
        console.log('[TaqadiAgent] numeric strategy: kendo-widget');
        if (controlIds[0] === 'priority') {
          this.lastPriorityDiagnostics = {
            ...this.lastPriorityDiagnostics,
            strategy: 'kendo-widget',
            backingValue: numericResult.backingValue,
            formattedValue: numericResult.formattedValue,
          };
        }
        await this.page.waitForTimeout(200);
        return;
      }

      const visibleNumericInput = await this.firstVisible([
        field.locator('input.k-formatted-value:visible'),
        root
          .locator(`[id="${controlIds[0]}"]`)
          .locator(
            'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " k-numerictextbox ")][1]',
          )
          .locator('input.k-formatted-value:visible'),
      ]);
      if (visibleNumericInput) {
        console.log('[TaqadiAgent] priority strategy: visible-input');
        try {
          await visibleNumericInput.click();
          await visibleNumericInput.press('Control+A');
          await visibleNumericInput.fill(value);
          await visibleNumericInput.press('Tab');
        } catch (error) {
          throw new HumanInterventionError(
            `تعذر إدخال قيمة حقل «${labels[0]}» في تقاضي`,
            'TAQADI_FIELD_INPUT_FAILED',
            {
              expectedLabels: labels,
              controlIds,
              cause: error instanceof Error ? error.message : String(error),
              url: this.page.url(),
            },
          );
        }
        await this.page.waitForTimeout(300);
        this.lastPriorityDiagnostics = {
          ...this.lastPriorityDiagnostics,
          strategy: 'visible-input',
          formattedValue: await visibleNumericInput.inputValue()
            .catch(() => null),
            backingValue: await root
            .locator(`[id="${numericControlId}"]`)
            .inputValue()
            .catch(() => null),
        };
        return;
      }
    }

    let fillTarget = field;
    const tagName = await field.evaluate((element) =>
      element.tagName.toLowerCase(),
    );
    if (!['input', 'textarea'].includes(tagName)) {
      const editable = await this.firstVisible([
        field.locator(
          'input.k-formatted-value, input.k-input:not([type="hidden"]), '
          + 'input:not([type="hidden"]), textarea',
        ),
      ]);
      if (!editable) {
        if (!required) return;
        throw new HumanInterventionError(
          `حقل «${labels[0]}» ظاهر لكنه غير قابل للكتابة`,
          'TAQADI_UI_CHANGED',
          { expectedLabels: labels, controlIds, url: this.page.url() },
        );
      }
      fillTarget = editable;
    }
    await fillTarget.fill(value).catch((error) => {
      throw new HumanInterventionError(
        `تعذر إدخال قيمة حقل «${labels[0]}» في تقاضي`,
        'TAQADI_FIELD_INPUT_FAILED',
        {
          expectedLabels: labels,
          controlIds,
          cause: error instanceof Error ? error.message : String(error),
          url: this.page.url(),
        },
      );
    });
    await fillTarget.press('Tab').catch(() => undefined);
    const savedValue = await fillTarget.inputValue().catch(() => null);
    if (
      savedValue !== null
      && normalizeText(savedValue) !== normalizeText(value)
    ) {
      throw new HumanInterventionError(
        `لم يحتفظ تقاضي بقيمة حقل «${labels[0]}» بعد إدخالها`,
        'TAQADI_FIELD_VALUE_MISMATCH',
        {
          expectedValue: value,
          savedValue,
          expectedLabels: labels,
          controlIds,
          url: this.page.url(),
        },
      );
    }
  }

  private async fieldInputValue(
    labels: string[],
    controlIds: string[],
    root: FieldRoot,
  ) {
    const field = await this.fieldByLabel(
      labels,
      controlIds,
      root,
      {
        exactLabel: true,
        waitForMs: agentConfig.actionTimeoutMs,
      },
    );
    if (!field) return null;

    let input = field;
    const tagName = await field.evaluate((element) =>
      element.tagName.toLowerCase(),
    ).catch(() => '');
    if (!['input', 'textarea'].includes(tagName)) {
      for (const controlId of controlIds) {
        const backingInputs = field.locator(`[id="${controlId}"]`);
        const backingCount = Math.min(await backingInputs.count(), 10);
        for (let index = 0; index < backingCount; index += 1) {
          const backingValue = await backingInputs.nth(index)
            .inputValue()
            .catch(() => null);
          if (backingValue !== null) return backingValue;
        }
      }
      const editable = await this.firstVisible([
        field.locator(
          'input.k-formatted-value, input.k-input:not([type="hidden"]), '
          + 'input:not([type="hidden"]), textarea',
        ),
      ]);
      if (!editable) return null;
      input = editable;
    }
    return input.inputValue().catch(() => null);
  }

  private async fillStableDefendantRequiredFields(
    input: {
      firstName: string;
      lastName: string;
      identityNumber: string;
      identityNumberLabels: string[];
      identityNumberControlIds: string[];
      address: string;
      phone: string;
      email: string;
      partyOrder: string;
    },
    root: FieldRoot,
  ) {
    const fields: Array<{
      key: string;
      labels: string[];
      value: string;
      controlIds: string[];
    }> = [
      {
        key: 'firstName',
        labels: ['الاسم الأول', 'الاسم'],
        value: input.firstName,
        controlIds: [],
      },
      {
        key: 'lastName',
        labels: ['اسم العائلة', 'الاسم الأخير'],
        value: input.lastName,
        controlIds: [],
      },
      {
        key: 'identityNumber',
        labels: input.identityNumberLabels,
        value: input.identityNumber,
        controlIds: input.identityNumberControlIds,
      },
      {
        key: 'address',
        labels: ['العنوان'],
        value: input.address,
        controlIds: [],
      },
      {
        key: 'phone',
        labels: [
          'رقم الهاتف المحمول',
          'رقم الهاتف المتحرك',
          'رقم الجوال',
          'الجوال',
          'الهاتف',
        ],
        value: input.phone,
        controlIds: [
          'mobilePhone',
          'mobilePhoneNumber',
          'mobileNumber',
          'mobileNo',
          'phoneNumber',
          'phoneNo',
          'phone',
          'mobile',
          'addresses0.mobile',
          'addresses0.phone',
        ],
      },
      {
        key: 'email',
        labels: ['البريد الإلكتروني', 'البريد الالكتروني'],
        value: input.email,
        controlIds: [],
      },
      {
        key: 'partyOrder',
        labels: ['الترتيب حسب الصحيفة', 'ترتيب الطرف', 'الترتيب'],
        value: input.partyOrder,
        controlIds: ['priority'],
      },
    ];

    // فحص الاستقرار يقرأ 7 حقول مرتين في كل دورة عبر استعلامات Kendo بطيئة
    // (رُصدت دورة كاملة ≈ 28 ثانية في مهمة حقيقية) — مهلة actionTimeoutMs
    // (30 ث) لا تكفي لقراءتين مستقرتين متتاليتين، فكان الفحص ينتهي بالمهلة
    // رغم تطابق كل الحقول (mismatched: []). نمنحه مهلة مخصصة أطول.
    const deadline = Date.now() + Math.max(agentConfig.actionTimeoutMs, 120_000);
    let stableSince: number | null = null;
    let latestValues: Record<string, string | null> = {};
    do {
      for (const field of fields) {
        const currentValue = await this.fieldInputValue(
          field.labels,
          field.controlIds,
          root,
        );
        if (!defendantFieldValueMatches(field.key, currentValue, field.value)) {
          await this.fillField(
            field.labels,
            field.value,
            true,
            field.controlIds,
            root,
            {
              exactLabel: true,
              waitForMs: agentConfig.actionTimeoutMs,
            },
          );
        }
      }

      await this.page.waitForTimeout(150);
      latestValues = {};
      let allMatch = true;
      for (const field of fields) {
        const currentValue = await this.fieldInputValue(
          field.labels,
          field.controlIds,
          root,
        );
        latestValues[field.key] = currentValue;
        if (!defendantFieldValueMatches(field.key, currentValue, field.value)) {
          allMatch = false;
        }
      }

      if (allMatch) {
        stableSince ??= Date.now();
        if (Date.now() - stableSince >= 800) return;
      } else {
        stableSince = null;
      }
    } while (Date.now() < deadline);

    const mismatched = fields
      .filter(
        (field) => !defendantFieldValueMatches(
          field.key,
          latestValues[field.key],
          field.value,
        ),
      )
      .map((field) => ({
        field: field.key,
        expected: field.value.slice(0, 30),
        actual: (latestValues[field.key] ?? '').slice(0, 30),
      }));

    throw new HumanInterventionError(
      'لم يحتفظ تقاضي بجميع البيانات المطلوبة للمدعى عليه',
      'TAQADI_DEFENDANT_FIELDS_UNSTABLE',
      {
        mismatched,
        firstNamePresent: Boolean(latestValues.firstName),
        firstNameLength: latestValues.firstName?.length || 0,
        lastNamePresent: Boolean(latestValues.lastName),
        lastNameLength: latestValues.lastName?.length || 0,
        identityNumberPresent: Boolean(latestValues.identityNumber),
        identityNumberLength: latestValues.identityNumber?.length || 0,
        addressPresent: Boolean(latestValues.address),
        addressLength: latestValues.address?.length || 0,
        phonePresent: Boolean(latestValues.phone),
        phoneLength: latestValues.phone?.length || 0,
        emailPresent: Boolean(latestValues.email),
        emailLength: latestValues.email?.length || 0,
        partyOrderPresent: Boolean(latestValues.partyOrder),
        url: this.page.url(),
      },
    );
  }

  private async fillRichText(
    controlId: string,
    value: string | null | undefined,
  ) {
    if (!value) {
      throw new HumanInterventionError(
        `قيمة المحرر «${controlId}» غير متوفرة في النظام`,
        'MISSING_CASE_DATA',
        { field: controlId },
      );
    }

    const frame = this.page.locator(`#${controlId}_ifr`);
    const frameReady = await frame.waitFor({
      state: 'visible',
      timeout: 10_000,
    }).then(() => true).catch(() => false);
    if (!frameReady) {
      throw new HumanInterventionError(
        `لم يجد الوكيل محرر «${controlId}»`,
        'TAQADI_UI_CHANGED',
        { field: controlId, url: this.page.url() },
      );
    }

    const body = this.page.frameLocator(`#${controlId}_ifr`).locator('body');
    await body.waitFor({ state: 'visible', timeout: 10_000 });
    await body.fill(value);
    await body.press('Tab');
  }

  private async selectedFieldText(field: Locator): Promise<string> {
    const tagName = await field.evaluate((element) =>
      element.tagName.toLowerCase(),
    );
    if (tagName === 'select') {
      return normalizeText(
        await field.locator('option:checked').innerText().catch(() => ''),
      );
    }

    const displayValue = await this.firstVisible([
      field.locator('.k-input'),
      field.locator('.p-dropdown-label'),
      field.locator('.ng-value-label'),
    ]);
    if (displayValue) {
      return normalizeText(
        await displayValue.innerText().catch(() => ''),
      );
    }

    if (tagName === 'input') {
      return normalizeText(await field.inputValue().catch(() => ''));
    }
    return '';
  }

  private async assertSelectedField(
    field: Locator,
    labels: string[],
    optionText: string,
  ): Promise<void> {
    const deadline = Date.now() + 2_000;
    let selectedText = '';
    do {
      selectedText = await this.selectedFieldText(field);
      if (
        normalizeArabicText(selectedText)
        === normalizeArabicText(optionText)
      ) return;
      await this.page.waitForTimeout(100);
    } while (Date.now() < deadline);

    throw new HumanInterventionError(
      `اختار تقاضي «${selectedText || 'قيمة غير معروفة'}» في «${labels[0]}» بدل «${optionText}»`,
      'PARTY_FIELD_SELECTION_MISMATCH',
      {
        field: labels[0],
        expectedOption: optionText,
        selectedOption: selectedText,
        url: this.page.url(),
      },
    );
  }

  private async dropdownIdentity(
    field: Locator,
    controlIds: string[],
  ): Promise<{ controlId: string | null; listboxId: string | null }> {
    const ownedListboxId = normalizeText(
      await field.getAttribute('aria-owns').catch(() => '') || '',
    );
    if (ownedListboxId) {
      return {
        controlId: ownedListboxId.endsWith('_listbox')
          ? ownedListboxId.slice(0, -'_listbox'.length)
          : controlIds[0] || null,
        listboxId: ownedListboxId,
      };
    }

    const fieldId = await field.getAttribute('id').catch(() => null);
    const descendantControl = field.locator(
      'select[id], input[id]',
    ).first();
    const descendantId = await descendantControl.count() > 0
      ? await descendantControl.getAttribute('id').catch(() => null)
      : null;
    const controlId = descendantId || fieldId || controlIds[0] || null;
    const inferredListboxId = controlId ? `${controlId}_listbox` : null;
    const hasOwnedListbox = inferredListboxId
      ? await this.page.locator(`[id="${inferredListboxId}"]`).count() > 0
      : false;

    return {
      controlId,
      listboxId: controlIds[0] || hasOwnedListbox
        ? inferredListboxId
        : null,
    };
  }

  private async fieldRootDiagnostics(root: FieldRoot) {
    const labels = await root.locator('label').evaluateAll((elements) =>
      elements.slice(0, 120).map((element) => ({
        text: (element.textContent || '').replace(/\s+/g, ' ').trim(),
        forId: element.getAttribute('for'),
      })),
    );
    const controls = await root
      .locator(
        'input, select, textarea, [role="listbox"], [role="combobox"], '
        + '[aria-haspopup="listbox"]',
      )
      .evaluateAll((elements) =>
        elements.slice(0, 160).map((element) => ({
          tagName: element.tagName.toLowerCase(),
          id: element.getAttribute('id'),
          name: element.getAttribute('name'),
          role: element.getAttribute('role'),
          dataRole: element.getAttribute('data-role'),
          ariaOwns: element.getAttribute('aria-owns'),
          ariaLabel: element.getAttribute('aria-label'),
          visible: Boolean(
            (element as HTMLElement).offsetWidth
            || (element as HTMLElement).offsetHeight
            || (element as HTMLElement).getClientRects().length,
          ),
          displayedText: (
            element.querySelector('.k-input')?.textContent
            || element.getAttribute('placeholder')
            || ''
          ).replace(/\s+/g, ' ').trim(),
        })),
      );

    return { labels, controls };
  }

  private async backingControlForField(
    field: Locator,
    controlId: string,
    root: FieldRoot,
  ): Promise<Locator | null> {
    const selector = `[id="${controlId.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
    const fieldId = await field.getAttribute('id').catch(() => null);
    if (fieldId === controlId) return field;

    const descendants = field.locator(selector);
    if (await descendants.count() > 0) return descendants.first();

    const parentCandidates = field.locator('xpath=..').locator(selector);
    const parentCount = Math.min(await parentCandidates.count(), 10);
    for (let index = 0; index < parentCount; index += 1) {
      const candidate = parentCandidates.nth(index);
      const widget = await this.visibleWidgetForInput(candidate);
      if (widget) return candidate;
    }

    const candidates = root.locator(selector);
    const candidateCount = Math.min(await candidates.count(), 20);
    for (let index = 0; index < candidateCount; index += 1) {
      const candidate = candidates.nth(index);
      const widget = await this.visibleWidgetForInput(candidate);
      if (widget) return candidate;
    }
    return null;
  }

  private async selectKendoDropdownOption(
    backingControl: Locator,
    optionText: string,
  ): Promise<boolean> {
    return await backingControl.evaluate(async (input, args) => {
      type DataItem = Record<string, unknown> & {
        get?: (fieldName: string) => unknown;
      };
      type DataSource = {
        data?: () => unknown;
        view?: () => unknown;
        fetch?: () => unknown;
        read?: () => unknown;
      };
      type JQueryCollection = {
        0?: HTMLElement;
        get?: (index: number) => HTMLElement | undefined;
      };
      type KendoWidget = {
        options?: {
          dataTextField?: string;
          dataValueField?: string;
        };
        dataSource?: DataSource;
        value?: (value?: unknown) => unknown;
        text?: () => string;
        select?: (
          selector: number | ((item: DataItem) => boolean),
        ) => void;
        trigger?: (eventName: string) => void;
        open?: () => void;
        close?: () => void;
        ul?: JQueryCollection;
        list?: JQueryCollection;
      };
      type JQueryFactory = (element: Element) => {
        data: (name: string) => unknown;
      };

      const pageWindow = window as typeof window & {
        jQuery?: JQueryFactory;
        $?: JQueryFactory;
      };
      const jq = pageWindow.jQuery || pageWindow.$;
      if (!jq) return false;

      const widget = (
        jq(input).data('kendoDropDownList')
        || jq(input).data('kendoComboBox')
      ) as KendoWidget | undefined;
      if (!widget) return false;

      const normalize = (value: unknown) => String(value || '')
        .normalize('NFKD')
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ')
        .trim();
      const expected = normalize(args.optionText);
      const read = (
        item: DataItem | undefined,
        fieldName: string | undefined,
      ) => {
        if (!item || !fieldName) return undefined;
        return typeof item.get === 'function'
          ? item.get(fieldName)
          : item[fieldName];
      };
      const toItems = (value: unknown): DataItem[] => {
        if (!value) return [];
        try {
          return Array.from(value as Iterable<DataItem>);
        } catch {
          return [];
        }
      };
      const itemTexts = (
        item: DataItem,
        textField: string,
      ): unknown[] => {
        const namedValues = [
          read(item, textField),
          read(item, 'displayName'),
          read(item, 'text'),
          read(item, 'label'),
          read(item, 'name'),
          read(item, 'title'),
          read(item, 'description'),
        ];
        const primitiveValues = Object.values(item).filter((value) =>
          ['string', 'number'].includes(typeof value));
        return [...namedValues, ...primitiveValues];
      };
      const collectionElement = (
        collection: JQueryCollection | undefined,
      ) => collection?.[0] || collection?.get?.(0) || null;
      const selectedText = () =>
        normalize(
          widget.text?.()
          || input.closest('.k-widget')?.querySelector('.k-input')
            ?.textContent
          || '',
        );

      const applyTarget = () => {
        const textField = widget.options?.dataTextField
          || (input as HTMLElement).dataset.textField
          || 'text';
        const valueField = widget.options?.dataValueField
          || (input as HTMLElement).dataset.valueField
          || 'value';
        const dataSource = widget.dataSource;
        const dataItems = dataSource?.data
          ? toItems(dataSource.data())
          : dataSource?.view
            ? toItems(dataSource.view())
            : [];

        let targetValue: unknown;
        if (input instanceof HTMLSelectElement) {
          const nativeOption = Array.from(input.options).find(
            (option) => normalize(option.textContent) === expected,
          );
          if (nativeOption) targetValue = nativeOption.value;
        }

        const targetItem = dataItems.find((item) =>
          itemTexts(item, textField).some(
            (text) => normalize(text) === expected,
          ));
        if (targetValue === undefined && targetItem) {
          targetValue = read(targetItem, valueField)
            ?? read(targetItem, 'id')
            ?? read(targetItem, 'value');
        }

        let applied = false;
        if (targetValue !== undefined && typeof widget.value === 'function') {
          widget.value(targetValue);
          applied = true;
        }
        if (
          targetItem
          && selectedText() !== expected
          && typeof widget.select === 'function'
        ) {
          widget.select((item) =>
            itemTexts(item, textField).some(
              (text) => normalize(text) === expected,
            ));
          applied = true;
        }

        if (!applied) {
          const list = collectionElement(widget.ul)
            || collectionElement(widget.list);
          const options = list
            ? Array.from(
              list.querySelectorAll<HTMLElement>(
                '[role="option"], .k-item',
              ),
            )
            : [];
          const target = options.find(
            (option) => normalize(option.textContent) === expected,
          );
          if (target) {
            target.click();
            applied = true;
          }
        }

        if (!applied) return false;
        if (typeof widget.close === 'function') widget.close();
        const hasNativeChangeHandler = Boolean(
          input.getAttribute('onchange')
          || (input as HTMLElement).onchange,
        );
        if (
          !hasNativeChangeHandler
          && typeof widget.trigger === 'function'
        ) {
          widget.trigger('change');
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };

      if (applyTarget()) return true;
      if (typeof widget.open === 'function') widget.open();

      const dataSource = widget.dataSource;
      const refresh = dataSource?.fetch || dataSource?.read;
      if (refresh) {
        try {
          const result = refresh.call(dataSource);
          if (
            result
            && typeof (result as PromiseLike<unknown>).then === 'function'
          ) {
            await Promise.race([
              Promise.resolve(result).catch(() => undefined),
              new Promise((resolve) => window.setTimeout(resolve, 5_000)),
            ]);
          }
        } catch {
          // The polling below also covers callback-based Kendo data sources.
        }
      }

      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        if (applyTarget()) return true;
        await new Promise((resolve) => window.setTimeout(resolve, 200));
      }
      return false;
    }, { optionText });
  }

  /**
   * يقرأ النص المعروض حاليًا في قائمة Kendo من كل مصادره المحتملة:
   * .k-input الداخلي، نص العنصر الظاهر نفسه (span[role=listbox])، ثم الخيار
   * المحدد في الـ select الخفي — لأن شكل الودجت يختلف بين صفحات تقاضي
   * وبين حالة الحقل (فارغ/معبأ/معطّل).
   */
  private async readDropdownCurrentText(
    field: Locator,
    backingControl: Locator | null,
  ): Promise<string> {
    const fromKInput = await field
      .locator('.k-input')
      .innerText()
      .catch(() => '');
    if (normalizeText(fromKInput)) return fromKInput;

    const ownText = await field.innerText().catch(() => '');
    if (normalizeText(ownText)) return ownText;

    if (backingControl) {
      const selectedLabel = await backingControl
        .evaluate((element) => {
          if (element.tagName.toLowerCase() !== 'select') return '';
          const select = element as HTMLSelectElement;
          return select.selectedOptions[0]?.textContent ?? '';
        })
        .catch(() => '');
      if (normalizeText(selectedLabel)) return selectedLabel;
    }
    return '';
  }

  private async selectField(
    labels: string[],
    optionText: string,
    controlIds: string[] = [],
    root: FieldRoot = this.page,
  ) {
    const field = await this.fieldByLabel(labels, controlIds, root);
    if (!field) {
      throw new HumanInterventionError(
        `لم يجد الوكيل قائمة «${labels[0]}»`,
        'TAQADI_UI_CHANGED',
        {
          expectedLabels: labels,
          optionText,
          fieldRoot: await this.fieldRootDiagnostics(root),
          url: this.page.url(),
        },
      );
    }

    const { controlId, listboxId } = await this.dropdownIdentity(
      field,
      controlIds,
    );
    const backingControl = controlId
      ? await this.backingControlForField(field, controlId, root)
      : null;
    const tagName = await field.evaluate((element) =>
      element.tagName.toLowerCase(),
    );
    if (tagName === 'select') {
      await field.selectOption({ label: optionText }).catch(async () => {
        await field.selectOption({ value: optionText });
      });
      if (root !== this.page) {
        await this.assertSelectedField(field, labels, optionText);
      }
      return;
    }

    if (controlId && listboxId) {
      const readyDeadline = Date.now() + agentConfig.actionTimeoutMs;
      let ready = false;
      while (!ready && Date.now() < readyDeadline) {
        const fieldDisabled = await field
          .getAttribute('aria-disabled')
          .catch(() => null);
        const fieldBusy = await field
          .getAttribute('aria-busy')
          .catch(() => null);
        const inputDisabled = backingControl
          ? await backingControl.isDisabled().catch(() => false)
          : false;
        ready = fieldDisabled !== 'true'
          && fieldBusy !== 'true'
          && !inputDisabled;
        if (!ready) await this.page.waitForTimeout(100);
      }
      if (!ready) {
        throw new HumanInterventionError(
          `ظلت قائمة «${labels[0]}» غير جاهزة بعد انتهاء مهلة الانتظار`,
          'TAQADI_DROPDOWN_NOT_READY',
          {
            field: labels[0],
            controlId,
            listboxId,
            url: this.page.url(),
          },
        );
      }
      await this.page.waitForTimeout(300);
    }

    const currentText = normalizeText(
      await this.readDropdownCurrentText(field, backingControl),
    );
    if (
      normalizeArabicText(currentText)
      === normalizeArabicText(optionText)
    ) return;

    await field.click();
    if (controlId && listboxId) {
      const selectedThroughWidget = backingControl
        ? await this.selectKendoDropdownOption(
          backingControl,
          optionText,
        )
        : false;
      if (selectedThroughWidget) {
        await this.page.waitForTimeout(300);
        if (root !== this.page) {
          await this.assertSelectedField(field, labels, optionText);
        }
        return;
      }

      const exactCandidates = this.page.locator(
        `[id="${listboxId}"] [role="option"], `
        + `[id="${listboxId}"] .k-item`,
      );
      const optionDeadline = Date.now() + 10_000;
      let visibleOptionFound = false;

      while (!visibleOptionFound && Date.now() < optionDeadline) {
        const currentCount = Math.min(
          await exactCandidates.count(),
          maxDropdownOptionCount,
        );
        for (let index = 0; index < currentCount; index += 1) {
          if (await exactCandidates.nth(index).isVisible().catch(() => false)) {
            visibleOptionFound = true;
            break;
          }
        }
        if (visibleOptionFound) break;
        await this.page.waitForTimeout(300);
      }

      const availableOptions: string[] = [];
      const candidateCount = Math.min(
        await exactCandidates.count(),
        maxDropdownOptionCount,
      );
      for (let index = 0; index < candidateCount; index += 1) {
        const candidate = exactCandidates.nth(index);
        const candidateText = normalizeText(
          await candidate.innerText().catch(() => ''),
        );
        if (candidateText) availableOptions.push(candidateText);
        if (!(await candidate.isVisible().catch(() => false))) continue;
        if (
          normalizeArabicText(candidateText)
          === normalizeArabicText(optionText)
        ) {
          const args = JSON.stringify({
            listboxId,
            optionText,
          });
          const clicked = await this.page.evaluate(`(() => {
            const args = ${args};
            const normalize = (value) => String(value || '')
              .normalize('NFKD')
              .replace(/[\\u064B-\\u065F\\u0670]/g, '')
              .replace(/[أإآٱ]/g, 'ا')
              .replace(/ى/g, 'ي')
              .replace(/\\s+/g, ' ')
              .trim();
            const options = Array.from(document.querySelectorAll(
              '[id="' + args.listboxId + '"] [role="option"], '
              + '[id="' + args.listboxId + '"] .k-item'
            ));
            const target = options.find((element) => {
              const rect = element.getBoundingClientRect();
              return rect.width > 0
                && rect.height > 0
                && normalize(element.textContent || '')
                  === normalize(args.optionText);
            });
            if (!target) return false;
            target.click();
            return true;
          })()`) as boolean;
          if (!clicked) {
            throw new HumanInterventionError(
              `تعذر تثبيت الخيار «${optionText}» في قائمة «${labels[0]}»`,
              'TAQADI_OPTION_UNSTABLE',
              { field: labels[0], optionText, url: this.page.url() },
            );
          }
          await this.page.waitForTimeout(300);
          if (root !== this.page) {
            await this.assertSelectedField(field, labels, optionText);
          }
          return;
        }
      }

      throw new HumanInterventionError(
        `الخيار «${optionText}» غير موجود في قائمة «${labels[0]}»`,
        'TAQADI_OPTION_MISSING',
        {
          field: labels[0],
          optionText,
          controlId,
          listboxId,
          availableOptions,
          fieldRoot: await this.fieldRootDiagnostics(root),
          url: this.page.url(),
        },
      );
    }

    const ownedOptions = listboxId
      ? this.page
        .locator(
          `[id="${listboxId}"] [role="option"], `
          + `[id="${listboxId}"] .k-item`,
        )
        .filter({ hasText: optionText })
      : this.page.locator('body > __taqadi_no_owned_options__');
    let option = await this.firstVisible([
      ownedOptions,
      this.page.getByRole('option', { name: optionText, exact: false }),
      this.page
        .locator(
          [
            '[role="option"]',
            '.p-dropdown-item',
            '.ui-dropdown-item',
            '.ui-selectonemenu-item',
            '.ng-option',
            'mat-option',
            '.k-list-container .k-item',
            '.k-animation-container .k-item',
            '.k-list .k-item',
          ].join(', '),
        )
        .filter({ hasText: optionText }),
      this.page.getByText(optionText, { exact: true }),
    ]);
    if (!option) {
      const candidates = this.page.locator(
        [
          '[role="option"]',
          '.k-list-container .k-item',
          '.k-animation-container .k-item',
          '.k-list .k-item',
        ].join(', '),
      );
      const candidateCount = Math.min(
        await candidates.count(),
        maxDropdownOptionCount,
      );
      for (let index = 0; index < candidateCount; index += 1) {
        const candidate = candidates.nth(index);
        if (!(await candidate.isVisible().catch(() => false))) continue;
        const candidateText = await candidate.innerText().catch(() => '');
        if (
          normalizeArabicText(candidateText)
          === normalizeArabicText(optionText)
        ) {
          option = candidate;
          break;
        }
      }
    }
    if (!option) {
      throw new HumanInterventionError(
        `الخيار «${optionText}» غير موجود في قائمة «${labels[0]}»`,
        'TAQADI_OPTION_MISSING',
        { field: labels[0], optionText, url: this.page.url() },
      );
    }
    await option.click({ timeout: 5_000 }).catch(async (error) => {
      if (!listboxId) throw error;

      const ownedCandidates = this.page.locator(
        `[id="${listboxId}"] [role="option"], `
        + `[id="${listboxId}"] .k-item`,
      );
      const candidateCount = Math.min(
        await ownedCandidates.count(),
        maxDropdownOptionCount,
      );
      for (let index = 0; index < candidateCount; index += 1) {
        const candidate = ownedCandidates.nth(index);
        if (!(await candidate.isVisible().catch(() => false))) continue;
        const candidateText = await candidate.innerText().catch(() => '');
        if (
          normalizeArabicText(candidateText)
          === normalizeArabicText(optionText)
        ) {
          await candidate.click({ force: true });
          return;
        }
      }
      throw error;
    });
    await this.page.waitForTimeout(300);
    if (root !== this.page) {
      await this.assertSelectedField(field, labels, optionText);
    }
  }

  private async selectFieldUntilDependentVisible(
    labels: string[],
    optionText: string,
    controlIds: string[],
    dependentLabels: string[],
    dependentControlIds: string[],
    root: FieldRoot,
  ) {
    const expectedOption = normalizeArabicText(optionText);
    const attemptTimeoutMs = Math.min(
      agentConfig.actionTimeoutMs,
      10_000,
    );
    let lastSelectedText = '';

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const currentField = await this.exactFieldByLabel(
        labels,
        controlIds,
        root,
      );
      const currentText = currentField
        ? await this.selectedFieldText(currentField)
        : '';
      const selectionAlreadyMatches = normalizeArabicText(currentText)
        === expectedOption;

      if (attempt > 1 && currentField && selectionAlreadyMatches) {
        const { controlId } = await this.dropdownIdentity(
          currentField,
          controlIds,
        );
        const backingControl = controlId
          ? await this.backingControlForField(
              currentField,
              controlId,
              root,
            )
          : null;
        await (backingControl || currentField)
          .dispatchEvent('change')
          .catch(() => undefined);
      } else {
        await this.selectField(labels, optionText, controlIds, root);
      }

      const deadline = Date.now() + attemptTimeoutMs;
      let stableSince: number | null = null;
      while (Date.now() < deadline) {
        const selectedField = await this.exactFieldByLabel(
          labels,
          controlIds,
          root,
        );
        lastSelectedText = selectedField
          ? await this.selectedFieldText(selectedField)
          : '';
        const selectionMatches = normalizeArabicText(lastSelectedText)
          === expectedOption;
        const dependentField = await this.exactFieldByLabel(
          dependentLabels,
          dependentControlIds,
          root,
        );

        if (selectionMatches && dependentField) {
          stableSince ??= Date.now();
          if (Date.now() - stableSince >= 800) return;
        } else {
          stableSince = null;
        }
        await this.page.waitForTimeout(150);
      }
    }

    throw new HumanInterventionError(
      `اختيار «${optionText}» في «${labels[0]}» لم يُظهر حقل «${dependentLabels[0]}»`,
      'TAQADI_DYNAMIC_FIELD_NOT_REVEALED',
      {
        field: labels[0],
        expectedOption: optionText,
        selectedOption: lastSelectedText,
        dependentField: dependentLabels[0],
        controlIds,
        dependentControlIds,
        fieldRoot: await this.fieldRootDiagnostics(root),
        url: this.page.url(),
      },
    );
  }

  private async captchaVisible(page: Page = this.page) {
    const captcha = page.locator(
      'iframe[src*="recaptcha"]:visible, iframe[src*="captcha"]:visible, '
      + '.g-recaptcha:visible, [class*="captcha"]:visible',
    );
    if ((await captcha.count()) > 0) return true;

    const text = page
      .getByText(/لست روبوت|أنا لست روبوت|CAPTCHA|رمز التحقق/i);
    const count = Math.min(await text.count(), 10);
    for (let index = 0; index < count; index += 1) {
      if (await text.nth(index).isVisible().catch(() => false)) return true;
    }
    return false;
  }

  private async looksLoggedOut(page: Page = this.page) {
    const url = page.url().toLowerCase();
    if (
      url.includes('signin')
      || url.includes('nas.gov.qa')
      || url.includes('/authn/')
      || url.includes('/itc/login')
    ) return true;

    const username = page.locator(
      'input#username, input[name="username"]',
    );
    const password = page.locator(
      'input#password, input[name="password"]',
    );
    const loginFormVisible = await username.isVisible().catch(() => false)
      && await password.isVisible().catch(() => false);
    const caseControls = await page
      .getByText(/الدعاوى|إدارة الدعاوى|قيد دعوى|لوحة التحكم/i)
      .count();
    return loginFormVisible && caseControls === 0;
  }

  private async isAuthenticatedPortalPage(page: Page) {
    if (page.isClosed()) return false;
    const url = page.url().toLowerCase();
    if (!url.includes('/itc/home')) return false;
    if (await this.looksLoggedOut(page) || await this.captchaVisible(page)) {
      return false;
    }

    const bodyText = normalizeText(
      await page.locator('body').innerText().catch(() => ''),
    ).toLowerCase();
    if (bodyText.includes('the requested url was rejected')) return false;

    return page.locator(
      '#main:visible, #left-panel:visible, #header:visible, '
      + 'form#logout-form:visible',
    ).first().isVisible().catch(() => false);
  }

  private async adoptAuthenticatedPortalPage() {
    const contextPages = this.page.context().pages();
    const candidates = [
      this.page,
      ...contextPages
        .filter((candidate) => candidate !== this.page)
        .reverse(),
    ];

    for (const candidate of candidates) {
      if (!(await this.isAuthenticatedPortalPage(candidate))) continue;
      this.page = candidate;
      this.page.setDefaultTimeout(agentConfig.actionTimeoutMs);
      await this.page.bringToFront().catch(() => undefined);
      return true;
    }
    return false;
  }

  async ensureAuthenticated(
    onWaitingForLogin: () => Promise<void>,
  ): Promise<void> {
    if (await this.adoptAuthenticatedPortalPage()) {
      await this.confirmAccountPromptWithEnterIfNeeded();
      return;
    }

    await this.page.goto(agentConfig.portalUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await this.page.waitForTimeout(2_000);

    if (
      await this.adoptAuthenticatedPortalPage()
      || (!(await this.looksLoggedOut()) && !(await this.captchaVisible()))
    ) {
      await this.confirmAccountPromptWithEnterIfNeeded();
      return;
    }

    await this.page.bringToFront();
    await onWaitingForLogin();
    await this.startTawtheeqLoginIfNeeded();
    const deadline = Date.now() + agentConfig.loginTimeoutMs;
    while (Date.now() < deadline) {
      await this.page.waitForTimeout(1_000);
      await this.continueTawtheeqLoginIfReady();
      const authenticationError = await this.tawtheeqAuthenticationError();
      if (authenticationError) {
        throw new HumanInterventionError(
          authenticationError,
          'TAWTHEEQ_CREDENTIALS_REJECTED',
          { url: this.page.url() },
        );
      }
      if (
        await this.adoptAuthenticatedPortalPage()
        || (!(await this.looksLoggedOut()) && !(await this.captchaVisible()))
      ) {
        await this.confirmAccountPromptWithEnterIfNeeded();
        return;
      }
    }

    throw new HumanInterventionError(
      'انتهت مهلة تسجيل الدخول إلى تقاضي. سجّل الدخول ثم أعد المحاولة.',
      'LOGIN_REQUIRED',
      {
        url: this.page.url(),
        openPages: this.page.context().pages().map((page) => page.url()),
      },
    );
  }

  async detectCurrentPosition(
    payload: FilingPayload,
  ): Promise<TaqadiPortalPosition> {
    const observation = await observeTaqadiPage(this.page, payload);
    const position = inferPortalStage(observation);

    return {
      ...position,
      url: observation.url,
      validationMessages: observation.validationMessages,
    };
  }

  async waitForPortalStage(
    expectedStage: TaqadiPortalStage,
    payload: FilingPayload,
    previousStage: TaqadiPortalStage,
    timeoutMs = 15_000,
  ): Promise<TaqadiPortalPosition> {
    const stageConfirmed = (position: TaqadiPortalPosition) => {
      if (!stageReached(position.stage, expectedStage)) return false;
      if (position.confidence === 'high') return true;
      // بعد حفظ تفاصيل الدعوى تصل صفحة الأطراف غالبًا بدرجة متوسطة
      // (زر إضافة طرف فقط، بدون تبويب نشط) — نقبلها إن كانت غير متنازع عليها.
      const score = position.score || 0;
      const runnerUp = position.candidates?.[1];
      const uncontested = !runnerUp || score - (runnerUp.score || 0) >= 3;
      return score >= 7 && uncontested && position.stage !== 'unknown';
    };

    const deadline = Date.now() + timeoutMs;
    // صفحات تقاضي تومض بين المراحل أثناء إعادة الرسم (رُصدت قراءة
    // case_details وحيدة ثم عادت classification بعد ثانيتين في مهمة
    // حقيقية) — النجاح يتطلب قراءتين مؤكدتين متتاليتين لا قراءة واحدة.
    let consecutiveConfirmations = 0;
    let latest = await this.detectCurrentPosition(payload);
    while (Date.now() < deadline) {
      if (stageConfirmed(latest)) {
        consecutiveConfirmations += 1;
        if (consecutiveConfirmations >= 2) return latest;
      } else {
        consecutiveConfirmations = 0;
      }
      await this.page.waitForTimeout(350);
      latest = await this.detectCurrentPosition(payload);
    }

    const observation = await observeTaqadiPage(this.page, payload);
    throw new HumanInterventionError(
      `لم يتحقق الوكيل من الانتقال من «${previousStage}» إلى «${expectedStage}»`,
      'PORTAL_STAGE_TRANSITION_FAILED',
      {
        previousStage,
        expectedStage,
        actualStage: latest.stage,
        actualLabel: latest.label,
        confidence: latest.confidence,
        score: latest.score,
        evidence: latest.evidence,
        candidates: latest.candidates,
        validationMessages: latest.validationMessages,
        observation: summarizeObservation(observation),
        resumeSupported: true,
        url: latest.url,
      },
    );
  }

  async openNewCase() {
    await this.page.waitForFunction(
      () => {
        const text = document.body?.innerText || '';
        return text.includes('إدارة الدعاوى')
          || text.includes('ادارة الدعاوى');
      },
      undefined,
      { timeout: 15_000 },
    ).catch(() => undefined);
    await this.clickAny(
      ['إدارة الدعاوى', 'ادارة الدعاوى', 'الدعاوى', 'قيد الدعاوى'],
      'إدارة الدعاوى',
    );
    await this.page.waitForTimeout(1_000);
    await this.clickAny(
      ['قيد دعوى', 'إقامة دعوى', 'إنشاء دعوى', 'دعوى جديدة'],
      'قيد دعوى جديدة',
    );
    await this.page.waitForTimeout(1_500);
  }

  async configureCase(payload: FilingPayload) {
    const caseSubtype = normalizeArabicText(
      payload.classification.caseSubtype,
    ) === normalizeArabicText('عقود إيجار السيارات')
      ? 'عقود إيجار السيارات وخدمات الليموزين'
      : payload.classification.caseSubtype;

    await this.selectField(
      ['درجة التقاضي'],
      payload.classification.litigationDegree,
      ['tempctype_court'],
    );
    await this.selectField(
      ['النوع', 'نوع الدعوى', 'تصنيف الدعوى'],
      payload.classification.caseType,
      ['tempctype_category'],
    );
    await this.selectField(
      ['النوع الفرعي', 'موضوع الدعوى', 'التصنيف الفرعي'],
      caseSubtype,
      ['tempctype_type'],
    );
    await this.selectField(
      ['التصنيف', 'الاختصاص', 'ينطبق'],
      payload.classification.applicability,
      ['tempctype_nature'],
    );
    await this.clickAny(['التالي'], 'التالي');
    await this.page.locator('#facts').waitFor({
      state: 'visible',
      timeout: 8_000,
    }).catch(() => {
      throw new HumanInterventionError(
        'رفض تقاضي الانتقال من تصنيف الدعوى إلى تفاصيلها',
        'CASE_CLASSIFICATION_VALIDATION_FAILED',
        { url: this.page.url() },
      );
    });
  }

  async fillCaseDetails(payload: FilingPayload) {
    await this.selectField(
      ['نوع المطالبة'],
      'قيمة المطالبة',
      ['tempCostOrders0.type'],
    );
    await this.fillField(
      ['عنوان الدعوى', 'موضوع الدعوى'],
      payload.case.title,
      true,
      ['applicantReferenceNo'],
    );
    await this.fillField(
      ['الوقائع'],
      payload.case.facts,
      true,
      ['facts'],
    );
    await this.fillRichText(
      'caseDetails',
      payload.case.claims,
    );
    await this.fillField(
      ['قيمة المطالبة', 'المبلغ', 'إجمالي المطالبة'],
      String(payload.case.amount),
      true,
      ['tempCostOrders0.description'],
    );
    await this.fillField(
      ['المبلغ كتابة', 'المبلغ الإجمالي كتابة'],
      payload.case.amountInWords,
      false,
      ['totalAmountInText'],
    );
    await this.clickAny(['التالي'], 'متابعة بعد تفاصيل الدعوى');
    await this.page.locator('#facts').waitFor({
      state: 'hidden',
      timeout: 8_000,
    }).catch(async () => {
      const validationMessages = await this.page
        .locator('.has-error, .field-validation-error, .help-block, .mandatory-error')
        .evaluateAll((elements) =>
          elements
            .map((element) => element.textContent?.replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .slice(0, 20),
        )
        .catch(() => []);
      throw new HumanInterventionError(
        'رفض تقاضي الانتقال من تفاصيل الدعوى بسبب حقول غير مكتملة',
        'CASE_DETAILS_VALIDATION_FAILED',
        {
          portalStage: 'case_details',
          portalLabel: 'تفاصيل الدعوى',
          resumeSupported: true,
          requiredActions: validationMessages.length > 0
            ? validationMessages
            : ['راجع الحقول الإلزامية المعلّمة داخل تقاضي ثم احفظ الصفحة'],
          validationMessages,
          url: this.page.url(),
        },
      );
    });
  }

  private partyPane() {
    return this.page.locator(
      '.tab-pane.active[data-tabpane-name="case_party_grid"], '
      + '.tab-pane.active:has(button[title="إضافة طرف"]), '
      + '.tab-pane.active:has(button[title="button_add_party_1"])',
    ).first();
  }

  private async activePartyDialog(): Promise<Locator | null> {
    const dialogs = this.page.locator(
      '#modal-dialog:visible, .modal.in:visible, .modal.show:visible, '
      + '.modal:visible, [role="dialog"]:visible',
    );
    const dialogCount = await dialogs.count();
    for (let index = dialogCount - 1; index >= 0; index -= 1) {
      const candidate = dialogs.nth(index);
      const partyControls = candidate.locator(
        '[id="category"], [id="type"], [id="priority"]',
      );
      if (
        await candidate.isVisible().catch(() => false)
        && await partyControls.count() > 0
      ) return candidate;
    }
    return null;
  }

  private async requireActivePartyDialog(
    description: string,
  ): Promise<Locator> {
    const deadline = Date.now() + 15_000;
    do {
      const dialog = await this.activePartyDialog();
      if (dialog) return dialog;
      await this.page.waitForTimeout(200);
    } while (Date.now() < deadline);

    const requestRejected = normalizeText(
      await this.page.locator('body').innerText().catch(() => ''),
    )
      .toLowerCase()
      .includes('the requested url was rejected');
    throw new HumanInterventionError(
      requestRejected
        ? 'رفض موقع تقاضي الطلب مؤقتًا أثناء فتح بيانات الطرف'
        : `لم يفتح تقاضي نموذج «${description}»`,
      requestRejected
        ? 'TAQADI_REQUEST_REJECTED'
        : 'PARTY_EDITOR_NOT_OPENED',
      { url: this.page.url(), rejected: requestRejected },
    );
  }

  private async partyRow(
    values: Array<string | null | undefined>,
  ): Promise<Locator | null> {
    const pane = this.partyPane();
    for (const value of values) {
      if (!value) continue;
      const row = pane
        .locator('tr[role="row"], .party-card')
        .filter({ hasText: value });
      const visible = await this.firstVisible([row]);
      if (visible) return visible;
    }
    return null;
  }

  private async assertPartyOrder(
    values: Array<string | null | undefined>,
    expectedOrder: number,
    errorCode: string,
  ) {
    const deadline = Date.now() + 10_000;
    let savedOrder: string | null = null;
    let rowText: string | null = null;

    do {
      await this.page.locator(
        '.k-loading-mask:visible, .blockUI:visible, '
        + '.loading-overlay:visible, [aria-busy="true"]:visible',
      ).waitFor({
        state: 'hidden',
        timeout: 2_000,
      }).catch(() => undefined);
      const row = await this.partyRow(values);
      if (row) {
        rowText = await row.innerText().catch(() => null);
        const cells = row.locator('td, [role="gridcell"]');
        if (await cells.count() >= 4) {
          savedOrder = normalizeText(
            await cells.nth(3).innerText().catch(() => ''),
          );
          if (savedOrder === String(expectedOrder)) return;
        }
      }
      await this.page.waitForTimeout(250);
    } while (Date.now() < deadline);

    throw new HumanInterventionError(
      `حفظ تقاضي ترتيب الطرف بالقيمة «${savedOrder || 'غير ظاهرة'}» بدل «${expectedOrder}»`,
      errorCode,
      {
        expectedOrder,
        savedOrder,
        rowText,
        priorityDiagnostics: this.lastPriorityDiagnostics,
        url: this.page.url(),
      },
    );
  }

  private async openPartyEditor(row: Locator): Promise<Locator> {
    let editDiagnostics: Record<string, unknown> = {};
    const networkActivity: Array<Record<string, unknown>> = [];
    const recordNetworkEvent = (event: Record<string, unknown>) => {
      networkActivity.push(event);
      if (networkActivity.length > 30) networkActivity.shift();
    };
    const onRequest = (request: Request) => {
      if (
        !['fetch', 'xhr', 'document'].includes(request.resourceType())
        || !request.url().includes('taqadi.sjc.gov.qa')
      ) return;
      recordNetworkEvent({
        kind: 'request',
        method: request.method(),
        resourceType: request.resourceType(),
        url: request.url(),
      });
    };
    const onResponse = (response: Response) => {
      const request = response.request();
      if (
        !['fetch', 'xhr', 'document'].includes(request.resourceType())
        || !response.url().includes('taqadi.sjc.gov.qa')
      ) return;
      recordNetworkEvent({
        kind: 'response',
        method: request.method(),
        resourceType: request.resourceType(),
        status: response.status(),
        url: response.url(),
      });
    };
    let networkCaptureTimer: ReturnType<typeof setTimeout> | null = null;
    const stopNetworkCapture = () => {
      this.page.off('request', onRequest);
      this.page.off('response', onResponse);
      if (networkCaptureTimer) clearTimeout(networkCaptureTimer);
      networkCaptureTimer = null;
    };
    const nameCell = await this.firstVisible([
      row.locator('td, [role="gridcell"]').first(),
      row.locator('[data-field="name"], .party-name').first(),
    ]);
    if (!nameCell) {
      throw new HumanInterventionError(
        'لم يجد الوكيل اسم الطرف القابل للفتح داخل صف الأطراف',
        'PARTY_NAME_NOT_FOUND',
        { rowText: await row.innerText().catch(() => ''), url: this.page.url() },
      );
    }
    this.page.on('request', onRequest);
    this.page.on('response', onResponse);
    networkCaptureTimer = setTimeout(stopNetworkCapture, 30_000);
    await nameCell.click();
    await this.page.waitForTimeout(1_500);

    const partyDialog = this.page.locator(
      '#modal-dialog:has([id="priority"]), '
      + '.modal.in:has([id="priority"]), '
      + '.modal.show:has([id="priority"]), '
      + '[role="dialog"]:has([id="priority"])',
    ).last();
    if (!(await partyDialog.isVisible().catch(() => false))) {
      const editButton = await this.firstVisible([
        row.locator('.k-grid-modify'),
        row.locator('a, button').filter({ hasText: /تحديث|تعديل/ }),
        row.locator('[title*="تحديث"], [title*="تعديل"]'),
      ]);
      if (!editButton) {
        stopNetworkCapture();
        throw new HumanInterventionError(
          'تم تحديد الطرف لكن لم يجد الوكيل زر تعديل بياناته',
          'PARTY_EDIT_ACTION_NOT_FOUND',
          { rowText: await row.innerText().catch(() => ''), url: this.page.url() },
        );
      }
      editDiagnostics = await editButton.evaluate((element) => ({
        tagName: element.tagName,
        className: element.getAttribute('class'),
        href: element.getAttribute('href'),
        onclick: element.getAttribute('onclick'),
        outerHTML: element.outerHTML,
        rowClassName: element.closest('tr')?.getAttribute('class'),
        rowAriaSelected: element.closest('tr')?.getAttribute('aria-selected'),
      })).catch(() => ({}));
      await editButton.hover();
      await this.page.waitForTimeout(400);
      await editButton.click({ delay: 120 });
    }

    const opened = await partyDialog.waitFor({
      state: 'visible',
      timeout: 15_000,
    }).then(() => true).catch(() => false);
    const priority = partyDialog.locator(
      'input.k-formatted-value:visible',
    ).first();
    stopNetworkCapture();
    if (!opened || !(await priority.isVisible().catch(() => false))) {
      const rejectionText = normalizeText(
        await this.page.locator('body').innerText().catch(() => ''),
      );
      const requestRejected = rejectionText
        .toLowerCase()
        .includes('the requested url was rejected');
      throw new HumanInterventionError(
        requestRejected
          ? 'رفض موقع تقاضي الطلب مؤقتًا أثناء فتح بيانات الطرف'
          : 'لم يفتح تقاضي نموذج تعديل الطرف',
        requestRejected
          ? 'TAQADI_REQUEST_REJECTED'
          : 'PARTY_EDITOR_NOT_OPENED',
        {
          url: this.page.url(),
          editDiagnostics,
          rejected: requestRejected,
          networkActivity,
        },
      );
    }
    return partyDialog;
  }

  private async addPartyEditor(description: string): Promise<Locator> {
    const pane = this.partyPane();
    const addButtonCandidates = [
      pane.locator(
        'button[title="إضافة طرف"], button[title="button_add_party_1"]',
      ),
      pane.getByRole('button', {
        name: /إضافة طرف|إضافة مدع|button_add_party_1/,
      }),
      this.page.locator(
        'button[title="إضافة طرف"], button[title="button_add_party_1"]',
      ),
      this.page.getByRole('button', {
        name: /إضافة طرف|إضافة مدع|button_add_party_1/,
      }),
      this.page.locator('button').filter({ hasText: 'button_add_party_1' }),
    ];
    let addButton: Locator | null = null;
    const findDeadline = Date.now() + 30_000;
    while (!addButton && Date.now() < findDeadline) {
      addButton = await this.firstVisible(addButtonCandidates);
      if (!addButton) await this.page.waitForTimeout(250);
    }
    if (!addButton) {
      throw new HumanInterventionError(
        `لم يجد الوكيل خيار «${description}» في جدول الأطراف`,
        'TAQADI_UI_CHANGED',
        { url: this.page.url() },
      );
    }

    const enableDeadline = Date.now() + 30_000;
    while (!(await addButton.isEnabled().catch(() => false))) {
      if (Date.now() >= enableDeadline) {
        throw new HumanInterventionError(
          `ظل خيار «${description}» معطّلًا بعد انتهاء مهلة تحديث جدول الأطراف`,
          'PARTY_ADD_DISABLED',
          { url: this.page.url() },
        );
      }
      await this.page.waitForTimeout(250);
    }
    await addButton.click();
    const partyDialog = await this.requireActivePartyDialog(description);
    const category = await this.fieldByLabel(
      ['تصنيف الطرف', 'نوع الشخص'],
      ['category'],
      partyDialog,
    );
    if (!category) {
      throw new HumanInterventionError(
        'لم يفتح تقاضي نموذج إضافة الطرف',
        'PARTY_EDITOR_NOT_OPENED',
        { url: this.page.url() },
      );
    }
    return partyDialog;
  }

  private async saveOpenParty(openDialog?: Locator) {
    const dialogRoot = openDialog || await this.activePartyDialog();
    const root = dialogRoot || this.page.locator('body');

    const save = await this.firstVisible([
      root.locator('button, a').filter({ hasText: /^\s*حفظ\s*$/ }),
      root.locator('button, a').filter({ hasText: /تحديث وحفظ/ }),
      root.getByRole('button', { name: /^حفظ$/ }),
      root.getByRole('link', { name: /^حفظ$/ }),
      root.getByRole('button', { name: /تحديث وحفظ/ }),
      root.getByRole('link', { name: /تحديث وحفظ/ }),
      this.page.getByRole('button', { name: /^حفظ$/ }),
      this.page.locator('button:visible').filter({ hasText: /^حفظ$/ }),
      this.page.getByRole('link', { name: /^حفظ$/ }),
      this.page.locator('a:visible').filter({ hasText: /^حفظ$/ }),
      this.page.locator(
        'input[type="submit"][value="حفظ"], input[type="button"][value="حفظ"]',
      ),
      this.page.getByRole('button', { name: /تحديث وحفظ/ }),
      this.page.getByRole('link', { name: /تحديث وحفظ/ }),
    ]);
    if (!save) {
      throw new HumanInterventionError(
        'لم يجد الوكيل زر حفظ نموذج الطرف المفتوح',
        'PARTY_SAVE_NOT_FOUND',
        { url: this.page.url() },
      );
    }
    await save.click();
    if (dialogRoot) {
      const closed = await dialogRoot.waitFor({
        state: 'hidden',
        timeout: 15_000,
      }).then(() => true).catch(() => false);
      if (!closed) {
        const validationMessages = await dialogRoot
          .locator(
            '.has-error, .field-validation-error, .help-block, '
            + '.mandatory-error, .validation-summary-errors',
          )
          .evaluateAll((elements) =>
            elements
              .map((element) =>
                element.textContent?.replace(/\s+/g, ' ').trim())
              .filter(Boolean)
              .slice(0, 20),
          )
          .catch(() => []);
        throw new HumanInterventionError(
          'رفض تقاضي حفظ بيانات الطرف بسبب حقول غير مكتملة أو غير صحيحة',
          'PARTY_SAVE_VALIDATION_FAILED',
          { validationMessages, url: this.page.url() },
        );
      }
    } else {
      await this.page.locator('.modal-backdrop').waitFor({
        state: 'hidden',
        timeout: 10_000,
      }).catch(() => undefined);
    }
    await this.page.waitForTimeout(700);
  }

  async validateRepresentativeFirst(payload: FilingPayload) {
    await this.page.locator(
      '.k-loading-mask:visible, .blockUI:visible, '
      + '.loading-overlay:visible, [aria-busy="true"]:visible',
    ).waitFor({
      state: 'hidden',
      timeout: 10_000,
    }).catch(() => undefined);
    await this.page.waitForTimeout(partyStabilizationMs);

    const representativeName = agentConfig.representative.name;
    const row = await this.partyRow([representativeName]);
    if (!row) {
      throw new HumanInterventionError(
        `لم يجد الوكيل الطرف الإلزامي «${representativeName}» لمراجعته أولًا`,
        'REPRESENTATIVE_NOT_FOUND',
        { representativeName, url: this.page.url() },
      );
    }
    const partyDialog = await this.openPartyEditor(row);

    await this.fillField(
      ['الترتيب حسب الصحيفة', 'ترتيب الطرف', 'الترتيب'],
      String(payload.representative.partyOrder),
      false,
      ['priority'],
      partyDialog,
    );
    await this.fillField(
      ['رقم الجوال', 'الجوال', 'الهاتف'],
      agentConfig.representative.phone,
      false,
      ['mobileNo', 'phoneNo', 'phone', 'mobile'],
      partyDialog,
    );
    await this.fillField(
      ['البريد الإلكتروني'],
      agentConfig.representative.email,
      false,
      ['email', 'emailAddress'],
      partyDialog,
    );
    await this.fillField(
      ['العنوان'],
      agentConfig.representative.address,
      false,
      ['address'],
      partyDialog,
    );
    await this.selectField(
      ['الجنسية'],
      agentConfig.representative.nationality,
      ['nationality'],
      partyDialog,
    ).catch(() => undefined);
    await this.saveOpenParty(partyDialog);
    await this.assertPartyOrder(
      [representativeName],
      payload.representative.partyOrder,
      'REPRESENTATIVE_ORDER_MISMATCH',
    );
  }

  /**
   * صفحة الأطراف هي الصفحة الوحيدة التي يُضغط فيها زر «حفظ» على مستوى الصفحة:
   * الحفظ يثبّت مسودة الدعوى ويفعّل جدول الأطراف، ثم يبدأ تسجيل الأطراف.
   * يجب ألا يطابق الزر «حفظ ومتابعة» — المطابقة دقيقة (exact).
   */
  async savePartiesDraft() {
    const loadingMasks = this.page.locator(
      '.k-loading-mask:visible, .blockUI:visible, '
      + '.loading-overlay:visible, [aria-busy="true"]:visible',
    );
    await loadingMasks.waitFor({
      state: 'hidden',
      timeout: 10_000,
    }).catch(() => undefined);

    const save = await this.firstVisible([
      this.page.getByRole('button', { name: /^\s*حفظ\s*$/ }),
      this.page.getByRole('link', { name: /^\s*حفظ\s*$/ }),
      this.page.locator('button:visible').filter({ hasText: /^\s*حفظ\s*$/ }),
      this.page.locator('a:visible').filter({ hasText: /^\s*حفظ\s*$/ }),
      this.page.locator(
        'input[type="submit"][value="حفظ"], input[type="button"][value="حفظ"]',
      ),
    ]);
    if (!save) {
      throw new HumanInterventionError(
        'لم يجد الوكيل زر «حفظ» في صفحة الأطراف قبل تسجيل الأطراف',
        'TAQADI_UI_CHANGED',
        { expectedLabels: ['حفظ'], url: this.page.url() },
      );
    }
    await save.click();
    await this.page.waitForTimeout(500);

    await loadingMasks.waitFor({
      state: 'hidden',
      timeout: 15_000,
    }).catch(() => undefined);
    await this.page.waitForTimeout(partyStabilizationMs);
  }

  async validateCompanyParty(payload: FilingPayload) {
    const company = await this.partyRow([
      payload.plaintiff.name,
      payload.plaintiff.commercialRegistration,
    ]);
    let partyDialog: Locator;
    if (!company) {
      partyDialog = await this.addPartyEditor('إضافة الشركة');
      await this.selectField(
        ['تصنيف الطرف', 'نوع الشخص'],
        'شركة',
        ['category'],
        partyDialog,
      );
      await this.selectField(
        ['صفة الطرف'],
        'المدعي',
        ['type'],
        partyDialog,
      );
      await this.selectField(
        ['نوع الجهات المعنوية', 'نوع الشركة'],
        'شركة ذات مسؤولية محدودة',
        ['compOrEstaType'],
        partyDialog,
      );
      await this.selectField(
        ['جنسية الشركة'],
        'قطري',
        ['companyClassification'],
        partyDialog,
      );
      await this.selectField(
        ['رقم السجل التجاري أو قيد المنشأة صادر عن'],
        'وزارة التجارة والصناعة',
        ['crIssuedBy'],
        partyDialog,
      );
      await this.fillField(
        [
          'رقم السجل التجاري',
          'رقم السجل التجاري أو قيد المنشأة',
          'رقم قيد المنشأة',
        ],
        payload.plaintiff.commercialRegistration,
        true,
        ['crNo', 'crNumber', 'commercialRegistrationNo', 'registrationNo'],
        partyDialog,
        {
          exactLabel: true,
          waitForMs: agentConfig.actionTimeoutMs,
        },
      );
      await this.fillField(
        ['اسم الجهة المعنوية', 'اسم الشركة', 'اسم الطرف'],
        payload.plaintiff.name,
        true,
        ['name'],
        partyDialog,
      );
      await this.fillField(
        ['يمثله', 'ممثل الشركة'],
        agentConfig.representative.name,
        false,
        ['ownerName'],
        partyDialog,
      );
      await this.fillField(
        ['اسم البنك باللغة العربية'],
        agentConfig.company.bankNameAr,
        true,
        ['bankNameArab', 'bankNameAr', 'arabicBankName'],
        partyDialog,
      );
      await this.fillField(
        ['اسم البنك باللغة الإنجليزية', 'اسم البنك باللغة الانجليزية'],
        agentConfig.company.bankNameEn,
        true,
        ['bankName', 'bankNameEn', 'englishBankName'],
        partyDialog,
      );
      await this.fillField(
        ['رقم IBAN', 'IBAN'],
        agentConfig.company.iban,
        true,
        ['iban', 'ibanNo', 'ibanNumber'],
        partyDialog,
      );
      await this.fillField(
        ['رقم السويفت', 'SWIFT'],
        agentConfig.company.swift,
        true,
        ['swiftNumber', 'swift', 'swiftCode'],
        partyDialog,
      );
      await this.fillField(
        ['عنوان البنك'],
        agentConfig.company.bankAddress,
        true,
        ['bankAddress'],
        partyDialog,
      );
      await this.selectField(
        ['بلد البنك'],
        agentConfig.company.bankCountry,
        [],
        partyDialog,
      );
      await this.selectField(
        ['الدولة'],
        agentConfig.company.country,
        [],
        partyDialog,
      );
      await this.fillField(
        ['العنوان'],
        agentConfig.company.address,
        true,
        ['addresses0.address'],
        partyDialog,
      );
      await this.fillField(
        ['البريد الإلكتروني', 'البريد الالكتروني'],
        agentConfig.company.email,
        true,
        ['email', 'emailAddress'],
        partyDialog,
      );
      const translationNo = partyDialog.locator('#tempTransalationReq2');
      if (await translationNo.isVisible().catch(() => false)) {
        await translationNo.check();
      }
    } else {
      partyDialog = await this.openPartyEditor(company);
    }

    await this.fillField(
      ['الترتيب حسب الصحيفة', 'ترتيب الطرف', 'الترتيب'],
      String(payload.plaintiff.partyOrder),
      true,
      ['priority'],
      partyDialog,
    );
    await this.saveOpenParty(partyDialog);
    await this.assertPartyOrder(
      [
        payload.plaintiff.name,
        payload.plaintiff.commercialRegistration,
      ],
      payload.plaintiff.partyOrder,
      'PLAINTIFF_ORDER_MISMATCH',
    );
  }

  async addDefendant(
    payload: FilingPayload,
    options: { continueAfterSave?: boolean } = {},
  ) {
    const existing = await this.partyRow([
      payload.defendant.fullName,
      payload.defendant.idNumber,
    ]);
    let partyDialog: Locator;
    if (existing) {
      partyDialog = await this.openPartyEditor(existing);
    } else {
      partyDialog = await this.addPartyEditor('إضافة المدعى عليه');
      await this.selectField(
        ['تصنيف الطرف', 'نوع الشخص'],
        'شخص طبيعي',
        ['category'],
        partyDialog,
      );
      await this.selectField(
        ['صفة الطرف'],
        'المدعى عليه',
        ['type'],
        partyDialog,
      );
    }

    const identityTypeLabels = [
      'نوع البطاقة',
      'نوع الهوية',
      'نوع الوثيقة',
      'نوع إثبات الهوية',
      'نوع إثبات الشخصية',
      'نوع المستند',
    ];
    const identityTypeControlIds = [
      'proofOfIdentity',
      'idType',
      'identityType',
      'documentType',
    ];
    const identityNumberLabels = [
      'رقم الهوية',
      'رقم البطاقة',
      'الرقم الشخصي',
      'رقم إثبات الهوية',
      'رقم الوثيقة',
      'رقم رخصة المقيم',
    ];
    const identityNumberControlIds = [
      'tempIdentityNo',
      'identityNo',
      'idNumber',
      'identityNumber',
      'documentNumber',
      'proofOfIdentityNo',
      'cardNumber',
      'qid',
    ];

    await this.selectFieldUntilDependentVisible(
      ['الجنسية'],
      nationalityForTaqadi(payload.defendant.nationality || ''),
      ['nationality'],
      identityTypeLabels,
      identityTypeControlIds,
      partyDialog,
    );
    if (payload.defendant.idType) {
      await this.selectFieldUntilDependentVisible(
        identityTypeLabels,
        identityTypeForTaqadi(
          payload.defendant.idType,
          payload.defendant.idNumber,
        ),
        identityTypeControlIds,
        identityNumberLabels,
        identityNumberControlIds,
        partyDialog,
      );
    }
    await this.fillField(
      identityNumberLabels,
      payload.defendant.idNumber,
      true,
      identityNumberControlIds,
      partyDialog,
      {
        exactLabel: true,
        waitForMs: agentConfig.actionTimeoutMs,
      },
    );
    await this.fillField(
      ['الترتيب حسب الصحيفة', 'ترتيب الطرف', 'الترتيب'],
      '3',
      true,
      ['priority'],
      partyDialog,
    );
    // Taqadi redraws the name controls after identity/nationality changes.
    // Reapply them last so the required first name cannot be silently cleared.
    await this.fillField(
      ['الاسم الأول', 'الاسم'],
      payload.defendant.firstName || payload.defendant.fullName,
      true,
      ['firstName', 'partyFirstName'],
      partyDialog,
    );
    await this.fillField(
      ['الاسم الأوسط'],
      payload.defendant.middleName,
      false,
      ['middleName', 'secondName', 'fatherName'],
      partyDialog,
    );
    await this.fillField(
      ['اسم العائلة', 'الاسم الأخير'],
      payload.defendant.lastName,
      true,
      ['lastName', 'familyName'],
      partyDialog,
    );
    // Taqadi redraws several previously completed fields after Kendo changes.
    // Reconcile the whole required defendant form before saving.
    await this.fillStableDefendantRequiredFields(
      {
        firstName: payload.defendant.firstName
          || payload.defendant.fullName,
        lastName: payload.defendant.lastName,
        identityNumber: payload.defendant.idNumber,
        identityNumberLabels,
        identityNumberControlIds,
        address: agentConfig.defendantDefaults.address,
        phone: phoneForTaqadi(payload.defendant.phone),
        email: agentConfig.defendantDefaults.email,
        partyOrder: '3',
      },
      partyDialog,
    );
    const finalSelections = [
      {
        labels: ['تصنيف الطرف', 'نوع الشخص'],
        controlIds: ['category'],
        expected: 'شخص طبيعي',
      },
      {
        labels: ['صفة الطرف'],
        controlIds: ['type'],
        expected: 'المدعى عليه',
      },
      {
        labels: ['الجنسية'],
        controlIds: ['nationality'],
        expected: nationalityForTaqadi(
          payload.defendant.nationality || '',
        ),
      },
      {
        labels: identityTypeLabels,
        controlIds: identityTypeControlIds,
        expected: identityTypeForTaqadi(
          payload.defendant.idType,
          payload.defendant.idNumber,
        ),
      },
    ];
    for (const selection of finalSelections) {
      const field = await this.fieldByLabel(
        selection.labels,
        selection.controlIds,
        partyDialog,
      );
      if (!field) {
        throw new HumanInterventionError(
          `لم يجد الوكيل حقل «${selection.labels[0]}» عند المراجعة النهائية`,
          'TAQADI_UI_CHANGED',
          {
            expectedLabels: selection.labels,
            url: this.page.url(),
          },
        );
      }
      await this.assertSelectedField(
        field,
        selection.labels,
        selection.expected,
      );
    }
    await this.saveOpenParty(partyDialog);
    await this.assertPartyOrder(
      [
        payload.defendant.fullName,
        payload.defendant.idNumber,
      ],
      3,
      'DEFENDANT_ORDER_MISMATCH',
    );
    if (options.continueAfterSave === false) return;
    await this.continueAfterParties();
  }

  async continueAfterParties() {
    await this.clickAny(['التالي'], 'متابعة بعد الأطراف');
    await this.page.waitForTimeout(1_000);
  }

  private async uploadDocument(
    document: MaterializedDocument,
    index: number,
  ) {
    const labels = documentLabels[document.key] || [document.name];
    let input: Locator | null = null;

    for (const label of labels) {
      const containers = this.page
        .locator('tr, section, article, .row, .form-group, .document-row')
        .filter({ hasText: label })
        .filter({ has: this.page.locator('input[type="file"]') });
      const containerCount = Math.min(await containers.count(), 50);
      for (let containerIndex = 0; containerIndex < containerCount; containerIndex += 1) {
        const container = containers.nth(containerIndex);
        if (!(await container.isVisible().catch(() => false))) continue;
        input = container.locator('input[type="file"]').first();
        break;
      }
      if (input) break;
    }

    if (!input) {
      const inputs = this.page.locator('input[type="file"]');
      const visibleSlots: Locator[] = [];
      const inputCount = Math.min(await inputs.count(), 100);
      for (let inputIndex = 0; inputIndex < inputCount; inputIndex += 1) {
        const candidate = inputs.nth(inputIndex);
        const slotVisible = await candidate.evaluate((element) => {
          const slot = element.closest(
            'tr, section, article, .row, .form-group, .document-row',
          ) || element.parentElement;
          if (!slot) return false;
          const style = window.getComputedStyle(slot);
          const rect = slot.getBoundingClientRect();
          return style.display !== 'none'
            && style.visibility !== 'hidden'
            && rect.width > 0
            && rect.height > 0;
        }).catch(() => false);
        if (slotVisible) visibleSlots.push(candidate);
      }
      if (visibleSlots.length > index) input = visibleSlots[index];
    }
    if (!input) {
      throw new HumanInterventionError(
        `لم يجد الوكيل خانة رفع «${document.name}»`,
        'DOCUMENT_SLOT_NOT_FOUND',
        { documentKey: document.key, documentName: document.name },
      );
    }

    await input.setInputFiles(document.filePath);
    const selectedFile = await input.evaluate((element) => {
      const file = (element as HTMLInputElement).files?.[0];
      return file ? { name: file.name, size: file.size } : null;
    });
    if (!selectedFile || selectedFile.size <= 0) {
      throw new HumanInterventionError(
        `لم يثبت تقاضي اختيار ملف «${document.name}» داخل خانة الرفع`,
        'DOCUMENT_FILE_NOT_ATTACHED',
        {
          documentKey: document.key,
          documentName: document.name,
          selectedFile,
        },
      );
    }
    await this.page.waitForTimeout(1_000);
  }

  async uploadDocuments(documents: MaterializedDocument[]) {
    for (let index = 0; index < documents.length; index += 1) {
      await this.uploadDocument(documents[index], index);
    }
    await this.clickAny(['التالي'], 'متابعة بعد المستندات');
    await this.page.waitForTimeout(1_500);
  }

  async verifyReview(payload: FilingPayload) {
    const bodyText = normalizeText(
      await this.page.locator('body').innerText(),
    );
    const requiredValues = [
      payload.case.title,
      payload.defendant.fullName,
      payload.contract.number,
    ];
    const missing = requiredValues.filter(
      (value) => !bodyText.includes(normalizeText(value)),
    );
    const reviewAmounts = numericValuesInText(bodyText);
    const claimAmountMatches = reviewAmounts.some(
      (amount) => Math.abs(amount - payload.case.amount) < 0.01,
    );
    if (missing.length > 0 || !claimAmountMatches) {
      throw new HumanInterventionError(
        'بيانات شاشة المراجعة لا تطابق حزمة الدعوى',
        'REVIEW_MISMATCH',
        {
          missing,
          expectedClaimAmount: payload.case.amount,
          claimAmountMatches,
          reviewAmounts: reviewAmounts.slice(0, 100),
          url: this.page.url(),
        },
      );
    }
  }

  async submitFinal(
    onBeforeApprovalClick?: () => Promise<void>,
  ): Promise<FilingResult> {
    if (await this.captchaVisible()) {
      throw new HumanInterventionError(
        'ظهر تحقق بشري قبل الاعتماد النهائي',
        'CAPTCHA_REQUIRED',
        { url: this.page.url() },
      );
    }

    const approval = await this.firstVisible([
      this.page.getByRole('button', { name: /اعتماد|إرسال الدعوى|تقديم/i }),
      this.page.getByText(/اعتماد نهائي|إرسال الدعوى|تقديم الدعوى/i),
    ]);
    if (!approval) {
      throw new HumanInterventionError(
        'لم يجد الوكيل زر الاعتماد النهائي',
        'FINAL_APPROVAL_NOT_FOUND',
        { url: this.page.url() },
      );
    }

    await onBeforeApprovalClick?.();
    await approval.click();
    try {
      await this.page.waitForTimeout(500);
      const confirmationDialog = await this.firstVisible([
        this.page.locator(
          '.modal.in:visible, .modal.show:visible, '
          + '[role="dialog"]:visible, .k-window:visible',
        ),
      ]);
      if (confirmationDialog) {
        const confirm = await this.firstVisible([
          confirmationDialog.getByRole('button', {
            name: /نعم|تأكيد|اعتماد/i,
          }),
          confirmationDialog.getByRole('link', {
            name: /نعم|تأكيد|اعتماد/i,
          }),
          confirmationDialog.getByText(/تأكيد الاعتماد|نعم، اعتماد/i),
        ]);
        if (confirm) await confirm.click();
      }

      await this.page.waitForFunction(
        () => /تم بنجاح|رقم الطلب|رقم الدعوى|الرقم المرجعي/.test(
          document.body.innerText,
        ),
        undefined,
        { timeout: 60_000 },
      );
    } catch (error) {
      throw new SubmissionUncertainError(
        'تم الضغط على الاعتماد لكن تعذر التحقق من النتيجة. يجب مراجعة طلبات تقاضي قبل إعادة المحاولة.',
        { url: this.page.url(), cause: String(error) },
      );
    }

    const confirmationText = normalizeText(
      await this.page.locator('body').innerText(),
    );
    const caseNumber = this.extractValue(confirmationText, [
      /رقم الدعوى\s*[:：]?\s*([A-Z0-9\u0660-\u0669/-]+)/i,
      /Case\s*No\.?\s*[:：]?\s*([A-Z0-9/-]+)/i,
    ]);
    const referenceNumber = this.extractValue(confirmationText, [
      /الرقم المرجعي\s*[:：]?\s*([A-Z0-9\u0660-\u0669/-]+)/i,
      /رقم الطلب\s*[:：]?\s*([A-Z0-9\u0660-\u0669/-]+)/i,
      /Reference\s*[:：]?\s*([A-Z0-9/-]+)/i,
    ]) || caseNumber;
    const feesText = this.extractValue(confirmationText, [
      /(?:الرسوم|قيمة الرسوم)\s*[:：]?\s*([0-9\u0660-\u0669,.]+)/i,
    ]);
    const courtFees = feesText
      ? Number(
          feesText
            .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
            .replace(/,/g, ''),
        )
      : null;

    if (!caseNumber && !referenceNumber) {
      throw new SubmissionUncertainError(
        'نجح الاعتماد ظاهريًا لكن لم يمكن استخراج رقم الدعوى أو الرقم المرجعي.',
        { confirmationText: confirmationText.slice(0, 2_000) },
      );
    }

    return {
      caseNumber,
      referenceNumber,
      courtFees: Number.isFinite(courtFees) ? courtFees : null,
      confirmationText: confirmationText.slice(0, 10_000),
    };
  }

  private extractValue(text: string, patterns: RegExp[]) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return null;
  }
}
