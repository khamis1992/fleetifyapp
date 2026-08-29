import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const migration = read(
  "supabase/migrations/20260827150000_fix_autonomous_reconciliation_journal_arguments.sql",
);
const rollback = read(
  "supabase/rollbacks/20260827150000_fix_autonomous_reconciliation_journal_arguments.rollback.sql",
);

describe("autonomous reconciliation journal verification", () => {
  it("replaces invoice and journal ids with company and invoice ids", () => {
    expect(migration).toContain(
      "v_invoice.id, v_invoice.journal_entry_id, v_invoice.total_amount",
    );
    expect(migration).toContain(
      "v_contract.company_id, v_invoice.id, v_invoice.total_amount",
    );
    expect(migration).toContain("pg_get_functiondef");
    expect(migration).toContain("EXECUTE v_definition");
  });

  it("fails closed if the deployed definition differs", () => {
    expect(migration).toContain("Expected autonomous reconciliation journal verifier call was not found");
    expect(migration).toContain("is already corrected");
  });

  it("has a symmetric rollback", () => {
    expect(rollback).toContain("v_definition := replace(v_definition, v_correct, v_wrong)");
    expect(rollback).toContain("Legacy autonomous reconciliation journal verifier call is already restored");
  });
});
