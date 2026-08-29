import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const migration = read(
  "supabase/migrations/20260827143500_preserve_explicit_contract_amount_in_legacy_sync.sql",
);
const rollback = read(
  "supabase/rollbacks/20260827143500_preserve_explicit_contract_amount_in_legacy_sync.rollback.sql",
);

describe("legacy contract amount sync", () => {
  it("preserves a signed amount only inside an audited atomic command", () => {
    expect(migration).toContain("current_setting('fleetify.atomic_contract_creation', true)");
    expect(migration).toContain("COALESCE(NEW.contract_amount, 0) > 0");
    expect(migration).toContain("RETURN NEW;");
    expect(migration).toMatch(/- EXTRACT\(MONTH FROM v_start_month\)\s*\+ 1/);
  });

  it("provides an exact legacy rollback", () => {
    expect(rollback).toContain("CREATE OR REPLACE FUNCTION public.sync_contract_amount()");
    expect(rollback).toMatch(/- EXTRACT\(MONTH FROM v_start_month\)\s*\+ 1/);
    expect(rollback).not.toContain("fleetify.atomic_contract_creation");
  });
});
