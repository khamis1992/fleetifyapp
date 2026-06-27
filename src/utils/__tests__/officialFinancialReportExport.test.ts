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
});
