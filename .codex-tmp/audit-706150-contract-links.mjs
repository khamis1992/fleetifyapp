import { config } from 'dotenv';

config({ path: '.env', quiet: true });
const baseUrl = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const companyId = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const sourceId = '2732d28f-d460-4d25-8a1e-b7da3ae32323';
const marwanId = '1479ae09-5b28-4d59-ac57-43943e8a37cb';
const headers = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };

async function query(table, params) {
  const response = await fetch(`${baseUrl}/rest/v1/${table}?${new URLSearchParams(params)}`, { headers });
  if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`);
  return response.json();
}

const specResponse = await fetch(`${baseUrl}/rest/v1/`, {
  headers: { ...headers, Accept: 'application/openapi+json' },
});
if (!specResponse.ok) throw new Error(`OpenAPI: ${specResponse.status}`);
const spec = await specResponse.json();
const schemas = spec.definitions ?? spec.components?.schemas ?? {};

async function linksFor(contractId) {
  const links = [];
  for (const [table, schema] of Object.entries(schemas)) {
    const props = schema?.properties ?? {};
    if (!Object.hasOwn(props, 'contract_id') || table.startsWith('rpc_')) continue;
    try {
      const rows = await query(table, { select: '*', contract_id: `eq.${contractId}`, limit: '1000' });
      if (rows.length) {
        links.push({
          table,
          count: rows.length,
          ids: rows.slice(0, 20).map(({ id }) => id).filter(Boolean),
          statuses: rows.reduce((acc, row) => {
            const status = row.status ?? row.payment_status ?? row.case_status ?? row.workflow_stage ?? 'none';
            acc[status] = (acc[status] ?? 0) + 1;
            return acc;
          }, {}),
        });
      }
    } catch {
      // Some views intentionally require additional arguments or do not expose rows.
    }
  }
  return links.sort((a, b) => a.table.localeCompare(b.table));
}

async function financialSummary(contractId) {
  const [payments, invoices, schedules, violations, penalties, docs, legalCases, delinquent] = await Promise.all([
    query('payments', { select: 'id,amount,payment_status,invoice_id', company_id: `eq.${companyId}`, contract_id: `eq.${contractId}` }),
    query('invoices', { select: 'id,total_amount,paid_amount,balance_due,payment_status,penalty_id', company_id: `eq.${companyId}`, contract_id: `eq.${contractId}` }),
    query('contract_payment_schedules', { select: 'id,amount,paid_amount,status,due_date', company_id: `eq.${companyId}`, contract_id: `eq.${contractId}` }),
    query('traffic_violations', { select: 'id,fine_amount,status,violation_date', company_id: `eq.${companyId}`, contract_id: `eq.${contractId}` }),
    query('penalties', { select: 'id,amount,payment_status,penalty_number', company_id: `eq.${companyId}`, contract_id: `eq.${contractId}` }),
    query('contract_documents', { select: 'id,document_type,document_name,original_filename,legal_evidence_state,ai_match_status', company_id: `eq.${companyId}`, contract_id: `eq.${contractId}` }),
    query('legal_cases', { select: 'id,case_number,case_status,workflow_stage,billing_status,case_value', company_id: `eq.${companyId}`, contract_id: `eq.${contractId}` }),
    query('delinquent_customers', { select: 'id,is_active,contract_number,total_debt,overdue_amount', company_id: `eq.${companyId}`, contract_id: `eq.${contractId}` }),
  ]);
  const paymentIds = payments.map(({ id }) => id);
  const allocations = paymentIds.length ? await query('payment_allocations', {
    select: 'id,payment_id,target_id,allocation_type,amount,is_active',
    company_id: `eq.${companyId}`, payment_id: `in.(${paymentIds.join(',')})`, limit: '1000',
  }) : [];
  return {
    payments: { count: payments.length, total: payments.reduce((n, r) => n + Number(r.amount ?? 0), 0) },
    allocations: { count: allocations.length, active: allocations.filter((r) => r.is_active).length, total: allocations.filter((r) => r.is_active).reduce((n, r) => n + Number(r.amount ?? 0), 0) },
    invoices: { count: invoices.length, total: invoices.reduce((n, r) => n + Number(r.total_amount ?? 0), 0), paid: invoices.reduce((n, r) => n + Number(r.paid_amount ?? 0), 0) },
    schedules: { count: schedules.length, total: schedules.reduce((n, r) => n + Number(r.amount ?? 0), 0), paid: schedules.reduce((n, r) => n + Number(r.paid_amount ?? 0), 0), first: schedules.map((r) => r.due_date).sort()[0] ?? null, last: schedules.map((r) => r.due_date).sort().at(-1) ?? null },
    violations, penalties, docs, legalCases, delinquent,
  };
}

console.log(JSON.stringify({
  source: { links: await linksFor(sourceId), financial: await financialSummary(sourceId) },
  marwan: { links: await linksFor(marwanId), financial: await financialSummary(marwanId) },
}, null, 2));
