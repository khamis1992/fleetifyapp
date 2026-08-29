import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260827155633_fix_delinquent_customer_cron_company_scope.sql",
  "utf8"
);

const rollback = readFileSync(
  "supabase/rollbacks/20260827155633_fix_delinquent_customer_cron_company_scope.rollback.sql",
  "utf8"
);

describe("delinquent customer cron company scope", () => {
  it("replaces the existing job before scheduling its canonical replacement", () => {
    expect(migration).toContain("cron.unschedule(job.jobid)");
    expect(migration).toContain("WHERE job.jobname = 'update-delinquent-customers'");
    expect(migration).toContain("cron.schedule(");
  });

  it("passes the Fleetify company to the protected refresh RPC", () => {
    expect(migration).toContain(
      "public.update_delinquent_customers(\n    '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid"
    );
    expect(migration).not.toContain("SELECT update_delinquent_customers()");
  });

  it("fails safely when the function or company prerequisite is missing", () => {
    expect(migration).toContain(
      "to_regprocedure('public.update_delinquent_customers(uuid)')"
    );
    expect(migration).toContain("Fleetify company is missing");
  });

  it("provides a rollback to the prior schedule command", () => {
    expect(rollback).toContain("cron.unschedule(job.jobid)");
    expect(rollback).toContain("SELECT update_delinquent_customers()");
  });
});
