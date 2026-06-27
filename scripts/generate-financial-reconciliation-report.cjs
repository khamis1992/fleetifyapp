const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return undefined;
  const text = fs.readFileSync(envPath, 'utf8');
  return text.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'))?.[1];
}

const supabaseUrl = readEnv('VITE_SUPABASE_URL');
const serviceRoleKey = readEnv('VITE_SUPABASE_SERVICE_ROLE_KEY') || readEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL and service role key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const PAGE_SIZE = 1000;

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

function sum(rows, selector) {
  return Number(rows.reduce((total, row) => total + Number(selector(row) || 0), 0).toFixed(2));
}

function groupBy(rows, keySelector) {
  const grouped = new Map();
  for (const row of rows) {
    const key = keySelector(row) || 'unassigned';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  return grouped;
}

async function main() {
  const failOnCritical = process.argv.includes('--fail-on-critical');
  const [companies, invoices, payments, journalEntries, bankTransactions] = await Promise.all([
    selectAll('companies', 'id,name'),
    selectAll('invoices', 'id,company_id,invoice_number,total_amount,paid_amount,balance_due,payment_status,status'),
    selectAll('payments', 'id,company_id,payment_number,invoice_id,amount,payment_status,journal_entry_id,reconciliation_status,reconciled_at,payment_method'),
    selectAll('journal_entries', 'id,company_id,entry_number,status,reference_type,reference_id,total_debit,total_credit'),
    selectAll('bank_transactions', 'id,company_id,transaction_number,amount,status,reconciled,reconciled_at,reference_number'),
  ]);

  const issues = [];
  const byCompany = companies.map((company) => {
    const companyInvoices = invoices.filter((row) => row.company_id === company.id);
    const companyPayments = payments.filter((row) => row.company_id === company.id);
    const companyEntries = journalEntries.filter((row) => row.company_id === company.id);
    const companyBankTransactions = bankTransactions.filter((row) => row.company_id === company.id);

    const paymentsByInvoice = groupBy(
      companyPayments.filter((payment) => payment.payment_status === 'completed' && payment.invoice_id),
      (payment) => payment.invoice_id
    );

    const invoiceMismatches = [];
    for (const invoice of companyInvoices) {
      const linkedPayments = paymentsByInvoice.get(invoice.id) || [];
      const linkedPaid = sum(linkedPayments, (payment) => payment.amount);
      const recordedPaid = Number(invoice.paid_amount || 0);
      const totalAmount = Number(invoice.total_amount || 0);
      const recordedBalance = Number(invoice.balance_due || 0);
      const expectedBalance = Number(Math.max(totalAmount - linkedPaid, 0).toFixed(2));

      if (
        Math.abs(linkedPaid - recordedPaid) > 0.01
        || Math.abs(expectedBalance - recordedBalance) > 0.01
        || linkedPaid - totalAmount > 0.01
      ) {
        invoiceMismatches.push({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          total_amount: totalAmount,
          linked_paid: linkedPaid,
          recorded_paid: recordedPaid,
          expected_balance: expectedBalance,
          recorded_balance: recordedBalance,
        });
      }
    }

    const completedPayments = companyPayments.filter((payment) => payment.payment_status === 'completed');
    const postedEntries = companyEntries.filter((entry) => entry.status === 'posted');
    const paymentJournalReferenceIds = new Set(
      companyEntries
        .filter((entry) => entry.reference_type === 'payment' && entry.reference_id)
        .map((entry) => entry.reference_id)
    );
    const journalEntryIds = new Set(companyEntries.map((entry) => entry.id));
    const missingJournalEntries = completedPayments.filter((payment) => (
      !payment.journal_entry_id
      && !paymentJournalReferenceIds.has(payment.id)
    ));
    const brokenJournalLinks = completedPayments.filter((payment) => (
      payment.journal_entry_id
      && !journalEntryIds.has(payment.journal_entry_id)
    ));
    const unbalancedEntries = postedEntries.filter((entry) => (
      Math.abs(Number(entry.total_debit || 0) - Number(entry.total_credit || 0)) > 0.01
    ));
    const unreconciledBankTransactions = companyBankTransactions.filter((transaction) => (
      transaction.status === 'completed' && !transaction.reconciled && !transaction.reconciled_at
    ));

    if (invoiceMismatches.length > 0) {
      issues.push({ company_id: company.id, company_name: company.name, code: 'invoice_payment_mismatch', count: invoiceMismatches.length });
    }
    if (missingJournalEntries.length > 0) {
      issues.push({ company_id: company.id, company_name: company.name, code: 'completed_payment_missing_journal', count: missingJournalEntries.length });
    }
    if (brokenJournalLinks.length > 0) {
      issues.push({ company_id: company.id, company_name: company.name, code: 'completed_payment_broken_journal_link', count: brokenJournalLinks.length });
    }
    if (unbalancedEntries.length > 0) {
      issues.push({ company_id: company.id, company_name: company.name, code: 'unbalanced_posted_journal_entry', count: unbalancedEntries.length });
    }

    return {
      company_id: company.id,
      company_name: company.name,
      invoices: {
        count: companyInvoices.length,
        total_amount: sum(companyInvoices, (invoice) => invoice.total_amount),
        mismatches: invoiceMismatches.length,
        sample_mismatches: invoiceMismatches.slice(0, 10),
      },
      payments: {
        completed_count: completedPayments.length,
        completed_amount: sum(completedPayments, (payment) => payment.amount),
        missing_journal_entries: missingJournalEntries.length,
        broken_journal_links: brokenJournalLinks.length,
      },
      journals: {
        posted_count: postedEntries.length,
        unbalanced_posted_entries: unbalancedEntries.length,
      },
      bank_reconciliation: {
        completed_transactions: companyBankTransactions.filter((transaction) => transaction.status === 'completed').length,
        unreconciled_completed_transactions: unreconciledBankTransactions.length,
        unreconciled_amount: sum(unreconciledBankTransactions, (transaction) => transaction.amount),
      },
    };
  });

  const report = {
    generated_at: new Date().toISOString(),
    status: issues.length === 0 ? 'healthy' : 'issues_found',
    summary: {
      companies: companies.length,
      issue_count: issues.length,
    },
    issues,
    companies: byCompany,
  };

  const reportsDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(
    reportsDir,
    `financial-reconciliation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify({
    status: report.status,
    companies: companies.length,
    issueCount: issues.length,
    reportPath,
    issueCodes: issues.map((issue) => ({ code: issue.code, count: issue.count, company_name: issue.company_name })),
  }, null, 2));

  if (failOnCritical && issues.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
