import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { agentConfig, assertAgentConfig } from './config';
import { TaqadiPortal } from './taqadi-page';
import type { FilingPayload } from './types';

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
  await portal.configureCase({
    classification: {
      litigationDegree: 'ابتدائي',
      caseType: 'عقود الخدمات التجارية',
      caseSubtype: 'عقود إيجار السيارات وخدمات الليموزين',
      applicability: 'لا ينطبق',
    },
  } as FilingPayload);
  await page.waitForTimeout(1_000);

  const diagnostics = await page.evaluate(`(() => {
    const normalize = (value) =>
      (value || '').replace(/\\s+/g, ' ').trim();
    const describe = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        name: element.getAttribute('name'),
        className: element.getAttribute('class'),
        type: element.getAttribute('type'),
        role: element.getAttribute('role'),
        forId: element.getAttribute('for'),
        value: 'value' in element ? String(element.value || '') : null,
        text: normalize(element.textContent).slice(0, 300),
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        html: element.outerHTML.slice(0, 2_500),
      };
    };
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    return {
      url: window.location.href,
      labels: Array.from(document.querySelectorAll('label'))
        .filter(visible)
        .slice(0, 100)
        .map(describe),
      controls: Array.from(document.querySelectorAll([
        'input',
        'textarea',
        'select',
        'button',
        '[contenteditable="true"]',
        '[role="textbox"]',
        '[role="listbox"]',
      ].join(',')))
        .filter(visible)
        .slice(0, 180)
        .map(describe),
      frames: Array.from(document.querySelectorAll('iframe'))
        .filter(visible)
        .slice(0, 20)
        .map(describe),
      hiddenTextareas: Array.from(document.querySelectorAll('textarea'))
        .filter((element) => !visible(element))
        .slice(0, 30)
        .map(describe),
    };
  })()`);

  const outputPath = path.join(
    agentConfig.dataDir,
    'taqadi-case-details-diagnostics.json',
  );
  await fs.writeFile(outputPath, JSON.stringify(diagnostics, null, 2), 'utf8');
  console.log(outputPath);
} finally {
  await context.close();
}
