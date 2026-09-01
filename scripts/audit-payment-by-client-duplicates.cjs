const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const DEFAULT_FILE = 'C:\\Users\\khamis\\Desktop\\Payment By Client_full.xlsx';
const PAGE_SIZE = 1000;

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
  const args = Object.fromEntries(
    process.argv.slice(2)
      .filter((arg) => arg.startsWith('--') && arg.includes('='))
      .map((arg) => {
        const [key, ...rest] = arg.slice(2).split('=');
        return [key, rest.join('=')];
      })
  );
  return {
    filePath: args.file || DEFAULT_FILE,
    outputDir: args['output-dir'] || path.join(process.cwd(), 'reports'),
  };
}

function text(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function numberValue(value) {
  const number = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : 0;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

// Excel dates in this source are local Doha midnights. Preserve the displayed
// calendar day instead of converting the Date to UTC with toISOString().
function displayedExcelDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const raw = text(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

function utcBugDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return displayedExcelDate(value);
}

function addDays(date, amount) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

function normalized(value) {
  return text(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function digits(value) {
  return text(value).replace(/\D/g, '');
}

function sourceNumberFromPayment(payment) {
  const fromNote = text(payment.notes).match(/Original payment number:\s*([^\n\r]+)/i)?.[1];
  if (fromNote && fromNote !== '-') return text(fromNote);
  return text(payment.payment_number).match(/^PBC-(.+)$/)?.[1] || '';
}

function originalDescription(payment) {
  return text(payment.notes).match(/Original description:\s*([^\n\r]*)/i)?.[1]?.trim() || '';
}

function descriptionMatches(sourceDescription, otherNotes) {
  const source = normalized(sourceDescription);
  const other = normalized(otherNotes);
  return Boolean(source && other && other.startsWith(source));
}

async function selectAll(supabase, table, columns, buildQuery = (query) => query) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery(
      supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1)
    );
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

function worksheetFromRows(rows) {
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ result: 'No rows' }]);
  const headers = rows.length ? Object.keys(rows[0]) : ['result'];
  sheet['!cols'] = headers.map((header) => ({
    wch: Math.min(70, Math.max(
      header.length + 2,
      ...rows.slice(0, 500).map((row) => text(row[header]).length + 2)
    )),
  }));
  if (rows.length) sheet['!autofilter'] = { ref: sheet['!ref'] };
  return sheet;
}

function readSource(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' }).map((row, index) => ({
    row_number: index + 2,
    lease_identifier: text(row.lease_identifier),
    vehicle_number: text(row.Vehicle_number),
    vehicle_brand: text(row['Vehicle-brand']),
    customer_name: text(row.Customer_Name),
    phone_number: text(row.Phone_number),
    customer_license: text(row.Customer_License),
    amount: numberValue(row.Amount),
    payment_number: text(row.Payment_Number),
    displayed_date: displayedExcelDate(row.Payment_Date),
    importer_bug_date: utcBugDate(row.Payment_Date),
    payment_type: text(row.Payment_Type),
    payment_method: text(row.Payment_Method),
    description: text(row.Payment_Description),
  }));
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const group = map.get(key) || [];
    group.push(row);
    map.set(key, group);
  }
  return map;
}

