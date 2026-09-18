import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  chromium,
  type BrowserContext,
  type Page,
} from 'playwright';
import {
  installEvaluationRuntime,
  isClosedBrowserError,
  PAGE_EVALUATION_RUNTIME,
} from '../browser-lifecycle';
import { TaqadiWorker } from '../runner';

vi.mock('playwright', () => ({
  chromium: {
    launchPersistentContext: vi.fn(),
  },
}));

function fakePage(closed = false) {
  return {
    isClosed: vi.fn(() => closed),
    on: vi.fn(),
    addInitScript: vi.fn(async () => undefined),
    evaluate: vi.fn(async () => undefined),
    bringToFront: vi.fn(async () => undefined),
    goto: vi.fn(async () => undefined),
    reload: vi.fn(async () => undefined),
  } as unknown as Page;
}

function fakeContext(input: {
  pages?: Page[];
  newPage?: () => Promise<Page>;
  cookies?: Parameters<BrowserContext['addCookies']>[0];
}) {
  let connected = true;
  let closeHandler: (() => void) | null = null;
  const context = {
    browser: vi.fn(() => ({
      isConnected: () => connected,
    })),
    pages: vi.fn(() => input.pages || []),
    newPage: vi.fn(input.newPage || (async () => fakePage())),
    cookies: vi.fn(async () => input.cookies || []),
    addCookies: vi.fn(async () => undefined),
    addInitScript: vi.fn(async () => undefined),
    setDefaultTimeout: vi.fn(),
    on: vi.fn((event: string, handler: () => void) => {
      if (event === 'close') closeHandler = handler;
    }),
    close: vi.fn(async () => {
      connected = false;
      closeHandler?.();
    }),
  } as unknown as BrowserContext;
  return context;
}

describe('Taqadi browser lifecycle', () => {
  beforeEach(() => {
    vi.mocked(chromium.launchPersistentContext).mockReset();
  });

  it.each([
    'browserContext.newPage: Target page, context or browser has been closed',
    'TargetClosedError: Target page, context or browser has been closed',
    'Browser has been closed',
    'Context has been closed',
  ])('recognizes a closed browser error: %s', (message) => {
    expect(isClosedBrowserError(new Error(message))).toBe(true);
  });

  it('does not classify ordinary portal errors as a closed browser', () => {
    expect(isClosedBrowserError(
      new Error('The requested URL was rejected'),
    )).toBe(false);
  });

  it('installs the TypeScript evaluation helper now and after navigation', async () => {
    const page = fakePage();
    const context = fakeContext({ pages: [page] });

    await installEvaluationRuntime(context, page);

    expect(context.addInitScript).toHaveBeenCalledWith({
      content: PAGE_EVALUATION_RUNTIME,
    });
    expect(page.addInitScript).toHaveBeenCalledWith({
      content: PAGE_EVALUATION_RUNTIME,
    });
    expect(page.evaluate).toHaveBeenCalledWith(PAGE_EVALUATION_RUNTIME);
  });

  it('opens a fresh context when newPage reports that Chrome was closed', async () => {
    const staleContext = fakeContext({
      pages: [],
      newPage: async () => {
        throw new Error(
          'browserContext.newPage: Target page, context or browser has been closed',
        );
      },
    });
    const replacementPage = fakePage();
    const replacementContext = fakeContext({ pages: [replacementPage] });
    vi.mocked(chromium.launchPersistentContext)
      .mockResolvedValueOnce(staleContext)
      .mockResolvedValueOnce(replacementContext);

    const worker = new TaqadiWorker() as unknown as {
      getPage: () => Promise<Page>;
    };
    const page = await worker.getPage();

    expect(page).toBe(replacementPage);
    expect(chromium.launchPersistentContext).toHaveBeenCalledTimes(2);
    expect(staleContext.close).toHaveBeenCalledOnce();
    expect(replacementPage.evaluate).toHaveBeenCalledWith(
      PAGE_EVALUATION_RUNTIME,
    );
  });

  it('launches the persistent Chrome profile with extension support enabled', async () => {
    const page = fakePage();
    const context = fakeContext({ pages: [page] });
    vi.mocked(chromium.launchPersistentContext).mockResolvedValueOnce(context);

    const worker = new TaqadiWorker() as unknown as {
      getPage: () => Promise<Page>;
    };
    await worker.getPage();

    expect(chromium.launchPersistentContext).toHaveBeenCalledWith(
      expect.stringContaining('chrome-profile'),
      expect.objectContaining({
        channel: 'chrome',
        ignoreDefaultArgs: expect.arrayContaining([
          '--disable-extensions',
          '--disable-component-extensions-with-background-pages',
          '--disable-component-update',
        ]),
      }),
    );
  });

  it('keeps Chrome open and reuses the current tab for a portal-flow retry', async () => {
    const page = fakePage();
    const context = fakeContext({
      pages: [page],
    });
    const worker = new TaqadiWorker() as unknown as {
      context: BrowserContext | null;
      page: Page | null;
      prepareBrowserForPortalRetry: () => Promise<void>;
    };
    worker.context = context;
    worker.page = page;

    await worker.prepareBrowserForPortalRetry();

    expect(context.close).not.toHaveBeenCalled();
    expect(worker.context).toBe(context);
    expect(worker.page).toBe(page);
    expect(page.bringToFront).toHaveBeenCalledOnce();
    expect(page.goto).toHaveBeenCalledWith(
      'https://taqadi.sjc.gov.qa/itc/home',
      expect.objectContaining({ waitUntil: 'domcontentloaded' }),
    );
  });
});
