import { describe, expect, it } from "vitest";
import { createBankStatementImportFingerprint, parseBankStatementRows } from "../bankStatementImportParser";

describe("bankStatementImportParser", () => {
  it("parses English debit and credit statement rows", () => {
    const result = parseBankStatementRows([
      {
        date: "2026-06-27",
        description: "Customer transfer",
        reference: "PAY-1",
        debit: "",
        credit: "1,250.500",
      },
      {
        date: "27/06/2026",
        description: "Bank fee",
        reference: "FEE-1",
        debit: "10.25",
        credit: "",
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].amount).toBe(1250.5);
    expect(result.lines[1].amount).toBe(-10.25);
    expect(result.lines[0].lineFingerprint).toMatch(/^[a-f0-9]{8}$/);
    expect(result.totals.netAmount).toBe(1240.25);
  });

  it("parses Arabic headers and explicit amount", () => {
    const result = parseBankStatementRows([
      {
        "التاريخ": "2026/06/27",
        "البيان": "تحويل عميل",
        "رقم المرجع": "REF-9",
        "المبلغ": "-300",
        "العملة": "QAR",
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.lines[0]).toMatchObject({
      statementDate: "2026-06-27",
      referenceNumber: "REF-9",
      amount: -300,
      currency: "QAR",
    });
  });

  it("reports invalid rows without stopping valid rows", () => {
    const result = parseBankStatementRows([
      { date: "", description: "Missing date", amount: 100 },
      { date: "2026-06-27", description: "Valid", amount: 200 },
      { date: "2026-06-27", description: "Zero", amount: 0 },
    ]);

    expect(result.lines).toHaveLength(1);
    expect(result.errors).toHaveLength(2);
    expect(result.totals.validRows).toBe(1);
  });

  it("creates a stable import fingerprint independent from row order", () => {
    const first = parseBankStatementRows([
      { date: "2026-06-27", description: "A", reference: "1", amount: 100 },
      { date: "2026-06-28", description: "B", reference: "2", amount: -20 },
    ]);
    const second = parseBankStatementRows([
      { date: "2026-06-28", description: "B", reference: "2", amount: -20 },
      { date: "2026-06-27", description: "A", reference: "1", amount: 100 },
    ]);

    expect(createBankStatementImportFingerprint(first.lines)).toBe(createBankStatementImportFingerprint(second.lines));
    expect(createBankStatementImportFingerprint(first.lines)).toMatch(/^[a-f0-9]{8}$/);
  });
});
