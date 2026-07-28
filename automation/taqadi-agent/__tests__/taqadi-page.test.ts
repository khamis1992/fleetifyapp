import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { agentConfig } from '../config';
import { TaqadiPortal } from '../taqadi-page';
import type { FilingPayload } from '../types';

describe('TaqadiPortal classification fields', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
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

  it('opens the representative editor from the party row and saves it', async () => {
    await page.setContent(`
      <div class="tab-pane active" data-tabpane-name="case_party_grid">
        <button title="إضافة طرف">إضافة طرف</button>
        <table>
          <tr role="row">
            <td
              onclick="this.closest('tr').dataset.selected='true'"
            >${agentConfig.representative.name}</td>
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
          onclick="this.dataset.saved='true'; this.closest('.modal').style.display='none'"
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

  it('adds the company with the official Taqadi classifications', async () => {
    await page.setContent(`
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
        <select id="crIssuedBy">
          <option>وزارة التجارة والصناعة</option>
        </select>
        <label for="crNo">رقم السجل التجاري</label>
        <input id="crNo">
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
        <select id="bankCountry"><option>قطري</option></select>
        <label for="country">الدولة</label>
        <select id="country"><option>قطري</option></select>
        <label for="addresses0.address">العنوان</label>
        <input id="addresses0.address">
        <label for="email">البريد الإلكتروني</label>
        <input id="email">
        <label for="priority">الترتيب حسب صحيفة الدعوى</label>
        <input id="priority">
        <input id="tempTransalationReq2" type="radio">
        <button
          type="button"
          onclick="this.dataset.saved='true'; this.closest('.modal').style.display='none'"
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
    expect(await page.locator('#crNo').inputValue()).toBe('146832');
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

  it('selects the individual litigant account after authentication', async () => {
    await page.route('**/*', async (route) => {
      await route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `
          <script>history.replaceState({}, '', '/itc/home')</script>
          <div class="modal">
            <p>لديك أكثر من نوع حساب في النظام، الرجاء اختيار المستخدم</p>
            <span
              class="k-dropdown"
              aria-haspopup="listbox"
              onclick="document.querySelector('#account-options').style.display='block'"
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
              onclick="this.closest('.modal').style.display='none'; document.querySelector('#dashboard').style.display='block'"
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
    await page.unroute('**/*');
  }, 10_000);

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
