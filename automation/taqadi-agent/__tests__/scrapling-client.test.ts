import { afterEach, describe, expect, it, vi } from 'vitest';
import { agentConfig } from '../config';
import type { PortalObservation } from '../portal-observer';
import {
  buildAdaptiveQueries,
  buildAdaptiveSeeds,
  buildRedactedControlHtml,
  proposeScraplingHeal,
  rememberPortalObservation,
} from '../scrapling-client';

const original = { ...agentConfig.scrapling };

const observation = (url = 'https://taqadi.sjc.gov.qa/itc/form'):
PortalObservation => ({
  capturedAt: '2026-08-28T00:00:00.000Z',
  url,
  title: 'تقاضي',
  headings: ['بيانات الدعوى'],
  activeTabs: [],
  buttons: ['التالي'],
  links: [],
  dialogs: [],
  validationMessages: [],
  controls: [{
    tag: 'input',
    type: 'text',
    id: 'CaseType',
    name: 'caseType',
    role: null,
    label: 'نوع الدعوى',
    required: true,
    invalid: false,
    disabled: false,
    hasValue: true,
    visible: true,
  }],
  knownValueMatches: ['caseTitle'],
  pageKind: 'case_wizard',
  activeWizardSteps: ['بيانات الدعوى'],
  activePanels: [],
});

afterEach(() => {
  Object.assign(agentConfig.scrapling, original);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Scrapling client', () => {
  it('builds a value-free HTML control map and stable identifiers', () => {
    const snapshot = observation();
    const html = buildRedactedControlHtml(snapshot);
    expect(html).toContain('data-adaptive-label="نوع الدعوى"');
    expect(html).toContain('id="CaseType"');
    expect(html).not.toContain('caseTitle');
    expect(html).not.toContain('hasValue');
    expect(buildAdaptiveSeeds(snapshot)).toEqual(expect.arrayContaining([
      { identifier: 'id:CaseType', selector: '[id="CaseType"]' },
      { identifier: 'name:caseType', selector: '[name="caseType"]' },
      {
        identifier: 'label:نوع الدعوى',
        selector: '[data-adaptive-label="نوع الدعوى"]',
      },
    ]));
  });

  it('does not call the sidecar while the feature is disabled', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    agentConfig.scrapling.enabled = false;
    expect(await rememberPortalObservation(observation())).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('authenticates and remembers a redacted portal observation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ remembered: 3 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    Object.assign(agentConfig.scrapling, {
      enabled: true,
      token: '12345678901234567890123456789012',
      baseUrl: 'http://127.0.0.1:4318',
    });

    expect(await rememberPortalObservation(observation('/itc/form'))).toBe(true);
    const [url, request] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('http://127.0.0.1:4318/v1/remember');
    expect(request.headers.authorization).toBe(
      'Bearer 12345678901234567890123456789012',
    );
    const payload = JSON.parse(request.body);
    expect(payload.html).not.toContain('caseTitle');
    expect(payload.seeds).toHaveLength(3);
  });

  it('turns a high-similarity adaptive match into a verified-healer proposal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        matches: [{
          identifier: 'id:OldCaseType',
          source: 'adaptive',
          similarity: 93,
          id: 'NewCaseType',
          name: 'caseTypeV2',
          label: 'نوع الدعوى الجديد',
          cssSelector: '#NewCaseType',
          xpathSelector: '//*[@id="NewCaseType"]',
        }],
      }),
    }));
    Object.assign(agentConfig.scrapling, {
      enabled: true,
      token: '12345678901234567890123456789012',
      baseUrl: 'http://127.0.0.1:4318',
      minSimilarity: 80,
    });

    const suggestion = await proposeScraplingHeal(observation(), {
      expectedLabels: ['نوع الدعوى'],
      expectedControlIds: ['OldCaseType'],
    });
    expect(suggestion).toMatchObject({
      found: true,
      confidence: 'high',
      suggestedLabels: ['نوع الدعوى الجديد'],
      suggestedControlIds: ['NewCaseType', 'caseTypeV2'],
    });
    expect(suggestion?.overridesEntry?.['نوع الدعوى']).toBeDefined();
  });

  it('builds both id and label recovery queries', () => {
    expect(buildAdaptiveQueries({
      expectedLabels: ['نوع الدعوى'],
      expectedControlIds: ['CaseType'],
    })).toHaveLength(3);
  });
});

