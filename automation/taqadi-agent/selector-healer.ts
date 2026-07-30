import Anthropic from '@anthropic-ai/sdk';
import { agentConfig } from './config';

// Propose-mode selector healer. When a Taqadi field lookup fails, this module
// asks Claude to read the page's accessibility tree and suggest updated
// labels/control ids. The suggestion is ONLY recorded for human review — the
// worker never acts on it. An operator ratifies a suggestion by copying the
// `overridesEntry` into `.taqadi-agent/selector-overrides.json`
// (see selector-overrides.ts).

export interface HealRequest {
  step: string;
  errorMessage: string;
  url: string | null;
  expectedLabels: string[];
  expectedControlIds: string[];
  ariaSnapshot: string;
}

export interface HealSuggestion {
  found: boolean;
  suggestedLabels: string[];
  suggestedControlIds: string[];
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
  overridesEntry: Record<
    string,
    { labels: string[]; controlIds: string[] }
  > | null;
}

const MAX_SNAPSHOT_CHARS = 60_000;

const suggestionSchema = {
  type: 'object',
  properties: {
    found: {
      type: 'boolean',
      description:
        'true only when a control matching the intent of the expected field exists in the snapshot',
    },
    suggestedLabels: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Visible label texts (exactly as written in the snapshot) that now identify the field',
    },
    suggestedControlIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'DOM ids or accessibility names of the matching control',
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    rationale: {
      type: 'string',
      description:
        'One or two sentences, in Arabic, explaining why this control matches',
    },
  },
  required: [
    'found',
    'suggestedLabels',
    'suggestedControlIds',
    'confidence',
    'rationale',
  ],
  additionalProperties: false,
} as const;

export function healerEnabled(): boolean {
  return Boolean(agentConfig.healer.apiKey);
}

export function buildHealPrompt(request: HealRequest): string {
  const snapshot = request.ariaSnapshot.length > MAX_SNAPSHOT_CHARS
    ? `${request.ariaSnapshot.slice(0, MAX_SNAPSHOT_CHARS)}\n…(truncated)`
    : request.ariaSnapshot;
  return [
    'An automation worker files lawsuits in the Qatari Taqadi court portal.',
    'A form-field lookup just failed, most likely because the portal UI changed.',
    '',
    `Failed step: ${request.step}`,
    `Error: ${request.errorMessage}`,
    `Page URL: ${request.url ?? 'unknown'}`,
    `Expected field labels (Arabic): ${JSON.stringify(request.expectedLabels)}`,
    `Expected control ids: ${JSON.stringify(request.expectedControlIds)}`,
    '',
    'Below is the accessibility snapshot of the page at the moment of failure.',
    'Find the control that serves the same purpose as the expected field.',
    'Report the exact label text and control id as they appear now.',
    'If no such control exists in the snapshot, set found=false.',
    '',
    '<accessibility_snapshot>',
    snapshot,
    '</accessibility_snapshot>',
  ].join('\n');
}

export function toHealSuggestion(
  raw: unknown,
  expectedLabels: string[],
): HealSuggestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const clean = (list: unknown): string[] =>
    Array.isArray(list)
      ? list.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
      : [];
  const suggestedLabels = clean(value.suggestedLabels);
  const suggestedControlIds = clean(value.suggestedControlIds);
  const found = value.found === true
    && (suggestedLabels.length > 0 || suggestedControlIds.length > 0);
  const confidence = value.confidence === 'high' || value.confidence === 'medium'
    ? value.confidence
    : 'low';
  const canonicalLabel = expectedLabels[0];
  return {
    found,
    suggestedLabels,
    suggestedControlIds,
    confidence,
    rationale: typeof value.rationale === 'string' ? value.rationale : '',
    overridesEntry: found && canonicalLabel
      ? {
          [canonicalLabel]: {
            labels: suggestedLabels,
            controlIds: suggestedControlIds,
          },
        }
      : null,
  };
}

export async function proposeSelectorHeal(
  request: HealRequest,
): Promise<HealSuggestion | null> {
  if (!healerEnabled()) return null;
  try {
    const client = new Anthropic({ apiKey: agentConfig.healer.apiKey });
    const response = await client.messages.create({
      model: agentConfig.healer.model,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: {
        format: {
          type: 'json_schema',
          schema: suggestionSchema as unknown as Record<string, unknown>,
        },
      },
      messages: [{ role: 'user', content: buildHealPrompt(request) }],
    });
    if (response.stop_reason === 'refusal') return null;
    const text = response.content.find(
      (block) => block.type === 'text',
    );
    if (!text || text.type !== 'text') return null;
    return toHealSuggestion(
      JSON.parse(text.text),
      request.expectedLabels,
    );
  } catch (error) {
    console.warn('[TaqadiAgent] selector healer failed (non-fatal):', error);
    return null;
  }
}
