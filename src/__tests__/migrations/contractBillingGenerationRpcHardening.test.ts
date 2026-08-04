import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260803155800_harden_invoice_schedule_generation_rpcs.sql',
);
const rollbackPath = resolve(
  process.cwd(),
  'supabase/rollbacks/20260803155800_harden_invoice_schedule_generation_rpcs.rollback.sql',
);
const invoiceBaselinePath = resolve(
  process.cwd(),
  'supabase/migrations/20260211140000_fix_generate_invoices_skip_existing.sql',
);
const scheduleBaselinePath = resolve(
  process.cwd(),
  'supabase/migrations/20260110000000_generate_payment_schedules_from_invoices.sql',
);

const migration = readFileSync(migrationPath, 'utf8');
const rollback = readFileSync(rollbackPath, 'utf8');
const invoiceBaseline = readFileSync(invoiceBaselinePath, 'utf8');
const scheduleBaseline = readFileSync(scheduleBaselinePath, 'utf8');

function extractFunctionDefinition(sql: string, functionName: string): string {
  const publicSignature = `CREATE OR REPLACE FUNCTION public.${functionName}(`;
  const legacySignature = `CREATE OR REPLACE FUNCTION ${functionName}(`;
  const publicStart = sql.indexOf(publicSignature);
  const start = publicStart >= 0 ? publicStart : sql.indexOf(legacySignature);
  const end = sql.indexOf('$$;', start);
  if (start < 0 || end < 0) return '';
  return sql.slice(start, end + 3).replace(/\r\n/g, '\n').trim();
}

const invoiceGenerator = extractFunctionDefinition(
  migration,
  'generate_invoices_from_payment_schedule',
);
const scheduleGenerator = extractFunctionDefinition(
  migration,
  'generate_payment_schedules_for_contract',
);

function expectedBillingMonthKeys(
  startIso: string,
  endIso: string,
  contractTotal: number,
  monthlyAmount: number,
  hasStartMonthBilling = false,
): string[] {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  let cursor = new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth() + (hasStartMonthBilling ? 0 : 1),
    1,
  ));
  let endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  if (cursor > endMonth) {
    cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    endMonth = new Date(cursor);
  }

  const available: string[] = [];
  while (cursor <= endMonth) {
    available.push(cursor.toISOString().slice(0, 7));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  const financialCount = contractTotal > 0 && monthlyAmount > 0
    ? Math.max(1, Math.ceil(Math.max(contractTotal - 0.01, 0) / monthlyAmount))
    : available.length;
  if (financialCount > available.length) {
    throw new Error('financial installments exceed available billing months');
  }
  return available.slice(0, Math.max(1, financialCount));
}

