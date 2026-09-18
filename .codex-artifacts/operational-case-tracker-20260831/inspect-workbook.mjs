import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'C:/Users/khamis/Desktop/تسوية-عقود-ودفعات-أغسطس-2026.xlsx';
const workDir = path.resolve('.');
const previewDir = path.join(workDir, 'previews-before');

await fs.mkdir(previewDir, { recursive: true });
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const sheetSummary = await workbook.inspect({
  kind: 'sheet',
  include: 'id,name',
  maxChars: 10000,
});
console.log('SHEETS');
console.log(sheetSummary.ndjson);

const overview = await workbook.inspect({
  kind: 'workbook,sheet,table',
  maxChars: 18000,
  tableMaxRows: 8,
  tableMaxCols: 12,
  tableMaxCellChars: 120,
});
console.log('OVERVIEW');
console.log(overview.ndjson);

for (let index = 0; index < workbook.worksheets.items.length; index += 1) {
  const sheet = workbook.worksheets.getItemAt(index);
  const used = sheet.getUsedRange(true);
  const usedAddress = used?.address || null;
  console.log(JSON.stringify({ index, name: sheet.name, usedAddress }));
  const preview = await workbook.render({
    sheetName: sheet.name,
    autoCrop: 'all',
    scale: 1,
    format: 'png',
  });
  const safeName = `${String(index + 1).padStart(2, '0')}-${sheet.name.replace(/[\\/:*?"<>|]/g, '_')}.png`;
  await fs.writeFile(path.join(previewDir, safeName), new Uint8Array(await preview.arrayBuffer()));
}
