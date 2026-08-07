import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationSource = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260807200941_legal_transfer_employee_review_workflow.sql'),
  'utf8',
);
const delinquencySource = readFileSync(
  resolve(process.cwd(), 'src/pages/legal/FinancialDelinquency.tsx'),
  'utf8',
);
const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/employee-workspace/EmployeeLegalReviewPanel.tsx'),
  'utf8',
);

describe('legal transfer employee review workflow', () => {
  it('creates a review table with company isolation and one open request per contract', () => {
    expect(migrationSource).toContain('CREATE TABLE public.legal_transfer_employee_reviews');
    expect(migrationSource).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migrationSource).toContain('legal_transfer_employee_reviews_one_open_contract_idx');
  });

  it('blocks legal conversion until the assigned employee approves', () => {
    expect(migrationSource).toContain(
      'Employee verification is required before legal conversion',
    );
    expect(migrationSource).toContain('convert_contract_to_legal_v1_pre_employee_review');
  });

  it('requires a manager reason for overrides', () => {
    expect(migrationSource).toContain('Only a manager can override employee verification');
    expect(migrationSource).toContain('An override reason is required');
  });

  it('shows a request action in the legal delinquency search before conversion', () => {
    expect(delinquencySource).toContain('إرسال للموظف للتدقيق');
    expect(delinquencySource).toContain('يجب اعتماد الموظف المسؤول قبل التحويل القانوني');
  });

  it('lets the employee correct customer data inside the workspace', () => {
    expect(panelSource).toContain('تدقيق وتصحيح');
    expect(panelSource).toContain('تم التصحيح وجاهز للقانونية');
    expect(panelSource).toContain('قائمة التحقق الإلزامية');
  });
});
