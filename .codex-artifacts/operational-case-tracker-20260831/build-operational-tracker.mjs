import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'C:/Users/khamis/Desktop/تسوية-عقود-ودفعات-أغسطس-2026.xlsx';
const outputDir = 'C:/Users/khamis/Documents/fleetifyapp/outputs/01a049c7-4eac-7af1-9ea6-cc98731c168f';
const outputPath = path.join(outputDir, 'متابعة-تشغيلية-لتسوية-عقود-أغسطس-2026.xlsx');
const previewDir = path.resolve('previews-after');
const baseUrl = 'http://localhost:8080';

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const sourceSheet = workbook.worksheets.getItem('تسوية الـ89');
const namesSheet = workbook.worksheets.getItem('ضبط الأسماء');
const summarySheet = workbook.worksheets.getItem('الملخص');

const sourceRows = sourceSheet.getRange('A5:V93').values;
const nameRows = namesSheet.getRange('A5:J93').values;
const namesByPlate = new Map(nameRows.map((row) => [String(row[0] ?? ''), row]));
const actionableCases = sourceRows
  .map((row, sourceIndex) => ({ row, sourceIndex }))
  .filter(({ row }) => !['مطابق', 'قرار إداري أحدث'].includes(String(row[5] ?? '')));
const dataStartRow = 6;
const dataEndRow = dataStartRow + actionableCases.length - 1;

const extractContractNumber = (value) => {
  const text = String(value ?? '');
  const match = text.match(/(?:C-ALF-\d+|CON-\d{2}-[A-Z0-9]+|AGR-\d{6}-\d+|LTO\d+|HIST-[A-Z0-9-]+|CNT-\d{2}-[A-Z0-9-]+)/i);
  return match?.[0] ?? '';
};

const getPriority = (classification, statuses) => {
  if (classification === 'عقد باسم عميل آخر' || classification === 'مطابق مع تعارض موازٍ') return 'عاجل';
  if (classification === 'لا يوجد عقد حي' || classification === 'عقد العميل على مركبة أخرى') return 'عالٍ';
  if (String(statuses ?? '').includes('إجراء قانوني')) return 'متوسط';
  return 'منخفض';
};

const getMissingEvidence = (classification, signedMatch, customerMatch) => {
  const missing = [];
  if (signedMatch !== 'نعم') missing.push('عقد موقع');
  if (customerMatch === 'غير موجود' || customerMatch === 'أسماء متعددة') missing.push('هوية/ربط عميل');
  if (classification !== 'مطابق' && classification !== 'قرار إداري أحدث') missing.push('إثبات الحيازة/التسليم');
  return missing.join('، ');
};

const getDueDate = (priority, closed) => {
  if (closed) return null;
  const base = new Date('2026-08-31T00:00:00Z');
  const days = priority === 'عاجل' ? 3 : priority === 'عالٍ' ? 7 : 14;
  base.setUTCDate(base.getUTCDate() + days);
  return base;
};

const tracker = workbook.worksheets.add('متابعة الحالات');
const lists = workbook.worksheets.add('قوائم المتابعة');

