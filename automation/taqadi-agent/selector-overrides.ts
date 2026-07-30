import fs from 'node:fs';
import path from 'node:path';
import { agentConfig } from './config';

// Governance layer for selector healing: the worker NEVER applies an LLM
// proposal automatically. An operator reviews the heal_proposal artifact and,
// if correct, copies the suggested entry into
// `.taqadi-agent/selector-overrides.json`. Only ratified entries here extend
// the labels/control ids the portal automation searches for.
//
// File shape:
// {
//   "fields": {
//     "رقم السجل التجاري": {
//       "labels": ["رقم السجل التجاري الجديد"],
//       "controlIds": ["officialRegistrationNumber"]
//     }
//   }
// }

export interface FieldOverride {
  labels?: string[];
  controlIds?: string[];
}

export interface SelectorOverrides {
  fields: Record<string, FieldOverride>;
}

export interface FieldLookupInput {
  labels: string[];
  controlIds: string[];
}

const overridesFilePath = () =>
  path.join(agentConfig.dataDir, 'selector-overrides.json');

const cleanList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    )
    : [];

export function parseSelectorOverrides(raw: string): SelectorOverrides {
  const parsed = JSON.parse(raw) as { fields?: Record<string, FieldOverride> };
  const fields: Record<string, FieldOverride> = {};
  for (const [key, value] of Object.entries(parsed.fields ?? {})) {
    if (!value || typeof value !== 'object') continue;
    fields[key] = {
      labels: cleanList(value.labels),
      controlIds: cleanList(value.controlIds),
    };
  }
  return { fields };
}

// Pure merge used by the portal automation: extends (never replaces) the
// built-in labels and control ids, so a bad override can only add lookup
// candidates, not remove the ones that already work.
export function applyOverrides(
  overrides: SelectorOverrides,
  input: FieldLookupInput,
): FieldLookupInput {
  const matched = input.labels
    .map((label) => overrides.fields[label])
    .filter((entry): entry is FieldOverride => Boolean(entry));
  if (matched.length === 0) return input;

  const labels = [...input.labels];
  const controlIds = [...input.controlIds];
  for (const entry of matched) {
    for (const label of entry.labels ?? []) {
      if (!labels.includes(label)) labels.push(label);
    }
    for (const controlId of entry.controlIds ?? []) {
      if (!controlIds.includes(controlId)) controlIds.push(controlId);
    }
  }
  return { labels, controlIds };
}

let cachedOverrides: SelectorOverrides = { fields: {} };
let cachedMtimeMs: number | null = null;

// ==========================================
// Session overrides (المستوى الثاني)
// ==========================================
// Overrides verified and auto-applied during the CURRENT job only. They are
// never written to disk: the operator still ratifies them permanently via
// selector-overrides.json, but the job that discovered them may finish with
// them. Cleared whenever a fresh job pipeline starts.
let sessionOverrides: SelectorOverrides = { fields: {} };

export function addSessionOverride(
  canonicalLabel: string,
  entry: FieldOverride,
): void {
  if (!canonicalLabel.trim()) return;
  const existing = sessionOverrides.fields[canonicalLabel] ?? {};
  sessionOverrides = {
    fields: {
      ...sessionOverrides.fields,
      [canonicalLabel]: {
        labels: [
          ...(existing.labels ?? []),
          ...(entry.labels ?? []).filter((label) => !(existing.labels ?? []).includes(label)),
        ],
        controlIds: [
          ...(existing.controlIds ?? []),
          ...(entry.controlIds ?? []).filter((id) => !(existing.controlIds ?? []).includes(id)),
        ],
      },
    },
  };
}

export function clearSessionOverrides(): void {
  sessionOverrides = { fields: {} };
}

export function getSessionOverrides(): SelectorOverrides {
  return sessionOverrides;
}

// Reads the ratified overrides, re-parsing only when the file changes so the
// operator can add an entry without restarting the worker.
export function loadSelectorOverrides(): SelectorOverrides {
  const filePath = overridesFilePath();
  let mtimeMs: number | null = null;
  try {
    mtimeMs = fs.statSync(filePath).mtimeMs;
  } catch {
    cachedOverrides = { fields: {} };
    cachedMtimeMs = null;
    return cachedOverrides;
  }

  if (mtimeMs === cachedMtimeMs) return cachedOverrides;
  try {
    cachedOverrides = parseSelectorOverrides(fs.readFileSync(filePath, 'utf8'));
    cachedMtimeMs = mtimeMs;
  } catch (error) {
    console.warn(
      '[TaqadiAgent] selector-overrides.json is invalid and was ignored:',
      error,
    );
    cachedOverrides = { fields: {} };
    cachedMtimeMs = mtimeMs;
  }
  return cachedOverrides;
}

export function expandFieldLookup(
  labels: string[],
  controlIds: string[],
): FieldLookupInput {
  // Ratified file entries first, then session entries on top — both extend
  // only, so neither can remove a lookup candidate that already works.
  return applyOverrides(
    sessionOverrides,
    applyOverrides(loadSelectorOverrides(), { labels, controlIds }),
  );
}
