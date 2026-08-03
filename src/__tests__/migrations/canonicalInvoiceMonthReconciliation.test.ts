import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260803144007_fix_monthly_contract_invoice_reconciliation_issue_month.sql',
  ),
  'utf8',
);

function extractFunction(functionName: string): string {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${functionName}(`);
  const end = migration.indexOf('$$;', start);
  return start >= 0 && end >= 0 ? migration.slice(start, end + 3) : '';
}

const generator = extractFunction('generate_invoice_for_contract_month');
const reconciliation = extractFunction('monthly_contract_invoice_reconciliation');

describe('canonical invoice-month reconciliation migration', () => {
  it('uses invoice_month with invoice_date fallback for active invoice uniqueness', () => {
    expect(migration).toMatch(
      /date_trunc\(\s*'month',\s*COALESCE\(invoice_month, invoice_date\)/i,
    );
    expect(migration).toContain(
      'COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone',
    );
    expect(migration).not.toMatch(
      /COALESCE\(invoice\.invoice_month,\s*invoice\.invoice_date,\s*invoice\.due_date\)/i,
    );
  });

  it('rejects inactive rows through both invoice lifecycle fields', () => {
    expect(migration).toMatch(
      /lower\(COALESCE\(invoice\.status, ''\)\)[\s\S]*?'inactive'/i,
    );
    expect(migration).toMatch(
      /lower\(COALESCE\(invoice\.payment_status, ''\)\)[\s\S]*?'inactive'/i,
    );
  });

  it('requires explicit finance authorization for authenticated manual generation', () => {
    expect(generator).toContain('v_trusted_direct_session');
    expect(generator).toContain("v_jwt_role <> 'service_role'");
    expect(generator).toContain('public.is_finance_action_authorized(');
    expect(generator).toContain(
      "ARRAY['finance.invoice.create', 'finance.invoices.write']",
    );

    const authorizationStart = generator.indexOf(
      'IF NOT public.is_finance_action_authorized(',
    );
    const authorizationEnd = generator.indexOf(') THEN', authorizationStart);
    const authorization = generator.slice(authorizationStart, authorizationEnd);

    expect(authorization).toContain(
      "ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant', 'sales_agent']",
    );
    expect(authorization).not.toMatch(/'employee'|'collection_agent'/);
  });

  it('keeps automated reconciliation trusted without exposing its RPC to users', () => {
    expect(generator).toContain(
      "session_user IN ('postgres', 'supabase_admin')",
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.generate_invoice_for_contract_month\(uuid, date\)\s+TO authenticated, service_role;/i,
    );
    expect(reconciliation).toContain(
      'public.generate_invoice_for_contract_month(v_contract.id, v_month)',
    );
    expect(migration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.monthly_contract_invoice_reconciliation\(date\)\s+FROM PUBLIC, anon, authenticated;/i,
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.monthly_contract_invoice_reconciliation\(date\)\s+TO service_role;/i,
    );
  });

  it('does not hide authorization failures from the scheduled reconciliation result', () => {
    expect(reconciliation).toMatch(
      /WHEN SQLSTATE '42501' THEN\s+RAISE;/i,
    );
  });
});
