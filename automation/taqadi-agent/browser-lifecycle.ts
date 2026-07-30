import type { BrowserContext, Page } from 'playwright';

export const PAGE_EVALUATION_RUNTIME = `
(() => {
  if (typeof globalThis.__name === 'function') return;
  Object.defineProperty(globalThis, '__name', {
    configurable: true,
    writable: true,
    value: (target, value) => Object.defineProperty(target, 'name', {
      configurable: true,
      value,
    }),
  });
})();
`;

export async function installEvaluationRuntime(
  context: BrowserContext,
  page: Page,
) {
  await context.addInitScript({ content: PAGE_EVALUATION_RUNTIME });
  await page.addInitScript({ content: PAGE_EVALUATION_RUNTIME });
  await page.evaluate(PAGE_EVALUATION_RUNTIME);
}

export function isClosedBrowserError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /target (?:page, )?context or browser has been closed/i.test(message)
    || /browser has been closed/i.test(message)
    || /context has been closed/i.test(message)
    || /targetclosederror/i.test(message);
}
