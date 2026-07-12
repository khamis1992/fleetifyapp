const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const PAGE_SIZE = 1000;
const REPORT_PREFIX = 'payment-file-contract-matching-';
const OUTPUT_PREFIX = 'payment-file-contract-linking-';

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
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or service role key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function parseArgs() {
  const keyedArgs = Object.fromEntries(
    process.argv.slice(2)
      .filter((arg) => arg.startsWith('--') && arg.includes('='))
      .map((arg) => {
        const [key, ...value] = arg.slice(2).split('=');
        return [key, value.join('=')];
      })
  );

  const flags = new Set(process.argv.slice(2).filter((arg) => arg.startsWith('--') && !arg.includes('=')));

  return {
    apply: flags.has('--apply'),
    companyId: keyedArgs['company-id'] || DEFAULT_COMPANY_ID,
    reportPath: keyedArgs.report || '',
    outputDir: keyedArgs['output-dir'] || path.join(process.cwd(), 'reports'),
    limit: keyedArgs.limit ? Number(keyedArgs.limit) : 0,
  };
}

function latestMatchingReport(outputDir) {
  const candidates = fs.readdirSync(outputDir)
    .filter((name) => name.startsWith(REPORT_PREFIX) && name.endsWith('.json'))
    .map((name) => path.join(outputDir, name))
    .filter((filePath) => {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return Array.isArray(parsed.results);
      } catch {
        return false;
      }
    })
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  if (!candidates.length) {
    throw new Error(`No ${REPORT_PREFIX}*.json report found in ${outputDir}`);
  }

  return candidates[0];
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

function csvEscape(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function toCsv(rows, columns) {
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')),
  ].join('\n');
}

function asAmount(value) {
  const amount = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
}

function dateOnly(value) {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function methodFromFile(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'wiretransfer' || normalized === 'banktransfer' || normalized === 'bank_transfer') return 'bank_transfer';
  if (normalized === 'cheque' || normalized === 'check') return 'check';
  if (normalized === 'creditcard' || normalized === 'credit_card') return 'credit_card';
  if (normalized === 'debit' || normalized === 'debitcard' || normalized === 'debit_card') return 'debit_card';
  return 'cash';
}

function paymentTypeFromMethod(paymentMethod) {
  return paymentMethod === 'debit_card' ? 'credit_card' : paymentMethod;
}

function stableReference(row) {
  return `PBCFULL-${String(row.file_payment_number || row.row_number).trim()}`;
}

function stablePaymentNumber(row) {
  return `PBC-${String(row.file_payment_number || row.row_number).trim()}`;
}

function confidenceValue(row) {
  const score = Number(row.match_score || 0);
  if (!Number.isFinite(score) || score <= 0) return null;
  return Math.min(1, Number((score / 100).toFixed(4)));
}

function noteFor(row, contract) {
  return [
    'Imported from Payment By Client_full.xlsx',
    `File row: ${row.row_number}`,
    `Original payment number: ${row.file_payment_number || '-'}`,
    `Original method: ${row.file_payment_method || '-'}`,
    `Original type: ${row.file_payment_type || '-'}`,
    `Original description: ${row.file_payment_description || '-'}`,
    `Matched contract: ${contract.contract_number || contract.id}`,
    `Matching score: ${row.match_score}`,
  ].join('\n');
}

function processingNoteFor(row) {
  return [
    'Linked/imported by scripts/link-high-confidence-payment-file.cjs',
    `Source reference: ${stableReference(row)}`,
    `File customer: ${row.file_customer_name || '-'}`,
    `File phone: ${row.file_phone_number || '-'}`,
    `File vehicle: ${row.file_vehicle_number || '-'}`,
  ].join('\n');
}

