import * as XLSX from 'xlsx';

/**
 * Parses the company financial worksheet (أوراق عمل مالية للشركة) used to
 * gather opening balances from paper receipts and vehicle/debt registers.
 * Pure parsing + line building; account mapping and posting live in the page.
 */

export interface OpeningCompanyData {
  cutoffDate: string | null;
  cashOnHand: number;
  bankBalances: number;
  estimatedReceivables: number;
  registeredCapital: number;
  otherAssets: number;
}

export interface OpeningVehicleRow {
  index: number;
  plate: string;
  model: string;
  purchaseCost: number | null;
  marketValue: number | null;
}

export interface OpeningLiabilityRow {
  index: number;
  creditor: string;
  nature: string;
  originalAmount: number;
  paidAmount: number;
  remaining: number;
  notes: string;
}

export interface OpeningReceiptRow {
  index: number;
  receiptDate: string | null;
  receiptNumber: string;
  tenant: string;
  plate: string;
  coveredMonth: string;
  amount: number;
  method: string;
}

export interface OpeningBalancesWorkbook {
  /** Non-fatal data-quality findings the page must surface before posting. */
  warnings: string[];
  company: OpeningCompanyData;
  vehicles: OpeningVehicleRow[];
  vehicleCostTotal: number;
  vehicleMarketTotal: number;
  vehiclesMissingCost: number;
  liabilities: OpeningLiabilityRow[];
  liabilityTotal: number;
  receipts: OpeningReceiptRow[];
  receiptTotal: number;
}

const num = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[,\s\u00A0]/g, '').replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const optionalNum = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = num(value);
  return parsed === 0 ? null : parsed;
};

const text = (value: unknown): string => (value === null || value === undefined ? '' : String(value).trim());

const excelDate = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && value > 20000 && value < 60000) {
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + value * 86400000).toISOString().slice(0, 10);
  }
  const raw = text(value);
  const direct = Date.parse(raw.length <= 10 ? `${raw}T00:00:00Z` : raw);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString().slice(0, 10);
  const match = raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  return null;
};

/** Read a sheet by any of its possible names, tolerating slight spelling differences. */
const sheetByName = (workbook: XLSX.WorkBook, candidates: string[]): XLSX.WorkSheet | null => {
  for (const name of workbook.SheetNames) {
    const normalized = name.replace(/\s+/g, '');
    if (candidates.some(candidate => normalized === candidate.replace(/\s+/g, ''))) {
      return workbook.Sheets[name];
    }
  }
  return null;
};

/** Locate a row cell by scanning the first rows for a label keyword, then taking the next non-empty cell. */
const findLabeledNumber = (rows: unknown[][], keywords: string[]): number => {
  for (const row of rows) {
    for (let i = 0; i < row.length; i += 1) {
      const cell = text(row[i]);
      if (cell && keywords.some(keyword => cell.includes(keyword))) {
        for (let j = i + 1; j < Math.min(row.length, i + 4); j += 1) {
          const value = row[j];
          if (value !== null && value !== undefined && value !== '') return num(value);
        }
      }
    }
  }
  return 0;
};

const sheetRows = (sheet: XLSX.WorkSheet | null): unknown[][] =>
  sheet ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: null }) : [];

const headerRowIndex = (rows: unknown[][], keywords: string[]): number => {
  // Edited workbooks can reorder internal rows; scan generously for the true header.
  for (let i = 0; i < Math.min(rows.length, 30); i += 1) {
    const joined = rows[i].map(cell => text(cell)).join('|');
    if (keywords.every(keyword => joined.includes(keyword))) return i;
  }
  return -1;
};

const columnOf = (headerRow: unknown[], keyword: string): number =>
  headerRow.findIndex(cell => text(cell).includes(keyword));

