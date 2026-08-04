import { describe, expect, it } from "vitest";
import {
  getDefaultScheduledInvoiceMonth,
  getInvoiceMonthBounds,
  isActivePositiveInvoice,
  normalizeInvoiceMonth,
} from "./invoice-month.ts";

describe("scheduled invoice month", () => {
  it("normalizes explicit accounting months", () => {
    expect(normalizeInvoiceMonth("2026-08")).toBe("2026-08");
    expect(normalizeInvoiceMonth("2026-08-01")).toBe("2026-08");
    expect(() => normalizeInvoiceMonth("2026-8")).toThrow(/YYYY-MM/);
  });

  it("prepares the next month at year boundaries", () => {
    expect(getDefaultScheduledInvoiceMonth(new Date("2026-12-28T09:00:00Z"))).toBe("2027-01");
  });

  it("uses Qatar's calendar month near the UTC day boundary", () => {
    // 21:30 UTC on August 31 is already September 1 in Qatar.
    expect(getDefaultScheduledInvoiceMonth(new Date("2026-08-31T21:30:00Z"))).toBe("2026-10");
    expect(getDefaultScheduledInvoiceMonth(new Date("2026-12-31T21:30:00Z"))).toBe("2027-02");
  });

  it("calculates real calendar month bounds", () => {
    expect(getInvoiceMonthBounds("2028-02")).toEqual({
      monthStart: "2028-02-01",
      monthEnd: "2028-02-29",
    });
    expect(getInvoiceMonthBounds("2026-08")).toEqual({
      monthStart: "2026-08-01",
      monthEnd: "2026-08-31",
    });
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
});
