import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const migration = read(
  "supabase/migrations/20260827152147_integrity_guard_pack.sql"
);
const rollback = read(
  "supabase/rollbacks/20260827152147_integrity_guard_pack.rollback.sql"
);
const workers = read(
  "supabase/functions/_shared/system-audit/workers.ts"
);

describe("integrity guard pack", () => {
  it("normalizes Arabic and Persian digits before enforcing company uniqueness", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.normalize_national_id"
    );
    expect(migration).toContain("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹");
    expect(migration).toContain(
      "customers_company_normalized_national_id_unique"
    );
    expect(migration).toContain(
      "Cannot normalize customer national IDs: canonical duplicates require review first"
    );
    expect(migration).toContain("trg_00_normalize_customer_national_id");
  });

  it("blocks cross-company, cross-contract, and cross-customer payment links", () => {
    expect(migration).toContain("enforce_invoice_date_first_of_month");
    expect(migration).toContain("trg_enforce_invoice_date_first_of_month");
    expect(migration).toContain("COALESCE(NEW.invoice_month, NEW.invoice_date)");
    expect(rollback).toContain("is deliberately retained by rollback");
    expect(migration).toContain("guard_payment_invoice_identity");
    expect(migration).toContain("Payment contract does not match invoice contract");
    expect(migration).toContain("Payment customer does not match invoice customer");
    expect(migration).toContain("guard_payment_allocation_identity");
    expect(migration).toContain(
      "Allocated payment contract does not match invoice contract"
    );
    expect(migration).toContain(
      "Allocation, payment, and invoice must belong to the same company"
    );
  });

  it("inherits the contract customer for legal cases and rejects contradictions", () => {
    expect(migration).toContain("guard_legal_case_contract_identity");
    expect(migration).toContain(
      "Legal case client does not match contract customer"
    );
    expect(migration).toContain(
      "NEW.client_id := COALESCE(NEW.client_id, v_contract_customer_id)"
    );
    expect(workers).toContain("legal.case_contract_party_mismatch");
  });

  it("links signed alias evidence without moving the original document", () => {
    expect(migration).toContain("contract_document_canonical_links");
    expect(migration).toContain("source_is_document_only_alias");
    expect(migration).toContain("contract_documents_effective_contract_v1");
    expect(migration).toContain("WITH (security_invoker = true)");
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.normalize_vehicle_plate(text)"
    );
    expect(migration).not.toContain("SET contract_id = v_canonical_id");
  });

  it("provides a strict close-only RPC that cannot create review work", () => {
    const closeOnly = migration.slice(
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.close_stale_system_audit_reviews_v1"
      )
    );
    expect(closeOnly).toContain("missed_snapshots >= 2");
    expect(closeOnly).toContain("SET status = 'cancelled'");
    expect(closeOnly).toContain("SET status = 'ignored'");
    expect(closeOnly).toContain("'created', 0");
    expect(closeOnly).toContain("'refreshed', 0");
    expect(closeOnly).not.toContain("INSERT INTO public.tasks");
    expect(closeOnly).not.toContain("INSERT INTO public.system_agent_findings");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.close_stale_system_audit_reviews_v1(uuid)"
    );
  });

  it("adds review-only findings for historical financial relationship drift", () => {
    expect(workers).toContain("payment.invoice_contract_identity_mismatch");
    expect(workers).toContain("invoice.missing_contract_with_payment_evidence");
    expect(workers).toContain("payment.allocation_contract_identity_mismatch");
    expect(workers).toContain("payment.completed_unallocated_without_contract");
    expect(workers).not.toContain(
      'command: "payment.repair_contract_identity"'
    );
  });

  it("has a matching rollback for every new executable guard", () => {
    expect(rollback).toContain(
      "DROP FUNCTION IF EXISTS public.close_stale_system_audit_reviews_v1(uuid)"
    );
    expect(rollback).toContain(
      "DROP TABLE IF EXISTS public.contract_document_canonical_links"
    );
    expect(rollback).toContain(
      "DROP FUNCTION IF EXISTS public.guard_legal_case_contract_identity()"
    );
    expect(rollback).toContain(
      "DROP FUNCTION IF EXISTS public.guard_payment_allocation_identity()"
    );
    expect(rollback).toContain(
      "DROP FUNCTION IF EXISTS public.normalize_national_id(text)"
    );
  });
});
