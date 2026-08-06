const fs = require('fs');
const path = require('path');

const outputDir = path.join(process.cwd(), 'output');
const summaryPath = path.join(outputDir, 'customer-arabic-data-current-summary.json');
const activeCsvPath = path.join(outputDir, 'customer-arabic-data-active-issues.csv');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function countCsvRecords(csvText) {
  const text = csvText.replace(/^\uFEFF/, '').trimEnd();
  if (!text) return 0;
  return text.split(/\r?\n/).length - 1;
}

if (!fs.existsSync(summaryPath)) {
  fail(`Missing summary report: ${summaryPath}`);
}

if (!fs.existsSync(activeCsvPath)) {
  fail(`Missing active customer issues report: ${activeCsvPath}`);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
if (path.resolve(summary.summaryPath || '') !== path.resolve(summaryPath)) {
  fail(`Summary path mismatch. Expected ${summaryPath}, got ${summary.summaryPath || 'empty'}`);
}

if (path.resolve(summary.activeCsvPath || '') !== path.resolve(activeCsvPath)) {
  fail(`Active CSV path mismatch. Expected ${activeCsvPath}, got ${summary.activeCsvPath || 'empty'}`);
}

const csvBuffer = fs.readFileSync(activeCsvPath);
const hasBom = csvBuffer[0] === 0xEF && csvBuffer[1] === 0xBB && csvBuffer[2] === 0xBF;
if (!hasBom) {
  fail('Active customer issues CSV must start with UTF-8 BOM for Excel Arabic compatibility.');
}

const csvText = csvBuffer.toString('utf8');
if (/[\u00D8\u00D9\u00C3\u00C2]/.test(csvText)) {
  fail('Active customer issues CSV contains mojibake text.');
}

const header = csvText.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] || '';
for (const column of ['issues_ar', 'required_action', 'active_contracts']) {
  if (!header.split(',').includes(column)) {
    fail(`Active customer issues CSV is missing required column: ${column}`);
  }
}

if (!csvText.includes('استكمال الجنسية بالعربي من مستند رسمي')) {
  fail('Active customer issues CSV is missing Arabic employee action text.');
}

const activeRecordCount = countCsvRecords(csvText);
if (activeRecordCount !== summary.active_contract_customers_with_issues) {
  fail(
    `Active issue row count mismatch. CSV=${activeRecordCount}, summary=${summary.active_contract_customers_with_issues}`
  );
}

console.log(JSON.stringify({
  status: 'passed',
  activeRecordCount,
  summaryPath,
  activeCsvPath,
}, null, 2));
