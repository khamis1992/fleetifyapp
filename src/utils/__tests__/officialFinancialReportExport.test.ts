import { describe, expect, it } from "vitest";
import {
  buildOfficialFinancialReportHtml,
  buildOfficialReportAuditRows,
  buildOfficialReportFileName,
  validateOfficialReportExportPayload,
} from "../officialFinancialReportExport";

const basePayload = {
  metadata: {
    reportTitle: "Trial Balance",
    reportType: "trial_balance",
    asOfDate: "2026-06-27",
    currency: "QAR",
    sourceFingerprint: "abc12345",
    reportHash: "hash987",
    status: "approved",
  },
  columns: [
    { header: "Account", key: "account" },
    { header: "Debit", key: "debit" },
  ],
  rows: [{ account: "Cash", debit: 100 }],
};

describe("officialFinancialReportExport", () => {
  it("requires audit metadata before export", () => {
    const result = validateOfficialReportExportPayload({
      ...basePayload,
      metadata: { ...basePayload.metadata, sourceFingerprint: "" },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("sourceFingerprint_required");
  });

  it("builds stable audit rows for official exports", () => {
    const rows = buildOfficialReportAuditRows(basePayload.metadata);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Currency", value: "QAR" }),
        expect.objectContaining({ label: "Source Fingerprint", value: "abc12345" }),
        expect.objectContaining({ label: "Report Hash", value: "hash987" }),
      ]),
    );
  });

  it("uses report type, date, and fingerprint in official file names", () => {
    expect(buildOfficialReportFileName(basePayload.metadata, "pdf")).toBe("trial_balance_2026-06-27_abc12345.pdf");
    expect(buildOfficialReportFileName(basePayload.metadata, "xlsx")).toBe("trial_balance_2026-06-27_abc12345.xlsx");
  });

  it("renders financial reports as official letter documents", () => {
    const html = buildOfficialFinancialReportHtml(basePayload);

    expect(html).toContain("letter-container");
    expect(html).toContain("official-header");
    expect(html).toContain("subject-box");
    expect(html).toContain("approval-section");
    expect(html).toContain("Source Fingerprint");
    expect(html).toContain("abc12345");
  });

  it("prints the company identity from metadata instead of hardcoded values", () => {
    const html = buildOfficialFinancialReportHtml({
      ...basePayload,
      metadata: {
        ...basePayload.metadata,
        companyName: "Testing Company",
        companyNameAr: "شركة الاختبار للتأجير",
        companyNameEn: "Testing Rental Co",
        commercialRegister: "CR-777",
        companyAddressAr: "الوكرة - قطر",
        companyAddressEn: "Al Wakrah - Qatar",
        preparedByName: "finance@company.test",
        approvedByName: "cfo@company.test",
      },
    });

    expect(html).toContain("شركة الاختبار للتأجير");
    expect(html).toContain("Testing Rental Co");
    expect(html).toContain("CR-777");
    expect(html).toContain("الوكرة - قطر");
    expect(html).toContain("finance@company.test");
    expect(html).toContain("cfo@company.test");
    // Hardcoded defaults must not appear once metadata provides identity.
    expect(html).not.toContain("146832");
    expect(html).not.toContain("Alaraf");
  });

  it("falls back to the Alaraf letterhead when no identity is provided", () => {
    const html = buildOfficialFinancialReportHtml(basePayload);
    expect(html).toContain("شركة العراف لتأجير السيارات");
    expect(html).toContain("146832");
  });

  it("formats money with accounting parentheses for negatives and no repeated currency", () => {
    const html = buildOfficialFinancialReportHtml({
      ...basePayload,
      columns: [
        { header: "Account", key: "account" },
        { header: "Balance", key: "balance", type: "money" as const },
      ],
      rows: [
        { account: "Cash", balance: -1500 },
        { account: "Revenue", balance: 2500.5 },
      ],
    });

    expect(html).toContain("(1,500.00)");
    expect(html).toContain("2,500.50");
    // The currency is stated once in metadata; money cells must not repeat "QAR".
    expect(html.match(/QAR/g)?.length).toBeLessThanOrEqual(2);
  });
});
