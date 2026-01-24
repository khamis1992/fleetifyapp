const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '../data/templates/customer-data-template.xlsx');

console.log('Reading template from:', templatePath);
console.log('File exists:', fs.existsSync(templatePath));

if (fs.existsSync(templatePath)) {
  const workbook = XLSX.readFile(templatePath);
  console.log('\nSheet names:', workbook.SheetNames);
  console.log('Number of sheets:', workbook.SheetNames.length);

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  console.log('\nFirst sheet keys:', Object.keys(firstSheet).slice(0, 20));

  // Try reading with different options
  console.log('\n--- Reading with default options ---');
  const data1 = XLSX.utils.sheet_to_json(firstSheet);
  console.log('Rows with sheet_to_json (default):', data1.length);

  console.log('\n--- Reading with header: 1 ---');
  const data2 = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
  console.log('Rows with header:1:', data2.length);
  console.log('First row (header):', data2[0]);

  if (data2.length > 1) {
    console.log('Second row (first data):', data2[1]);
  }

  console.log('\n--- Raw cell access ---');
  console.log('Cell A1:', firstSheet['A1']);
  console.log('Cell B1:', firstSheet['B1']);
  console.log('Cell A2:', firstSheet['A2']);
  console.log('Cell B2:', firstSheet['B2']);
}
