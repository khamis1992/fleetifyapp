import { describe, expect, it } from "vitest";
import {
  buildMissingContractPdfMessage,
  normalizeStaffWhatsAppPhone,
} from "./message";

describe("missing contract PDF WhatsApp message", () => {
  it("normalizes the three supported Qatar number shapes", () => {
    expect(normalizeStaffWhatsAppPhone("+974 6670 7063")).toBe("97466707063");
    expect(normalizeStaffWhatsAppPhone("31151919")).toBe("97431151919");
    expect(normalizeStaffWhatsAppPhone("0097431411919")).toBe("97431411919");
    expect(normalizeStaffWhatsAppPhone("123")).toBeNull();
  });

  it("identifies the contract while minimizing customer data in WhatsApp", () => {
    const message = buildMissingContractPdfMessage({
      contractNumber: "HIST-XLS-B70-706150",
      reason: "identity_mismatch",
      uploadUrl: "https://www.alaraf.online/contract-upload?token=abc",
    });

    expect(message).toContain("HIST-XLS-B70-706150");
    expect(message).not.toContain("ألياس يعقوبي");
    expect(message).not.toContain("999999");
    expect(message).toContain("لا تطابق");
    expect(message).toContain("https://www.alaraf.online/contract-upload?token=abc");
    expect(message).not.toContain("/contracts/contract-id");
    expect(message).toContain("صلاحية الرابط 10 أيام");
    expect(message).not.toContain("الرقم الشخصي");
  });
});