// Settings and validation lists.
lists.showGridLines = false;
lists.getRange('A1:I1').merge();
lists.getRange('A1').values = [['قوائم وضوابط المتابعة التشغيلية']];
lists.getRange('A1:I1').format = {
  fill: '#14324A',
  font: { bold: true, color: '#FFFFFF', size: 16 },
  horizontalAlignment: 'right',
  verticalAlignment: 'center',
};
lists.getRange('A2:B2').values = [['رابط النظام الأساسي', baseUrl]];
lists.getRange('A2:B2').format = {
  fill: '#E8F1F7',
  font: { bold: true, color: '#14324A' },
};
lists.getRange('A4:E4').values = [[
  'حالة المتابعة', 'حالة التنفيذ', 'قرار المراجع', 'الإجراء في النظام', 'الأولوية',
]];
lists.getRange('A4:E4').format = {
  fill: '#15827A',
  font: { bold: true, color: '#FFFFFF' },
  horizontalAlignment: 'center',
};
lists.getRange('A5:A11').values = [
  ['لم تبدأ'], ['تحت المراجعة'], ['بانتظار مستند'], ['بانتظار اعتماد'],
  ['جاهزة للتنفيذ'], ['تم التنفيذ'], ['مغلقة دون تعديل'],
];
lists.getRange('B5:B8').values = [
  ['لم ينفذ'], ['تم التعديل'], ['لا يحتاج تعديل'], ['تعذر التنفيذ'],
];
lists.getRange('C5:C12').values = [
  ['العقد صحيح'], ['إلغاء العقد القديم'], ['تحويل للشؤون القانونية'], ['إنشاء عقد جديد'],
  ['تصحيح العميل'], ['تصحيح المركبة'], ['لا إجراء'], ['يحتاج تصعيد'],
];
lists.getRange('D5:D12').values = [
  ['لا إجراء'], ['تعديل حالة العقد'], ['تعديل تاريخ الإلغاء'], ['ربط عقد بمركبة'],
  ['إنشاء عقد'], ['تصحيح بيانات العميل'], ['تحويل قانوني'], ['مراجعة مالية'],
];
lists.getRange('E5:E8').values = [['عاجل'], ['عالٍ'], ['متوسط'], ['منخفض']];
lists.getRange('G4:I4').values = [[
  'التحقق من حالة العقد', 'مرجع حالة العقد', 'رمز الحالة في النظام',
]];
lists.getRange('G4:I4').format = {
  fill: '#15827A',
  font: { bold: true, color: '#FFFFFF' },
  horizontalAlignment: 'center',
};
lists.getRange('G5:G7').values = [['صحيحة'], ['تحتاج تصحيح'], ['غير محسومة']];
lists.getRange('H5:I17').values = [
  ['مسودة', 'draft'],
  ['تحت المراجعة', 'under_review'],
  ['قيد الانتظار', 'pending'],
  ['بانتظار الاستكمال', 'pending_completion'],
  ['نشط / ساري', 'active'],
  ['منتهي', 'expired'],
  ['قريب الانتهاء', 'expiring_soon'],
  ['معلق', 'suspended'],
  ['ملغي', 'cancelled'],
  ['مجدد', 'renewed'],
  ['مكتمل', 'completed'],
  ['مغلق', 'closed'],
  ['تحت الإجراء القانوني', 'under_legal_procedure'],
];
lists.getRange('A14:E14').merge();
lists.getRange('A14').values = [['طريقة العمل']];
lists.getRange('A14:E14').format = {
  fill: '#15827A', font: { bold: true, color: '#FFFFFF' }, horizontalAlignment: 'right',
};
lists.getRange('A15:E20').merge(true);
lists.getRange('A15:A20').values = [
  ['1. افتح ورقة «متابعة الحالات» وابدأ بالحالات العاجلة.'],
  ['2. اضغط «فتح العقد» لمراجعة العقد مباشرة، أو «صفحة العقود» إذا لم يوجد عقد.'],
  ['3. قارن «حالة العقد في النظام» بالتواريخ والمركبة والحيازة والمستند الموقع.'],
  ['4. اختر «صحيحة» أو «تحتاج تصحيح» أو «غير محسومة» في عمود التحقق.'],
  ['5. عبّئ قرار المراجع والإجراء المطلوب والمسؤول، ثم نفّذ التعديل وسجّل المرجع.'],
  ['6. لا تغيّر حالة الحالة إلى «تم التنفيذ» قبل تسجيل دليل أو مرجع واضح.'],
];
lists.getRange('A15:E20').format = {
  fill: '#F7FAFC',
  font: { color: '#243B53' },
  wrapText: true,
  horizontalAlignment: 'right',
  verticalAlignment: 'center',
};
lists.getRange('A1:I20').format.font.name = 'Cairo';
lists.getRange('A1:I20').format.rowHeight = 26;
lists.getRange('A:E').format.columnWidth = 28;
lists.getRange('B:B').format.columnWidth = 34;
lists.getRange('F:F').format.columnWidth = 4;
lists.getRange('G:G').format.columnWidth = 24;
lists.getRange('H:H').format.columnWidth = 26;
lists.getRange('I:I').format.columnWidth = 27;
lists.freezePanes.freezeRows(4);

