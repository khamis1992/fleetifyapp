import fs from 'node:fs/promises';
import path from 'node:path';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const repoRoot = path.resolve('../..');
const inputPath = path.join(repoRoot, 'tmp', 'august-contract-reconciliation.json');
const legalAuditPath = path.join(repoRoot, 'tmp', 'legal-claim-components-audit.json');
const outputDir = path.join(repoRoot, 'outputs', 'contract-reconciliation-20260831');
const outputPath = path.join(outputDir, 'تسوية-عقود-ودفعات-أغسطس-2026.xlsx');
const previewDir = path.join(outputDir, 'previews');
const audit = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const legalAudit = JSON.parse(await fs.readFile(legalAuditPath, 'utf8'));

const LIVE_STATUSES = new Set(['active', 'under_legal_procedure']);
const overrides = new Map([
  ['722134', 'قرار ملكية مكتملة: عدم إنشاء عقد إيجار جديد وإبقاء المركبة خارج الخدمة لحين نقل الملكية.'],
  ['2773', 'قرار إداري أحدث: المركبة شارع 52؛ لا يُعاد إنشاء عقد من ملف أغسطس.'],
  ['848014', 'قرار إلغاء وإتاحة أحدث: إبقاء المركبة متاحة وعدم إعادة العقد الملغي.'],
  ['846485', 'عهدة موظف أسامة: إبقاء الحالة reserved_employee وعدم إنشاء عقد إيجار.'],
  ['847932', 'إيجار منتهي بالتمليك ومدفوع: إبقاء خارج الخدمة لحين نقل الملكية.'],
]);

const colors = {
  navy: '#123047',
  teal: '#0F766E',
  tealLight: '#CCFBF1',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  red: '#B91C1C',
  redLight: '#FEE2E2',
  green: '#15803D',
  greenLight: '#DCFCE7',
  gray: '#475569',
  grayLight: '#F1F5F9',
  white: '#FFFFFF',
  border: '#CBD5E1',
};

const arStatus = (status) => ({
  active: 'ساري',
  under_legal_procedure: 'إجراء قانوني',
  cancelled: 'ملغي',
  expired: 'منتهي',
}[status] || status || '');