export function parseOpeningBalancesWorkbook(data: ArrayBuffer): OpeningBalancesWorkbook {
  // SheetJS 'array' mode expects a byte array; a raw ArrayBuffer misreads in some builds.
  const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });

  // --- Company sheet: labeled scalar fields ---
  const companySheet = sheetByName(workbook, ['بيانات الشركة']);
  const vehicleSheet = sheetByName(workbook, ['الأصول — السيارات', 'الأصول - السيارات', 'الاصول - السيارات', 'الأصول']);
  const liabilitySheet = sheetByName(workbook, ['الخصوم والديون', 'الخصوم']);
  const receiptSheet = sheetByName(workbook, ['سجل الإيصالات']);
  if (!companySheet && !vehicleSheet && !liabilitySheet && !receiptSheet) {
    // Never guess on an unrecognized workbook — a financial import must fail loudly.
    throw new Error('OPENING_WORKBOOK_NOT_RECOGNIZED');
  }
  const warnings: string[] = [];
  const requireHeader = (sheet: XLSX.WorkSheet | null, label: string, keywords: string[], rowsOut: unknown[][]) => {
    const rows = sheetRows(sheet);
    rowsOut.push(...rows);
    if (sheet && headerRowIndex(rows, keywords) === -1) {
      warnings.push(`تعذر العثور على صف العناوين في ورقة «${label}» — راجع الملف قبل الاعتماد على نتائجها.`);
    }
  };
  const companyRows: unknown[][] = [];
  requireHeader(companySheet, 'بيانات الشركة', ['البيان'], companyRows);
  const company: OpeningCompanyData = {
    cutoffDate:
      excelDate(findLabeledCell(companyRows, ['تاريخ القطع'])) ??
      null,
    cashOnHand: findLabeledNumber(companyRows, ['النقد في الصندوق']),
    bankBalances: findLabeledNumber(companyRows, ['أرصدة البنوك', 'ارصدة البنوك']),
    estimatedReceivables: findLabeledNumber(companyRows, ['ذمم عملاء', 'ذمم العملاء']),
    registeredCapital: findLabeledNumber(companyRows, ['رأس المال', 'راس المال']),
    otherAssets: findLabeledNumber(companyRows, ['أصول أخرى', 'اصول أخرى']),
  };

  // --- Vehicles sheet ---
  const vehicleRows: unknown[][] = [];
  requireHeader(vehicleSheet, 'الأصول — السيارات', ['اللوحة'], vehicleRows);
  const vehicleHeaderIdx = headerRowIndex(vehicleRows, ['اللوحة']);
  const vehicleHeader = vehicleHeaderIdx >= 0 ? vehicleRows[vehicleHeaderIdx] : [];
  const plateCol = columnOf(vehicleHeader, 'اللوحة');
  const modelCol = columnOf(vehicleHeader, 'الموديل');
  const costCol = columnOf(vehicleHeader, 'تكلفة الشراء');
  const marketCol = columnOf(vehicleHeader, 'القيمة السوقية');
  const vehicles: OpeningVehicleRow[] = [];
  if (vehicleHeaderIdx >= 0 && plateCol >= 0) {
    vehicleRows.slice(vehicleHeaderIdx + 1).forEach(row => {
      const plate = text(row[plateCol]);
      if (!plate) return;
      vehicles.push({
        index: vehicles.length + 1,
        plate,
        model: modelCol >= 0 ? text(row[modelCol]) : '',
        purchaseCost: costCol >= 0 ? optionalNum(row[costCol]) : null,
        marketValue: marketCol >= 0 ? optionalNum(row[marketCol]) : null,
      });
    });
  }
  const vehicleCostTotal = vehicles.reduce((sum, v) => sum + (v.purchaseCost ?? 0), 0);
  const vehicleMarketTotal = vehicles.reduce((sum, v) => sum + (v.marketValue ?? 0), 0);
  const vehiclesMissingCost = vehicles.filter(v => v.purchaseCost === null).length;

  // --- Liabilities sheet ---
  const liabilityRows: unknown[][] = [];
  requireHeader(liabilitySheet, 'الخصوم والديون', ['الدائن'], liabilityRows);
  const liabilityHeaderIdx = headerRowIndex(liabilityRows, ['الدائن']);
  const liabilityHeader = liabilityHeaderIdx >= 0 ? liabilityRows[liabilityHeaderIdx] : [];
  const creditorCol = columnOf(liabilityHeader, 'الدائن');
  const natureCol = columnOf(liabilityHeader, 'طبيعة الدين');
  const originalCol = columnOf(liabilityHeader, 'أصل الدين');
  const paidCol = columnOf(liabilityHeader, 'ما سُدد');
  const remainingCol = columnOf(liabilityHeader, 'المتبقي');
  const liabilityNotesCol = columnOf(liabilityHeader, 'ملاحظات');
  const liabilities: OpeningLiabilityRow[] = [];
  if (liabilityHeaderIdx >= 0 && creditorCol >= 0) {
    liabilityRows.slice(liabilityHeaderIdx + 1).forEach(row => {
      const creditor = text(row[creditorCol]);
      const original = originalCol >= 0 ? num(row[originalCol]) : 0;
      const paid = paidCol >= 0 ? num(row[paidCol]) : 0;
      if (!creditor || (original === 0 && paid === 0)) return;
      const remainingFromSheet = remainingCol >= 0 ? num(row[remainingCol]) : 0;
      liabilities.push({
        index: liabilities.length + 1,
        creditor,
        nature: natureCol >= 0 ? text(row[natureCol]) : '',
        originalAmount: original,
        paidAmount: paid,
        remaining: remainingFromSheet > 0 ? remainingFromSheet : Math.max(0, original - paid),
        notes: liabilityNotesCol >= 0 ? text(row[liabilityNotesCol]) : '',
      });
    });
  }
  const liabilityTotal = liabilities.reduce((sum, row) => sum + row.remaining, 0);

  // --- Receipts register (summary only; ingestion happens via the payments import) ---
  const receiptRows: unknown[][] = [];
  requireHeader(receiptSheet, 'سجل الإيصالات', ['رقم الإيصال', 'المبلغ'], receiptRows);
  const receiptHeaderIdx = headerRowIndex(receiptRows, ['رقم الإيصال']);
  const receiptHeader = receiptHeaderIdx >= 0 ? receiptRows[receiptHeaderIdx] : [];
  const rDateCol = columnOf(receiptHeader, 'تاريخ الإيصال');
  const rNumberCol = columnOf(receiptHeader, 'رقم الإيصال');
  const rTenantCol = columnOf(receiptHeader, 'اسم المستأجر');
  const rPlateCol = columnOf(receiptHeader, 'رقم السيارة');
  const rMonthCol = columnOf(receiptHeader, 'الشهر المغطى');
  const rAmountCol = columnOf(receiptHeader, 'المبلغ');
  const rMethodCol = columnOf(receiptHeader, 'طريقة القبض');
  const receipts: OpeningReceiptRow[] = [];
  if (receiptHeaderIdx >= 0 && rAmountCol >= 0) {
    receiptRows.slice(receiptHeaderIdx + 1).forEach(row => {
      const amount = num(row[rAmountCol]);
      const tenant = rTenantCol >= 0 ? text(row[rTenantCol]) : '';
      if (amount <= 0 || tenant.includes('مثال') || tenant.includes('احذف')) return;
      receipts.push({
        index: receipts.length + 1,
        receiptDate: rDateCol >= 0 ? excelDate(row[rDateCol]) : null,
        receiptNumber: rNumberCol >= 0 ? text(row[rNumberCol]) : '',
        tenant,
        plate: rPlateCol >= 0 ? text(row[rPlateCol]) : '',
        coveredMonth: rMonthCol >= 0 ? text(row[rMonthCol]) : '',
        amount,
        method: rMethodCol >= 0 ? text(row[rMethodCol]) : '',
      });
    });
  }
  const receiptTotal = receipts.reduce((sum, row) => sum + row.amount, 0);

  return {
    warnings,
    company,
    vehicles,
    vehicleCostTotal,
    vehicleMarketTotal,
    vehiclesMissingCost,
    liabilities,
    liabilityTotal,
    receipts,
    receiptTotal,
  };
}