// Tracker title and dashboard.
tracker.showGridLines = false;
tracker.getRange('A1:AE1').merge();
tracker.getRange('A1').values = [['متابعة تشغيلية — تسوية عقود ودفعات أغسطس 2026']];
tracker.getRange('A1:AE1').format = {
  fill: '#14324A',
  font: { bold: true, color: '#FFFFFF', size: 17, name: 'Cairo' },
  horizontalAlignment: 'right',
  verticalAlignment: 'center',
  rowHeight: 34,
};
tracker.getRange('A2:AE2').merge();
tracker.getRange('A2').values = [[
  'ابدأ بالعاجل، راجع حالة العقد الظاهرة، وثّق إن كانت صحيحة أو تحتاج تصحيحاً، ثم نفّذ الإجراء وسجّل المرجع. المبالغ مرجعية ويجب التحقق منها داخل النظام قبل أي مطالبة.',
]];
tracker.getRange('A2:AE2').format = {
  fill: '#E8F1F7', font: { color: '#36536B', name: 'Cairo' }, wrapText: true,
  horizontalAlignment: 'right', verticalAlignment: 'center', rowHeight: 31,
};

tracker.getRange('A3:P3').values = [[
  'إجمالي الحالات', null, 'المفتوحة', null, 'تحت المراجعة', null, 'حالة العقد صحيحة', null,
  'تحتاج تصحيح', null, 'غير محسومة', null, 'تم التنفيذ', null, 'فرق مالي محتمل', null,
]];
tracker.getRange('A3:P3').format = {
  fill: '#15827A', font: { bold: true, color: '#FFFFFF', name: 'Cairo' },
  horizontalAlignment: 'center', verticalAlignment: 'center',
};
tracker.getRange('B3').formulas = [[`=COUNTA(A${dataStartRow}:A${dataEndRow})`]];
tracker.getRange('D3').formulas = [[`=COUNTIF(C${dataStartRow}:C${dataEndRow},"لم تبدأ")`]];
tracker.getRange('F3').formulas = [[`=COUNTIF(C${dataStartRow}:C${dataEndRow},"تحت المراجعة")`]];
tracker.getRange('H3').formulas = [[`=COUNTIF(K${dataStartRow}:K${dataEndRow},"صحيحة")`]];
tracker.getRange('J3').formulas = [[`=COUNTIF(K${dataStartRow}:K${dataEndRow},"تحتاج تصحيح")`]];
tracker.getRange('L3').formulas = [[`=COUNTIF(K${dataStartRow}:K${dataEndRow},"غير محسومة")`]];
tracker.getRange('N3').formulas = [[`=COUNTIF(C${dataStartRow}:C${dataEndRow},"تم التنفيذ")`]];
tracker.getRange('P3').formulas = [[`=SUM(AE${dataStartRow}:AE${dataEndRow})`]];
tracker.getRange('B3,D3,F3,H3,J3,L3,N3,P3').format = {
  fill: '#DDF3EE', font: { bold: true, color: '#14324A', name: 'Cairo' },
  horizontalAlignment: 'center', numberFormat: '#,##0',
};
tracker.getRange('P3').format.numberFormat = '#,##0 "ر.ق"';

tracker.getRange('A4:F4').values = [[
  'روابط سريعة', null, null, null, null, 'ملاحظة',
]];
tracker.getRange('A4:F4').format = {
  fill: '#F6E7B0', font: { bold: true, color: '#704B00', name: 'Cairo' },
  horizontalAlignment: 'center',
};
tracker.getRange('F4').values = [['يمكن تغيير رابط النظام من ورقة «قوائم المتابعة».']];
tracker.getRange('F4').format.wrapText = true;
tracker.getRange('B4').formulas = [[`=HYPERLINK("${baseUrl}/contracts","فتح العقود")`]];
tracker.getRange('C4').formulas = [[`=HYPERLINK("${baseUrl}/tasks","فتح المهام")`]];
tracker.getRange('D4').formulas = [[`=HYPERLINK("${baseUrl}/customers","فتح العملاء")`]];
tracker.getRange('E4').formulas = [[`=HYPERLINK("${baseUrl}/fleet","فتح الأسطول")`]];

