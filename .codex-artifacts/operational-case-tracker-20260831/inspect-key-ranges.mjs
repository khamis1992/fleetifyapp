import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const input = await FileBlob.load('C:/Users/khamis/Desktop/تسوية-عقود-ودفعات-أغسطس-2026.xlsx');
const workbook = await SpreadsheetFile.importXlsx(input);

for (const [sheetId, range] of [
  ['تسوية الـ89', 'A4:V12'],
  ['التعارضات المالية', 'A4:Z12'],
  ['ضبط الأسماء', 'A4:J12'],
  ['تدقيق المطالبات القانونية', 'A4:J12'],
]) {
  const result = await workbook.inspect({
    kind: 'table',
    sheetId,
    range,
    include: 'values,formulas',
    tableMaxRows: 12,
    tableMaxCols: 30,
    tableMaxCellChars: 220,
    maxChars: 24000,
  });
  console.log(`RANGE ${sheetId}!${range}`);
  console.log(result.ndjson);
}
