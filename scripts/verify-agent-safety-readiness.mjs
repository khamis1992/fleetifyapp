#!/usr/bin/env node

/**
 * Read-only production acceptance check for Fleetify autonomous-agent safety.
 * It never prints keys, customer names, national IDs, phone numbers, or file paths.
 */
import { createClient } from '@supabase/supabase-js';
import { requireSupabaseScriptConfig } from './_shared/supabase-env.mjs';

const REQUIRED_AGENTS = [
  'system-audit-orchestrator',
  'system-audit-review-task-sync',
  'agent-operational-alerts',
  'violation-inbox-processor',
  'traffic-mail-ingest',
  'nightly-ops-auditor',
  'smart-contract-assigner',
  'customer-duplicate-detector',
  'customer-proposal-ai-reviewer',
  'contract-id-scanner',
  'contract-terms-scanner',
  'legal-notice-agent',
  'missing-contract-pdf-agent',
  'taqadi-filing-agent',
  'legal-case-ai-reviewer',
  'payment-match-agent',
  'collection-message-agent',
  'correction-verifier-agent',
  'customer-id-autofill-agent',
  'daily-closeout-ai-reviewer',
  'journal-entry-ai-reviewer',
  'intelligent-contract-processor',
  'excel-import-ai-reviewer',
  'historical-invoice-backfill',
  'monthly-contract-invoice-reconciliation',
  'generate-monthly-invoices',
  'monthly-vehicle-depreciation',
  'payment-reminder-agent',
  'legal-judgment-payment-matcher',
  'daily-contract-health-guard',
  'daily-legal-workflow-guard',
  'update-delinquent-customers',
  'close-stale-system-audit-reviews',
  'safe-auto-repair',
  'daily-audit-agent',
  'legacy-legal-case-trigger',
  'legacy-daily-report-agent',
  'legacy-weekly-report-agent',
  'legacy-traffic-fine-webhook',
  'legacy-monitoring-collector',
  'legacy-whatsapp-document-sender',
  'legacy-public-legal-document-upload',
];

const REQUIRED_MACHINE_IDENTITIES = [
  'system-audit-orchestrator',
  'violation-inbox-processor',
  'traffic-mail-ingest',
  'nightly-ops-auditor',
  'smart-contract-assigner',
  'customer-duplicate-detector',
  'customer-proposal-ai-reviewer',
  'contract-id-scanner',
  'contract-terms-scanner',
  'legal-notice-agent',
  'missing-contract-pdf-agent',
  'generate-monthly-invoices',
  'monthly-vehicle-depreciation',
  'payment-reminder-agent',
];

const REQUIRED_TABLE_COLUMNS = {
  agent_invocation_registry: [
    'agent_id', 'vault_secret_name', 'allowed_company_id', 'enabled',
  ],
  agent_safety_policies: [
    'agent_id', 'execution_mode', 'risk_level', 'conflict_group',
    'max_mutations_per_run', 'max_findings_per_run', 'max_attempts',
    'requires_before_after', 'requires_postcondition', 'escalation_after',
    'data_classification', 'execution_ledger_enabled',
  ],
  agent_invocation_leases: ['company_id', 'conflict_group', 'agent_id', 'request_id', 'expires_at'],
  agent_safety_events: ['company_id', 'agent_id', 'request_id', 'operation', 'outcome', 'reason_code'],
  agent_execution_runs: ['company_id', 'agent_id', 'request_id', 'status', 'mutation_count', 'started_at'],
  agent_execution_mutations: [
    'run_id', 'company_id', 'agent_id', 'operation', 'entity_type', 'entity_id',
    'idempotency_key', 'before_state', 'after_state', 'postcondition', 'verified',
  ],
  missing_contract_pdf_upload_tokens: [
    'request_id', 'company_id', 'contract_id', 'token_hash', 'expires_at',
    'claimed_at', 'claim_nonce', 'used_at', 'uploaded_document_id',
  ],
  outbound_whatsapp_commands: [
    'company_id', 'requested_by', 'purpose', 'entity_type', 'entity_id',
    'recipient_last4', 'recipient_hash', 'message_hash', 'idempotency_key',
    'dedupe_key', 'status', 'attempt_count', 'provider_message_id', 'error_code',
  ],
  contract_documents: [
    'company_id', 'contract_id', 'file_path', 'document_type',
    'legal_identity_match_status', 'legal_identity_expires_at',
    'legal_evidence_state', 'superseded_by_document_id', 'ocr_quality_score',
  ],
  lawsuit_preparations: ['company_id', 'contract_id', 'source_document_id'],
  taqadi_filing_jobs: ['company_id', 'contract_id', 'lawsuit_preparation_id', 'source_document_id'],
  contract_document_canonical_links: [
    'company_id', 'document_id', 'source_contract_id', 'canonical_contract_id',
    'link_status', 'confidence', 'match_basis',
  ],
};

const REQUIRED_RPCS = [
  'verify_scheduled_agent_invocation_v2',
  'begin_trusted_agent_invocation_v1',
  'apply_customer_merge_proposal_v1',
  'apply_customer_id_scan_proposal_v1',
  'record_agent_mutation_v1',
  'finish_agent_execution_v1',
  'process_vehicle_depreciation_monthly_agent_v1',
  'finalize_user_account_creation_v1',
  'transfer_user_to_company',
  'timeout_stale_agent_executions_v1',
  'get_direct_signed_contract_evidence_state_v1',
  'get_agent_safety_inventory_v1',
  'get_agent_safety_data_health_v1',
  'issue_missing_contract_pdf_upload_token_v1',
  'resolve_missing_contract_pdf_upload_token_v1',
  'claim_missing_contract_pdf_upload_token_v1',
  'release_missing_contract_pdf_upload_token_claim_v1',
  'consume_missing_contract_pdf_upload_token_v1',
  'escalate_stale_missing_contract_pdf_requests_v1',
  'upsert_agent_operational_alert_task_v1',
  'normalize_national_id',
  'close_stale_system_audit_reviews_v1',
  'update_delinquent_customers',
];

