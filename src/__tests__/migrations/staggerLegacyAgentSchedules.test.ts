import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const migration = read(
  "supabase/migrations/20260827100000_stagger_legacy_read_only_agent_schedules.sql"
);
const rollback = read(
  "supabase/rollbacks/20260827100000_stagger_legacy_read_only_agent_schedules.rollback.sql"
);

describe("legacy agent schedule staggering", () => {
  it("moves the legal guard away from the 02:30 UTC collision", () => {
    expect(migration).toContain("'daily-legal-workflow-guard-v1'");
    expect(migration).toContain("'20 3 * * *'");
    expect(migration).not.toContain("'30 2 * * *'");
    expect(migration).toContain("cron.unschedule(v_job_id)");
  });

  it("restores the exact former schedule on rollback", () => {
    expect(rollback).toContain("'daily-legal-workflow-guard-v1'");
    expect(rollback).toContain("'30 2 * * *'");
  });
});
