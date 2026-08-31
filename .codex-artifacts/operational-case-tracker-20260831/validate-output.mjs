import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'C:/Users/khamis/Documents/fleetifyapp/outputs/01a049c7-4eac-7af1-9ea6-cc98731c168f/متابعة-تشغيلية-لتسوية-عقود-أغسطس-2026.xlsx';
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const tracker = await workbook.inspect({
  kind: 'table',
  range: 'متابعة الحالات!A1:AE12',
  include: 'values,formulas',
  tableMaxRows: 12,
  tableMaxCols: 31,
  summary: 'tracker key range',
});

const lists = await workbook.inspect({
  kind: 'table',
  range: 'قوائم المتابعة!A1:I20',
  include: 'values,formulas',
  tableMaxRows: 20,
  tableMaxCols: 9,
  summary: 'tracker lists and instructions',
});

const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 300 },
  summary: 'final formula error scan',
});

console.log('TRACKER');
console.log(tracker.ndjson);
console.log('LISTS');
console.log(lists.ndjson);
console.log('ERRORS');
console.log(errors.ndjson);
