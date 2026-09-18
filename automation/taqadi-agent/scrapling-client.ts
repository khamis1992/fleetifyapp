import { agentConfig } from './config';
import type {
  ObservedControl,
  PortalObservation,
} from './portal-observer';
import type { HealSuggestion } from './selector-healer';

interface AdaptiveSeed {
  identifier: string;
  selector: string;
}

type AdaptiveQuery = AdaptiveSeed;

interface ScraplingMatch {
  identifier: string;
  source: 'direct' | 'adaptive';
  similarity: number | null;
  id: string | null;
  name: string | null;
  label: string;
  cssSelector: string | null;
  xpathSelector: string | null;
}

interface ResolveResponse {
  matches?: ScraplingMatch[];
}

export interface ScraplingHealLookup {
  expectedLabels: string[];
  expectedControlIds: string[];
}

const rememberedFingerprints = new Set<string>();
const pendingFingerprints = new Set<string>();
const MAX_FINGERPRINTS = 300;
let lastWarningAt = 0;

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
const unique = (values: string[]) => [...new Set(values.map(normalize).filter(Boolean))];

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const attributeSelector = (attribute: 'id' | 'name' | 'data-adaptive-label', value: string) =>
  `[${attribute}="${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"]`;

const syntheticTag = (control: ObservedControl) => {
  if (control.tag === 'textarea' || control.tag === 'select') return control.tag;
  return 'input';
};

/**
 * Create a value-free document for adaptive matching. This intentionally does
 * not serialize the live DOM, case text, field values, or uploaded documents.
 */
export function buildRedactedControlHtml(observation: PortalObservation): string {
  const controls = observation.controls.slice(0, 250).map((control, index) => {
    const tag = syntheticTag(control);
    const label = normalize(control.label);
    const generatedId = control.id || `redacted-control-${index}`;
    const attributes = [
      `id="${escapeHtml(generatedId)}"`,
      control.name ? `name="${escapeHtml(control.name)}"` : '',
      control.type && tag === 'input' ? `type="${escapeHtml(control.type)}"` : '',
      control.role ? `role="${escapeHtml(control.role)}"` : '',
      label ? `aria-label="${escapeHtml(label)}"` : '',
      label ? `data-adaptive-label="${escapeHtml(label)}"` : '',
      `data-visible="${control.visible === false ? 'false' : 'true'}"`,
      control.required ? 'required' : '',
      control.disabled ? 'disabled' : '',
    ].filter(Boolean).join(' ');
    const field = tag === 'input'
      ? `<input ${attributes}>`
      : `<${tag} ${attributes}></${tag}>`;
    return `<section data-control-index="${index}">`
      + (label ? `<label for="${escapeHtml(generatedId)}">${escapeHtml(label)}</label>` : '')
      + field
      + '</section>';
  }).join('');
  return '<!doctype html><html><head><meta charset="utf-8"></head>'
    + `<body data-page-kind="${escapeHtml(observation.pageKind || 'unknown')}">${controls}</body></html>`;
}

export function buildAdaptiveSeeds(observation: PortalObservation): AdaptiveSeed[] {
  const seeds: AdaptiveSeed[] = [];
  for (const control of observation.controls.slice(0, 250)) {
    if (control.id) {
      seeds.push({
        identifier: `id:${control.id}`,
        selector: attributeSelector('id', control.id),
      });
    }
    if (control.name) {
      seeds.push({
        identifier: `name:${control.name}`,
        selector: attributeSelector('name', control.name),
      });
    }
    const label = normalize(control.label);
    if (label) {
      seeds.push({
        identifier: `label:${label}`,
        selector: attributeSelector('data-adaptive-label', label),
      });
    }
  }
  return [...new Map(seeds.map((seed) => [seed.identifier, seed])).values()]
    .slice(0, 300);
}

export function buildAdaptiveQueries(lookup: ScraplingHealLookup): AdaptiveQuery[] {
  const queries: AdaptiveQuery[] = [];
  for (const id of unique(lookup.expectedControlIds)) {
    queries.push({ identifier: `id:${id}`, selector: attributeSelector('id', id) });
    queries.push({ identifier: `name:${id}`, selector: attributeSelector('name', id) });
  }
  for (const label of unique(lookup.expectedLabels)) {
    queries.push({
      identifier: `label:${label}`,
      selector: attributeSelector('data-adaptive-label', label),
    });
  }
  return [...new Map(queries.map((query) => [query.identifier, query])).values()]
    .slice(0, 40);
}

