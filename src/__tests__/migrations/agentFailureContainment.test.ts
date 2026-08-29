import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = read('supabase/migrations/20260828113000_agent_failure_containment_and_escalation.sql');
const rollback = read('supabase/rollbacks/20260828113000_agent_failure_containment_and_escalation.rollback.sql');
const sharedAgent = read('supabase/functions/_shared/agent.ts');
const missingPdfAgent = read('supabase/functions/missing-contract-pdf-agent/index.ts');
const uploadEndpoint = read('supabase/functions/upload-missing-contract-pdf/index.ts');
const taqadiPage = read('automation/taqadi-agent/taqadi-page.ts');
const smartAssigner = read('supabase/functions/smart-contract-assigner/index.ts');
const legalNoticeAgent = read('supabase/functions/legal-notice-agent/index.ts');
const retiredRepairAgent = read('supabase/functions/safe-auto-repair/index.ts');
const readinessVerifier = read('scripts/verify-agent-safety-readiness.mjs');
const customerDuplicateAgent = read('supabase/functions/customer-duplicate-detector/index.ts');
const customerProposalReviewer = read('supabase/functions/customer-proposal-ai-reviewer/index.ts');
const manualWhatsapp = read('supabase/functions/send-whatsapp-reminders/index.ts');
const legacyWhatsappDocument = read('supabase/functions/send-whatsapp-document/index.ts');
const browserWhatsapp = read('src/utils/whatsappWebSender.ts');
const legacyBrowserProvider = read('src/services/whatsapp/WhatsAppService.ts');

