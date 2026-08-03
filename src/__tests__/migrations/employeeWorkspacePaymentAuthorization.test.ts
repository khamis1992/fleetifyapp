import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260803150437_harden_employee_workspace_payment_authorization.sql",
);
const rollbackPath = resolve(
  process.cwd(),
  "supabase/rollbacks/20260803150437_harden_employee_workspace_payment_authorization.rollback.sql",
);
const baselinePath = resolve(
  process.cwd(),
  "supabase/migrations/20260712052400_atomic_payment_creation_and_bank_linkage.sql",
);

const migration = readFileSync(migrationPath, "utf8");
const rollback = readFileSync(rollbackPath, "utf8");
const baseline = readFileSync(baselinePath, "utf8");

function extractFunctionDefinition(sql: string, functionName: string): string {
  const signature = `CREATE OR REPLACE FUNCTION public.${functionName}(`;
  const start = sql.indexOf(signature);
  const end = sql.indexOf("$$;", start);
  if (start < 0 || end < 0) return "";
  return sql.slice(start, end + 3).replace(/\r\n/g, "\n").trim();
}

const atomicPayment = extractFunctionDefinition(migration, "create_payment_atomic");
const bankTransaction = extractFunctionDefinition(
  migration,
  "create_payment_bank_transaction",
);

