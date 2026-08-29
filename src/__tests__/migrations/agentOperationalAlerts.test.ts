import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");
const foundation = read(
  "supabase/migrations/20260827099000_agent_operational_alerts_foundation.sql"
);
const schedule = read(
  "supabase/migrations/20260827099100_schedule_agent_operational_alerts.sql"
);
const mailSchedule = read(
  "supabase/migrations/20260827098000_schedule_traffic_mail_ingest.sql"
);

describe("agent operational monitoring", () => {
  it("deduplicates alerts and closes them when health recovers", () => {
    expect(foundation).toContain("PRIMARY KEY (company_id, alert_key)");
    expect(foundation).toContain("task.status IN ('completed', 'cancelled') THEN 'pending'");
    expect(foundation).toContain("AND task.status IN ('pending', 'in_progress', 'on_hold')");
  });

  it("monitors failures, stalled jobs, and traffic-mail health", () => {
    expect(foundation).toContain("job.status = 'failed'");
    expect(foundation).toContain("interval '15 minutes'");
    expect(foundation).toContain("interval '45 minutes'");
    expect(foundation).toContain("traffic-mail:sync-health");
  });

  it("keeps the monitor activation in a separate reversible cron migration", () => {
    expect(foundation).not.toContain("cron.schedule");
    expect(schedule).toContain("agent-operational-alerts-v1");
    expect(schedule).toContain("*/10 * * * *");
  });

  it("schedules traffic mail only through Vault-backed secrets", () => {
    expect(mailSchedule).toContain("vault.decrypted_secrets");
    expect(mailSchedule).toContain("name = 'moi_mail_secret'");
    expect(mailSchedule).not.toMatch(/Bearer\s+[A-Za-z0-9_-]+\./);
    expect(mailSchedule).toContain("*/15 * * * *");
  });
});
