import { copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type {
  Locator,
  Page,
  Request,
  Response,
} from 'playwright';
import { agentConfig } from './config';
import { expandFieldLookup } from './selector-overrides';
import { stageOrderIndex, stageReached } from './adaptive-flow';
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

type DocumentUploadOutcome = {
  status: 'uploaded' | 'skipped';
  key: string;
  name: string;
  fileName: string;
  sizeBytes: number;
  reason?: string;
};

export interface DocumentUploadSummary {
  uploaded: DocumentUploadOutcome[];
  skipped: DocumentUploadOutcome[];
  alreadyPresent: Array<{
    key: string;
    name: string;
    fileName: string;
  }>;
}

export type DocumentUploadProgress = {
  phase: 'started' | 'uploaded' | 'skipped' | 'already_present';
  index: number;
  total: number;
  document: {
    key: string;
    name: string;
    fileName: string;
  };
  outcome?: DocumentUploadOutcome;
};

const normalizeText = (value: string) =>
  value.replace(/\s+/g, ' ').trim();

// Taqadi's upload endpoint intermittently rejects long Arabic filenames even
// when the PDF itself is valid. Keep the descriptive Fleetify name in the job,
// but use a short deterministic filename for the affected portal upload.
const portalUploadFileNames: Record<string, string> = {
  violationsEvidence: '09_MOI_violations.pdf',
};

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
  if (key === 'email') {
    return normalizeText(currentValue || '').toLowerCase()
      === normalizeText(expectedValue).toLowerCase();
  }
  if (key === 'address') {
    const comparable = (value: string) => normalizeText(value)
      .replace(/[-–—،,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return comparable(currentValue || '') === comparable(expectedValue);
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

type NaturalPartyKind = 'representative' | 'defendant';

export const identityTypeForPartyOptions = (
  partyKind: NaturalPartyKind,
  requestedType: string,
  nationality: string,
  idNumber: string | null,
  availableOptions: string[],
): string | null => {
  const requested = identityTypeForTaqadi(requestedType, idNumber);
  const normalizedRequested = normalizeArabicText(requested);
  const normalizedNationality = normalizeArabicText(
    nationalityForTaqadi(nationality),
  );
  const qatarNational = normalizedNationality === normalizeArabicText('قطر');
  const residentRequested = [
    'رخصة مقيم',
    'رخصة إقامة',
    'بطاقة مقيم',
    'هوية مقيم',
  ].some((value) => normalizeArabicText(value) === normalizedRequested);

  const candidates = qatarNational
    ? [
      'بطاقة شخصية',
      'البطاقة الشخصية',
      'بطاقة شخصية قطرية',
      'هوية قطرية',
      'بطاقة هوية قطرية',
    ]
    : [
      requested,
      ...(residentRequested
        ? ['رخصة مقيم', 'رخصة إقامة', 'بطاقة مقيم', 'هوية مقيم']
        : []),
    ];

  const usableOptions = availableOptions.filter((option) => {
    const normalized = normalizeArabicText(option);
    return normalized
      && !['اختيار واحد', 'اختر', 'اختيار'].some(
        (placeholder) => normalized === normalizeArabicText(placeholder),
      );
  });
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeArabicText(candidate);
    const exact = usableOptions.find(
      (option) => normalizeArabicText(option) === normalizedCandidate,
    );
    if (exact) return exact;
  }
  return null;
};

const normalizeNationalityKey = (value: string) =>
  normalizeArabicText(value).toLocaleLowerCase('en-US');

const taqadiNationalityAliases = new Map(
  [
    ['Algeria', 'الجزائر'],
    ['Algerian', 'الجزائر'],
    ['Bangladesh', 'بنغلاديش'],
    ['Bangladeshi', 'بنغلاديش'],
    ['Bengali', 'بنغلاديش'],
    ['Egypt', 'مصر'],
    ['Egyptian', 'مصر'],
    ['Emirati', 'الامارات العربية المتحدة'],
    ['India', 'الهند'],
    ['Indian', 'الهند'],
    ['Iraq', 'العراق'],
    ['Iraqi', 'العراق'],
    ['Jordan', 'الأردن'],
    ['Jordanian', 'الأردن'],
    ['Kuwait', 'الكويت'],
    ['Kuwaiti', 'الكويت'],
    ['Lebanon', 'لبنان'],
    ['Lebanese', 'لبنان'],
    ['Libya', 'ليبيا'],
    ['Libyan', 'ليبيا'],
    ['Morocco', 'المغرب'],
    ['Moroccan', 'المغرب'],
    ['Nepal', 'نيبال'],
    ['Nepali', 'نيبال'],
    ['Nigeria', 'نيجيريا'],
    ['Nigerian', 'نيجيريا'],
    ['Oman', 'سلطنة عمان'],
    ['Omani', 'سلطنة عمان'],
    ['Pakistan', 'باكستان'],
    ['Pakistani', 'باكستان'],
    ['Palestine', 'دولة فلسطين'],
    ['Palestinian', 'دولة فلسطين'],
    ['Philippines', 'الفلبين'],
    ['Filipino', 'الفلبين'],
    ['Qatar', 'قطر'],
    ['Qatari', 'قطر'],
    ['Saudi', 'السعودية'],
    ['Saudi Arabia', 'السعودية'],
    ['Sri Lanka', 'سريلانكا'],
    ['Sri Lankan', 'سريلانكا'],
    ['Sudan', 'سودان'],
    ['Sudanese', 'سودان'],
    ['Syria', 'الجمهورية العربية السورية'],
    ['Syrian', 'الجمهورية العربية السورية'],
    ['Tunisia', 'تونس'],
    ['Tunisian', 'تونس'],
    ['UAE', 'الامارات العربية المتحدة'],
    ['United Arab Emirates', 'الامارات العربية المتحدة'],
    ['Yemen', 'اليمن'],
    ['Yemeni', 'اليمن'],
    ['أردني', 'الأردن'],
    ['إماراتي', 'الامارات العربية المتحدة'],
    ['إيراني', 'إيران، جمهورية إيران الإسلامية'],
    ['باكستاني', 'باكستان'],
    ['بنغلاديشي', 'بنغلاديش'],
    ['بنغالي', 'بنغلاديش'],
    ['تونسي', 'تونس'],
    ['جزائري', 'الجزائر'],
    ['سعودي', 'السعودية'],
    ['سريلانكي', 'سريلانكا'],
    ['سوداني', 'سودان'],
    ['سوري', 'الجمهورية العربية السورية'],
    ['تونسي', 'تونس'],
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
    ['نيجيري', 'نيجيريا'],
    ['هندي', 'الهند'],
    ['يمني', 'اليمن'],
  ].map(([alias, option]) => [normalizeNationalityKey(alias), option]),
);

const withoutOptionalArabicArticle = (value: string) =>
  value.replace(/^ال/, '');

export const nationalityForTaqadi = (nationality: string) => {
  const normalized = normalizeNationalityKey(nationality);
  const directAlias = taqadiNationalityAliases.get(normalized);
  if (directAlias) return directAlias;

  // Fleetify may store a country as «السودان» while Taqadi exposes «سودان».
  // Resolve article-only variants against known portal country names without
  // using a partial match that could confuse Sudan with South Sudan.
  const comparable = withoutOptionalArabicArticle(normalized);
  const canonicalOption = Array.from(taqadiNationalityAliases.values()).find(
    (option) => withoutOptionalArabicArticle(normalizeArabicText(option))
      === comparable,
  );

  return canonicalOption || nationality;
};

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
  memoWord: ['المذكرة الشارحة', 'مذكرة شارحة'],
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

const documentTypeLabels: Record<string, string[]> = {
  memo: ['المذكرة الشارحة'],
  memoWord: ['المذكرة الشارحة'],
  claims: ['حافظة المستندات'],
  contract: ['حافظة المستندات'],
  violationsEvidence: ['حافظة المستندات'],
  violations: ['حافظة المستندات'],
  docsList: ['حافظة المستندات'],
  commercialRegister: ['سجل تجاري'],
  representativeId: ['بطاقة شخصية'],
  ibanCertificate: ['رقم الحساب الدولي (IBAN)', 'رقم الحساب الدولي'],
};

const mandatoryMemoKeys = new Set(['memo', 'memoWord']);
const taqadiPartyOrder = 1;
const taqadiCompanyPartyOrder = 1;

export class TaqadiPortal {
  private lastPriorityDiagnostics: Record<string, unknown> | null = null;
  private tawtheeqCredentialsFilled = false;
  private tawtheeqLoginSubmitted = false;

  constructor(private page: Page) {
    this.page.setDefaultTimeout(agentConfig.actionTimeoutMs);
  }

  private async firstVisible(locators: Locator[]): Promise<Locator | null> {
    for (const locator of locators) {
      // Taqadi keeps stale hidden dialogs and controls in the DOM. Find the
      // visible candidate in one browser evaluation instead of issuing one
      // Playwright round trip for every stale element.
      const visibleIndex = await locator.evaluateAll((elements) =>
        elements.findIndex((element) => {
          const node = element as HTMLElement;
          const style = window.getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none'
            && style.visibility !== 'hidden'
            && rect.width > 0
            && rect.height > 0;
        })).catch(() => -1);
      if (visibleIndex >= 0) return locator.nth(visibleIndex);
    }
    return null;
  }

  private loadingMasks() {
    // Do not treat every aria-busy widget as a page-level blocker. Taqadi
    // leaves aria-busy=true on dormant Kendo controls, which previously added
    // the full timeout before and after every party field.
    return this.page.locator(
      '.k-loading-mask:visible, .blockUI:visible, '
      + '.loading-overlay:visible',
    );
  }

  private async waitForUiReady(timeoutMs = 8_000) {
    await this.loadingMasks().waitFor({
      state: 'hidden',
      timeout: timeoutMs,
    }).catch(() => undefined);
  }

  /**
   * Taqadi frequently redraws controls or briefly places a loading mask over
   * them. A bounded trial click prevents both intercepted clicks and clicks on
   * stale nodes; keyboard activation is the safe fallback for a focused
   * button/link.
   */
  private async clickStable(target: Locator, description: string) {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await this.waitForUiReady();
      await target.scrollIntoViewIfNeeded().catch(() => undefined);
      const usable = await target.isVisible().catch(() => false)
        && await target.isEnabled().catch(() => false);
      if (!usable) {
        await this.page.waitForTimeout(180);
        continue;
      }
      try {
        await target.click({ trial: true, timeout: 3_000 });
        await target.click({ timeout: 5_000 });
        await this.waitForUiReady();
        return;
      } catch (error) {
        lastError = error;
        if (attempt === 1) {
          await target.focus().catch(() => undefined);
          await this.page.keyboard.press('Enter').catch(() => undefined);
          await this.waitForUiReady();
          return;
        }
        await this.page.waitForTimeout(220);
      }
    }
    throw new HumanInterventionError(
      `تعذر الضغط على «${description}» بعد التحقق من ظهوره`,
      'TAQADI_CONTROL_NOT_ACTIONABLE',
      {
        description,
        url: this.page.url(),
        cause: lastError instanceof Error ? lastError.message : String(lastError || ''),
      },
    );
  }

  private async clickAny(
    names: string[],
    description: string,
  ): Promise<void> {
    const locators = names.flatMap((name) => [
      this.page.getByRole('button', { name, exact: true }),
      this.page.getByRole('link', { name, exact: true }),
      this.page.getByRole('button', { name, exact: false }),
      this.page.getByRole('link', { name, exact: false }),
    ]);
    let target = await this.firstVisible(locators);
    if (!target) {
      const candidates = this.page.locator(
        'button, a, [role="button"], [role="link"], li',
      );
      const expectedNames = names.map(normalizeArabicText);
      const bestIndex = await candidates.evaluateAll((elements, expected) => {
        const normalize = (value: string) => value
          .normalize('NFKD')
          .replace(/[\u064B-\u065F\u0670]/g, '')
          .replace(/[أإآٱ]/g, 'ا')
          .replace(/ى/g, 'ي')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
        const visible = (element: Element) => {
          const node = element as HTMLElement;
          const style = window.getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden'
            && rect.width > 0 && rect.height > 0;
        };
        let best = { index: -1, score: 0 };
        elements.slice(0, 300).forEach((element, index) => {
          if (!visible(element)) return;
          const control = element as HTMLButtonElement;
          if (control.disabled || element.getAttribute('aria-disabled') === 'true') return;
          const label = normalize([
            element.getAttribute('aria-label'),
            element.getAttribute('title'),
            element.textContent,
          ].filter(Boolean).join(' '));
          if (!label) return;
          const score = (expected as string[]).reduce((value, name) => {
            if (label === name) return Math.max(value, 100);
            if (label.startsWith(name)) return Math.max(value, 80);
            if (label.includes(name)) return Math.max(value, 50);
            return value;
          }, 0) - Math.min(label.length, 120) / 100;
          if (score > best.score) best = { index, score };
        });
        return best.index;
      }, expectedNames).catch(() => -1);
      if (bestIndex >= 0) target = candidates.nth(bestIndex);
    }
    if (!target) {
      throw new HumanInterventionError(
        `لم يجد الوكيل خيار «${description}» في صفحة تقاضي`,
        'TAQADI_UI_CHANGED',
        { expectedLabels: names, url: this.page.url() },
      );
    }
    await this.clickStable(target, description);
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

    // Taqadi keeps the correct account as the server-side default. Confirm
    // with Enter exactly like a user — without opening the dropdown, which
    // would change that default. When Enter leaves the prompt open (the
    // dropdown had keyboard focus and swallowed the key), fall back to
    // clicking the login button directly; the server-side default is still
    // untouched either way.
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2_000);

    if (await loginButton.isVisible().catch(() => false)) {
      await loginButton.click().catch(() => undefined);
      await this.page.waitForTimeout(2_000);
    }

    // The full account-selection page (a real «اسم المستخدم» dropdown reset
    // to «اختيار واحد») has no server-side default to confirm — the agent
    // must pick the non-individual (company/representative) account itself.
    if (await loginButton.isVisible().catch(() => false)) {
      const accountField = await this.firstVisible([
        this.page.getByLabel(/اسم المستخدم/i),
        this.page.locator('select:visible').first(),
        this.page.locator('.k-dropdown:visible, .k-dropdownlist:visible').first(),
      ]);
      if (accountField) {
        await accountField.click().catch(() => undefined);
        await this.page.waitForTimeout(600);
        const options = this.page.locator(
          '[role="option"], .k-item, .k-list-item, option',
        );
        const count = Math.min(await options.count(), 20);
        let chosen = false;
        let fallback: Locator | null = null;
        for (let index = 0; index < count; index += 1) {
          const option = options.nth(index);
          const text = normalizeText(
            await option.innerText().catch(() => ''),
          );
          if (!text || text.includes('اختيار')) continue;
          if (/فرد/.test(text)) {
            fallback ??= option;
            continue;
          }
          await option.click().catch(() => undefined);
          chosen = true;
          break;
        }
        if (!chosen && fallback) {
          await fallback.click().catch(() => undefined);
          chosen = true;
        }
        if (chosen) {
          await this.page.waitForTimeout(600);
          await loginButton.click().catch(() => undefined);
          await this.page.waitForTimeout(2_000);
        }
      }
    }

    if (await loginButton.isVisible().catch(() => false)) {
      throw new HumanInterventionError(
        'لم يقبل موقع تقاضي تأكيد صفحة الدخول',
        'TAQADI_OPTION_UNSTABLE',
        { action: 'confirm_account_prompt', url: this.page.url() },
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

    // The portal renders the Tawtheeq card well after the login shell on
    // slow loads; 10s was below the real render time observed on the office
    // connection, so allow a full 30s before declaring the card missing.
    const deadline = Date.now() + 30_000;
    let prompt: Locator | null = null;
    do {
      // Taqadi can redirect to NAS while this lookup is in flight. Once the
      // browser leaves the portal login page, the Tawtheeq flow has started.
      if (!this.isTaqadiLoginPage()) return true;
      prompt = await this.firstVisible([
        this.page.getByText('الدخول عبر النظام الوطني', { exact: false }),
        this.page.getByText(/توثيق|TAWTHEEQ/i),
        this.page.getByRole('button', { name: 'متابعة', exact: false }),
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
    const fieldStartedAt = Date.now();
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
    let savedValue: string | null = null;
    let lastInputError: unknown = null;

    // The dynamic party form listens to real key events and may redraw an
    // input after blur. Playwright's fill() only emits an input event, which
    // made Taqadi clear names such as firstName while a dependent refresh was
    // finishing. Type like a user, then reacquire the live input and require
    // the value to remain stable before moving on.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await this.waitForUiReady(900);

      let currentTarget = attempt === 0 ? fillTarget : null;
      if (!currentTarget) {
        const currentField = await this.fieldByLabel(
          labels,
          controlIds,
          root,
          options,
        );
        if (currentField) {
          const currentTagName = await currentField.evaluate((element) =>
            element.tagName.toLowerCase()
          ).catch(() => '');
          currentTarget = ['input', 'textarea'].includes(currentTagName)
            ? currentField
            : await this.firstVisible([
              currentField.locator(
                'input.k-formatted-value, input.k-input:not([type="hidden"]), '
                + 'input:not([type="hidden"]), textarea',
              ),
            ]);
        }
      }

      if (!currentTarget) break;

      try {
        if (attempt === 0) {
          // Keep the fast path for ordinary fields. If the portal rejects the
          // synthetic input event, the next attempt uses full keyboard events.
          await currentTarget.fill(value);
        } else {
          await currentTarget.click({ timeout: 5_000 });
          await currentTarget.press('Control+A');
          await currentTarget.pressSequentially(value, { delay: 15 });
        }
        await currentTarget.press('Tab');
      } catch (error) {
        lastInputError = error;
        await this.page.waitForTimeout(180);
        continue;
      }

      await this.waitForUiReady(900);
      let stable = true;
      for (let sample = 0; sample < 2; sample += 1) {
        if (sample > 0) await this.page.waitForTimeout(100);
        savedValue = await this.fieldInputValue(labels, controlIds, root);
        if (
          savedValue === null
          || normalizeText(savedValue) !== normalizeText(value)
        ) {
          stable = false;
          break;
        }
      }
      if (stable) {
        console.info(
          `[TaqadiAgent] field stable: ${labels[0]} (${Date.now() - fieldStartedAt}ms)`,
        );
        return;
      }

      await this.page.waitForTimeout(220);
    }

    if (lastInputError && savedValue === null) {
      throw new HumanInterventionError(
        `تعذر إدخال قيمة حقل «${labels[0]}» في تقاضي`,
        'TAQADI_FIELD_INPUT_FAILED',
        {
          expectedLabels: labels,
          controlIds,
          cause: lastInputError instanceof Error
            ? lastInputError.message
            : String(lastInputError),
          url: this.page.url(),
        },
      );
    }

    throw new HumanInterventionError(
      `لم يحتفظ تقاضي بقيمة حقل «${labels[0]}» بعد إدخالها`,
      'TAQADI_FIELD_VALUE_MISMATCH',
      {
        expectedValue: value,
        savedValue,
        expectedLabels: labels,
        controlIds,
        inputStrategy: 'keyboard_commit_with_live_reacquisition',
        attempts: 3,
        url: this.page.url(),
      },
    );
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

  private async fillStableNaturalPersonRequiredFields(
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
    options: {
      partyLabel?: string;
      dialogChangedCode?: string;
      unstableFieldsCode?: string;
    } = {},
  ) {
    const partyLabel = options.partyLabel || 'المدعى عليه';
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
        controlIds: ['firstName', 'partyFirstName'],
      },
      {
        key: 'lastName',
        labels: ['اسم العائلة', 'الاسم الأخير'],
        value: input.lastName,
        controlIds: ['lastName', 'familyName'],
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
        // The label alone can resolve to the wrong nearby control in the
        // Taqadi party dialog; the deterministic control id keeps the
        // read/verify loop and the write pointed at the same textarea.
        controlIds: ['addresses0.address', 'address'],
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
        controlIds: ['email', 'emailAddress'],
      },
      {
        key: 'partyOrder',
        labels: ['الترتيب حسب الصحيفة', 'ترتيب الطرف', 'الترتيب'],
        value: input.partyOrder,
        controlIds: ['priority'],
      },
    ];

    // فحص الاستقرار كان يقرأ 7 حقول مرتين في كل دورة عبر استعلامات Kendo بطيئة
    // (رُصدت دورة كاملة ≈ 28 ثانية في مهمة حقيقية). الآن نقرأ كل الحقول في
    // evaluate واحدة بالمعرفات الحتمية، ولا نملأ إلا الحقول المختلفة فعلاً —
    // الدورة النموذجية تنخفض إلى أقل من ثانية.
    const deadline = Date.now() + Math.max(agentConfig.actionTimeoutMs, 20_000);
    let stableSince: number | null = null;
    let latestValues: Record<string, string | null> = {};

    const readAllValues = async (): Promise<Record<string, string | null>> => {
      const idMap = fields.map((field) => ({
        key: field.key,
        // Fields without explicit control ids use their key, which matches the
        // Taqadi DOM ids (firstName, lastName, email, ...). Arabic labels are
        // never element ids, so they are never a fallback here.
        ids: field.controlIds.length > 0 ? field.controlIds : [field.key],
      }));
      if (root === this.page) {
        return await this.page.evaluate((entries) => {
          const result: Record<string, string | null> = {};
          const controls = Array.from(document.querySelectorAll('[id]'));
          for (const entry of entries as Array<{ key: string; ids: string[] }>) {
            const candidates = entry.ids.flatMap((id) => {
              const normalizedId = id.replace(/\./g, '_');
              return controls.filter((candidate) =>
                candidate.id === id || candidate.id === normalizedId);
            }).filter((element): element is HTMLInputElement
              | HTMLTextAreaElement | HTMLSelectElement => (
              element instanceof HTMLInputElement
              || element instanceof HTMLTextAreaElement
              || element instanceof HTMLSelectElement
            ));
            const visible = (element: HTMLElement) => {
              const style = window.getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return style.display !== 'none'
                && style.visibility !== 'hidden'
                && rect.width > 0
                && rect.height > 0;
            };
            const preferred = candidates.find((element) =>
              visible(element) && element.value.trim().length > 0)
              || candidates.find((element) => element.value.trim().length > 0)
              || candidates.find((element) => visible(element))
              || candidates[0];
            result[entry.key] = preferred?.value ?? null;
          }
          return result;
        }, idMap).catch(() => ({} as Record<string, string | null>));
      }

      return await (root as Locator).evaluate((container, entries) => {
        const result: Record<string, string | null> = {};
        const controls = Array.from(container.querySelectorAll('[id]'));
        for (const entry of entries as Array<{ key: string; ids: string[] }>) {
          const candidates = entry.ids.flatMap((id) => {
            const normalizedId = id.replace(/\./g, '_');
            return controls.filter((candidate) =>
              candidate.id === id || candidate.id === normalizedId);
          }).filter((element): element is HTMLInputElement
            | HTMLTextAreaElement | HTMLSelectElement => (
            element instanceof HTMLInputElement
            || element instanceof HTMLTextAreaElement
            || element instanceof HTMLSelectElement
          ));
          const visible = (element: HTMLElement) => {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none'
              && style.visibility !== 'hidden'
              && rect.width > 0
              && rect.height > 0;
          };
          const preferred = candidates.find((element) =>
            visible(element) && element.value.trim().length > 0)
            || candidates.find((element) => element.value.trim().length > 0)
            || candidates.find((element) => visible(element))
            || candidates[0];
          result[entry.key] = preferred?.value ?? null;
        }
        return result;
      }, idMap).catch(() => ({} as Record<string, string | null>));
    };

    const readValuesHybrid = async (): Promise<Record<string, string | null>> => {
      const values = await readAllValues();
      // The batch read trusts DOM ids; a field rendered dynamically under a
      // different id reads null and would loop forever. Fall back to the
      // careful label-based read for those fields only.
      for (const field of fields) {
        if (values[field.key] !== null && values[field.key] !== undefined) continue;
        if (!field.value) continue;
        values[field.key] = await this.fieldInputValue(
          field.labels,
          field.controlIds,
          root,
        );
      }
      return values;
    };

    do {
      if (
        root !== this.page
        && !(await (root as Locator).isVisible().catch(() => false))
      ) {
        throw new HumanInterventionError(
          `أغلق تقاضي نموذج ${partyLabel} أو استبدله أثناء تعبئة البيانات`,
          options.dialogChangedCode || 'DEFENDANT_DIALOG_CHANGED',
          { url: this.page.url() },
        );
      }
      latestValues = await readValuesHybrid();
      for (const field of fields) {
        if (defendantFieldValueMatches(field.key, latestValues[field.key], field.value)) {
          continue;
        }
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

      await this.page.waitForTimeout(150);
      latestValues = await readValuesHybrid();
      const allMatch = fields.every((field) =>
        defendantFieldValueMatches(field.key, latestValues[field.key], field.value)
      );

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
      `لم يحتفظ تقاضي بجميع البيانات المطلوبة لـ${partyLabel}`,
      options.unstableFieldsCode || 'TAQADI_DEFENDANT_FIELDS_UNSTABLE',
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
    await body.dispatchEvent('input');
    await body.dispatchEvent('change');
    await body.press('Tab');

    const committedValue = await this.page.evaluate(
      ({ id, fallbackValue }) => {
        type TinyEditor = {
          fire?: (eventName: string) => void;
          getContent?: () => string;
          nodeChanged?: () => void;
          save?: () => void;
          setDirty?: (dirty: boolean) => void;
        };
        type TinyMce = {
          activeEditor?: TinyEditor;
          get?: (editorId: string) => TinyEditor | null;
          triggerSave?: () => void;
        };

        const pageWindow = window as typeof window & { tinymce?: TinyMce };
        const textarea = document.getElementById(id);
        if (!(textarea instanceof HTMLTextAreaElement)) return null;

        const editor = pageWindow.tinymce?.get?.(id)
          || pageWindow.tinymce?.activeEditor
          || null;
        const frame = document.getElementById(`${id}_ifr`);
        const frameBody = frame instanceof HTMLIFrameElement
          ? frame.contentDocument?.body
          : null;
        const editorContent = editor?.getContent?.()
          || frameBody?.innerHTML
          || fallbackValue;

        editor?.setDirty?.(true);
        editor?.nodeChanged?.();
        editor?.fire?.('input');
        editor?.fire?.('change');
        editor?.fire?.('blur');
        editor?.save?.();
        pageWindow.tinymce?.triggerSave?.();

        // Some Taqadi builds display TinyMCE correctly but leave the backing
        // textarea empty. The browser validator and final form submit both
        // read this textarea, so commit the editor HTML explicitly.
        textarea.value = textarea.value.trim()
          ? textarea.value
          : editorContent;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        textarea.dispatchEvent(new Event('blur', { bubbles: true }));
        return textarea.value;
      },
      { id: controlId, fallbackValue: value },
    );
    const committedText = String(committedValue || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!committedText) {
      throw new HumanInterventionError(
        `لم يحتفظ تقاضي بقيمة المحرر «${controlId}» في حقل الإرسال`,
        'TAQADI_RICH_TEXT_COMMIT_FAILED',
        { controlId, url: this.page.url() },
      );
    }
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
        // Kendo cascadeFrom listens to the widget-level change event, which a
        // DOM dispatch alone never fires. Always trigger it, even when a
        // native onchange attribute exists — otherwise dependent dropdowns
        // (e.g. «صفة الطرف» after «تصنيف الطرف») stay empty forever.
        if (typeof widget.trigger === 'function') {
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

  /**
   * Cascading dropdowns (e.g. «تصنيف الطرف» → «صفة الطرف») only load their
   * dependent options when the portal observes a real change. When the parent
   * already displays the wanted value, the normal select shortcut returns
   * early and the dependent list stays empty forever. This helper forces the
   * cascade through real dropdown clicks: choose the alternate option, wait
   * for the redraw, then choose the wanted one.
   */
  private async forceDropdownCascadeSelection(
    labels: string[],
    optionText: string,
    controlIds: string[] = [],
    root: FieldRoot = this.page,
    alternateOptionText?: string,
  ) {
    const field = await this.fieldByLabel(labels, controlIds, root);
    if (!field) {
      throw new HumanInterventionError(
        `لم يجد الوكيل قائمة «${labels[0]}»`,
        'TAQADI_UI_CHANGED',
        { expectedLabels: labels, optionText, url: this.page.url() },
      );
    }
    // Native <select> elements have no lazy cascade to force; delegate to the
    // standard path immediately.
    const tagName = await field.evaluate((element) =>
      element.tagName.toLowerCase(),
    );
    if (tagName === 'select') {
      await this.selectField(labels, optionText, controlIds, root);
      return;
    }
    const { controlId } = await this.dropdownIdentity(field, controlIds);
    const backingControl = controlId
      ? await this.backingControlForField(field, controlId, root)
      : null;
    const currentText = normalizeText(
      await this.readDropdownCurrentText(field, backingControl),
    );
    if (normalizeArabicText(currentText) !== normalizeArabicText(optionText)) {
      await this.selectField(labels, optionText, controlIds, root);
      return;
    }

    // The wanted value is already displayed, so the cascade never fired and
    // the dependent list is empty. Pick the alternate option through the real
    // dropdown click path, let the portal redraw, then pick the wanted one.
    if (alternateOptionText) {
      await this.selectField(labels, alternateOptionText, controlIds, root);
      await this.page.waitForTimeout(900);
    }
    await this.selectField(labels, optionText, controlIds, root);
    await this.page.waitForTimeout(400);
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

      // Last resort: a direct JS click on the matching option. Playwright's
      // actionability (visible/stable/receives-events) can fail while a Kendo
      // listbox is mid-animation, even though the option is in the DOM.
      const clickedViaJs = await this.page.evaluate(`(() => {
        const normalize = (value) => String(value || '')
          .normalize('NFKD')
          .replace(/[\\u064B-\\u065F\\u0670]/g, '')
          .replace(/[أإآٱ]/g, 'ا')
          .replace(/ى/g, 'ي')
          .replace(/\\s+/g, ' ')
          .trim();
        const target = normalize(${JSON.stringify(optionText)});
        const options = Array.from(document.querySelectorAll(
          '[role="option"], .k-item, .k-list-item',
        ));
        const match = options.find(
          (option) => normalize(option.textContent) === target,
        );
        if (!match) return false;
        match.click();
        return true;
      })()`);
      if (clickedViaJs) return;
      throw error;
    });
    await this.page.waitForTimeout(300);
    if (root !== this.page) {
      await this.assertSelectedField(field, labels, optionText);
    }
  }

  /**
   * Taqadi redraws the party form after Kendo changes, which can silently
   * clear a dropdown that was just selected (observed: «جنسية الشركة» reset
   * to the placeholder after choosing «قطري»). This helper re-applies the
   * selection until it sticks across a redraw.
   */
  private async selectFieldSticky(
    labels: string[],
    optionText: string,
    controlIds: string[] = [],
    root: FieldRoot = this.page,
    maxAttempts = 3,
  ) {
    let lastSelectionError: HumanInterventionError | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.selectField(labels, optionText, controlIds, root);
      } catch (error) {
        if (
          !(error instanceof HumanInterventionError)
          || ![
            'PARTY_FIELD_SELECTION_MISMATCH',
            'TAQADI_OPTION_MISSING',
          ].includes(error.code)
        ) {
          throw error;
        }
        // A Kendo redraw can restore the placeholder between the option click
        // and the immediate assertion. Treat that exact mismatch as the
        // transient condition this helper exists to recover from.
        lastSelectionError = error;
        await this.page.waitForTimeout(350);
        continue;
      }
      // Let a potential redraw settle, then verify the value survived.
      await this.page.waitForTimeout(600);
      const field = await this.exactFieldByLabel(labels, controlIds, root);
      const currentText = field
        ? await this.selectedFieldText(field)
        : '';
      if (normalizeArabicText(currentText) === normalizeArabicText(optionText)) {
        return;
      }
    }
    throw new HumanInterventionError(
      `لم يلتصق الخيار «${optionText}» في قائمة «${labels[0]}» بعد عدة محاولات`,
      'TAQADI_FIELD_VALUE_MISMATCH',
      {
        field: labels[0],
        optionText,
        url: this.page.url(),
        lastSelectedOption: lastSelectionError?.details.selectedOption,
      },
    );
  }

  /**
   * Cascading party dropdowns («تصنيف الطرف» → «صفة الطرف») load their
   * options over the network AFTER the parent change event. Selecting the
   * parent once and immediately reading the child races the fetch and sees an
   * empty list. This helper re-selects the parent (alternating values to
   * force real change events) until the child listbox actually contains a
   * non-placeholder option.
   */
  private async selectFieldUntilDependentListHasOptions(
    labels: string[],
    optionText: string,
    controlIds: string[],
    dependentLabels: string[],
    dependentControlIds: string[],
    root: FieldRoot,
    expectedDependentOption?: string,
    alternateOptionText?: string,
  ) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (attempt > 1 && alternateOptionText) {
        // Re-fire the cascade with a guaranteed real change on retries.
        await this.selectField(labels, alternateOptionText, controlIds, root);
        await this.page.waitForTimeout(700);
      }
      await this.selectField(labels, optionText, controlIds, root);

      const deadline = Date.now() + 12_000;
      while (Date.now() < deadline) {
        const availableOptions = await this.availableDropdownOptions(
          dependentLabels,
          dependentControlIds,
          root,
        );
        const hasExpectedOption = expectedDependentOption
          ? availableOptions.some((option) => (
              normalizeArabicText(option)
              === normalizeArabicText(expectedDependentOption)
            ))
          : availableOptions.some((option) => {
              const text = normalizeText(option);
              return text.length > 0 && !text.includes('اختيار');
            });
        if (hasExpectedOption) {
          return;
        }
        await this.page.waitForTimeout(250);
      }
    }

    throw new HumanInterventionError(
      `قائمة «${dependentLabels[0]}» ظلت بلا خيارات بعد اختيار «${optionText}»`,
      'TAQADI_DEPENDENT_LIST_EMPTY',
      {
        field: labels[0],
        optionText,
        dependentField: dependentLabels[0],
        url: this.page.url(),
      },
    );
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

  private async throwIfSessionExpired(interruptedContext: string) {
    if (!(await this.looksLoggedOut())) return;

    // Tawtheeq may complete in a second tab while the original portal tab is
    // redirected to login. Adopt the authenticated tab before asking for help.
    if (await this.adoptAuthenticatedPortalPage()) return;

    throw new HumanInterventionError(
      `انتهت جلسة تقاضي أثناء ${interruptedContext}. أكمل تسجيل الدخول عبر توثيق ثم تابع من مسودة الدعوى الحالية.`,
      'LOGIN_REQUIRED',
      {
        url: this.page.url(),
        interruptedContext,
        resumeSupported: true,
        requiredActions: [
          'إكمال تسجيل الدخول عبر توثيق',
          'فتح مسودة الدعوى الحالية',
        ],
      },
    );
  }

  private async ensureSelectedField(
    labels: string[],
    optionText: string,
    controlIds: string[] = [],
    root: FieldRoot = this.page,
  ) {
    const field = await this.exactFieldByLabel(labels, controlIds, root);
    if (!field) {
      throw new HumanInterventionError(
        `لم يجد الوكيل حقل «${labels[0]}» للتحقق من القيمة «${optionText}»`,
        'TAQADI_UI_CHANGED',
        { expectedLabels: labels, optionText, url: this.page.url() },
      );
    }
    const currentText = await this.selectedFieldText(field);
    if (normalizeArabicText(currentText) !== normalizeArabicText(optionText)) {
      await this.selectFieldSticky(labels, optionText, controlIds, root);
    }
    const selectedField = await this.exactFieldByLabel(
      labels,
      controlIds,
      root,
    );
    if (!selectedField) {
      throw new HumanInterventionError(
        `اختفى حقل «${labels[0]}» بعد اختيار «${optionText}»`,
        'TAQADI_UI_CHANGED',
        { expectedLabels: labels, optionText, url: this.page.url() },
      );
    }
    await this.assertSelectedField(selectedField, labels, optionText);
  }

  /**
   * Kendo cascades can finish after the immediate field assertion and restore
   * one of the party dropdowns to its placeholder. Reconcile the complete
   * dependency chain and require it to remain unchanged across the quiet
   * window before the form is allowed to save.
   */
  private async reconcileStableSelections(
    selections: Array<{
      labels: string[];
      controlIds: string[];
      expected: string;
    }>,
    root: FieldRoot,
    onRepair?: () => Promise<void>,
  ) {
    const deadline = Date.now() + Math.max(agentConfig.actionTimeoutMs, 20_000);
    const stableWindowMs = 1_800;
    let stableSince: number | null = null;
    let lastValues: Record<string, string> = {};

    while (Date.now() < deadline) {
      await this.waitForUiReady(2_000);
      let repaired = false;
      lastValues = {};

      for (const selection of selections) {
        const field = await this.fieldByLabel(
          selection.labels,
          selection.controlIds,
          root,
          {
            exactLabel: true,
            waitForMs: Math.min(agentConfig.actionTimeoutMs, 3_000),
          },
        );
        const selectedText = field
          ? await this.selectedFieldText(field)
          : '';
        lastValues[selection.labels[0]] = selectedText;
        if (!field) {
          stableSince = null;
          continue;
        }
        if (
          normalizeArabicText(selectedText)
          === normalizeArabicText(selection.expected)
        ) continue;

        await this.selectFieldSticky(
          selection.labels,
          selection.expected,
          selection.controlIds,
          root,
          4,
        );
        repaired = true;
        stableSince = null;
      }

      if (repaired && onRepair) {
        await onRepair();
      }

      let allMatch = true;
      for (const selection of selections) {
        const field = await this.fieldByLabel(
          selection.labels,
          selection.controlIds,
          root,
          {
            exactLabel: true,
            waitForMs: Math.min(agentConfig.actionTimeoutMs, 3_000),
          },
        );
        const selectedText = field
          ? await this.selectedFieldText(field)
          : '';
        lastValues[selection.labels[0]] = selectedText;
        if (
          normalizeArabicText(selectedText)
          !== normalizeArabicText(selection.expected)
        ) {
          allMatch = false;
        }
      }

      if (allMatch && !repaired) {
        stableSince ??= Date.now();
        if (Date.now() - stableSince >= stableWindowMs) return;
      } else {
        stableSince = null;
      }
      await this.page.waitForTimeout(200);
    }

    throw new HumanInterventionError(
      'لم تستقر قوائم بيانات الطرف بعد اكتمال تحديثات تقاضي',
      'TAQADI_PARTY_SELECTIONS_UNSTABLE',
      {
        expected: Object.fromEntries(
          selections.map((selection) => [
            selection.labels[0],
            selection.expected,
          ]),
        ),
        actual: lastValues,
        url: this.page.url(),
      },
    );
  }

  private async availableDropdownOptions(
    labels: string[],
    controlIds: string[],
    root: FieldRoot,
  ): Promise<string[]> {
    const field = await this.exactFieldByLabel(labels, controlIds, root);
    if (!field) return [];
    const { controlId } = await this.dropdownIdentity(field, controlIds);
    const backingControl = controlId
      ? await this.backingControlForField(field, controlId, root)
      : null;
    const source = backingControl || field;
    const options = await source.evaluate((element) => {
      type DataItem = Record<string, unknown> & {
        get?: (fieldName: string) => unknown;
      };
      type Widget = {
        options?: { dataTextField?: string };
        dataSource?: { data?: () => unknown; view?: () => unknown };
      };
      type JQuery = {
        data: (name: string) => Widget | undefined;
      };
      type PageWindow = Window & {
        jQuery?: (target: Element) => JQuery;
        $?: (target: Element) => JQuery;
      };
      const values: string[] = [];
      if (element instanceof HTMLSelectElement) {
        values.push(...Array.from(element.options).map(
          (option) => option.textContent || '',
        ));
      }
      const pageWindow = window as PageWindow;
      const jq = pageWindow.jQuery || pageWindow.$;
      const widget = jq
        ? jq(element).data('kendoDropDownList')
          || jq(element).data('kendoComboBox')
        : undefined;
      const rawItems = widget?.dataSource?.data?.()
        || widget?.dataSource?.view?.()
        || [];
      let items: DataItem[] = [];
      try {
        items = Array.from(rawItems as Iterable<DataItem>);
      } catch {
        items = [];
      }
      const textField = widget?.options?.dataTextField || 'text';
      for (const item of items) {
        const value = typeof item.get === 'function'
          ? item.get(textField)
          : item[textField];
        if (typeof value === 'string') values.push(value);
      }
      return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
    });
    return options;
  }

  private async resolveDropdownOptionByAliases(
    labels: string[],
    controlIds: string[],
    preferredOption: string,
    aliases: string[],
    root: FieldRoot,
  ): Promise<string> {
    const expected = [preferredOption, ...aliases]
      .map(normalizeArabicText)
      .filter(Boolean);
    const deadline = Date.now() + Math.min(agentConfig.actionTimeoutMs, 10_000);
    let availableOptions: string[] = [];

    while (Date.now() < deadline) {
      availableOptions = await this.availableDropdownOptions(
        labels,
        controlIds,
        root,
      );
      const exact = availableOptions.find((option) =>
        normalizeArabicText(option) === normalizeArabicText(preferredOption));
      if (exact) return exact;

      const aliasMatch = availableOptions.find((option) => {
        const normalized = normalizeArabicText(option);
        return expected.some((candidate) =>
          normalized.includes(candidate) || candidate.includes(normalized));
      });
      if (aliasMatch) return aliasMatch;

      const field = await this.exactFieldByLabel(labels, controlIds, root);
      await field?.click().catch(() => undefined);
      await this.page.waitForTimeout(250);
    }

    throw new HumanInterventionError(
      `لم يجد الوكيل جهة إصدار مناسبة لإظهار «رقم قيد المنشأة»`,
      'ESTABLISHMENT_ISSUER_UNAVAILABLE',
      {
        field: labels[0],
        preferredOption,
        aliases,
        availableOptions,
        url: this.page.url(),
      },
    );
  }

  private async resolveIdentityTypeForParty(
    partyKind: NaturalPartyKind,
    labels: string[],
    controlIds: string[],
    requestedType: string,
    nationality: string,
    idNumber: string | null,
    root: FieldRoot,
  ): Promise<string> {
    const deadline = Date.now() + Math.min(agentConfig.actionTimeoutMs, 10_000);
    let availableOptions: string[] = [];
    while (Date.now() < deadline) {
      availableOptions = await this.availableDropdownOptions(
        labels,
        controlIds,
        root,
      );
      const resolved = identityTypeForPartyOptions(
        partyKind,
        requestedType,
        nationality,
        idNumber,
        availableOptions,
      );
      if (resolved) return resolved;
      const field = await this.exactFieldByLabel(labels, controlIds, root);
      await field?.click().catch(() => undefined);
      await this.page.waitForTimeout(250);
    }
    const partyLabel = partyKind === 'representative' ? 'خميس' : 'المدعى عليه';
    throw new HumanInterventionError(
      `لم يجد الوكيل نوع هوية مناسبًا للطرف «${partyLabel}» ضمن خيارات نافذته`,
      'PARTY_IDENTITY_TYPE_UNAVAILABLE',
      {
        partyKind,
        requestedType,
        nationality,
        availableOptions,
        url: this.page.url(),
      },
    );
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

  private async confirmAccountPromptAndAdoptPortalPage() {
    // The NAS callback can pause on an account-selection prompt before the
    // authenticated shell exists. Confirming that prompt is not proof of a
    // successful login: Taqadi may still bounce back to /itc/login. Always
    // re-check the resulting page before allowing the filing workflow to run.
    await this.confirmAccountPromptWithEnterIfNeeded();
    return this.adoptAuthenticatedPortalPage();
  }

  async ensureAuthenticated(
    onWaitingForLogin: () => Promise<void>,
  ): Promise<void> {
    if (await this.confirmAccountPromptAndAdoptPortalPage()) return;

    await this.page.goto(agentConfig.portalUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await this.page.waitForTimeout(2_000);

    if (await this.confirmAccountPromptAndAdoptPortalPage()) return;

    await this.page.bringToFront();
    await onWaitingForLogin();
    await this.startTawtheeqLoginIfNeeded();
    const deadline = Date.now() + agentConfig.loginTimeoutMs;
    let automaticLoginRestarts = 0;
    while (Date.now() < deadline) {
      if (await this.confirmAccountPromptAndAdoptPortalPage()) return;

      // A failed/expired NAS callback can return to the login shell after the
      // credentials were submitted. Retry the complete Tawtheeq handshake
      // once; importantly, never interpret the intermediate prompt as an
      // authenticated application page.
      if (
        this.isTaqadiLoginPage()
        && this.tawtheeqLoginSubmitted
        && automaticLoginRestarts < 1
      ) {
        automaticLoginRestarts += 1;
        this.tawtheeqCredentialsFilled = false;
        this.tawtheeqLoginSubmitted = false;
      }
      if (this.isTaqadiLoginPage()) {
        await this.startTawtheeqLoginIfNeeded();
      }
      await this.continueTawtheeqLoginIfReady();
      const authenticationError = await this.tawtheeqAuthenticationError();
      if (authenticationError) {
        throw new HumanInterventionError(
          authenticationError,
          'TAWTHEEQ_CREDENTIALS_REJECTED',
          { url: this.page.url() },
        );
      }
      if (await this.confirmAccountPromptAndAdoptPortalPage()) return;
      await this.page.waitForTimeout(500);
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
    let previous: TaqadiPortalPosition | null = null;
    let best: TaqadiPortalPosition | null = null;

    // A single DOM sample is unreliable while Kendo swaps wizard panes. Two
    // matching samples are cheap (~180ms) and remove the intermittent
    // "unknown page" handoffs seen when the SPA is still painting.
    for (let sample = 0; sample < 3; sample += 1) {
      const observation = await observeTaqadiPage(this.page, payload);
      const inferred = inferPortalStage(observation);
      const position: TaqadiPortalPosition = {
        ...inferred,
        url: observation.url,
        validationMessages: observation.validationMessages,
      };

      if (!best || (position.score || 0) >= (best.score || 0)) best = position;
      if (previous?.stage === position.stage && position.stage !== 'unknown') {
        return {
          ...position,
          confidence: (
            previous.confidence === 'high'
            || position.confidence === 'high'
            || (position.score || 0) >= 8
          ) ? 'high' : position.confidence,
          evidence: [...new Set([
            ...(previous.evidence || []),
            ...(position.evidence || []),
            'stable_observation',
          ])],
        };
      }

      // When the wizard advances between samples, prefer the newer forward
      // stage instead of the older stage's larger raw score.
      if (
        previous
        && stageOrderIndex(position.stage) > stageOrderIndex(previous.stage)
      ) best = position;
      previous = position;
      if (sample < 2) await this.page.waitForTimeout(180);
    }

    return best || {
      stage: 'unknown',
      label: 'صفحة غير معروفة',
      confidence: 'low',
      score: 0,
      evidence: [],
      candidates: [],
      url: this.page.url(),
      validationMessages: [],
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
    let currentUrl = this.page.url();
    const realTaqadiPortal = /https?:\/\/([^.]+\.)*taqadi\.sjc\.gov\.qa/i
      .test(currentUrl);

    if (realTaqadiPortal) {
      const authenticated = await this.adoptAuthenticatedPortalPage();
      if (!authenticated) {
        throw new HumanInterventionError(
          'انتهت جلسة تقاضي قبل فتح الدعوى؛ يجب إكمال تسجيل الدخول أولًا',
          'LOGIN_REQUIRED',
          {
            url: currentUrl,
            requiredActions: ['إكمال تسجيل الدخول عبر توثيق'],
            resumeSupported: true,
          },
        );
      }
      currentUrl = this.page.url();
    }

    const createUrl = realTaqadiPortal
      ? (() => {
          const url = new URL('/itc/home', currentUrl);
          url.hash = '/itc/f/caseinfo/create';
          return url.toString();
        })()
      : null;
    const classificationVisible = async () => (
      await this.page.locator('[id^="tempctype_"]').first()
        .isVisible().catch(() => false)
      || await this.page.getByText('درجة التقاضي', { exact: false }).first()
        .isVisible().catch(() => false)
    );

    // The create screen is a stable SPA route. Opening it directly avoids two
    // fragile menu clicks and is substantially faster after a resume from the
    // authenticated home page. The menu remains a fallback for portal builds
    // that reject direct hash navigation.
    if (createUrl) {
      if (/#\/itc\/f\/caseinfo\/create/i.test(currentUrl)) {
        await this.page.reload({
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        }).catch(() => undefined);
      } else {
        await this.page.goto(createUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        }).catch(() => undefined);
      }
      await this.waitForUiReady(10_000);
      await this.page.waitForFunction(
        () => Boolean(
          document.querySelector('[id^="tempctype_"]')
          || Array.from(document.querySelectorAll('label, h1, h2, h3'))
            .some((element) => element.textContent?.includes('درجة التقاضي')),
        ),
        undefined,
        { timeout: 8_000 },
      ).catch(() => undefined);
      if (await classificationVisible()) return;

      if (await this.looksLoggedOut()) {
        throw new HumanInterventionError(
          'أعاد تقاضي الوكيل إلى صفحة الدخول عند محاولة فتح دعوى جديدة',
          'LOGIN_REQUIRED',
          {
            url: this.page.url(),
            attemptedUrl: createUrl,
            requiredActions: ['إكمال تسجيل الدخول عبر توثيق'],
            resumeSupported: true,
          },
        );
      }

      // A partially rendered SPA route occasionally becomes healthy after a
      // reload. Retry the route itself, not unrelated menu labels.
      if (await this.isAuthenticatedPortalPage(this.page)) {
        await this.page.reload({
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        }).catch(() => undefined);
        await this.waitForUiReady(10_000);
        await this.page.waitForFunction(
          () => Boolean(
            document.querySelector('[id^="tempctype_"]')
            || Array.from(document.querySelectorAll('label, h1, h2, h3'))
              .some((element) => element.textContent?.includes('درجة التقاضي')),
          ),
          undefined,
          { timeout: 8_000 },
        ).catch(() => undefined);
        if (await classificationVisible()) return;
      }
    }

    const clickThrough = async () => {
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
      await this.clickAny(
        ['قيد دعوى', 'إقامة دعوى', 'إنشاء دعوى', 'دعوى جديدة'],
        'قيد دعوى جديدة',
      );
      await this.waitForUiReady(10_000);
    };

    // Never search for case-management menu labels on a login, NAS prompt, or
    // error page. That produced a misleading missing-menu failure even though
    // the real problem was an unauthenticated session.
    if (realTaqadiPortal) {
      const homeUrl = new URL('/itc/home', currentUrl).toString();
      if (this.page.url() !== homeUrl) {
        await this.page.goto(homeUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        }).catch(() => undefined);
        await this.waitForUiReady(10_000);
      }
      if (!(await this.isAuthenticatedPortalPage(this.page))) {
        throw new HumanInterventionError(
          'تعذر فتح مسار الدعوى لأن جلسة تقاضي لم تعد صالحة',
          'LOGIN_REQUIRED',
          { url: this.page.url(), resumeSupported: true },
        );
      }
    }

    await clickThrough();

    // A blank SPA render leaves the wizard body empty after navigation;
    // reload once and repeat the clicks so the classification form appears.
    // Immediate (non-waiting) visibility checks keep this detection cheap.
    const rendered = await classificationVisible();
    if (rendered) return;

    // Only a page that really navigated to the create-case route may reload;
    // a still-untouched landing page just retries the clicks.
    const reachedCreateRoute = await this.page
      .getByText('إنشاء دعوى', { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    if (!reachedCreateRoute) return;

    await this.page
      .reload({ waitUntil: 'domcontentloaded' })
      .catch(() => undefined);
    await this.waitForUiReady(10_000);
    // The documented menu path is retained only as an authenticated fallback
    // for portal releases that change or temporarily reject the SPA route.
    if (realTaqadiPortal && !(await this.isAuthenticatedPortalPage(this.page))) {
      throw new HumanInterventionError(
        'تعذر فتح مسار الدعوى لأن جلسة تقاضي لم تعد صالحة',
        'LOGIN_REQUIRED',
        { url: this.page.url(), resumeSupported: true },
      );
    }

    await clickThrough();
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
    await this.selectFieldSticky(
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

  private async waitForPartyGridReady(timeoutMs = 15_000) {
    if (process.env.NODE_ENV === 'test') return;
    const deadline = Date.now() + timeoutMs;
    let previousFingerprint = '';
    let stableReads = 0;

    while (Date.now() < deadline) {
      await this.throwIfSessionExpired('انتظار جدول أطراف الدعوى');
      await this.waitForUiReady(Math.min(2_000, timeoutMs));
      const pane = this.partyPane();
      if (!(await pane.isVisible().catch(() => false))) {
        await this.page.waitForTimeout(180);
        continue;
      }
      const state = await pane.evaluate((element) => {
        const visible = (node: Element) => {
          const style = window.getComputedStyle(node as HTMLElement);
          const rect = (node as HTMLElement).getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden'
            && rect.width > 0 && rect.height > 0;
        };
        const rows = Array.from(element.querySelectorAll(
          'tr[role="row"], tbody tr, .party-card',
        )).filter(visible);
        const add = Array.from(element.querySelectorAll(
          'button[title="إضافة طرف"], button[title="button_add_party_1"], button',
        )).find((node) => visible(node) && /إضافة طرف|button_add_party_1/.test(
          `${node.getAttribute('title') || ''} ${node.textContent || ''}`,
        )) as HTMLButtonElement | undefined;
        const rowText = rows
          .map((row) => (row.textContent || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .join('|');
        return {
          ready: rows.length > 0 || Boolean(add && !add.disabled),
          fingerprint: `${rows.length}:${rowText}:${add?.disabled ? 'disabled' : 'enabled'}`,
        };
      }).catch(() => ({ ready: false, fingerprint: '' }));

      if (state.ready && state.fingerprint === previousFingerprint) {
        stableReads += 1;
        if (stableReads >= 2) return;
      } else {
        stableReads = state.ready ? 1 : 0;
        previousFingerprint = state.fingerprint;
      }
      await this.page.waitForTimeout(180);
    }

    throw new HumanInterventionError(
      'لم يصبح جدول أطراف الدعوى جاهزًا خلال المهلة المحددة',
      'PARTY_GRID_NOT_READY',
      { url: this.page.url() },
    );
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

  private async waitForPartyRow(
    values: Array<string | null | undefined>,
    timeoutMs = 10_000,
  ): Promise<Locator | null> {
    const deadline = Date.now() + timeoutMs;
    do {
      await this.throwIfSessionExpired('انتظار حفظ طرف الدعوى');
      const row = await this.partyRow(values);
      if (row) return row;
      await this.page.waitForTimeout(180);
    } while (Date.now() < deadline);
    return null;
  }

  private async refreshPartyGrid(timeoutMs = 8_000) {
    if (process.env.NODE_ENV === 'test') return false;

    const pane = this.partyPane();
    if (!(await pane.isVisible().catch(() => false))) return false;

    const refreshed = await pane.evaluate(async (element, waitMs) => {
      type KendoDataSource = {
        read?: () => unknown;
      };
      type KendoGrid = {
        dataSource?: KendoDataSource;
        one?: (eventName: string, callback: () => void) => void;
      };
      type JQueryAccessor = (target: Element) => {
        data: (key: string) => unknown;
      };

      const browserWindow = window as unknown as {
        jQuery?: JQueryAccessor;
        $?: JQueryAccessor;
      };
      const jq = browserWindow.jQuery || browserWindow.$;
      const candidates = [
        element,
        ...Array.from(element.querySelectorAll('.k-grid, [data-role="grid"]')),
      ];
      const grid = jq
        ? candidates
          .map((candidate) => jq(candidate).data('kendoGrid') as KendoGrid)
          .find((candidate) => Boolean(candidate?.dataSource?.read))
        : null;

      if (grid?.dataSource?.read) {
        await new Promise<void>((resolve) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          grid.one?.('dataBound', finish);
          grid.dataSource?.read?.();
          window.setTimeout(finish, waitMs);
        });
        return true;
      }

      const refresh = element.querySelector(
        '.k-pager-refresh, [title*="تحديث"], [title*="إعادة تحميل"]',
      );
      if (refresh instanceof HTMLElement) {
        refresh.click();
        return true;
      }
      return false;
    }, Math.max(1_000, timeoutMs - 500)).catch(() => false);

    if (refreshed) {
      await this.waitForUiReady(timeoutMs);
      await this.page.waitForTimeout(180);
    }
    return refreshed;
  }

  private async partyGridRecord(
    values: Array<string | null | undefined>,
  ): Promise<{ savedOrder: string | null; rowText: string } | null> {
    const expectedValues = values.filter(Boolean) as string[];
    if (expectedValues.length === 0) return null;

    const pane = this.partyPane();
    if (!(await pane.isVisible().catch(() => false))) return null;

    return pane.evaluate((element, expected) => {
      type PartyRecord = Record<string, unknown> & {
        toJSON?: () => Record<string, unknown>;
      };
      type KendoDataSource = {
        view?: () => PartyRecord[];
        data?: () => PartyRecord[];
      };
      type KendoGrid = {
        dataSource?: KendoDataSource;
      };
      type JQueryAccessor = (target: Element) => {
        data: (key: string) => unknown;
      };

      const normalize = (value: unknown) => String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      const browserWindow = window as unknown as {
        jQuery?: JQueryAccessor;
        $?: JQueryAccessor;
      };
      const jq = browserWindow.jQuery || browserWindow.$;
      if (!jq) return null;

      const candidates = [
        element,
        ...Array.from(element.querySelectorAll('.k-grid, [data-role="grid"]')),
      ];
      const grid = candidates
        .map((candidate) => jq(candidate).data('kendoGrid') as KendoGrid)
        .find((candidate) => Boolean(candidate?.dataSource));
      const records = grid?.dataSource?.view?.()
        || grid?.dataSource?.data?.()
        || [];

      for (const sourceRecord of Array.from(records)) {
        const record = typeof sourceRecord.toJSON === 'function'
          ? sourceRecord.toJSON()
          : sourceRecord;
        const searchable = [
          record.name,
          record.fullName,
          record.displayName,
          record.identityNo,
          record.registrationNo,
          record.crNo,
          record.officialRegistrationNumber,
        ].filter(Boolean).join(' ');
        const normalizedSearchable = normalize(searchable);
        if (!expected.some((value) =>
          normalizedSearchable.includes(normalize(value)))) continue;

        return {
          savedOrder: record.priority === null
            || record.priority === undefined
            ? null
            : String(record.priority),
          rowText: searchable,
        };
      }
      return null;
    }, expectedValues).catch(() => null);
  }

  private async assertPartyOrder(
    values: Array<string | null | undefined>,
    expectedOrder: number,
    errorCode: string,
  ) {
    const startedAt = Date.now();
    const deadline = Date.now() + 10_000;
    let savedOrder: string | null = null;
    let rowText: string | null = null;
    let partyFound = false;
    let refreshed = false;

    do {
      await this.throwIfSessionExpired('التحقق من ترتيب أطراف الدعوى');
      await this.waitForUiReady(1_000);
      const gridRecord = await this.partyGridRecord(values);
      if (gridRecord) {
        partyFound = true;
        rowText = gridRecord.rowText;
        savedOrder = normalizeNumerals(gridRecord.savedOrder || '');
        if (savedOrder === String(expectedOrder)) return;
      }

      const row = await this.partyRow(values);
      if (row) {
        partyFound = true;
        rowText = await row.innerText().catch(() => null);
        const cells = row.locator('td, [role="gridcell"]');
        const cellCount = await cells.count();
        // The Taqadi parties grid renders extra leading columns (actions and
        // update date), so a fixed index points at the wrong cell. The order
        // cell is the one whose content is purely numeric.
        for (let index = 0; index < cellCount; index += 1) {
          const cellText = normalizeText(
            await cells.nth(index).innerText().catch(() => ''),
          );
          if (!/^\d+$/.test(cellText)) continue;
          savedOrder = cellText;
          break;
        }
        if (savedOrder === String(expectedOrder)) return;
      }

      if (!partyFound && !refreshed && Date.now() - startedAt >= 1_000) {
        refreshed = await this.refreshPartyGrid();
        continue;
      }
      await this.page.waitForTimeout(250);
    } while (Date.now() < deadline);

    if (!partyFound) {
      throw new HumanInterventionError(
        `لم يحفظ تقاضي الطرف «${values.find(Boolean) || 'المطلوب'}» بعد إغلاق نموذج الإضافة`,
        errorCode.replace(/_ORDER_MISMATCH$/, '_NOT_SAVED'),
        {
          expectedOrder,
          savedOrder,
          rowText,
          gridRefreshed: refreshed,
          priorityDiagnostics: this.lastPriorityDiagnostics,
          url: this.page.url(),
        },
      );
    }

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
    const partyDialog = this.page.locator(
      '#modal-dialog:has([id="priority"]), '
      + '.modal.in:has([id="priority"]), '
      + '.modal.show:has([id="priority"]), '
      + '[role="dialog"]:has([id="priority"])',
    ).last();
    const editButton = await this.firstVisible([
      row.locator('.k-grid-modify'),
      row.locator('a, button').filter({ hasText: /تحديث|تعديل/ }),
      row.locator('[title*="تحديث"], [title*="تعديل"]'),
    ]);
    if (editButton) {
      editDiagnostics = await editButton.evaluate((element) => ({
        tagName: element.tagName,
        className: element.getAttribute('class'),
        href: element.getAttribute('href'),
        onclick: element.getAttribute('onclick'),
        outerHTML: element.outerHTML,
        rowClassName: element.closest('tr')?.getAttribute('class'),
        rowAriaSelected: element.closest('tr')?.getAttribute('aria-selected'),
      })).catch(() => ({}));
    }
    // Some Taqadi grids enable editing only after selecting the row. The name
    // cell may also open the dialog directly, so this replaces the old 1.5s
    // blind wait with a short result-based check.
    await this.clickStable(nameCell, 'تحديد الطرف');

    const quickOpen = await partyDialog.waitFor({
      state: 'visible',
      timeout: 500,
    }).then(() => true).catch(() => false);
    if (!quickOpen) {
      const fallbackEdit = editButton || await this.firstVisible([
        row.locator('.k-grid-modify'),
        row.locator('a, button').filter({ hasText: /تحديث|تعديل/ }),
        row.locator('[title*="تحديث"], [title*="تعديل"]'),
      ]);
      if (!fallbackEdit) {
        stopNetworkCapture();
        throw new HumanInterventionError(
          'تم تحديد الطرف لكن لم يجد الوكيل زر تعديل بياناته',
          'PARTY_EDIT_ACTION_NOT_FOUND',
          { rowText: await row.innerText().catch(() => ''), url: this.page.url() },
        );
      }
      editDiagnostics = await fallbackEdit.evaluate((element) => ({
        tagName: element.tagName,
        className: element.getAttribute('class'),
        href: element.getAttribute('href'),
        onclick: element.getAttribute('onclick'),
        outerHTML: element.outerHTML,
        rowClassName: element.closest('tr')?.getAttribute('class'),
        rowAriaSelected: element.closest('tr')?.getAttribute('aria-selected'),
      })).catch(() => ({}));
      await this.clickStable(fallbackEdit, 'تعديل بيانات الطرف');
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
    await this.clickStable(addButton, description);
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
    await this.clickStable(save, 'حفظ بيانات الطرف');
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
    await this.waitForPartyGridReady();
  }

  async validateRepresentativeFirst() {
    await this.waitForUiReady(2_000);
    await this.waitForPartyGridReady();

    const representativeName = agentConfig.representative.name;
    // The portal may store the representative's full legal name (e.g.
    // «خميس هاشم الجبر») while the configured short name is «خميس الجبر».
    // Match the full name first, then the last name token as a fallback.
    const nameParts = representativeName.split(/\s+/).filter(Boolean);
    const lastNameToken = nameParts.length > 1
      ? nameParts[nameParts.length - 1]
      : null;
    const row = await this.waitForPartyRow(
      [representativeName, lastNameToken].filter(Boolean) as string[],
    );
    if (!row) {
      throw new HumanInterventionError(
        `لم يجد الوكيل الطرف الإلزامي «${representativeName}» لمراجعته أولًا`,
        'REPRESENTATIVE_NOT_FOUND',
        { representativeName, url: this.page.url() },
      );
    }
    const partyDialog = await this.openPartyEditor(row);

    const ensureRepresentativeRole = async () => {
      const roleField = await this.exactFieldByLabel(
        ['صفة الطرف'],
        ['type'],
        partyDialog,
      );
      if (roleField) {
        await this.ensureSelectedField(
          ['صفة الطرف'],
          'وكيل طبيعي',
          ['type'],
          partyDialog,
        );
        return;
      }
      await this.ensureSelectedField(
        ['تصنيف الطرف', 'نوع الشخص'],
        'وكيل طبيعي',
        ['category'],
        partyDialog,
      );
    };
    await ensureRepresentativeRole();

    const identityTypeLabels = [
      'نوع البطاقة',
      'نوع الهوية',
      'نوع الوثيقة',
      'نوع إثبات الهوية',
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
      'رقم رخصة المقيم',
    ];
    const identityNumberControlIds = [
      'tempIdentityNo',
      'identityNo',
      'idNumber',
      'identityNumber',
      'residencyCardNumber',
      'proofOfIdentityNo',
    ];

    // Nationality and identity type redraw the lower half of Taqadi's form.
    // Complete them first, then reconcile every required scalar field so an
    // AJAX redraw cannot silently restore order 1 or clear the identity.
    await this.selectFieldUntilDependentVisible(
      ['الجنسية'],
      nationalityForTaqadi(agentConfig.representative.nationality),
      ['nationality'],
      identityTypeLabels,
      identityTypeControlIds,
      partyDialog,
    );
    const representativeIdentityType = await this.resolveIdentityTypeForParty(
      'representative',
      identityTypeLabels,
      identityTypeControlIds,
      agentConfig.representative.identityType,
      agentConfig.representative.nationality,
      agentConfig.representative.identityNumber,
      partyDialog,
    );
    await this.selectFieldUntilDependentVisible(
      identityTypeLabels,
      representativeIdentityType,
      identityTypeControlIds,
      identityNumberLabels,
      identityNumberControlIds,
      partyDialog,
    );
    await this.selectFieldSticky(
      ['الجنسية'],
      nationalityForTaqadi(agentConfig.representative.nationality),
      ['nationality'],
      partyDialog,
    );
    await this.selectFieldSticky(
      identityTypeLabels,
      representativeIdentityType,
      identityTypeControlIds,
      partyDialog,
    );
    await this.fillStableNaturalPersonRequiredFields(
      {
        firstName: nameParts[0],
        lastName: lastNameToken || nameParts[0],
        identityNumber: agentConfig.representative.identityNumber,
        identityNumberLabels,
        identityNumberControlIds,
        address: agentConfig.representative.address,
        phone: phoneForTaqadi(agentConfig.representative.phone),
        email: agentConfig.representative.email,
        partyOrder: String(taqadiPartyOrder),
      },
      partyDialog,
      {
        partyLabel: 'الوكيل الطبيعي',
        dialogChangedCode: 'REPRESENTATIVE_DIALOG_CHANGED',
        unstableFieldsCode: 'TAQADI_REPRESENTATIVE_FIELDS_UNSTABLE',
      },
    );
    for (const selection of [
      {
        labels: ['الجنسية'],
        controlIds: ['nationality'],
        expected: nationalityForTaqadi(agentConfig.representative.nationality),
      },
      {
        labels: identityTypeLabels,
        controlIds: identityTypeControlIds,
        expected: representativeIdentityType,
      },
    ]) {
      const field = await this.fieldByLabel(
        selection.labels,
        selection.controlIds,
        partyDialog,
      );
      if (!field) {
        throw new HumanInterventionError(
          `لم يجد الوكيل حقل «${selection.labels[0]}» عند المراجعة النهائية لممثل الشركة`,
          'TAQADI_UI_CHANGED',
          { expectedLabels: selection.labels, url: this.page.url() },
        );
      }
      await this.assertSelectedField(
        field,
        selection.labels,
        selection.expected,
      );
    }
    await ensureRepresentativeRole();
    await this.saveOpenParty(partyDialog);
    await this.assertPartyOrder(
      [representativeName, lastNameToken].filter(Boolean) as string[],
      taqadiPartyOrder,
      'REPRESENTATIVE_ORDER_MISMATCH',
    );
  }

  /**
   * صفحة الأطراف هي الصفحة الوحيدة التي يُضغط فيها زر «حفظ» على مستوى الصفحة:
   * الحفظ يثبّت مسودة الدعوى ويفعّل جدول الأطراف، ثم يبدأ تسجيل الأطراف.
   * يجب ألا يطابق الزر «حفظ ومتابعة» — المطابقة دقيقة (exact).
   */
  async savePartiesDraft() {
    await this.waitForUiReady(2_000);

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
    await this.clickStable(save, 'حفظ مسودة الأطراف');

    await this.waitForUiReady(3_000);
    await this.waitForPartyGridReady();
  }

  async validateCompanyParty(payload: FilingPayload) {
    await this.waitForPartyGridReady();
    const establishmentNumber = payload.plaintiff.establishmentRegistration
      || agentConfig.company.establishmentNumber;
    let establishmentIssuer = agentConfig.company.establishmentIssuer;
    const registrationIssuerLabels = [
      'رقم السجل التجاري أو قيد المنشأة صادر عن',
    ];
    const registrationIssuerControlIds = ['crIssuedBy'];
    const commercialRegistrationLabels = ['رقم السجل التجاري'];
    const commercialRegistrationControlIds = ['identityNo'];
    const establishmentNumberLabels = [
      'رقم المنشأة',
      'رقم قيد المنشأة',
    ];
    const establishmentNumberControlIds = [
      'establishmentNo',
      'establishmentNumber',
      'officialRegistrationNumber',
    ];
    const company = await this.waitForPartyRow([
      payload.plaintiff.name,
      payload.plaintiff.commercialRegistration,
    ], 1_200);
    let partyDialog: Locator;
    if (!company) {
      partyDialog = await this.addPartyEditor('إضافة الشركة');
      await this.selectFieldUntilDependentListHasOptions(
        ['تصنيف الطرف', 'نوع الشخص'],
        'شركة',
        ['category'],
        ['صفة الطرف'],
        ['type'],
        partyDialog,
        'المدعي',
        'شخص طبيعي',
      );
      await this.selectFieldSticky(
        ['صفة الطرف'],
        'المدعي',
        ['type'],
        partyDialog,
        5,
      );
      await this.selectFieldSticky(
        ['نوع الجهات المعنوية', 'نوع الشركة'],
        'شركة ذات مسؤولية محدودة',
        ['compOrEstaType'],
        partyDialog,
      );
      await this.selectFieldSticky(
        ['جنسية الشركة'],
        'قطري',
        ['companyClassification'],
        partyDialog,
      );
      establishmentIssuer = await this.resolveDropdownOptionByAliases(
        registrationIssuerLabels,
        registrationIssuerControlIds,
        establishmentIssuer,
        ['وزارة التجارة والصناعة', 'وزارة التجارة', 'التجارة والصناعة'],
        partyDialog,
      );
      await this.selectFieldUntilDependentVisible(
        registrationIssuerLabels,
        establishmentIssuer,
        registrationIssuerControlIds,
        establishmentNumberLabels,
        establishmentNumberControlIds,
        partyDialog,
      );
      await this.fillField(
        commercialRegistrationLabels,
        payload.plaintiff.commercialRegistration,
        true,
        commercialRegistrationControlIds,
        partyDialog,
        { exactLabel: true, waitForMs: agentConfig.actionTimeoutMs },
      );
      await this.fillField(
        establishmentNumberLabels,
        establishmentNumber,
        true,
        establishmentNumberControlIds,
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
        ['رقم الهاتف المحمول', 'رقم الجوال', 'الجوال', 'الهاتف'],
        phoneForTaqadi(agentConfig.company.phone),
        true,
        ['mobileNo'],
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
      await this.ensureSelectedField(
        ['صفة الطرف'],
        'المدعي',
        ['type'],
        partyDialog,
      );
    }

    const companyTypeLabels = ['نوع الجهات المعنوية', 'نوع الشركة'];
    const companyTypeControlIds = ['compOrEstaType'];
    const companyTypeField = await this.exactFieldByLabel(
      companyTypeLabels,
      companyTypeControlIds,
      partyDialog,
    );
    if (!companyTypeField) {
      await this.selectFieldUntilDependentVisible(
        ['تصنيف الطرف', 'نوع الشخص'],
        'شركة',
        ['category'],
        companyTypeLabels,
        companyTypeControlIds,
        partyDialog,
      );
    }

    establishmentIssuer = await this.resolveDropdownOptionByAliases(
      registrationIssuerLabels,
      registrationIssuerControlIds,
      establishmentIssuer,
      ['وزارة التجارة والصناعة', 'وزارة التجارة', 'التجارة والصناعة'],
      partyDialog,
    );

    const refillCompanyFields = async () => {
      await this.fillField(
        commercialRegistrationLabels,
        payload.plaintiff.commercialRegistration,
        true,
        commercialRegistrationControlIds,
        partyDialog,
        { exactLabel: true, waitForMs: agentConfig.actionTimeoutMs },
      );
      await this.fillField(
        establishmentNumberLabels,
        establishmentNumber,
        true,
        establishmentNumberControlIds,
        partyDialog,
        { exactLabel: true, waitForMs: agentConfig.actionTimeoutMs },
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
      await this.fillField(
        ['العنوان'],
        agentConfig.company.address,
        true,
        ['addresses0.address'],
        partyDialog,
      );
      await this.fillField(
        ['رقم الهاتف المحمول', 'رقم الجوال', 'الجوال', 'الهاتف'],
        phoneForTaqadi(agentConfig.company.phone),
        true,
        ['mobileNo'],
        partyDialog,
      );
      await this.fillField(
        ['البريد الإلكتروني', 'البريد الالكتروني'],
        agentConfig.company.email,
        true,
        ['email', 'emailAddress'],
        partyDialog,
      );
    };

    // Every one of these Kendo fields can redraw the legal-entity form and
    // reset a previously selected sibling to the placeholder. Reconcile the
    // complete set twice, then assert all values together before saving.
    const companySelections = [
      {
        labels: ['تصنيف الطرف', 'نوع الشخص'],
        expected: 'شركة',
        controlIds: ['category'],
      },
      {
        labels: ['صفة الطرف'],
        expected: 'المدعي',
        controlIds: ['type'],
      },
      {
        labels: companyTypeLabels,
        expected: 'شركة ذات مسؤولية محدودة',
        controlIds: companyTypeControlIds,
      },
      {
        labels: ['جنسية الشركة'],
        expected: 'قطري',
        controlIds: ['companyClassification'],
      },
      {
        labels: registrationIssuerLabels,
        expected: establishmentIssuer,
        controlIds: registrationIssuerControlIds,
      },
    ];
    await this.reconcileStableSelections(
      companySelections,
      partyDialog,
      refillCompanyFields,
    );
    // Existing drafts may already use the correct issuer while the actual
    // establishment number is blank or still contains the commercial record.
    // Always write and verify the authoritative establishment-card value.
    await refillCompanyFields();

    await this.fillField(
      ['الترتيب حسب الصحيفة', 'ترتيب الطرف', 'الترتيب'],
      String(taqadiCompanyPartyOrder),
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
      taqadiCompanyPartyOrder,
      'PLAINTIFF_ORDER_MISMATCH',
    );
  }

  async addDefendant(
    payload: FilingPayload,
    options: { continueAfterSave?: boolean } = {},
  ) {
    const defendantNameParts = [
      payload.defendant.firstName,
      payload.defendant.middleName,
      payload.defendant.lastName,
    ].filter((part): part is string => Boolean(part?.trim()));
    if (
      defendantNameParts.length < 2
      || defendantNameParts.some((part) => !/[\u0600-\u06FF]/.test(part) || /[A-Za-z]/.test(part))
    ) {
      throw new HumanInterventionError(
        'اسم المدعى عليه في حزمة تقاضي ليس عربيًا. حدّث الاسم العربي للعميل ثم أعد تجهيز الدعوى.',
        'DEFENDANT_ARABIC_NAME_REQUIRED',
        { fullName: payload.defendant.fullName, url: this.page.url() },
      );
    }
    const existing = await this.partyRow([
      payload.defendant.fullName,
      payload.defendant.idNumber,
    ]);
    let partyDialog: Locator;
    if (existing) {
      partyDialog = await this.openPartyEditor(existing);
    } else {
      partyDialog = await this.addPartyEditor('إضافة المدعى عليه');
      await this.selectFieldUntilDependentListHasOptions(
        ['تصنيف الطرف', 'نوع الشخص'],
        'شخص طبيعي',
        ['category'],
        ['صفة الطرف'],
        ['type'],
        partyDialog,
        'المدعى عليه',
        'شركة',
      );
      await this.selectFieldSticky(
        ['صفة الطرف'],
        'المدعى عليه',
        ['type'],
        partyDialog,
        5,
      );
    }

    await this.ensureSelectedField(
      ['صفة الطرف'],
      'المدعى عليه',
      ['type'],
      partyDialog,
    );

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
    let defendantIdentityType: string | null = null;
    if (payload.defendant.idType) {
      defendantIdentityType = await this.resolveIdentityTypeForParty(
        'defendant',
        identityTypeLabels,
        identityTypeControlIds,
        payload.defendant.idType,
        payload.defendant.nationality || '',
        payload.defendant.idNumber,
        partyDialog,
      );
      await this.selectFieldUntilDependentVisible(
        identityTypeLabels,
        defendantIdentityType,
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
      String(taqadiPartyOrder),
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
    const stableDefendantFields = {
        firstName: payload.defendant.firstName
          || payload.defendant.fullName,
        lastName: payload.defendant.lastName,
        identityNumber: payload.defendant.idNumber,
        identityNumberLabels,
        identityNumberControlIds,
        address: agentConfig.defendantDefaults.address,
        phone: phoneForTaqadi(payload.defendant.phone),
        email: agentConfig.defendantDefaults.email,
        partyOrder: String(taqadiPartyOrder),
      };
    await this.fillStableNaturalPersonRequiredFields(
      stableDefendantFields,
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
        expected: defendantIdentityType || payload.defendant.idType,
      },
    ];
    await this.reconcileStableSelections(
      finalSelections,
      partyDialog,
      async () => {
        await this.fillStableNaturalPersonRequiredFields(
          stableDefendantFields,
          partyDialog,
        );
      },
    );
    await this.saveOpenParty(partyDialog);
    await this.assertPartyOrder(
      [
        payload.defendant.fullName,
        payload.defendant.idNumber,
      ],
      taqadiPartyOrder,
      'DEFENDANT_ORDER_MISMATCH',
    );
    if (options.continueAfterSave === false) return;
    await this.continueAfterParties();
  }

  async continueAfterParties() {
    await this.clickAny(['التالي'], 'متابعة بعد الأطراف');
    await this.page.waitForTimeout(1_000);
  }

  private async localDocumentFile(document: MaterializedDocument) {
    const portalFileName = portalUploadFileNames[document.key];
    const portalFilePath = portalFileName
      ? path.join(path.dirname(document.filePath), portalFileName)
      : document.filePath;
    if (portalFilePath !== document.filePath) {
      const [sourceFile, portalFile] = await Promise.all([
        stat(document.filePath).catch(() => null),
        stat(portalFilePath).catch(() => null),
      ]);
      if (!sourceFile?.isFile()) {
        throw new HumanInterventionError(
          `تعذر قراءة ملف «${document.name}» قبل رفعه إلى تقاضي`,
          'DOCUMENT_LOCAL_FILE_UNREADABLE',
          {
            documentKey: document.key,
            documentName: document.name,
            filePath: document.filePath,
          },
        );
      }
      if (!portalFile?.isFile() || portalFile.size !== sourceFile.size) {
        await copyFile(document.filePath, portalFilePath);
      }
    }

    let localFileSize = 0;
    try {
      const localFile = await stat(portalFilePath);
      localFileSize = localFile.isFile() ? localFile.size : 0;
    } catch (error) {
      throw new HumanInterventionError(
        `تعذر قراءة ملف «${document.name}» قبل رفعه إلى تقاضي`,
        'DOCUMENT_LOCAL_FILE_UNREADABLE',
        {
          documentKey: document.key,
          documentName: document.name,
          filePath: portalFilePath,
          cause: error instanceof Error ? error.message : String(error),
        },
      );
    }
    if (localFileSize <= 0) {
      throw new HumanInterventionError(
        `ملف «${document.name}» فارغ ولا يمكن رفعه إلى تقاضي`,
        'DOCUMENT_LOCAL_FILE_EMPTY',
        {
          documentKey: document.key,
          documentName: document.name,
          filePath: portalFilePath,
        },
      );
    }

    return {
      path: portalFilePath,
      name: path.basename(portalFilePath),
      size: localFileSize,
    };
  }

  private async attachDocumentFile(
    input: Locator,
    document: MaterializedDocument,
  ) {
    const localFile = await this.localDocumentFile(document);

    await input.setInputFiles(localFile.path, {
      timeout: Math.max(agentConfig.actionTimeoutMs, 45_000),
    });
    const browserFile = await input.evaluate((element) => {
      const file = (element as HTMLInputElement).files?.[0];
      return file ? { name: file.name, size: file.size } : null;
    }).catch(() => null);

    // Kendo uploads immediately, then clears or replaces the native input.
    // The visible upload state and Save button become the source of truth.
    return browserFile || localFile;
  }

  private async documentDialogSaveButton(dialogRoot: Locator | Page) {
    return this.firstVisible([
      dialogRoot.locator('.modal-footer button.btn-primary:visible')
        .filter({ hasText: /^\s*حفظ\s*$/ }),
      dialogRoot.getByRole('button', { name: /^\s*حفظ\s*$/ }),
      dialogRoot.locator('button:visible').filter({ hasText: /^\s*حفظ\s*$/ }),
      dialogRoot.getByRole('button', { name: /إضافة|إرفاق|تأكيد/i }),
    ]);
  }

  private visibleDocumentDialogs() {
    return this.page.locator(
      '.modal:visible, [role="dialog"]:visible, .k-dialog:visible',
    );
  }

  private async hasOpenDocumentDialog() {
    const dialogs = this.visibleDocumentDialogs();
    const count = Math.min(await dialogs.count(), 10);
    for (let index = 0; index < count; index += 1) {
      const dialog = dialogs.nth(index);
      const hasFileInput = await dialog.locator('input[type="file"]')
        .count().catch(() => 0) > 0;
      const text = normalizeText(await dialog.innerText().catch(() => ''));
      const isDocumentDialog = /إضافة\s+(وثيقة|مستند)/i.test(text);
      const isLoadingShell = await dialog.locator([
        '.k-loading-mask',
        '.k-loading-image',
        '.loading-overlay',
        '.spinner-border',
        '.blockUI',
      ].join(', ')).count().catch(() => 0) > 0;
      if (hasFileInput || isDocumentDialog || isLoadingShell) return true;
    }
    return false;
  }

  private async waitForDocumentDialogReady(timeoutMs: number) {
    const visibleDialogs = this.visibleDocumentDialogs();
    const dialog = visibleDialogs
      .filter({ has: this.page.locator('input[type="file"]') })
      .last();
    const fileInput = dialog.locator('input[type="file"]').first();

    try {
      // Taqadi first displays a loading shell and injects the upload controls
      // later. Waiting for the real input prevents treating that shell as ready.
      await fileInput.waitFor({ state: 'attached', timeout: timeoutMs });
      await dialog.waitFor({ state: 'visible', timeout: timeoutMs });
    } catch (error) {
      const visibleDialogTexts = (await visibleDialogs.allTextContents()
        .catch(() => []))
        .map((text) => normalizeText(text))
        .filter(Boolean)
        .slice(-5);
      const loadingOverlayVisible = await this.page.locator([
        '.k-loading-mask:visible',
        '.k-loading-image:visible',
        '.loading-overlay:visible',
        '.spinner-border:visible',
        '.blockUI:visible',
      ].join(', ')).count().catch(() => 0) > 0;

      throw new HumanInterventionError(
        'لم تصبح نافذة «إضافة وثيقة» جاهزة لرفع الملف ضمن المهلة',
        'DOCUMENT_DIALOG_NOT_READY',
        {
          timeoutMs,
          loadingOverlayVisible,
          visibleDialogTexts,
          url: this.page.url(),
          cause: error instanceof Error ? error.message : String(error),
        },
      );
    }

    return { dialog, fileInput };
  }

  private async uploadDocument(
    document: MaterializedDocument,
  ): Promise<DocumentUploadOutcome> {
    const labels = documentLabels[document.key] || [document.name];
    if (await this.hasOpenDocumentDialog()) {
      return this.uploadDocumentViaAddDialog(
        document,
        documentTypeLabels[document.key] || labels,
      );
    }
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
        const candidate = container.locator('input[type="file"]').first();
        const alreadySelected = await candidate.evaluate(
          (element) => Boolean((element as HTMLInputElement).files?.length),
        ).catch(() => false);
        if (alreadySelected) continue;
        input = candidate;
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
        const alreadySelected = await candidate.evaluate(
          (element) => Boolean((element as HTMLInputElement).files?.length),
        ).catch(() => false);
        if (alreadySelected) continue;
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
      input = visibleSlots[0] || null;
    }

    if (!input) {
      // The portal now exposes a single «إضافة وثيقة» dialog instead of fixed
      // per-document slots. Open it, attach the file, pick the closest type.
      return this.uploadDocumentViaAddDialog(
        document,
        documentTypeLabels[document.key] || labels,
      );
    }

    const selectedFile = await this.attachDocumentFile(input, document);
    await this.page.waitForTimeout(250);
    return {
      status: 'uploaded',
      key: document.key,
      name: document.name,
      fileName: selectedFile.name,
      sizeBytes: selectedFile.size,
    };
  }

  /**
   * Upload one document through the «إضافة وثيقة» dialog used by the current
   * Taqadi documents page: open the dialog, choose the closest document type,
   * attach the file, then save. Taqadi validates uploads against the type that
   * is selected at attachment time, so changing the type afterwards silently
   * discards non-memo files and leaves Save disabled.
   */
  private async uploadDocumentViaAddDialog(
    document: MaterializedDocument,
    labels: string[],
  ): Promise<DocumentUploadOutcome> {
    const hasOpenDialog = await this.hasOpenDocumentDialog();
    if (!hasOpenDialog) {
      const addButton = await this.firstVisible([
        this.page.getByRole('button', { name: /إضافة وثيقة|اضافة وثيقة|إضافة مستند/i }),
        this.page.locator('button, a').filter({ hasText: /إضافة وثيقة|اضافة وثيقة|إضافة مستند/i }),
        this.page.locator('[id^="button_add"]'),
      ]);
      if (!addButton) {
        throw new HumanInterventionError(
          'لم يجد الوكيل زر «إضافة وثيقة» في صفحة المستندات',
          'TAQADI_UI_CHANGED',
          { url: this.page.url() },
        );
      }
      await this.clickStable(addButton, 'فتح نافذة إضافة وثيقة');
    }

    const { dialog, fileInput } = await this.waitForDocumentDialogReady(
      Math.max(agentConfig.actionTimeoutMs, 45_000),
    );
    const dialogRoot = dialog;
    const localFile = await this.localDocumentFile(document);
    // Select the type before attaching the file. The dialog defaults to
    // «المذكرة الشارحة», which is valid only for the two memo copies.
    const typeLabels = ['نوع المستند', 'نوع الوثيقة', 'نوع المرفق', 'المستند'];
    const typeField = await this.fieldByLabel(typeLabels, [], dialogRoot)
      .catch(() => null);
    if (typeField) {
      await this.pickDialogDocumentType(
        typeField,
        dialogRoot,
        labels,
      );
    }

    const dialogText = normalizeText(await dialogRoot.innerText().catch(() => ''));
    const completedFileVisible = await dialogRoot.locator(
      '.k-file-success:visible, .k-file-complete:visible',
    ).count().catch(() => 0) > 0;
    const expectedFileAlreadyUploaded = dialogText.includes(localFile.name)
      && (completedFileVisible || /(^|\s)(تم|مكتمل|100\s*%|complete)(\s|$)/i
        .test(dialogText));
    const selectedFile = expectedFileAlreadyUploaded
      ? localFile
      : await this.attachDocumentFile(fileInput, document);

    let saveButton: Locator | null = null;
    let rejectionReason = '';
    let uploadStatus = '';
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const errorMessages = await dialogRoot.locator([
        '.k-file-error:visible',
        '.k-file-invalid:visible',
        '.k-file-validation-message:visible',
        '.alert-danger:visible',
        '.text-danger:visible',
      ].join(', ')).allTextContents().catch(() => []);
      uploadStatus = normalizeText((await dialogRoot.locator([
        '.k-upload-status-total:visible',
        '.k-progress-status:visible',
        '.k-file-status:visible',
      ].join(', ')).allTextContents().catch(() => [])).join(' '));
      const statusIsError = /خط[اأ]|فشل|تعذر|غير مقبول|invalid|error|failed/i
        .test(uploadStatus);
      rejectionReason = normalizeText([
        ...errorMessages,
        statusIsError ? uploadStatus : '',
      ].filter(Boolean).join(' '));
      saveButton = await this.documentDialogSaveButton(dialogRoot);
      const saveEnabled = saveButton
        ? await saveButton.isEnabled().catch(() => false)
        : false;
      const completedClassVisible = await dialogRoot.locator(
        '.k-file-success:visible, .k-file-complete:visible',
      ).count().catch(() => 0) > 0;
      const uploadCompleted = completedClassVisible
        || /(^|\s)(تم|مكتمل|اكتمل|100\s*%|complete|uploaded)(\s|$)/i
          .test(uploadStatus);
      const uploadInProgress = !uploadCompleted
        && /جار[يى]|قيد الرفع|uploading|progress/i.test(uploadStatus);
      if (rejectionReason || (saveEnabled && !uploadInProgress)) {
        break;
      }
      await this.page.waitForTimeout(250);
    }

    saveButton = await this.documentDialogSaveButton(dialogRoot);
    if (!saveButton || !(await saveButton.isEnabled().catch(() => false))) {
      // Capture diagnostics while the :visible dialog locator still resolves.
      const selectedType = typeField
        ? await this.selectedFieldText(typeField).catch(() => '')
        : '';
      const finalDialogText = normalizeText(
        await dialogRoot.innerText().catch(() => ''),
      );
      const closeButton = await this.firstVisible([
        dialogRoot.getByRole('button', { name: /^\s*إغلاق\s*$/ }),
        dialogRoot.getByRole('button', { name: /^\s*إلغاء\s*$/ }),
        dialogRoot.locator('button:visible').filter({ hasText: /^\s*إغلاق\s*$/ }),
      ]);
      if (closeButton && await closeButton.isEnabled().catch(() => false)) {
        await closeButton.click();
      } else {
        await this.page.keyboard.press('Escape').catch(() => undefined);
      }
      await dialog.waitFor({ state: 'hidden', timeout: 5_000 })
        .catch(() => undefined);

      const reason = rejectionReason
        || `لم يفعّل تقاضي زر الحفظ بعد إرفاق الملف (النوع: ${selectedType || 'غير ظاهر'}؛ حالة الرفع: ${uploadStatus || 'غير ظاهرة'})`;
      console.warn(
        `[TaqadiAgent] skipped rejected document «${document.name}»: ${reason}`,
      );
      return {
        status: 'skipped',
        key: document.key,
        name: document.name,
        fileName: selectedFile.name,
        sizeBytes: selectedFile.size,
        reason: finalDialogText && !rejectionReason
          ? `${reason}؛ محتوى النافذة: ${finalDialogText.slice(0, 500)}`
          : reason,
      };
    }
    await this.clickStable(saveButton, `حفظ مستند ${document.name}`);
    const uploadedRow = this.page.locator('tr:visible').filter({
      hasText: selectedFile.name,
    }).first();
    const confirmationDeadline = Date.now() + 15_000;
    let saveConfirmed = false;
    do {
      const dialogClosed = !(await dialog.isVisible().catch(() => false));
      const rowVisible = await uploadedRow.isVisible().catch(() => false);
      if (dialogClosed || rowVisible) {
        saveConfirmed = true;
        break;
      }
      await this.page.waitForTimeout(250);
    } while (Date.now() < confirmationDeadline);

    if (!saveConfirmed) {
      throw new HumanInterventionError(
        `ضغط الوكيل زر حفظ «${document.name}» لكن تقاضي لم يغلق النافذة ولم يعرض المستند في القائمة`,
        'DOCUMENT_SAVE_NOT_CONFIRMED',
        {
          documentKey: document.key,
          documentName: document.name,
          fileName: selectedFile.name,
          uploadStatus,
          url: this.page.url(),
        },
      );
    }
    return {
      status: 'uploaded',
      key: document.key,
      name: document.name,
      fileName: selectedFile.name,
      sizeBytes: selectedFile.size,
    };
  }

  private async pickDialogDocumentType(
    typeField: Locator,
    dialogRoot: Locator | Page,
    labels: string[],
  ): Promise<void> {
    const expectedLabels = labels
      .map((label) => normalizeText(label))
      .filter(Boolean);
    const expectedNormalized = expectedLabels.map(normalizeArabicText);
    const optionMatches = (optionText: string) => {
      const normalized = normalizeArabicText(optionText);
      return expectedNormalized.some((wanted) => (
        normalized === wanted
        || normalized.includes(wanted)
        || wanted.includes(normalized)
      ));
    };
    const currentSelection = await this.selectedFieldText(typeField);
    if (optionMatches(currentSelection)) return;

    const tagName = await typeField.evaluate((element) =>
      element.tagName.toLowerCase(),
    );
    if (tagName === 'select') {
      const nativeOptions = await typeField.locator('option').allTextContents();
      const matchingOption = nativeOptions
        .map(normalizeText)
        .find((optionText) => optionText && optionMatches(optionText));
      if (!matchingOption) {
        throw new HumanInterventionError(
          `نوع المستند المطلوب «${expectedLabels.join(' أو ')}» غير موجود في قائمة تقاضي`,
          'DOCUMENT_TYPE_NOT_FOUND',
          {
            expectedTypes: expectedLabels,
            availableTypes: nativeOptions.map(normalizeText).filter(Boolean),
            url: this.page.url(),
          },
        );
      }
      await typeField.selectOption({ label: matchingOption });
      await this.assertSelectedField(
        typeField,
        ['نوع المستند'],
        matchingOption,
      );
      return;
    }

    const { listboxId } = await this.dropdownIdentity(typeField, []);
    await this.clickStable(typeField, 'فتح قائمة نوع المستند');
    const options = listboxId
      ? this.page.locator(
        `[id="${listboxId}"] [role="option"], `
        + `[id="${listboxId}"] .k-item, `
        + `[id="${listboxId}"] .k-list-item`,
      )
      : this.page.locator(
        '.k-animation-container:visible [role="option"], '
        + '.k-animation-container:visible .k-item, '
        + '.k-list-container:visible [role="option"], '
        + '.k-list-container:visible .k-item, '
        + '.ng-dropdown-panel:visible .ng-option',
      );
    const deadline = Date.now() + 12_000;
    const availableOptions = new Set<string>();
    while (Date.now() < deadline) {
      // Kendo leaves hidden copies of the listbox in the DOM every time the
      // upload dialog is reopened. Reading each option through Playwright
      // turns those copies into hundreds of browser round trips. Read the
      // whole list in one browser evaluation and act only on a visible match.
      const optionSnapshots = await options.evaluateAll((elements) => {
        const visibleOptions: Array<{
          index: number;
          text: string;
          visible: true;
        }> = [];
        elements.forEach((element, index) => {
          const node = element as HTMLElement;
          const style = window.getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          const visible = style.display !== 'none'
            && style.visibility !== 'hidden'
            && rect.width > 0
            && rect.height > 0;
          if (!visible) return;
          visibleOptions.push({
            index,
            text: (node.innerText || node.textContent || '')
              .replace(/\s+/g, ' ')
              .trim(),
            visible: true,
          });
        });
        return visibleOptions;
      }).catch(() => []);

      for (const snapshot of optionSnapshots) {
        if (!snapshot.text || snapshot.text.includes('اختيار')) continue;
        availableOptions.add(snapshot.text);
      }
      const matchingOption = optionSnapshots.find((snapshot) =>
        optionMatches(snapshot.text));
      if (matchingOption) {
        await options.nth(matchingOption.index)
          .evaluate((element) => (element as HTMLElement).click());
        await this.assertSelectedField(
          typeField,
          ['نوع المستند'],
          matchingOption.text,
        );
        return;
      }
      await this.page.waitForTimeout(250);
    }
    await this.page.keyboard.press('Escape').catch(() => undefined);
    throw new HumanInterventionError(
      `نوع المستند المطلوب «${expectedLabels.join(' أو ')}» لم يظهر في قائمة تقاضي`,
      'DOCUMENT_TYPE_NOT_FOUND',
      {
        expectedTypes: expectedLabels,
        availableTypes: [...availableOptions],
        listboxId,
        url: this.page.url(),
      },
    );
  }

  private async documentAlreadyUploaded(document: MaterializedDocument) {
    const fileName = (await this.localDocumentFile(document)).name;
    const matchingRows = this.page.locator('tr:visible').filter({
      hasText: fileName,
    });
    return (await matchingRows.count()) > 0;
  }

  async uploadDocuments(
    documents: MaterializedDocument[],
    onProgress?: (progress: DocumentUploadProgress) => Promise<void> | void,
  ): Promise<DocumentUploadSummary> {
    const summary: DocumentUploadSummary = {
      uploaded: [],
      skipped: [],
      alreadyPresent: [],
    };
    const mandatoryFailures: DocumentUploadOutcome[] = [];
    const emitProgress = async (progress: DocumentUploadProgress) => {
      console.log(
        `[TaqadiAgent] document ${progress.index + 1}/${progress.total} `
        + `${progress.phase}: ${progress.document.fileName} (${progress.document.key})`,
      );
      await Promise.resolve(onProgress?.(progress)).catch((error) => {
        console.warn('[TaqadiAgent] document progress update failed:', error);
      });
    };
    for (let index = 0; index < documents.length; index += 1) {
      const document = documents[index];
      const progressDocument = {
        key: document.key,
        name: document.name,
        fileName: path.basename(document.filePath),
      };
      await emitProgress({
        phase: 'started',
        index,
        total: documents.length,
        document: progressDocument,
      });
      if (await this.documentAlreadyUploaded(document)) {
        summary.alreadyPresent.push({
          ...progressDocument,
        });
        await emitProgress({
          phase: 'already_present',
          index,
          total: documents.length,
          document: progressDocument,
        });
        continue;
      }
      const outcome = await this.uploadDocument(document);
      summary[outcome.status === 'uploaded' ? 'uploaded' : 'skipped']
        .push(outcome);
      await emitProgress({
        phase: outcome.status,
        index,
        total: documents.length,
        document: progressDocument,
        outcome,
      });
      if (outcome.status === 'skipped' && mandatoryMemoKeys.has(document.key)) {
        mandatoryFailures.push(outcome);
      }
    }
    if (mandatoryFailures.length > 0) {
      const failedNames = mandatoryFailures
        .map((failure) => `«${failure.name}»: ${failure.reason || 'سبب غير معروف'}`)
        .join('، ');
      throw new HumanInterventionError(
        `رفض تقاضي مستندًا إلزاميًا بعد محاولة رفع بقية الحزمة: ${failedNames}`,
        'MANDATORY_MEMO_DOCUMENT_REJECTED',
        {
          mandatoryFailures,
          uploadedDocuments: summary.uploaded,
          skippedDocuments: summary.skipped,
          alreadyPresentDocuments: summary.alreadyPresent,
        },
      );
    }
    if (summary.skipped.length > 0) {
      const skippedNames = summary.skipped
        .map((failure) => `«${failure.name}»: ${failure.reason || 'سبب غير معروف'}`)
        .join('، ');
      throw new HumanInterventionError(
        `تمت محاولة رفع بقية الحزمة، لكن لن يعتمد الوكيل دعوى ناقصة. المستندات التي لم يقبلها تقاضي: ${skippedNames}`,
        'DOCUMENT_BUNDLE_INCOMPLETE',
        {
          uploadedDocuments: summary.uploaded,
          skippedDocuments: summary.skipped,
          alreadyPresentDocuments: summary.alreadyPresent,
        },
      );
    }
    await this.clickAny(['التالي'], 'متابعة بعد المستندات');
    await this.page.waitForTimeout(1_500);
    return summary;
  }

  async verifyReview(payload: FilingPayload) {
    const expandAll = this.page.getByText('توسيع الكل', { exact: true })
      .filter({ visible: true })
      .first();
    if (await expandAll.isVisible().catch(() => false)) {
      await expandAll.click();
      await this.page.waitForTimeout(500);
    }

    const bodyText = normalizeText(
      await this.page.locator('body').innerText(),
    );
    const comparable = (value: string) => normalizeArabicText(value)
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const comparableBodyText = comparable(bodyText);
    const requiredValues = [
      payload.case.title,
      payload.defendant.fullName,
      payload.contract.number,
    ];
    const missing = requiredValues.filter(
      (value) => !comparableBodyText.includes(comparable(value)),
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

  async continueAfterFees() {
    await this.clickAny(['التالي'], 'متابعة بعد تفاصيل الرسوم');
    await this.page.waitForTimeout(1_500);
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
        () => /تم بنجاح|رقم الطلب|رقم الدعوى|الرقم المرجعي|رقم المرجع|إيصال طلب قيد دعوى/.test(
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

    return this.readReceipt();
  }

  async readReceipt(): Promise<FilingResult> {
    const confirmationText = normalizeText(
      await this.page.locator('body').innerText(),
    );
    const caseNumber = this.extractValue(confirmationText, [
      /رقم الدعوى\s*[:：]?\s*([A-Z0-9\u0660-\u0669/-]+)/i,
      /Case\s*No\.?\s*[:：]?\s*([A-Z0-9/-]+)/i,
    ]);
    const referenceNumber = this.extractValue(confirmationText, [
      /الرقم المرجعي\s*[:：]?\s*([A-Z0-9\u0660-\u0669/-]+)/i,
      /رقم المرجع\s*[:：]?\s*([A-Z0-9\u0660-\u0669/-]+)/i,
      /رقم الطلب\s*[:：]?\s*([A-Z0-9\u0660-\u0669/-]+)/i,
      /Reference\s*[:：]?\s*([A-Z0-9/-]+)/i,
    ]) || caseNumber;
    const feesText = this.extractValue(confirmationText, [
      /(?:الرسوم|قيمة الرسوم)\s*[:：]?\s*([0-9\u0660-\u0669,.]+)/i,
      /رسوم تسليم طلب رفع دعوى\s*([0-9\u0660-\u0669,.]+)/i,
      /المجموع\s*:?\s*\[?ريال قطري\]?\s*([0-9\u0660-\u0669,.]+)/i,
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
