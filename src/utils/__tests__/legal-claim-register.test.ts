import { describe, expect, it } from "vitest";
import { renderClaimRegister } from "../legal-claim-register-render";
import {
  monthlyRetentionAmount,
  assertClaimRegisterConsistent,
} from "../legal-claim-register-validation";
import {
  generateLegalComplaintHTML,
  buildLegalMemoFactsText,
  type LegalDocumentData,
} from "../legal-document-generator";
import { buildLegalMemoRequestSections } from "../legal-memo-requests";
import { fixedCompensationRegister } from './fixtures/fixedCompensation';
import type {
  LegalClaimRegister,
  ClaimRegisterRow,
} from "@/types/legalClaimRegister";

const row = (
  key: string,
  amount: number,
  disposition: ClaimRegisterRow["disposition"] = "primary"
): ClaimRegisterRow => ({
  key,
  kind: key,
  label: key,
  amount,
  disposition,
  status: "ready",
  description: "بيان مثبت",
  basis: "وفق الدليل",
  period_from: "2026-08-01",
  period_to: "2026-08-31",
  evidence_ids: ["proof"],
  issues: [],
});
const register = (): LegalClaimRegister => ({
  version: "claim_register_v1",
  as_of_date: "2026-09-09",
  rows: [
    row("rent_due", 1700),
    {
      ...row("rental_opportunity", 1500, "alternative"),
      custom: true,
      gross_amount: 1700,
      deductions: 200,
      alternative_to: "rent_due",
    },
    row("reputation_reserve", 300, "subsidiary"),
  ],
  primary_total: 1700,
  additional_primary: 0,
  issues: [],
});
const data = (): LegalDocumentData => ({
  claimRegister: register(),
  customer: {
    customer_name: "عميل اختبار",
    customer_code: "TEST",
    id_number: "12345678901",
    phone: "50000000",
    email: "test@example.test",
    days_overdue: 10,
    late_penalty: 0,
    overdue_amount: 1700,
    violations_amount: 0,
    violations_count: 0,
    total_debt: 1700,
  },
  companyInfo: {
    name_ar: "شركة اختبار",
    name_en: "Test",
    address: "الدوحة",
    cr_number: "123",
  },
  contractInfo: {
    contract_number: "TEST",
    monthly_rent: 1700,
    start_date: "01/01/2026",
  },
  vehicleInfo: { plate: "123" },
  vehicleCustody: "with_defendant",
  memoDate: "09/09/2026",
});

