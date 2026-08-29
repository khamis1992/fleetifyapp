import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const migration = read(
  "supabase/migrations/20260827094000_system_audit_control_plane.sql"
);
const rollback = read(
  "supabase/rollbacks/20260827094000_system_audit_control_plane.rollback.sql"
);
const worker = read("supabase/functions/system-audit-worker/index.ts");
const orchestrator = read(
  "supabase/functions/system-audit-orchestrator/index.ts"
);
const dashboard = read("supabase/functions/system-audit-dashboard/index.ts");
const reviewTaskSync = read(
  "supabase/migrations/20260827093000_server_side_system_audit_review_task_sync.sql"
);
const reviewTaskSyncRollback = read(
  "supabase/rollbacks/20260827093000_server_side_system_audit_review_task_sync.rollback.sql"
);

describe("system audit control plane", () => {
  it("keeps the control table service-only and scopes ownership by company", () => {
    expect(migration).toContain(
      "ALTER TABLE public.system_agent_controls ENABLE ROW LEVEL SECURITY"
    );
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.system_agent_controls FROM PUBLIC, anon, authenticated"
    );
    expect(migration).toContain(
      "profile.company_id = p_company_id"
    );
    expect(migration).toContain("profile.is_active = true");
    expect(migration).toContain("public.system_agent_control_events");
    expect(migration).toContain("control_version");
    expect(migration).toContain("SET owner_profile_id = EXCLUDED.owner_profile_id");
    expect(dashboard).toContain("body.ownerProfileId === null");
  });

  it("blocks claims and new jobs while paused, disabled, or killed", () => {
    expect(migration).toContain(
      "NOT v_control.enabled OR v_control.paused OR v_control.kill_switch"
    );
    expect(migration).toContain("AND COALESCE(control.enabled, true)");
    expect(migration).toContain("AND NOT COALESCE(control.paused, false)");
    expect(migration).toContain("AND NOT COALESCE(control.kill_switch, false)");
    expect(orchestrator).toContain("getBlockedCompanyResponse");
    expect(orchestrator).toContain("423");
  });

  it("checks control before persistence and each automatic repair", () => {
    expect(worker.match(/assertJobMayContinue\(/g)?.length || 0).toBeGreaterThanOrEqual(5);
    expect(worker.match(/await assertMayContinue\(\)/g)?.length || 0).toBeGreaterThanOrEqual(3);
    expect(worker).toContain("system_agent_get_job_execution_control_v1");
    expect(worker).toContain('error.action === "pause"');
    expect(worker).toContain("p_has_more: true");
    expect(worker).toContain("system_agent_cancel_claimed_job_v1");
  });

  it("restricts emergency control to company admins and super admins", () => {
    expect(dashboard).toContain('role.role === "company_admin"');
    expect(dashboard).toContain("canUseKillSwitch");
    expect(dashboard).toContain("Emergency kill-switch access denied");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.system_agent_set_company_control_v1"
    );
    expect(migration).toContain("TO service_role");
  });

  it("supports a reversible schema rollout", () => {
    expect(rollback).toContain(
      "DROP TRIGGER IF EXISTS trg_system_agent_prepare_job_v1"
    );
    expect(rollback).toContain(
      "DROP TABLE IF EXISTS public.system_agent_controls"
    );
    expect(rollback).toContain(
      "DROP TABLE IF EXISTS public.system_agent_control_events"
    );
    expect(rollback).toContain(
      "DROP COLUMN IF EXISTS cancel_requested_at"
    );
    expect(rollback).toContain(
      "CREATE OR REPLACE FUNCTION public.system_agent_claim_job"
    );
  });

  it("does not archive review work after one missing snapshot", () => {
    expect(reviewTaskSync).toContain("missed_snapshots >= 2");
    expect(reviewTaskSync).toContain(
      "last_missing_run_id IS DISTINCT FROM v_latest_run_id"
    );
    expect(reviewTaskSync).toContain("missingAdvanced");
    expect(reviewTaskSyncRollback).not.toContain(
      "DROP TABLE IF EXISTS public.system_agent_review_task_links"
    );
  });
});