const headers = [[
  'رقم الحالة', 'الأولوية', 'حالة المتابعة', 'حالة التنفيذ', 'اللوحة', 'مستأجر أغسطس',
  'التصنيف', 'الثقة', 'العقد محل المراجعة', 'حالة العقد في النظام (حسب التحليل)',
  'التحقق من حالة العقد', 'فتح العقد', 'صفحة العقود', 'فتح التحليل',
  'الإجراء المقترح', 'قرار المراجع', 'الإجراء في النظام', 'المسؤول', 'تاريخ الاستحقاق',
  'آخر تحديث', 'الدليل/المستند الناقص', 'الهاتف', 'الرقم الشخصي/الجواز', 'مطابقة العميل',
  'رقم مهمة النظام', 'مرجع التعديل/التذكرة', 'ملاحظات المراجع', 'المستحق حتى أغسطس',
  'مخالفات غير مسددة', 'قيمة القضية القائمة', 'فرق مالي محتمل',
]];
tracker.getRange('A5:AE5').values = headers;
tracker.getRange('A5:AE5').format = {
  fill: '#15827A',
  font: { bold: true, color: '#FFFFFF', name: 'Cairo', size: 10 },
  wrapText: true,
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
  rowHeight: 42,
  borders: { preset: 'outside', style: 'thin', color: '#0F5F59' },
};

const dataRows = actionableCases.map(({ row, sourceIndex }) => {
  const plate = String(row[0] ?? '');
  const classification = String(row[5] ?? '');
  const priority = getPriority(classification, row[8]);
  const names = namesByPlate.get(plate) ?? [];
  const primaryContract = extractContractNumber(row[6]) || extractContractNumber(row[9]);
  const customerMatch = String(row[21] ?? names[8] ?? '');
  return [
    `AUG-2026-${String(sourceIndex + 1).padStart(3, '0')}`,
    priority,
    'لم تبدأ',
    'لم ينفذ',
    plate,
    row[1] ?? '',
    classification,
    row[17] ?? '',
    primaryContract,
    String(row[8] ?? '').trim() || 'غير موجودة في التحليل',
    '',
    null,
    null,
    null,
    row[16] ?? '',
    '',
    '',
    '',
    getDueDate(priority, false),
    null,
    getMissingEvidence(classification, row[14], customerMatch),
    row[20] ?? names[4] ?? '',
    names[6] ?? '',
    customerMatch,
    '',
    '',
    '',
    Number(row[10] || 0),
    Number(row[12] || 0),
    Number(row[13] || 0),
    null,
  ];
});
tracker.getRange(`A${dataStartRow}:AE${dataEndRow}`).values = dataRows;

const linkFormulas = actionableCases.map(({ row, sourceIndex }, index) => {
  const excelRow = dataStartRow + index;
  const sourceRow = sourceIndex + 5;
  const primaryContract = extractContractNumber(row[6]) || extractContractNumber(row[9]);
  return [
    primaryContract ? `=HYPERLINK("${baseUrl}/contracts/${encodeURIComponent(primaryContract)}","فتح العقد")` : '',
    `=HYPERLINK("${baseUrl}/contracts","صفحة العقود")`,
    `=HYPERLINK("#'تسوية الـ89'!A${sourceRow}","فتح التحليل")`,
  ];
});
tracker.getRange(`L${dataStartRow}:N${dataEndRow}`).formulas = linkFormulas;

tracker.getRange(`AE${dataStartRow}`).formulas = [[`=MAX(0,AD${dataStartRow}-(AB${dataStartRow}+AC${dataStartRow}))`]];
tracker.getRange(`AE${dataStartRow}:AE${dataEndRow}`).fillDown();

const table = tracker.tables.add(`A5:AE${dataEndRow}`, true, 'OperationalCasesTable');
table.style = 'TableStyleMedium2';
table.showFilterButton = true;
table.showBandedRows = true;

