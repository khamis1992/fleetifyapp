import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const migration = read(
  "supabase/migrations/20260827144500_preflight_autonomous_reconciliation_schedules.sql",
);
const rollback = read(
  "supabase/rollbacks/20260827144500_preflight_autonomous_reconciliation_schedules.rollback.sql",
);

describe("autonomous reconciliation schedule preflight", () => {
  it("normalizes the complete payment-free scenario before the guarded core", () => {
    const updateAt = migration.indexOf("UPDATE public.contract_payment_schedules");
    const coreAt = migration.indexOf("RETURN public.apply_autonomous_contract_reconciliation_core_v1");
    expect(updateAt).toBeGreaterThan(0);
    expect(coreAt).toBeGreaterThan(updateAt);
    expect(migration).toContain("amount = v_monthly");
    expect(migration).toContain("BETWEEN v_first_month AND v_last_month");
    expect(migration).toContain("COALESCE(schedule.paid_amount, 0) <= 0.01");
    expect(migration).toContain("schedule.paid_date IS NULL");
  });

  it("keeps authorization and the original core guards", () => {
    expect(migration).toContain("service_role");
    expect(migration).toContain("proposal.status = 'pending'");
    expect(migration).toContain("REVOKE ALL");
    expect(migration).toContain("TO service_role");
  });

  it("can restore the original function name", () => {
    expect(rollback).toContain("DROP FUNCTION IF EXISTS public.apply_autonomous_contract_reconciliation_v1");
    expect(rollback).toContain("RENAME TO apply_autonomous_contract_reconciliation_v1");
  });
});