describe('contract billing generation RPC hardening migration', () => {
  it('keeps both call-site signatures while hardening definer search paths and ACLs', () => {
    expect(scheduleGenerator).toMatch(
      /generate_payment_schedules_for_contract\(\s*p_contract_id uuid,\s*p_dry_run boolean DEFAULT false\s*\)[\s\S]*RETURNS jsonb/i,
    );
    expect(invoiceGenerator).toMatch(
      /generate_invoices_from_payment_schedule\(\s*p_contract_id uuid\s*\)[\s\S]*RETURNS integer/i,
    );
    expect(scheduleGenerator).toMatch(/SECURITY DEFINER\s+SET search_path = ''/i);
    expect(invoiceGenerator).toMatch(/SECURITY DEFINER\s+SET search_path = ''/i);

    for (const signature of [
      'public.generate_payment_schedules_for_contract(uuid, boolean)',
      'public.generate_invoices_from_payment_schedule(uuid)',
    ]) {
      expect(migration).toMatch(
        new RegExp(
          `REVOKE ALL ON FUNCTION ${signature.replace(/[().]/g, '\\$&')}\\s+FROM PUBLIC, anon, authenticated, service_role;`,
          'i',
        ),
      );
      expect(migration).toMatch(
        new RegExp(
          `GRANT EXECUTE ON FUNCTION ${signature.replace(/[().]/g, '\\$&')}\\s+TO authenticated, service_role;`,
          'i',
        ),
      );
    }
    expect(migration).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.generate_(?:invoices_from_payment_schedule|payment_schedules_for_contract)[\s\S]*?\bTO\s+(?:PUBLIC|anon)\b/i,
    );
  });

  it('requires service role, finance authorization, or the assigned active employee fallback', () => {
    for (const definition of [scheduleGenerator, invoiceGenerator]) {
      expect(definition).toContain("session_user IN ('postgres', 'supabase_admin')");
      expect(definition).toContain('IF NOT v_trusted_direct_session');
      expect(definition).toContain("v_actor_role <> 'service_role'");
      expect(definition).toContain("v_actor_role <> 'authenticated'");
      expect(definition).toContain('public.is_finance_action_authorized(');
      expect(definition).toContain('IF NOT COALESCE(v_allowed, false) THEN');
      expect(definition).toContain(
        "ARRAY['finance.invoice.create', 'finance.invoices.write']",
      );
      expect(definition).toContain(
        "ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant', 'sales_agent']",
      );
      expect(definition).toContain(
        "lower(COALESCE(v_contract.status::text, '')) = 'active'",
      );
      expect(definition).toContain('profile.user_id = v_actor');
      expect(definition).toContain(
        'profile.company_id = v_contract.company_id',
      );
      expect(definition).toContain(
        'COALESCE(profile.is_active, false) = true',
      );
      expect(definition).toContain(
        'profile.id = v_contract.assigned_to_profile_id',
      );
      expect(definition).toMatch(/USING ERRCODE = '42501'/i);

      const authorizationStart = definition.indexOf(
        'v_allowed := public.is_finance_action_authorized(',
      );
      const authorizationEnd = definition.indexOf(');', authorizationStart);
      expect(definition.slice(authorizationStart, authorizationEnd)).not.toMatch(
        /'employee'|'collection_agent'/,
      );
    }
  });

  it('lets the trusted pg_cron database session traverse both nested authorization gates', () => {
    for (const definition of [scheduleGenerator, invoiceGenerator]) {
      const trustedSession = definition.indexOf(
        "v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin')",
      );
      const roleGate = definition.indexOf("v_actor_role <> 'service_role'");
      expect(trustedSession).toBeGreaterThan(-1);
      expect(roleGate).toBeGreaterThan(trustedSession);
      expect(definition.slice(Math.max(0, roleGate - 100), roleGate + 100))
        .toContain('v_trusted_direct_session');
    }
  });

  it('breaks the new-contract zero-op by building inclusive contract months without invoices', () => {
    expect(scheduleGenerator).toContain(
      "v_contract.start_date + INTERVAL '1 month'",
    );
    expect(scheduleGenerator).toContain('v_contract.end_date::timestamp without time zone');
    expect(scheduleGenerator).toContain(
      'WHILE v_installment_number < v_month_count',
    );
    expect(scheduleGenerator).toContain(
      'AND v_month <= v_contract_end_month',
    );
    expect(scheduleGenerator).toContain(
      'v_installment_number := v_installment_number + 1;',
    );
    expect(scheduleGenerator).toContain(
      'v_schedule_due_date := GREATEST(v_month, v_contract.start_date);',
    );
    expect(scheduleGenerator).toContain('v_contract.monthly_amount');
    expect(scheduleGenerator).toContain('v_contract.contract_amount');
    expect(scheduleGenerator).toContain('v_has_start_month_billing');
    expect(scheduleGenerator).toContain('ELSIF v_contract_total > 0 THEN');
    expect(scheduleGenerator).toContain(
      'INSERT INTO public.contract_payment_schedules (',
    );
    expect(scheduleGenerator).toContain('v_invoice_id,');
    expect(scheduleGenerator).not.toMatch(/FOR\s+v_invoice\s+IN/i);
  });

  it('encodes twelve installments, not thirteen calendar labels, for a mid-month annual contract', () => {
    expect(scheduleGenerator).toContain(
      'CEIL(GREATEST(v_contract_total - 0.01, 0) / v_monthly_amount)::integer',
    );
    expect(scheduleGenerator).toMatch(
      /v_month_count := LEAST\(\s*v_available_month_count,\s*GREATEST\(v_financial_installment_count, 1\)\s*\)/i,
    );

    const midMonthAnnual = expectedBillingMonthKeys(
      '2026-01-15',
      '2027-01-14',
      12_000,
      1_000,
    );
    expect(midMonthAnnual).toHaveLength(12);
    expect(midMonthAnnual[0]).toBe('2026-02');
    expect(midMonthAnnual.at(-1)).toBe('2027-01');
    expect(midMonthAnnual).not.toContain('2026-01');

    // The established recurring convention also advances a day-one start;
    // a contract too short to reach next month receives one start-month row.
    expect(
      expectedBillingMonthKeys('2026-01-01', '2027-01-01', 12_000, 1_000),
    ).toHaveLength(12);
    expect(
      expectedBillingMonthKeys('2026-01-15', '2026-01-31', 1_000, 1_000),
    ).toEqual(['2026-01']);
    expect(() =>
      expectedBillingMonthKeys('2026-01-15', '2026-01-31', 12_000, 1_000),
    ).toThrow(/exceed available billing months/i);
    expect(scheduleGenerator).toContain(
      'Contract amount requires % installments at % per month',
    );
  });

  it('folds a one-cent remainder into the last normal installment', () => {
    const installmentAmounts = (total: number, monthly: number) => {
      const count = Math.max(
        1,
        Math.ceil(Math.max(total - 0.01, 0) / monthly),
      );
      return Array.from({ length: count }, (_, index) => (
        index < count - 1
          ? monthly
          : Number((total - monthly * (count - 1)).toFixed(2))
      ));
    };

    expect(installmentAmounts(1_000, 333.33)).toEqual([333.33, 333.33, 333.34]);
    expect(installmentAmounts(1_000, 333.34)).toEqual([333.34, 333.34, 333.32]);
    expect(scheduleGenerator).toContain(
      'v_monthly_amount := round(COALESCE(v_contract.monthly_amount, 0)::numeric, 2)',
    );
    expect(scheduleGenerator).toContain(
      'v_contract_total := round(COALESCE(v_contract.contract_amount, 0)::numeric, 2)',
    );
  });

  it('preserves a historical start-month convention without generating an N+1 obligation', () => {
    const partialStartMonthGraph = expectedBillingMonthKeys(
      '2026-01-15',
      '2027-01-14',
      12_000,
      1_000,
      true,
    );

    expect(partialStartMonthGraph).toHaveLength(12);
    expect(partialStartMonthGraph[0]).toBe('2026-01');
    expect(partialStartMonthGraph.at(-1)).toBe('2026-12');
    expect(partialStartMonthGraph).not.toContain('2027-01');
    expect(scheduleGenerator).toMatch(
      /EXISTS \([\s\S]*?FROM public\.invoices invoice[\s\S]*?= v_contract_start_month[\s\S]*?OR EXISTS \([\s\S]*?FROM public\.contract_payment_schedules schedule[\s\S]*?= v_contract_start_month/i,
    );
    expect(scheduleGenerator).toMatch(
      /v_month := CASE\s+WHEN v_has_start_month_billing THEN v_contract_start_month/i,
    );
  });

  it('rejects ambiguous or out-of-graph active financial rows before inserting', () => {
    const firstInsert = scheduleGenerator.indexOf(
      'INSERT INTO public.contract_payment_schedules (',
    );
    for (const guard of [
      'Multiple active payment schedules exist for contract month %',
      'Active payment schedule month % is outside the expected billing graph',
      'Multiple active invoices exist for contract month %',
      'Active invoice month % is outside the expected billing graph',
    ]) {
      const guardIndex = scheduleGenerator.indexOf(guard);
      expect(guardIndex).toBeGreaterThan(-1);
      expect(guardIndex).toBeLessThan(firstInsert);
    }

    expect(invoiceGenerator).toContain(
      ')::date BETWEEN v_first_billing_month AND v_expected_last_month',
    );
    expect(invoiceGenerator).toContain(
      'IF v_active_schedule_count <> v_month_count THEN',
    );
  });

  it('preflights every established amount against the contract before completing a partial graph', () => {
    const firstInsert = scheduleGenerator.indexOf(
      'INSERT INTO public.contract_payment_schedules (',
    );
    for (const guard of [
      'Active payment schedule for contract month % has amount %, expected %',
      'Active invoice for contract month % has total %, expected %',
      'Active schedule and invoice amounts disagree for contract month %',
      'Contract month % has no positive invoice, schedule, or contract amount',
    ]) {
      const guardIndex = scheduleGenerator.indexOf(guard);
      expect(guardIndex).toBeGreaterThan(-1);
      expect(guardIndex).toBeLessThan(firstInsert);
    }

    expect(scheduleGenerator).toContain(
      'WHILE v_validation_installment < v_month_count',
    );
    expect(scheduleGenerator).toContain(
      'abs(v_existing_schedule_amount - v_expected_contract_amount) > 0.01',
    );
    expect(scheduleGenerator).toContain(
      'abs(v_existing_invoice_amount - v_expected_contract_amount) > 0.01',
    );
  });

  it('never infers from or links active zero-value invoices and schedules', () => {
    for (const definition of [scheduleGenerator, invoiceGenerator]) {
      expect(definition).toContain(
        'COALESCE(invoice.total_amount, 0) > 0.01',
      );
      expect(definition).toContain(
        'COALESCE(schedule.amount, 0) > 0.01',
      );
    }
    expect(scheduleGenerator).toContain(
      'Active invoice for contract month % must have a positive total',
    );
    expect(scheduleGenerator).toContain(
      'Active payment schedule for contract month % must have a positive amount',
    );
  });

  it('preserves dry-run and propagates all failures instead of returning false success JSON', () => {
    expect(scheduleGenerator).toContain(
      'IF NOT COALESCE(p_dry_run, false) THEN',
    );
    expect(scheduleGenerator).toContain(
      "'_dry_run', COALESCE(p_dry_run, false)",
    );
    expect(scheduleGenerator).toContain(
      "RETURN jsonb_set(v_results, '{success}', to_jsonb(true));",
    );
    expect(scheduleGenerator).not.toMatch(/WHEN OTHERS/i);
    expect(scheduleGenerator).not.toMatch(
      /RETURN jsonb_build_object\(\s*'success',\s*false/i,
    );
  });

  it('uses only invoice_month with invoice_date fallback for invoice billing months', () => {
    for (const definition of [scheduleGenerator, invoiceGenerator]) {
      expect(definition).toContain(
        'COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone',
      );
      expect(definition).not.toMatch(
        /COALESCE\(invoice\.invoice_month,\s*invoice\.invoice_date,\s*invoice\.due_date\)/i,
      );
      expect(definition).not.toMatch(
        /date_trunc\(\s*'month',\s*invoice\.due_date/i,
      );
    }
    expect(invoiceGenerator).toContain(
      'public.generate_invoice_for_contract_month(',
    );
  });

  it('ignores inactive invoice and schedule lifecycle rows and never links one', () => {
    for (const lifecycle of [
      "lower(COALESCE(invoice.status, '')) NOT IN",
      "lower(COALESCE(invoice.payment_status, '')) NOT IN",
      "lower(COALESCE(schedule.status, '')) NOT IN",
    ]) {
      expect(scheduleGenerator).toContain(lifecycle);
      expect(invoiceGenerator).toContain(lifecycle);
    }
    for (const inactiveValue of [
      'cancelled',
      'canceled',
      'void',
      'voided',
      'deleted',
      'inactive',
    ]) {
      expect(scheduleGenerator).toContain(`'${inactiveValue}'`);
      expect(invoiceGenerator).toContain(`'${inactiveValue}'`);
    }

    const linkUpdate = invoiceGenerator.slice(
      invoiceGenerator.lastIndexOf('UPDATE public.contract_payment_schedules schedule'),
    );
    expect(linkUpdate).toContain('schedule.company_id = v_contract.company_id');
    expect(linkUpdate).toContain('schedule.contract_id = v_contract.id');
    expect(linkUpdate).toContain('FROM public.invoices invoice');
    expect(linkUpdate).toContain("lower(COALESCE(invoice.status, '')) NOT IN");
    expect(linkUpdate).toContain(
      "lower(COALESCE(invoice.payment_status, '')) NOT IN",
    );
  });

  it('blocks non-billable contract lifecycle states for finance and service callers too', () => {
    for (const definition of [scheduleGenerator, invoiceGenerator]) {
      expect(definition).toContain(
        "lower(COALESCE(v_contract.status::text, '')) NOT IN (",
      );
      expect(definition).toContain("'active', 'under_legal_procedure'");
      expect(definition).toMatch(
        /Contract lifecycle does not permit (?:payment schedule|invoice) generation/i,
      );
    }
  });

  it('maps paid and partial aliases without overstating the schedule paid amount', () => {
    expect(scheduleGenerator).toContain("'paid', 'completed', 'cleared'");
    expect(scheduleGenerator).toContain(
      "'partial', 'partial_paid', 'partially_paid'",
    );
    expect(scheduleGenerator).toContain(
      'GREATEST(COALESCE(NULLIF(v_invoice_paid, 0), v_schedule_amount), 0)',
    );
    expect(scheduleGenerator).toContain(
      'LEAST(\n          v_schedule_amount,',
    );
    expect(scheduleGenerator).toContain('SELECT max(payment.payment_date)');
    expect(scheduleGenerator).toContain('FROM public.payment_allocations allocation');
    expect(scheduleGenerator).toContain("allocation.allocation_type = 'invoice'");
    expect(scheduleGenerator).not.toContain("WHEN v_schedule_status = 'paid' THEN v_invoice_date");
  });

  it('company-scopes every candidate and link write and uses stable transaction locks', () => {
    expect(scheduleGenerator).toContain(
      "'contract-payment-schedules:' || v_contract.company_id::text || ':' || v_contract.id::text",
    );
    expect(invoiceGenerator).toContain(
      "'contract-schedule-invoices:' || v_contract.company_id::text || ':' || v_contract.id::text",
    );
    expect(scheduleGenerator).toContain('pg_catalog.pg_advisory_xact_lock(');
    expect(invoiceGenerator).toContain('pg_catalog.pg_advisory_xact_lock(');

    for (const definition of [scheduleGenerator, invoiceGenerator]) {
      expect(definition).toMatch(
        /FROM public\.invoices invoice[\s\S]*?invoice\.company_id = v_contract\.company_id[\s\S]*?invoice\.contract_id = v_contract\.id/i,
      );
      expect(definition).toMatch(
        /FROM public\.contract_payment_schedules schedule[\s\S]*?schedule\.company_id = v_contract\.company_id[\s\S]*?schedule\.contract_id = v_contract\.id/i,
      );
      expect(definition).toContain('FOR UPDATE');
    }

    expect(scheduleGenerator).not.toMatch(
      /UPDATE public\.contract_payment_schedules/i,
    );
    expect(invoiceGenerator).toMatch(
      /UPDATE public\.contract_payment_schedules schedule[\s\S]*?schedule\.company_id = v_contract\.company_id[\s\S]*?schedule\.contract_id = v_contract\.id/i,
    );
  });

  it('bootstraps schedules before generating invoices and remains idempotent per active month', () => {
    const bootstrap = invoiceGenerator.indexOf(
      'PERFORM public.generate_payment_schedules_for_contract(p_contract_id, false);',
    );
    const scheduleLoop = invoiceGenerator.indexOf('FOR v_schedule IN');
    const activeInvoiceLookup = invoiceGenerator.indexOf(
      'COALESCE(invoice.invoice_month, invoice.invoice_date)',
      scheduleLoop,
    );
    const canonicalGeneration = invoiceGenerator.indexOf(
      'v_invoice_id := public.generate_invoice_for_contract_month(',
      scheduleLoop,
    );

    expect(bootstrap).toBeGreaterThan(-1);
    expect(scheduleLoop).toBeGreaterThan(bootstrap);
    expect(activeInvoiceLookup).toBeGreaterThan(scheduleLoop);
    expect(canonicalGeneration).toBeGreaterThan(activeInvoiceLookup);
    expect(invoiceGenerator).not.toContain('INSERT INTO public.invoices (');
    expect(invoiceGenerator).not.toContain('INSERT INTO public.invoice_items (');
  });

  it('refuses paid schedules and closed periods and requires a posted balanced invoice journal', () => {
    expect(invoiceGenerator).toContain('abs(COALESCE(v_schedule.paid_amount, 0)) > 0.01');
    expect(invoiceGenerator).toContain('v_schedule.paid_date IS NOT NULL');
    expect(invoiceGenerator).toContain('public.system_agent_date_in_closed_period(');
    expect(invoiceGenerator).toContain('Canonical invoice postcondition failed');
    expect(invoiceGenerator).toContain('public.generate_invoice_for_contract_month(');
  });

  it('uses one canonical insertion boundary for UI, bulk, and reconciliation paths', () => {
    expect(invoiceGenerator).toContain(
      'v_invoice_id := public.generate_invoice_for_contract_month(',
    );
    expect(invoiceGenerator).not.toContain('INSERT INTO public.invoices (');
    expect(invoiceGenerator).not.toContain('INSERT INTO public.invoice_items (');
  });

  it('restores the exact prior definitions and best-known legacy ACLs on rollback', () => {
    expect(
      extractFunctionDefinition(
        rollback,
        'generate_invoices_from_payment_schedule',
      ),
    ).toBe(
      extractFunctionDefinition(
        invoiceBaseline,
        'generate_invoices_from_payment_schedule',
      ),
    );
    expect(
      extractFunctionDefinition(
        rollback,
        'generate_payment_schedules_for_contract',
      ),
    ).toBe(
      extractFunctionDefinition(
        scheduleBaseline,
        'generate_payment_schedules_for_contract',
      ),
    );

    expect(rollback).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.generate_invoices_from_payment_schedule\(uuid\)\s+TO PUBLIC, authenticated, service_role;/i,
    );
    expect(rollback).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.generate_payment_schedules_for_contract\(uuid, boolean\)\s+TO PUBLIC, authenticated;/i,
    );
  });
});
