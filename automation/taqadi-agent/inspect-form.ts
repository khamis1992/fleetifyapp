import fs from 'node:fs/promises';
import path from 'node:path';
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
  const pages = context.pages();
  const page = pages[0] || await context.newPage();
  await page.goto(
    'https://taqadi.sjc.gov.qa/itc/home#/itc/f/caseinfo/create',
    { waitUntil: 'domcontentloaded', timeout: 60_000 },
  );
  await page.waitForTimeout(3_000);

  const diagnostics = await page.evaluate(`(() => {
    const normalize = (value) =>
      (value || '').replace(/\s+/g, ' ').trim();
    const target = Array.from(
      document.querySelectorAll('label, span, div, td, th'),
    ).find((element) => {
      const text = normalize(element.textContent);
      return text.includes('درجة التقاضي') && text.length < 40;
    });

    const describe = (element) => {
      if (!element) return null;
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        className: element.getAttribute('class'),
        role: element.getAttribute('role'),
        name: element.getAttribute('name'),
        text: normalize(element.textContent).slice(0, 200),
        html: element.outerHTML.slice(0, 2_000),
      };
    };

    const ancestors = [];
    let current = target;
    for (let depth = 0; current && depth < 7; depth += 1) {
      ancestors.push(describe(current));
      current = current.parentElement;
    }

    const controls = Array.from(
      document.querySelectorAll(
        [
          'select',
          'input',
          'button',
          '[role]',
          '[tabindex]',
          '[class*="select"]',
          '[class*="dropdown"]',
          '[class*="combo"]',
        ].join(','),
      ),
    )
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .slice(0, 250)
      .map(describe);

    return {
      url: window.location.href,
      target: describe(target || null),
      ancestors,
      controls,
    };
  })()`);

  const outputPath = path.join(
    agentConfig.dataDir,
    'taqadi-form-diagnostics.json',
  );
  await fs.writeFile(
    outputPath,
    JSON.stringify(diagnostics, null, 2),
    'utf8',
  );
  console.log(outputPath);
} finally {
  await context.close();
}