async function findExistingPayment({ companyId, row, contract }) {
  const reference = stableReference(row);
  const paymentNumber = stablePaymentNumber(row);
  const amount = asAmount(row.file_amount);
  const paymentDate = dateOnly(row.file_payment_date);

  const { data: byReference, error: referenceError } = await supabase
    .from('payments')
    .select('*')
    .eq('company_id', companyId)
    .eq('reference_number', reference)
    .order('created_at', { ascending: false })
    .limit(1);

  if (referenceError) throw referenceError;
  if (byReference?.[0]) return { payment: byReference[0], reason: 'same_reference' };

  const { data: byPaymentNumber, error: paymentNumberError } = await supabase
    .from('payments')
    .select('*')
    .eq('company_id', companyId)
    .eq('payment_number', paymentNumber)
    .order('created_at', { ascending: false })
    .limit(1);

  if (paymentNumberError) throw paymentNumberError;
  if (byPaymentNumber?.[0]) return { payment: byPaymentNumber[0], reason: 'same_payment_number' };

  const { data: exactRows, error: exactError } = await supabase
    .from('payments')
    .select('*')
    .eq('company_id', companyId)
    .eq('payment_date', paymentDate)
    .eq('amount', amount)
    .eq('customer_id', contract.customer_id)
    .neq('payment_status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(20);

  if (exactError) throw exactError;

  const exactSameContract = (exactRows || []).find((payment) => payment.contract_id === contract.id);
  if (exactSameContract) return { payment: exactSameContract, reason: 'same_customer_contract_amount_date' };

  const unlinked = (exactRows || []).find((payment) => !payment.contract_id);
  if (unlinked) return { payment: unlinked, reason: 'same_customer_amount_date_unlinked' };

  const conflicting = (exactRows || []).find((payment) => payment.contract_id && payment.contract_id !== contract.id);
  if (conflicting) return { payment: conflicting, reason: 'same_customer_amount_date_different_contract' };

  return { payment: null, reason: 'not_found' };
}

async function ensureJournal(paymentId, companyId) {
  const { data, error } = await supabase.rpc('ensure_payment_journal_entry', {
    p_payment_id: paymentId,
    p_company_id: companyId,
    p_actor_id: null,
  });

  if (error) throw error;
  return data;
}

async function updateExistingPayment({ args, row, contract, existing }) {
  const reference = stableReference(row);
  const updates = {
    contract_id: contract.id,
    customer_id: contract.customer_id,
    reference_number: reference,
    agreement_number: contract.contract_number || null,
    linking_confidence: confidenceValue(row),
    processing_status: 'completed',
    processing_notes: [
      existing.processing_notes,
      processingNoteFor(row),
    ].filter(Boolean).join('\n'),
    updated_at: new Date().toISOString(),
  };

  if (!args.apply) {
    return { ...existing, ...updates };
  }

  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('company_id', args.companyId)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function insertPayment({ args, row, contract }) {
  const amount = asAmount(row.file_amount);
  const paymentDate = dateOnly(row.file_payment_date);
  const paymentMethod = methodFromFile(row.file_payment_method);
  const paymentType = paymentTypeFromMethod(paymentMethod);
  const payment = {
    company_id: args.companyId,
    customer_id: contract.customer_id,
    contract_id: contract.id,
    amount,
    payment_number: stablePaymentNumber(row),
    payment_date: paymentDate,
    payment_method: paymentMethod,
    payment_type: paymentType,
    transaction_type: 'receipt',
    payment_status: 'completed',
    currency: 'QAR',
    reference_number: stableReference(row),
    agreement_number: contract.contract_number || null,
    notes: noteFor(row, contract),
    linking_confidence: confidenceValue(row),
    payment_month: paymentDate ? paymentDate.slice(0, 7) : null,
    processing_status: 'completed',
    processing_notes: processingNoteFor(row),
  };

  if (paymentMethod === 'check') {
    payment.check_number = String(row.file_payment_number || stableReference(row));
  }

  if (!args.apply) return payment;

  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

function resultRow(row, patch) {
  return {
    row_number: row.row_number,
    action: '',
    reason: '',
    payment_id: '',
    payment_number: '',
    reference_number: stableReference(row),
    amount: row.file_amount,
    payment_date: row.file_payment_date,
    file_payment_method: row.file_payment_method,
    file_payment_type: row.file_payment_type,
    file_payment_number: row.file_payment_number,
    file_customer_name: row.file_customer_name,
    file_phone_number: row.file_phone_number,
    file_vehicle_number: row.file_vehicle_number,
    contract_number: row.suggested_contract_number,
    contract_id: row.suggested_contract_id,
    match_score: row.match_score,
    journal_status: '',
    error: '',
    ...patch,
  };
}

async function main() {
  const args = parseArgs();
  fs.mkdirSync(args.outputDir, { recursive: true });

  const reportPath = args.report || latestMatchingReport(args.outputDir);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const highRows = report.results
    .filter((row) => row.recommended_action === 'can_link_high_confidence')
    .slice(0, args.limit > 0 ? args.limit : undefined);

  const contracts = await selectAll(
    'contracts',
    'id,contract_number,customer_id,company_id,status,start_date,end_date,license_plate',
    (query) => query.eq('company_id', args.companyId)
  );
  const contractById = new Map(contracts.map((contract) => [contract.id, contract]));

  const results = [];
  const summary = {
    mode: args.apply ? 'apply' : 'dry-run',
    companyId: args.companyId,
    sourceReport: reportPath,
    generatedAt: new Date().toISOString(),
    requestedHighConfidenceRows: highRows.length,
    inserted: 0,
    linkedExisting: 0,
    alreadyLinked: 0,
    skippedNegativeOrZero: 0,
    skippedMissingContract: 0,
    skippedCancelledExistingReference: 0,
    skippedConflictingExistingPayment: 0,
    failed: 0,
    journalsEnsured: 0,
    journalsFailed: 0,
    totalAmountInsertedOrLinked: 0,
  };

  for (let index = 0; index < highRows.length; index += 1) {
    const row = highRows[index];
    const amount = asAmount(row.file_amount);
    const contract = contractById.get(row.suggested_contract_id);

    if (!contract) {
      summary.skippedMissingContract += 1;
      results.push(resultRow(row, { action: 'skipped', reason: 'missing_contract' }));
      continue;
    }

    if (amount <= 0) {
      summary.skippedNegativeOrZero += 1;
      results.push(resultRow(row, { action: 'skipped', reason: 'negative_or_zero_amount_not_receipt' }));
      continue;
    }

    try {
      const { payment: existing, reason: existingReason } = await findExistingPayment({
        companyId: args.companyId,
        row,
        contract,
      });

      if (existing?.payment_status === 'cancelled' && ['same_reference', 'same_payment_number'].includes(existingReason)) {
        summary.skippedCancelledExistingReference += 1;
        results.push(resultRow(row, {
          action: 'skipped',
          reason: 'cancelled_existing_reference',
          payment_id: existing.id,
          payment_number: existing.payment_number,
        }));
        continue;
      }

      if (existing && existingReason === 'same_customer_amount_date_different_contract') {
        summary.skippedConflictingExistingPayment += 1;
        results.push(resultRow(row, {
          action: 'skipped',
          reason: 'active_existing_payment_has_different_contract',
          payment_id: existing.id,
          payment_number: existing.payment_number,
        }));
        continue;
      }

      let payment;
      let action;
      if (existing) {
        const alreadyLinked =
          existing.contract_id === contract.id &&
          existing.customer_id === contract.customer_id &&
          existing.reference_number === stableReference(row);

        payment = alreadyLinked
          ? existing
          : await updateExistingPayment({ args, row, contract, existing });
        action = alreadyLinked ? 'already_linked' : 'linked_existing';

        if (alreadyLinked) summary.alreadyLinked += 1;
        else summary.linkedExisting += 1;
      } else {
        payment = await insertPayment({ args, row, contract });
        action = 'inserted';
        summary.inserted += 1;
      }

      let journalStatus = args.apply ? 'not_needed' : 'dry_run';
      if (args.apply && payment.id) {
        try {
          const journal = await ensureJournal(payment.id, args.companyId);
          journalStatus = String(journal?.status || 'ok');
          summary.journalsEnsured += 1;
        } catch (journalError) {
          journalStatus = `failed: ${journalError.message || journalError}`;
          summary.journalsFailed += 1;
        }
      }

      summary.totalAmountInsertedOrLinked += amount;
      results.push(resultRow(row, {
        action,
        reason: existingReason,
        payment_id: payment.id || '',
        payment_number: payment.payment_number || stablePaymentNumber(row),
        journal_status: journalStatus,
      }));
    } catch (error) {
      summary.failed += 1;
      results.push(resultRow(row, {
        action: 'failed',
        reason: 'exception',
        error: error.message || String(error),
      }));
    }

    if ((index + 1) % 100 === 0) {
      console.log(`[${summary.mode}] processed ${index + 1}/${highRows.length}`);
    }
  }

  summary.totalAmountInsertedOrLinked = Number(summary.totalAmountInsertedOrLinked.toFixed(2));

  const timestamp = summary.generatedAt.replace(/[:.]/g, '-');
  const baseName = `${OUTPUT_PREFIX}${summary.mode}-${timestamp}`;
  const jsonPath = path.join(args.outputDir, `${baseName}.json`);
  const csvPath = path.join(args.outputDir, `${baseName}.csv`);
  const xlsxPath = path.join(args.outputDir, `${baseName}.xlsx`);
  const mdPath = path.join(args.outputDir, `${baseName}.md`);
  const columns = Object.keys(results[0] || resultRow({}, {}));

  fs.writeFileSync(jsonPath, JSON.stringify({ summary, results }, null, 2), 'utf8');
  fs.writeFileSync(csvPath, toCsv(results, columns), 'utf8');

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([summary]), 'Summary');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(results), 'All Rows');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(results.filter((row) => row.action === 'inserted')), 'Inserted');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(results.filter((row) => row.action === 'linked_existing')), 'Linked Existing');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(results.filter((row) => row.action === 'skipped')), 'Skipped');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(results.filter((row) => row.action === 'failed')), 'Failed');
  XLSX.writeFile(workbook, xlsxPath);

  fs.writeFileSync(mdPath, [
    '# Payment By Client High-Confidence Linking Report',
    '',
    `Mode: ${summary.mode}`,
    `Generated: ${summary.generatedAt}`,
    `Source report: ${reportPath}`,
    '',
    '## Summary',
    '',
    `- Requested high-confidence rows: ${summary.requestedHighConfidenceRows}`,
    `- Inserted new payments: ${summary.inserted}`,
    `- Linked existing payments: ${summary.linkedExisting}`,
    `- Already linked: ${summary.alreadyLinked}`,
    `- Skipped negative/zero rows: ${summary.skippedNegativeOrZero}`,
    `- Skipped missing contract: ${summary.skippedMissingContract}`,
    `- Skipped cancelled existing reference: ${summary.skippedCancelledExistingReference}`,
    `- Skipped conflicting existing payment: ${summary.skippedConflictingExistingPayment}`,
    `- Failed rows: ${summary.failed}`,
    `- Journals ensured: ${summary.journalsEnsured}`,
    `- Journals failed: ${summary.journalsFailed}`,
    `- Total amount inserted or linked: ${summary.totalAmountInsertedOrLinked.toFixed(2)} QAR`,
    '',
    '## Output Files',
    '',
    `- Excel report: ${xlsxPath}`,
    `- CSV report: ${csvPath}`,
    `- JSON report: ${jsonPath}`,
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    summary,
    outputs: { jsonPath, csvPath, xlsxPath, mdPath },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
