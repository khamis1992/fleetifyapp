const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
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
  const keyedArgs = Object.fromEntries(
    process.argv.slice(2)
      .filter((arg) => arg.startsWith('--') && arg.includes('='))
      .map((arg) => {
        const [key, ...value] = arg.slice(2).split('=');
        return [key, value.join('=')];
      })
  );

  return {
    companyId: keyedArgs['company-id'] || DEFAULT_COMPANY_ID,
    filePath: keyedArgs.file || DEFAULT_FILE,
    outputDir: keyedArgs['output-dir'] || path.join(process.cwd(), 'reports'),
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

function text(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function digits(value) {
  return text(value).replace(/\D/g, '');
}

function normalizePhone(value) {
  const d = digits(value);
  if (!d) return '';
  return d.startsWith('974') && d.length > 8 ? d.slice(3) : d;
}

function normalizePlate(value) {
  return digits(value).replace(/^0+/, '');
}

function normalizeName(value) {
  return text(value)
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeBrand(value) {
  return normalizeName(value).replace(/\b(pro|model|car|vehicle)\b/g, '').trim();
}

function customerName(customer) {
  if (!customer) return '';
  const arabic = [customer.first_name_ar, customer.last_name_ar].filter(Boolean).join(' ').trim();
  const english = [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim();
  return arabic || english || customer.company_name_ar || customer.company_name || customer.phone || customer.id;
}

function dateOnly(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = text(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw.slice(0, 10) : date.toISOString().slice(0, 10);
}

function numberValue(value) {
  const n = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  const current = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

function similarity(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const tokensA = new Set(na.split(/\s+/).filter(Boolean));
  const tokensB = new Set(nb.split(/\s+/).filter(Boolean));
  const intersection = [...tokensA].filter((token) => tokensB.has(token)).length;
  const dice = (2 * intersection) / Math.max(1, tokensA.size + tokensB.size);
  const edit = 1 - (levenshtein(na, nb) / Math.max(na.length, nb.length, 1));
  return Math.max(0, Math.max(dice, edit));
}

function phoneMatchScore(filePhone, systemPhone) {
  const a = normalizePhone(filePhone);
  const b = normalizePhone(systemPhone);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length >= 8 && b.length >= 8 && a.slice(-8) === b.slice(-8)) return 0.95;
  if (a.length >= 7 && b.length >= 7 && a.slice(-7) === b.slice(-7)) return 0.75;
  return 0;
}

function inDateRange(paymentDate, startDate, endDate) {
  if (!paymentDate || !startDate || !endDate) return false;
  return paymentDate >= startDate && paymentDate <= endDate;
}

function nearDateRange(paymentDate, startDate, endDate) {
  if (!paymentDate || !startDate || !endDate) return false;
  const d = new Date(`${paymentDate}T00:00:00Z`).getTime();
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if ([d, start, end].some((v) => Number.isNaN(v))) return false;
  const days = 1000 * 60 * 60 * 24;
  return d >= start - (45 * days) && d <= end + (90 * days);
}

function monthKey(value) {
  const d = dateOnly(value);
  return /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : '';
}

function readPaymentRows(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found: ${filePath}`);
  }
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return { sheetName, rows };
}

function paymentRowFromExcel(row, index) {
  return {
    row_number: index + 2,
    file_lease_identifier: text(row.lease_identifier),
    file_vehicle_number: text(row.Vehicle_number),
    file_vehicle_brand: text(row['Vehicle-brand']),
    file_customer_name: text(row.Customer_Name),
    file_phone_number: text(row.Phone_number),
    file_customer_license: text(row.Customer_License),
    file_amount: numberValue(row.Amount),
    file_payment_number: text(row.Payment_Number),
    file_payment_date: dateOnly(row.Payment_Date),
    file_payment_type: text(row.Payment_Type),
    file_payment_method: text(row.Payment_Method),
    file_payment_description: text(row.Payment_Description),
  };
}

function scoreCandidate(payment, contract, customer, vehicle) {
  const evidence = [];
  let score = 0;

  const filePlate = normalizePlate(payment.file_vehicle_number);
  const contractPlate = normalizePlate(contract.license_plate);
  const vehiclePlate = normalizePlate(vehicle?.plate_number);
  const plateExact = Boolean(filePlate && (filePlate === contractPlate || filePlate === vehiclePlate));
  const platePartial = Boolean(filePlate && (contractPlate.endsWith(filePlate) || vehiclePlate.endsWith(filePlate) || filePlate.endsWith(contractPlate) || filePlate.endsWith(vehiclePlate)));

  if (plateExact) {
    score += 42;
    evidence.push('vehicle_plate_exact');
  } else if (platePartial && filePlate.length >= 4) {
    score += 25;
    evidence.push('vehicle_plate_partial');
  }

  const phoneScore = Math.max(
    phoneMatchScore(payment.file_phone_number, customer?.phone),
    phoneMatchScore(payment.file_phone_number, customer?.alternative_phone)
  );
  if (phoneScore >= 0.95) {
    score += 28;
    evidence.push('phone_exact_or_qatar_suffix');
  } else if (phoneScore >= 0.75) {
    score += 18;
    evidence.push('phone_partial');
  }

  const nameScore = similarity(payment.file_customer_name, customerName(customer));
  if (nameScore >= 0.9) {
    score += 18;
    evidence.push('name_high_similarity');
  } else if (nameScore >= 0.72) {
    score += 12;
    evidence.push('name_medium_similarity');
  } else if (nameScore >= 0.55) {
    score += 6;
    evidence.push('name_low_similarity');
  }

  const fileLicense = digits(payment.file_customer_license);
  const licenseMatch = fileLicense && [
    customer?.license_number,
    customer?.national_id,
    customer?.passport_number,
  ].some((value) => digits(value) === fileLicense);
  if (licenseMatch) {
    score += 10;
    evidence.push('license_or_id_exact');
  }

  if (payment.file_payment_date && inDateRange(payment.file_payment_date, contract.start_date, contract.end_date)) {
    score += 8;
    evidence.push('payment_date_inside_contract');
  } else if (payment.file_payment_date && nearDateRange(payment.file_payment_date, contract.start_date, contract.end_date)) {
    score += 3;
    evidence.push('payment_date_near_contract');
  }

  const fileBrand = normalizeBrand(payment.file_vehicle_brand);
  const vehicleBrand = normalizeBrand([vehicle?.make || contract.make, vehicle?.model || contract.model, vehicle?.year || contract.year].filter(Boolean).join(' '));
  if (fileBrand && vehicleBrand) {
    const brandScore = similarity(fileBrand, vehicleBrand);
    if (brandScore >= 0.62 || fileBrand.includes(normalizeName(vehicle?.make || contract.make))) {
      score += 4;
      evidence.push('vehicle_brand_similar');
    }
  }

  if (payment.file_lease_identifier && payment.file_lease_identifier === contract.contract_number) {
    score += 2;
    evidence.push('file_contract_number_matches_but_low_weight');
  }

  const activeish = !['cancelled', 'canceled', 'voided'].includes(String(contract.status || '').toLowerCase());
  if (activeish) {
    score += 2;
    evidence.push('contract_not_cancelled');
  }

  return {
    score,
    evidence,
    plateExact,
    phoneScore,
    nameScore,
  };
}

function confidenceFromScore(score, top, second) {
  if (!top) return 'no_match';
  const gap = second ? top.score - second.score : top.score;
  if (score >= 82 && gap >= 8) return 'high';
  if (score >= 68 && gap >= 5) return 'medium';
  if (score >= 50) return 'low';
  return 'no_match';
}

function existingPaymentHint(payment, candidate, paymentsByContract, customerPayments) {
  const sameContract = candidate ? paymentsByContract.get(candidate.contract.id) || [] : [];
  const sameCustomer = candidate ? customerPayments.get(candidate.contract.customer_id) || [] : [];
  const paymentDateMonth = monthKey(payment.file_payment_date);
  const amount = Number(payment.file_amount || 0);
  const all = [...sameContract, ...sameCustomer];

  const matches = all
    .filter((p) => Math.abs(Number(p.amount || 0) - amount) < 0.01)
    .filter((p) => {
      const pd = dateOnly(p.payment_date);
      return pd === payment.file_payment_date || monthKey(pd) === paymentDateMonth;
    })
    .slice(0, 5);

  return matches.map((p) => `${p.payment_number || p.id}:${dateOnly(p.payment_date)}:${Number(p.amount || 0).toFixed(2)}:${p.payment_status}`).join('|');
}

function classifyReason(confidence, top, payment) {
  if (confidence !== 'no_match') return '';
  if (!normalizePlate(payment.file_vehicle_number)) return 'missing_vehicle_number_in_file';
  if (!top) return 'no_candidate';
  if (top.score < 35) return 'vehicle_customer_data_not_matching';
  if (!top.plateExact) return 'no_exact_vehicle_match';
  return 'insufficient_customer_confirmation';
}

function recommendedAction(confidence, ambiguous) {
  if (confidence === 'high' && ambiguous !== 'yes') return 'can_link_high_confidence';
  if (confidence === 'medium' && ambiguous !== 'yes') return 'review_then_link_likely';
  if (ambiguous === 'yes') return 'manual_review_ambiguous';
  if (confidence === 'low') return 'manual_review_required';
  return 'do_not_link_without_more_data';
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

async function main() {
  const { companyId, filePath, outputDir } = parseArgs();
  fs.mkdirSync(outputDir, { recursive: true });

  const { sheetName, rows } = readPaymentRows(filePath);
  const paymentRows = rows.map(paymentRowFromExcel).filter((row) =>
    row.file_payment_number || row.file_amount || row.file_vehicle_number || row.file_customer_name
  );

  const [contracts, customers, vehicles, payments] = await Promise.all([
    selectAll(
      'contracts',
      'id,contract_number,start_date,end_date,status,customer_id,vehicle_id,license_plate,make,model,year,monthly_amount,contract_amount,total_paid,payment_status',
      (query) => query.eq('company_id', companyId)
    ),
    selectAll(
      'customers',
      'id,first_name,first_name_ar,last_name,last_name_ar,company_name,company_name_ar,phone,alternative_phone,license_number,national_id,passport_number,customer_code',
      (query) => query.eq('company_id', companyId)
    ),
    selectAll(
      'vehicles',
      'id,plate_number,make,model,year,status',
      (query) => query.eq('company_id', companyId)
    ),
    selectAll(
      'payments',
      'id,payment_number,amount,payment_date,payment_status,transaction_type,customer_id,contract_id,invoice_id,reference_number,notes',
      (query) => query.eq('company_id', companyId)
    ),
  ]);

  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const paymentsByContract = new Map();
  const paymentsByCustomer = new Map();
  for (const payment of payments) {
    if (payment.contract_id) {
      const group = paymentsByContract.get(payment.contract_id) || [];
      group.push(payment);
      paymentsByContract.set(payment.contract_id, group);
    }
    if (payment.customer_id) {
      const group = paymentsByCustomer.get(payment.customer_id) || [];
      group.push(payment);
      paymentsByCustomer.set(payment.customer_id, group);
    }
  }

  const results = paymentRows.map((payment) => {
    const candidates = contracts
      .map((contract) => {
        const customer = customerById.get(contract.customer_id);
        const vehicle = vehicleById.get(contract.vehicle_id);
        const scored = scoreCandidate(payment, contract, customer, vehicle);
        return { contract, customer, vehicle, ...scored };
      })
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    const top = candidates[0] || null;
    const second = candidates[1] || null;
    const confidence = confidenceFromScore(top?.score || 0, top, second);
    const existingHint = existingPaymentHint(payment, top, paymentsByContract, paymentsByCustomer);
    const ambiguous = top && second && top.score - second.score < 8 ? 'yes' : 'no';
    const action = recommendedAction(confidence, ambiguous);

    return {
      row_number: payment.row_number,
      recommended_action: action,
      confidence,
      match_score: top?.score || 0,
      ambiguous,
      suggested_contract_number: confidence === 'no_match' ? '' : top.contract.contract_number,
      suggested_contract_id: confidence === 'no_match' ? '' : top.contract.id,
      suggested_contract_status: confidence === 'no_match' ? '' : top.contract.status,
      suggested_contract_start: confidence === 'no_match' ? '' : top.contract.start_date,
      suggested_contract_end: confidence === 'no_match' ? '' : top.contract.end_date,
      system_customer_name: confidence === 'no_match' ? '' : customerName(top.customer),
      system_customer_phone: confidence === 'no_match' ? '' : top.customer?.phone || '',
      system_vehicle_plate: confidence === 'no_match' ? '' : top.vehicle?.plate_number || top.contract.license_plate || '',
      system_vehicle: confidence === 'no_match' ? '' : [top.vehicle?.make || top.contract.make, top.vehicle?.model || top.contract.model, top.vehicle?.year || top.contract.year].filter(Boolean).join(' '),
      evidence: top?.evidence.join('|') || '',
      no_match_reason: classifyReason(confidence, top, payment),
      top_alternatives: candidates.slice(0, 3).map((candidate) => `${candidate.contract.contract_number}:${candidate.score}:${customerName(candidate.customer)}:${candidate.vehicle?.plate_number || candidate.contract.license_plate || ''}`).join(' || '),
      possible_existing_system_payment: existingHint,
      file_lease_identifier: payment.file_lease_identifier,
      file_vehicle_number: payment.file_vehicle_number,
      file_vehicle_brand: payment.file_vehicle_brand,
      file_customer_name: payment.file_customer_name,
      file_phone_number: payment.file_phone_number,
      file_customer_license: payment.file_customer_license,
      file_amount: payment.file_amount.toFixed(2),
      file_payment_number: payment.file_payment_number,
      file_payment_date: payment.file_payment_date,
      file_payment_type: payment.file_payment_type,
      file_payment_method: payment.file_payment_method,
      file_payment_description: payment.file_payment_description,
      name_similarity: top ? top.nameScore.toFixed(3) : '',
      phone_similarity: top ? top.phoneScore.toFixed(3) : '',
      sheet_name: sheetName,
    };
  });

  const summary = {
    companyId,
    sourceFile: filePath,
    sheetName,
    generatedAt: new Date().toISOString(),
    excelRowsRead: paymentRows.length,
    highConfidence: results.filter((row) => row.confidence === 'high').length,
    mediumConfidence: results.filter((row) => row.confidence === 'medium').length,
    lowConfidence: results.filter((row) => row.confidence === 'low').length,
    noMatch: results.filter((row) => row.confidence === 'no_match').length,
    ambiguous: results.filter((row) => row.ambiguous === 'yes').length,
    possibleExistingSystemPayments: results.filter((row) => row.possible_existing_system_payment).length,
    canLinkHighConfidence: results.filter((row) => row.recommended_action === 'can_link_high_confidence').length,
    reviewThenLinkLikely: results.filter((row) => row.recommended_action === 'review_then_link_likely').length,
    manualReviewAmbiguous: results.filter((row) => row.recommended_action === 'manual_review_ambiguous').length,
    manualReviewRequired: results.filter((row) => row.recommended_action === 'manual_review_required').length,
    doNotLinkWithoutMoreData: results.filter((row) => row.recommended_action === 'do_not_link_without_more_data').length,
  };

  const timestamp = summary.generatedAt.replace(/[:.]/g, '-');
  const baseName = `payment-file-contract-matching-${timestamp}`;
  const jsonPath = path.join(outputDir, `${baseName}.json`);
  const csvPath = path.join(outputDir, `${baseName}.csv`);
  const xlsxPath = path.join(outputDir, `${baseName}.xlsx`);
  const mdPath = path.join(outputDir, `${baseName}.md`);

  const columns = [
    'row_number',
    'recommended_action',
    'confidence',
    'match_score',
    'ambiguous',
    'suggested_contract_number',
    'suggested_contract_status',
    'system_customer_name',
    'system_customer_phone',
    'system_vehicle_plate',
    'system_vehicle',
    'evidence',
    'no_match_reason',
    'possible_existing_system_payment',
    'file_lease_identifier',
    'file_vehicle_number',
    'file_vehicle_brand',
    'file_customer_name',
    'file_phone_number',
    'file_customer_license',
    'file_amount',
    'file_payment_number',
    'file_payment_date',
    'file_payment_type',
    'file_payment_method',
    'file_payment_description',
    'name_similarity',
    'phone_similarity',
    'top_alternatives',
    'suggested_contract_id',
    'suggested_contract_start',
    'suggested_contract_end',
  ];

  fs.writeFileSync(jsonPath, JSON.stringify({ summary, results }, null, 2), 'utf8');
  fs.writeFileSync(csvPath, toCsv(results, columns), 'utf8');

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([summary]), 'Summary');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(results), 'All Rows');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(results.filter((row) => row.confidence === 'high')), 'High');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(results.filter((row) => row.confidence === 'medium')), 'Medium');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(results.filter((row) => row.confidence === 'low')), 'Low');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(results.filter((row) => row.confidence === 'no_match')), 'No Match');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(results.filter((row) => row.ambiguous === 'yes')), 'Ambiguous');
  XLSX.writeFile(workbook, xlsxPath);

  const byConfidence = ['high', 'medium', 'low', 'no_match']
    .map((key) => `- ${key}: ${results.filter((row) => row.confidence === key).length}`)
    .join('\n');

  const sampleRows = results
    .filter((row) => row.confidence !== 'high' || row.ambiguous === 'yes')
    .slice(0, 60);

  const md = [
    '# Payment File Contract Matching Report',
    '',
    `Generated: ${summary.generatedAt}`,
    `Source file: ${filePath}`,
    `Sheet: ${sheetName}`,
    '',
    '## Summary',
    '',
    `- Rows read: ${summary.excelRowsRead}`,
    byConfidence,
    `- Ambiguous rows: ${summary.ambiguous}`,
    `- Rows with possible existing system payment: ${summary.possibleExistingSystemPayments}`,
    `- Can link high confidence: ${summary.canLinkHighConfidence}`,
    `- Review then likely link: ${summary.reviewThenLinkLikely}`,
    `- Manual review ambiguous: ${summary.manualReviewAmbiguous}`,
    `- Manual review required: ${summary.manualReviewRequired}`,
    `- Do not link without more data: ${summary.doNotLinkWithoutMoreData}`,
    '',
    '## Matching Rules',
    '',
    '- The file contract number was treated as low-weight because it may be wrong.',
    '- Strongest signals: vehicle plate/number, customer phone suffix, customer name similarity, license/national ID, and payment date inside/near contract duration.',
    '- No database changes were made.',
    '',
    '## Rows Needing Review',
    '',
    sampleRows.length
      ? '| Row | Action | Confidence | Score | File Customer | File Phone | File Vehicle | Suggested Contract | System Customer | System Vehicle | Reason/Evidence |\n'
        + '|---:|---|---|---:|---|---|---|---|---|---|---|\n'
        + sampleRows.map((row) => `| ${row.row_number} | ${row.recommended_action} | ${row.confidence} | ${row.match_score} | ${row.file_customer_name} | ${row.file_phone_number} | ${row.file_vehicle_number} | ${row.suggested_contract_number} | ${row.system_customer_name} | ${row.system_vehicle_plate} | ${row.no_match_reason || row.evidence} |`).join('\n')
      : 'No rows need manual review.',
    '',
    '## Output Files',
    '',
    `- Excel report: ${xlsxPath}`,
    `- CSV report: ${csvPath}`,
    `- JSON report: ${jsonPath}`,
  ].join('\n');

  fs.writeFileSync(mdPath, md, 'utf8');

  console.log(JSON.stringify({ summary, mdPath, xlsxPath, csvPath, jsonPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
