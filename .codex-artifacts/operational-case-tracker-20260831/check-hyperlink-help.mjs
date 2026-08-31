import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'C:/Users/khamis/Documents/fleetifyapp/outputs/01a049c7-4eac-7af1-9ea6-cc98731c168f/متابعة-تشغيلية-لتسوية-عقود-أغسطس-2026.xlsx';
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const help = workbook.help('range.hyperlink', {
  include: 'index,examples,notes',
  maxChars: 5000,
});
console.log(help.ndjson);
