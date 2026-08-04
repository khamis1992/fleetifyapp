import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  endOfInvoiceMonth,
  getCurrentInvoiceMonthInQatar,
  isActivePositiveInvoice,
  normalizeInvoiceMonth,
  summarizeContractSelection,
} from "./invoice-month.ts";

describe("historical invoice backfill safety", () => {
  it("normalizes canonical billing months and computes real month ends", () => {
    expect(normalizeInvoiceMonth("2026-02")).toBe("2026-02-01");
    expect(endOfInvoiceMonth("2026-02")).toBe("2026-02-28");
    expect(endOfInvoiceMonth("2028-02-01")).toBe("2028-02-29");
    expect(endOfInvoiceMonth("2026-12")).toBe("2026-12-31");
  });

  it("rejects malformed or impossible month values", () => {
    expect(() => normalizeInvoiceMonth("2026-13")).toThrow(RangeError);
    expect(() => normalizeInvoiceMonth("02/2026")).toThrow(RangeError);
  });

  it("resolves the current month using Qatar calendar time", () => {
    expect(getCurrentInvoiceMonthInQatar(new Date("2026-08-31T21:30:00Z"))).toBe("2026-09");
    expect(getCurrentInvoiceMonthInQatar(new Date("2026-12-31T21:30:00Z"))).toBe("2027-01");
  });

  it("reports missing requested contracts without exposing their identifiers", () => {
    const summary = summarizeContractSelection(
      ["eligible", "wrong-company", "inactive"],
      ["eligible", "unrequested"],
    );

    expect(summary).toEqual({ requested: 3, matched: 1, missing: 2 });
    expect(Object.keys(summary)).toEqual(["requested", "matched", "missing"]);
    expect(JSON.stringify(summary)).not.toContain("wrong-company");
  });

  it("accepts only positive active invoices as an existing obligation", () => {
    expect(isActivePositiveInvoice({
      total_amount: 1_000,
      status: "sent",
      payment_status: "unpaid",
    })).toBe(true);
    expect(isActivePositiveInvoice({ total_amount: 0 })).toBe(false);
    expect(isActivePositiveInvoice({ total_amount: 0.01 })).toBe(false);
    expect(isActivePositiveInvoice({ total_amount: 500, status: "cancelled" })).toBe(false);
    expect(isActivePositiveInvoice({ total_amount: 500, payment_status: "voided" })).toBe(false);
  });

  it("uses authenticated canonical commands without direct invoice writes", () => {
    const source = readFileSync(
      resolve(process.cwd(), "supabase/functions/backfill-historical-invoices/index.ts"),
      "utf8",
    );

    expect(source).toContain("authorizeBackfill(req)");
    expect(source).toContain("INVOICE_GENERATOR_SECRET");
    expect(source).toContain("companyId is required");
    expect(source).toContain("body.throughMonth || getCurrentInvoiceMonthInQatar()");
    expect(source).not.toContain("new Date().toISOString().slice(0, 7)");
    expect(source).toContain("hasExplicitContractIds");
    expect(source).toContain("UUID_PATTERN.test(contractId)");
    expect(source).toContain("contractIds must contain valid UUIDs");
    expect(source).toContain("summarizeContractSelection(");
    expect(source).toContain("if (selection.missing > 0)");
    expect(source).toContain("selection,");
    expect(source).toContain("unavailable or ineligible");
    expect(source).toMatch(/"One or more requested contracts are unavailable or ineligible",\s*400/);
    expect(source).toContain('.eq("company_id", companyId)');
    expect(source).toContain("error instanceof HttpError ? error.status : 500");
    expect(source).toContain("generate_payment_schedules_for_contract");
    expect(source).toContain("generate_invoice_for_contract_month_outcome");
    expect(source).toContain("endOfInvoiceMonth(throughMonth)");
    expect(source).toContain("if (outcome.created === true)");
    expect(source).toContain("continuation: {");
    expect(source).toContain("nextCursor: contractPage.nextCursor");
    expect(source).not.toContain('.from("invoices")');
    expect(source).not.toContain("isUniqueViolation(invoiceError)");
    expect(source).toContain(
      'result.errors.push(`${invoiceMonth}: ${errorMessage(error)}`)',
    );
    expect(source).not.toContain(".insert(");
    expect(source).not.toContain("${invoiceMonth}-31");
  });
});
