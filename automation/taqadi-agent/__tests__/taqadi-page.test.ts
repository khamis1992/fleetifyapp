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
import { TaqadiPortal } from '../taqadi-page';
import type { FilingPayload } from '../types';

describe('TaqadiPortal classification fields', () => {
  let browser: Browser;
  let page: Page;
  let uploadFixturePath: string;

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
  });

  afterAll(async () => {
    await browser.close();
    await fs.unlink(uploadFixturePath).catch(() => undefined);
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
        <label for="priority">الترتيب حسب صحيفة الدعوى</label>
        <span class="k-widget k-numerictextbox">
          <input class="k-formatted-value k-input" value="1">
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
          <option>${agentConfig.representative.nationality}</option>
        </select>
        <button
          type="button"
          onclick="this.dataset.saved='true'; document.querySelector('[data-party-order]').textContent=document.querySelector('#party-editor .k-formatted-value').value; this.closest('.modal').style.display='none'"
        >حفظ</button>
      </div>
    `);

    const portal = new TaqadiPortal(page);
    await portal.validateRepresentativeFirst({
      representative: {
        partyOrder: 2,
        validateBeforeOtherParties: true,
      },
    } as FilingPayload);

    expect(
      await page.locator('#party-editor .k-formatted-value').inputValue(),
    ).toBe('2');
    expect(
      await page.locator('tr[role="row"]').getAttribute('data-selected'),
    ).toBe('true');
    expect(await page.locator('#mobileNo').inputValue()).toBe(
      agentConfig.representative.phone,
    );
    expect(await page.locator('#email').inputValue()).toBe(
      agentConfig.representative.email,
    );
    expect(
      await page.locator('#party-editor button', { hasText: 'حفظ' })
        .getAttribute('data-saved'),
    ).toBe('true');
  });

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
        window.renderCommercialRegister = () => {
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
        <select id="compOrEstaType">
          <option>شركة ذات مسؤولية محدودة</option>
        </select>
        <label for="companyClassification">جنسية الشركة</label>
        <select id="companyClassification"><option>قطري</option></select>
        <label for="crIssuedBy">رقم السجل التجاري أو قيد المنشأة صادر عن</label>
        <select
          id="crIssuedBy"
          onchange="setTimeout(window.renderCommercialRegister, 100)"
        >
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
    expect(await page.locator('#compOrEstaType').inputValue()).toBe(
      'شركة ذات مسؤولية محدودة',
    );
    expect(
      await page.locator('#officialRegistrationNumber').inputValue(),
    ).toBe('146832');
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
    expect(await page.locator('[id="addresses0.address"]').inputValue()).toBe(
      agentConfig.company.address,
    );
    expect(await page.locator('#priority').inputValue()).toBe('1');
    expect(await page.locator('#tempTransalationReq2').isChecked()).toBe(true);
  });

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
              document.querySelector('#dashboard').style.display = 'block';
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
          <nav id="dashboard" style="display:none">ادارة الدعاوى</nav>
        `,
      });
    });

    const portal = new TaqadiPortal(page);
    await portal.ensureAuthenticated(async () => undefined);

    expect(await page.locator('.modal').isVisible()).toBe(false);
    expect(await page.locator('#dashboard').isVisible()).toBe(true);
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
          document.querySelector('#identity-number-slot').innerHTML =
            '<label for="residencyCardNumber">رقم البطاقة *</label>'
            + '<input id="residencyCardNumber">';
          document.querySelector('#firstName').value = '';
          document.querySelector('#lastName').value = '';
          document.querySelector('#priority').value = '1';
        };
      </script>
      <section id="background-form">
        <label for="type">صفة الطرف</label>
        <select id="type"><option>محامي</option></select>
      </section>
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
          onclick="this.dataset.saved='true'; document.querySelector('.tab-pane table').innerHTML='<tr role=&quot;row&quot;><td>'+document.querySelector('#firstName').value+' '+document.querySelector('#lastName').value+'</td><td>شخص طبيعي</td><td>المدعى عليه</td><td>'+document.querySelector('#priority').value+'</td></tr>'; this.closest('.modal').style.display='none'"
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
                  '#addresses0\\\\.address'
                );
                if (element.id === 'mobileNo' && address) {
                  address.value = '';
                  document.querySelector('#firstName').value = '';
                  document.querySelector('#lastName').value = '';
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
      await page.locator('#residencyCardNumber').inputValue(),
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
});