/** Read the raw cell following a label (dates arrive as strings). */
function findLabeledCell(rows: unknown[][], keywords: string[]): unknown {
  for (const row of rows) {
    for (let i = 0; i < row.length; i += 1) {
      const cell = text(row[i]);
      if (cell && keywords.some(keyword => cell.includes(keyword))) {
        for (let j = i + 1; j < Math.min(row.length, i + 4); j += 1) {
          const value = row[j];
          if (value !== null && value !== undefined && value !== '') return value;
        }
      }
    }
  }
  return null;
}

export type OpeningLineSide = 'debit' | 'credit';

export interface OpeningLineDraft {
  key: string;
  label: string;
  detail: string;
  amount: number;
  side: OpeningLineSide;
  /** Keyword hints used to pre-select a chart-of-accounts account on the page. */
  accountHints: string[];
  editable: boolean;
}

export interface OpeningEntryDraft {
  lines: OpeningLineDraft[];
  debits: number;
  credits: number;
  balance: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Build a balanced opening-entry draft: assets debit, liabilities credit,
 * and an auto-computed opening equity line as the balancing figure.
 * Vehicle valuation prefers purchase cost, falling back to market estimate.
 */
export function buildOpeningEntryDraft(workbook: OpeningBalancesWorkbook): OpeningEntryDraft {
  const { company, vehicles } = workbook;
  const vehicleValuation = workbook.vehicleCostTotal > 0 ? workbook.vehicleCostTotal : workbook.vehicleMarketTotal;
  const valuationNote = workbook.vehicleCostTotal > 0
    ? `${vehicles.length} مركبة بتكلفة الشراء${workbook.vehiclesMissingCost ? ` (${workbook.vehiclesMissingCost} بلا تكلفة مسجلة)` : ''}`
    : `${vehicles.length} مركبة بالقيمة السوقية التقديرية`;

  const candidateLines: OpeningLineDraft[] = [
    { key: 'cash', label: 'النقد في الصندوق', detail: 'من ورقة بيانات الشركة', amount: company.cashOnHand, side: 'debit', accountHints: ['نقد', 'صندوق', 'cash'], editable: true },
    { key: 'banks', label: 'أرصدة البنوك', detail: 'من كشوف البنوك', amount: company.bankBalances, side: 'debit', accountHints: ['بنك', 'bank'], editable: true },
    { key: 'receivables', label: 'ذمم عملاء (تقديري)', detail: 'إيجارات غير محصلة حتى تاريخ القطع', amount: company.estimatedReceivables, side: 'debit', accountHints: ['ذمم', 'مدين', 'receivable', 'عملاء'], editable: true },
    { key: 'vehicles', label: 'سيارات (أصول ثابتة)', detail: valuationNote, amount: vehicleValuation, side: 'debit', accountHints: ['سيارات', 'مركبات', 'أصول ثابتة', 'vehicle', 'asset'], editable: true },
    { key: 'other-assets', label: 'أصول أخرى', detail: 'أثاث، تأمينات، عهد', amount: company.otherAssets, side: 'debit', accountHints: ['أثاث', 'أصول', 'asset'], editable: true },
    ...workbook.liabilities.map(liability => ({
      key: `liability-${liability.index}`,
      label: `التزام: ${liability.creditor}`,
      detail: [liability.nature, liability.notes].filter(Boolean).join(' — ') || `متبقي من ${liability.originalAmount} بعد سداد ${liability.paidAmount}`,
      amount: liability.remaining,
      side: 'credit' as OpeningLineSide,
      accountHints: ['دائن', 'قرض', 'التزام', 'payable', 'loan', liability.creditor],
      editable: true,
    })),
    { key: 'capital', label: 'رأس المال المسجل', detail: 'من عقد التأسيس إن وُجد', amount: company.registeredCapital, side: 'credit', accountHints: ['رأس المال', 'راس المال', 'capital'], editable: true },
  ];
  const lines: OpeningLineDraft[] = candidateLines.filter(line => line.amount > 0);

  const debits = round2(lines.filter(line => line.side === 'debit').reduce((sum, line) => sum + line.amount, 0));
  const credits = round2(lines.filter(line => line.side === 'credit').reduce((sum, line) => sum + line.amount, 0));
  const balance = round2(debits - credits);
  if (Math.abs(balance) > 0.009) {
    lines.push({
      key: 'opening-equity',
      label: 'حقوق ملكية افتتاحية (رصيد الموازنة)',
      detail: balance > 0 ? 'فائض أصول يُرحّل كأرباح مُبقاة افتتاحية' : 'عجز يُرحّل كتكلفة افتتاحية غير مسجلة',
      amount: Math.abs(balance),
      side: balance > 0 ? 'credit' : 'debit',
      accountHints: ['حقوق الملكية', 'أرباح', 'رأس المال', 'equity', 'capital'],
      editable: false,
    });
  }
  const finalDebits = round2(lines.filter(line => line.side === 'debit').reduce((sum, line) => sum + line.amount, 0));
  const finalCredits = round2(lines.filter(line => line.side === 'credit').reduce((sum, line) => sum + line.amount, 0));
  return { lines, debits: finalDebits, credits: finalCredits, balance: round2(finalDebits - finalCredits) };
}