tracker.getRange(`B${dataStartRow}:B${dataEndRow}`).dataValidation = {
  rule: { type: 'list', formula1: "'قوائم المتابعة'!$E$5:$E$8" },
};
tracker.getRange(`C${dataStartRow}:C${dataEndRow}`).dataValidation = {
  rule: { type: 'list', formula1: "'قوائم المتابعة'!$A$5:$A$11" },
};
tracker.getRange(`D${dataStartRow}:D${dataEndRow}`).dataValidation = {
  rule: { type: 'list', formula1: "'قوائم المتابعة'!$B$5:$B$8" },
};
tracker.getRange(`K${dataStartRow}:K${dataEndRow}`).dataValidation = {
  rule: { type: 'list', formula1: "'قوائم المتابعة'!$G$5:$G$7" },
};
tracker.getRange(`P${dataStartRow}:P${dataEndRow}`).dataValidation = {
  rule: { type: 'list', formula1: "'قوائم المتابعة'!$C$5:$C$12" },
};
tracker.getRange(`Q${dataStartRow}:Q${dataEndRow}`).dataValidation = {
  rule: { type: 'list', formula1: "'قوائم المتابعة'!$D$5:$D$12" },
};

tracker.getRange(`A${dataStartRow}:AE${dataEndRow}`).format = {
  font: { name: 'Cairo', size: 9, color: '#243B53' },
  verticalAlignment: 'center',
  rowHeight: 34,
};
tracker.getRange(`A${dataStartRow}:N${dataEndRow}`).format.horizontalAlignment = 'center';
tracker.getRange(`O${dataStartRow}:AA${dataEndRow}`).format.horizontalAlignment = 'right';
tracker.getRange(`O${dataStartRow}:AA${dataEndRow}`).format.wrapText = true;
tracker.getRange(`AB${dataStartRow}:AE${dataEndRow}`).format.horizontalAlignment = 'right';
tracker.getRange(`S${dataStartRow}:T${dataEndRow}`).format.numberFormat = 'yyyy-mm-dd';
tracker.getRange(`AB${dataStartRow}:AE${dataEndRow}`).format.numberFormat = '#,##0 "ر.ق"';
tracker.getRange(`A${dataStartRow}:A${dataEndRow}`).format.font.bold = true;
tracker.getRange(`E${dataStartRow}:E${dataEndRow}`).format.font.bold = true;
tracker.getRange(`L${dataStartRow}:N${dataEndRow}`).format.font = { name: 'Cairo', bold: true, color: '#0B6E99' };

const widths = {
  A: 17, B: 10, C: 17, D: 16, E: 11, F: 24, G: 25, H: 17, I: 20,
  J: 26, K: 20, L: 13, M: 14, N: 14, O: 48, P: 24, Q: 24, R: 18,
  S: 15, T: 15, U: 28, V: 15, W: 20, X: 18, Y: 20, Z: 24, AA: 36,
  AB: 17, AC: 18, AD: 18, AE: 17,
};
for (const [column, width] of Object.entries(widths)) {
  tracker.getRange(`${column}:${column}`).format.columnWidth = width;
}

