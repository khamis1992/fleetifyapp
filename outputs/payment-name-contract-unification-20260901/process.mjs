import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/khamis/Desktop/دفعات-موحد.xlsx";
const outputDir = "C:/Users/khamis/Documents/fleetifyapp/outputs/payment-name-contract-unification-20260901";
const outputPath = `${outputDir}/دفعات-موحد-مطابق-مع-النظام.xlsx`;
const mappingPath = `${outputDir}/match-mapping.json`;

const [input, mappingText] = await Promise.all([
  FileBlob.load(inputPath),
  fs.readFile(mappingPath, "utf8"),
]);
const workbook = await SpreadsheetFile.importXlsx(input);
const mapping = JSON.parse(mappingText);

const normalizePlate = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[–—]/g, "-");

const contractLabel = (match) => {
  if (match?.contract_number) return match.contract_number;
  if (match?.match_status === "customer_only") return "لا يوجد عقد مرتبط";
  return "تحتاج مراجعة";
};

const byPlate = new Map(mapping.map((row) => [normalizePlate(row.plate), row]));
const summarySheet = workbook.worksheets.getItem("ملخص العملاء");
const paymentsSheet = workbook.worksheets.getItem("الدفعات");
const sourcesSheet = workbook.worksheets.getItem("ملفات المصدر");

// ملخص العملاء: توحيد الاسم وإضافة رقم العقد.
summarySheet.getRange("Q1:Q80").copyFrom(summarySheet.getRange("P1:P80"));
summarySheet.getRange("Q1:Q2").values = [[null], [null]];
summarySheet.getRange("Q3").values = [["رقم العقد"]];
summarySheet.getRange("A4:A79").values = mapping.map((row) => [row.system_name]);
summarySheet.getRange("Q4:Q79").values = mapping.map((row) => [contractLabel(row)]);
summarySheet.getRange("Q80").values = [[null]];
summarySheet.getRange("Q:Q").format.columnWidth = 23;

// الدفعات: تطبيع الاسم ورقم العقد لكل حركة بحسب لوحة المركبة.
const paymentRows = paymentsSheet.getRange("A4:K773").values;
const paymentNames = [];
const paymentContracts = [];
for (const row of paymentRows) {
  const match = byPlate.get(normalizePlate(row[1]));
  paymentNames.push([match?.system_name ?? row[0]]);
  paymentContracts.push([contractLabel(match)]);
}
paymentsSheet.getRange("L1:L773").copyFrom(paymentsSheet.getRange("K1:K773"));
paymentsSheet.getRange("L1:L2").values = [[null], [null]];
paymentsSheet.getRange("L3").values = [["رقم العقد"]];
paymentsSheet.getRange("A4:A773").values = paymentNames;
paymentsSheet.getRange("L4:L773").values = paymentContracts;
paymentsSheet.getRange("L:L").format.columnWidth = 23;

// ملفات المصدر: الاسم المستخرج يصبح اسم النظام، مع رقم العقد بجواره.
const sourceRows = sourcesSheet.getRange("A4:J80").values;
const sourceNames = [];
const sourceContracts = [];
for (const row of sourceRows) {
  const match = byPlate.get(normalizePlate(row[7]));
  sourceNames.push([match?.system_name ?? row[6]]);
  sourceContracts.push([contractLabel(match)]);
}
sourcesSheet.getRange("K1:K80").copyFrom(sourcesSheet.getRange("J1:J80"));
sourcesSheet.getRange("K1:K2").values = [[null], [null]];
sourcesSheet.getRange("K3").values = [["رقم العقد"]];
sourcesSheet.getRange("G4:G80").values = sourceNames;
sourcesSheet.getRange("K4:K80").values = sourceContracts;
sourcesSheet.getRange("K:K").format.columnWidth = 23;

// تمييز الحالات التي تحتاج متابعة دون تغيير التصميم الأساسي للصفوف الأخرى.
const statusColors = {
  customer_only: { fill: "#FFF4CE", font: "#8A5A00" },
  unmatched: { fill: "#FDE7E9", font: "#B42318" },
};
for (const match of mapping) {
  const color = statusColors[match.match_status];
  if (!color) continue;
  const summaryCell = summarySheet.getRange(`Q${match.excel_row}`);
  summaryCell.format.fill = color.fill;
  summaryCell.format.font = { bold: true, color: color.font };
}

for (let index = 0; index < paymentRows.length; index += 1) {
  const match = byPlate.get(normalizePlate(paymentRows[index][1]));
  const color = statusColors[match?.match_status];
  if (!color) continue;
  const cell = paymentsSheet.getRange(`L${index + 4}`);
  cell.format.fill = color.fill;
  cell.format.font = { bold: true, color: color.font };
}

for (let index = 0; index < sourceRows.length; index += 1) {
  const match = byPlate.get(normalizePlate(sourceRows[index][7]));
  const color = statusColors[match?.match_status];
  if (!color) continue;
  const cell = sourcesSheet.getRange(`K${index + 4}`);
  cell.format.fill = color.fill;
  cell.format.font = { bold: true, color: color.font };
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const verification = await workbook.inspect({
  kind: "table",
  range: "ملخص العملاء!A1:Q15",
  tableMaxRows: 15,
  tableMaxCols: 17,
  tableMaxCellChars: 120,
  maxChars: 12000,
});
console.log("SUMMARY_VERIFICATION");
console.log(verification.ndjson);

const errorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log("ERROR_SCAN");
console.log(errorScan.ndjson);

for (const [sheetName, range] of [
  ["ملخص العملاء", "A1:Q40"],
  ["الدفعات", "A1:L40"],
  ["ملفات المصدر", "A1:K40"],
  ["شرح الحساب", "A1:B12"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  const safeName = sheetName.replace(/[\\/:*?"<>|]/g, "_");
  await fs.writeFile(
    `${outputDir}/after-${safeName}.png`,
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const counts = {
  mappedContracts: mapping.filter((row) => row.contract_number).length,
  customersWithoutContract: mapping.filter((row) => row.match_status === "customer_only").length,
  needsReview: mapping.filter((row) => row.match_status === "unmatched").length,
  paymentRows: paymentRows.length,
  sourceRows: sourceRows.length,
};
console.log("COUNTS");
console.log(JSON.stringify(counts));
console.log(`OUTPUT ${outputPath}`);
