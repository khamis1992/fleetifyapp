import { describe, expect, it } from "vitest";
import { formatArabicInvoiceMonthLabel } from "./invoice-label";

describe("customer-facing invoice month label", () => {
  it("uses a short Arabic month instead of the technical invoice number", () => {
    expect(formatArabicInvoiceMonthLabel("2026-08-01"))
      .toBe("فاتورة شهر أغسطس 2026");
    expect(formatArabicInvoiceMonthLabel("2026-01-01T00:00:00Z"))
      .toBe("فاتورة شهر يناير 2026");
  });

  it("uses a safe human fallback for malformed dates", () => {
    expect(formatArabicInvoiceMonthLabel(null)).toBe("فاتورة الشهر المستحق");
    expect(formatArabicInvoiceMonthLabel("2026-13-01"))
      .toBe("فاتورة الشهر المستحق");
  });
});
