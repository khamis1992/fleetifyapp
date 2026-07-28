import { chromium } from 'playwright';
import { agentConfig, assertAgentConfig } from './config';

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
  await page.waitForTimeout(5_000);

  const representativeRow = page
    .locator('tr[role="row"], tbody tr')
    .filter({ hasText: agentConfig.representative.name })
    .first();
  if (!(await representativeRow.isVisible().catch(() => false))) {
    throw new Error('Representative row is not visible in the current draft');
  }

  await representativeRow.locator('td').first().click();
  await page.locator('#modal-dialog').waitFor({
    state: 'visible',
    timeout: 15_000,
  });
  await page.waitForTimeout(1_000);

  const diagnostics = await page.evaluate(`(() => {
    const input = document.getElementById('priority');
    const jq = window.jQuery || window.$;
    const widget = input && jq
      ? jq(input).data('kendoNumericTextBox')
      : null;
    const inputs = input?.parentElement
      ? Array.from(input.parentElement.querySelectorAll('input'))
      : [];
    return {
      input: input?.outerHTML || null,
      parent: input?.parentElement?.outerHTML || null,
      widgetFound: Boolean(widget),
      widgetValue: widget ? widget.value() : null,
      widgetElement: widget?.element?.[0]?.outerHTML || null,
      widgetInput: widget?.input?.[0]?.outerHTML || null,
      inputs: inputs.map((element) => ({
        outerHTML: element.outerHTML,
        value: element.value,
        visible: element.getBoundingClientRect().width > 0,
      })),
    };
  })()`);
  console.log(JSON.stringify(diagnostics, null, 2));
} finally {
  await context.close();
}
