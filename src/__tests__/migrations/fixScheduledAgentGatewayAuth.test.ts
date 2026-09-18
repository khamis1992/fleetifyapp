import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const migration = read(
  "supabase/migrations/20260827110419_fix_scheduled_agent_auth_and_retire_legacy_agents.sql",
);
const rollback = read(
  "supabase/rollbacks/20260827110419_fix_scheduled_agent_auth_and_retire_legacy_agents.rollback.sql",
);

const scheduledAgents = [
  "violation-inbox-processor",
  "nightly-ops-auditor",
  "smart-contract-assigner",
  "customer-duplicate-detector",
  "contract-id-scanner",
  "customer-proposal-ai-reviewer",
  "contract-terms-scanner",
];

describe("scheduled agent Edge gateway authentication", () => {
  it("passes gateway credentials in addition to the per-agent identity", () => {
    expect(migration.match(/'Authorization', 'Bearer '/g)).toHaveLength(7);
    expect(migration.match(/'apikey'/g)).toHaveLength(7);
    expect(migration.match(/'x-agent-id'/g)).toHaveLength(7);
    expect(migration.match(/'x-agent-secret'/g)).toHaveLength(7);

    for (const agent of scheduledAgents) {
      expect(migration).toContain(`/functions/v1/${agent}`);
    }
  });

  it("lets the verified contract terms agent complete high-confidence repairs", () => {
    expect(migration).toContain("'nightly-contract-terms-scan'");
    expect(migration).toContain("'autoApply', true");
    expect(rollback).toContain("'autoApply',false");
  });

  it("removes stale overlapping rows and can restore them as inactive", () => {
    expect(migration).toContain("'daily-audit-agent'");
    expect(migration).toContain("'safe-auto-repair'");
    expect(migration).toContain("cron.unschedule(job.jobid)");
    expect(rollback).toContain("cron.schedule('daily-audit-agent'");
    expect(rollback).toContain("cron.schedule('safe-auto-repair'");
    expect(rollback.match(/active := false/g)).toHaveLength(2);
  });

  it("never embeds a JWT or a raw agent secret", () => {
    expect(migration).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    expect(migration).not.toMatch(/'x-agent-secret',\s*'[^']+'/);
  });
});
