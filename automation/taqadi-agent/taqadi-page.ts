import type {
  Locator,
  Page,
  Request,
  Response,
} from 'playwright';
import { agentConfig } from './config';
import type {
  FilingPayload,
  FilingResult,
  MaterializedDocument,
} from './types';
import {
  HumanInterventionError,
  SubmissionUncertainError,
} from './types';

const normalizeText = (value: string) =>
  value.replace(/\s+/g, ' ').trim();

const normalizeArabicText = (value: string) =>
  normalizeText(value)
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي');

const partyStabilizationMs = process.env.NODE_ENV === 'test'
  ? 0
  : 10_000;

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

  constructor(private readonly page: Page) {
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

  private async selectIndividualLitigantAccountIfNeeded() {
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

    const accountField = await this.firstVisible([
      this.page.locator(
        '.modal:visible .k-dropdown, .modal:visible [aria-haspopup="listbox"], '
        + '.k-window:visible .k-dropdown, .k-window:visible [aria-haspopup="listbox"]',
      ),
      this.page.locator('.k-dropdown:visible, [aria-haspopup="listbox"]:visible'),
    ]);
    if (!accountField) {
      throw new HumanInterventionError(
        'ظهرت نافذة اختيار صفة الدخول، لكن قائمة أنواع الحسابات غير متاحة',
        'TAQADI_UI_CHANGED',
        { url: this.page.url() },
      );
    }

    await accountField.click();
    const accountOptions = this.page.locator(
      '[role="option"], .k-animation-container .k-item, '
      + '.k-list-container .k-item, .k-list .k-item',
    );
    let individualOption: Locator | null = null;
    const optionCount = Math.min(await accountOptions.count(), 50);
    for (let index = 0; index < optionCount; index += 1) {
      const option = accountOptions.nth(index);
      if (!(await option.isVisible().catch(() => false))) continue;
      const optionText = normalizeArabicText(
        await option.innerText().catch(() => ''),
      );
      if (
        optionText === normalizeArabicText('متقاضي فرد')
        || optionText.includes(normalizeArabicText('متقاضي فرد'))
      ) {
        individualOption = option;
        break;
      }
    }
    if (!individualOption) {
      throw new HumanInterventionError(
        'لم يجد الوكيل صفة «متقاضي فرد» ضمن أنواع الحسابات',
        'TAQADI_OPTION_MISSING',
        { field: 'نوع الحساب', optionText: 'متقاضي فرد', url: this.page.url() },
      );
    }

    await individualOption.click({ force: true });
    await this.page.waitForTimeout(300);
    await loginButton.click();
    await this.page.waitForTimeout(2_000);

    if (await loginButton.isVisible().catch(() => false)) {
      throw new HumanInterventionError(
        'لم يقبل موقع تقاضي صفة «متقاضي فرد» بعد اختيارها',
        'TAQADI_OPTION_UNSTABLE',
        { field: 'نوع الحساب', optionText: 'متقاضي فرد', url: this.page.url() },
      );
    }
  }

  private async visibleWidgetForInput(input: Locator): Promise<Locator | null> {
    if (await input.isVisible().catch(() => false)) return input;

    const widget = input.locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " k-widget ")][1]',
    );
    if (await widget.isVisible().catch(() => false)) return widget;
    return null;
  }

  private async fieldByControlIds(controlIds: string[]) {
    for (const controlId of controlIds) {
      const input = this.page.locator(`[id="${controlId}"]`);
      const inputCount = Math.min(await input.count(), 10);
      for (let index = 0; index < inputCount; index += 1) {
        const widget = await this.visibleWidgetForInput(input.nth(index));
        if (widget) return widget;
      }

      const listbox = this.page.locator(
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

  private async fieldByLabel(labels: string[], controlIds: string[] = []) {
    const byControlId = await this.fieldByControlIds(controlIds);
    if (byControlId) return byControlId;

    for (const label of labels) {
      const direct = await this.firstVisible([
        this.page.getByLabel(label, { exact: false }),
        this.page.locator(
          `input[placeholder*="${label}"], textarea[placeholder*="${label}"]`,
        ),
      ]);
      if (direct) return direct;

      const labelLocator = this.page.locator('label').filter({ hasText: label });
      const count = await labelLocator.count();
      for (let index = 0; index < count; index += 1) {
        const labelElement = labelLocator.nth(index);
        const forId = await labelElement.getAttribute('for');
        if (forId) {
          const escapedId = forId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          const byId = this.page.locator(`[id="${escapedId}"]`);
          if (await byId.count()) {
            const widget = await this.visibleWidgetForInput(byId.first());
            if (widget) return widget;
          }

          const normalizedId = forId.replace(/\./g, '_');
          const normalizedInput = this.page.locator(`[id="${normalizedId}"]`);
          if (await normalizedInput.count()) {
            const widget = await this.visibleWidgetForInput(
              normalizedInput.first(),
            );
            if (widget) return widget;
          }
        }

        const nearby = await this.controlNearElement(labelElement);
        if (nearby) return nearby;
      }

      const textCandidates = this.page.getByText(label, { exact: false });
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
        const lateControl = await this.fieldByControlIds(controlIds);
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

  private async fillField(
    labels: string[],
    value: string | null | undefined,
    required = true,
    controlIds: string[] = [],
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

    if (
      controlIds.includes('priority')
      && /^-?\d+(?:\.\d+)?$/.test(value)
    ) {
      const partyDialog = this.page.locator(
        '#modal-dialog:visible, .modal.in:visible, .modal.show:visible, '
        + '[role="dialog"]:visible',
      ).last();
      const partyOrderInput = partyDialog
        .locator('input.k-formatted-value:visible')
        .first();
      this.lastPriorityDiagnostics = {
        strategy: 'priority-probe',
        dialogCount: await partyDialog.count(),
        formattedInputCount: await partyDialog
          .locator('input.k-formatted-value')
          .count(),
        visibleFormattedInputCount: await partyDialog
          .locator('input.k-formatted-value:visible')
          .count(),
      };
      if (await partyOrderInput.isVisible().catch(() => false)) {
        await partyOrderInput.click();
        await partyOrderInput.press('Control+A');
        await partyOrderInput.pressSequentially(value);
        await partyOrderInput.press('Tab');
        await this.page.waitForTimeout(300);
        this.lastPriorityDiagnostics = {
          strategy: 'first-visible-kendo-input',
          formattedValue: await partyOrderInput.inputValue()
            .catch(() => null),
        };
        return;
      }
    }

    const field = await this.fieldByLabel(labels, controlIds);
    if (!field) {
      if (!required) return;
      throw new HumanInterventionError(
        `لم يجد الوكيل حقل «${labels[0]}»`,
        'TAQADI_UI_CHANGED',
        { expectedLabels: labels, url: this.page.url() },
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
      const visibleNumericInput = this.page
        .locator(`[id="${controlIds[0]}"]`)
        .locator(
          'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " k-numerictextbox ")][1]'
          + '//input[contains(concat(" ", normalize-space(@class), " "), " k-formatted-value ")]',
        )
        .first();
      if (await visibleNumericInput.isVisible().catch(() => false)) {
        console.log('[TaqadiAgent] priority strategy: visible-input');
        await visibleNumericInput.click();
        await visibleNumericInput.press('Control+A');
        await visibleNumericInput.fill(value);
        await visibleNumericInput.press('Tab');
        await this.page.waitForTimeout(300);
        this.lastPriorityDiagnostics = {
          ...this.lastPriorityDiagnostics,
          strategy: 'visible-input',
          formattedValue: await visibleNumericInput.inputValue()
            .catch(() => null),
          backingValue: await this.page
            .locator(`[id="${controlIds[0]}"]`)
            .inputValue()
            .catch(() => null),
        };
        return;
      }

      const numericArgs = JSON.stringify({
        controlId: controlIds[0],
        value: Number(value),
      });
      const numericApplied = await this.page.evaluate(`(() => {
        const args = ${numericArgs};
        const input = document.getElementById(args.controlId);
        const jq = window.jQuery || window.$;
        if (!input || !jq) return false;
        const widget = jq(input).data('kendoNumericTextBox');
        if (!widget) return false;
        widget.value(args.value);
        input.value = String(args.value);
        input.setAttribute('value', String(args.value));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        widget.trigger('change');
        return true;
      })()`) as boolean;
      if (numericApplied) {
        if (controlIds[0] === 'priority') {
          console.log('[TaqadiAgent] priority strategy: kendo-widget');
          this.lastPriorityDiagnostics = {
            ...this.lastPriorityDiagnostics,
            strategy: 'kendo-widget',
            backingValue: await this.page
              .locator(`[id="${controlIds[0]}"]`)
              .inputValue()
              .catch(() => null),
          };
        }
        await this.page.waitForTimeout(200);
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
    await fillTarget.fill(value);
    await fillTarget.press('Tab').catch(() => undefined);
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

  private async selectField(
    labels: string[],
    optionText: string,
    controlIds: string[] = [],
  ) {
    const field = await this.fieldByLabel(labels, controlIds);
    if (!field) {
      throw new HumanInterventionError(
        `لم يجد الوكيل قائمة «${labels[0]}»`,
        'TAQADI_UI_CHANGED',
        { expectedLabels: labels, optionText, url: this.page.url() },
      );
    }

    const tagName = await field.evaluate((element) =>
      element.tagName.toLowerCase(),
    );
    if (tagName === 'select') {
      await field.selectOption({ label: optionText }).catch(async () => {
        await field.selectOption({ value: optionText });
      });
      return;
    }

    if (controlIds[0]) {
      await this.page.waitForFunction(
        (id) => {
          const element = document.querySelector(
            `[aria-owns="${id}_listbox"]`,
          );
          const input = document.getElementById(id) as HTMLInputElement | null;
          return Boolean(
            element
            && element.getAttribute('aria-disabled') !== 'true'
            && element.getAttribute('aria-busy') !== 'true'
            && !input?.disabled,
          );
        },
        controlIds[0],
      );
      await this.page.waitForTimeout(300);
    }

    const currentText = normalizeText(
      await field.locator('.k-input').innerText().catch(() => ''),
    );
    if (
      normalizeArabicText(currentText)
      === normalizeArabicText(optionText)
    ) return;

    await field.click();
    if (controlIds[0]) {
      const controlId = controlIds[0];
      const exactCandidates = this.page.locator(
        `[id="${controlId}_listbox"] [role="option"], `
        + `[id="${controlId}_listbox"] .k-item`,
      );
      const optionDeadline = Date.now() + 10_000;
      let requestedDataRefresh = false;
      let visibleOptionFound = false;

      while (!visibleOptionFound && Date.now() < optionDeadline) {
        const currentCount = Math.min(await exactCandidates.count(), 100);
        for (let index = 0; index < currentCount; index += 1) {
          if (await exactCandidates.nth(index).isVisible().catch(() => false)) {
            visibleOptionFound = true;
            break;
          }
        }
        if (visibleOptionFound) break;

        const refreshArgs = JSON.stringify({
          controlId,
          shouldRead: !requestedDataRefresh,
        });
        const requestedNow = await this.page.evaluate(`(() => {
          const args = ${refreshArgs};
          const input = document.getElementById(args.controlId);
          const jq = window.jQuery || window.$;
          if (!input || !jq) return false;
          const widget = jq(input).data('kendoDropDownList')
            || jq(input).data('kendoComboBox');
          if (!widget) return false;
          if (typeof widget.open === 'function') widget.open();
          const dataSource = widget.dataSource;
          const currentItems = dataSource && typeof dataSource.view === 'function'
            ? dataSource.view()
            : [];
          if (
            args.shouldRead
            && dataSource
            && currentItems.length === 0
            && typeof dataSource.read === 'function'
          ) {
            dataSource.read();
            return true;
          }
          return false;
        })()`) as boolean;
        requestedDataRefresh = requestedDataRefresh || requestedNow;
        await this.page.waitForTimeout(300);
      }

      const availableOptions: string[] = [];
      const candidateCount = Math.min(await exactCandidates.count(), 100);
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
            controlId: controlIds[0],
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
              '[id="' + args.controlId + '_listbox"] [role="option"], '
              + '[id="' + args.controlId + '_listbox"] .k-item'
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
          return;
        }
      }

      for (let index = candidateCount - 1; index >= 0; index -= 1) {
        const candidate = exactCandidates.nth(index);
        const candidateText = normalizeText(
          await candidate.innerText().catch(() => ''),
        );
        if (
          normalizeArabicText(candidateText)
          !== normalizeArabicText(optionText)
        ) continue;

        await candidate.evaluate((element) => {
          (element as HTMLElement).click();
        });
        await this.page.waitForTimeout(300);
        const selectedText = normalizeText(
          await field.locator('.k-input').innerText().catch(() => ''),
        );
        if (
          normalizeArabicText(selectedText)
          === normalizeArabicText(optionText)
        ) return;
      }

      throw new HumanInterventionError(
        `الخيار «${optionText}» غير موجود في قائمة «${labels[0]}»`,
        'TAQADI_OPTION_MISSING',
        {
          field: labels[0],
          optionText,
          availableOptions,
          url: this.page.url(),
        },
      );
    }

    const ownedOptions = controlIds[0]
      ? this.page
        .locator(
          `[id="${controlIds[0]}_listbox"] [role="option"], `
          + `[id="${controlIds[0]}_listbox"] .k-item`,
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
      const candidateCount = Math.min(await candidates.count(), 100);
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
      if (!controlIds[0]) throw error;

      const ownedCandidates = this.page.locator(
        `[id="${controlIds[0]}_listbox"] [role="option"], `
        + `[id="${controlIds[0]}_listbox"] .k-item`,
      );
      const candidateCount = Math.min(await ownedCandidates.count(), 100);
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
  }

  private async captchaVisible() {
    const captcha = this.page.locator(
      'iframe[src*="recaptcha"], iframe[src*="captcha"], .g-recaptcha, [class*="captcha"]',
    );
    const text = await this.page
      .getByText(/لست روبوت|أنا لست روبوت|CAPTCHA|رمز التحقق/i)
      .count();
    return (await captcha.count()) > 0 || text > 0;
  }

  private async looksLoggedOut() {
    const url = this.page.url().toLowerCase();
    if (
      url.includes('signin')
      || url.includes('nas.gov.qa')
      || url.includes('/authn/')
      || url.includes('/itc/login')
    ) return true;

    const username = this.page.locator(
      'input#username, input[name="username"]',
    );
    const password = this.page.locator(
      'input#password, input[name="password"]',
    );
    const loginFormVisible = await username.isVisible().catch(() => false)
      && await password.isVisible().catch(() => false);
    const caseControls = await this.page
      .getByText(/الدعاوى|إدارة الدعاوى|قيد دعوى|لوحة التحكم/i)
      .count();
    return loginFormVisible && caseControls === 0;
  }

  async ensureAuthenticated(
    onWaitingForLogin: () => Promise<void>,
  ): Promise<void> {
    await this.page.goto(agentConfig.portalUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await this.page.waitForTimeout(2_000);

    if (!(await this.looksLoggedOut()) && !(await this.captchaVisible())) {
      await this.selectIndividualLitigantAccountIfNeeded();
      return;
    }

    await onWaitingForLogin();
    const deadline = Date.now() + agentConfig.loginTimeoutMs;
    while (Date.now() < deadline) {
      await this.page.waitForTimeout(2_000);
      if (!(await this.looksLoggedOut()) && !(await this.captchaVisible())) {
        await this.selectIndividualLitigantAccountIfNeeded();
        return;
      }
    }

    throw new HumanInterventionError(
      'انتهت مهلة تسجيل الدخول إلى تقاضي. سجّل الدخول ثم أعد المحاولة.',
      'LOGIN_REQUIRED',
      { url: this.page.url() },
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
    await this.clickAny(['التالي', 'حفظ ومتابعة'], 'التالي');
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
    await this.clickAny(['حفظ ومتابعة', 'التالي'], 'حفظ بيانات الدعوى');
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
        { validationMessages, url: this.page.url() },
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

  private async openPartyEditor(row: Locator) {
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
      throw new HumanInterventionError(
        'لم يفتح تقاضي نموذج تعديل الطرف',
        'PARTY_EDITOR_NOT_OPENED',
        {
          url: this.page.url(),
          editDiagnostics,
          rejected: rejectionText.includes('requested URL was rejected'),
          networkActivity,
        },
      );
    }
  }

  private async addPartyEditor(description: string) {
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
    const category = await this.fieldByLabel(
      ['تصنيف الطرف', 'نوع الشخص'],
      ['category'],
    );
    if (!category) {
      throw new HumanInterventionError(
        'لم يفتح تقاضي نموذج إضافة الطرف',
        'PARTY_EDITOR_NOT_OPENED',
        { url: this.page.url() },
      );
    }
  }

  private async saveOpenParty() {
    let root: Locator = this.page.locator('body');
    let dialogRoot: Locator | null = null;
    const dialogs = this.page.locator(
      '.modal.in, .modal.show, [role="dialog"]',
    );
    const dialogCount = await dialogs.count();
    for (let index = dialogCount - 1; index >= 0; index -= 1) {
      const candidate = dialogs.nth(index);
      if (await candidate.isVisible().catch(() => false)) {
        root = candidate;
        dialogRoot = candidate;
        break;
      }
    }

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
    await this.openPartyEditor(row);

    await this.fillField(
      ['الترتيب حسب الصحيفة', 'ترتيب الطرف', 'الترتيب'],
      String(payload.representative.partyOrder),
      false,
      ['priority'],
    );
    await this.fillField(
      ['رقم الجوال', 'الجوال', 'الهاتف'],
      agentConfig.representative.phone,
      false,
      ['mobileNo', 'phoneNo', 'phone', 'mobile'],
    );
    await this.fillField(
      ['البريد الإلكتروني'],
      agentConfig.representative.email,
      false,
      ['email', 'emailAddress'],
    );
    await this.fillField(
      ['العنوان'],
      agentConfig.representative.address,
      false,
      ['address'],
    );
    await this.selectField(
      ['الجنسية'],
      agentConfig.representative.nationality,
      ['nationality'],
    ).catch(() => undefined);
    await this.saveOpenParty();

    const refreshedRepresentative = await this.partyRow([representativeName]);
    const representativeCells = refreshedRepresentative?.locator(
      'td, [role="gridcell"]',
    );
    if (representativeCells && await representativeCells.count() >= 4) {
      const savedOrder = normalizeText(
        await representativeCells.nth(3).innerText().catch(() => ''),
      );
      if (savedOrder !== String(payload.representative.partyOrder)) {
        throw new HumanInterventionError(
          `حفظ تقاضي ترتيب خميس بالقيمة «${savedOrder}» بدل «${payload.representative.partyOrder}»`,
          'REPRESENTATIVE_ORDER_MISMATCH',
          {
            expectedOrder: payload.representative.partyOrder,
            savedOrder,
            priorityDiagnostics: this.lastPriorityDiagnostics,
            url: this.page.url(),
          },
        );
      }
    }
  }

  async validateCompanyParty(payload: FilingPayload) {
    const company = await this.partyRow([
      payload.plaintiff.name,
      payload.plaintiff.commercialRegistration,
    ]);
    if (!company) {
      await this.addPartyEditor('إضافة الشركة');
      await this.selectField(
        ['تصنيف الطرف', 'نوع الشخص'],
        'شركة',
        ['category'],
      );
      await this.selectField(
        ['صفة الطرف'],
        'المدعي',
        ['type'],
      );
      await this.selectField(
        ['نوع الجهات المعنوية', 'نوع الشركة'],
        'شركة ذات مسؤولية محدودة',
        ['compOrEstaType'],
      );
      await this.selectField(
        ['جنسية الشركة'],
        'قطري',
        ['companyClassification'],
      );
      await this.selectField(
        ['رقم السجل التجاري أو قيد المنشأة صادر عن'],
        'وزارة التجارة والصناعة',
        ['crIssuedBy'],
      );
      await this.fillField(
        ['رقم السجل التجاري', 'السجل التجاري'],
        payload.plaintiff.commercialRegistration,
        true,
        ['crNo', 'crNumber', 'commercialRegistrationNo', 'registrationNo'],
      );
      await this.fillField(
        ['اسم الجهة المعنوية', 'اسم الشركة', 'اسم الطرف'],
        payload.plaintiff.name,
        true,
        ['name'],
      );
      await this.fillField(
        ['يمثله', 'ممثل الشركة'],
        agentConfig.representative.name,
        false,
        ['ownerName'],
      );
      await this.fillField(
        ['اسم البنك باللغة العربية'],
        agentConfig.company.bankNameAr,
        true,
        ['bankNameArab', 'bankNameAr', 'arabicBankName'],
      );
      await this.fillField(
        ['اسم البنك باللغة الإنجليزية', 'اسم البنك باللغة الانجليزية'],
        agentConfig.company.bankNameEn,
        true,
        ['bankName', 'bankNameEn', 'englishBankName'],
      );
      await this.fillField(
        ['رقم IBAN', 'IBAN'],
        agentConfig.company.iban,
        true,
        ['iban', 'ibanNo', 'ibanNumber'],
      );
      await this.fillField(
        ['رقم السويفت', 'SWIFT'],
        agentConfig.company.swift,
        true,
        ['swiftNumber', 'swift', 'swiftCode'],
      );
      await this.fillField(
        ['عنوان البنك'],
        agentConfig.company.bankAddress,
        true,
        ['bankAddress'],
      );
      await this.selectField(
        ['بلد البنك'],
        agentConfig.company.bankCountry,
      );
      await this.selectField(
        ['الدولة'],
        agentConfig.company.bankCountry,
      );
      await this.fillField(
        ['العنوان'],
        agentConfig.company.address,
        true,
        ['addresses0.address'],
      );
      await this.fillField(
        ['البريد الإلكتروني', 'البريد الالكتروني'],
        agentConfig.company.email,
        true,
        ['email', 'emailAddress'],
      );
      const translationNo = this.page.locator('#tempTransalationReq2');
      if (await translationNo.isVisible().catch(() => false)) {
        await translationNo.check();
      }
    } else {
      await this.openPartyEditor(company);
    }

    await this.fillField(
      ['الترتيب حسب الصحيفة', 'ترتيب الطرف', 'الترتيب'],
      String(payload.plaintiff.partyOrder),
      true,
      ['priority'],
    );
    await this.saveOpenParty();
  }

  async addDefendant(payload: FilingPayload) {
    const existing = await this.partyRow([
      payload.defendant.fullName,
      payload.defendant.idNumber,
    ]);
    if (existing) {
      await this.openPartyEditor(existing);
    } else {
      await this.addPartyEditor('إضافة المدعى عليه');
      await this.selectField(
        ['تصنيف الطرف', 'نوع الشخص'],
        'شخص طبيعي',
        ['category'],
      );
      await this.selectField(
        ['صفة الطرف'],
        'المدعى عليه',
        ['type'],
      );
    }

    await this.fillField(
      ['الاسم الأول'],
      payload.defendant.firstName || payload.defendant.fullName,
      true,
      ['firstName'],
    );
    await this.fillField(
      ['الاسم الأوسط'],
      payload.defendant.middleName,
      false,
      ['middleName', 'secondName', 'fatherName'],
    );
    await this.fillField(
      ['اسم العائلة', 'الاسم الأخير'],
      payload.defendant.lastName,
      false,
      ['lastName', 'familyName'],
    );
    if (payload.defendant.idType) {
      await this.selectField(
        ['نوع الهوية', 'نوع الوثيقة'],
        payload.defendant.idType,
        ['idType', 'identityType', 'documentType'],
      );
    }
    await this.fillField(
      ['رقم الهوية', 'رقم البطاقة', 'الرقم الشخصي'],
      payload.defendant.idNumber,
      true,
      ['idNumber', 'identityNumber', 'documentNumber', 'qid'],
    );
    await this.selectField(
      ['الجنسية'],
      payload.defendant.nationality || '',
      ['nationality'],
    );
    await this.fillField(
      ['رقم الجوال', 'الجوال', 'الهاتف'],
      payload.defendant.phone,
      false,
      ['mobileNo', 'phoneNo', 'phone', 'mobile'],
    );
    await this.fillField(
      ['البريد الإلكتروني'],
      payload.defendant.email,
      false,
      ['email', 'emailAddress'],
    );
    await this.fillField(
      ['العنوان'],
      payload.defendant.address,
      false,
      ['address'],
    );
    await this.fillField(
      ['الترتيب حسب الصحيفة', 'ترتيب الطرف', 'الترتيب'],
      '3',
      true,
      ['priority'],
    );
    await this.saveOpenParty();
    await this.clickAny(['التالي', 'حفظ ومتابعة'], 'متابعة بعد الأطراف');
    await this.page.waitForTimeout(1_000);
  }

  private async uploadDocument(
    document: MaterializedDocument,
    index: number,
  ) {
    const labels = documentLabels[document.key] || [document.name];
    let input: Locator | null = null;

    for (const label of labels) {
      const container = this.page
        .locator('tr, section, article, .row, .form-group, .document-row')
        .filter({ hasText: label })
        .filter({ has: this.page.locator('input[type="file"]') });
      if ((await container.count()) > 0) {
        input = container.first().locator('input[type="file"]').first();
        break;
      }
    }

    if (!input) {
      const inputs = this.page.locator('input[type="file"]');
      if ((await inputs.count()) > index) input = inputs.nth(index);
    }
    if (!input) {
      throw new HumanInterventionError(
        `لم يجد الوكيل خانة رفع «${document.name}»`,
        'DOCUMENT_SLOT_NOT_FOUND',
        { documentKey: document.key, documentName: document.name },
      );
    }

    await input.setInputFiles(document.filePath);
    await this.page.waitForTimeout(1_000);
  }

  async uploadDocuments(documents: MaterializedDocument[]) {
    for (let index = 0; index < documents.length; index += 1) {
      await this.uploadDocument(documents[index], index);
    }
    await this.clickAny(['حفظ ومتابعة', 'التالي'], 'متابعة بعد المستندات');
    await this.page.waitForTimeout(1_500);
  }

  async verifyReview(payload: FilingPayload) {
    const bodyText = normalizeText(
      await this.page.locator('body').innerText(),
    );
    const requiredValues = [
      payload.case.title,
      payload.defendant.fullName,
    ];
    const missing = requiredValues.filter(
      (value) => !bodyText.includes(normalizeText(value)),
    );
    if (missing.length > 0) {
      throw new HumanInterventionError(
        'بيانات شاشة المراجعة لا تطابق حزمة الدعوى',
        'REVIEW_MISMATCH',
        { missing, url: this.page.url() },
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
      const confirm = await this.firstVisible([
        this.page.getByRole('button', { name: /نعم|تأكيد|اعتماد/i }),
        this.page.getByText(/تأكيد الاعتماد|نعم، اعتماد/i),
      ]);
      if (confirm) await confirm.click();

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
