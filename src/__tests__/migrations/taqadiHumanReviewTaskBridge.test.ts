import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");
const bridge = read(
  "supabase/migrations/20260827096000_taqadi_human_review_task_bridge.sql"
);
const backfill = read(
  "supabase/migrations/20260827096100_backfill_taqadi_human_review_tasks.sql"
);
const rollback = read(
  "supabase/rollbacks/20260827096000_taqadi_human_review_task_bridge.rollback.sql"
);

describe("Taqadi human review task bridge", () => {
  it("creates one durable task link per filing job", () => {
    expect(bridge).toContain("job_id uuid PRIMARY KEY");
    expect(bridge).toContain("task_id uuid NOT NULL UNIQUE");
    expect(bridge).toContain("category");
    expect(bridge).toContain("'taqadi_human_review'");
  });

  it("assigns the requester or an active company manager", () => {
    expect(bridge).toContain("profile.company_id = NEW.company_id");
    expect(bridge).toContain("profile.is_active = true");
    expect(bridge).toContain("profile.user_id = NEW.requested_by");
  });

  it("reopens recurring human review and closes resolved work", () => {
    expect(bridge).toContain("THEN 'pending'");
    expect(bridge).toContain("OLD.status = 'needs_human'");
    expect(bridge).toContain("taqadiResolutionStatus");
  });

  it("separates safe stale review retries from real portal validation errors", () => {
    expect(bridge).toContain("event.details ? 'claimAmountMatches'");
    expect(bridge).toContain("v_safe_retry_candidate");
    expect(bridge).toContain("jsonb_array_length(v_review_details -> 'requiredActions') = 0");
    expect(bridge).toContain("jsonb_array_length(v_review_details -> 'validationMessages') = 0");
    expect(bridge).toContain("safeRetryCandidate");
    expect(bridge).toContain("إعادة محاولة دعوى تقاضي بعد تحديث التحقق");
    expect(bridge).toContain("تصحيح بيانات أو ترتيب أطراف الدعوى في تقاضي");
  });

  it("enriches a first-time task after the diagnostic event is appended", () => {
    expect(bridge).toContain("enrich_taqadi_human_review_task_from_event_v1");
    expect(bridge).toContain("AFTER INSERT ON public.taqadi_filing_job_events");
    expect(bridge).toContain("reviewDiagnosticEventId");
    expect(rollback).toContain("trg_enrich_taqadi_human_review_task_from_event_v1");
    expect(rollback).toContain("enrich_taqadi_human_review_task_from_event_v1");
  });

  it("keeps the first production backfill explicit", () => {
    expect(bridge).not.toContain("SET status = status");
    expect(backfill).toContain("WHERE status = 'needs_human'");
  });

  it("removes automation without deleting historical tasks", () => {
    expect(rollback).toContain("DROP TRIGGER");
    expect(rollback).toContain("DROP TABLE");
    expect(rollback).not.toContain("DELETE FROM public.tasks");
  });
});
