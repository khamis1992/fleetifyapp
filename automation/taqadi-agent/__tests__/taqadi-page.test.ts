import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  chromium,
  type Browser,
  type Locator,
  type Page,
} from 'playwright';
import { agentConfig } from '../config';
import {
  identityTypeForPartyOptions,
  nationalityForTaqadi,
  TaqadiPortal,
} from '../taqadi-page';
import type { FilingPayload } from '../types';

describe('TaqadiPortal classification fields', () => {
  let browser: Browser;
  let page: Page;
  let uploadFixturePath: string;
  let wordUploadFixturePath: string;

  it('normalizes nationality country names without confusing South Sudan', () => {
    expect(nationalityForTaqadi('السودان')).toBe('سودان');
    expect(nationalityForTaqadi('سوداني')).toBe('سودان');
    expect(nationalityForTaqadi('جنوب السودان')).toBe('جنوب السودان');
    expect(nationalityForTaqadi('قطري')).toBe('قطر');
    expect(nationalityForTaqadi('Kuwait')).toBe('الكويت');
    expect(nationalityForTaqadi('kuwaiti')).toBe('الكويت');
    expect(nationalityForTaqadi('Nigerian')).toBe('نيجيريا');
    expect(nationalityForTaqadi('بنغالي')).toBe('بنغلاديش');
  });

  it('resolves identity types from each party own available options', () => {
    expect(identityTypeForPartyOptions(
      'representative',
      'رخصة مقيم',
      'قطر',
      '29263400736',
      ['اختيار واحد', 'بطاقة شخصية'],
    )).toBe('بطاقة شخصية');
    expect(identityTypeForPartyOptions(
      'defendant',
      'جواز سفر',
      'سوداني',
      '12345678901',
      ['اختيار واحد', 'رخصة مقيم'],
    )).toBe('رخصة مقيم');
    expect(identityTypeForPartyOptions(
      'defendant',
      'رخصة مقيم',
      'قطر',
      '28801200831',
      ['اختيار واحد', 'بطاقة شخصية قطرية'],
    )).toBe('بطاقة شخصية قطرية');
    expect(identityTypeForPartyOptions(
      'representative',
      'رخصة مقيم',
      'قطر',
      '29263400736',
      ['اختيار واحد', 'رخصة مقيم'],
    )).toBeNull();
  });

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    uploadFixturePath = path.join(
      os.tmpdir(),
      `fleetify-taqadi-upload-${process.pid}.pdf`,
    );
    await fs.writeFile(
      uploadFixturePath,
      Buffer.from('%PDF-1.4\n% Fleetify upload fixture\n'),
    );
    wordUploadFixturePath = path.join(
      os.tmpdir(),
      `fleetify-taqadi-upload-${process.pid}.docx`,
    );
    await fs.writeFile(
      wordUploadFixturePath,
      Buffer.from('PK Word fixture'),
    );
  });

  afterAll(async () => {
    await browser.close();
    await fs.unlink(uploadFixturePath).catch(() => undefined);
    await fs.unlink(wordUploadFixturePath).catch(() => undefined);
  });

  it('reports an expired session during a guarded portal wait', async () => {
    await page.setContent(`
      <main>
        <form>
          <input id="username" name="username" />
          <input id="password" name="password" type="password" />
          <button type="submit">تسجيل الدخول</button>
        </form>
      </main>
    `);

    const portal = new TaqadiPortal(page) as unknown as {
      throwIfSessionExpired: (context: string) => Promise<void>;
    };

    await expect(
      portal.throwIfSessionExpired('انتظار جدول أطراف الدعوى'),
    ).rejects.toMatchObject({
      code: 'LOGIN_REQUIRED',
      details: {
        interruptedContext: 'انتظار جدول أطراف الدعوى',
        resumeSupported: true,
      },
    });
  });

  it('finds selects next to unbound Bootstrap labels', async () => {
    await page.setContent(`
      <main>
        <div class="form-row">
          <label>درجة التقاضي *</label>
          <div><select data-field="degree"><option>ابتدائي</option></select></div>
        </div>
        <div class="form-row">
          <label>النوع *</label>
          <div><select data-field="type"><option>عقود الخدمات التجارية</option></select></div>
        </div>
        <div class="form-row">
          <label>النوع الفرعي *</label>
          <div><select data-field="subtype"><option>عقود إيجار السيارات وخدمات الليموزين</option></select></div>
        </div>
        <div class="form-row">
          <label>التصنيف *</label>
          <div><select data-field="applicability"><option>لا ينطبق</option></select></div>
        </div>
        <button type="button">التالي</button>
        <textarea id="facts"></textarea>
      </main>
    `);

    const portal = new TaqadiPortal(page);
    await portal.configureCase({
      classification: {
        litigationDegree: 'ابتدائي',
        caseType: 'عقود الخدمات التجارية',
        caseSubtype: 'عقود إيجار السيارات وخدمات الليموزين',
        applicability: 'لا ينطبق',
      },
    } as FilingPayload);

    expect(await page.locator('[data-field="degree"]').inputValue()).toBe(
      'ابتدائي',
    );
    expect(await page.locator('[data-field="type"]').inputValue()).toBe(
      'عقود الخدمات التجارية',
    );
    expect(await page.locator('[data-field="subtype"]').inputValue()).toBe(
      'عقود إيجار السيارات وخدمات الليموزين',
    );
    expect(
      await page.locator('[data-field="applicability"]').inputValue(),
    ).toBe(
      'لا ينطبق',
    );
  });

  it('selects cascading Kendo dropdowns by stable control ids', async () => {
    const fields = [
      ['court', 'ابتدائي'],
      ['category', 'عقود الخدمات التجارية'],
      ['type', 'عقود إيجار السيارات وخدمات الليموزين'],
      ['nature', 'لا ينطبق'],
    ];
    await page.setContent(`
      <main>
        ${fields.map(([id, option]) => `
          <span
            class="k-widget k-dropdown"
            role="listbox"
            aria-haspopup="listbox"
            aria-owns="tempctype_${id}_listbox"
            aria-disabled="false"
          >
            <span class="k-input">اختيار واحد</span>
            <input id="tempctype_${id}" style="display:none">
          </span>
          <ul id="tempctype_${id}_listbox" class="k-list">
            <li class="k-item" role="option">${option}</li>
          </ul>
        `).join('')}
        <button type="button">التالي</button>
        <textarea id="facts"></textarea>
      </main>
    `);

    const portal = new TaqadiPortal(page);
    await portal.configureCase({
      classification: {
        litigationDegree: 'ابتدائي',
        caseType: 'عقود الخدمات التجارية',
        caseSubtype: 'عقود إيجار السيارات وخدمات الليموزين',
        applicability: 'لا ينطبق',
      },
    } as FilingPayload);

    expect(await page.getByRole('option').count()).toBe(4);
  });

  it('waits for delayed remote Kendo options before selecting', async () => {
    const controlId = 'tempCostOrders0.type';
    const label = '\u0646\u0648\u0639 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629';
    const option = '\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629';
    await page.setContent(`
      <span
        class="k-widget k-dropdown"
        role="listbox"
        aria-haspopup="listbox"
        aria-owns="${controlId}_listbox"
        aria-disabled="false"
        onclick="setTimeout(() => {
          const item = document.createElement('li');
          item.className = 'k-item';
          item.setAttribute('role', 'option');
          item.textContent = '${option}';
          item.onclick = () => {
            document.body.dataset.selected = item.textContent;
          };
          document.getElementById('${controlId}_listbox').appendChild(item);
        }, 700)"
      >
        <span class="k-input">\u0627\u062e\u062a\u064a\u0627\u0631 \u0648\u0627\u062d\u062f</span>
        <input id="${controlId}" style="display:none">
      </span>
      <ul id="${controlId}_listbox" class="k-list"></ul>
    `);

    const portal = new TaqadiPortal(page) as unknown as {
      selectField: (
        labels: string[],
        optionText: string,
        controlIds: string[],
      ) => Promise<void>;
    };
    await portal.selectField([label], option, [controlId]);

    expect(await page.locator('body').getAttribute('data-selected')).toBe(
      option,
    );
  });

  it('uses the active Kendo widget when stale dialogs duplicate control ids', async () => {
    const label = 'صفة الطرف';
    const option = 'المدعى عليه';
    await page.setContent(`
      <div id="stale-dialog" style="display:none">
        <span
          class="k-widget k-dropdown"
          role="listbox"
          aria-owns="type_listbox"
          aria-disabled="false"
        >
          <span id="stale-display" class="k-input">اختيار واحد</span>
          <select id="type" style="display:none"></select>
        </span>
        <ul id="type_listbox">
          <li class="k-item" role="option">${option}</li>
        </ul>
      </div>

      <div id="active-dialog">
        <label for="type">${label}</label>
        <span
          class="k-widget k-dropdown"
          role="listbox"
          aria-owns="type_listbox"
          aria-disabled="false"
        >
          <span id="active-display" class="k-input">اختيار واحد</span>
          <select id="type" style="display:none"></select>
        </span>
        <ul id="type_listbox"></ul>
      </div>

      <script>
        const roleItem = {
          id: 'defendant',
          displayName: ${JSON.stringify(option)},
        };
        const staleInput = document.querySelector(
          '#stale-dialog [id="type"]',
        );
        const activeInput = document.querySelector(
          '#active-dialog [id="type"]',
        );
        const activeItems = [];
        const staleWidget = {
          options: {
            dataTextField: 'displayName',
            dataValueField: 'id',
          },
          dataSource: {
            data: () => [roleItem],
            view: () => [roleItem],
          },
          value: () => {
            document.querySelector('#stale-display').textContent =
              roleItem.displayName;
          },
          text: () =>
            document.querySelector('#stale-display').textContent,
          trigger: () => undefined,
          open: () => undefined,
        };
        const activeWidget = {
          options: {
            dataTextField: 'displayName',
            dataValueField: 'id',
          },
          dataSource: {
            data: () => activeItems,
            view: () => activeItems,
            read: () => new Promise((resolve) => {
              setTimeout(() => {
                activeItems.push(roleItem);
                resolve();
              }, 100);
            }),
          },
          value: (value) => {
            if (value === roleItem.id) {
              document.querySelector('#active-display').textContent =
                roleItem.displayName;
            }
          },
          text: () =>
            document.querySelector('#active-display').textContent,
          trigger: (name) => {
            if (name === 'change') {
              document.body.dataset.activeChanged = 'true';
            }
          },
          open: () => undefined,
        };

        window.$ = window.jQuery = (input) => ({
          data: (name) => {
            if (name !== 'kendoDropDownList') return undefined;
            return input === activeInput ? activeWidget : staleWidget;
          },
        });
      </script>
    `);

    const portal = new TaqadiPortal(page) as unknown as {
      selectField: (
        labels: string[],
        optionText: string,
        controlIds: string[],
        root: Locator,
      ) => Promise<void>;
    };
    const activeDialog = page.locator('#active-dialog');

    await portal.selectField([label], option, ['type'], activeDialog);

    expect(await page.locator('#active-display').innerText()).toBe(option);
    expect(await page.locator('#stale-display').innerText()).toBe(
      'اختيار واحد',
    );
    expect(
      await page.locator('body').getAttribute('data-active-changed'),
    ).toBe('true');
  });

  it('selects bank nationality and company country from their own Kendo lists', async () => {
    const bankCountryLabel = '\u0628\u0644\u062f \u0627\u0644\u0628\u0646\u0643';
    const companyCountryLabel = '\u0627\u0644\u062f\u0648\u0644\u0629';
    const bankCountryOption = '\u0642\u0637\u0631\u064a';
    const companyCountryOption = '\u0642\u0637\u0631';
    const placeholder = '\u0627\u062e\u062a\u064a\u0627\u0631 \u0648\u0627\u062d\u062f';
    await page.setContent(`
      <div id="party-editor">
        <label for="bankCountry">${bankCountryLabel}</label>
        <span
          class="k-widget k-dropdown"
          role="listbox"
          aria-owns="bankCountry_listbox"
          aria-disabled="false"
          onclick="document.querySelector('#bankCountry_listbox').style.display='block'"
        >
          <span id="bank-country-display" class="k-input">${placeholder}</span>
          <select id="bankCountry" style="display:none"></select>
        </span>
        <ul id="bankCountry_listbox" style="display:none">
          ${Array.from({ length: 105 }, (_, index) => `
            <li class="k-item" role="option">option-${index}</li>
          `).join('')}
        </ul>

        <label for="country">${companyCountryLabel}</label>
        <span
          class="k-widget k-dropdown"
          role="listbox"
          aria-owns="country_listbox"
          aria-disabled="false"
          onclick="document.querySelector('#country_listbox').style.display='block'"
        >
          <span id="company-country-display" class="k-input">${placeholder}</span>
          <select id="country" style="display:none"></select>
        </span>
        <ul id="country_listbox" style="display:none">
          <li
            class="k-item"
            role="option"
            onclick="document.querySelector('#company-country-display').textContent=this.textContent"
          >${companyCountryOption}</li>
        </ul>
        <script>
          const bankCountryItem = {
            id: '1688',
            displayName: ${JSON.stringify(bankCountryOption)},
          };
          const bankCountryWidget = {
            options: {
              dataTextField: 'displayName',
              dataValueField: 'id',
            },
            dataSource: {
              data: () => [bankCountryItem],
            },
            value: (value) => {
              if (value === bankCountryItem.id) {
                document.querySelector('#bank-country-display').textContent =
                  bankCountryItem.displayName;
              }
            },
            text: () =>
              document.querySelector('#bank-country-display').textContent,
            trigger: () => undefined,
          };
          window.$ = window.jQuery = (input) => ({
            data: (name) =>
              input.id === 'bankCountry'
              && name === 'kendoDropDownList'
                ? bankCountryWidget
                : undefined,
          });
        </script>
      </div>
    `);
    const portal = new TaqadiPortal(page) as unknown as {
      selectField: (
        labels: string[],
        optionText: string,
        controlIds: string[],
        root: Locator,
      ) => Promise<void>;
    };
    const dialog = page.locator('#party-editor');

    await portal.selectField(
      [bankCountryLabel],
      bankCountryOption,
      [],
      dialog,
    );
    await portal.selectField(
      [companyCountryLabel],
      companyCountryOption,
      [],
      dialog,
    );

    expect(
      await page.locator('#bank-country-display').innerText(),
    ).toBe(bankCountryOption);
    expect(
      await page.locator('#company-country-display').innerText(),
    ).toBe(companyCountryOption);
  });

  it('opens the representative editor from the party row and saves it', async () => {
    await page.setContent(`
      <div class="tab-pane active" data-tabpane-name="case_party_grid">
        <button title="إضافة طرف">إضافة طرف</button>
        <table>
          <tr role="row">
            <td
              onclick="this.closest('tr').dataset.selected='true'"
            >${agentConfig.representative.name}</td>
            <td>شخص طبيعي</td>
            <td>المدعي</td>
            <td data-party-order>1</td>
            <td>
              <button
                type="button"
                class="k-grid-modify"
                onclick="document.querySelector('#party-editor').style.display='block'; document.querySelector('#party-editor').classList.add('in')"
              >تحديث</button>
            </td>
          </tr>
        </table>
      </div>
      <div
        id="party-editor"
        class="modal"
        style="display:none"
        role="dialog"
        aria-hidden="true"
      >
        <label for="category">تصنيف الطرف</label>
        <select id="category">
          <option>شخص طبيعي</option>
        </select>
        <label for="type">صفة الطرف</label>
        <select id="type">
          <option>وكيل طبيعي</option>
          <option>المدعي</option>
        </select>
        <label for="priority">الترتيب حسب صحيفة الدعوى</label>
        <span class="k-widget k-numerictextbox">
          <input
            class="k-formatted-value k-input"
            value="1"
            oninput="document.querySelector('#party-editor #priority').value=this.value"
          >
          <input id="priority" type="hidden" value="1">
        </span>
        <label for="mobileNo">رقم الجوال</label>
        <input id="mobileNo">
        <label for="email">البريد الإلكتروني</label>
        <input id="email">
        <label for="address">العنوان</label>
        <input id="address">
        <label for="nationality">الجنسية</label>
        <select id="nationality">
          <option>قطر</option>
          <option>تونس</option>
        </select>
        <label for="proofOfIdentity">نوع البطاقة</label>
        <select
          id="proofOfIdentity"
          onchange="document.querySelector('#representative-identity').innerHTML='<label for=&quot;identityNo&quot;>رقم الهوية</label><input id=&quot;identityNo&quot;>'; document.querySelector('#party-editor #priority').value='1'; document.querySelector('#party-editor .k-formatted-value').value='1'"
        >
          <option value="">اختيار واحد</option>
          <option>بطاقة شخصية</option>
        </select>
        <div id="representative-identity"></div>
        <label for="firstName">الاسم الأول</label>
        <input id="firstName" value="خميس">
        <label for="lastName">اسم العائلة</label>
        <input id="lastName" value="الجبر">
        <button
          type="button"
          onclick="this.dataset.saved='true'; document.querySelector('[data-party-order]').textContent=document.querySelector('#party-editor .k-formatted-value').value; this.closest('.modal').style.display='none'"
        >حفظ</button>
      </div>
    `);

    const portal = new TaqadiPortal(page);
    await portal.validateRepresentativeFirst();

    expect(
      await page.locator('#party-editor .k-formatted-value').inputValue(),
    ).toBe('1');
    expect(await page.locator('#party-editor #type').inputValue()).toBe(
      'المدعي',
    );
    expect(
      await page.locator('tr[role="row"]').getAttribute('data-selected'),
    ).toBe('true');
    const expectedPhone = agentConfig.representative.phone.startsWith('974')
      ? agentConfig.representative.phone
      : `974${agentConfig.representative.phone}`;
    expect(await page.locator('#mobileNo').inputValue()).toBe(expectedPhone);
    expect(await page.locator('#email').inputValue()).toBe(
      agentConfig.representative.email,
    );
    expect(await page.locator('#nationality').inputValue()).toBe('قطر');
    expect(await page.locator('#proofOfIdentity').inputValue()).toBe(
      'بطاقة شخصية',
    );
    expect(await page.locator('#identityNo').inputValue()).toBe(
      agentConfig.representative.identityNumber,
    );
    expect(
      await page.locator('#party-editor button', { hasText: 'حفظ' })
        .getAttribute('data-saved'),
    ).toBe('true');
  }, 15_000);

  it('fills the visible Kendo numeric input when stale controls share an id', async () => {
    await page.setContent(`
      <div id="stale-party" style="display:none">
        <label for="mobileNo">رقم الجوال</label>
        <span class="k-widget k-numerictextbox">
          <input class="k-formatted-value k-input" value="11111111">
          <input id="mobileNo" type="hidden" value="11111111">
        </span>
      </div>
      <div id="active-party">
        <label for="mobileNo">رقم الجوال</label>
        <span class="k-widget k-numerictextbox">
          <input class="k-formatted-value k-input" value="">
          <input id="mobileNo" type="hidden" value="">
        </span>
      </div>
    `);
    await page.evaluate(`(() => {
      window.jQuery = (element) => ({
        data: (name) => name === 'kendoNumericTextBox'
          ? {
              value: (value) => {
                element.value = String(value);
                const formatted = element.closest('.k-widget')
                  ?.querySelector('input.k-formatted-value');
                if (formatted) formatted.value = String(value);
              },
              trigger: () => undefined,
            }
          : null,
      });
      window.$ = window.jQuery;
    })()`);

    const portal = new TaqadiPortal(page) as unknown as {
      fillField: (
        labels: string[],
        value: string,
        required: boolean,
        controlIds: string[],
        root: Locator,
      ) => Promise<void>;
    };
    await portal.fillField(
      ['رقم الجوال'],
      '71953163',
      true,
      ['mobileNo'],
      page.locator('#active-party'),
    );

    expect(
      await page
        .locator('#active-party input.k-formatted-value')
        .inputValue(),
    ).toBe('71953163');
    expect(
      await page
        .locator('#stale-party input.k-formatted-value')
        .inputValue(),
    ).toBe('11111111');
    await page.evaluate(`(() => {
      delete window.jQuery;
      delete window.$;
    })()`);
  });

  it('replaces an existing Kendo party order instead of appending to it', async () => {
    await page.setContent(`
      <div id="active-party">
        <label for="priority">الترتيب حسب الصحيفة</label>
        <span class="k-widget k-numerictextbox">
          <input class="k-formatted-value k-input" value="31">
          <input id="priority" type="hidden" value="31">
        </span>
      </div>
    `);
    await page.evaluate(`(() => {
      window.jQuery = (element) => ({
        data: (name) => name === 'kendoNumericTextBox'
          ? {
              value: (value) => {
                element.value = String(value);
                const formatted = element.closest('.k-widget')
                  ?.querySelector('input.k-formatted-value');
                if (formatted) formatted.value = String(value);
              },
              trigger: () => undefined,
            }
          : null,
      });
      window.$ = window.jQuery;
    })()`);

    const portal = new TaqadiPortal(page) as unknown as {
      fillField: (
        labels: string[],
        value: string,
        required: boolean,
        controlIds: string[],
        root: Locator,
      ) => Promise<void>;
    };
    await portal.fillField(
      ['الترتيب حسب الصحيفة'],
      '3',
      true,
      ['priority'],
      page.locator('#active-party'),
    );

    expect(
      await page.locator('#active-party .k-formatted-value').inputValue(),
    ).toBe('3');
    expect(
      await page.locator('#active-party #priority').inputValue(),
    ).toBe('3');
    await page.evaluate(`(() => {
      delete window.jQuery;
      delete window.$;
    })()`);
  });

  it('waits for the commercial-register field created by Taqadi refresh', async () => {
    await page.setContent(`
      <script>
        window.crIssuerCommits = 0;
        window.renderCommercialRegister = (select) => {
          window.crIssuerCommits += 1;
          if (window.crIssuerCommits === 1) {
            setTimeout(() => {
              select.value = '';
            }, 20);
            return;
          }
          document.querySelector('#commercial-register-slot').innerHTML =
            '<label for="officialRegistrationNumber">'
            + 'رقم السجل التجاري *</label>'
            + '<input id="officialRegistrationNumber">';
        };
      </script>
      <div class="tab-pane active" data-tabpane-name="case_party_grid">
        <button
          type="button"
          title="button_add_party_1"
          onclick="document.querySelector('#party-editor').classList.add('in')"
        >button_add_party_1</button>
        <table></table>
      </div>
      <div id="party-editor" class="modal" style="display:block">
        <label for="category">تصنيف الطرف</label>
        <select id="category"><option>شركة</option></select>
        <label for="type">صفة الطرف</label>
        <select id="type"><option>المدعي</option></select>
        <label for="compOrEstaType">نوع الجهات المعنوية</label>
        <select
          id="compOrEstaType"
          onchange="
            window.companyTypeChanges = (window.companyTypeChanges || 0) + 1;
            if (window.companyTypeChanges === 1) this.value = '';
          "
        >
          <option value="">اختيار واحد</option>
          <option>شركة ذات مسؤولية محدودة</option>
        </select>
        <label for="companyClassification">جنسية الشركة</label>
        <select
          id="companyClassification"
          onchange="
            window.companyNationalityChanges = (window.companyNationalityChanges || 0) + 1;
            if (window.companyNationalityChanges === 1) this.value = '';
          "
        >
          <option value="">اختيار واحد</option>
          <option>قطري</option>
        </select>
        <label for="crIssuedBy">رقم السجل التجاري أو قيد المنشأة صادر عن</label>
        <select
          id="crIssuedBy"
          onchange="setTimeout(() => window.renderCommercialRegister(this), 100)"
        >
          <option value="">اختيار واحد</option>
          <option>وزارة التجارة والصناعة</option>
        </select>
        <div id="commercial-register-slot"></div>
        <label for="name">اسم الجهة المعنوية</label>
        <input id="name">
        <label for="ownerName">يمثله</label>
        <input id="ownerName">
        <label for="bankNameAr">اسم البنك باللغة العربية</label>
        <input id="bankNameAr">
        <label for="bankNameEn">اسم البنك باللغة الإنجليزية</label>
        <input id="bankNameEn">
        <label for="iban">رقم IBAN</label>
        <input id="iban">
        <label for="swift">رقم السويفت</label>
        <input id="swift">
        <label for="bankAddress">عنوان البنك</label>
        <input id="bankAddress">
        <label for="bankCountry">بلد البنك</label>
        <select id="bankCountry"><option>${agentConfig.company.bankCountry}</option></select>
        <label for="country">الدولة</label>
        <select id="country"><option>${agentConfig.company.country}</option></select>
        <label for="addresses0.address">العنوان</label>
        <input id="addresses0.address">
        <label for="mobileNo">رقم الهاتف المحمول</label>
        <input id="mobileNo">
        <label for="email">البريد الإلكتروني</label>
        <input id="email">
        <label for="priority">الترتيب حسب صحيفة الدعوى</label>
        <input id="priority">
        <input id="tempTransalationReq2" type="radio">
        <button
          type="button"
          onclick="this.dataset.saved='true'; document.querySelector('.tab-pane table').innerHTML='<tr role=&quot;row&quot;><td>'+document.querySelector('#name').value+'</td><td>شركة</td><td>المدعي</td><td>'+document.querySelector('#priority').value+'</td></tr>'; this.closest('.modal').style.display='none'"
        >حفظ</button>
      </div>
    `);

    const portal = new TaqadiPortal(page);
    await portal.validateCompanyParty({
      plaintiff: {
        name: 'شركة العراف لتأجير السيارات',
        commercialRegistration: '146832',
        partyOrder: 1,
      },
    } as FilingPayload);

    expect(await page.locator('#category').inputValue()).toBe('شركة');
    expect(await page.locator('#type').inputValue()).toBe('المدعي');
    expect(await page.locator('#companyClassification').inputValue()).toBe(
      'قطري',
    );
    expect(await page.evaluate(() => (
      window as Window & { companyNationalityChanges: number }
    ).companyNationalityChanges)).toBeGreaterThanOrEqual(2);
    expect(await page.locator('#compOrEstaType').inputValue()).toBe(
      'شركة ذات مسؤولية محدودة',
    );
    expect(await page.evaluate(() => (
      window as Window & { companyTypeChanges: number }
    ).companyTypeChanges)).toBeGreaterThanOrEqual(2);
    expect(
      await page.locator('#officialRegistrationNumber').inputValue(),
    ).toBe('146832');
    expect(await page.evaluate(() => (
      window as Window & { crIssuerCommits: number }
    ).crIssuerCommits)).toBe(2);
    expect(await page.locator('#name').inputValue()).toBe(
      'شركة العراف لتأجير السيارات',
    );
    expect(await page.locator('#ownerName').inputValue()).toBe(
      agentConfig.representative.name,
    );
    expect(await page.locator('#iban').inputValue()).toBe(
      agentConfig.company.iban,
    );
    expect(await page.locator('#swift').inputValue()).toBe(
      agentConfig.company.swift,
    );
    expect(await page.locator('#email').inputValue()).toBe(
      agentConfig.company.email,
    );
    expect(await page.locator('#mobileNo').inputValue()).toBe(
      `974${agentConfig.company.phone}`,
    );
    expect(await page.locator('[id="addresses0.address"]').inputValue()).toBe(
      agentConfig.company.address,
    );
    expect(await page.locator('#priority').inputValue()).toBe('2');
    expect(await page.locator('#tempTransalationReq2').isChecked()).toBe(true);
  }, 15_000);

  it('confirms the account prompt with Enter without selecting a role', async () => {
    await page.route('**/*', async (route) => {
      await route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `
          <script>history.replaceState({}, '', '/itc/home')</script>
          <script>
            document.addEventListener('keydown', (event) => {
              if (event.key !== 'Enter') return;
              document.body.dataset.enterPressed = 'true';
              document.querySelector('.modal').style.display = 'none';
              document.querySelector('#main').style.display = 'block';
            });
          </script>
          <div class="modal">
            <p>لديك أكثر من نوع حساب في النظام، الرجاء اختيار المستخدم</p>
            <span
              id="account-field"
              class="k-dropdown"
              aria-haspopup="listbox"
              onclick="this.dataset.opened='true'; document.querySelector('#account-options').style.display='block'"
            >
              <span class="k-input">اختيار واحد</span>
            </span>
            <ul id="account-options" class="k-list" style="display:none">
              <li
                class="k-item"
                role="option"
                onclick="this.closest('.modal').dataset.account='individual'"
              >متقاضي فرد</li>
            </ul>
            <button
              type="button"
              onclick="document.body.dataset.loginClicked='true'"
            >تسجيل الدخول</button>
          </div>
          <nav id="main" style="display:none">ادارة الدعاوى</nav>
        `,
      });
    });

    const portal = new TaqadiPortal(page);
    await portal.ensureAuthenticated(async () => undefined);

    expect(await page.locator('.modal').isVisible()).toBe(false);
    expect(await page.locator('#main').isVisible()).toBe(true);
    expect(await page.locator('body').getAttribute('data-enter-pressed')).toBe(
      'true',
    );
    expect(await page.locator('body').getAttribute('data-login-clicked')).toBe(
      null,
    );
    expect(
      await page.locator('#account-field').getAttribute('data-opened'),
    ).toBe(null);
    expect(await page.locator('.modal').getAttribute('data-account')).toBe(
      null,
    );
    await page.unroute('**/*');
  }, 10_000);

  it('starts login through the Tawtheeq card instead of the password form', async () => {
    let waitingForLogin = false;
    await page.goto('about:blank');
    await page.route('**/*', async (route) => {
      await route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `
          <form id="password-login">
            <input id="username" name="username">
            <input id="password" name="password" type="password">
            <button
              type="button"
              onclick="document.body.dataset.passwordLogin='true'"
            >تسجيل الدخول</button>
          </form>
          <section id="tawtheeq-card">
            <strong>توثيق TAWTHEEQ</strong>
            <p>الدخول عبر النظام الوطني</p>
            <button
              type="button"
              onclick="document.body.dataset.tawtheeqLogin='true'; document.querySelector('#password-login').remove(); history.replaceState({}, '', '/itc/home'); document.querySelector('#main').style.display='block'"
            >متابعة</button>
          </section>
          <main id="main" style="display:none">إدارة الدعاوى</main>
        `,
      });
    });

    const portal = new TaqadiPortal(page);
    await portal.ensureAuthenticated(async () => {
      waitingForLogin = true;
    });

    expect(waitingForLogin).toBe(true);
    expect(
      await page.locator('body').getAttribute('data-tawtheeq-login'),
    ).toBe('true');
    expect(
      await page.locator('body').getAttribute('data-password-login'),
    ).toBeNull();
    await page.unroute('**/*');
  }, 10_000);

  it('does not treat an intermediate NAS prompt as an authenticated session', async () => {
    const originalLoginTimeout = agentConfig.loginTimeoutMs;
    agentConfig.loginTimeoutMs = 600;

    try {
      await page.goto('about:blank');
      await page.route('**/*', async (route) => {
        await route.fulfill({
          contentType: 'text/html; charset=utf-8',
          body: `
            <section id="tawtheeq-card">
              <strong>&#1578;&#1608;&#1579;&#1610;&#1602; TAWTHEEQ</strong>
              <p>&#1575;&#1604;&#1583;&#1582;&#1608;&#1604; &#1593;&#1576;&#1585; &#1575;&#1604;&#1606;&#1592;&#1575;&#1605; &#1575;&#1604;&#1608;&#1591;&#1606;&#1610;</p>
              <button
                type="button"
                onclick="
                  history.replaceState({}, '', '/itc/nas/user/prompt');
                  document.body.innerHTML = '<main id=nas-prompt>NAS account prompt</main>';
                "
              >&#1605;&#1578;&#1575;&#1576;&#1593;&#1577;</button>
            </section>
          `,
        });
      });

      const portal = new TaqadiPortal(page);
      await expect(
        portal.ensureAuthenticated(async () => undefined),
      ).rejects.toMatchObject({ code: 'LOGIN_REQUIRED' });
      expect(page.url()).toContain('/itc/nas/user/prompt');
    } finally {
      agentConfig.loginTimeoutMs = originalLoginTimeout;
      await page.unroute('**/*');
    }
  }, 10_000);

  it('accepts a redirect to NAS while waiting for the Tawtheeq card', async () => {
    await page.route('https://taqadi.sjc.gov.qa/itc/login', async (route) => {
      await route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: '<main>Redirecting to national authentication...</main>',
      });
    });
    await page.route(
      'https://www.nas.gov.qa/idp/public/authn/password',
      async (route) => {
        await route.fulfill({
          contentType: 'text/html; charset=utf-8',
          body: '<main>National Authentication System</main>',
        });
      },
    );
    await page.goto('https://taqadi.sjc.gov.qa/itc/login');

    const portal = new TaqadiPortal(page) as unknown as {
      startTawtheeqLoginIfNeeded: () => Promise<boolean>;
    };
    const loginStarted = portal.startTawtheeqLoginIfNeeded();
    await page.waitForTimeout(300);
    await page.goto('https://www.nas.gov.qa/idp/public/authn/password');

    await expect(loginStarted).resolves.toBe(true);
    expect(page.url()).toBe(
      'https://www.nas.gov.qa/idp/public/authn/password',
    );
    await page.unroute('**/*');
  }, 10_000);

  it('fills Tawtheeq credentials and submits only after human verification', async () => {
    const originalCredentials = { ...agentConfig.tawtheeq };
    agentConfig.tawtheeq.username = 'test-user';
    agentConfig.tawtheeq.password = 'test-password';

    try {
      await page.goto('about:blank');
      await page.route('**/*', async (route) => {
        await route.fulfill({
          contentType: 'text/html; charset=utf-8',
          body: `
            <section id="tawtheeq-card">
              <button id="test-start-tawtheeq" type="button">
                &#1605;&#1578;&#1575;&#1576;&#1593;&#1577;
              </button>
              <script>
                document.querySelector('#test-start-tawtheeq')
                  .addEventListener('click', () => {
                    history.replaceState({}, '', '/authn/login');
                    document.body.innerHTML = [
                      '<form id="frm_mobileid_login">',
                      '<input id="username" name="username">',
                      '<input id="password" name="password" type="password">',
                      '<div class="g-recaptcha">captcha</div>',
                      '<textarea id="g-recaptcha-response" ',
                      'name="g-recaptcha-response" style="display:none">',
                      '</textarea>',
                      '<button id="auth-continue" type="button">',
                      '&#1575;&#1587;&#1578;&#1605;&#1585;',
                      '</button>',
                      '</form>',
                    ].join('');

                    document.querySelector('#auth-continue')
                      .addEventListener('click', () => {
                        document.body.dataset.captchaSolvedAtSubmit =
                          String(Boolean(document.querySelector(
                            '#g-recaptcha-response'
                          ).value));
                        document.body.dataset.continueClicked = 'true';
                        history.replaceState({}, '', '/itc/home');
                        document.body.innerHTML =
                          '<main id="main">ok</main>';
                      });

                    const watcher = setInterval(() => {
                      const username = document.querySelector('#username');
                      const password = document.querySelector('#password');
                      if (
                        username?.value === 'test-user'
                        && password?.value === 'test-password'
                      ) {
                        clearInterval(watcher);
                        document.body.dataset.credentialsFilled = 'true';
                        setTimeout(() => {
                          document.querySelector(
                            '#g-recaptcha-response'
                          ).value = 'human-verification-token';
                        }, 250);
                      }
                    }, 20);
                  });
              </script>
              <strong>توثيق TAWTHEEQ</strong>
              <p>الدخول عبر النظام الوطني</p>
              <button
                type="button"
                onclick="
                  history.replaceState({}, '', '/authn/login');
                  document.body.innerHTML = \`
                    <form id='frm_mobileid_login'>
                      <label for='username'>اسم المستخدم</label>
                      <input id='username' name='username'>
                      <label for='password'>كلمة المرور</label>
                      <input id='password' name='password' type='password'>
                      <div class='g-recaptcha'>أنا لست برنامج روبوت</div>
                      <textarea
                        id='g-recaptcha-response'
                        name='g-recaptcha-response'
                        style='display:none'
                      ></textarea>
                      <button
                        type='button'
                        onclick=\\"
                          document.body.dataset.captchaSolvedAtSubmit =
                            String(Boolean(document.querySelector(
                              '#g-recaptcha-response'
                            ).value));
                          document.body.dataset.continueClicked = 'true';
                          history.replaceState({}, '', '/itc/home');
                          document.body.innerHTML =
                            '<main id=main>إدارة الدعاوى</main>';
                        \\"
                      >استمر</button>
                    </form>
                  \`;
                  const watcher = setInterval(() => {
                    const username = document.querySelector('#username');
                    const password = document.querySelector('#password');
                    if (
                      username?.value === 'test-user'
                      && password?.value === 'test-password'
                    ) {
                      clearInterval(watcher);
                      document.body.dataset.credentialsFilled = 'true';
                      setTimeout(() => {
                        document.querySelector(
                          '#g-recaptcha-response'
                        ).value = 'human-verification-token';
                      }, 250);
                    }
                  }, 20);
                "
              >متابعة</button>
            </section>
          `,
        });
      });

      const portal = new TaqadiPortal(page);
      await portal.ensureAuthenticated(async () => undefined);

      expect(
        await page.locator('body').getAttribute('data-credentials-filled'),
      ).toBe('true');
      expect(
        await page.locator('body').getAttribute('data-continue-clicked'),
      ).toBe('true');
      expect(
        await page
          .locator('body')
          .getAttribute('data-captcha-solved-at-submit'),
      ).toBe('true');
    } finally {
      Object.assign(agentConfig.tawtheeq, originalCredentials);
      await page.unroute('**/*');
    }
  }, 15_000);

  it('adopts an authenticated Taqadi tab instead of waiting on an old login tab', async () => {
    const sharedContext = await browser.newContext();
    const loginPage = await sharedContext.newPage();
    const authenticatedPage = await sharedContext.newPage();
    await authenticatedPage.route('**/itc/home', async (route) => {
      await route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `
          <header id="header">تقاضي</header>
          <aside id="left-panel">خميس الجبر</aside>
          <main id="main">إدارة الدعاوى</main>
          <form id="logout-form"></form>
        `,
      });
    });
    await authenticatedPage.goto('https://taqadi.sjc.gov.qa/itc/home');
    await loginPage.setContent(`
      <form>
        <input id="username" name="username">
        <input id="password" name="password" type="password">
      </form>
    `);

    const portal = new TaqadiPortal(loginPage) as unknown as { page: Page };
    await (portal as unknown as TaqadiPortal)
      .ensureAuthenticated(async () => undefined);

    expect(portal.page).toBe(authenticatedPage);
    await sharedContext.close();
  });

  it('selects the defendant role only inside the open party dialog', async () => {
    await page.setContent(`
      <script>
        window.renderIdentityNumber = () => {
          document.querySelector('#party-editor #identity-number-slot').innerHTML =
            '<input id="tempIdentityNo" type="hidden" value="">'
            + '<label for="identityNo">رقم البطاقة *</label>'
            + '<input id="identityNo">';
          document.querySelector('#party-editor #firstName').value = '';
          document.querySelector('#party-editor #lastName').value = '';
          document.querySelector('#party-editor #priority').value = '1';
        };
      </script>
      <section id="background-form">
        <label for="type">صفة الطرف</label>
        <select id="type"><option>محامي</option></select>
      </section>
      <div id="stale-representative-editor" class="modal" style="display:none">
        <input id="firstName" value="خميس">
        <input id="lastName" value="الجبر">
        <input id="residencyCardNumber" value="">
        <input id="mobileNo" value="97466707063">
        <input id="email" value="Khamis-1992@hotmail.com">
        <input id="addresses0.address" value="الدوحة - قطر">
        <input id="priority" value="1">
      </div>
      <div class="tab-pane active" data-tabpane-name="case_party_grid">
        <button
          type="button"
          title="button_add_party_1"
          onclick="document.querySelector('#party-editor').style.display='block'; document.querySelector('#party-editor').classList.add('in')"
        >button_add_party_1</button>
        <table></table>
      </div>
      <div id="party-editor" class="modal" style="display:none">
        <label for="category">تصنيف الطرف</label>
        <select id="category"><option>شخص طبيعي</option></select>
        <label for="type">صفة الطرف</label>
        <select id="type"><option>المدعى عليه</option></select>
        <label for="firstName">الاسم الأول</label>
        <input id="firstName">
        <label for="lastName">اسم العائلة</label>
        <input id="lastName">
        <div id="identity-number-slot"></div>
        <label for="gender">النوع</label>
        <select id="gender">
          <option value="">اختيار واحد</option>
          <option>ذكر</option>
          <option>أنثى</option>
        </select>
        <label for="proofOfIdentity">نوع البطاقة</label>
        <select
          id="proofOfIdentity"
          onchange="setTimeout(window.renderIdentityNumber, 100)"
        >
          <option value="">اختيار واحد</option>
          <option>رخصة مقيم</option>
        </select>
        <label for="nationality">الجنسية</label>
        <select id="nationality">
          <option value="">اختيار واحد</option>
          <option>سودان</option>
        </select>
        <label for="mobileNo">رقم الهاتف المحمول</label>
        <span class="k-widget k-numerictextbox">
          <input class="k-formatted-value k-input" value="974">
          <input id="mobileNo" type="hidden" value="974">
        </span>
        <label for="email">البريد الإلكتروني</label>
        <input id="email">
        <label for="addresses0.address">العنوان</label>
        <input id="addresses0.address">
        <label for="priority">الترتيب حسب صحيفة الدعوى</label>
        <input id="priority">
        <button
          type="button"
          onclick="this.dataset.saved='true'; document.querySelector('.tab-pane table').innerHTML='<tr role=&quot;row&quot;><td>'+document.querySelector('#party-editor #firstName').value+' '+document.querySelector('#party-editor #lastName').value+'</td><td>شخص طبيعي</td><td>المدعى عليه</td><td>'+document.querySelector('#party-editor #priority').value+'</td></tr>'; this.closest('.modal').style.display='none'"
        >حفظ</button>
      </div>
    `);
    await page.evaluate(`(() => {
      window.jQuery = (element) => ({
        data: (name) => name === 'kendoNumericTextBox'
          ? {
              value: (value) => {
                element.value = String(value);
                const formatted = element.closest('.k-widget')
                  ?.querySelector('input.k-formatted-value');
                if (formatted) formatted.value = String(value);
                const address = document.querySelector(
                  '#party-editor #addresses0\\\\.address'
                );
                if (element.id === 'mobileNo' && address) {
                  address.value = '';
                  document.querySelector('#party-editor #firstName').value = '';
                  document.querySelector('#party-editor #lastName').value = '';
                }
              },
              trigger: () => undefined,
            }
          : null,
      });
      window.$ = window.jQuery;
    })()`);

    const portal = new TaqadiPortal(page);
    await portal.addDefendant({
      defendant: {
        fullName: 'عميل تجريبي',
        firstName: 'عميل',
        middleName: null,
        lastName: 'تجريبي',
        idType: 'جواز سفر',
        idNumber: '12345678901',
        nationality: 'سوداني',
        phone: '55555555',
        email: 'customer@example.com',
        address: 'عنوان العميل المسجل',
      },
    } as FilingPayload, { continueAfterSave: false });

    expect(
      await page.locator('#background-form [id="type"]').inputValue(),
    ).toBe('محامي');
    expect(
      await page.locator('#party-editor [id="type"]').inputValue(),
    ).toBe('المدعى عليه');
    expect(
      await page
        .locator('#party-editor [id="proofOfIdentity"]')
        .inputValue(),
    ).toBe('رخصة مقيم');
    expect(
      await page.locator('#party-editor [id="gender"]').inputValue(),
    ).toBe('');
    expect(
      await page.locator('#party-editor [id="nationality"]').inputValue(),
    ).toBe('سودان');
    expect(
      await page.locator('#party-editor #identityNo').inputValue(),
    ).toBe('12345678901');
    expect(
      await page.locator('#party-editor [id="firstName"]').inputValue(),
    ).toBe('عميل');
    expect(
      await page.locator('#party-editor [id="email"]').inputValue(),
    ).toBe('khamis-1992@hotmail.com');
    expect(
      await page.locator('#party-editor [id="mobileNo"]').inputValue(),
    ).toBe('97455555555');
    expect(
      await page
        .locator('#party-editor [id="addresses0.address"]')
        .inputValue(),
    ).toBe('الدوحة قطر');
    expect(
      await page.locator('#party-editor [id="priority"]').inputValue(),
    ).toBe('1');
    expect(
      await page.locator('#party-editor button', { hasText: 'حفظ' })
        .getAttribute('data-saved'),
    ).toBe('true');
    await page.evaluate(`(() => {
      delete window.jQuery;
      delete window.$;
    })()`);
  }, 10_000);

  it('uploads a document only to the visible matching slot', async () => {
    await page.setContent(`
      <section id="stale-upload" style="display:none">
        <div class="document-row">
          <span>كشف المطالبات المالية</span>
          <input id="stale-claims" type="file">
        </div>
      </section>
      <section id="active-upload">
        <div class="document-row">
          <span>كشف المطالبات المالية</span>
          <input id="active-claims" type="file">
        </div>
        <button
          type="button"
          onclick="document.body.dataset.continued='true'"
        >التالي</button>
      </section>
    `);

    const portal = new TaqadiPortal(page);
    await portal.uploadDocuments([{
      key: 'claims',
      name: 'كشف المطالبات المالية',
      filePath: uploadFixturePath,
      mimeType: 'application/pdf',
    }]);

    expect(
      await page.locator('#stale-claims').evaluate(
        (element) => (element as HTMLInputElement).files?.length || 0,
      ),
    ).toBe(0);
    expect(
      await page.locator('#active-claims').evaluate(
        (element) => (element as HTMLInputElement).files?.[0]?.name || '',
      ),
    ).toBe(path.basename(uploadFixturePath));
    expect(await page.locator('body').getAttribute('data-continued')).toBe(
      'true',
    );
  }, 15_000);

  it('keeps the PDF and Word memo copies in separate upload slots', async () => {
    await page.setContent(`
      <section id="memo-uploads">
        <div class="document-row">
          <span>مرفق 1</span>
          <input id="memo-pdf" type="file">
        </div>
        <div class="document-row">
          <span>مرفق 2</span>
          <input id="memo-word" type="file">
        </div>
        <button
          type="button"
          onclick="document.body.dataset.continued='true'"
        >التالي</button>
      </section>
    `);

    const portal = new TaqadiPortal(page);
    const summary = await portal.uploadDocuments([
      {
        key: 'memo',
        name: 'المذكرة الشارحة',
        filePath: uploadFixturePath,
        mimeType: 'application/pdf',
      },
      {
        key: 'memoWord',
        name: 'المذكرة الشارحة (Word)',
        filePath: wordUploadFixturePath,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    ]);

    expect(
      await page.locator('#memo-pdf').evaluate(
        (element) => (element as HTMLInputElement).files?.[0]?.name || '',
      ),
    ).toBe(path.basename(uploadFixturePath));
    expect(
      await page.locator('#memo-word').evaluate(
        (element) => (element as HTMLInputElement).files?.[0]?.name || '',
      ),
    ).toBe(path.basename(wordUploadFixturePath));
    expect(summary.uploaded.map((document) => document.key)).toEqual([
      'memo',
      'memoWord',
    ]);
    expect(await page.locator('body').getAttribute('data-continued')).toBe(
      'true',
    );
  }, 15_000);

  it('chooses the mapped document type instead of the dialog default', async () => {
    await page.setContent(`
      <ul id="navigation">
        <li onclick="document.body.dataset.decoyClicked='true'">القائمة الرئيسية</li>
      </ul>
      <button
        type="button"
        onclick="document.querySelector('#document-dialog').style.display='block'"
      >إضافة وثيقة</button>
      <div id="document-dialog" class="modal" role="dialog" style="display:none">
        <input
          type="file"
          onchange="document.body.dataset.documentTypeAtUpload=document.querySelector('#documentType').options[document.querySelector('#documentType').selectedIndex].text"
        >
        <label for="documentType">نوع المستند</label>
        <select
          id="documentType"
          onchange="document.body.dataset.selectedDocumentType=this.options[this.selectedIndex].text"
        >
          <option value="memo">المذكرة الشارحة</option>
          <option value="portfolio">حافظة المستندات</option>
        </select>
        <button
          type="button"
          onclick="this.closest('.modal').style.display='none'"
        >حفظ</button>
      </div>
      <ul id="documentType_listbox">
        <li
          role="option"
          class="k-item"
          onclick="document.body.dataset.ownedOptionClicked='true'"
        >حافظة المستندات</li>
      </ul>
      <button
        type="button"
        onclick="document.body.dataset.continued='true'"
      >التالي</button>
    `);

    const portal = new TaqadiPortal(page);
    const progress: string[] = [];
    await portal.uploadDocuments([{
      key: 'claims',
      name: 'كشف المطالبات المالية',
      filePath: uploadFixturePath,
      mimeType: 'application/pdf',
    }], async (event) => {
      progress.push(`${event.phase}:${event.document.key}`);
    });

    expect(
      await page.locator('body').getAttribute('data-selected-document-type'),
    ).toBe('حافظة المستندات');
    expect(
      await page.locator('body').getAttribute('data-document-type-at-upload'),
    ).toBe('حافظة المستندات');
    expect(
      await page.locator('body').getAttribute('data-decoy-clicked'),
    ).toBeNull();
    expect(await page.locator('body').getAttribute('data-continued')).toBe(
      'true',
    );
    expect(progress).toEqual([
      'started:claims',
      'uploaded:claims',
    ]);
  }, 10_000);

  it('uses a short deterministic portal filename for traffic evidence', async () => {
    const longEvidencePath = path.join(
      os.tmpdir(),
      `09_كشف مخالفات وزارة الداخلية - لوحة 010669-${process.pid}.pdf`,
    );
    await fs.copyFile(uploadFixturePath, longEvidencePath);
    try {
      await page.setContent(`
        <button
          type="button"
          onclick="document.querySelector('#document-dialog').style.display='block'"
        >إضافة وثيقة</button>
        <div id="document-dialog" class="modal" role="dialog" style="display:none">
          <label for="documentType">نوع المستند</label>
          <select id="documentType">
            <option value="memo">المذكرة الشارحة</option>
            <option value="portfolio">حافظة المستندات</option>
          </select>
          <input
            type="file"
            onchange="document.body.dataset.uploadedFileName=this.files[0].name"
          >
          <button type="button" onclick="this.closest('.modal').style.display='none'">حفظ</button>
        </div>
        <button type="button" onclick="document.body.dataset.continued='true'">التالي</button>
      `);

      const portal = new TaqadiPortal(page);
      const summary = await portal.uploadDocuments([{
        key: 'violationsEvidence',
        name: 'كشف مخالفات وزارة الداخلية - لوحة 010669',
        filePath: longEvidencePath,
        mimeType: 'application/pdf',
      }]);

      expect(
        await page.locator('body').getAttribute('data-uploaded-file-name'),
      ).toBe('09_MOI_violations.pdf');
      expect(summary.uploaded[0]?.fileName).toBe('09_MOI_violations.pdf');
      expect(await page.locator('body').getAttribute('data-continued')).toBe(
        'true',
      );
    } finally {
      await fs.unlink(longEvidencePath).catch(() => undefined);
      await fs.unlink(
        path.join(os.tmpdir(), '09_MOI_violations.pdf'),
      ).catch(() => undefined);
    }
  }, 10_000);

  it('waits for the mapped Kendo document type and never falls back to memo', async () => {
    await page.setContent(`
      <button
        type="button"
        onclick="document.querySelector('#document-dialog').style.display='block'"
      >إضافة وثيقة</button>
      <div id="document-dialog" class="modal" role="dialog" style="display:none">
        <input type="file">
        <label for="documentType">نوع المستند</label>
        <div
          id="documentType"
          role="combobox"
          aria-owns="documentType_listbox"
          onclick="
            document.querySelector('#documentType_listbox').style.display='block';
            setTimeout(() => {
              document.querySelector('#portfolio-option').style.display='block';
            }, 700);
          "
        ><span class="k-input">المذكرة الشارحة</span></div>
        <button
          type="button"
          onclick="this.closest('.modal').style.display='none'"
        >حفظ</button>
      </div>
      <ul id="documentType_listbox" style="display:none">
        <li
          role="option"
          class="k-item"
          onclick="document.body.dataset.memoClicked='true'"
        >المذكرة الشارحة</li>
        <li
          id="portfolio-option"
          role="option"
          class="k-item"
          style="display:none"
          onclick="
            document.querySelector('#documentType .k-input').textContent='حافظة المستندات';
            document.querySelector('#documentType_listbox').style.display='none';
          "
        >حافظة المستندات</li>
      </ul>
      <button
        type="button"
        onclick="document.body.dataset.continued='true'"
      >التالي</button>
    `);

    const portal = new TaqadiPortal(page);
    await portal.uploadDocuments([{
      key: 'contract',
      name: 'عقد الإيجار',
      filePath: uploadFixturePath,
      mimeType: 'application/pdf',
    }]);

    expect(
      await page.locator('#documentType .k-input').innerText(),
    ).toBe('حافظة المستندات');
    expect(
      await page.locator('body').getAttribute('data-memo-clicked'),
    ).toBeNull();
    expect(await page.locator('body').getAttribute('data-continued')).toBe(
      'true',
    );
  }, 15_000);

  it('ignores accumulated hidden Kendo listboxes without serial option reads', async () => {
    const hiddenListboxes = Array.from({ length: 40 }, (_, listboxIndex) => `
      <ul id="documentType_listbox" style="display:none">
        ${Array.from({ length: 10 }, (_, optionIndex) => `
          <li role="option" class="k-item">Hidden ${listboxIndex}-${optionIndex}</li>
        `).join('')}
      </ul>
    `).join('');

    await page.setContent(`
      <button
        type="button"
        onclick="document.querySelector('#document-dialog').style.display='block'"
      >إضافة وثيقة</button>
      <div id="document-dialog" class="modal" role="dialog" style="display:none">
        <input type="file">
        <label for="documentType">نوع المستند</label>
        <div
          id="documentType"
          role="combobox"
          aria-owns="documentType_listbox"
        ><span class="k-input">المذكرة الشارحة</span></div>
        <button
          type="button"
          onclick="this.closest('.modal').style.display='none'"
        >حفظ</button>
      </div>
      ${hiddenListboxes}
      <ul id="documentType_listbox">
        <li
          role="option"
          class="k-item"
          onclick="document.querySelector('#documentType .k-input').textContent='حافظة المستندات'"
        >حافظة المستندات</li>
      </ul>
      <button
        type="button"
        onclick="document.body.dataset.continued='true'"
      >التالي</button>
    `);

    const portal = new TaqadiPortal(page);
    const startedAt = Date.now();
    await portal.uploadDocuments([{
      key: 'contract',
      name: 'عقد الإيجار',
      filePath: uploadFixturePath,
      mimeType: 'application/pdf',
    }]);

    expect(Date.now() - startedAt).toBeLessThan(3_000);
    expect(
      await page.locator('#documentType .k-input').innerText(),
    ).toBe('حافظة المستندات');
    expect(await page.locator('body').getAttribute('data-continued')).toBe(
      'true',
    );
  }, 10_000);

  it('stops before save when the mapped document type is unavailable', async () => {
    await page.setContent(`
      <button
        type="button"
        onclick="document.querySelector('#document-dialog').style.display='block'"
      >إضافة وثيقة</button>
      <div id="document-dialog" class="modal" role="dialog" style="display:none">
        <input type="file">
        <label for="documentType">نوع المستند</label>
        <select id="documentType">
          <option value="memo">المذكرة الشارحة</option>
        </select>
        <button
          type="button"
          onclick="document.body.dataset.saved='true'"
        >حفظ</button>
      </div>
    `);

    const portal = new TaqadiPortal(page);
    await expect(portal.uploadDocuments([{
      key: 'contract',
      name: 'عقد الإيجار',
      filePath: uploadFixturePath,
      mimeType: 'application/pdf',
    }])).rejects.toMatchObject({ code: 'DOCUMENT_TYPE_NOT_FOUND' });
    expect(await page.locator('body').getAttribute('data-saved')).toBeNull();
  }, 10_000);

  it('waits through the Kendo uploading status until save becomes available', async () => {
    await page.setContent(`
      <button
        type="button"
        onclick="
          document.querySelector('#document-dialog').style.display='block';
          setTimeout(() => {
            document.querySelector('#upload-status').textContent='تم تحميل الملف';
            document.querySelector('#save-document').disabled=false;
          }, 400);
        "
      >إضافة وثيقة</button>
      <div id="document-dialog" class="modal" role="dialog" style="display:none">
        <input type="file">
        <strong id="upload-status" class="k-upload-status-total">
          جاري تحميل الملف...
        </strong>
        <button
          id="save-document"
          type="button"
          disabled
          onclick="document.body.dataset.saved='true'; this.closest('.modal').style.display='none'"
        >حفظ</button>
        <button type="button">إغلاق</button>
      </div>
      <button
        type="button"
        onclick="document.body.dataset.continued='true'"
      >التالي</button>
    `);

    const portal = new TaqadiPortal(page);
    const summary = await portal.uploadDocuments([{
      key: 'claims',
      name: 'كشف المطالبات المالية',
      filePath: uploadFixturePath,
      mimeType: 'application/pdf',
    }]);

    expect(summary.uploaded).toHaveLength(1);
    expect(summary.skipped).toHaveLength(0);
    expect(await page.locator('body').getAttribute('data-saved')).toBe('true');
    expect(await page.locator('body').getAttribute('data-continued')).toBe('true');
  }, 10_000);

  it('waits for the upload input when Taqadi renders the dialog in two phases', async () => {
    await page.setContent(`
      <button
        id="add-document"
        type="button"
        onclick="
          document.body.dataset.addClicked='true';
          const dialog = document.querySelector('#document-dialog');
          dialog.style.display='block';
          setTimeout(() => {
            dialog.querySelector('.k-loading-mask').remove();
            const input = document.createElement('input');
            input.id='delayed-document-file';
            input.type='file';
            dialog.appendChild(input);
            const save = document.createElement('button');
            save.type='button';
            save.textContent='حفظ';
            save.onclick=() => {
              document.body.dataset.saved='true';
              dialog.style.display='none';
            };
            dialog.appendChild(save);
          }, 650);
        "
      >إضافة وثيقة</button>
      <div id="document-dialog" class="modal" role="dialog" style="display:none">
        <h2>إضافة وثيقة</h2>
        <div class="k-loading-mask">جاري التحميل</div>
      </div>
      <button
        type="button"
        onclick="document.body.dataset.continued='true'"
      >التالي</button>
    `);

    const portal = new TaqadiPortal(page);
    const summary = await portal.uploadDocuments([{
      key: 'claims',
      name: 'كشف المطالبات المالية',
      filePath: uploadFixturePath,
      mimeType: 'application/pdf',
    }]);

    expect(summary.uploaded).toHaveLength(1);
    expect(await page.locator('body').getAttribute('data-add-clicked')).toBe('true');
    expect(await page.locator('body').getAttribute('data-saved')).toBe('true');
    expect(await page.locator('body').getAttribute('data-continued')).toBe('true');
  }, 10_000);

  it('resumes an already-open upload dialog without clicking add again', async () => {
    await page.setContent(`
      <button
        id="add-document"
        type="button"
        onclick="document.body.dataset.addClicked='true'"
      >إضافة وثيقة</button>
      <div id="document-dialog" class="modal" role="dialog">
        <h2>إضافة وثيقة</h2>
        <input id="resumed-document-file" type="file">
        <button
          type="button"
          onclick="document.body.dataset.saved='true'; this.closest('.modal').style.display='none'"
        >حفظ</button>
      </div>
      <button
        type="button"
        onclick="document.body.dataset.continued='true'"
      >التالي</button>
    `);

    const portal = new TaqadiPortal(page);
    const summary = await portal.uploadDocuments([{
      key: 'claims',
      name: 'كشف المطالبات المالية',
      filePath: uploadFixturePath,
      mimeType: 'application/pdf',
    }]);

    expect(summary.uploaded).toHaveLength(1);
    expect(await page.locator('body').getAttribute('data-add-clicked')).toBeNull();
    expect(await page.locator('body').getAttribute('data-saved')).toBe('true');
    expect(await page.locator('body').getAttribute('data-continued')).toBe('true');
  }, 10_000);

  it('saves an already-uploaded dialog file without uploading it twice', async () => {
    const fileName = path.basename(uploadFixturePath);
    await page.setContent(`
      <button type="button">إضافة وثيقة</button>
      <div id="document-dialog" class="modal" role="dialog">
        <h2>إضافة وثيقة</h2>
        <input
          id="resumed-document-file"
          type="file"
          onchange="document.body.dataset.duplicateUpload='true'"
        >
        <div class="k-file-success">
          <span class="k-file-name">${fileName}</span>
          <span class="k-progress-status">100%</span>
        </div>
        <button
          type="button"
          onclick="document.body.dataset.saved='true'; this.closest('.modal').style.display='none'"
        >حفظ</button>
      </div>
      <button
        type="button"
        onclick="document.body.dataset.continued='true'"
      >التالي</button>
    `);

    const portal = new TaqadiPortal(page);
    const summary = await portal.uploadDocuments([{
      key: 'claims',
      name: 'كشف المطالبات المالية',
      filePath: uploadFixturePath,
      mimeType: 'application/pdf',
    }]);

    expect(summary.uploaded).toHaveLength(1);
    expect(
      await page.locator('body').getAttribute('data-duplicate-upload'),
    ).toBeNull();
    expect(await page.locator('body').getAttribute('data-saved')).toBe('true');
    expect(await page.locator('body').getAttribute('data-continued')).toBe('true');
  }, 10_000);

  it('saves after Kendo consumes the input and replaces the save button', async () => {
    await page.setContent(`
      <button
        type="button"
        onclick="document.querySelector('#document-dialog').style.display='block'"
      >إضافة وثيقة</button>
      <div id="document-dialog" class="modal" role="dialog" style="display:none">
        <input
          id="document-file"
          type="file"
          onchange="
            this.value='';
            setTimeout(() => {
              document.querySelector('#upload-status').textContent='تم';
              document.querySelector('#upload-progress').textContent='100%';
              document.querySelector('#upload-row').className='k-file-success';
              const replacement = document.createElement('button');
              replacement.id='save-document-ready';
              replacement.type='button';
              replacement.className='btn btn-primary';
              replacement.textContent='حفظ';
              replacement.onclick=() => {
                document.body.dataset.saved='true';
                replacement.closest('.modal').style.display='none';
              };
              document.querySelector('#save-document').replaceWith(replacement);
            }, 200);
          "
        >
        <div id="upload-row" class="k-file-progress">
          <strong id="upload-status" class="k-upload-status-total">
            جاري تحميل الملف...
          </strong>
          <span id="upload-progress" class="k-progress-status">0%</span>
        </div>
        <div class="modal-footer">
          <button id="save-document" type="button" disabled>حفظ</button>
          <button type="button">إغلاق</button>
        </div>
      </div>
      <button
        type="button"
        onclick="document.body.dataset.continued='true'"
      >التالي</button>
    `);

    const portal = new TaqadiPortal(page);
    const summary = await portal.uploadDocuments([{
      key: 'memoWord',
      name: 'المذكرة الشارحة (Word)',
      filePath: wordUploadFixturePath,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }]);

    expect(summary.uploaded).toHaveLength(1);
    expect(summary.skipped).toHaveLength(0);
    expect(
      await page.locator('#document-file').evaluate(
        (element) => (element as HTMLInputElement).files?.length || 0,
      ),
    ).toBe(0);
    expect(await page.locator('body').getAttribute('data-saved')).toBe('true');
    expect(await page.locator('body').getAttribute('data-continued')).toBe('true');
  }, 10_000);

  it('skips a file rejected by Taqadi and uploads the remaining files', async () => {
    await page.setContent(`
      <button
        id="add-document"
        type="button"
        onclick="
          const attempt = Number(document.body.dataset.uploadAttempt || '0') + 1;
          document.body.dataset.uploadAttempt = String(attempt);
          document.querySelector('#document-dialog').style.display = 'block';
          document.querySelector('#upload-error').style.display = attempt === 1 ? 'block' : 'none';
          document.querySelector('#save-document').disabled = attempt === 1;
        "
      >إضافة وثيقة</button>
      <div id="document-dialog" class="modal" role="dialog" style="display:none">
        <input type="file">
        <label for="documentType">نوع المستند</label>
        <select id="documentType">
          <option value="portfolio">حافظة المستندات</option>
        </select>
        <div id="upload-error" class="k-file-error" style="display:none">
          حجم الملف أكبر من الحد المسموح
        </div>
        <button
          id="close-document"
          type="button"
          onclick="document.body.dataset.closed='true'; this.closest('.modal').style.display='none'"
        >إغلاق</button>
        <button
          id="save-document"
          type="button"
          onclick="document.body.dataset.saved='true'; this.closest('.modal').style.display='none'"
        >حفظ</button>
      </div>
      <ul id="documentType_listbox">
        <li role="option" class="k-item">حافظة المستندات</li>
      </ul>
      <button
        type="button"
        onclick="document.body.dataset.continued='true'"
      >التالي</button>
    `);

    const portal = new TaqadiPortal(page);
    await expect(portal.uploadDocuments([
      {
        key: 'violationsEvidence',
        name: 'تقرير المخالفات الكبير',
        filePath: uploadFixturePath,
        mimeType: 'application/pdf',
      },
      {
        key: 'docsList',
        name: 'المستند التالي',
        filePath: uploadFixturePath,
        mimeType: 'application/pdf',
      },
    ])).rejects.toMatchObject({
      code: 'DOCUMENT_BUNDLE_INCOMPLETE',
      details: {
        skippedDocuments: [{
          key: 'violationsEvidence',
          status: 'skipped',
        }],
        uploadedDocuments: [{
          key: 'docsList',
          status: 'uploaded',
        }],
      },
    });
    expect(await page.locator('body').getAttribute('data-closed')).toBe('true');
    expect(await page.locator('body').getAttribute('data-saved')).toBe('true');
    expect(await page.locator('body').getAttribute('data-continued')).toBeNull();
  }, 20_000);

  it('tries the remaining documents before reporting a rejected mandatory memo', async () => {
    await page.setContent(`
      <button
        id="add-document"
        type="button"
        onclick="
          const attempt = Number(document.body.dataset.uploadAttempt || '0') + 1;
          document.body.dataset.uploadAttempt = String(attempt);
          document.querySelector('#document-dialog').style.display='block';
          document.querySelector('#upload-error').style.display = attempt === 1 ? 'block' : 'none';
          document.querySelector('#save-document').disabled = attempt === 1;
        "
      >إضافة وثيقة</button>
      <div id="document-dialog" class="modal" role="dialog" style="display:none">
        <input type="file">
        <div id="upload-error" class="k-file-error">صيغة الملف غير مقبولة</div>
        <button
          type="button"
          onclick="this.closest('.modal').style.display='none'"
        >إغلاق</button>
        <button
          id="save-document"
          type="button"
          disabled
          onclick="document.body.dataset.saved='true'; this.closest('.modal').style.display='none'"
        >حفظ</button>
      </div>
      <button
        type="button"
        onclick="document.body.dataset.continued='true'"
      >التالي</button>
    `);

    const portal = new TaqadiPortal(page);
    await expect(portal.uploadDocuments([
      {
        key: 'memoWord',
        name: 'المذكرة الشارحة (Word)',
        filePath: wordUploadFixturePath,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      {
        key: 'remaining-document',
        name: 'المستند التالي',
        filePath: uploadFixturePath,
        mimeType: 'application/pdf',
      },
    ])).rejects.toMatchObject({
      code: 'MANDATORY_MEMO_DOCUMENT_REJECTED',
      details: {
        uploadedDocuments: [{ key: 'remaining-document' }],
      },
    });
    expect(await page.locator('body').getAttribute('data-upload-attempt')).toBe('2');
    expect(await page.locator('body').getAttribute('data-saved')).toBe('true');
    expect(await page.locator('body').getAttribute('data-continued')).toBeNull();
  }, 10_000);

  it('clicks only the exact حفظ button when saving the parties draft', async () => {
    await page.setContent(`
      <button
        type="button"
        onclick="document.body.dataset.savedAndContinued='true'"
      >حفظ ومتابعة</button>
      <button
        type="button"
        onclick="document.body.dataset.saved='true'"
      >حفظ</button>
    `);

    const portal = new TaqadiPortal(page);
    await portal.savePartiesDraft();

    expect(await page.locator('body').getAttribute('data-saved')).toBe('true');
    expect(
      await page.locator('body').getAttribute('data-saved-and-continued'),
    ).toBeNull();
  });

  it('stops when the parties draft save button is missing', async () => {
    await page.setContent(`
      <button type="button">حفظ ومتابعة</button>
      <button type="button">التالي</button>
    `);

    const portal = new TaqadiPortal(page);
    await expect(portal.savePartiesDraft()).rejects.toMatchObject({
      code: 'TAQADI_UI_CHANGED',
    });
  });

  it('confirms final approval only inside the new confirmation dialog', async () => {
    await page.setContent(`
      <button
        id="final-approval"
        type="button"
        onclick="
          document.body.dataset.approvalClicks =
            String(Number(document.body.dataset.approvalClicks || 0) + 1);
          document.querySelector('#confirmation').style.display = 'block';
        "
      >اعتماد نهائي</button>
      <div
        id="confirmation"
        class="modal in"
        role="dialog"
        style="display:none"
      >
        <button
          id="confirm-once"
          type="button"
          onclick="
            document.body.dataset.confirmClicks =
              String(Number(document.body.dataset.confirmClicks || 0) + 1);
            document.body.insertAdjacentHTML(
              'beforeend',
              '<p>تم بنجاح الرقم المرجعي: REF-12345</p>',
            );
            this.closest('.modal').style.display = 'none';
          "
        >نعم، اعتماد</button>
      </div>
    `);

    const portal = new TaqadiPortal(page);
    const result = await portal.submitFinal();

    expect(await page.locator('body').getAttribute('data-approval-clicks')).toBe(
      '1',
    );
    expect(await page.locator('body').getAttribute('data-confirm-clicks')).toBe(
      '1',
    );
    expect(result.referenceNumber).toBe('REF-12345');
  });

  it('matches the contract and Arabic-formatted claim amount at review', async () => {
    await page.setContent(`
      <main>
        <h1>مطالبة مالية عن عقد C-ALF-0067</h1>
        <p>المدعى عليه: محمد الشريف</p>
        <p>رقم العقد: C-ALF-0067</p>
        <p>إجمالي المطالبة: ٥٥٬٢٠٠٫٠٠ ر.ق</p>
      </main>
    `);

    const portal = new TaqadiPortal(page);
    await expect(portal.verifyReview({
      case: {
        title: 'مطالبة مالية عن عقد C-ALF-0067',
        amount: 55_200,
      },
      defendant: {
        fullName: 'محمد الشريف',
      },
      contract: {
        number: 'C-ALF-0067',
      },
    } as FilingPayload)).resolves.toBeUndefined();
  });

  it('stops approval when the reviewed claim amount is different', async () => {
    await page.setContent(`
      <main>
        <h1>مطالبة مالية عن عقد C-ALF-0067</h1>
        <p>المدعى عليه: محمد الشريف</p>
        <p>رقم العقد: C-ALF-0067</p>
        <p>إجمالي المطالبة: 50,000.00 ر.ق</p>
      </main>
    `);

    const portal = new TaqadiPortal(page);
    await expect(portal.verifyReview({
      case: {
        title: 'مطالبة مالية عن عقد C-ALF-0067',
        amount: 55_200,
      },
      defendant: {
        fullName: 'محمد الشريف',
      },
      contract: {
        number: 'C-ALF-0067',
      },
    } as FilingPayload)).rejects.toMatchObject({
      code: 'REVIEW_MISMATCH',
      details: {
        expectedClaimAmount: 55_200,
        claimAmountMatches: false,
      },
    });
  });

  it('opens case management when Taqadi omits the Arabic hamza', async () => {
    await page.goto('about:blank');
    await page.setContent(`
      <nav>
        <a
          href="#"
          onclick="document.querySelector('#new-case').style.display='block'"
        >ادارة الدعاوى</a>
      </nav>
      <button
        id="new-case"
        style="display:none"
        onclick="document.body.dataset.opened='true'"
      >قيد دعوى</button>
    `);

    const portal = new TaqadiPortal(page);
    await portal.openNewCase();

    expect(await page.locator('body').getAttribute('data-opened')).toBe('true');
  });

  it('expands collapsed review sections before matching the filing package', async () => {
    await page.setContent(`
      <a
        href="#"
        onclick="
          event.preventDefault();
          document.querySelector('#review-details').style.display = 'block';
          document.body.dataset.expanded = 'true';
        "
      >توسيع الكل</a>
      <section id="review-details" style="display:none">
        <h1>مطالبة مالية-إيجار سيارة-مراد المسعودي</h1>
        <p>المدعى عليه: مراد المسعودي</p>
        <p>رقم العقد: C-ALF-0096</p>
        <p>إجمالي المطالبة: 46,870.00 ر.ق</p>
      </section>
    `);

    const portal = new TaqadiPortal(page);
    await expect(portal.verifyReview({
      case: {
        title: 'مطالبة مالية - إيجار سيارة - مراد المسعودي',
        amount: 46_870,
      },
      defendant: {
        fullName: 'مراد المسعودي',
      },
      contract: {
        number: 'C-ALF-0096',
      },
    } as FilingPayload)).resolves.toBeUndefined();

    expect(await page.locator('body').getAttribute('data-expanded')).toBe('true');
  });

  it('extracts the real Taqadi filing receipt format', async () => {
    await page.setContent(`
      <main>
        <h1>إشعار تقديم الطلب</h1>
        <p>إيصال طلب قيد دعوى</p>
        <p>رقم المرجع: 20260010935</p>
        <p>تاريخ ووقت التسليم: 05/08/2026 22:28</p>
        <p>رسوم تسليم طلب رفع دعوى 3000.0</p>
      </main>
    `);

    const portal = new TaqadiPortal(page);
    await expect(portal.readReceipt()).resolves.toMatchObject({
      caseNumber: null,
      referenceNumber: '20260010935',
      courtFees: 3000,
    });
  });

  it('retypes a text field when Taqadi clears its first committed value', async () => {
    await page.setContent(`
      <div id="party-editor">
        <label for="firstName">الاسم الأول</label>
        <input id="firstName">
      </div>
      <script>
        const firstName = document.querySelector('#firstName');
        firstName.addEventListener('change', () => {
          const commits = Number(firstName.dataset.commits || '0') + 1;
          firstName.dataset.commits = String(commits);
          if (commits === 1) {
            setTimeout(() => {
              firstName.value = '';
            }, 20);
          }
        });
      </script>
    `);

    const portal = new TaqadiPortal(page) as unknown as {
      fillField: (
        labels: string[],
        value: string,
        required: boolean,
        controlIds: string[],
        root: Locator,
      ) => Promise<void>;
    };
    await portal.fillField(
      ['الاسم الأول', 'الاسم'],
      'مراد',
      true,
      ['firstName', 'partyFirstName'],
      page.locator('#party-editor'),
    );

    expect(await page.locator('#firstName').inputValue()).toBe('مراد');
    expect(await page.locator('#firstName').getAttribute('data-commits')).toBe('2');
  });

  it('commits TinyMCE content to the hidden Taqadi textarea', async () => {
    await page.setContent(`
      <textarea id="caseDetails" required></textarea>
      <iframe
        id="caseDetails_ifr"
        srcdoc="<body id='tinymce' contenteditable='true'></body>"
      ></iframe>
      <script>
        const textarea = document.querySelector('#caseDetails');
        const frame = document.querySelector('#caseDetails_ifr');
        window.tinymce = {
          get: () => ({
            getContent: () => frame.contentDocument.body.innerHTML,
            save: () => {
              textarea.value = frame.contentDocument.body.innerHTML;
            },
            fire: (eventName) => {
              textarea.dataset.editorEvents = [
                textarea.dataset.editorEvents || '',
                eventName,
              ].filter(Boolean).join(',');
            },
          }),
          triggerSave: () => {
            textarea.dataset.triggerSaved = 'true';
          },
        };
      </script>
    `);

    const portal = new TaqadiPortal(page) as unknown as {
      fillRichText: (controlId: string, value: string) => Promise<void>;
    };
    await portal.fillRichText(
      'caseDetails',
      'إلزام المدعى عليه بسداد قيمة المطالبة',
    );

    expect(await page.locator('#caseDetails').inputValue()).toContain(
      'إلزام المدعى عليه',
    );
    expect(await page.locator('#caseDetails').getAttribute(
      'data-editor-events',
    )).toContain('change');
    expect(await page.locator('#caseDetails').getAttribute(
      'data-trigger-saved',
    )).toBe('true');
  });

  it('never searches case-management menus on an expired login page', async () => {
    await page.route('https://taqadi.sjc.gov.qa/itc/login**', async (route) => {
      await route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `
          <main>
            <form>
              <input id="username" name="username">
              <input id="password" name="password" type="password">
            </form>
          </main>
        `,
      });
    });
    await page.goto('https://taqadi.sjc.gov.qa/itc/login');

    const portal = new TaqadiPortal(page);
    await expect(portal.openNewCase()).rejects.toMatchObject({
      code: 'LOGIN_REQUIRED',
    });
    expect(page.url()).not.toContain('caseinfo/create');
    await page.unroute('**/*');
  });

  it('opens the verified create route without depending on menu labels', async () => {
    await page.route('https://taqadi.sjc.gov.qa/itc/home**', async (route) => {
      await route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `
          <header id="header">Taqadi</header>
          <aside id="left-panel">Authenticated user</aside>
          <main id="main"></main>
          <form id="logout-form"></form>
          <script>
            const renderRoute = () => {
              if (!location.hash.includes('/itc/f/caseinfo/create')) return;
              document.querySelector('#main').innerHTML =
                '<label for="tempctype_court">&#1583;&#1585;&#1580;&#1577; &#1575;&#1604;&#1578;&#1602;&#1575;&#1590;&#1610;</label>'
                + '<select id="tempctype_court"><option>1</option></select>';
            };
            window.addEventListener('hashchange', renderRoute);
            renderRoute();
          </script>
        `,
      });
    });
    await page.goto('https://taqadi.sjc.gov.qa/itc/home');

    const portal = new TaqadiPortal(page);
    await portal.openNewCase();

    expect(page.url()).toContain('#/itc/f/caseinfo/create');
    expect(await page.locator('#tempctype_court').isVisible()).toBe(true);
    await page.unroute('**/*');
  });
});
