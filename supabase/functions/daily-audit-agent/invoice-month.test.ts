import { describe, expect, it } from "vitest";
import {
  invoiceBillingMonth,
  invoiceContractBillingMonthKey,
  isInvoiceOutsideContractBillingMonths,
  selectExistingInvoiceForMonth,
} from "./invoice-month.ts";

describe("daily audit agent invoice month selection", () => {
  it("does not count an August invoice due in September as a September invoice", () => {
    const augustInvoice = {
      id: "invoice-august",
      invoice_month: "2026-08-01",
      invoice_date: "2026-08-01",
      due_date: "2026-09-01",
      status: "sent",
      payment_status: "unpaid",
      created_at: "2026-08-01T00:00:00.000Z",
    };

    expect(invoiceBillingMonth(augustInvoice)).toBe("2026-08-01");
    expect(selectExistingInvoiceForMonth([augustInvoice], "2026-08-01")?.id)
      .toBe("invoice-august");
    expect(selectExistingInvoiceForMonth([augustInvoice], "2026-09-01"))
      .toBeNull();
  });

  it("uses the canonical month for schedule links and duplicate grouping", () => {
    const invoice = {
      id: "invoice-august",
      contract_id: "contract-1",
      invoice_month: "2026-08-01",
      invoice_date: "2026-08-01",
      due_date: "2026-09-01",
      status: "sent",
      payment_status: "unpaid",
    };

    expect(invoiceContractBillingMonthKey(invoice))
      .toBe("contract-1:2026-08-01");
    expect(invoiceContractBillingMonthKey({ ...invoice, contract_id: null }))
      .toBe("");
  });

  it("checks contract boundaries by billing month, not due month", () => {
    const finalMonthInvoice = {
      id: "invoice-august",
      invoice_month: "2026-08-01",
      invoice_date: "2026-08-01",
      due_date: "2026-09-01",
    };

    expect(isInvoiceOutsideContractBillingMonths(
      finalMonthInvoice,
      "2026-01-15",
      "2026-08-31",
    )).toBe(false);
    expect(isInvoiceOutsideContractBillingMonths(
      { ...finalMonthInvoice, invoice_month: "2026-09-01" },
      "2026-01-15",
      "2026-08-31",
    )).toBe(true);
  });

  it("uses invoice_month before invoice_date and excludes inactive invoices", () => {
    const invoices = [
      {
        id: "cancelled-canonical",
        invoice_month: "2026-09-01",
        invoice_date: "2026-09-01",
        status: "cancelled",
        payment_status: "unpaid",
        created_at: "2026-08-20T00:00:00.000Z",
      },
      {
        id: "voided-canonical",
        invoice_month: "2026-09-01",
        invoice_date: "2026-09-01",
        status: "sent",
        payment_status: "voided",
        created_at: "2026-08-21T00:00:00.000Z",
      },
      {
        id: "inactive-canonical",
        invoice_month: "2026-09-01",
        invoice_date: "2026-09-01",
        status: "inactive",
        payment_status: "unpaid",
        created_at: "2026-08-21T12:00:00.000Z",
      },
      {
        id: "conflicting-month",
        invoice_month: "2026-10-01",
        invoice_date: "2026-09-01",
        status: "sent",
        payment_status: "unpaid",
        created_at: "2026-08-22T00:00:00.000Z",
      },
      {
        id: "active-legacy",
        invoice_month: null,
        invoice_date: "2026-09-01",
        status: "sent",
        payment_status: "unpaid",
        created_at: "2026-08-23T00:00:00.000Z",
      },
    ];

    expect(selectExistingInvoiceForMonth(invoices, "2026-09-01")?.id)
      .toBe("active-legacy");
  });

  it("keeps legacy invoices with null statuses eligible", () => {
    const invoice = {
      id: "legacy-null-statuses",
      invoice_month: null,
      invoice_date: "2026-09-01",
      status: null,
      payment_status: null,
      created_at: "2026-08-24T00:00:00.000Z",
    };

    expect(selectExistingInvoiceForMonth([invoice], "2026-09-01")?.id)
      .toBe("legacy-null-statuses");
  });

  it("selects the same canonical invoice regardless of result order", () => {
    const invoices = [
      {
        id: "invoice-b",
        invoice_month: "2026-09-01",
        invoice_date: "2026-09-01",
        status: "sent",
        payment_status: "unpaid",
        created_at: "2026-08-25T00:00:00.000Z",
      },
      {
        id: "invoice-a",
        invoice_month: "2026-09-01",
        invoice_date: "2026-09-01",
        status: "sent",
        payment_status: "unpaid",
        created_at: "2026-08-25T00:00:00.000Z",
      },
    ];

    expect(selectExistingInvoiceForMonth(invoices, "2026-09-01")?.id)
      .toBe("invoice-a");
    expect(selectExistingInvoiceForMonth([...invoices].reverse(), "2026-09-01")?.id)
      .toBe("invoice-a");
  });
});
