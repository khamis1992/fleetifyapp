import type { ClaimRegisterRow, LegalClaimRegister } from '@/types/legalClaimRegister';

export const fixedCompensationFixture: ClaimRegisterRow = {
  key: 'fixed_general_compensation', kind: 'fixed_general_compensation',
  label: 'تعويض عن الأضرار المادية والمعنوية والحرمان من الانتفاع',
  description: 'طلب تعويض إجمالي بمبلغ ثابت، خاضع لتقدير المحكمة، مع عدم تكرار جبر الضرر ذاته.',
  basis: 'مبلغ ثابت مطلوب قدره 10,000 ريال قطري، خاضع لتقدير المحكمة',
  disposition: 'primary', status: 'ready', amount: 10000,
  gross_amount: 10000, deductions: 0, period_from: null, period_to: null,
  evidence_ids: [], issues: [], custom: true,
};

export function fixedCompensationRegister(rent: number, traffic = 0): LegalClaimRegister {
  const base = (key: string, amount: number): ClaimRegisterRow => ({
    ...fixedCompensationFixture, key, kind: key, label: key,
    amount, gross_amount: amount, custom: false,
  });
  return {
    version: 'claim_register_v1', as_of_date: '2026-09-09',
    rows: [base('rent_due', rent), base('traffic_violations', traffic), { ...fixedCompensationFixture }],
    primary_total: rent + traffic + 10000, additional_primary: 10000, issues: [],
  };
}
