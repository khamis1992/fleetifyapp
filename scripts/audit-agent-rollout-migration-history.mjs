#!/usr/bin/env node

/**
 * Read-only mapper between repository migrations and migrations fetched from
 * Supabase history. It detects the same SQL published under a different
 * timestamp, which the CLI's version-only list cannot express.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGETS = [
  {
    version: '20260826091101',
    anchors: ['legal_case_filing_block_reason_v1', 'finalize_legal_case_filing_v1'],
  },
  {
    version: '20260826095500',
    anchors: [
      'idx_legal_filing_repair_audit_contract_id',
      'guard_legal_case_filing_readiness_v1',
    ],
  },
  {
    version: '20260827111617',
    anchors: ['normalize_vehicle_plate', 'resolve_and_guard_contract_vehicle_identity'],
  },
  {
    version: '20260827152147',
    anchors: [
      'normalize_national_id',
      'guard_payment_invoice_identity',
      'contract_document_canonical_links',
      'close_stale_system_audit_reviews_v1',
    ],
  },
  {
    version: '20260827155145',
    anchors: ['approve_taqadi_reviewed_legal_file_v1'],
  },
  {
    version: '20260827155633',
    anchors: ['update_delinquent_customers'],
  },
  {
    version: '20260827172506',
    anchors: ['legal_notice_agent_jobs', 'finalize_automatic_formal_notice_dispatch_v1'],
  },
  {
    version: '20260827200727',
    anchors: ['missing_contract_pdf_requests', 'enqueue_missing_contract_pdf_request_v1'],
  },
  {
    version: '20260827203500',
    anchors: ['fulfill_missing_contract_pdf_request_v1', 'service_role'],
  },
  {
    version: '20260827204249',
    anchors: ['agent_safety_policies', 'verify_scheduled_agent_invocation_v2'],
  },
  {
    version: '20260828113000',
    anchors: ['agent_execution_runs', 'record_agent_mutation_v1'],
  },
];

const localDir = resolve(process.cwd(), 'supabase/migrations');
const remoteDir = resolve(
  process.cwd(),
  process.argv[2] || '.tmp/agent-rollout-preflight-20260828/supabase/migrations',
);

if (!existsSync(remoteDir)) {
  throw new Error(`Fetched remote migration directory not found: ${remoteDir}`);
}

const readMigrations = (directory) => readdirSync(directory)
  .filter((name) => /^\d+_.+\.sql$/i.test(name))
  .map((name) => {
    const sql = readFileSync(resolve(directory, name), 'utf8');
    return {
      name,
      version: name.match(/^(\d+)_/)?.[1] || '',
      normalizedSql: normalizeStructural(sql),
      exactHash: hash(normalizeExact(sql)),
      structuralHash: hash(normalizeStructural(sql)),
      bytes: Buffer.byteLength(sql),
    };
  });

const local = readMigrations(localDir);
const remote = readMigrations(remoteDir);
const remoteByVersion = group(remote, 'version');
const remoteByExactHash = group(remote, 'exactHash');
const remoteByStructuralHash = group(remote, 'structuralHash');

const targets = TARGETS.map(({ version, anchors }) => {
  const candidates = local.filter((item) => item.version === version);
  if (candidates.length !== 1) {
    return {
      version,
      status: candidates.length === 0 ? 'local_missing' : 'local_version_ambiguous',
      localFiles: candidates.map((item) => item.name),
      remoteFiles: [],
    };
  }
  const migration = candidates[0];
  const exactMatches = remoteByExactHash.get(migration.exactHash) || [];
  const structuralMatches = remoteByStructuralHash.get(migration.structuralHash) || [];
  const sameVersion = remoteByVersion.get(version) || [];
  const matches = exactMatches.length ? exactMatches : structuralMatches;
  const normalizedAnchors = anchors.map((anchor) => anchor.toLowerCase());
  const semanticCandidates = remote.filter((item) => normalizedAnchors.every(
    (anchor) => item.normalizedSql.includes(anchor),
  ));
  return {
    version,
    localFile: migration.name,
    status: exactMatches.length
      ? 'remote_exact_content_match'
      : structuralMatches.length
        ? 'remote_structural_content_match'
        : sameVersion.length
          ? 'remote_same_version_different_content'
          : semanticCandidates.length
            ? 'remote_semantic_candidate_requires_diff'
          : 'remote_content_missing',
    remoteFiles: matches.map((item) => item.name),
    sameVersionFiles: sameVersion.map((item) => item.name),
    semanticCandidateFiles: semanticCandidates.map((item) => item.name),
    anchors,
    localBytes: migration.bytes,
  };
});

const summary = targets.reduce((counts, target) => {
  counts[target.status] = (counts[target.status] || 0) + 1;
  return counts;
}, {});

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  mode: 'read_only',
  localMigrationCount: local.length,
  fetchedRemoteMigrationCount: remote.length,
  summary,
  targets,
}, null, 2));

function normalizeExact(sql) {
  return sql.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
}

function normalizeStructural(sql) {
  return normalizeExact(sql)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\s+/g, ' ')
    // `supabase migration fetch` may append an extra empty SQL statement.
    // Empty statements do not change PostgreSQL semantics, so ignore them.
    .replace(/;(\s*;)+(?=\s|$)/g, ';')
    .trim()
    .toLowerCase();
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function group(items, key) {
  const result = new Map();
  for (const item of items) {
    const value = item[key];
    result.set(value, [...(result.get(value) || []), item]);
  }
  return result;
}
