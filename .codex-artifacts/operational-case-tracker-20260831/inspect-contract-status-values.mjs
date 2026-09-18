import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const input = await FileBlob.load('C:/Users/khamis/Desktop/تسوية-عقود-ودفعات-أغسطس-2026.xlsx');
const workbook = await SpreadsheetFile.importXlsx(input);
const rows = workbook.worksheets.getItem('تسوية الـ89').getRange('A5:V93').values;
const actionable = rows.filter((row) => !['مطابق', 'قرار إداري أحدث'].includes(String(row[5] ?? '')));
const counts = new Map();
for (const row of actionable) {
  const status = String(row[8] ?? '').trim() || '(فارغ)';
  counts.set(status, (counts.get(status) ?? 0) + 1);
}
console.log(JSON.stringify([...counts.entries()].sort((a, b) => b[1] - a[1]), null, 2));
