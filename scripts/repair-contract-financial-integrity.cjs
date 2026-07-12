const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const PAGE_SIZE = 1000;
const CLOSED_PAYMENT_STATUSES = new Set(['cancelled', 'canceled', 'failed', 'voided', 'reversed', 'refunded']);

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

function parseArgs() {
  const args = process.argv.slice(2);
  const keyed = Object.fromEntries(
    args
      .filter((arg) => arg.startsWith('--') && arg.includes('='))
      .map((arg) => {
        const [key, ...value] = arg.slice(2).split('=');
        return [key, value.join('=')];
      })
  );

  return {
    apply: args.includes('--apply'),
    companyId: keyed['company-id'] || DEFAULT_COMPANY_ID,
    outputDir: keyed['output-dir'] || path.join(process.cwd(), 'reports'),
  };
}

const env = {
  ...readEnvFile(path.join(process.cwd(), '.env.local')),
  ...readEnvFile(path.join(process.cwd(), '.env')),
  ...process.env,
};

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const n = (value) => Number(Number(value || 0).toFixed(2));
const norm = (value) => String(value || '').toLowerCase();

function monthCount(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  const days = Math.max(1, Math.round((end - start) / 86_400_000));
  return Math.max(1, Math.round((days / 30) * 100) / 100);
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

function groupBy(rows, keySelector) {
  const grouped = new Map();
  for (const row of rows) {
    const key = keySelector(row);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  return grouped;
}

function chooseContractAmount(contract, invoiceTotal, paidTotal) {
  const months = monthCount(contract.start_date, contract.end_date);
  const estimatedFromMonthly = months && n(contract.monthly_amount) > 0
    ? n(n(contract.monthly_amount) * months)
    : 0;

  const normalizedInvoiceTotal = n(invoiceTotal);
  const normalizedPaidTotal = n(paidTotal);
  let chosen = null;

  if (normalizedInvoiceTotal > 0) {
    chosen = {
      source: normalizedInvoiceTotal >= normalizedPaidTotal
        ? 'linked_invoice_total'
        : 'linked_invoice_total_with_payment_floor',
      amount: Math.max(normalizedInvoiceTotal, normalizedPaidTotal),
    };
  } else if (estimatedFromMonthly > 0) {
    chosen = {
      source: estimatedFromMonthly >= normalizedPaidTotal
        ? 'monthly_amount_x_duration'
        : 'monthly_amount_x_duration_with_payment_floor',
      amount: Math.max(estimatedFromMonthly, normalizedPaidTotal),
    };
  } else if (normalizedPaidTotal > 0) {
    chosen = {
      source: 'completed_payment_total_floor',
      amount: normalizedPaidTotal,
    };
  }

  if (!chosen) {
    return { amount: 0, source: 'manual_review_required', months, estimatedFromMonthly };
  }

  return {
    amount: n(chosen.amount),
    source: chosen.source,
    months,
    estimatedFromMonthly,
  };
}

async function insertAuditLog(companyId, contract, oldValues, newValues, metadata) {
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      company_id: companyId,
      resource_type: 'contract',
      resource_id: contract.id,
      entity_name: contract.contract_number,
      action: 'financial_integrity_repair',
      severity: 'medium',
      status: 'success',
      changes_summary: 'Repaired historical contract amount/payment totals from invoices and completed payments.',
      old_values: oldValues,
      new_values: newValues,
      metadata,
      notes: 'Automated historical financial integrity repair. No payments were deleted.',
    });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function run() {
  const { apply, companyId, outputDir } = parseArgs();
  fs.mkdirSync(outputDir, { recursive: true });

  const [contracts, invoices, payments] = await Promise.all([
    selectAll(
      'contracts',
      'id,company_id,contract_number,status,contract_amount,monthly_amount,total_paid,balance_due,payment_status,start_date,end_date,updated_at',
      (query) => query.eq('company_id', companyId)
    ),
    selectAll(
      'invoices',
      'id,company_id,contract_id,total_amount,paid_amount,balance_due,status,payment_status',
      (query) => query.eq('company_id', companyId)
    ),
    selectAll(
      'payments',
      'id,company_id,contract_id,invoice_id,amount,payment_status,transaction_type,payment_date,payment_number,notes,reference_number',
      (query) => query.eq('company_id', companyId)
    ),
  ]);

  const invoicesByContract = groupBy(
    invoices.filter((invoice) => invoice.contract_id),
    (invoice) => invoice.contract_id
  );
  const completedReceiptPayments = payments.filter((payment) => (
    payment.contract_id
    && n(payment.amount) > 0
    && norm(payment.transaction_type || 'receipt') === 'receipt'
    && !CLOSED_PAYMENT_STATUSES.has(norm(payment.payment_status))
    && norm(payment.payment_status) === 'completed'
  ));
  const paymentsByContract = groupBy(completedReceiptPayments, (payment) => payment.contract_id);

  const repairPlan = [];
  const manualReview = [];

  for (const contract of contracts) {
    const linkedInvoices = invoicesByContract.get(contract.id) || [];
    const linkedPayments = paymentsByContract.get(contract.id) || [];
    const invoiceTotal = n(linkedInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0));
    const paidTotal = n(linkedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
    const currentAmount = n(contract.contract_amount);
    const currentPaid = n(contract.total_paid);
    const currentBalance = n(contract.balance_due);
    const chosenAmount = currentAmount > 0
      ? { amount: currentAmount, source: 'existing_contract_amount', months: monthCount(contract.start_date, contract.end_date), estimatedFromMonthly: 0 }
      : chooseContractAmount(contract, invoiceTotal, paidTotal);
    const newContractAmount = currentAmount > 0 ? currentAmount : chosenAmount.amount;
    const newBalance = n(Math.max(newContractAmount - paidTotal, 0));
    const newPaymentStatus = paidTotal <= 0.01
      ? 'pending'
      : newBalance <= 0.01
        ? 'paid'
        : 'partial';

    const hasZeroAmountWithPayments = currentAmount <= 0 && paidTotal > 0;
    const hasPayments = paidTotal > 0.01;
    const hasStoredTotalsMismatch = hasPayments && (
      Math.abs(currentPaid - paidTotal) > 0.01
      || Math.abs(currentBalance - newBalance) > 0.01
    );
    const hasUnreasonableBalance = currentBalance > 10_000_000;
    const overpaid = newContractAmount > 0 && paidTotal > newContractAmount + 0.01;

    if (hasZeroAmountWithPayments && newContractAmount <= 0) {
      manualReview.push({
        contract_id: contract.id,
        contract_number: contract.contract_number,
        reason: 'Could not infer contract_amount from monthly amount, dates, invoices, or payments.',
        contract_amount: currentAmount,
        monthly_amount: contract.monthly_amount,
        invoice_total: invoiceTotal,
        paid_total: paidTotal,
        status: contract.status,
      });
      continue;
    }

    if (hasZeroAmountWithPayments || hasStoredTotalsMismatch || hasUnreasonableBalance) {
      repairPlan.push({
        contract_id: contract.id,
        contract_number: contract.contract_number,
        status: contract.status,
        old: {
          contract_amount: currentAmount,
          total_paid: currentPaid,
          balance_due: currentBalance,
          payment_status: contract.payment_status,
        },
        new: {
          contract_amount: newContractAmount,
          total_paid: paidTotal,
          balance_due: newBalance,
          payment_status: newPaymentStatus,
        },
        evidence: {
          source: chosenAmount.source,
          monthly_amount: n(contract.monthly_amount),
          duration_months: chosenAmount.months,
          estimated_from_monthly: chosenAmount.estimatedFromMonthly,
          invoice_count: linkedInvoices.length,
          invoice_total: invoiceTotal,
          payment_count: linkedPayments.length,
          paid_total: paidTotal,
          overpaid_after_repair: overpaid,
        },
      });
    }
  }

  const overpaidReview = contracts
    .map((contract) => {
      const linkedPayments = paymentsByContract.get(contract.id) || [];
      const linkedInvoices = invoicesByContract.get(contract.id) || [];
      const paidTotal = n(linkedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
      const invoiceTotal = n(linkedInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0));
      const planned = repairPlan.find((item) => item.contract_id === contract.id);
      const amount = planned ? planned.new.contract_amount : n(contract.contract_amount);
      if (amount <= 0 || paidTotal <= amount + 0.01) return null;
      return {
        contract_id: contract.id,
        contract_number: contract.contract_number,
        status: contract.status,
        contract_amount: amount,
        invoice_total: invoiceTotal,
        paid_total: paidTotal,
        overpaid_amount: n(paidTotal - amount),
        payment_count: linkedPayments.length,
        warning: 'Needs accountant review before cancelling/reclassifying any payment.',
      };
    })
    .filter(Boolean);

  const applied = [];
  const failed = [];

  if (apply) {
    for (const item of repairPlan) {
      const { error } = await supabase
        .from('contracts')
        .update({
          contract_amount: item.new.contract_amount,
          total_paid: item.new.total_paid,
          balance_due: item.new.balance_due,
          payment_status: item.new.payment_status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.contract_id)
        .eq('company_id', companyId);

      if (error) {
        failed.push({ ...item, error: error.message });
        continue;
      }

      const audit = await insertAuditLog(companyId, { id: item.contract_id, contract_number: item.contract_number }, item.old, item.new, item.evidence);
      applied.push({ ...item, audit });
    }
  }

  const result = {
    generated_at: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry_run',
    company_id: companyId,
    summary: {
      contracts_scanned: contracts.length,
      repairable_contracts: repairPlan.length,
      manual_review_contracts: manualReview.length,
      overpaid_review_contracts: overpaidReview.length,
      applied: applied.length,
      failed: failed.length,
    },
    repair_plan: repairPlan,
    manual_review: manualReview,
    overpaid_review: overpaidReview,
    applied,
    failed,
  };

  const outputPath = path.join(
    outputDir,
    `contract-financial-integrity-repair-${companyId}-${new Date().toISOString().replace(/[:.]/g, '-')}-${apply ? 'apply' : 'dry-run'}.json`
  );
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  console.log(JSON.stringify({
    mode: result.mode,
    summary: result.summary,
    outputPath,
    repairSample: repairPlan.slice(0, 5).map((item) => ({
      contract_number: item.contract_number,
      old: item.old,
      new: item.new,
      evidence: item.evidence,
    })),
    overpaidReview: overpaidReview.slice(0, 10),
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
