import { chromium } from 'playwright';
import { agentConfig } from './config';

const context = await chromium.launchPersistentContext(
  agentConfig.chromeProfileDir,
  {
    channel: 'chrome',
    headless: true,
    locale: 'ar-QA',
  },
);

try {
  await context.clearCookies();
  const page = context.pages()[0] || await context.newPage();
  for (const url of [
    'https://taqadi.sjc.gov.qa/itc/login',
    'https://www.tawtheeq.gov.qa/',
  ]) {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    }).catch(() => undefined);
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }).catch(() => undefined);
  }
  console.log('[TaqadiAgent] Browser authentication session cleared');
} finally {
  await context.close();
}