describe("employee workspace payment authorization migration", () => {
  it("keeps the definer function locked down with a safe search path", () => {
    expect(migration).toMatch(/SECURITY DEFINER\s+SET search_path = ''/i);
    expect(migration).toContain(
      ") FROM PUBLIC, anon, authenticated, service_role;",
    );
    expect(migration).toContain(") TO authenticated, service_role;");
    expect(migration).not.toMatch(/GRANT EXECUTE[\s\S]*\bTO\s+(?:PUBLIC|anon)\b/i);
  });

  it("preserves finance role compatibility without an employee or collection role bypass", () => {
    const financeAuthorizationStart = atomicPayment.indexOf(
      "v_allowed := public.is_finance_action_authorized(",
    );
    const financeAuthorizationEnd = atomicPayment.indexOf(
      ");",
      financeAuthorizationStart,
    );
    const financeAuthorization = atomicPayment.slice(
      financeAuthorizationStart,
      financeAuthorizationEnd + 2,
    );

    expect(financeAuthorization).toContain(
      "ARRAY['finance.payment.create', 'finance.payments.create', 'finance.payments.write', 'payments.create']",
    );
    expect(financeAuthorization).toContain(
      "ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant', 'sales_agent']",
    );
    expect(financeAuthorization).not.toMatch(/employee|collection_agent/);
    expect(atomicPayment).toContain("v_actor_role <> 'service_role'");
  });

  it("authorizes the workspace fallback only after resolving invoice, contract, and customer", () => {
    const invoiceResolution = atomicPayment.indexOf("IF p_invoice_id IS NOT NULL THEN");
    const contractResolution = atomicPayment.indexOf("FROM public.contracts contract");
    const customerValidation = atomicPayment.indexOf(
      "A customer belonging to the company is required for a receipt",
    );
    const workspaceFallback = atomicPayment.indexOf(
      "v_employee_workspace_allowed :=",
    );
    const workspaceFallbackEnd = atomicPayment.indexOf(
      "IF NOT v_employee_workspace_allowed THEN",
      workspaceFallback,
    );
    const workspaceFallbackDefinition = atomicPayment.slice(
      workspaceFallback,
      workspaceFallbackEnd,
    );
    const periodValidation = atomicPayment.indexOf(
      "PERFORM public.assert_financial_period_is_open",
    );

    expect(invoiceResolution).toBeGreaterThan(-1);
    expect(contractResolution).toBeGreaterThan(invoiceResolution);
    expect(customerValidation).toBeGreaterThan(contractResolution);
    expect(workspaceFallback).toBeGreaterThan(customerValidation);
    expect(periodValidation).toBeGreaterThan(workspaceFallback);

    expect(workspaceFallbackDefinition).toContain(
      "v_actor_role = 'authenticated'",
    );
    expect(workspaceFallbackDefinition).toContain(
      "p_invoice_id IS NOT NULL",
    );
    expect(workspaceFallbackDefinition).toContain(
      "v_contract_id IS NOT NULL",
    );
    expect(atomicPayment).toContain(
      "lower(COALESCE(v_contract.status, '')) = 'active'",
    );
    expect(atomicPayment).toContain("profile.user_id = v_actor");
    expect(atomicPayment).toContain("profile.company_id = p_company_id");
    expect(atomicPayment).toContain(
      "COALESCE(profile.is_active, false) = true",
    );
    expect(atomicPayment).toContain(
      "profile.id = v_contract.assigned_to_profile_id",
    );
  });

  it("returns a matching idempotent retry before recomputing invoice overpayment", () => {
    const authorization = atomicPayment.indexOf(
      "IF v_actor_role <> 'service_role' AND NOT v_allowed THEN",
    );
    const idempotencyLock = atomicPayment.indexOf(
      "'payment-idempotency:' || p_company_id::text || ':' || v_idempotency_key",
    );
    const idempotencyLookup = atomicPayment.indexOf(
      "AND payment.idempotency_key = v_idempotency_key",
    );
    const nonRetryableKeyRejection = atomicPayment.indexOf(
      "Idempotency key belongs to a non-retryable payment",
    );
    const mismatchedPayloadRejection = atomicPayment.indexOf(
      "Idempotency key was already used with different payment data",
    );
    const existingReturn = atomicPayment.indexOf(
      "RETURN v_existing.id;",
      idempotencyLookup,
    );
    const bankResolution = atomicPayment.indexOf(
      "v_bank_id := public.resolve_payment_bank_id(",
    );
    const overpaymentComputation = atomicPayment.indexOf(
      "v_existing_paid := public.canonical_invoice_paid_amount",
    );

    expect(idempotencyLock).toBeGreaterThan(authorization);
    expect(idempotencyLookup).toBeGreaterThan(idempotencyLock);
    expect(nonRetryableKeyRejection).toBeGreaterThan(idempotencyLookup);
    expect(mismatchedPayloadRejection).toBeGreaterThan(
      nonRetryableKeyRejection,
    );
    expect(existingReturn).toBeGreaterThan(mismatchedPayloadRejection);
    expect(bankResolution).toBeGreaterThan(existingReturn);
    expect(overpaymentComputation).toBeGreaterThan(existingReturn);
  });

  it("matches every persisted financial input before returning an idempotent payment", () => {
    const idempotencyLookup = atomicPayment.indexOf(
      "AND payment.idempotency_key = v_idempotency_key",
    );
    const existingReturn = atomicPayment.indexOf(
      "RETURN v_existing.id;",
      idempotencyLookup,
    );
    const matchingBlock = atomicPayment.slice(idempotencyLookup, existingReturn);

    expect(matchingBlock).toContain(
      "'failed', 'refunded', 'reversed', 'cancelled', 'canceled'",
    );
    expect(matchingBlock).toContain("'void', 'voided', 'deleted', 'inactive'");
    expect(matchingBlock).toContain(
      "abs(COALESCE(v_existing.amount, 0) - p_amount) >= 0.005",
    );

    for (const persistedField of [
      "v_existing.payment_type",
      "v_existing.payment_status",
      "v_existing.bank_id",
      "v_existing.account_id",
      "v_existing.cost_center_id",
      "v_existing.currency",
      "v_existing.reference_number",
      "v_existing.agreement_number",
      "v_existing.check_number",
      "v_existing.notes",
      "v_existing.monthly_amount",
      "v_existing.amount_paid",
      "v_existing.remaining_amount",
      "v_existing.payment_month",
      "v_existing.due_date",
      "v_existing.days_overdue",
      "v_existing.late_fee_amount",
    ]) {
      expect(matchingBlock).toContain(persistedField);
    }

    for (const metadataField of [
      "monthly_amount",
      "amount_paid",
      "remaining_amount",
      "payment_month",
      "due_date",
      "days_overdue",
      "late_fee_amount",
    ]) {
      expect(matchingBlock).toContain(
        `v_registration_metadata ->> '${metadataField}'`,
      );
    }

    expect(matchingBlock).toContain("IS DISTINCT FROM v_status");
    expect(matchingBlock).toContain("p_bank_id IS NOT NULL");
    expect(matchingBlock).toContain(
      "v_existing.bank_id IS DISTINCT FROM p_bank_id",
    );
    expect(matchingBlock).not.toContain("resolve_payment_bank_id");
    expect(matchingBlock).toContain("COALESCE(");
  });

  it("retains invoice-to-contract and customer integrity checks", () => {
    expect(atomicPayment).toContain(
      "Payment customer does not match the invoice customer",
    );
    expect(atomicPayment).toContain(
      "Payment contract does not match the invoice contract",
    );
    expect(atomicPayment).toContain(
      "Payment customer does not match the contract customer",
    );
    expect(atomicPayment).toContain(
      "create_payment_atomic only supports customer receipts",
    );
    expect(atomicPayment).toContain(
      "('cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive')",
    );
  });

  it("lets an assigned employee complete the internal cash helper path without exposing it directly", () => {
    const bankFallback = bankTransaction.indexOf(
      "v_employee_workspace_allowed :=",
    );
    const bankFallbackRejection = bankTransaction.indexOf(
      "IF NOT v_employee_workspace_allowed THEN",
      bankFallback,
    );
    const cashMethodCheck = bankTransaction.indexOf(
      "IF NOT public.payment_method_uses_bank(v_payment.payment_method) THEN",
    );
    const cashReturn = bankTransaction.indexOf("RETURN NULL;", cashMethodCheck);

    expect(bankFallback).toBeGreaterThan(-1);
    expect(bankFallbackRejection).toBeGreaterThan(bankFallback);
    expect(cashMethodCheck).toBeGreaterThan(bankFallbackRejection);
    expect(cashReturn).toBeGreaterThan(cashMethodCheck);
    expect(bankTransaction).toContain("v_payment.created_by = v_actor");
    expect(bankTransaction).toContain("v_payment.invoice_id IS NOT NULL");
    expect(bankTransaction).toContain("v_payment.contract_id IS NOT NULL");
    expect(bankTransaction).toContain(
      "invoice.contract_id = v_payment.contract_id",
    );
    expect(bankTransaction).toContain(
      "invoice.company_id = v_payment.company_id",
    );
    expect(bankTransaction).toContain(
      "contract.customer_id = v_payment.customer_id",
    );
    expect(bankTransaction).toContain(
      "lower(COALESCE(contract.status, '')) = 'active'",
    );
    expect(bankTransaction).toContain(
      "profile.id = contract.assigned_to_profile_id",
    );
    expect(bankTransaction).toContain("profile.user_id = v_actor");
    expect(bankTransaction).toContain(
      "COALESCE(profile.is_active, false) = true",
    );

    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.create_payment_bank_transaction\(uuid\)\s+FROM PUBLIC, anon, authenticated, service_role;/i,
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.create_payment_bank_transaction\(uuid\)\s+TO service_role;/i,
    );
    expect(migration).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.create_payment_bank_transaction\(uuid\)\s+TO (?:PUBLIC|anon|authenticated)/i,
    );
  });

  it("rejects the internal helper fallback for unlinked or unassigned receipts", () => {
    const bankAuthorizationStart = bankTransaction.indexOf(
      "v_allowed := public.is_finance_action_authorized(",
    );
    const bankAuthorizationEnd = bankTransaction.indexOf(
      ");",
      bankAuthorizationStart,
    );
    const bankAuthorization = bankTransaction.slice(
      bankAuthorizationStart,
      bankAuthorizationEnd + 2,
    );

    expect(bankAuthorization).toContain(
      "ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant', 'sales_agent']",
    );
    expect(bankTransaction).toContain(
      "lower(COALESCE(v_payment.transaction_type::text, '')) = 'receipt'",
    );
    expect(bankTransaction).toContain(
      "invoice.id = v_payment.invoice_id",
    );
    expect(bankTransaction).toContain(
      "profile.company_id = contract.company_id",
    );
    expect(bankTransaction).toContain(
      "Not authorized to create the payment bank transaction",
    );
  });

  it("checks create and approve authorizations independently in the internal helper", () => {
    expect(bankTransaction).toContain(
      "ARRAY['finance.payment.create', 'finance.payments.create', 'finance.payments.write', 'payments.create']",
    );
    expect(bankTransaction).toContain(
      "ARRAY['finance.payment.approve', 'payments.approve']",
    );
    expect(bankTransaction).toContain(
      "ARRAY['super_admin', 'admin', 'company_admin', 'accountant']",
    );
    expect(bankTransaction).toMatch(
      /is_finance_action_authorized\([\s\S]+?\) OR public\.is_finance_action_authorized\(/,
    );
    expect(migration).not.toContain(
      "CREATE OR REPLACE FUNCTION public.create_invoice_payment_with_late_fee_v1(",
    );
  });

  it("restores both exact previous function definitions on rollback", () => {
    expect(extractFunctionDefinition(rollback, "create_payment_atomic")).toBe(
      extractFunctionDefinition(baseline, "create_payment_atomic"),
    );
    expect(
      extractFunctionDefinition(rollback, "create_payment_bank_transaction"),
    ).toBe(
      extractFunctionDefinition(baseline, "create_payment_bank_transaction"),
    );
    expect(rollback).toContain("SET search_path = public");
    expect(rollback).toContain(") FROM PUBLIC, anon;");
    expect(rollback).toContain(") TO authenticated, service_role;");
    expect(rollback).toMatch(
      /REVOKE ALL ON FUNCTION public\.create_payment_bank_transaction\(uuid\)\s+FROM PUBLIC, anon, authenticated;/i,
    );
    expect(rollback).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.create_payment_bank_transaction\(uuid\)\s+TO service_role;/i,
    );
  });
});