const checks = [];
const add = (name, ok, detail) => checks.push({ name, ok, detail });

async function main() {
  const { url, key } = requireSupabaseScriptConfig({ serviceRole: true });
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const service = createClient(url, key, { auth: { persistSession: false } });

  const openApiResponse = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' },
  });
  const openApi = openApiResponse.ok ? await openApiResponse.json() : null;
  add('postgrest_schema_available', Boolean(openApi), `http_${openApiResponse.status}`);

  const definitions = openApi?.definitions || {};
  for (const [table, columns] of Object.entries(REQUIRED_TABLE_COLUMNS)) {
    const available = new Set(Object.keys(definitions[table]?.properties || {}));
    const missing = columns.filter((column) => !available.has(column));
    add(`schema:${table}`, missing.length === 0, missing.length ? `missing:${missing.join(',')}` : 'all_required_columns_present');
  }
  for (const rpc of REQUIRED_RPCS) {
    add(`rpc:${rpc}`, Boolean(openApi?.paths?.[`/rpc/${rpc}`]), openApi?.paths?.[`/rpc/${rpc}`] ? 'present' : 'missing');
  }

  const { data: policies, error: policyError } = await service
    .from('agent_safety_policies')
    .select('agent_id,enabled,execution_ledger_enabled');
  const policyMap = new Map((policies || []).map((policy) => [policy.agent_id, policy]));
  for (const agentId of REQUIRED_AGENTS) {
    const policy = policyMap.get(agentId);
    const expectedEnabled = ![
      'safe-auto-repair',
      'daily-audit-agent',
      'legacy-legal-case-trigger',
      'legacy-daily-report-agent',
      'legacy-weekly-report-agent',
      'legacy-traffic-fine-webhook',
      'legacy-monitoring-collector',
      'legacy-whatsapp-document-sender',
      'legacy-public-legal-document-upload',
    ].includes(agentId);
    add(
      `policy:${agentId}`,
      !policyError && Boolean(policy) && policy.enabled === expectedEnabled,
      policyError ? `unavailable:${policyError.code || 'query_error'}` : !policy ? 'missing' : `enabled:${policy.enabled}`,
    );
  }

  const { data: machineIdentities, error: identityError } = await service
    .from('agent_invocation_registry')
    .select('agent_id,allowed_company_id,enabled');
  const identityMap = new Map((machineIdentities || []).map((identity) => [identity.agent_id, identity]));
  for (const agentId of REQUIRED_MACHINE_IDENTITIES) {
    const identity = identityMap.get(agentId);
    const valid = !identityError
      && Boolean(identity)
      && identity.enabled === true
      && Boolean(identity.allowed_company_id);
    add(
      `identity:${agentId}`,
      valid,
      identityError
        ? `unavailable:${identityError.code || 'query_error'}`
        : !identity
        ? 'missing'
        : `enabled:${identity.enabled},company_scoped:${Boolean(identity.allowed_company_id)}`,
    );
  }

  const { data: dataHealth, error: dataHealthError } = await service
    .rpc('get_agent_safety_data_health_v1');
  const violationCount = Array.isArray(dataHealth)
    ? dataHealth.reduce((total, row) => total + Number(row.violation_count || 0), 0)
    : 0;
  add(
    'data:agent_safety_health_has_no_violations',
    !dataHealthError && Array.isArray(dataHealth) && dataHealth.length >= 3 && violationCount === 0,
    dataHealthError
      ? `unavailable:${dataHealthError.code || 'rpc_error'}`
      : `aggregate_metrics:${dataHealth?.length || 0},violations:${violationCount}`,
  );

  const { data: inventory, error: inventoryError } = await service.rpc('get_agent_safety_inventory_v1');
  add(
    'runtime:inventory_rpc',
    !inventoryError && Array.isArray(inventory) && inventory.length >= REQUIRED_AGENTS.length,
    inventoryError ? `unavailable:${inventoryError.code || 'rpc_error'}` : `agents:${inventory?.length || 0}`,
  );

  if (anonKey) {
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error: anonInventoryError } = await anon.rpc('get_agent_safety_inventory_v1');
    const rpcExists = Boolean(openApi?.paths?.['/rpc/get_agent_safety_inventory_v1']);
    const permissionDenied = Boolean(
      anonInventoryError
      && !['PGRST202', '42883'].includes(anonInventoryError.code || ''),
    );
    add(
      'acl:inventory_denied_to_anon',
      rpcExists && permissionDenied,
      !rpcExists ? 'rpc_missing' : permissionDenied ? 'denied' : 'unexpectedly_allowed',
    );
  } else {
    add('acl:inventory_denied_to_anon', false, 'anon_key_unavailable');
  }

  const failed = checks.filter((check) => !check.ok);
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    mode: 'read_only',
    passed: checks.length - failed.length,
    failed: failed.length,
    ready: failed.length === 0,
    checks,
  }, null, 2));
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(JSON.stringify({
    checkedAt: new Date().toISOString(),
    mode: 'read_only',
    ready: false,
    fatal: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
});