function warnNonFatal(message: string, error: unknown) {
  if (Date.now() - lastWarningAt < 60_000) return;
  lastWarningAt = Date.now();
  console.warn(`[TaqadiAgent] ${message} (non-fatal):`, error);
}

async function postSidecar<T>(path: string, body: unknown): Promise<T | null> {
  if (!agentConfig.scrapling.enabled) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), agentConfig.scrapling.timeoutMs);
  try {
    const response = await fetch(new URL(path, agentConfig.scrapling.baseUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${agentConfig.scrapling.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Scrapling sidecar returned HTTP ${response.status}`);
    return await response.json() as T;
  } catch (error) {
    warnNonFatal('Scrapling adaptive layer is unavailable', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function redactedSnapshot(observation: PortalObservation) {
  const html = buildRedactedControlHtml(observation);
  if (Buffer.byteLength(html, 'utf8') > agentConfig.scrapling.maxHtmlBytes) {
    return null;
  }
  return html;
}

export function scraplingEnabled(): boolean {
  return agentConfig.scrapling.enabled;
}

/** Remember a successful page shape without blocking the filing loop. */
export async function rememberPortalObservation(
  observation: PortalObservation,
): Promise<boolean> {
  if (!agentConfig.scrapling.enabled) return false;
  const seeds = buildAdaptiveSeeds(observation);
  if (seeds.length === 0) return false;
  const fingerprint = `${observation.url}|${seeds.map((seed) => seed.identifier).join('|')}`;
  if (
    rememberedFingerprints.has(fingerprint)
    || pendingFingerprints.has(fingerprint)
  ) return true;
  const html = redactedSnapshot(observation);
  if (!html) return false;
  pendingFingerprints.add(fingerprint);
  try {
    const response = await postSidecar<{ remembered?: number }>('/v1/remember', {
      url: observation.url,
      html,
      seeds,
    });
    if (!response) return false;
    if (rememberedFingerprints.size >= MAX_FINGERPRINTS) rememberedFingerprints.clear();
    rememberedFingerprints.add(fingerprint);
    return true;
  } finally {
    pendingFingerprints.delete(fingerprint);
  }
}

/** Ask Scrapling first; the caller must still run deterministic live verification. */
export async function proposeScraplingHeal(
  observation: PortalObservation,
  lookup: ScraplingHealLookup,
): Promise<HealSuggestion | null> {
  if (!agentConfig.scrapling.enabled) return null;
  const queries = buildAdaptiveQueries(lookup);
  const html = redactedSnapshot(observation);
  if (!html || queries.length === 0) return null;
  const response = await postSidecar<ResolveResponse>('/v1/resolve', {
    url: observation.url,
    html,
    queries,
    percentage: agentConfig.scrapling.minSimilarity,
  });
  const matches = response?.matches?.filter((match) =>
    match
    && (match.id || match.name || normalize(match.label || ''))
    && (match.source === 'direct'
      || (typeof match.similarity === 'number'
        && match.similarity >= agentConfig.scrapling.minSimilarity))) || [];
  if (matches.length === 0) return null;

  const suggestedLabels = unique(matches.map((match) => match.label || ''));
  const suggestedControlIds = unique(matches.flatMap((match) => [
    match.id || '',
    match.name || '',
  ]));
  const canonicalLabel = lookup.expectedLabels[0];
  if (!canonicalLabel || (suggestedLabels.length === 0 && suggestedControlIds.length === 0)) {
    return null;
  }
  const adaptiveCount = matches.filter((match) => match.source === 'adaptive').length;
  return {
    found: true,
    suggestedLabels,
    suggestedControlIds,
    confidence: 'high',
    rationale: adaptiveCount > 0
      ? `استعاد Scrapling محلياً ${adaptiveCount} حقلاً من ذاكرة البنية التكيفية؛ يلزم التحقق الحتمي من الصفحة الحية.`
      : 'وجد Scrapling الحقل مباشرة في خريطة الحقول المنزوعة القيم؛ يلزم التحقق الحتمي من الصفحة الحية.',
    overridesEntry: {
      [canonicalLabel]: {
        labels: suggestedLabels,
        controlIds: suggestedControlIds,
      },
    },
  };
}