async function main() {
  const { filePath, outputDir } = parseArgs();
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const env = {
    ...readEnvFile(path.join(process.cwd(), '.env.local')),
    ...readEnvFile(path.join(process.cwd(), '.env')),
    ...process.env,
  };
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase service credentials');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const sourceRows = readSource(filePath);
  const sourceByNumber = groupBy(sourceRows, (row) => row.payment_number);

  const [payments, contracts, customers, vehicles, historicalPairs] = await Promise.all([
    selectAll(
      supabase,
      'payments',
      'id,payment_number,reference_number,amount,payment_date,payment_status,allocation_status,contract_id,customer_id,payment_method,payment_type,notes,created_at,journal_entry_id',
      (query) => query.eq('company_id', COMPANY_ID)
    ),
    selectAll(
      supabase,
      'contracts',
      'id,contract_number,customer_id,vehicle_id,license_plate,start_date,end_date,status',
      (query) => query.eq('company_id', COMPANY_ID)
    ),
    selectAll(
      supabase,
      'customers',
      'id,first_name,last_name,first_name_ar,last_name_ar,company_name,company_name_ar,phone',
      (query) => query.eq('company_id', COMPANY_ID)
    ),
    selectAll(
      supabase,
      'vehicles',
      'id,plate_number,make,model,year',
      (query) => query.eq('company_id', COMPANY_ID)
    ),
    selectAll(
      supabase,
      'review_cross_file_duplicate_payments',
      'contract_number,source_txn,payment_number_a,payment_date_a,payment_number_b,payment_date_b,amount,date_diff_days,status,reversed_at,reversal_reason',
      (query) => query.eq('company_id', COMPANY_ID)
    ),
  ]);

  const contractById = new Map(contracts.map((row) => [row.id, row]));
  const customerById = new Map(customers.map((row) => [row.id, row]));
  const vehicleById = new Map(vehicles.map((row) => [row.id, row]));
  const completedOthers = payments.filter((payment) =>
    payment.payment_status === 'completed' && !text(payment.payment_number).startsWith('PBC-')
  );
  const completedPbc = payments.filter((payment) =>
    payment.payment_status === 'completed' && text(payment.payment_number).startsWith('PBC-')
  );

  const candidatePairs = [];
  for (const pbc of completedPbc) {
    const sourceNumber = sourceNumberFromPayment(pbc);
    const matchingSourceRows = (sourceByNumber.get(sourceNumber) || []).filter((row) =>
      Math.abs(row.amount - numberValue(pbc.amount)) < 0.01
    );
    const source = matchingSourceRows[0] || null;
    const pbcContract = contractById.get(pbc.contract_id);
    const pbcVehicle = vehicleById.get(pbcContract?.vehicle_id);
    const sourceDescription = source?.description || originalDescription(pbc);

    for (const other of completedOthers) {
      if (other.id === pbc.id || Math.abs(numberValue(other.amount) - numberValue(pbc.amount)) >= 0.01) continue;
      if (other.payment_date !== addDays(pbc.payment_date, 1)) continue;
      const sameContract = Boolean(pbc.contract_id && other.contract_id === pbc.contract_id);
      const sameCustomer = Boolean(pbc.customer_id && other.customer_id === pbc.customer_id);
      if (!sameContract && !sameCustomer) continue;

      const otherContract = contractById.get(other.contract_id);
      const sourceDateConfirms = Boolean(source && source.displayed_date === other.payment_date && source.importer_bug_date === pbc.payment_date);
      const descriptionMatch = descriptionMatches(sourceDescription, other.notes);
      const pbcSuffix = text(pbc.payment_number).match(/^PBC-(\d+)$/)?.[1] || '';
      const payXlsSuffix = text(other.payment_number).match(/^PAY-XLS-(\d+)$/)?.[1] || '';
      const sameSourceNumber = Boolean(pbcSuffix && payXlsSuffix && pbcSuffix === payXlsSuffix);
      const confirmed = sourceDateConfirms && (
        (sameContract && descriptionMatch)
        || (sameContract && sameSourceNumber)
        || (!sameContract && sameCustomer && descriptionMatch)
      );

      candidatePairs.push({
        confirmed,
        reason: confirmed
          ? (sameContract ? (sameSourceNumber ? 'same_source_number_and_timezone_shift' : 'same_description_and_timezone_shift') : 'same_customer_description_timezone_shift_cross_contract')
          : 'same_amount_one_day_apart_needs_review',
        source_row: source?.row_number || '',
        source_payment_number: sourceNumber,
        source_lease_identifier: source?.lease_identifier || '',
        source_customer: source?.customer_name || '',
        source_plate: source?.vehicle_number || '',
        source_description: sourceDescription,
        source_displayed_date: source?.displayed_date || '',
        pbc_payment_id: pbc.id,
        pbc_number: pbc.payment_number,
        pbc_reference: pbc.reference_number,
        pbc_date: pbc.payment_date,
        amount: numberValue(pbc.amount),
        pbc_contract: pbcContract?.contract_number || '',
        pbc_contract_id: pbc.contract_id || '',
        pbc_plate: pbcVehicle?.plate_number || pbcContract?.license_plate || '',
        other_payment_id: other.id,
        other_number: other.payment_number,
        other_date: other.payment_date,
        other_contract: otherContract?.contract_number || '',
        other_contract_id: other.contract_id || '',
        same_contract: sameContract,
        same_customer: sameCustomer,
        description_match: descriptionMatch,
        same_source_number: sameSourceNumber,
        source_date_confirms: sourceDateConfirms,
        pbc_has_journal: Boolean(pbc.journal_entry_id),
      });
    }
  }

  // A single PBC row can meet multiple broad candidates. Prefer confirmed
  // evidence and keep one row per PBC payment for impact totals.
  const confirmedByPbc = new Map();
  const reviewRows = [];
  for (const pair of candidatePairs) {
    if (pair.confirmed) {
      if (!confirmedByPbc.has(pair.pbc_payment_id)) confirmedByPbc.set(pair.pbc_payment_id, pair);
    } else {
      reviewRows.push(pair);
    }
  }
  const confirmedRows = [...confirmedByPbc.values()];

  const confirmedIds = confirmedRows.map((row) => row.pbc_payment_id);
  const allocations = [];
  for (let index = 0; index < confirmedIds.length; index += 50) {
    const ids = confirmedIds.slice(index, index + 50);
    const rows = await selectAll(
      supabase,
      'payment_allocations',
      'payment_id,amount,is_active,allocation_type,target_id',
      (query) => query.eq('company_id', COMPANY_ID).in('payment_id', ids)
    );
    allocations.push(...rows);
  }
  const allocationByPayment = groupBy(allocations, (row) => row.payment_id);
  for (const row of confirmedRows) {
    const active = (allocationByPayment.get(row.pbc_payment_id) || []).filter((allocation) => allocation.is_active);
    row.active_allocation_count = active.length;
    row.active_allocated_amount = active.reduce((sum, allocation) => sum + numberValue(allocation.amount), 0);
  }

  const referenceIssues = completedPbc.flatMap((payment) => {
    const sourceNumber = sourceNumberFromPayment(payment);
    const referenceSuffix = text(payment.reference_number).match(/^PBCFULL-(.+)$/)?.[1] || '';
    const paymentSuffix = text(payment.payment_number).match(/^PBC-(.+)$/)?.[1] || '';
    if (!referenceSuffix || (referenceSuffix === sourceNumber && paymentSuffix === sourceNumber)) return [];
    const contract = contractById.get(payment.contract_id);
    return [{
      issue: 'PBC payment/reference/source number mismatch',
      payment_id: payment.id,
      payment_number: payment.payment_number,
      reference_number: payment.reference_number,
      source_number_in_notes: sourceNumber,
      contract_number: contract?.contract_number || '',
      amount: numberValue(payment.amount),
      payment_date: payment.payment_date,
      notes: payment.notes,
    }];
  });

  const duplicateSourceNumbers = [...sourceByNumber.entries()]
    .filter(([, rows]) => rows.length > 1)
    .flatMap(([paymentNumber, rows]) => rows.map((row) => ({
      issue: 'Duplicate Payment_Number in source file',
      payment_number: paymentNumber,
      source_row: row.row_number,
      lease_identifier: row.lease_identifier,
      amount: row.amount,
      displayed_date: row.displayed_date,
      payment_type: row.payment_type,
      payment_method: row.payment_method,
      description: row.description,
    })));

  const internalGroups = groupBy(
    sourceRows.filter((row) => row.amount > 0),
    (row) => [
      row.lease_identifier,
      row.amount.toFixed(2),
      row.displayed_date,
      normalized(row.payment_type),
      normalized(row.description),
    ].join('|')
  );
  const internalDuplicates = [...internalGroups.values()]
    .filter((rows) => rows.length > 1 && normalized(rows[0].description))
    .flatMap((rows) => rows.map((row) => ({
      duplicate_group_size: rows.length,
      source_row: row.row_number,
      lease_identifier: row.lease_identifier,
      vehicle_number: row.vehicle_number,
      customer_name: row.customer_name,
      amount: row.amount,
      payment_number: row.payment_number,
      displayed_date: row.displayed_date,
      payment_type: row.payment_type,
      payment_method: row.payment_method,
      description: row.description,
    })));

  const contractImpactMap = groupBy(confirmedRows, (row) => row.pbc_contract || '(unlinked)');
  const contractImpact = [...contractImpactMap.entries()].map(([contractNumber, rows]) => ({
    contract_number: contractNumber,
    duplicate_payment_count: rows.length,
    duplicated_amount: rows.reduce((sum, row) => sum + row.amount, 0),
    active_allocated_amount: rows.reduce((sum, row) => sum + row.active_allocated_amount, 0),
    pbc_numbers: rows.map((row) => row.pbc_number).sort().join(', '),
  })).sort((a, b) => b.duplicated_amount - a.duplicated_amount);

  const totalConfirmedAmount = confirmedRows.reduce((sum, row) => sum + row.amount, 0);
  const totalAllocated = confirmedRows.reduce((sum, row) => sum + row.active_allocated_amount, 0);
  const summaryRows = [
    { metric: 'Source file', value: filePath },
    { metric: 'Source rows', value: sourceRows.length },
    { metric: 'Source amount', value: sourceRows.reduce((sum, row) => sum + row.amount, 0) },
    { metric: 'Source unique Payment_Number', value: sourceByNumber.size },
    { metric: 'PBC rows in system', value: payments.filter((row) => text(row.payment_number).startsWith('PBC-')).length },
    { metric: 'Active PBC rows', value: completedPbc.length },
    { metric: 'Cancelled PBC rows', value: payments.filter((row) => text(row.payment_number).startsWith('PBC-') && row.payment_status === 'cancelled').length },
    { metric: 'Previously reversed cross-file pairs', value: historicalPairs.filter((row) => row.status === 'reversed').length },
    { metric: 'Previously reversed amount', value: historicalPairs.filter((row) => row.status === 'reversed').reduce((sum, row) => sum + numberValue(row.amount), 0) },
    { metric: 'Confirmed active duplicate PBC payments', value: confirmedRows.length },
    { metric: 'Affected PBC contracts', value: new Set(confirmedRows.map((row) => row.pbc_contract_id)).size },
    { metric: 'Confirmed active duplicated amount', value: totalConfirmedAmount },
    { metric: 'Active allocated amount on confirmed duplicates', value: totalAllocated },
    { metric: 'Confirmed rows with accounting journal', value: confirmedRows.filter((row) => row.pbc_has_journal).length },
    { metric: 'Unconfirmed candidate pairs requiring review', value: reviewRows.length },
    { metric: 'PBC reference metadata issues', value: referenceIssues.length },
    { metric: 'Source rows with duplicated Payment_Number', value: duplicateSourceNumbers.length },
    { metric: 'High-risk internal duplicate source rows', value: internalDuplicates.length },
    { metric: 'Root cause', value: 'Excel local Doha midnight was converted through toISOString(), shifting Payment_Date to the previous UTC day.' },
  ];

  const report = {
    generated_at: new Date().toISOString(),
    company_id: COMPANY_ID,
    source_file: filePath,
    summary: Object.fromEntries(summaryRows.map((row) => [row.metric, row.value])),
    confirmed_duplicates: confirmedRows,
    contract_impact: contractImpact,
    needs_review: reviewRows,
    metadata_issues: [...referenceIssues, ...duplicateSourceNumbers],
    source_internal_duplicates: internalDuplicates,
    historical_cleanup: historicalPairs,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(outputDir, `payment-by-client-duplicate-audit-${stamp}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify(report, null, 2));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheetFromRows(summaryRows), 'Summary');
  XLSX.utils.book_append_sheet(workbook, worksheetFromRows(contractImpact), 'Contract Impact');
  XLSX.utils.book_append_sheet(workbook, worksheetFromRows(confirmedRows), 'Confirmed Duplicates');
  XLSX.utils.book_append_sheet(workbook, worksheetFromRows(reviewRows), 'Needs Review');
  XLSX.utils.book_append_sheet(workbook, worksheetFromRows([...referenceIssues, ...duplicateSourceNumbers]), 'Metadata Issues');
  XLSX.utils.book_append_sheet(workbook, worksheetFromRows(internalDuplicates), 'Source Internal Duplicates');
  XLSX.utils.book_append_sheet(workbook, worksheetFromRows(historicalPairs), 'Historical Cleanup');
  XLSX.writeFile(workbook, `${base}.xlsx`);

  console.log(JSON.stringify({
    xlsx: `${base}.xlsx`,
    json: `${base}.json`,
    confirmed_duplicates: confirmedRows.length,
    affected_contracts: new Set(confirmedRows.map((row) => row.pbc_contract_id)).size,
    duplicated_amount: totalConfirmedAmount,
    active_allocated_amount: totalAllocated,
    needs_review: reviewRows.length,
    reference_issues: referenceIssues.length,
    internal_duplicate_rows: internalDuplicates.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
