import { chromium } from 'playwright';
import { agentConfig, assertAgentConfig } from './config';
import { TaqadiPortal } from './taqadi-page';
import type { FilingPayload } from './types';

assertAgentConfig();

const jobId = process.argv[2];
if (!jobId) {
  throw new Error('Usage: npm run taqadi:verify-details -- <job-id>');
}

const response = await fetch(
  `${agentConfig.supabaseUrl}/rest/v1/taqadi_filing_jobs`
  + `?id=eq.${encodeURIComponent(jobId)}&select=payload`,
  {
    headers: {
      apikey: agentConfig.supabaseServiceRoleKey,
      Authorization: `Bearer ${agentConfig.supabaseServiceRoleKey}`,
    },
  },
);
const rows = await response.json() as Array<{ payload: FilingPayload }>;
if (!response.ok || !rows[0]?.payload) {
  throw new Error(`Unable to load filing payload: ${JSON.stringify(rows)}`);
}

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
  await portal.openNewCase();
  await portal.configureCase(rows[0].payload);
  console.log(JSON.stringify(await page.evaluate(`(() => ({
    titleFields: Array.from(document.querySelectorAll(
      '[id="applicantReferenceNo"]',
    )).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName,
        width: rect.width,
        height: rect.height,
        value: element.value || '',
      };
    }),
    visiblePanes: Array.from(document.querySelectorAll('.tab-pane'))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((element) => ({
        id: element.id,
        name: element.getAttribute('data-tabpane-name'),
        className: element.className,
      })),
  }))()`)));
  await portal.fillCaseDetails(rows[0].payload);

  console.log(JSON.stringify({
    ok: true,
    factsVisible: await page.locator('#facts').isVisible().catch(() => false),
    url: page.url(),
  }));
} finally {
  await context.close();
}
