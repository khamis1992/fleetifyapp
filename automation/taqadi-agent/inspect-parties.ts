import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { agentConfig, assertAgentConfig } from './config';
import { TaqadiPortal } from './taqadi-page';
import type { FilingPayload } from './types';

assertAgentConfig();

const jobId = process.argv[2];
if (!jobId) {
  throw new Error('Usage: npm run taqadi:inspect-parties -- <job-id>');
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
  await portal.fillCaseDetails(rows[0].payload);

  const diagnostics = await page.evaluate(`(() => {
    const normalize = (value) =>
      (value || '').replace(/\\s+/g, ' ').trim();
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
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
        text: normalize(element.textContent).slice(0, 500),
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        html: element.outerHTML.slice(0, 3_000),
      };
    };
    return {
      url: window.location.href,
      panes: Array.from(document.querySelectorAll('.tab-pane'))
        .filter(visible)
        .map(describe),
      actions: Array.from(document.querySelectorAll(
        'button, a, [role="button"]',
      ))
        .filter(visible)
        .slice(0, 120)
        .map(describe),
      labels: Array.from(document.querySelectorAll('label'))
        .filter(visible)
        .slice(0, 120)
        .map(describe),
      controls: Array.from(document.querySelectorAll(
        'input, textarea, select, [role="listbox"], [role="combobox"]',
      ))
        .filter(visible)
        .slice(0, 180)
        .map(describe),
      rows: Array.from(document.querySelectorAll(
        'tr, [role="row"], .party-card, [class*="party"]',
      ))
        .filter(visible)
        .slice(0, 100)
        .map(describe),
    };
  })()`);

  const outputPath = path.join(
    agentConfig.dataDir,
    'taqadi-parties-diagnostics.json',
  );
  await fs.writeFile(outputPath, JSON.stringify(diagnostics, null, 2), 'utf8');
  console.log(outputPath);

  const representativeRow = page
    .locator('.tab-pane.active tr[role="row"]')
    .filter({ hasText: agentConfig.representative.name });
  if (await representativeRow.isVisible().catch(() => false)) {
    await representativeRow.click();
    await page.waitForTimeout(3_000);

    const editDiagnostics = await page.evaluate(`(() => {
      const normalize = (value) =>
        (value || '').replace(/\\s+/g, ' ').trim();
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const describe = (element) => ({
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        name: element.getAttribute('name'),
        className: element.getAttribute('class'),
        type: element.getAttribute('type'),
        role: element.getAttribute('role'),
        forId: element.getAttribute('for'),
        value: 'value' in element ? String(element.value || '') : null,
        text: normalize(element.textContent).slice(0, 500),
        html: element.outerHTML.slice(0, 3_000),
      });
      return {
        url: window.location.href,
        bodyText: normalize(document.body.innerText).slice(-5000),
        dialogs: Array.from(document.querySelectorAll(
          '.modal, .modal-backdrop, [role="dialog"], iframe',
        ))
          .map(describe),
        labels: Array.from(document.querySelectorAll('label'))
          .filter(visible)
          .slice(0, 150)
          .map(describe),
        controls: Array.from(document.querySelectorAll(
          'input, textarea, select, [role="listbox"], [role="combobox"]',
        ))
          .filter(visible)
          .slice(0, 200)
          .map(describe),
        actions: Array.from(document.querySelectorAll(
          'button, a, [role="button"]',
        ))
          .filter(visible)
          .slice(0, 150)
          .map(describe),
      };
    })()`);
    const editOutputPath = path.join(
      agentConfig.dataDir,
      'taqadi-representative-edit-diagnostics.json',
    );
    await fs.writeFile(
      editOutputPath,
      JSON.stringify(editDiagnostics, null, 2),
      'utf8',
    );
    console.log(editOutputPath);

    await page.screenshot({
      path: path.join(
        agentConfig.dataDir,
        'taqadi-representative-edit-diagnostics.png',
      ),
      fullPage: true,
    });

    if (process.argv[3] === 'representative') {
      await context.close();
      process.exit(0);
    }

    const modal = page.locator('.modal.in, .modal.show, [role="dialog"]')
      .last();
    const saveLinks = modal
      .locator('button, a.btn')
      .filter({ hasText: 'حفظ' });
    const saveLink = saveLinks.last();
    if (await saveLink.isVisible().catch(() => false)) {
      await saveLink.click();
      await page.locator('.modal-backdrop').waitFor({
        state: 'hidden',
        timeout: 10_000,
      });
    }

    const addParty = page.locator(
      '.tab-pane.active button[title="إضافة طرف"]',
    );
    if (await addParty.isVisible().catch(() => false)) {
      await addParty.click();
      await page.waitForTimeout(1_000);
      const addDiagnostics = await page.evaluate(`(() => {
        const normalize = (value) =>
          (value || '').replace(/\\s+/g, ' ').trim();
        const visible = (element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };
        const describe = (element) => ({
          tag: element.tagName.toLowerCase(),
          id: element.id || null,
          name: element.getAttribute('name'),
          className: element.getAttribute('class'),
          type: element.getAttribute('type'),
          role: element.getAttribute('role'),
          forId: element.getAttribute('for'),
          value: 'value' in element ? String(element.value || '') : null,
          text: normalize(element.textContent).slice(0, 500),
          html: element.outerHTML.slice(0, 3_000),
        });
        return {
          labels: Array.from(document.querySelectorAll('label'))
            .filter(visible)
            .slice(0, 150)
            .map(describe),
          controls: Array.from(document.querySelectorAll(
            'input, textarea, select, [role="listbox"], [role="combobox"]',
          ))
            .filter(visible)
            .slice(0, 200)
            .map(describe),
          actions: Array.from(document.querySelectorAll(
            'button, a, [role="button"]',
          ))
            .filter(visible)
            .slice(0, 150)
            .map(describe),
        };
      })()`);
      const addOutputPath = path.join(
        agentConfig.dataDir,
        'taqadi-add-party-diagnostics.json',
      );
      await fs.writeFile(
        addOutputPath,
        JSON.stringify(addDiagnostics, null, 2),
        'utf8',
      );
      console.log(addOutputPath);

      const selectField = (
        portal as unknown as {
          selectField: (
            labels: string[],
            optionText: string,
            controlIds: string[],
          ) => Promise<void>;
        }
      ).selectField.bind(portal);
      await selectField(['تصنيف الطرف'], 'شركة', ['category']);
      await page.waitForTimeout(800);

      const companyDiagnostics = await page.evaluate(`(() => {
        const normalize = (value) =>
          (value || '').replace(/\\s+/g, ' ').trim();
        const visible = (element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };
        const describe = (element) => ({
          tag: element.tagName.toLowerCase(),
          id: element.id || null,
          name: element.getAttribute('name'),
          className: element.getAttribute('class'),
          type: element.getAttribute('type'),
          role: element.getAttribute('role'),
          forId: element.getAttribute('for'),
          value: 'value' in element ? String(element.value || '') : null,
          text: normalize(element.textContent).slice(0, 800),
          html: element.outerHTML.slice(0, 3_500),
        });
        return {
          labels: Array.from(document.querySelectorAll('label'))
            .filter(visible)
            .slice(0, 180)
            .map(describe),
          controls: Array.from(document.querySelectorAll(
            'input, textarea, select, [role="listbox"], [role="combobox"]',
          ))
            .filter(visible)
            .slice(0, 220)
            .map(describe),
        };
      })()`);
      const companyOutputPath = path.join(
        agentConfig.dataDir,
        'taqadi-company-party-diagnostics.json',
      );
      await fs.writeFile(
        companyOutputPath,
        JSON.stringify(companyDiagnostics, null, 2),
        'utf8',
      );
      console.log(companyOutputPath);
    }
  }
} finally {
  await context.close();
}
