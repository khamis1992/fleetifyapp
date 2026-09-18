import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const migration = read(
  "supabase/migrations/20260827101000_agent_specific_invocation_identities.sql"
);
const rollback = read(
  "supabase/rollbacks/20260827101000_agent_specific_invocation_identities.rollback.sql"
);
const cutoverPause = read(
  "supabase/migrations/20260827100500_pause_shared_secret_agents_for_identity_cutover.sql"
);
const sharedAuth = read("supabase/functions/_shared/agent.ts");
const autonomousReconciliation = read(
  "supabase/migrations/20260827102000_autonomous_contract_reconciliation_agent.sql"
);
const scheduledFunctions = [
  "violation-inbox-processor",
  "nightly-ops-auditor",
  "smart-contract-assigner",
  "customer-duplicate-detector",
  "contract-id-scanner",
  "customer-proposal-ai-reviewer",
  "contract-terms-scanner",
].map((name) => read(`supabase/functions/${name}/index.ts`));

describe("scheduled agent invocation identities", () => {
  it("creates one generated Vault secret per scheduled agent", () => {
    expect(migration).toContain("extensions.gen_random_bytes(32)");
    expect(migration).toContain("public.agent_invocation_registry");
    expect(migration).toContain("public.agent_invocation_events");
    expect(migration).toContain("verify_scheduled_agent_invocation_v1");
    expect(migration.match(/agent_secret_[a-z_]+/g)?.length || 0).toBeGreaterThanOrEqual(14);
    expect(migration).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  });

  it("pauses legacy shared-secret schedules before hardened functions deploy", () => {
    expect(cutoverPause).toContain("cron.alter_job");
    expect(cutoverPause).toContain("active := false");
    expect(cutoverPause).toContain("contract-id-scanner");
    expect(cutoverPause).toContain("nightly-contract-terms-scan");
    expect(cutoverPause).not.toContain("cron.unschedule");
  });

  it("requires matching agent id and secret without logging the secret", () => {
    expect(sharedAuth).toContain('req.headers.get("x-agent-id")');
    expect(sharedAuth).toContain('req.headers.get("x-agent-secret")');
    expect(sharedAuth).toContain("suppliedAgentId !== agentId");
    expect(sharedAuth).not.toContain("CONTRACT_SCANNER_SECRET");
    expect(migration).toContain("extensions.digest");
    const eventTable = migration.slice(
      migration.indexOf("CREATE TABLE IF NOT EXISTS public.agent_invocation_events"),
      migration.indexOf("CREATE INDEX IF NOT EXISTS idx_agent_invocation_events_agent_time"),
    );
    expect(eventTable).not.toContain("secret");
    expect(sharedAuth).toContain("profile.company_id === companyId");
    expect(sharedAuth).toContain("requireCompanyScope");
    expect(migration).toContain("FROM public.system_agent_controls control");
    expect(migration).toContain("OR control.paused");
    expect(migration).toContain("OR control.kill_switch");
  });

  it("removes the legacy shared secret from every migrated function", () => {
    for (const source of scheduledFunctions) {
      expect(source).toContain("authorizeScheduledAgent");
      expect(source).not.toContain("CONTRACT_SCANNER_SECRET");
      expect(source).not.toContain("x-scanner-secret");
      expect(source).not.toContain("x-reviewer-secret");
    }
  });

  it("allows autonomous reconciliation only behind the verified machine identity", () => {
    const terms = scheduledFunctions[6];
    expect(terms).toContain("hasScheduledIdentity");
    expect(terms).toContain("isServiceRoleCaller");
    expect(terms).toContain("mayAutoApply");
    expect(terms).toContain("apply_autonomous_contract_reconciliation_v1");
    expect(migration).toContain("'autoApply', false");
    expect(autonomousReconciliation).toContain("'autoApply', false");
    expect(autonomousReconciliation).toContain("v_role <> 'service_role'");
  });

  it("company-scopes both global scanner batches and their candidate query", () => {
    const idScanner = scheduledFunctions[4];
    const termsScanner = scheduledFunctions[6];
    expect(idScanner).toContain('batch mode requires companyId');
    expect(idScanner).toContain('.eq("company_id", companyId)');
    expect(termsScanner).toContain('batch mode requires companyId');
    expect(termsScanner).toContain('contract_terms_scan_batch_candidates_v4');
    expect(migration).toContain('contract_terms_scan_batch_candidates_v2');
    expect(autonomousReconciliation).toContain('contract_terms_scan_batch_candidates_v3');
    expect(migration.match(/'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4'/g)?.length).toBeGreaterThanOrEqual(7);
  });

  it("uses a non-destructive rollback that disables identities and schedules", () => {
    expect(rollback).toContain("cron.unschedule(job.jobid)");
    expect(rollback).toContain("SET enabled = false");
    expect(rollback).not.toContain("DROP TABLE");
    expect(rollback).not.toContain("DELETE FROM");
  });
});