describe('cross-agent failure containment and escalation', () => {
  it('uses explicit function ACLs instead of deprecated auth.role checks', () => {
    expect(migration).not.toContain('auth.role()');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
    expect(migration).toContain('get_agent_safety_data_health_v1');
    expect(migration).toContain('normalized_national_id_duplicate_groups');
    expect(migration).toContain('active_matched_evidence_reused_paths');
    expect(readinessVerifier).toContain(".rpc('get_agent_safety_data_health_v1')");
    expect(readinessVerifier).not.toContain(".select('company_id,national_id')");
    expect(readinessVerifier).not.toContain(".select('id,company_id,contract_id,file_path");
    expect(readinessVerifier).toContain("'begin_trusted_agent_invocation_v1'");
  });

  it('applies policy, company scope, and conflict leases to trusted manual calls', () => {
    expect(migration).toContain('begin_trusted_agent_invocation_v1');
    expect(migration).toContain("'trusted_invocation'");
    expect(migration).toContain("'company_scope_denied'");
    expect(migration).toContain("'conflict_group_lease_active'");
    expect(migration).toContain("'same_request_already_claimed'");
    expect(migration).toMatch(/same_request_already_claimed[\s\S]*?RETURN false/);
    expect(migration).toContain('profile.company_id = p_company_id');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
    expect(sharedAgent).toContain('authorizeGovernedAgent');
    expect(sharedAgent).toContain('if (data !== true) throw new Error("Agent disabled or busy")');
    expect(migration).toContain("NEW.operation IN ('scheduled_invocation', 'trusted_invocation')");
  });

  it('applies accepted customer merges atomically inside PostgreSQL', () => {
    expect(migration).toContain('apply_customer_merge_proposal_v1');
    expect(migration).toContain('CUSTOMER_MERGE_PROPOSAL_NOT_PENDING');
    expect(migration).toContain('CUSTOMER_MERGE_PARTY_SCOPE_OR_STATE_INVALID');
    expect(migration).toContain('FOR UPDATE');
    expect(migration).toContain('GET DIAGNOSTICS v_contracts = ROW_COUNT');
    expect(migration).toContain('GET DIAGNOSTICS v_legal_cases = ROW_COUNT');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(readinessVerifier).toContain("'apply_customer_merge_proposal_v1'");
    expect(customerDuplicateAgent).toContain('.rpc("apply_customer_merge_proposal_v1"');
    expect(customerDuplicateAgent).not.toContain('const relinks: Array<[string, string]>');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.apply_customer_merge_proposal_v1');
  });

  it('applies OCR customer and contract proposals atomically after locked revalidation', () => {
    expect(migration).toContain('apply_customer_id_scan_proposal_v1');
    expect(migration).toContain('CUSTOMER_ID_PROPOSAL_STALE_CURRENT_VALUE');
    expect(migration).toContain('CUSTOMER_ID_PROPOSAL_IDENTITY_NOT_CONFIRMED');
    expect(migration).toContain('CUSTOMER_ID_PROPOSAL_FIELD_NOT_ALLOWED');
    expect(migration).toContain('CUSTOMER_ID_PROPOSAL_DUPLICATE_FIELD');
    expect(migration).toContain("(v_change ->> 'confidence')::numeric < 0.95");
    expect(migration).toContain('FOR UPDATE');
    expect(readinessVerifier).toContain("'apply_customer_id_scan_proposal_v1'");
    expect(customerProposalReviewer).toContain('.rpc("apply_customer_id_scan_proposal_v1"');
    expect(customerProposalReviewer).not.toContain('.from("customers")\n      .update(customerUpdates)');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.apply_customer_id_scan_proposal_v1');
  });

  it('enforces a per-run mutation budget with before/after and verified postconditions', () => {
    expect(migration).toContain('SELECT run.*');
    expect(migration).toContain('INTO STRICT v_policy');
    expect(migration).not.toContain('SELECT run, policy');
    expect(migration).toContain('max_mutations_per_run');
    expect(migration).toContain('AGENT_MUTATION_BUDGET_EXHAUSTED');
    expect(migration).toContain('AGENT_BEFORE_AFTER_EVIDENCE_REQUIRED');
    expect(migration).toContain('AGENT_POSTCONDITION_VERIFICATION_REQUIRED');
    expect(migration).toContain('trg_guard_system_agent_repair_budget');
    expect(migration).toContain('trg_guard_system_agent_finding_budget');
    expect(migration).toContain('SYSTEM_AGENT_FINDING_BUDGET_EXHAUSTED');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration.match(/pg_advisory_xact_lock/g)?.length).toBeGreaterThanOrEqual(2);
    expect(sharedAgent).toContain('recordAgentMutation');
    expect(sharedAgent).toContain('finishAgentExecution');
    expect(missingPdfAgent).toContain('recordAgentMutation');
    expect(migration).toContain('timeout_stale_agent_executions_v1');
    expect(migration).toContain("failure_code = 'execution_heartbeat_expired'");
    expect(migration).toContain('execution_ledger_enabled = true');
    expect(migration).toContain('DELETE FROM public.agent_invocation_leases lease');
    expect(migration).toContain("RETURN COALESCE(to_jsonb(v_run), jsonb_build_object('status', 'already_terminal'))");
  });

  it('expires unclear OCR evidence and quarantines low-quality identity matches', () => {
    expect(migration).toContain("'expired_unverified'");
    expect(migration).toContain("interval '24 hours'");
    expect(migration).toContain('LOW_OCR_QUALITY_REQUIRES_EXACT_ID_EVIDENCE');
    expect(migration).toContain('expire_unverified_signed_contracts_v1');
    expect(migration).toContain('legal_evidence_state = \'quarantined\'');
  });

  it('blocks ambiguous active signed-contract evidence across every filing boundary', () => {
    expect(migration).toContain('ambiguous_multiple_active_matched_documents');
    expect(migration).toContain('SUPERSEDED_EVIDENCE_REQUIRES_SUCCESSOR');
    expect(migration).toContain('get_legal_transfer_readiness_v1_pre_failure_containment');
    expect(migration).toContain('complete_legal_transfer_readiness_v1_pre_failure_containment');
    expect(migration).toContain('convert_contract_to_legal_v1_pre_failure_containment');
    expect(migration).toContain('validate_taqadi_filing_payload_v1_pre_failure_containment');
    expect(migration).toContain('ON storage.objects');
    expect(migration).toContain("evidence.legal_identity_match_status = 'matched'");
    expect(migration).toContain('AND NOT EXISTS');
  });

  it('uses a structural same-company same-contract foreign key for filed evidence', () => {
    expect(migration).toContain('lawsuit_preparations_direct_source_document_fkey');
    expect(migration).toContain('FOREIGN KEY (company_id, contract_id, source_document_id)');
    expect(migration).toContain('LAWSUIT_SOURCE_DOCUMENT_NOT_DIRECT_ACTIVE_MATCH');
    expect(migration).toContain("document ->> 'sourceDocumentId'");
    expect(migration).toContain("~* '^[0-9a-f]{8}-[0-9a-f]{4}");
    expect(migration).toMatch(/get_direct_signed_contract_evidence_state_v1[\s\S]*?SECURITY INVOKER/);
    expect(migration.match(/COMPANY_SCOPE_DENIED/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration).toContain("role.role = 'super_admin'");
    expect(migration).toContain('profile.company_id = p_company_id');
  });

  it('provides one-use opaque upload links and contains concurrent replay', () => {
    expect(migration).toContain('missing_contract_pdf_upload_tokens');
    expect(migration).toContain("extensions.gen_random_bytes(32)");
    expect(migration).toContain("extensions.digest(v_raw_token, 'sha256')");
    expect(migration).toContain('claim_missing_contract_pdf_upload_token_v1');
    expect(migration).toContain('UPLOAD_TOKEN_CLAIM_LOST');
    expect(migration).toContain('consume_missing_contract_pdf_upload_token_v1');
    expect(migration).toContain('release_missing_contract_pdf_upload_token_claim_v1');
    expect(uploadEndpoint).toContain('signature !== "%PDF-"');
    expect(uploadEndpoint).toContain('MAX_FILE_BYTES');
    expect(uploadEndpoint).toContain('req.headers.get("content-length")');
    expect(uploadEndpoint).toContain('upsert: false');
    expect(uploadEndpoint).toContain('legal_identity_match_status: "pending"');
    expect(uploadEndpoint).toContain('release_missing_contract_pdf_upload_token_claim_v1');
  });

  it('escalates stale requests and breaks repeated mismatch notification loops', () => {
    expect(migration).toContain("interval '48 hours'");
    expect(migration).toContain('escalate_stale_missing_contract_pdf_requests_v1');
    expect(migration).toContain('mismatch_upload_count');
    expect(migration).toContain('review_cooldown_until');
    expect(migration).toContain('escalation_closed_at');
    expect(migration).toContain('AND request.escalation_closed_at IS NULL');
    expect(migration).toContain('contract-pdf-repeated-mismatch:');
    expect(missingPdfAgent).toContain('review_cooldown_until.lte.');
  });

  it('stops Taqadi PIN automation before a third automatic submission', () => {
    expect(taqadiPage).toContain('SMART_CARD_PIN_RETRY_LIMIT');
    expect(taqadiPage).toContain('maximumAutomaticSubmissions: 2');
  });

  it('counts assignment and formal-notice mutations only after their postconditions persist', () => {
    expect(smartAssigner).toContain('.eq("company_id", companyId)');
    expect(smartAssigner).toContain('.maybeSingle()');
    expect(smartAssigner).toContain('if (updateError || !updated) continue');
    expect(smartAssigner).toContain('operation: "assign_contract_owner"');
    expect(smartAssigner).toContain('operation: "rebalance_contract_owner"');
    expect(smartAssigner).toContain('verified: updated.assigned_to_profile_id === best.profileId');
    expect(legalNoticeAgent).toContain('operation: "dispatch_formal_payment_notice"');
    expect(legalNoticeAgent).toContain('providerAccepted: true');
    expect(legalNoticeAgent).toContain('dispatchFinalized: true');
    expect(legalNoticeAgent).toContain('NOTICE_PARTIAL_FAILURE');
    expect(legalNoticeAgent).toContain('boundedInteger(body.maxNotices, 25, 1, 50)');
  });

  it('does not allow the retired financial writer to start new repair runs', () => {
    expect(retiredRepairAgent).toContain('body.mode !== "rollback"');
    expect(retiredRepairAgent).toContain('replacement: "system-audit-orchestrator"');
    expect(retiredRepairAgent).toContain('}, 410)');
  });

  it('keeps provider credentials server-side and audits manual WhatsApp commands without plaintext PII', () => {
    expect(migration).toContain('outbound_whatsapp_commands');
    expect(migration).toContain('recipient_last4');
    expect(migration).toContain('recipient_hash');
    expect(migration).toContain('message_hash');
    expect(migration).toContain('dedupe_key');
    expect(migration).toContain('outbound_whatsapp_commands_pending_content_uidx');
    expect(migration).toContain("WHERE status = 'pending'");
    expect(migration).not.toMatch(/outbound_whatsapp_commands[\s\S]{0,1800}message_body/);
    expect(manualWhatsapp).toContain('authorizePrivilegedCompanyActor');
    expect(manualWhatsapp).toContain('assertEntityOwnership');
    expect(manualWhatsapp).toContain('fiveMinuteBucket');
    expect(browserWhatsapp).toContain("supabase.functions.invoke('send-whatsapp-reminders'");
    expect(browserWhatsapp).not.toContain('api.ultramsg.com');
    expect(browserWhatsapp).not.toContain('ULTRAMSG_TOKEN');
    expect(legacyBrowserProvider).not.toContain('fetch(');
    expect(legacyWhatsappDocument).toContain('status: 410');
    expect(legacyWhatsappDocument).not.toContain('getPublicUrl');
  });

  it('scrubs legacy database provider credentials and rejects browser restoration', () => {
    expect(migration).toContain('reject_browser_whatsapp_credentials_v1');
    expect(migration).toContain('SET ultramsg_instance_id = NULL');
    expect(migration).toContain('ultramsg_token = NULL');
    expect(migration).toContain('trg_reject_browser_whatsapp_credentials');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.reject_browser_whatsapp_credentials_v1');
  });

  it('ships a rollback for every structural object and wrapped boundary', () => {
    for (const token of [
      'DROP TABLE IF EXISTS public.agent_execution_mutations',
      'DROP TRIGGER IF EXISTS trg_guard_system_agent_finding_budget',
      'DROP TABLE IF EXISTS public.missing_contract_pdf_upload_tokens',
      'DROP COLUMN IF EXISTS source_document_id',
      'RENAME TO validate_taqadi_filing_payload_v1',
      'RENAME TO convert_contract_to_legal_v1',
      'RENAME TO complete_legal_transfer_readiness_v1',
      'RENAME TO get_legal_transfer_readiness_v1',
      'DROP COLUMN IF EXISTS max_mutations_per_run',
      'DROP FUNCTION IF EXISTS public.get_agent_safety_data_health_v1()',
      'DROP TABLE IF EXISTS public.outbound_whatsapp_commands',
    ]) expect(rollback).toContain(token);
  });
});