const normalizeArabicName = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/[ىی]/g, 'ي')
  .replace(/[ؤ]/g, 'و')
  .replace(/[ئ]/g, 'ي')
  .replace(/[ة]/g, 'ه')
  .replace(/[گک]/g, 'ك')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const dateValue = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00Z`) : null;
const money = (value) => Number(value || 0);
const joinUnique = (values) => [...new Set(values.filter(Boolean))].join('، ');
const fullCustomerName = (customer) => [customer?.first_name_ar, customer?.last_name_ar].filter(Boolean).join(' ').trim()
  || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim();

const prepared = audit.auditRows.map((row) => {
  const matchingIds = new Set(row.matchingCustomers.map((customer) => customer.id));
  const live = row.contracts.filter((contract) => LIVE_STATUSES.has(contract.status));
  const same = live.filter((contract) => matchingIds.has(contract.customer_id));
  const different = live.filter((contract) => !matchingIds.has(contract.customer_id));
  const other = row.expectedCustomerContracts.filter((contract) =>
    LIVE_STATUSES.has(contract.status) && contract.vehicle_id !== row.vehicle?.id);
  const primary = same.find((contract) => contract.status === 'active')
    || same.find((contract) => contract.status === 'under_legal_procedure')
    || different.find((contract) => contract.status === 'active')
    || different.find((contract) => contract.status === 'under_legal_procedure')
    || null;
  let classification;
  if (overrides.has(row.source.plate)) classification = 'قرار إداري أحدث';
  else if (same.length && !different.length && !other.length) classification = 'مطابق';
  else if (same.length) classification = 'مطابق مع تعارض موازٍ';
  else if (different.length) classification = 'عقد باسم عميل آخر';
  else if (other.length) classification = 'عقد العميل على مركبة أخرى';
  else classification = 'لا يوجد عقد حي';

  let action;
  if (overrides.has(row.source.plate)) action = overrides.get(row.source.plate);
  else if (classification === 'مطابق') {
    action = primary?.status === 'active'
      ? 'إبقاء العقد ساريًا؛ لا تعديل على الهوية أو المركبة.'
      : 'إبقاء العقد قانونيًا مع توثيق استمرار/انتهاء حيازة المركبة ومراجعة المطالبة الدورية.';
  } else if (classification === 'مطابق مع تعارض موازٍ') {
    action = 'إبقاء العقد المطابق، وإغلاق عهدة العقد الموازي عند انتقال المركبة مع بقاء المطالبة القانونية مستقلة.';
  } else if (classification === 'عقد باسم عميل آخر') {
    action = row.source.sourceStartDate
      ? `إنهاء عهدة العقد السابق عند ${row.source.sourceStartDate}، احتساب المتأخر حتى القطع، ثم إنشاء/ربط عقد المستأجر الحالي بعد اعتماد الهوية.`
      : 'إيقاف اعتبار العقد المختلف حيازة حالية؛ يلزم إثبات تاريخ التسليم قبل الإلغاء وإنشاء عقد المستأجر الحالي.';
  } else if (classification === 'عقد العميل على مركبة أخرى') {
    action = 'مراجعة اللوحتين والملف الموقّع؛ فصل الحيازة الخاطئة ثم إنشاء/ربط العقد على لوحة أغسطس دون حذف المطالبة القديمة.';
  } else {
    action = 'استكمال هوية وملف موقّع وتاريخ التسليم، ثم إنشاء عقد جديد؛ لا يُنشأ عقد قانوني أو مطالبة آليًا من الاسم وحده.';
  }

  const confidence = overrides.has(row.source.plate)
    ? 'مؤكد بقرار أحدث'
    : classification === 'مطابق' && (primary?.matchedSignedDocumentCount || 0) > 0
      ? 'عالٍ'
      : classification === 'مطابق'
        ? 'متوسط'
        : 'يحتاج اعتماد';
  const openCases = primary?.legalCases?.filter((item) => !['closed', 'cancelled'].includes(String(item.case_status || '').toLowerCase())) || [];
  const caseValue = openCases.reduce((max, item) => Math.max(max, money(item.case_value)), 0);

  return { row, matchingIds, live, same, different, other, primary, classification, action, confidence, caseValue };
});

const reconciliationHeaders = [
  'اللوحة', 'مستأجر أغسطس', 'الاسم النظامي في الملف', 'بداية العقد حسب الملف', 'القسط الشهري',
  'التصنيف', 'العقود الحية على اللوحة', 'عملاء العقود الحية', 'حالات العقود', 'عقد العميل على مركبة أخرى',
  'المستحق حتى أغسطس', 'الرصيد المستقبلي', 'المخالفات غير المسددة', 'قيمة قضية قائمة', 'ملف موقّع مطابق',
  'المركبة مُعادة بالعقد المختار', 'الإجراء المقترح', 'الثقة', 'قرار الإدارة', 'ملاحظات المصدر', 'الهاتف', 'مطابقة العميل بالنظام',
];

const reconciliationRows = prepared.map((item) => {
  const { row, live, other, primary } = item;
  return [
    row.source.plate,
    row.source.expectedCustomer,
    row.source.canonicalCustomer,
    dateValue(row.source.sourceStartDate),
    money(row.source.sourceMonthlyAmount),
    item.classification,
    joinUnique(live.map((contract) => contract.contract_number)),
    joinUnique(live.map((contract) => contract.customerName)),
    joinUnique(live.map((contract) => arStatus(contract.status))),
    joinUnique(other.map((contract) => `${contract.contract_number} / ${contract.plate} / ${arStatus(contract.status)}`)),
    money(primary?.dueOpenRentBalanceAsOfAugust),
    money(primary?.futureOpenRentBalanceAfterAugust),
    money(primary?.unpaidPenaltyAmount),
    item.caseValue,
    (primary?.matchedSignedDocumentCount || 0) > 0 ? 'نعم' : 'لا',
    primary ? (primary.vehicle_returned ? 'نعم' : 'لا') : '',
    item.action,
    item.confidence,
    '',
    row.source.sourceNote || '',
    row.source.sourcePhone || '',
    row.matchingCustomers.length === 1 ? 'عميل واحد' : row.matchingCustomers.length > 1 ? 'سجلات متعددة' : 'غير موجود',
  ];
});

const financialHeaders = [
  'اللوحة', 'مستأجر أغسطس', 'بداية العقد الجديد', 'رقم العقد', 'عميل العقد', 'الحالة', 'المركبة مُعادة؟',
  'مطابق للمستأجر؟', 'بداية العقد', 'نهاية العقد', 'القسط', 'رصيد العقد المخزن', 'المستحق حتى أغسطس',
  'المستحق قبل بداية الجديد', 'الرصيد المستقبلي بعد أغسطس', 'مخالفات غير مسددة', 'مخالفات قبل بداية الجديد',
  'أساس الإيجار المقترح', 'أساس المخالفات المقترح', 'مطالبة مبدئية', 'قيمة القضية القائمة', 'فرق التضخيم',
  'ملف موقع', 'فجوة فوترة', 'الإجراء', 'ملاحظات',
];

const financialRows = [];
for (const item of prepared) {
  const hasConflict = item.classification === 'مطابق مع تعارض موازٍ' || item.classification === 'عقد باسم عميل آخر';
  for (const contract of item.live) {
    const isSame = item.matchingIds.has(contract.customer_id);
    if (contract.status !== 'under_legal_procedure' && !hasConflict) continue;
    const openCases = contract.legalCases.filter((legalCase) => !['closed', 'cancelled'].includes(String(legalCase.case_status || '').toLowerCase()));
    const caseValue = openCases.reduce((max, legalCase) => Math.max(max, money(legalCase.case_value)), 0);
    const cutoffApplies = !isSame && Boolean(item.row.source.sourceStartDate);
    const rentBasis = contract.status === 'active' && isSame
      ? 0
      : cutoffApplies
        ? money(contract.openRentBalanceBeforeSourceStart)
        : money(contract.dueOpenRentBalanceAsOfAugust);
    const penaltyBasis = contract.status === 'active' && isSame
      ? 0
      : cutoffApplies
        ? money(contract.unpaidPenaltyBeforeSourceStart)
        : money(contract.unpaidPenaltyAmount);
    const billingGap = contract.rentInvoiceCount === 0 && money(contract.balance_due) > 0;
    const action = isSame
      ? contract.status === 'active'
        ? 'العقد الحالي الصحيح؛ لا مطالبة قانونية عليه من هذه التسوية.'
        : 'مراجعة المطالبة حتى أغسطس وتوثيق استمرار الحيازة أو تاريخ انتهائها.'
      : item.row.source.sourceStartDate
        ? 'إلغاء/إنهاء عهدة القديم عند بداية الجديد، وإبقاء المطالبة حتى القطع فقط.'
        : 'تحديد تاريخ انتقال المركبة قبل اعتماد مبلغ المطالبة.';
    financialRows.push([
      item.row.source.plate,
      item.row.source.expectedCustomer,
      dateValue(item.row.source.sourceStartDate),
      contract.contract_number,
      contract.customerName,
      arStatus(contract.status),
      contract.vehicle_returned ? 'نعم' : 'لا',
      isSame ? 'نعم' : 'لا',
      dateValue(contract.start_date),
      dateValue(contract.end_date),
      money(contract.monthly_amount),
      money(contract.balance_due),
      money(contract.dueOpenRentBalanceAsOfAugust),
      money(contract.openRentBalanceBeforeSourceStart),
      money(contract.futureOpenRentBalanceAfterAugust),
      money(contract.unpaidPenaltyAmount),
      money(contract.unpaidPenaltyBeforeSourceStart),
      rentBasis,
      penaltyBasis,
      null,
      caseValue,
      null,
      (contract.matchedSignedDocumentCount || 0) > 0 ? 'نعم' : 'لا',
      billingGap ? 'نعم' : 'لا',
      action,
      joinUnique([
        billingGap ? 'لا توجد فواتير إيجار رغم وجود رصيد عقد.' : '',
        cutoffApplies ? 'المبلغ المقترح يستبعد ما بعد بداية المستأجر الجديد.' : '',
        openCases.length ? `قضية: ${joinUnique(openCases.map((legalCase) => legalCase.case_number))}` : '',
      ]),
    ]);
  }
}

const nameHeaders = [
  'اللوحة', 'اسم ملف أغسطس', 'الاسم النظامي في الملف', 'الاسم/الأسماء المطابقة بالنظام', 'الهاتف في أغسطس',
  'هاتف النظام', 'الرقم الشخصي/الجواز', 'عدد سجلات العملاء', 'نتيجة المطابقة', 'ملاحظة',
];
const nameRows = prepared.map(({ row }) => {
  const sourceName = row.source.expectedCustomer;
  const canonical = row.source.canonicalCustomer;
  const matchedNames = row.matchingCustomers.map(fullCustomerName);
  let matchResult;
  if (!row.matchingCustomers.length) matchResult = 'غير موجود';
  else if (row.matchingCustomers.length > 1) matchResult = 'سجلات عملاء متعددة';
  else if (normalizeArabicName(sourceName) === normalizeArabicName(matchedNames[0])) matchResult = 'مطابق بعد التطبيع';
  else matchResult = 'فرق إملائي/مطابقة هاتف';
  return [
    row.source.plate,
    sourceName,
    canonical,
    joinUnique(matchedNames),
    row.source.sourcePhone || '',
    joinUnique(row.matchingCustomers.map((customer) => customer.phone)),
    joinUnique(row.matchingCustomers.map((customer) => customer.national_id || customer.passport_number)),
    row.matchingCustomers.length,
    matchResult,
    matchResult === 'سجلات عملاء متعددة' ? 'لا يتم الدمج آليًا قبل فحص الهوية.' : '',
  ];
});

const legalClaimHeaders = [
  'رقم العقد', 'اللوحة', 'العميل', 'إجمالي المطالبة قبل التصحيح', 'فواتير الإيجار المستحقة',
  'فواتير مخالفات داخلة ضمن المستحق', 'المخالفات المضافة مستقلاً', 'الإجمالي بعد منع التكرار',
  'نتيجة التدقيق', 'الإجراء النظامي',
];
const legalClaimRows = legalAudit.breakdowns.map((item) => [
  item.contractNumber,
  item.plate,
  item.customerName,
  money(item.breakdown?.total),
  money(item.rentInvoiceDue),
  money(item.penaltyInvoiceDue),
  money(item.breakdown?.violations_amount),
  null,
  null,
  money(item.penaltyInvoiceDue) > 0 && money(item.breakdown?.violations_amount) > 0
    ? 'استبعاد فاتورة المخالفة من الإيجار والإبقاء على المخالفة المثبتة مرة واحدة.'
    : money(item.penaltyInvoiceDue) > 0
      ? 'فاتورة مخالفة مستبعدة من الإيجار؛ لا تدخل المطالبة قبل وجود دليل مخالفات.'
      : 'لا يظهر تكرار من فواتير المخالفات.',
]);

const workbook = Workbook.create();
const summary = workbook.worksheets.add('الملخص');
const reconciliation = workbook.worksheets.add('تسوية الـ89');
const financial = workbook.worksheets.add('التعارضات المالية');
const names = workbook.worksheets.add('ضبط الأسماء');
const legalClaims = workbook.worksheets.add('تدقيق المطالبات القانونية');
const controls = workbook.worksheets.add('المصادر والضوابط');
const checks = workbook.worksheets.add('الفحوصات');

for (const sheet of [summary, reconciliation, financial, names, legalClaims, controls, checks]) {
  sheet.showGridLines = false;
}

const setTitle = (sheet, title, subtitle, lastColumn) => {
  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.getRange('A1').values = [[title]];
  sheet.getRange(`A1:${lastColumn}1`).format = {
    fill: colors.navy,
    font: { bold: true, color: colors.white, size: 18, name: 'Arial' },
    horizontalAlignment: 'right',
    verticalAlignment: 'center',
  };
  sheet.getRange(`A1:${lastColumn}1`).format.rowHeight = 34;
  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.getRange('A2').values = [[subtitle]];
  sheet.getRange(`A2:${lastColumn}2`).format = {
    fill: colors.grayLight,
    font: { color: colors.gray, size: 10, name: 'Arial' },
    horizontalAlignment: 'right',
    verticalAlignment: 'center',
    wrapText: true,
  };
  sheet.getRange(`A2:${lastColumn}2`).format.rowHeight = 32;
};

const styleHeader = (range) => {
  range.format = {
    fill: colors.teal,
    font: { bold: true, color: colors.white, size: 10, name: 'Arial' },
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    wrapText: true,
    borders: { preset: 'outside', style: 'thin', color: colors.border },
  };
  range.format.rowHeight = 34;
};

const styleData = (range) => {
  range.format = {
    font: { color: '#0F172A', size: 9, name: 'Arial' },
    verticalAlignment: 'center',
    horizontalAlignment: 'right',
    wrapText: true,
    borders: {
      insideHorizontal: { style: 'thin', color: '#E2E8F0' },
      bottom: { style: 'thin', color: '#E2E8F0' },
    },
  };
};

setTitle(summary, 'تسوية عقود ودفعات أغسطس 2026', 'تقرير مراجعة قبل التنفيذ — ملف أغسطس مرجع للحيازة التشغيلية، والفواتير والدفعات والمخالفات مرجع للمطالبة المالية.', 'J');
summary.getRange('A4:B7').values = [
  ['البند', 'القيمة'],
  ['تاريخ التقرير', dateValue('2026-08-31')],
  ['ملف الحيازة الأحدث', audit.sourceFile],
  ['حالة قاعدة القطع', 'مقترحة وتحتاج اعتماد الإدارة قبل تنفيذ التعديلات'],
];
styleHeader(summary.getRange('A4:B4'));
styleData(summary.getRange('A5:B7'));
summary.getRange('B5').format.numberFormat = 'yyyy-mm-dd';
summary.getRange('A9:B15').values = [
  ['تصنيف التسوية', 'العدد'],
  ['مطابق', null],
  ['مطابق مع تعارض موازٍ', null],
  ['عقد باسم عميل آخر', null],
  ['عقد العميل على مركبة أخرى', null],
  ['لا يوجد عقد حي', null],
  ['قرار إداري أحدث', null],
];
styleHeader(summary.getRange('A9:B9'));
styleData(summary.getRange('A10:B15'));
for (let row = 10; row <= 15; row += 1) {
  summary.getRange(`B${row}`).formulas = [[`=COUNTIF('تسوية الـ89'!$F$5:$F$93,A${row})`]];
}
summary.getRange('A17:B18').values = [['إجمالي صفوف أغسطس', null], ['فحص الاتزان', null]];
summary.getRange('B17').formulas = [['=SUM(B10:B15)']];
summary.getRange('B18').formulas = [['=IF(B17=89,"متزن","غير متزن")']];
summary.getRange('A17:B18').format = {
  fill: colors.blueLight,
  font: { bold: true, color: colors.navy, name: 'Arial' },
  borders: { preset: 'outside', style: 'thin', color: colors.blue },
};
summary.getRange('D4:E9').values = [
  ['مؤشر مالي', 'القيمة (ر.ق)'],
  ['المطالبة المبدئية للحالات المعروضة', null],
  ['قيمة القضايا القائمة', null],
  ['فرق التضخيم المحتمل', null],
  ['الرصيد المستقبلي المفصول', null],
  ['حالات فجوة الفوترة', null],
];
styleHeader(summary.getRange('D4:E4'));
styleData(summary.getRange('D5:E9'));
const financialEndRow = financialRows.length + 4;
summary.getRange('E5').formulas = [[`=SUM('التعارضات المالية'!$T$5:$T$${financialEndRow})`]];
summary.getRange('E6').formulas = [[`=SUM('التعارضات المالية'!$U$5:$U$${financialEndRow})`]];
summary.getRange('E7').formulas = [[`=SUM('التعارضات المالية'!$V$5:$V$${financialEndRow})`]];
summary.getRange('E8').formulas = [[`=SUM('التعارضات المالية'!$O$5:$O$${financialEndRow})`]];
summary.getRange('E9').formulas = [[`=COUNTIF('التعارضات المالية'!$X$5:$X$${financialEndRow},"نعم")`]];
summary.getRange('E5:E8').format.numberFormat = '#,##0;[Red](#,##0);-';
summary.getRange('E9').format.numberFormat = '#,##0';
summary.getRange('D11:J15').values = [[
  'قاعدة العمل المقترحة', '', '', '', '', '', '',
], [
  'يصبح إلغاء/إنهاء عهدة العقد السابق نافذاً عند بداية العقد الجديد، وتتوقف فوترة القديم قبل هذا التاريخ. المطالبة المبدئية = الإيجار المستحق حتى القطع + المخالفات المثبتة خلال العهدة فقط، مع استبعاد الأقساط المستقبلية. لا تُنفذ القاعدة قبل اعتماد الإدارة ومراجعة الأدلة.', '', '', '', '', '', '',
], ['', '', '', '', '', '', ''], ['', '', '', '', '', '', ''], ['', '', '', '', '', '', '']];
summary.mergeCells('D11:J11');
summary.mergeCells('D12:J15');
summary.getRange('D11:J11').format = { fill: colors.amber, font: { bold: true, color: colors.white, name: 'Arial' }, horizontalAlignment: 'right' };
summary.getRange('D12:J15').format = { fill: colors.amberLight, font: { color: '#78350F', name: 'Arial' }, wrapText: true, horizontalAlignment: 'right', verticalAlignment: 'top', borders: { preset: 'outside', style: 'thin', color: colors.amber } };
summary.getRange('D17:E20').values = [
  ['تدقيق المطالبات القانونية', 'القيمة'],
  ['قضايا بها تكرار مؤكد', null],
  ['مبلغ مكرر مستبعد (ر.ق)', null],
  ['الإجمالي المصحح لهذه القضايا (ر.ق)', null],
];
styleHeader(summary.getRange('D17:E17'));
styleData(summary.getRange('D18:E20'));
summary.getRange('E18').formulas = [[`=COUNTIF('تدقيق المطالبات القانونية'!$I$5:$I$${legalClaimRows.length + 4},"تضخيم مؤكد")`]];
summary.getRange('E19').formulas = [[`=SUMIF('تدقيق المطالبات القانونية'!$I$5:$I$${legalClaimRows.length + 4},"تضخيم مؤكد",'تدقيق المطالبات القانونية'!$F$5:$F$${legalClaimRows.length + 4})`]];
summary.getRange('E20').formulas = [[`=SUMIF('تدقيق المطالبات القانونية'!$I$5:$I$${legalClaimRows.length + 4},"تضخيم مؤكد",'تدقيق المطالبات القانونية'!$H$5:$H$${legalClaimRows.length + 4})`]];
summary.getRange('E18').format.numberFormat = '#,##0';
summary.getRange('E19:E20').format.numberFormat = '#,##0;[Red](#,##0);-';
summary.getRange('A4:J18').format.font = { name: 'Arial' };

setTitle(reconciliation, 'تسوية مستأجري أغسطس — 89 مركبة', 'قرار الإدارة في العمود S قابل للتعبئة. التصنيف والإجراء مبنيان على بيانات الإنتاج بتاريخ 2026-08-31 ولا ينفذان أي تغيير.', 'V');
reconciliation.getRange('A4:V4').values = [reconciliationHeaders];
reconciliation.getRange(`A5:V${reconciliationRows.length + 4}`).values = reconciliationRows;
styleHeader(reconciliation.getRange('A4:V4'));
styleData(reconciliation.getRange(`A5:V${reconciliationRows.length + 4}`));
reconciliation.getRange(`D5:D${reconciliationRows.length + 4}`).format.numberFormat = 'yyyy-mm-dd';
reconciliation.getRange(`E5:E${reconciliationRows.length + 4}`).format.numberFormat = '#,##0';
reconciliation.getRange(`K5:N${reconciliationRows.length + 4}`).format.numberFormat = '#,##0;[Red](#,##0);-';
reconciliation.getRange(`S5:S${reconciliationRows.length + 4}`).dataValidation = {
  rule: { type: 'list', values: ['اعتماد', 'مراجعة', 'رفض', 'مؤجل'] },
};
reconciliation.getRange(`F5:F${reconciliationRows.length + 4}`).conditionalFormats.add('containsText', { text: 'مطابق', format: { fill: colors.greenLight, font: { color: colors.green } } });
reconciliation.getRange(`F5:F${reconciliationRows.length + 4}`).conditionalFormats.add('containsText', { text: 'عميل آخر', format: { fill: colors.redLight, font: { color: colors.red } } });
reconciliation.getRange(`F5:F${reconciliationRows.length + 4}`).conditionalFormats.add('containsText', { text: 'لا يوجد', format: { fill: colors.amberLight, font: { color: colors.amber } } });
reconciliation.tables.add(`A4:V${reconciliationRows.length + 4}`, true, 'AugustReconciliationTable').style = 'TableStyleMedium2';
reconciliation.freezePanes.freezeRows(4);
reconciliation.freezePanes.freezeColumns(2);

setTitle(financial, 'التعارضات والمطالبات المالية', 'المطالبة المبدئية للاستخدام في المراجعة فقط. العمود T = أساس الإيجار + أساس المخالفات، والعمود V يقيس زيادة القضية القائمة عن هذا الأساس.', 'Z');
financial.getRange('A4:Z4').values = [financialHeaders];
financial.getRange(`A5:Z${financialEndRow}`).values = financialRows;
for (let row = 5; row <= financialEndRow; row += 1) {
  financial.getRange(`T${row}`).formulas = [[`=R${row}+S${row}`]];
  financial.getRange(`V${row}`).formulas = [[`=MAX(0,U${row}-T${row})`]];
}
styleHeader(financial.getRange('A4:Z4'));
styleData(financial.getRange(`A5:Z${financialEndRow}`));
financial.getRange(`C5:C${financialEndRow}`).format.numberFormat = 'yyyy-mm-dd';
financial.getRange(`I5:J${financialEndRow}`).format.numberFormat = 'yyyy-mm-dd';
financial.getRange(`K5:V${financialEndRow}`).format.numberFormat = '#,##0;[Red](#,##0);-';
financial.getRange(`V5:V${financialEndRow}`).conditionalFormats.add('cellIs', { operator: 'greaterThan', formula: 0, format: { fill: colors.redLight, font: { bold: true, color: colors.red } } });
financial.getRange(`X5:X${financialEndRow}`).conditionalFormats.add('containsText', { text: 'نعم', format: { fill: colors.amberLight, font: { bold: true, color: colors.amber } } });
financial.tables.add(`A4:Z${financialEndRow}`, true, 'FinancialConflictTable').style = 'TableStyleMedium4';
financial.freezePanes.freezeRows(4);
financial.freezePanes.freezeColumns(2);

setTitle(names, 'ضبط أسماء العملاء', 'التطبيع يعالج فروق الألف والهمزة والياء والتشكيل فقط. لا يتم دمج سجلات العملاء تلقائياً دون هوية أو هاتف مؤكد.', 'J');
names.getRange('A4:J4').values = [nameHeaders];
names.getRange(`A5:J${nameRows.length + 4}`).values = nameRows;
styleHeader(names.getRange('A4:J4'));
styleData(names.getRange(`A5:J${nameRows.length + 4}`));
names.getRange(`H5:H${nameRows.length + 4}`).format.numberFormat = '#,##0';
names.getRange(`I5:I${nameRows.length + 4}`).conditionalFormats.add('containsText', { text: 'غير موجود', format: { fill: colors.redLight, font: { color: colors.red } } });
names.getRange(`I5:I${nameRows.length + 4}`).conditionalFormats.add('containsText', { text: 'متعددة', format: { fill: colors.amberLight, font: { color: colors.amber } } });
names.tables.add(`A4:J${nameRows.length + 4}`, true, 'CustomerNameControlTable').style = 'TableStyleMedium2';
names.freezePanes.freezeRows(4);
names.freezePanes.freezeColumns(2);

const legalClaimEndRow = legalClaimRows.length + 4;
setTitle(legalClaims, 'تدقيق مكونات المطالبات القانونية', 'الورقة تفصل الإيجار عن فواتير المخالفات. عند وجود إثبات مخالفات، تُضاف المخالفة مرة واحدة ولا تبقى فاتورتها داخل الإيجار المتأخر.', 'J');
legalClaims.getRange('A4:J4').values = [legalClaimHeaders];
legalClaims.getRange(`A5:J${legalClaimEndRow}`).values = legalClaimRows;
for (let row = 5; row <= legalClaimEndRow; row += 1) {
  legalClaims.getRange(`H${row}`).formulas = [[`=MAX(0,D${row}-F${row})`]];
  legalClaims.getRange(`I${row}`).formulas = [[`=IF(AND(F${row}>0,G${row}>0),"تضخيم مؤكد",IF(F${row}>0,"مستبعد لغياب الدليل","لا يوجد تكرار"))`]];
}
styleHeader(legalClaims.getRange('A4:J4'));
styleData(legalClaims.getRange(`A5:J${legalClaimEndRow}`));
legalClaims.getRange(`D5:H${legalClaimEndRow}`).format.numberFormat = '#,##0;[Red](#,##0);-';
legalClaims.getRange(`I5:I${legalClaimEndRow}`).conditionalFormats.add('containsText', { text: 'تضخيم مؤكد', format: { fill: colors.redLight, font: { bold: true, color: colors.red } } });
legalClaims.getRange(`I5:I${legalClaimEndRow}`).conditionalFormats.add('containsText', { text: 'مستبعد', format: { fill: colors.amberLight, font: { color: colors.amber } } });
legalClaims.getRange(`I5:I${legalClaimEndRow}`).conditionalFormats.add('containsText', { text: 'لا يوجد', format: { fill: colors.greenLight, font: { color: colors.green } } });
legalClaims.tables.add(`A4:J${legalClaimEndRow}`, true, 'LegalClaimComponentAuditTable').style = 'TableStyleMedium4';
legalClaims.freezePanes.freezeRows(4);
legalClaims.freezePanes.freezeColumns(2);

setTitle(controls, 'المصادر والضوابط', 'سجل مصادر التقرير وتعريفات الاستخدام. لا يُعد ملف أغسطس دليلاً على السداد ولا عقداً موقعاً.', 'I');
const sourceRows = [
  ['المصدر', 'النوع', 'الفترة/التاريخ', 'الغرض', 'الأولوية', 'المالك', 'الحالة', 'مرجع', 'ملاحظات'],
  [audit.sourceFile, 'Excel / ملف تشغيلي', dateValue('2026-08-31'), 'الحيازة التشغيلية وأسماء المستأجرين واللوحات', 'الأحدث تشغيلياً', 'الإدارة', 'مستخدم', 'ورقة المستأجرون', 'لا يثبت السداد أو صحة المطالبة وحده.'],
  ['Supabase / contracts', 'قاعدة بيانات إنتاج', dateValue('2026-08-31'), 'حالة العقد وربط العميل والمركبة', 'مصدر النظام', 'Fleetify', 'قراءة فقط', '354 عقداً مقروءاً', 'يشمل حالات سارية وقانونية وملغاة ومنتهية.'],
  ['Supabase / payments', 'قاعدة بيانات إنتاج', dateValue('2026-08-31'), 'الدفعات المكتملة المرتبطة بالعقود', 'مالي', 'Fleetify', 'قراءة فقط', '3,056 دفعة مرتبطة', 'لا تُعتمد دفعة غير مكتملة.'],
  ['Supabase / invoices', 'قاعدة بيانات إنتاج', dateValue('2026-08-31'), 'الاستحقاق حتى أغسطس وفصل المستقبل', 'مالي', 'Fleetify', 'قراءة فقط', '6,527 فاتورة مرتبطة', 'الأقساط بعد 2026-08-01 مستقبلية وليست متأخرة.'],
  ['Supabase / penalties', 'قاعدة بيانات إنتاج', dateValue('2026-08-31'), 'المخالفات المرتبطة بالعقد وفترة العهدة', 'قانوني/مالي', 'Fleetify', 'قراءة فقط', '1,482 مخالفة مرتبطة', 'تحتاج إثبات التاريخ والعهدة قبل الدعوى.'],
  ['عقود-ال79-نفس-المركبة.xlsx', 'Excel / قرار مراجعة', dateValue('2026-08-30'), 'اعتماد أسماء وارتباطات تمت مراجعتها', 'مرجع مساعد', 'الإدارة', 'مستخدم', '78 اعتماد + 1 رفض', 'يظل تاريخ العقد والفوترة بحاجة لمطابقة الإنتاج.'],
  ['معتمدون-ملفات-موقعة.xlsx', 'Excel / أدلة', dateValue('2026-08-30'), 'مطابقة الاسم والهوية واللوحة في الملفات الموقعة', 'دليل تعاقدي مساعد', 'الإدارة', 'مستخدم', 'المعتمدون والعقود السابقة', 'الملف الموقع أقوى من التشابه الاسمي.'],
];
controls.getRange(`A4:I${sourceRows.length + 3}`).values = sourceRows;
styleHeader(controls.getRange('A4:I4'));
styleData(controls.getRange(`A5:I${sourceRows.length + 3}`));
controls.getRange(`C5:C${sourceRows.length + 3}`).format.numberFormat = 'yyyy-mm-dd';
const policyStart = sourceRows.length + 6;
controls.getRange(`A${policyStart}:D${policyStart + 5}`).values = [
  ['الضابط', 'التعريف', 'حالة الاعتماد', 'أثره'],
  ['مرجع الحيازة', 'ملف أغسطس يحدد من كانت المركبة بعهدته تشغيلياً.', 'معتمد كمصدر أحدث', 'يحدد التعارض ولا ينشئ عقداً وحده.'],
  ['قطع العقد القديم', 'الإلغاء/إنهاء العهدة نافذ عند بداية العقد الجديد، والفوترة القديمة تتوقف قبلها.', 'بانتظار اعتماد الإدارة', 'يمنع تداخل الإيجار على مركبة واحدة.'],
  ['المطالبة القانونية', 'إيجار مستحق حتى القطع + مخالفات مثبتة خلال العهدة.', 'بانتظار اعتماد الإدارة', 'يستبعد الأقساط المستقبلية.'],
  ['تطبيع الاسم', 'توحيد أخطاء الهمزات والياء والتشكيل مع إبقاء الهوية كسجل حاكم.', 'مقترح', 'يقلل التكرار دون دمج خاطئ.'],
  ['الملف الموقّع', 'هوية + اسم + لوحة/مركبة هي الدليل الأقوى عند التعارض.', 'مطلوب للحالات المتعارضة', 'يمنع تحويل مطالبة لشخص غير صحيح.'],
];
styleHeader(controls.getRange(`A${policyStart}:D${policyStart}`));
styleData(controls.getRange(`A${policyStart + 1}:D${policyStart + 5}`));
controls.getRange(`C${policyStart + 1}:C${policyStart + 5}`).conditionalFormats.add('containsText', { text: 'بانتظار', format: { fill: colors.amberLight, font: { color: colors.amber } } });

setTitle(checks, 'فحوص اتزان التقرير', 'حالة REVIEW تعني وجود حالات بيانات أو سياسة تنتظر قراراً؛ لا تعني خطأ في صيغ الملف.', 'E');
checks.getRange('A4:E4').values = [['الفحص', 'النتيجة', 'الحالة', 'مكان الإصلاح', 'ملاحظة']];
checks.getRange('A5:E11').values = [
  ['عدد صفوف أغسطس = 89', null, null, 'تسوية الـ89', 'يجب أن يطابق ورقة المستأجرون.'],
  ['مجموع التصنيفات = 89', null, null, 'الملخص', 'فحص عدم سقوط أي مركبة.'],
  ['حالات بلا عميل في النظام', null, null, 'ضبط الأسماء', 'تحتاج إنشاء/ربط عميل بعد الهوية.'],
  ['حالات عقد باسم عميل آخر', null, null, 'تسوية الـ89', 'تحتاج قطع عهدة ومراجعة قانونية.'],
  ['حالات فجوة فوترة', null, null, 'التعارضات المالية', 'لا تعتمد قيمة الرصيد الكامل كمتأخر.'],
  ['قضايا أعلى من الأساس المقترح', null, null, 'التعارضات المالية', 'فرق مبدئي يحتاج مراجعة محاسب/قانوني.'],
  ['اعتماد قاعدة القطع', null, 'REVIEW', 'المصادر والضوابط', 'لا تنفيذ قبل موافقة الإدارة.'],
];
checks.getRange('B5').formulas = [[`=COUNTA('تسوية الـ89'!$A$5:$A$93)`]];
checks.getRange('C5').formulas = [['=IF(B5=89,"PASS","FAIL")']];
checks.getRange('B6').formulas = [['=SUM(\'الملخص\'!$B$10:$B$15)']];
checks.getRange('C6').formulas = [['=IF(B6=89,"PASS","FAIL")']];
checks.getRange('B7').formulas = [[`=COUNTIF('ضبط الأسماء'!$I$5:$I$93,"غير موجود")`]];
checks.getRange('C7').formulas = [['=IF(B7=0,"PASS","REVIEW")']];
checks.getRange('B8').formulas = [[`=COUNTIF('تسوية الـ89'!$F$5:$F$93,"عقد باسم عميل آخر")`]];
checks.getRange('C8').formulas = [['=IF(B8=0,"PASS","REVIEW")']];
checks.getRange('B9').formulas = [[`=COUNTIF('التعارضات المالية'!$X$5:$X$${financialEndRow},"نعم")`]];
checks.getRange('C9').formulas = [['=IF(B9=0,"PASS","REVIEW")']];
checks.getRange('B10').formulas = [[`=COUNTIF('التعارضات المالية'!$V$5:$V$${financialEndRow},">0")`]];
checks.getRange('C10').formulas = [['=IF(B10=0,"PASS","REVIEW")']];
checks.getRange('B11').values = [['بانتظار']];
styleHeader(checks.getRange('A4:E4'));
styleData(checks.getRange('A5:E11'));
checks.getRange('B5:B10').format.numberFormat = '#,##0';
checks.getRange('C5:C11').conditionalFormats.add('containsText', { text: 'PASS', format: { fill: colors.greenLight, font: { bold: true, color: colors.green } } });
checks.getRange('C5:C11').conditionalFormats.add('containsText', { text: 'REVIEW', format: { fill: colors.amberLight, font: { bold: true, color: colors.amber } } });
checks.getRange('C5:C11').conditionalFormats.add('containsText', { text: 'FAIL', format: { fill: colors.redLight, font: { bold: true, color: colors.red } } });
checks.mergeCells('A13:E13');
checks.getRange('A13').values = [['MODEL STATUS: REVIEW — التقرير متزن، لكن تنفيذ قاعدة القطع والمطالبات ينتظر اعتماد الإدارة ومراجعة الأدلة للحالات المتعارضة.']];
checks.getRange('A13:E13').format = { fill: colors.amberLight, font: { bold: true, color: '#78350F', name: 'Arial' }, wrapText: true, horizontalAlignment: 'right', borders: { preset: 'outside', style: 'thin', color: colors.amber } };

// Formula-backed classification chart.
const chart = summary.charts.add('bar', summary.getRange('A9:B15'));
chart.title = 'توزيع حالات تسوية مستأجري أغسطس (عدد المركبات)';
chart.hasLegend = false;
chart.xAxis = { axisType: 'textAxis', textStyle: { fontSize: 9 } };
chart.yAxis = { numberFormatCode: '#,##0' };
chart.setPosition('D23', 'J39');

// Practical widths and row sizing.
summary.getRange('A:A').format.columnWidth = 30;
summary.getRange('B:B').format.columnWidth = 24;
summary.getRange('C:C').format.columnWidth = 3;
summary.getRange('D:D').format.columnWidth = 31;
summary.getRange('E:E').format.columnWidth = 18;
summary.getRange('F:J').format.columnWidth = 13;

const reconciliationWidths = [12, 28, 28, 14, 13, 24, 28, 30, 20, 32, 15, 15, 16, 15, 14, 17, 52, 18, 15, 35, 15, 18];
reconciliationWidths.forEach((width, index) => reconciliation.getRangeByIndexes(0, index, reconciliationRows.length + 4, 1).format.columnWidth = width);
reconciliation.getRange(`A5:V${reconciliationRows.length + 4}`).format.rowHeight = 38;

const financialWidths = [12, 28, 14, 20, 28, 16, 15, 16, 14, 14, 12, 16, 16, 18, 18, 18, 20, 18, 20, 16, 16, 16, 12, 14, 42, 42];
financialWidths.forEach((width, index) => financial.getRangeByIndexes(0, index, financialEndRow, 1).format.columnWidth = width);
financial.getRange(`A5:Z${financialEndRow}`).format.rowHeight = 38;

const nameWidths = [12, 30, 30, 34, 16, 18, 22, 14, 22, 34];
nameWidths.forEach((width, index) => names.getRangeByIndexes(0, index, nameRows.length + 4, 1).format.columnWidth = width);
names.getRange(`A5:J${nameRows.length + 4}`).format.rowHeight = 32;

const legalClaimWidths = [22, 12, 30, 20, 18, 22, 20, 20, 22, 54];
legalClaimWidths.forEach((width, index) => legalClaims.getRangeByIndexes(0, index, legalClaimEndRow, 1).format.columnWidth = width);
legalClaims.getRange(`A5:J${legalClaimEndRow}`).format.rowHeight = 38;

const controlWidths = [34, 22, 14, 36, 20, 16, 18, 28, 46];
controlWidths.forEach((width, index) => controls.getRangeByIndexes(0, index, policyStart + 5, 1).format.columnWidth = width);
controls.getRange(`A5:I${policyStart + 5}`).format.rowHeight = 38;

const checkWidths = [34, 16, 14, 28, 48];
checkWidths.forEach((width, index) => checks.getRangeByIndexes(0, index, 13, 1).format.columnWidth = width);
checks.getRange('A5:E11').format.rowHeight = 32;

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const summaryInspect = await workbook.inspect({
  kind: 'table',
  range: 'الملخص!A1:J18',
  include: 'values,formulas',
  tableMaxRows: 20,
  tableMaxCols: 12,
});
console.log(summaryInspect.ndjson);
const reconciliationInspect = await workbook.inspect({
  kind: 'table',
  range: 'تسوية الـ89!A4:V9',
  include: 'values,formulas',
  tableMaxRows: 8,
  tableMaxCols: 22,
});
console.log(reconciliationInspect.ndjson);
const errorScan = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 300 },
  summary: 'final formula error scan',
});
console.log(errorScan.ndjson);

for (const [sheetName, range] of [
  ['الملخص', 'A1:J39'],
  ['تسوية الـ89', 'A1:V12'],
  ['التعارضات المالية', 'A1:Z12'],
  ['ضبط الأسماء', 'A1:J12'],
  ['تدقيق المطالبات القانونية', 'A1:J14'],
  ['المصادر والضوابط', `A1:I${policyStart + 5}`],
  ['الفحوصات', 'A1:E13'],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: 'png' });
  const safeName = sheetName.replace(/[^\p{L}\p{N}]+/gu, '-');
  await fs.writeFile(path.join(previewDir, `${safeName}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(JSON.stringify({ outputPath, previewDir, reconciliationRows: reconciliationRows.length, financialRows: financialRows.length, nameRows: nameRows.length, legalClaimRows: legalClaimRows.length }, null, 2));
