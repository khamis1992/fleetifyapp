const fs = require('fs');
const path = require('path');

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;
    const value = fs.readFileSync(filePath, 'utf8')
      .match(new RegExp(`^${name}\\s*=\\s*["']?([^"'\\r\\n]+)`, 'm'))?.[1];
    if (value) return value.trim();
  }
  return null;
}

const baseUrl = readEnv('VITE_SUPABASE_URL');
const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY') || readEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');
if (!baseUrl || !serviceKey) throw new Error('Missing Supabase configuration');

const watchedTables = [
  'payments',
  'invoices',
  'contracts',
  'journal_entries',
  'journal_entry_lines',
  'chart_of_accounts',
  'companies',
  'account_mappings',
  'default_account_types',
  'profiles',
  'user_roles',
  'payment_allocations',
  'payment_allocation_rules',
  'system_agent_repairs',
];
const watchedFunctions = [
  'create_payment_atomic',
  'cancel_payment_with_reversal',
  'reverse_journal_entry',
  'ensure_payment_journal_entry',
  'link_payment_journal_entry_bypass',
  'batch_link_payment_journal_entries',
  'link_payments_bypass_triggers',
  'repair_overpaid_invoice_allocations',
  'restore_erroneously_cancelled_import_payments',
  'system_agent_apply_repair',
  'get_user_company_id',
  'assert_financial_period_is_open',
  'exec_sql',
  'execute_sql',
];

function definitionColumns(definition) {
  return Object.entries(definition?.properties || {}).map(([name, value]) => ({
    name,
    type: value.type || value.format || null,
    format: value.format || null,
    required: (definition.required || []).includes(name),
    enum: value.enum || null,
  }));
}

async function main() {
  const response = await fetch(`${baseUrl}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/openapi+json, application/json',
    },
  });
  if (!response.ok) throw new Error(`OpenAPI request failed: ${response.status} ${await response.text()}`);
  const spec = await response.json();
  const definitions = spec.definitions || spec.components?.schemas || {};
  const paths = spec.paths || {};

  const tables = {};
  for (const table of watchedTables) {
    const definition = definitions[table];
    tables[table] = {
      exposed: Boolean(paths[`/${table}`]),
      definition_present: Boolean(definition),
      columns: definitionColumns(definition),
    };
  }

  const functions = {};
  for (const functionName of watchedFunctions) {
    const rpcPath = paths[`/rpc/${functionName}`];
    functions[functionName] = {
      exposed: Boolean(rpcPath),
      methods: rpcPath ? Object.keys(rpcPath).filter((key) => ['get', 'post'].includes(key)) : [],
      parameters: rpcPath?.post?.parameters || rpcPath?.get?.parameters || [],
      summary: rpcPath?.post?.summary || rpcPath?.get?.summary || null,
    };
  }

  const report = {
    generated_at: new Date().toISOString(),
    openapi_version: spec.swagger || spec.openapi || null,
    tables,
    functions,
    administrative_rpc_candidates: Object.keys(paths)
      .filter((rpcPath) => rpcPath.startsWith('/rpc/'))
      .map((rpcPath) => rpcPath.slice('/rpc/'.length))
      .filter((name) => /(sql|query|execute|migration|ddl|admin|schema)/i.test(name))
      .sort(),
  };
  const outputPath = path.join(process.cwd(), 'reports', 'production-openapi-financial-schema.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({
    outputPath,
    tables: Object.fromEntries(Object.entries(tables).map(([key, value]) => [key, value.exposed])),
    functions: Object.fromEntries(Object.entries(functions).map(([key, value]) => [key, value.exposed])),
    administrativeRpcCandidates: report.administrative_rpc_candidates,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
