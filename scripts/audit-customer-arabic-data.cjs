const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnv(name) {
  if (process.env[name]) return process.env[name];

  for (const fileName of ['.env', '.env.taqadi-agent']) {
    const envPath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(envPath)) continue;
    const text = fs.readFileSync(envPath, 'utf8');
    const match = text.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'));
    if (match?.[1]) return match[1];
  }

  return undefined;
}

const supabaseUrl = readEnv('VITE_SUPABASE_URL') || readEnv('TAQADI_SUPABASE_URL');
const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY') || readEnv('TAQADI_SUPABASE_SERVICE_ROLE_KEY');
const companyId = process.env.COMPANY_ID || '24bc0b21-4e2d-4413-9842-31719a3669f4';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL/TAQADI_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/TAQADI_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const PAGE_SIZE = 1000;
const ARABIC_RE = /[\u0600-\u06FF]/;
const hasArabicText = (value) => Boolean(value && ARABIC_RE.test(String(value)));
const isCompanyCustomer = (customer) => (
  ['company', 'corporate'].includes(String(customer.customer_type || '').toLowerCase())
);

function customerName(customer) {
  return [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim()
    || customer.company_name
    || '';
}

function customerArabicName(customer) {
  if (isCompanyCustomer(customer)) return customer.company_name_ar || '';
  return [customer.first_name_ar, customer.last_name_ar].filter(Boolean).join(' ').trim();
}

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function issueLabel(issue) {
  if (issue === 'missing_arabic_name') return 'الاسم العربي الرسمي ناقص أو غير عربي';
  if (issue === 'missing_arabic_nationality') return 'الجنسية العربية ناقصة أو غير عربية';
  return issue;
}

function requiredAction(issues) {
  const actions = [];
  if (issues.includes('missing_arabic_name')) {
    actions.push('استكمال الاسم العربي الرسمي من الهوية أو الجواز');
  }
  if (issues.includes('missing_arabic_nationality')) {
    actions.push('استكمال الجنسية بالعربي من مستند رسمي');
  }
  return actions.join('؛ ');
}

function buildIssueCsv(rows) {
  return [
    'customer_id,name,name_ar,nationality,phone,contracts,active_contracts,issues,issues_ar,required_action',
    ...rows.map((row) => [
      row.customer_id,
      row.name,
      row.name_ar,
      row.nationality,
      row.phone,
      row.contracts,
      row.active_contracts,
      row.issues.join('; '),
      row.issues.map(issueLabel).join('؛ '),
      requiredAction(row.issues),
    ].map(csvValue).join(',')),
  ].join('\n');
}

async function selectAll(table, columns, buildQuery = (query) => query) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(
      supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1)
    );
    if (error) throw error;

    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function isActiveContract(contract) {
  const status = String(contract.status || '').toLowerCase();
  return ['active', '\u0646\u0634\u0637'].includes(status) || status.includes('\u0646\u0634\u0637');
}

function compareIssueRows(a, b) {
  const aMissingName = a.issues.includes('missing_arabic_name') ? 0 : 1;
  const bMissingName = b.issues.includes('missing_arabic_name') ? 0 : 1;
  if (aMissingName !== bMissingName) return aMissingName - bMissingName;

  return String(a.active_contracts || a.contracts || a.name).localeCompare(
    String(b.active_contracts || b.contracts || b.name),
    'ar'
  );
}

async function main() {
  const [customers, contracts] = await Promise.all([
    selectAll(
      'customers',
      'id,first_name,last_name,first_name_ar,last_name_ar,company_name,company_name_ar,customer_type,nationality,phone,company_id',
      (query) => query.eq('company_id', companyId)
    ),
    selectAll(
      'contracts',
      'id,contract_number,customer_id,status,company_id',
      (query) => query.eq('company_id', companyId)
    ),
  ]);

  const contractsByCustomer = new Map();
  for (const contract of contracts) {
    if (!contractsByCustomer.has(contract.customer_id)) {
      contractsByCustomer.set(contract.customer_id, []);
    }
    contractsByCustomer.get(contract.customer_id).push(contract);
  }

  const issueRows = customers.flatMap((customer) => {
    const issues = [];
    if (!hasArabicText(customerArabicName(customer))) issues.push('missing_arabic_name');
    if (!hasArabicText(customer.nationality)) issues.push('missing_arabic_nationality');
    if (issues.length === 0) return [];

    const customerContracts = contractsByCustomer.get(customer.id) || [];
    const activeContracts = customerContracts.filter(isActiveContract);
    return [{
      customer_id: customer.id,
      name: customerName(customer),
      name_ar: customerArabicName(customer),
      nationality: customer.nationality || '',
      phone: customer.phone || '',
      contracts: customerContracts.map((contract) => contract.contract_number).join('; '),
      active_contracts: activeContracts.map((contract) => contract.contract_number).join('; '),
      active_contracts_count: activeContracts.length,
      issues,
    }];
  }).sort(compareIssueRows);

  const outputDir = path.join(process.cwd(), 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const activeIssueRows = issueRows.filter((row) => row.active_contracts_count > 0);
  const csvPath = path.join(outputDir, 'customer-arabic-data-current-audit.csv');
  const activeCsvPath = path.join(outputDir, 'customer-arabic-data-active-issues.csv');
  const summaryPath = path.join(outputDir, 'customer-arabic-data-current-summary.json');

  const summary = {
    generatedAt: new Date().toISOString(),
    companyId,
    csvPath,
    activeCsvPath,
    summaryPath,
    total_customers: customers.length,
    total_contracts: contracts.length,
    customers_with_issues: issueRows.length,
    active_contract_customers_with_issues: issueRows.filter((row) => row.active_contracts_count > 0).length,
    missing_arabic_name: issueRows.filter((row) => row.issues.includes('missing_arabic_name')).length,
    missing_arabic_nationality: issueRows.filter((row) => row.issues.includes('missing_arabic_nationality')).length,
    arabic_name_issue_samples: issueRows
      .filter((row) => row.issues.includes('missing_arabic_name'))
      .slice(0, 10),
    active_issue_samples: issueRows
      .filter((row) => row.active_contracts_count > 0)
      .slice(0, 25),
  };

  fs.writeFileSync(csvPath, `\uFEFF${buildIssueCsv(issueRows)}`, 'utf8');
  fs.writeFileSync(activeCsvPath, `\uFEFF${buildIssueCsv(activeIssueRows)}`, 'utf8');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
