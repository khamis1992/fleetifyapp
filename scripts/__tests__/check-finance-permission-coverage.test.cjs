const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../..');
const script = fs.readFileSync(path.join(root, 'scripts/check-finance-permission-coverage.cjs'), 'utf8');
const migration = 'supabase/migrations/20260917235302_professional_balance_sheets.sql';
const reportFiles = [
  'src/components/finance/TrialBalanceReport.tsx',
  'src/components/finance/IncomeStatementReport.tsx',
  'src/components/finance/CashFlowStatementReport.tsx',
];

// Run the actual CLI against an in-memory modified source view. No repository
// files are changed, and a failed security marker cannot exit the test process.
function runCoverage(overrides = {}) {
  const sources = new Map(Object.entries(overrides).map(([file, source]) => [path.join(root, file), source]));
  const errors = [];
  let code = 0;
  const exit = Symbol('coverage exit');
  const mockedFs = {
    existsSync: file => sources.has(file) ? sources.get(file) !== null : fs.existsSync(file),
    readFileSync: (file, encoding) => sources.has(file) ? sources.get(file) : fs.readFileSync(file, encoding),
  };
  try {
    vm.runInNewContext(script, {
      require: name => {
        if (name === 'fs') return mockedFs;
        if (name === 'path') return path;
        throw new Error(`Unexpected module: ${name}`);
      },
      process: { cwd: () => root, exit: value => { code = value; throw exit; } },
      console: { log: () => {}, error: value => errors.push(String(value)) },
    }, { filename: 'check-finance-permission-coverage.cjs' });
  } catch (error) {
    if (error !== exit) throw error;
  }
  return { code, errors: errors.join('\n') };
}

function without(file, marker) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(source.includes(marker), `Fixture marker missing: ${file} / ${marker}`);
  return source.split(marker).join('REMOVED_CONTRACT');
}

test('accepts the current Arabic PDF export contract and actual migration filename', () => {
  assert.equal(runCoverage().code, 0);
});

for (const file of reportFiles) {
  test(`rejects a missing PDF export call in ${path.basename(file)}`, () => {
    const result = runCoverage({ [file]: without(file, 'await exportArabicReportPdf(') });
    assert.equal(result.code, 1);
    assert.match(result.errors, /missing marker: await exportArabicReportPdf/);
  });

  test(`rejects missing source fingerprint metadata in ${path.basename(file)}`, () => {
    const marker = file.includes('TrialBalance')
      ? 'sourceFingerprint: auditReport.sourceFingerprint'
      : 'sourceFingerprint: sourceReport.sourceFingerprint';
    const result = runCoverage({ [file]: without(file, marker) });
    assert.equal(result.code, 1);
    assert.match(result.errors, /missing marker: sourceFingerprint:/);
  });
}

test('rejects a renderer that no longer saves the requested PDF', () => {
  const file = 'src/utils/arabicReportPdf.ts';
  const result = runCoverage({ [file]: without(file, 'pdf.save(fileName)') });
  assert.equal(result.code, 1);
  assert.match(result.errors, /missing marker: pdf.save/);
});

test('rejects a missing actual balance sheet migration', () => {
  const result = runCoverage({ [migration]: null });
  assert.equal(result.code, 1);
  assert.match(result.errors, /20260917235302_professional_balance_sheets.sql is missing/);
});

test('still rejects missing balance sheet authorization and RLS guards', () => {
  for (const marker of ['is_finance_action_authorized', 'professional_balance_sheet_reports_read', 'REVOKE ALL ON public.professional_balance_sheet_reports']) {
    const result = runCoverage({ [migration]: without(migration, marker) });
    assert.equal(result.code, 1);
    assert.ok(result.errors.includes(`missing marker: ${marker}`));
  }
});

test('still rejects missing segregation of duties and prohibited direct report exporters', () => {
  const rules = 'src/utils/financeAccessRules.ts';
  assert.equal(runCoverage({ [rules]: without(rules, 'journal_creator_cannot_approve') }).code, 1);
  const file = reportFiles[0];
  const result = runCoverage({ [file]: `${fs.readFileSync(path.join(root, file), 'utf8')}\nimport jsPDF from "jspdf";` });
  assert.equal(result.code, 1);
  assert.match(result.errors, /contains forbidden marker/);
});
