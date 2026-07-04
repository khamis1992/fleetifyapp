const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const PAGE_SIZE = 1000;
const CLOSED_INVOICE_STATUSES = new Set(['cancelled', 'canceled', 'voided', 'reversed', 'refunded']);

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].trim().replace(/^["']|["']$/g, '')])
  );
}

const env = {
  ...readEnvFile(path.join(process.cwd(), '.env.local')),
  ...readEnvFile(path.join(process.cwd(), '.env')),
  ...process.env,
};

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or service role key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2)
      .filter((arg) => arg.startsWith('--') && arg.includes('='))
      .map((arg) => {
        const [key, ...value] = arg.slice(2).split('=');
        return [key, value.join('=')];
      })
  );

  return {
    companyId: args['company-id'] || DEFAULT_COMPANY_ID,
    outputDir: args['output-dir'] || path.join(process.cwd(), 'reports'),
  };
}

async function selectAll(table, columns, buildQuery = (query) => query) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(
      supabase
        .from(table)
        .select(columns)
        .range(from, from + PAGE_SIZE - 1)
    );

    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function dateOnly(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function isBefore(a, b) {
  return a && b && a < b;
}

function isAfter(a, b) {
  return a && b && a > b;
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')),
  ].join('\n');
}

function customerName(customer) {
  if (!customer) return '';
  const arabic = [customer.first_name_ar, customer.last_name_ar].filter(Boolean).join(' ').trim();
  const english = [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim();
  return arabic || english || customer.company_name_ar || customer.company_name || customer.phone || customer.id;
}

function issueLabel(codes) {
  if (!codes.length) return 'OK';
  const labels = {
    contract_missing_start_date: 'Contract missing start date',
    contract_missing_end_date: 'Contract missing end date',
    contract_start_after_end: 'Contract start date is after end date',
    invoice_missing_invoice_date: 'Invoice missing invoice date',
    invoice_missing_due_date: 'Invoice missing due date',
    invoice_date_before_contract_start: 'Invoice date before contract start',
    invoice_date_after_contract_end: 'Invoice date after contract end',
    due_date_before_contract_start: 'Due date before contract start',
    due_date_after_contract_end: 'Due date after contract end',
    invoice_contract_not_found: 'Invoice references missing agreement',
  };
  return codes.map((code) => labels[code] || code).join('; ');
}

function isClosedInvoice(row) {
  return CLOSED_INVOICE_STATUSES.has(String(row.invoice_status || '').toLowerCase())
    || CLOSED_INVOICE_STATUSES.has(String(row.payment_status || '').toLowerCase());
}

async function main() {
  const { companyId, outputDir } = parseArgs();
  fs.mkdirSync(outputDir, { recursive: true });

  const [contracts, invoices, customers] = await Promise.all([
    selectAll(
      'contracts',
      'id,contract_number,start_date,end_date,status,customer_id,vehicle_id,license_plate,contract_amount,monthly_amount',
      (query) => query.eq('company_id', companyId).order('contract_number', { ascending: true })
    ),
    selectAll(
      'invoices',
      'id,invoice_number,invoice_date,due_date,total_amount,paid_amount,balance_due,status,payment_status,contract_id,customer_id,invoice_type,created_at',
      (query) => query.eq('company_id', companyId).not('contract_id', 'is', null).order('invoice_date', { ascending: true })
    ),
    selectAll(
      'customers',
      'id,first_name,first_name_ar,last_name,last_name_ar,company_name,company_name_ar,phone,customer_code',
      (query) => query.eq('company_id', companyId)
    ),
  ]);

  const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const invoicesByContract = new Map();
  for (const invoice of invoices) {
    const group = invoicesByContract.get(invoice.contract_id) || [];
    group.push(invoice);
    invoicesByContract.set(invoice.contract_id, group);
  }

  const contractIssueRows = contracts
    .map((contract) => {
      const startDate = dateOnly(contract.start_date);
      const endDate = dateOnly(contract.end_date);
      const issues = [];
      if (!startDate) issues.push('contract_missing_start_date');
      if (!endDate) issues.push('contract_missing_end_date');
      if (startDate && endDate && startDate > endDate) issues.push('contract_start_after_end');

      return {
        agreement_id: contract.id,
        agreement_number: contract.contract_number,
        agreement_status: contract.status,
        customer_id: contract.customer_id,
        customer_name: customerName(customerById.get(contract.customer_id)),
        agreement_start_date: startDate || '',
        agreement_end_date: endDate || '',
        contract_amount: Number(contract.contract_amount || 0).toFixed(2),
        monthly_amount: Number(contract.monthly_amount || 0).toFixed(2),
        linked_invoice_count: invoicesByContract.get(contract.id)?.length || 0,
        issue_codes: issues.join('|'),
        issue_summary: issueLabel(issues),
      };
    })
    .filter((row) => row.issue_codes);

  const invoiceRows = invoices.map((invoice) => {
    const contract = contractById.get(invoice.contract_id);
    const contractStart = dateOnly(contract?.start_date);
    const contractEnd = dateOnly(contract?.end_date);
    const invoiceDate = dateOnly(invoice.invoice_date);
    const dueDate = dateOnly(invoice.due_date);
    const issues = [];

    if (!contract) issues.push('invoice_contract_not_found');
    if (contract && !contractStart) issues.push('contract_missing_start_date');
    if (contract && !contractEnd) issues.push('contract_missing_end_date');
    if (contractStart && contractEnd && contractStart > contractEnd) issues.push('contract_start_after_end');
    if (!invoiceDate) issues.push('invoice_missing_invoice_date');
    if (!dueDate) issues.push('invoice_missing_due_date');
    if (invoiceDate && contractStart && isBefore(invoiceDate, contractStart)) issues.push('invoice_date_before_contract_start');
    if (invoiceDate && contractEnd && isAfter(invoiceDate, contractEnd)) issues.push('invoice_date_after_contract_end');
    if (dueDate && contractStart && isBefore(dueDate, contractStart)) issues.push('due_date_before_contract_start');
    if (dueDate && contractEnd && isAfter(dueDate, contractEnd)) issues.push('due_date_after_contract_end');

    return {
      agreement_id: invoice.contract_id,
      agreement_number: contract?.contract_number || '',
      agreement_status: contract?.status || '',
      customer_id: invoice.customer_id || contract?.customer_id || '',
      customer_name: customerName(customerById.get(invoice.customer_id || contract?.customer_id)),
      agreement_start_date: contractStart || '',
      agreement_end_date: contractEnd || '',
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoiceDate || '',
      due_date: dueDate || '',
      invoice_status: invoice.status,
      payment_status: invoice.payment_status,
      invoice_type: invoice.invoice_type,
      total_amount: Number(invoice.total_amount || 0).toFixed(2),
      paid_amount: Number(invoice.paid_amount || 0).toFixed(2),
      balance_due: Number(invoice.balance_due || 0).toFixed(2),
      is_within_agreement_duration: issues.length === 0 ? 'yes' : 'no',
      issue_codes: issues.join('|'),
      issue_summary: issueLabel(issues),
    };
  });

  const issueRows = invoiceRows.filter((row) => row.issue_codes);
  const agreementsWithoutInvoices = contracts
    .filter((contract) => !invoicesByContract.has(contract.id))
    .map((contract) => ({
      agreement_id: contract.id,
      agreement_number: contract.contract_number,
      agreement_status: contract.status,
      customer_id: contract.customer_id,
      customer_name: customerName(customerById.get(contract.customer_id)),
      agreement_start_date: dateOnly(contract.start_date) || '',
      agreement_end_date: dateOnly(contract.end_date) || '',
      contract_amount: Number(contract.contract_amount || 0).toFixed(2),
      monthly_amount: Number(contract.monthly_amount || 0).toFixed(2),
    }));

  const issueCounts = {};
  for (const row of issueRows) {
    for (const code of row.issue_codes.split('|').filter(Boolean)) {
      issueCounts[code] = (issueCounts[code] || 0) + 1;
    }
  }

  const affectedAgreementIds = new Set(issueRows.map((row) => row.agreement_id).filter(Boolean));
  const outsideDurationRows = issueRows.filter((row) =>
    row.issue_codes.split('|').some((code) =>
      [
        'invoice_date_before_contract_start',
        'invoice_date_after_contract_end',
        'due_date_before_contract_start',
        'due_date_after_contract_end',
      ].includes(code)
    )
  );
  const activeOutsideDurationRows = outsideDurationRows.filter((row) => !isClosedInvoice(row));

  const summary = {
    companyId,
    generatedAt: new Date().toISOString(),
    agreementsChecked: contracts.length,
    agreementsWithDateIssues: contractIssueRows.length,
    agreementsWithStartAfterEnd: contractIssueRows.filter((row) => row.issue_codes.includes('contract_start_after_end')).length,
    linkedInvoicesChecked: invoices.length,
    invoicesWithinAgreementDuration: invoiceRows.length - issueRows.length,
    invoicesWithAnyIssue: issueRows.length,
    invoicesOutsideAgreementDuration: outsideDurationRows.length,
    activeInvoicesOutsideAgreementDuration: activeOutsideDurationRows.length,
    affectedAgreements: affectedAgreementIds.size,
    agreementsWithoutInvoices: agreementsWithoutInvoices.length,
    issueCounts,
  };

  const timestamp = summary.generatedAt.replace(/[:.]/g, '-');
  const baseName = `agreement-invoice-duration-audit-${companyId}-${timestamp}`;
  const jsonPath = path.join(outputDir, `${baseName}.json`);
  const mdPath = path.join(outputDir, `${baseName}.md`);
  const issueCsvPath = path.join(outputDir, `${baseName}-issues.csv`);
  const allCsvPath = path.join(outputDir, `${baseName}-all-invoices.csv`);
  const noInvoiceCsvPath = path.join(outputDir, `${baseName}-agreements-without-invoices.csv`);
  const contractIssueCsvPath = path.join(outputDir, `${baseName}-agreement-date-issues.csv`);

  const invoiceColumns = [
    'agreement_number',
    'agreement_status',
    'customer_name',
    'agreement_start_date',
    'agreement_end_date',
    'invoice_number',
    'invoice_date',
    'due_date',
    'invoice_status',
    'payment_status',
    'invoice_type',
    'total_amount',
    'paid_amount',
    'balance_due',
    'is_within_agreement_duration',
    'issue_summary',
    'agreement_id',
    'invoice_id',
  ];

  fs.writeFileSync(jsonPath, JSON.stringify({
    summary,
    agreementDateIssues: contractIssueRows,
    issues: issueRows,
    allInvoices: invoiceRows,
    agreementsWithoutInvoices,
  }, null, 2));
  fs.writeFileSync(issueCsvPath, toCsv(issueRows, invoiceColumns));
  fs.writeFileSync(allCsvPath, toCsv(invoiceRows, invoiceColumns));
  fs.writeFileSync(contractIssueCsvPath, toCsv(contractIssueRows, Object.keys(contractIssueRows[0] || {
    agreement_id: '',
    agreement_number: '',
    agreement_status: '',
    customer_id: '',
    customer_name: '',
    agreement_start_date: '',
    agreement_end_date: '',
    contract_amount: '',
    monthly_amount: '',
    linked_invoice_count: '',
    issue_codes: '',
    issue_summary: '',
  })));
  fs.writeFileSync(noInvoiceCsvPath, toCsv(agreementsWithoutInvoices, Object.keys(agreementsWithoutInvoices[0] || {
    agreement_id: '',
    agreement_number: '',
    agreement_status: '',
    customer_id: '',
    customer_name: '',
    agreement_start_date: '',
    agreement_end_date: '',
    contract_amount: '',
    monthly_amount: '',
  })));

  const topIssues = issueRows.slice(0, 100);
  const topContractIssues = contractIssueRows.slice(0, 100);
  const topNoInvoice = agreementsWithoutInvoices.slice(0, 100);

  const md = [
    '# Agreement Invoice Duration Audit',
    '',
    `Generated: ${summary.generatedAt}`,
    `Company ID: ${companyId}`,
    '',
    '## Summary',
    '',
    `- Agreements checked: ${summary.agreementsChecked}`,
    `- Agreements with invalid/missing duration dates: ${summary.agreementsWithDateIssues}`,
    `- Agreements where start date is after end date: ${summary.agreementsWithStartAfterEnd}`,
    `- Linked invoices checked: ${summary.linkedInvoicesChecked}`,
    `- Invoices fully within agreement duration: ${summary.invoicesWithinAgreementDuration}`,
    `- Invoices with any date issue: ${summary.invoicesWithAnyIssue}`,
    `- Invoices outside agreement duration: ${summary.invoicesOutsideAgreementDuration}`,
    `- Active invoices outside agreement duration: ${summary.activeInvoicesOutsideAgreementDuration}`,
    `- Affected agreements: ${summary.affectedAgreements}`,
    `- Agreements without linked invoices: ${summary.agreementsWithoutInvoices}`,
    '',
    '## Issue Counts',
    '',
    Object.keys(issueCounts).length
      ? Object.entries(issueCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => `- ${code}: ${count}`)
        .join('\n')
      : '- No invoice date issues found.',
    '',
    '## Agreement Date Issues',
    '',
    topContractIssues.length
      ? '| Agreement | Customer | Start | End | Status | Linked Invoices | Issue |\n'
        + '|---|---|---:|---:|---|---:|---|\n'
        + topContractIssues.map((row) => `| ${row.agreement_number} | ${row.customer_name} | ${row.agreement_start_date} | ${row.agreement_end_date} | ${row.agreement_status} | ${row.linked_invoice_count} | ${row.issue_summary} |`).join('\n')
      : 'No agreement date issues found.',
    '',
    topContractIssues.length < contractIssueRows.length ? `Only first ${topContractIssues.length} agreement date issues shown here. See CSV for full list.` : '',
    '',
    '## Invoice Exceptions',
    '',
    topIssues.length
      ? '| Agreement | Customer | Agreement Start | Agreement End | Invoice | Invoice Date | Due Date | Amount | Status | Issue |\n'
        + '|---|---|---:|---:|---|---:|---:|---:|---|---|\n'
        + topIssues.map((row) => `| ${row.agreement_number || row.agreement_id} | ${row.customer_name} | ${row.agreement_start_date} | ${row.agreement_end_date} | ${row.invoice_number} | ${row.invoice_date} | ${row.due_date} | ${row.total_amount} | ${row.invoice_status}/${row.payment_status} | ${row.issue_summary} |`).join('\n')
      : 'No invoice exceptions found.',
    '',
    topIssues.length < issueRows.length ? `Only first ${topIssues.length} exceptions shown here. See CSV for full list.` : '',
    '',
    '## Agreements Without Linked Invoices',
    '',
    topNoInvoice.length
      ? '| Agreement | Customer | Start | End | Status | Contract Amount | Monthly Amount |\n'
        + '|---|---|---:|---:|---|---:|---:|\n'
        + topNoInvoice.map((row) => `| ${row.agreement_number} | ${row.customer_name} | ${row.agreement_start_date} | ${row.agreement_end_date} | ${row.agreement_status} | ${row.contract_amount} | ${row.monthly_amount} |`).join('\n')
      : 'Every agreement has at least one linked invoice.',
    '',
    topNoInvoice.length < agreementsWithoutInvoices.length ? `Only first ${topNoInvoice.length} agreements without invoices shown here. See CSV for full list.` : '',
    '',
    '## Output Files',
    '',
    `- JSON: ${jsonPath}`,
    `- Issue CSV: ${issueCsvPath}`,
    `- All linked invoices CSV: ${allCsvPath}`,
    `- Agreement date issues CSV: ${contractIssueCsvPath}`,
    `- Agreements without invoices CSV: ${noInvoiceCsvPath}`,
    '',
  ].join('\n');

  fs.writeFileSync(mdPath, md);

  console.log(JSON.stringify({
    status: issueRows.length ? 'issues_found' : 'ok',
    summary,
    mdPath,
    jsonPath,
    issueCsvPath,
    allCsvPath,
    contractIssueCsvPath,
    noInvoiceCsvPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