describe("claim register and the supplied full memorandum", () => {
  it('carries the same fixed request into the financial table, final requests and total without inventing proof', () => {
    const value = data();
    value.claimRegister = fixedCompensationRegister(40800, 24900);
    value.customer = { ...value.customer, overdue_amount: 40800, violations_amount: 24900, total_debt: 75700 };
    value.damages = 10000;
    expect(() => assertClaimRegisterConsistent(value.claimRegister!)).not.toThrow();
    const html = generateLegalComplaintHTML(value);
    expect(html).toContain('75,700.00');
    expect(html).toContain('تعويض عن الأضرار المادية والمعنوية والحرمان من الانتفاع');
    expect(html).toContain('10,000.00');
    expect(html).not.toContain('كما تكبدت المدعية مبلغ');
    expect(html).not.toContain('لم يدرج في هذه النسخة طلب مستقل مثبت بشأن السمعة');
    const requests = buildLegalMemoRequestSections(value).financial.filter(text => text.includes('تعويض عن الأضرار المادية والمعنوية والحرمان من الانتفاع'));
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain('10,000.00');
  });
  it("discloses gross rent and allocated payments without adding either to the net total twice", () => {
    const value = register();
    value.rows[0] = { ...value.rows[0], gross_amount: 2000, deductions: 300 };
    const html = renderClaimRegister(value);
    expect(html).toContain("أصل الأجرة المفوترة الداخلة في المطالبة");
    expect(html).toContain("(300.00)");
    expect(() => assertClaimRegisterConsistent(value)).not.toThrow();
    value.rows[0].deductions = 400;
    expect(() => assertClaimRegisterConsistent(value)).toThrow("صافي");
  });
  it("rejects an impossible calendar date rather than silently rolling into the next month", () => {
    expect(() =>
      monthlyRetentionAmount("2026-02-31", "2026-03-05", 1700, "calendar_days")
    ).toThrow("غير صالحة");
  });
  it("separates alternative and subsidiary amounts without increasing principal", () => {
    const value = register();
    expect(() => assertClaimRegisterConsistent(value)).not.toThrow();
    const html = renderClaimRegister(value);
    expect(html).toContain("طلب بديل");
    expect(html).toContain("طلب احتياطي");
    expect(html).toContain("1,700.00 − 200.00");
    expect(html).not.toContain("3,500");
  });
  it("rejects a stale row even when the displayed aggregate is unchanged", () => {
    const value = register();
    value.rows[0].amount = 1800;
    expect(() => assertClaimRegisterConsistent(value)).toThrow("إجمالي");
  });
  it("rejects altered deductions and incomplete requests", () => {
    const value = register();
    value.rows[1].deductions = 100;
    expect(() => assertClaimRegisterConsistent(value)).toThrow("صافي");
    value.rows[1].status = "incomplete";
    expect(() => assertClaimRegisterConsistent(value)).toThrow("استكمال");
  });
  it("renders all nine sections and the alternative facts without blank variables", () => {
    const value = data();
    value.claimRegister!.rows.push(row('damages', 100));
    value.claimRegister!.primary_total += 100;
    value.damages = 100;
    value.customer.total_debt += 100;
    const html = generateLegalComplaintHTML(value);
    for (const heading of [
      "أولاً: الاختصاص",
      "ثانياً: الوقائع",
      "ثالثاً: الأجرة",
      "رابعاً: التعويض",
      "خامساً: التعويض",
      "سادساً: التعويض",
      "سابعاً: طلب التعويض",
      "ثامناً: البيان",
      "تاسعاً: الطلبات",
    ])
      expect(html).toContain(heading);
    expect(html).not.toContain("{{");
    expect(html).not.toContain("undefined");
    expect(buildLegalMemoFactsText(data())).not.toContain("ثامناً");
  });
  it("does not turn unentered opportunities or reputation damages into claims", () => {
    const value = data();
    value.claimRegister!.rows = [row("rent_due", 1700)];
    value.vehicleCustody = 'returned';
    const html = generateLegalComplaintHTML(value);
    expect(html).not.toContain('التعويض عن خسارة فرصة تأجير محددة');
    expect(html).not.toContain('فرصة تأجير افتراضية');
    expect(html).not.toContain('التعويض عن الأضرار المادية المستقلة');
    expect(html).not.toContain('التعويض عن الأضرار المعنوية والاعتبار التجاري');
    expect(html).not.toContain('التعويض عن احتباس المركبة والحرمان من الانتفاع');
    const headings = [...html.matchAll(/class="section-title">([^<]+)/g)].map(match => match[1]);
    expect(headings).toEqual([
      'أولاً: الاختصاص القضائي', 'ثانياً: الوقائع',
      'ثالثاً: الأجرة المستحقة والفسخ ورد المركبة',
      'رابعاً: البيان الحسابي للمطالبة', 'خامساً: الطلبات',
    ]);
    const requests = buildLegalMemoRequestSections(value);
    expect(requests.financial.join(" ")).not.toContain("reputation");
  });
  it.each(['excluded', 'incomplete'] as const)('does not add a narrative for a %s opportunity request', status => {
    const value = data();
    value.claimRegister!.rows.find(row => row.kind === 'rental_opportunity')!.status = status;
    const html = generateLegalComplaintHTML(value);
    expect(html).not.toContain('التعويض عن خسارة فرصة تأجير محددة');
    expect(html).not.toContain('فرصة تأجير افتراضية');
  });
  it('keeps the requested fixed compensation while omitting absent compensation categories', () => {
    const value = data();
    value.vehicleCustody = 'unknown';
    value.claimRegister = fixedCompensationRegister(40800, 24900);
    value.customer = {...value.customer, overdue_amount: 40800, violations_amount: 24900, total_debt: 75700};
    value.damages = 10000;
    const html = generateLegalComplaintHTML(value);
    expect(html).toContain('رابعاً: التعويض عن الأضرار المادية والمعنوية والحرمان من الانتفاع');
    expect(html).toContain('خامساً: البيان الحسابي للمطالبة');
    expect(html).toContain('سادساً: الطلبات');
    expect(html).toContain('75,700.00');
    expect(html).toContain('10,000.00');
    expect(html).not.toContain('لم يدرج');
    expect(html).not.toContain('لا يدرج مبلغ احتباس');
    expect(html).not.toContain('التعويض عن خسارة فرصة تأجير محددة');
  });
  it("escapes evidence and request descriptions in HTML", () => {
    const value = register();
    value.rows[1].description = "<img src=x onerror=alert(1)>";
    const html = renderClaimRegister(value);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
  it("numbers all requests sequentially and stops future rent after confirmed natural expiry", () => {
    const value = data();
    value.terminationPath = "natural_expiry";
    value.terminationInfo = {
      type: "contract_expired",
      status: "confirmed",
      date: "31/08/2026",
    };
    const groups = buildLegalMemoRequestSections(value);
    const all = [...groups.procedural, ...groups.financial, ...groups.closing];
    all.forEach((text, index) =>
      expect(text.startsWith(`${index + 1}. `)).toBe(true)
    );
    expect(all.join(" ")).not.toContain("ما يستجد من أجرة");
  });
  it.each([
    ["2024-02-01", "2024-02-29", 1700],
    ["2026-08-01", "2026-08-31", 1700],
    ["2026-08-31", "2026-09-09", 564.84],
  ] as const)("prorates calendar months %s through %s", (from, to, amount) => {
    expect(monthlyRetentionAmount(from, to, 1700, "calendar_days")).toBe(
      amount
    );
  });
  it("caps a full calendar month at one rent under the documented 30-day basis", () => {
    expect(
      monthlyRetentionAmount("2026-08-01", "2026-08-31", 1700, "thirty_days")
    ).toBe(1700);
    expect(
      monthlyRetentionAmount("2026-02-01", "2026-02-28", 1700, "thirty_days")
    ).toBe(1700);
    expect(
      monthlyRetentionAmount("2026-08-25", "2026-08-31", 1700, "thirty_days")
    ).toBe(396.67);
  });
});
