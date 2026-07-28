import { chromium } from 'playwright';
import { agentConfig, assertAgentConfig } from './config';
import { TaqadiPortal } from './taqadi-page';

assertAgentConfig();

const context = await chromium.launchPersistentContext(
  agentConfig.chromeProfileDir,
  {
    headless: false,
    channel: 'chrome',
    locale: 'ar-QA',
    viewport: null,
    args: ['--start-maximized'],
  },
);

try {
  const page = context.pages()[0] || await context.newPage();
  await page.goto(
    'https://taqadi.sjc.gov.qa/itc/home#/itc/f/caseinfo/create',
    { waitUntil: 'domcontentloaded', timeout: 60_000 },
  );
  await page.waitForTimeout(3_000);

  const portal = new TaqadiPortal(page);
  const selectField = (
    portal as unknown as {
      selectField: (
        labels: string[],
        optionText: string,
        controlIds: string[],
      ) => Promise<void>;
    }
  ).selectField.bind(portal);

  await selectField(
    ['درجة التقاضي'],
    'ابتدائي',
    ['tempctype_court'],
  );
  await selectField(
    ['النوع', 'نوع الدعوى'],
    'عقود الخدمات التجارية',
    ['tempctype_category'],
  );
  await selectField(
    ['النوع الفرعي'],
    'عقود إيجار السيارات وخدمات الليموزين',
    ['tempctype_type'],
  );
  await selectField(
    ['التصنيف'],
    'لا ينطبق',
    ['tempctype_nature'],
  );

  const selectedValues = await page
    .locator('.k-widget.k-dropdown .k-input')
    .evaluateAll((elements) =>
      elements.slice(0, 4).map((element) => element.textContent?.trim()),
    );
  console.log(JSON.stringify({ selectedValues }));
} finally {
  await context.close();
}
