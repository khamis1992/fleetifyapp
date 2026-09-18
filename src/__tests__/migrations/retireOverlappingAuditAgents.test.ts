import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");
const migration = read(
  "supabase/migrations/20260827095000_retire_overlapping_legacy_mutating_agents.sql"
);
const rollback = read(
  "supabase/rollbacks/20260827095000_retire_overlapping_legacy_mutating_agents.rollback.sql"
);

describe("retiring overlapping legacy mutating audit agents", () => {
  it("pauses only the two cross-domain legacy writers", () => {
    expect(migration).toContain("cron.alter_job");
    expect(migration).toContain("active := false");
    expect(migration).toContain("'daily-audit-agent'");
    expect(migration).toContain("'safe-auto-repair'");
    expect(migration).not.toContain("nightly-ops-auditor");
    expect(migration).not.toContain("daily-legal-workflow-guard-v1");
    expect(migration).not.toContain("daily-contract-health-guard-v1");
    expect(migration).not.toContain("cron.unschedule");
  });

  it("restores the same schedules without reconstructing commands", () => {
    expect(rollback).toContain("cron.alter_job");
    expect(rollback).toContain("active := true");
    expect(rollback).toContain("'daily-audit-agent'");
    expect(rollback).toContain("'safe-auto-repair'");
    expect(rollback).not.toContain("cron.schedule");
  });
});