tracker.getRange(`B${dataStartRow}:B${dataEndRow}`).conditionalFormats.add('containsText', {
  text: 'عاجل', format: { fill: '#FADBD8', font: { bold: true, color: '#A93226' } },
});
tracker.getRange(`B${dataStartRow}:B${dataEndRow}`).conditionalFormats.add('containsText', {
  text: 'عالٍ', format: { fill: '#FCE8C3', font: { bold: true, color: '#9C5A00' } },
});
tracker.getRange(`C${dataStartRow}:C${dataEndRow}`).conditionalFormats.add('containsText', {
  text: 'لم تبدأ', format: { fill: '#FCE8C3', font: { color: '#9C5A00' } },
});
tracker.getRange(`C${dataStartRow}:C${dataEndRow}`).conditionalFormats.add('containsText', {
  text: 'تحت المراجعة', format: { fill: '#DCEEFF', font: { color: '#0B5FA5' } },
});
tracker.getRange(`C${dataStartRow}:C${dataEndRow}`).conditionalFormats.add('containsText', {
  text: 'تم التنفيذ', format: { fill: '#DDF3E4', font: { bold: true, color: '#1E7B41' } },
});
tracker.getRange(`C${dataStartRow}:C${dataEndRow}`).conditionalFormats.add('containsText', {
  text: 'مغلقة دون تعديل', format: { fill: '#E6E9ED', font: { color: '#52616B' } },
});
tracker.getRange(`D${dataStartRow}:D${dataEndRow}`).conditionalFormats.add('containsText', {
  text: 'لم ينفذ', format: { fill: '#FADBD8', font: { color: '#A93226' } },
});
tracker.getRange(`D${dataStartRow}:D${dataEndRow}`).conditionalFormats.add('containsText', {
  text: 'تم التعديل', format: { fill: '#DDF3E4', font: { bold: true, color: '#1E7B41' } },
});
tracker.getRange(`J${dataStartRow}:J${dataEndRow}`).conditionalFormats.add('containsText', {
  text: 'ساري', format: { fill: '#DDF3E4', font: { bold: true, color: '#1E7B41' } },
});
tracker.getRange(`J${dataStartRow}:J${dataEndRow}`).conditionalFormats.add('containsText', {
  text: 'قانوني', format: { fill: '#EEE6FA', font: { bold: true, color: '#6D3FA0' } },
});
tracker.getRange(`J${dataStartRow}:J${dataEndRow}`).conditionalFormats.add('containsText', {
  text: 'غير موجودة', format: { fill: '#FCE8C3', font: { color: '#9C5A00' } },
});
tracker.getRange(`K${dataStartRow}:K${dataEndRow}`).conditionalFormats.add('containsText', {
  text: 'صحيحة', format: { fill: '#DDF3E4', font: { bold: true, color: '#1E7B41' } },
});
tracker.getRange(`K${dataStartRow}:K${dataEndRow}`).conditionalFormats.add('containsText', {
  text: 'تحتاج تصحيح', format: { fill: '#FADBD8', font: { bold: true, color: '#A93226' } },
});
tracker.getRange(`K${dataStartRow}:K${dataEndRow}`).conditionalFormats.add('containsText', {
  text: 'غير محسومة', format: { fill: '#FCE8C3', font: { color: '#9C5A00' } },
});
tracker.getRange(`AE${dataStartRow}:AE${dataEndRow}`).conditionalFormats.add('cellIs', {
  operator: 'greaterThan', formula: 0,
  format: { fill: '#FADBD8', font: { bold: true, color: '#A93226' } },
});

tracker.freezePanes.freezeRows(5);
tracker.freezePanes.freezeColumns(8);

// Make the operational tracker discoverable from the original summary.
summarySheet.getRange('A3:E3').clear({ applyTo: 'contents' });
summarySheet.getRange('A3:B3').values = [['سجل المتابعة التشغيلية', null]];
summarySheet.getRange('B3').formulas = [[`=HYPERLINK("#'متابعة الحالات'!A1","فتح الحالات الـ${actionableCases.length} التي تحتاج تعديلاً")`]];
summarySheet.getRange('A3:B3').format = {
  fill: '#F6E7B0',
  font: { bold: true, color: '#704B00', name: 'Cairo' },
  horizontalAlignment: 'center',
};

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

for (let index = 0; index < workbook.worksheets.items.length; index += 1) {
  const sheet = workbook.worksheets.getItemAt(index);
  const preview = await workbook.render({
    sheetName: sheet.name,
    autoCrop: 'all',
    scale: sheet.name === 'متابعة الحالات' ? 0.8 : 1,
    format: 'png',
  });
  const safeName = `${String(index + 1).padStart(2, '0')}-${sheet.name.replace(/[\\/:*?"<>|]/g, '_')}.png`;
  await fs.writeFile(path.join(previewDir, safeName), new Uint8Array(await preview.arrayBuffer()));
}

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(JSON.stringify({ outputPath, previewDir, rowCount: dataRows.length }));
