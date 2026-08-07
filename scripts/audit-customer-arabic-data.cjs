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

function normalizeArabic(value) {
  return String(value || '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0600-\u06FF0-9A-Za-z]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function proposalChanges(proposal) {
  return Array.isArray(proposal.proposed_changes) ? proposal.proposed_changes : [];
}

function signedDocumentNameProposal(proposal) {
  const changes = proposalChanges(proposal)
    .filter((change) => ['first_name_ar', 'last_name_ar', 'company_name_ar'].includes(change.field));
  if (changes.length === 0) return null;

  const proposedName = [
    changes.find((change) => change.field === 'first_name_ar')?.proposed_value,
    changes.find((change) => change.field === 'last_name_ar')?.proposed_value,
  ].filter(Boolean).join(' ').trim()
    || changes.find((change) => change.field === 'company_name_ar')?.proposed_value
    || '';

  if (!proposedName) return null;

  return {
    proposedName,
    fields: changes.map((change) => change.field).join('; '),
    confidence: Math.max(...changes.map((change) => Number(change.confidence || 0))),
    proposal_id: proposal.id,
    contract_id: proposal.contract_id,
    contract_document_id: proposal.contract_document_id,
  };
}

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function issueLabel(issue) {
  if (issue === 'missing_arabic_name') return 'الاسم العربي الرسمي ناقص أو غير عربي';
  if (issue === 'missing_arabic_nationality') return 'الجنسية العربية ناقصة أو غير عربية';
  if (issue === 'signed_document_name_mismatch') return 'اسم العميل لا يطابق مستند العقد/الهوية الممسوح';
  return issue;
}

function requiredAction(issues) {
  const actions = [];
  if (issues.includes('missing_arabic_name')) {
    actions.push('استكمال الاسم العربي الرسمي من الهوية أو العقد الموقع');
  }
  if (issues.includes('missing_arabic_nationality')) {
    actions.push('استكمال الجنسية بالعربي من مستند رسمي');
  }
  if (issues.includes('signed_document_name_mismatch')) {
    actions.push('مراجعة مقترح ماسح مستندات العقد واعتماد الاسم المطابق للمستند الرسمي');
  }
  return actions.join('؛ ');
}

function buildIssueCsv(rows) {
  return [
    'customer_id,name,name_ar,signed_document_name,nationality,phone,contracts,active_contracts,issues,issues_ar,required_action',
    ...rows.map((row) => [
      row.customer_id,
      row.name,
      row.name_ar,
      row.signed_document_name,
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

  const aMismatch = a.issues.includes('signed_document_name_mismatch') ? 0 : 1;
  const bMismatch = b.issues.includes('signed_document_name_mismatch') ? 0 : 1;
  if (aMismatch !== bMismatch) return aMismatch - bMismatch;

  return String(a.active_contracts || a.contracts || a.name).localeCompare(
    String(b.active_contracts || b.contracts || b.name),
    'ar'
  );
}

async function main() {
  const [customers, contracts, proposals] = await Promise.all([
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
    selectAll(
      'customer_id_scan_proposals',
      'id,customer_id,contract_id,contract_document_id,status,proposed_changes,overall_confidence,company_id',
      (query) => query.eq('company_id', companyId).in('status', ['pending', 'partial'])
    ),
  ]);

  const contractsByCustomer = new Map();
  for (const contract of contracts) {
    if (!contractsByCustomer.has(contract.customer_id)) {
      contractsByCustomer.set(contract.customer_id, []);
    }
    contractsByCustomer.get(contract.customer_id).push(contract);
  }

  const nameProposalsByCustomer = new Map();
  for (const proposal of proposals) {
    if (!proposal.customer_id) continue;
    const nameProposal = signedDocumentNameProposal(proposal);
    if (!nameProposal) continue;
    const list = nameProposalsByCustomer.get(proposal.customer_id) || [];
    list.push(nameProposal);
    nameProposalsByCustomer.set(proposal.customer_id, list);
  }

  const issueRows = customers.flatMap((customer) => {
    const issues = [];
    const currentArabicName = customerArabicName(customer);
    if (!hasArabicText(currentArabicName)) issues.push('missing_arabic_name');
    if (!hasArabicText(customer.nationality)) issues.push('missing_arabic_nationality');

    const signedNameProposal = (nameProposalsByCustomer.get(customer.id) || [])
      .find((proposal) => normalizeArabic(proposal.proposedName) !== normalizeArabic(currentArabicName));
    if (signedNameProposal) issues.push('signed_document_name_mismatch');

    if (issues.length === 0) return [];

    const customerContracts = contractsByCustomer.get(customer.id) || [];
    const activeContracts = customerContracts.filter(isActiveContract);
    return [{
      customer_id: customer.id,
      name: customerName(customer),
      name_ar: currentArabicName,
      signed_document_name: signedNameProposal?.proposedName || '',
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
    signed_document_name_mismatch: issueRows.filter((row) => row.issues.includes('signed_document_name_mismatch')).length,
    pending_id_scan_proposals: proposals.filter((proposal) => proposal.status === 'pending').length,
    partially_reviewed_id_scan_proposals: proposals.filter((proposal) => proposal.status === 'partial').length,
    arabic_name_issue_samples: issueRows
      .filter((row) => row.issues.includes('missing_arabic_name'))
      .slice(0, 10),
    signed_document_name_mismatch_samples: issueRows
      .filter((row) => row.issues.includes('signed_document_name_mismatch'))
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
