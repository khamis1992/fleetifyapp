import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  FolderUp,
  Pencil,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { FeatureTourButton, FeatureTourDialog, type FeatureTourContent } from '@/components/common/FeatureTourGuide';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useFinanceAccessGuard } from '@/hooks/finance/useFinanceAccessGuard';
import {
  areNearMonthlyAmounts,
  buildWorkbookContentId,
  deduplicateWorkbookInputs,
  EXCEL_PARSE_BATCH_SIZE,
  getContractIdentityConflict,
  getImportedDelayDays,
  hasBlockingImportWarnings,
  hasCompatibleIdentityName,
  isAutomaticContractMatch,
  mapInBatches,
  parseImportedTrafficAmounts,
  parseStructuredImportAmount,
} from './excelImportSafety';
import {
  agentPlanReviewReasons,
  applyAgentEffectiveRows,
  completeExcelImportAgentPlan,
  planExcelImportWithAgent,
  type ExcelImportAgentPlan,
} from './excelImportAgent';
import {
  planHistoricalPaymentAllocations,
  resolveHistoricalInvoicePaidAmount,
} from './excelImportAllocation';

const excelImportTour = {
  title: 'جولة استيراد دفعات Excel',
  description: 'شرح طريقة رفع ملفات الدفعات التاريخية ومراجعتها قبل الاعتماد.',
  steps: [
    'ابدأ برفع ملف أو مجلد Excel يحتوي بيانات العميل واللوحة والمدفوعات الشهرية.',
    'راجع جودة القراءة: العميل، الهاتف، اللوحة، المدفوع، المتبقي، الصيانة، التأخير، والمخالفات.',
    'استخدم زر تعديل لتصحيح القيم التي قرأها النظام بشكل غير دقيق قبل الاعتماد.',
    'زر اعتماد الدفعات يفتح ملخصاً نهائياً لما سيتم ترحيله للنظام.',
    'لا يتم إنشاء أي حركة مالية قبل تنفيذ الاعتماد النهائي من نافذة المراجعة.',
  ],
} satisfies FeatureTourContent;

const excelApprovalTour = {
  title: 'جولة اعتماد ملف Excel',
  description: 'شرح نافذة اعتماد الدفعات التاريخية قبل ترحيلها للنظام.',
  steps: [
    'راجع عدد الدفعات والفواتير والمخالفات التي سيقوم النظام بإنشائها أو ربطها.',
    'تأكد من مطابقة الملف مع عقد صحيح عبر اللوحة أو الهاتف أو الهوية.',
    'إذا ظهرت موانع اعتماد، عالجها قبل تنفيذ الاعتماد النهائي.',
    'بعد التنفيذ ستظهر النتائج في الفواتير والمدفوعات والمخالفات حسب البيانات المستوردة.',
  ],
} satisfies FeatureTourContent;
import { toast } from 'sonner';

type CellValue = string | number | Date | null | undefined;

type ParsedPaymentRow = {
  month: string;
  paymentAmount: number | null;
  remainingAmount: number | null;
  maintenanceAmount: number | null;
  delayDays: number | null;
  delayValue: number | null;
  trafficAmount: number | null;
  trafficAmounts: number[];
  unclassifiedAmount: number;
  sourceText: string;
  rowNumber: number;
};

type ParsedExcelFile = {
  id: string;
  fileName: string;
  customerName: string;
  idNumber: string;
  phone: string;
  plateNumber: string;
  contractDate: string;
  monthlyRent: number;
  rows: ParsedPaymentRow[];
  totalPayments: number;
  totalRemaining: number;
  confidence: number;
  warnings: string[];
  status: 'ready' | 'review_required' | 'empty' | 'error';
};

type EditableRowField = 'paymentAmount' | 'remainingAmount' | 'maintenanceAmount' | 'delayDays' | 'delayValue' | 'trafficAmount';

type RowEditChange = {
  rowNumber: number;
  month: string;
  field: EditableRowField;
  label: string;
  before: number;
  after: number;
};

type MatchedContract = {
  id: string;
  contract_number: string;
  customer_id: string;
  vehicle_id: string | null;
  license_plate: string | null;
  monthly_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  customers?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    first_name_ar?: string | null;
    last_name_ar?: string | null;
    company_name?: string | null;
    company_name_ar?: string | null;
    phone: string | null;
    national_id: string | null;
  } | null;
  vehicles?: {
    id: string;
    plate_number: string | null;
  } | null;
};

type ImportResult = {
  payments: number;
  invoicesCreated: number;
  lateFees: number;
  trafficViolations: number;
  maintenanceRecords: number;
  skipped: number;
  skippedReasons: string[];
  paymentReport: PaymentReportRow[];
};

type ImportResultsByFile = Record<string, ImportResult>;
type MatchedContractsByFile = Record<string, MatchedContract>;

type ContractMatchAlternative = {
  contract: MatchedContract;
  confidence: number;
  reasons: string[];
};

type ContractMatchAnalysis = {
  contract: MatchedContract | null;
  confidence: number;
  reasons: string[];
  alternatives: ContractMatchAlternative[];
};

type ImportFileOutcome = {
  fileId: string;
  fileName: string;
  customerName: string;
  status: 'pending' | 'processing' | 'approved' | 'failed' | 'skipped' | 'review_required';
  message: string;
  details: string[];
  contractNumber?: string;
  updatedAt: string;
};

type ImportFileOutcomesByFile = Record<string, ImportFileOutcome>;

type ImportAiInsight = {
  tone: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
};

type ExcelImportAiFileReview = {
  fileId: string;
  title: string;
  explanation: string;
  recommendedAction: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
};

type ExcelImportAiReview = {
  summary: string;
  source: 'longcat' | 'local';
  generatedAt: string;
  insights: ImportAiInsight[];
  fileReviews: ExcelImportAiFileReview[];
};

type ImportSessionSnapshot = {
  version: 1;
  sessionId: string;
  companyId: string;
  savedAt: string;
  files: ParsedExcelFile[];
  selectedId: string | null;
  importResults: ImportResultsByFile;
  matchedContractsByFile: MatchedContractsByFile;
  fileOutcomes: ImportFileOutcomesByFile;
};

type PaymentReportRow = {
  month: string;
  amount: number;
  customerName: string;
  contractNumber: string;
  contractPath: string;
  invoiceId: string;
  invoiceNumber: string;
  paymentId: string;
  paymentNumber: string;
  paymentDate: string;
  referenceNumber: string;
  destination: string;
};

type BulkApprovalProgress = {
  current: number;
  total: number;
  fileName: string;
  rowCurrent?: number;
  rowTotal?: number;
  rowLabel?: string;
};

type ApprovalProgress = {
  current: number;
  total: number;
  label: string;
};

type RpcError = {
  code?: string;
  message?: string;
  details?: string;
};

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: RpcError | null }>;
};

type AccountingPeriodRow = {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: string;
};

type ImportInvoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number | null;
  balance_due: number | null;
  payment_status: string;
};

type ImportPayment = {
  id: string;
  payment_number: string | null;
  payment_date: string | null;
  reference_number: string | null;
  amount: number | null;
  invoice_id: string | null;
  contract_id: string | null;
  payment_status: string | null;
};

type ApprovalCache = {
  invoicesByMonth: Map<string, ImportInvoice>;
  paymentsByInvoiceId: Map<string, ImportPayment[]>;
  paymentsByReference: Map<string, ImportPayment>;
  lateFeeInvoiceIds: Set<string>;
  penaltyNumbers: Set<string>;
  maintenanceNumbers: Set<string>;
};

type PreparedApprovalRow = {
  row: ParsedPaymentRow;
  monthDate: string | null;
  monthKey: string | null;
};

type SupabaseQueryError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const normalizeArabic = (value: CellValue) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim()
    .toLowerCase();

const parseSingleAmount = (amount: string) => {
  const text = amount
    .replace(/[٬,]/g, '')
    .replace(/[^\d.-]/g, '')
    .trim();
  if (!text) return 0;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseNumberParts = (value: CellValue): number[] => {
  if (typeof value === 'number' && Number.isFinite(value)) return value > 0 ? [value] : [];
  const text = String(value ?? '').trim();
  if (!text) return [];

  const parts = text.includes('+') ? text.split('+') : [text];
  return parts
    .map(parseSingleAmount)
    .filter((amount) => amount > 0);
};

const parseNumber = (value: CellValue): number => {
  return parseNumberParts(value).reduce((sum, amount) => sum + amount, 0);
};

const cellText = (value: CellValue) => {
  if (value instanceof Date) {
    return `${value.getMonth() + 1}-${value.getFullYear()}`;
  }
  return String(value ?? '').trim();
};

const parseOptionalNumber = (value: CellValue): number | null => {
  const text = cellText(value);
  if (value === null || value === undefined || text === '' || !/\d/.test(text)) return null;
  return parseNumber(value);
};

const looksLikeMonth = (value: CellValue) => {
  if (value instanceof Date) return true;
  const text = cellText(value);
  return /^\d{1,2}[-/]\d{4}$/.test(text) || /^\d{4}[-/]\d{1,2}$/.test(text);
};

const findAdjacentValue = (
  rows: CellValue[][],
  matcher: RegExp,
  options?: { firstOnly?: boolean; filter?: (text: string) => boolean },
) => {
  for (let r = 0; r < Math.min(rows.length, 15); r += 1) {
    for (let c = 0; c < (rows[r]?.length || 0); c += 1) {
      if (!matcher.test(normalizeArabic(rows[r][c]))) continue;
      const row = rows[r] || [];
      const candidates = [row[c - 2], row[c - 1], row[c + 1], row[c + 2]]
        .map(cellText)
        .filter(Boolean)
        .filter((text) => !matcher.test(normalizeArabic(text)))
        .filter((text) => !options?.filter || options.filter(text));
      if (candidates.length) return options?.firstOnly ? candidates[0] : candidates.join(' ').trim();
    }
  }
  return '';
};

const findPhoneValue = (rows: CellValue[][]) =>
  findAdjacentValue(rows, /\btel\b|هاتف|جوال/, {
    firstOnly: true,
    filter: (text) => {
      const digits = text.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 12;
    },
  });

const findIdNumberValue = (rows: CellValue[][]) => {
  const fromAdjacentCell = findAdjacentValue(rows, /\bid\b|هويه|بطاقه|هوية|بطاقة/, {
    firstOnly: true,
    filter: (text) => {
      const digits = text.replace(/\D/g, '');
      return digits.length >= 6 && digits.length <= 15;
    },
  });

  if (fromAdjacentCell) return fromAdjacentCell;

  for (let r = 0; r < Math.min(rows.length, 15); r += 1) {
    for (const value of rows[r] || []) {
      const text = cellText(value);
      if (!/\bid\b|هويه|بطاقه|هوية|بطاقة/i.test(normalizeArabic(text))) continue;

      const match = text.replace(/[,\s]/g, '').match(/\d{6,15}/);
      if (match) return match[0];
    }
  }

  return '';
};

const findMonthlyRentValue = (rows: CellValue[][]) =>
  findAdjacentValue(rows, /قسط/, {
    firstOnly: true,
    filter: (text) => parseOptionalNumber(text) !== null,
  });

const findCustomerName = (rows: CellValue[][]) => {
  const ignored = /(id|tel|عقد|لوحه|القسط|الاستماره|شهر|مدفوع|الباقي)/i;
  for (let r = 0; r < Math.min(rows.length, 8); r += 1) {
    for (const value of rows[r] || []) {
      const text = cellText(value);
      if (!text || ignored.test(normalizeArabic(text))) continue;
      if (/[\u0600-\u06FF]/.test(text) && text.length > 3) return text;
    }
  }
  return '';
};

const findHeaderRow = (rows: CellValue[][]) => {
  for (let r = 0; r < rows.length; r += 1) {
    const normalizedCells = (rows[r] || []).map(normalizeArabic);
    const hasMonth = normalizedCells.some((cell) => cell.includes('شهر'));
    const hasPayment = normalizedCells.some((cell) => cell.includes('مدفوع'));
    const hasRemaining = normalizedCells.some((cell) => cell.includes('باقي') || cell.includes('متبقي'));
    if (hasMonth && (hasPayment || hasRemaining)) return r;
  }
  return -1;
};

const columnIndex = (header: CellValue[], patterns: RegExp[]) => {
  for (let c = 0; c < header.length; c += 1) {
    const value = normalizeArabic(header[c]);
    if (patterns.some((pattern) => pattern.test(value))) return c;
  }
  return -1;
};

const columnCandidates = (header: CellValue[], index: number) => {
  if (index < 0) return [];
  const candidates = [index];

  for (let offset = 1; offset <= 2; offset += 1) {
    const left = index - offset;
    if (left >= 0 && !cellText(header[left])) candidates.push(left);

    const right = index + offset;
    if (right < header.length && !cellText(header[right])) candidates.push(right);
  }

  return Array.from(new Set(candidates));
};

const readNumberFromColumns = (row: CellValue[], columns: number[]) => {
  for (const column of columns) {
    const value = parseStructuredImportAmount(row[column]);
    if (value !== null) return value;
  }
  return null;
};

const readTrafficAmountsFromColumns = (row: CellValue[], columns: number[]) => {
  for (const column of columns) {
    const value = row[column];
    if (value === null || value === undefined || !/\d/.test(cellText(value))) continue;
    const parsed = parseImportedTrafficAmounts(value);
    if (parsed.amounts.length || parsed.rejected) return parsed;
  }
  return { amounts: [], rejected: false };
};

const calculateLateFee = (days: number | null) => {
  if (!days || days <= 0) return 0;
  return Math.min(days * 120, 3000);
};

const formatOptionalCurrency = (value: number | null) => (value === null ? '-' : formatCurrency(value));

const formatTrafficBreakdown = (row: ParsedPaymentRow) => {
  const amounts = row.trafficAmounts || [];
  if (amounts.length <= 1) return null;

  return amounts.map((amount) => formatCurrency(amount)).join(' + ');
};

const editableRowFields: EditableRowField[] = [
  'paymentAmount',
  'remainingAmount',
  'maintenanceAmount',
  'delayDays',
  'delayValue',
  'trafficAmount',
];

const editableRowFieldLabels: Record<EditableRowField, string> = {
  paymentAmount: 'المدفوع',
  remainingAmount: 'الباقي',
  maintenanceAmount: 'الصيانة',
  delayDays: 'أيام التأخير',
  delayValue: 'قيمة التأخير',
  trafficAmount: 'المخالفات المرورية',
};

const normalizeEditableValue = (value: number | null) => Number(value || 0);

const formatEditChangeValue = (field: EditableRowField, value: number) => {
  if (field === 'delayDays') return `${value} يوم`;
  return formatCurrency(value);
};

const stableHash = (value: string) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
};

const buildHistoricalPaymentReference = ({
  fileIdentity,
  contractId,
  invoiceId,
  month,
}: {
  fileIdentity: string;
  contractId: string;
  invoiceId: string;
  month: string;
}) => {
  const source = `${fileIdentity}|${contractId}|${invoiceId}|${month}`;
  return `xls:${stableHash(source)}:${contractId.slice(0, 8)}:${invoiceId.slice(0, 8)}:${month}`;
};

const buildRowEditChanges = (
  beforeRows: ParsedPaymentRow[] | null,
  afterRows: ParsedPaymentRow[] | null,
): RowEditChange[] => {
  if (!beforeRows || !afterRows) return [];

  const beforeByRow = new Map(beforeRows.map((row) => [row.rowNumber, row]));
  return afterRows.flatMap((afterRow) => {
    const beforeRow = beforeByRow.get(afterRow.rowNumber);
    if (!beforeRow) return [];

    return editableRowFields.flatMap((field) => {
      const before = normalizeEditableValue(beforeRow[field]);
      const after = normalizeEditableValue(afterRow[field]);
      if (before === after) return [];

      return [{
        rowNumber: afterRow.rowNumber,
        month: afterRow.month,
        field,
        label: editableRowFieldLabels[field],
        before,
        after,
      }];
    });
  });
};

const inferRemainingAmount = (explicitRemaining: number | null, paymentAmount: number | null, monthlyRent: number) => {
  if (explicitRemaining !== null) return explicitRemaining;
  if (!monthlyRent || monthlyRent <= 0) return null;

  const paid = paymentAmount || 0;
  return Math.max(monthlyRent - paid, 0);
};

const detectDelayColumn = (header: CellValue[], monthCol: number, paymentCol: number, remainingCol: number) => {
  const explicit = columnIndex(header, [/تاخير/, /غرام/]);
  if (explicit >= 0 && explicit !== monthCol && explicit !== paymentCol && explicit !== remainingCol) return explicit;
  return header.findIndex((value, index) => {
    const text = normalizeArabic(value);
    return index !== monthCol && index !== paymentCol && index !== remainingCol && text.includes('مخالفات') && text.includes('تاخير');
  });
};

const detectTrafficColumn = (header: CellValue[], delayCol: number) => {
  return header.findIndex((value, index) => {
    if (index === delayCol) return false;
    const text = normalizeArabic(value);
    return (
      text.includes('مخالفات المركبة') ||
      text.includes('مخالفات المركبه') ||
      text.includes('مخالفات مرورية') ||
      text.includes('المخالفات المروريه') ||
      text === 'المخالفات'
    );
  });
};

const extractPlateNumber = (rows: CellValue[][]) => {
  const raw = findAdjacentValue(rows, /لوحه|لوحة/);
  return raw.replace(/لوحه رقم:?|لوحة رقم:?/gi, '').trim();
};

const parseWorkbookFile = async (
  file: File,
  buffer: ArrayBuffer,
  contentId: string,
): Promise<ParsedExcelFile> => {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<CellValue[]>(worksheet, { header: 1, raw: false, defval: null });

  const warnings: string[] = [];
  const headerRowIndex = findHeaderRow(rows);

  if (headerRowIndex < 0) {
    return {
      id: contentId,
      fileName: file.name,
      customerName: findCustomerName(rows),
      idNumber: findIdNumberValue(rows),
      phone: findPhoneValue(rows),
      plateNumber: extractPlateNumber(rows),
      contractDate: findAdjacentValue(rows, /عقد/),
      monthlyRent: parseNumber(findMonthlyRentValue(rows)),
      rows: [],
      totalPayments: 0,
      totalRemaining: 0,
      confidence: 25,
      warnings: ['لم يتم العثور على صف عناوين واضح يحتوي شهر/مدفوعات/باقي.'],
      status: 'review_required',
    };
  }

  const header = rows[headerRowIndex] || [];
  const monthCol = columnIndex(header, [/شهر/]);
  const paymentCol = columnIndex(header, [/مدفوع/]);
  const remainingCol = columnIndex(header, [/باقي|متبقي/]);
  const maintenanceCol = columnIndex(header, [/صيانه|صيانة/]);
  const delayCol = detectDelayColumn(header, monthCol, paymentCol, remainingCol);
  const trafficCol = detectTrafficColumn(header, delayCol);
  const paymentCols = columnCandidates(header, paymentCol);
  const remainingCols = columnCandidates(header, remainingCol);
  const maintenanceCols = columnCandidates(header, maintenanceCol);
  const delayCols = columnCandidates(header, delayCol);
  const trafficCols = columnCandidates(header, trafficCol);
  const sharedCategoryCols = maintenanceCols.filter((column) => trafficCols.includes(column));
  const unambiguousMaintenanceCols = maintenanceCols.filter((column) => !sharedCategoryCols.includes(column));
  const unambiguousTrafficCols = trafficCols.filter((column) => !sharedCategoryCols.includes(column));

  if (monthCol < 0) warnings.push('لم يتم تحديد عمود الشهر.');
  if (paymentCol < 0) warnings.push('لم يتم تحديد عمود المدفوعات.');
  if (remainingCol < 0) warnings.push('لم يتم تحديد عمود الباقي.');

  const monthlyRent = parseNumber(findMonthlyRentValue(rows));
  const parsedRows: ParsedPaymentRow[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r += 1) {
    const row = rows[r] || [];
    if (!looksLikeMonth(row[monthCol])) continue;

    const paymentAmount = readNumberFromColumns(row, paymentCols) ?? 0;
    const explicitRemainingAmount = readNumberFromColumns(row, remainingCols);
    const remainingAmount = inferRemainingAmount(explicitRemainingAmount, paymentAmount, monthlyRent);
    const maintenanceAmount = readNumberFromColumns(row, unambiguousMaintenanceCols) ?? 0;
    const delayDays = getImportedDelayDays({
      delayColumnIndex: delayCol,
      paymentAmount,
      parsedDelayDays: readNumberFromColumns(row, delayCols),
    });
    const delayValue = calculateLateFee(delayDays);
    const trafficResult = readTrafficAmountsFromColumns(row, unambiguousTrafficCols);
    const trafficAmounts = trafficResult.amounts;
    const trafficAmount = trafficAmounts.reduce((sum, amount) => sum + amount, 0);
    const unclassifiedAmount = readNumberFromColumns(row, sharedCategoryCols) ?? 0;
    const sourceText = row.map((value) => cellText(value)).filter(Boolean).join(' | ');

    if (trafficResult.rejected) {
      warnings.push(`تم تجاهل قيمة مخالفة غير آمنة في الصف ${r + 1} لأنها تشبه تاريخًا أو رقم مرجع أو تتجاوز الحد المسموح.`);
    }

    parsedRows.push({
      month: cellText(row[monthCol]),
      paymentAmount,
      remainingAmount,
      maintenanceAmount,
      delayDays,
      delayValue,
      trafficAmount,
      trafficAmounts,
      unclassifiedAmount,
      sourceText,
      rowNumber: r + 1,
    });
  }

  const customerName = findCustomerName(rows);
  const idNumber = findIdNumberValue(rows);
  const phone = findPhoneValue(rows);
  const plateNumber = extractPlateNumber(rows);

  if (!customerName) warnings.push('اسم العميل غير واضح.');
  if (!plateNumber && !idNumber && !phone) warnings.push('لا يوجد رقم لوحة أو هوية أو هاتف للمطابقة.');
  if (parsedRows.length === 0) warnings.push('لم يتم العثور على صفوف أشهر قابلة للاستيراد.');

  const confidence =
    30 +
    (customerName ? 15 : 0) +
    (plateNumber ? 15 : 0) +
    (idNumber ? 10 : 0) +
    (phone ? 10 : 0) +
    (paymentCol >= 0 ? 10 : 0) +
    (remainingCol >= 0 ? 5 : 0) +
    (parsedRows.length > 0 ? 5 : 0);

  const totalPayments = parsedRows.reduce((sum, row) => sum + (row.paymentAmount || 0), 0);
  const totalRemaining = parsedRows.reduce((sum, row) => sum + (row.remainingAmount || 0), 0);

  return {
    id: contentId,
    fileName: file.name,
    customerName,
    idNumber,
    phone,
    plateNumber,
    contractDate: findAdjacentValue(rows, /عقد/),
    monthlyRent,
    rows: parsedRows,
    totalPayments,
    totalRemaining,
    confidence: Math.min(confidence, 100),
    warnings,
    status: parsedRows.length === 0 ? 'empty' : hasBlockingImportWarnings(warnings) ? 'review_required' : 'ready',
  };
};

const statusMeta = {
  ready: { label: 'جاهز للمراجعة', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  review_required: { label: 'يحتاج مراجعة', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
  empty: { label: 'بدون صفوف', className: 'bg-slate-50 text-slate-600 border-slate-200', icon: XCircle },
  error: { label: 'خطأ', className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
};

const parseEditableNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const digitsOnly = (value: string) => value.replace(/\D/g, '');

const compactText = (value: string) => normalizeArabic(value).replace(/[^a-z0-9\u0600-\u06FF]/gi, '');

const buildContractCustomerName = (contract: MatchedContract) => compactText([
  contract.customers?.first_name,
  contract.customers?.last_name,
  contract.customers?.first_name_ar,
  contract.customers?.last_name_ar,
  contract.customers?.company_name,
  contract.customers?.company_name_ar,
].filter(Boolean).join(' '));

const buildContractCustomerNameAliases = (contract: MatchedContract) => {
  const customer = contract.customers;
  return [
    [customer?.first_name, customer?.last_name],
    [customer?.first_name_ar, customer?.last_name_ar],
    [customer?.company_name],
    [customer?.company_name_ar],
  ]
    .map((parts) => compactText(parts.filter(Boolean).join(' ')))
    .filter(Boolean);
};

const getContractCustomerDisplayName = (contract: MatchedContract) => [
  contract.customers?.first_name_ar,
  contract.customers?.last_name_ar,
  contract.customers?.first_name,
  contract.customers?.last_name,
  contract.customers?.company_name_ar,
  contract.customers?.company_name,
].filter(Boolean).join(' ').trim() || '-';

const isCompatibleTextMatch = (source: string, target: string) =>
  Boolean(source && target && (source.includes(target) || target.includes(source)));

const isContractStartAlignedWithFile = (contract: MatchedContract, file: ParsedExcelFile) => {
  const firstMonth = file.rows
    .map((row) => parseMonthToDate(row.month))
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  if (!firstMonth || !contract.start_date) return false;
  const [fileYear, fileMonth] = firstMonth.slice(0, 7).split('-').map(Number);
  const [contractYear, contractMonth] = contract.start_date.slice(0, 7).split('-').map(Number);
  return Math.abs(((fileYear - contractYear) * 12) + fileMonth - contractMonth) <= 1;
};

const contractMatchWarning = (file: ParsedExcelFile) =>
  `لا يوجد عقد مطابق للملف "${file.customerName || file.fileName}". تأكد من تسجيل العميل والعقد أو صحح الاسم/اللوحة/الهاتف قبل الاعتماد.`;

const isContractMatchWarning = (message: string) =>
  message.includes('لا يوجد عقد مطابق للملف') ||
  message.includes('لم تتم مطابقة الملف مع عقد') ||
  message.includes('لم يتم العثور على عقد مطابق');

const parseMonthToDate = (month: string) => {
  const [first, second] = month.split(/[-/]/).map((part) => Number(part));
  const year = first > 1000 ? first : second;
  const monthNumber = first > 1000 ? second : first;
  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) return null;
  return `${year}-${String(monthNumber).padStart(2, '0')}-01`;
};

const nextMonthKey = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const monthKeyToImportLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-');
  return `${Number(month)}-${year}`;
};

const sameInvoiceMonth = (invoiceDate: string | null | undefined, monthDate: string) => invoiceDate?.slice(0, 7) === monthDate.slice(0, 7);

const findInvoiceForMonth = (invoices: ImportInvoice[], monthDate: string) =>
  invoices.find((invoice) => sameInvoiceMonth(invoice.invoice_date, monthDate)) ||
  invoices.find((invoice) => sameInvoiceMonth(invoice.due_date, monthDate)) ||
  null;

const cacheInvoice = (cache: ApprovalCache, invoice: ImportInvoice) => {
  if (invoice.invoice_date) cache.invoicesByMonth.set(invoice.invoice_date.slice(0, 7), invoice);
  if (invoice.due_date) cache.invoicesByMonth.set(invoice.due_date.slice(0, 7), invoice);
};

const cachePayment = (cache: ApprovalCache, payment: ImportPayment) => {
  if (payment.invoice_id) {
    const payments = cache.paymentsByInvoiceId.get(payment.invoice_id) || [];
    if (!payments.some((existing) => existing.id === payment.id)) {
      payments.push(payment);
      cache.paymentsByInvoiceId.set(payment.invoice_id, payments);
    }
  }

  if (payment.reference_number) {
    cache.paymentsByReference.set(payment.reference_number, payment);
  }
};

const findCachedHistoricalPayment = (
  cache: ApprovalCache,
  invoice: ImportInvoice,
  row: ParsedPaymentRow,
  contract: MatchedContract,
  file: ParsedExcelFile,
  amountToApply: number,
  paymentDateOverride?: string | null,
) => {
  const stableReference = buildHistoricalPaymentReference({
    fileIdentity: file.id,
    contractId: contract.id,
    invoiceId: invoice.id,
    month: row.month,
  });
  const paymentDate = paymentDateOverride || invoice.invoice_date || invoice.due_date || null;
  const payments = cache.paymentsByInvoiceId.get(invoice.id) || [];

  return payments.find((payment) =>
    payment.contract_id === contract.id &&
    payment.payment_status === 'completed' &&
    Number(payment.amount || 0) === amountToApply &&
    (!paymentDate || payment.payment_date === paymentDate)
  ) || cache.paymentsByReference.get(stableReference) || null;
};

const calculateInvoiceBalanceFromCachedPayments = (cache: ApprovalCache, invoice: ImportInvoice) => {
  const totalAmount = Number(invoice.total_amount) || 0;
  const directPaymentTotal = (cache.paymentsByInvoiceId.get(invoice.id) || [])
    .filter((payment) => payment.payment_status === 'completed')
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const paidAmount = resolveHistoricalInvoicePaidAmount({
    totalAmount,
    persistedPaidAmount: Number(invoice.paid_amount || 0),
    persistedBalanceDue: invoice.balance_due === null ? null : Number(invoice.balance_due),
    directPaymentTotal,
  });
  const balanceDue = Math.max(0, totalAmount - paidAmount);
  const paymentStatus = paidAmount <= 0 ? 'unpaid' : balanceDue <= 0.01 ? 'paid' : 'partial';

  return {
    ...invoice,
    paid_amount: paidAmount,
    balance_due: balanceDue,
    payment_status: paymentStatus,
  } as ImportInvoice;
};

const prepareApprovalRows = (rows: ParsedPaymentRow[]): PreparedApprovalRow[] =>
  rows.map((row) => {
    const monthDate = parseMonthToDate(row.month);
    return {
      row,
      monthDate,
      monthKey: monthDate ? monthDate.slice(0, 7) : null,
    };
  });

const alignInvoiceDueDateToExcelMonth = async ({
  companyId,
  invoice,
  monthDate,
}: {
  companyId: string;
  invoice: ImportInvoice;
  monthDate: string;
}) => {
  if (!sameInvoiceMonth(invoice.invoice_date, monthDate)) return invoice;
  if (sameInvoiceMonth(invoice.due_date, monthDate)) return invoice;

  const { data, error } = await supabase
    .from('invoices')
    .update({
      due_date: monthDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoice.id)
    .eq('company_id', companyId)
    .select('id, invoice_number, invoice_date, due_date, total_amount, paid_amount, balance_due, payment_status')
    .single();

  if (error) {
    logSupabaseError('alignInvoiceDueDateToExcelMonth update failed', error);
    throw error;
  }

  return (data || { ...invoice, due_date: monthDate }) as ImportInvoice;
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const supabaseError = error as SupabaseQueryError;
    return supabaseError.message || supabaseError.details || supabaseError.hint || JSON.stringify(error);
  }
  return String(error || '');
};

const parseContractOverpaymentMessage = (message: string) => {
  const match = message.match(
    /total paid \(QAR\s*([\d,.]+)\).*?contract amount \(QAR\s*([\d,.]+)\).*?Current total paid:\s*QAR\s*([\d,.]+)/i
  );
  if (!match) return null;

  const nextTotal = Number(match[1].replace(/,/g, ''));
  const contractAmount = Number(match[2].replace(/,/g, ''));
  const currentTotal = Number(match[3].replace(/,/g, ''));

  if (![nextTotal, contractAmount, currentTotal].every(Number.isFinite)) return null;

  const attemptedPayment = Math.max(nextTotal - currentTotal, 0);
  const allowedTotal = contractAmount * 1.1;
  const currentExcess = Math.max(currentTotal - contractAmount, 0);
  const nextExcessOverAllowed = Math.max(nextTotal - allowedTotal, 0);

  return {
    nextTotal,
    contractAmount,
    currentTotal,
    attemptedPayment,
    allowedTotal,
    currentExcess,
    nextExcessOverAllowed,
  };
};

const formatQar = (amount: number) => formatCurrency(amount, true);

const explainPaymentSkipWithContext = (
  message: string,
  context?: {
    customerName?: string;
    month?: string;
    amount?: number;
    contractNumber?: string;
    invoiceNumber?: string;
  }
) => {
  const overpayment = parseContractOverpaymentMessage(message);
  const contextParts = [
    context?.customerName,
    context?.contractNumber ? `العقد ${context.contractNumber}` : null,
    context?.invoiceNumber ? `الفاتورة ${context.invoiceNumber}` : null,
    context?.month ? `شهر ${context.month}` : null,
  ].filter(Boolean);
  const prefix = contextParts.length ? `${contextParts.join(' - ')}: ` : '';

  if (overpayment) {
    return `${prefix}تم تخطي الدفعة لأن إجمالي مدفوعات هذا العقد سيتجاوز الحد المسموح. قيمة العقد ${formatQar(overpayment.contractAmount)}، والمدفوع الحالي ${formatQar(overpayment.currentTotal)}، والحد المسموح ${formatQar(overpayment.allowedTotal)}. الدفعة المستوردة ${formatQar(context?.amount || overpayment.attemptedPayment)} سترفع الإجمالي إلى ${formatQar(overpayment.nextTotal)}.`;
  }

  if (message.toLowerCase().includes('would overpay invoice')) {
    return `${prefix}تم تخطي الدفعة لأن الفاتورة المرتبطة مدفوعة أو لأن الدفعة ستتجاوز رصيدها.`;
  }

  if (message.includes('مكررة') || message.toLowerCase().includes('duplicate')) {
    return `${prefix}تم تخطي الدفعة لأنها مكررة أو سبق استيرادها.`;
  }

  return `${prefix}تم تخطي الدفعة للمراجعة: ${message}`;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const explainPaymentSkip = (message: string, context?: { customerName?: string; month?: string; amount?: number }) => {
  const overpayment = parseContractOverpaymentMessage(message);
  const prefix = `${context?.customerName ? `${context.customerName} - ` : ''}${context?.month ? `شهر ${context.month}: ` : ''}`;

  if (overpayment) {
    return `${prefix}تم تخطي الدفعة لأن العقد متجاوز السقف المسموح. قيمة العقد ${formatQar(overpayment.contractAmount)}، والمدفوع الحالي ${formatQar(overpayment.currentTotal)}، والحد المسموح ${formatQar(overpayment.allowedTotal)}. الدفعة المستوردة ${formatQar(context?.amount || overpayment.attemptedPayment)} سترفع الإجمالي إلى ${formatQar(overpayment.nextTotal)}.`;
  }

  if (message.toLowerCase().includes('would overpay invoice')) {
    return `${prefix}تم تخطي الدفعة لأن الفاتورة المرتبطة تبدو مدفوعة أو سيتجاوز الدفع رصيدها.`;
  }

  if (message.includes('مكررة') || message.toLowerCase().includes('duplicate')) {
    return `${prefix}تم تخطي الدفعة لأنها مكررة أو سبق استيرادها.`;
  }

  return `${prefix}تم تخطي الدفعة للمراجعة: ${message}`;
};

const translateExcelImportError = (error: unknown) => {
  const message = errorMessage(error);
  const normalized = message.toLowerCase();
  const overpayment = parseContractOverpaymentMessage(message);

  if (overpayment) {
    return `لا يمكن تسجيل الدفعة لأن العقد تجاوز حد المدفوعات. قيمة العقد ${formatQar(overpayment.contractAmount)}، والمدفوع الحالي ${formatQar(overpayment.currentTotal)}، والحد المسموح ${formatQar(overpayment.allowedTotal)}. راجع مدفوعات العقد قبل إعادة الاعتماد.`;
  }

  const invoiceBeforeContractMatch = message.match(
    /invoice date\s*\(([^)]+)\)\s*cannot be before contract start date\s*\(([^)]+)\)/i
  );
  if (invoiceBeforeContractMatch) {
    return `تاريخ الفاتورة (${invoiceBeforeContractMatch[1]}) قبل تاريخ بداية العقد (${invoiceBeforeContractMatch[2]}). راجع تاريخ بداية العقد أو شهر الفاتورة قبل إعادة الاعتماد.`;
  }

  if (
    normalized.includes('duplicate key value violates unique constraint') ||
    normalized.includes('unique_invoice_per_contract_month')
  ) {
    return 'توجد فاتورة لنفس العقد ونفس الشهر مسبقاً. راجع الفاتورة الحالية أو عالج التكرار ثم أعد المحاولة.';
  }

  if (normalized.includes('would overpay invoice')) {
    return 'لا يمكن تسجيل الدفعة لأن الفاتورة المرتبطة مدفوعة أو لأن الدفعة ستتجاوز الرصيد المستحق.';
  }

  if (normalized.includes('violates foreign key constraint')) {
    return 'تعذر الربط بسجل مرتبط في النظام. راجع العقد والعميل والفاتورة ثم أعد المحاولة.';
  }

  if (normalized.includes('permission denied') || normalized.includes('row-level security')) {
    return 'لا توجد صلاحية كافية لتنفيذ العملية على هذه البيانات.';
  }

  return message;
};

const localizeImportOutcomeMessage = (message?: string) => {
  if (!message) return '';
  return translateExcelImportError(message) || message;
};

const isDuplicateOrContractOverpaymentError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    message.includes('مكررة') ||
    normalized.includes('duplicate') ||
    normalized.includes('payment would cause total paid') ||
    normalized.includes('exceed contract amount') ||
    normalized.includes('would overpay invoice')
  );
};

const logSupabaseError = (scope: string, error: SupabaseQueryError | null) => {
  if (!error) return;
  console.error(`[ExcelPaymentImport] ${scope}`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
};

const isMissingRpcError = (error: RpcError | null) => {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return error?.code === 'PGRST202' || message.includes('function') || message.includes('not found');
};

const contractMatchSelect = `
  id,
  contract_number,
  customer_id,
  vehicle_id,
  license_plate,
  monthly_amount,
  start_date,
  end_date,
  status,
  customers:customer_id (
    id,
    first_name,
    last_name,
    first_name_ar,
    last_name_ar,
    company_name,
    company_name_ar,
    phone,
    national_id
  ),
  vehicles:vehicle_id (
    id,
    plate_number
  )
`;

const fetchContractCandidates = async (companyId: string) => {
  const { data, error } = await supabase
    .from('contracts')
    .select(contractMatchSelect)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) throw error;
  return (data || []) as MatchedContract[];
};

const scoreContractMatch = (contract: MatchedContract, file: ParsedExcelFile) => {
  let score = 0;
  const reasons: string[] = [];
  const filePlate = compactText(file.plateNumber);
  const filePhone = digitsOnly(file.phone);
  const fileId = digitsOnly(file.idNumber);
  const fileName = compactText(file.customerName);
  const contractPlate = compactText(contract.vehicles?.plate_number || contract.license_plate || '');
  const phone = digitsOnly(contract.customers?.phone || '');
  const nationalId = digitsOnly(contract.customers?.national_id || '');
  const nameAliases = buildContractCustomerNameAliases(contract);
  const hasNameInFile = Boolean(fileName);
  const nameMatches = hasCompatibleIdentityName(fileName, nameAliases);
  const plateMatches = Boolean(filePlate && contractPlate && (
    filePlate === contractPlate ||
    contractPlate.includes(filePlate) ||
    filePlate.includes(contractPlate)
  ));
  const phoneMatches = Boolean(filePhone && phone && (
    filePhone === phone ||
    phone.endsWith(filePhone) ||
    filePhone.endsWith(phone)
  ));
  const idMatches = Boolean(fileId && nationalId && fileId === nationalId);
  const monthlyAmountMatches = areNearMonthlyAmounts(file.monthlyRent, Number(contract.monthly_amount || 0));
  const contractStartMatches = isContractStartAlignedWithFile(contract, file);
  const identityConflict = getContractIdentityConflict({
    fileHasName: hasNameInFile,
    namesMatch: nameMatches,
    fileHasPlate: Boolean(filePlate),
    contractHasPlate: Boolean(contractPlate),
    platesMatch: plateMatches,
    fileNationalId: fileId,
    contractNationalId: nationalId,
    nationalIdsMatch: idMatches,
    phonesMatch: phoneMatches,
    monthlyAmountsMatch: monthlyAmountMatches,
    contractStartMatches,
  });

  if (identityConflict) {
    return {
      score: -1,
      reasons: [identityConflict],
    };
  }

  if (idMatches) {
    score += 100;
    reasons.push('تطابق الرقم الشخصي مع بيانات العميل.');
  }
  if (phoneMatches) {
    score += 55;
    reasons.push('تطابق رقم الجوال أو آخر أرقامه.');
  }
  if (plateMatches) {
    score += 55;
    reasons.push('تطابق رقم المركبة مع العقد.');
  }
  if (idMatches && plateMatches) {
    score += 35;
    reasons.push('تطابق الرقم الشخصي ورقم المركبة معًا، وهذا أقوى مؤشر للمطابقة.');
  }
  if (nameMatches) {
    score += 20;
    reasons.push('اسم العميل قريب من الاسم الموجود في العقد.');
  }
  if (monthlyAmountMatches && nameMatches && plateMatches) {
    score += 10;
    reasons.push('القسط الشهري في الملف قريب من القسط المسجل في العقد.');
  }
  if (contractStartMatches && nameMatches && plateMatches) {
    score += 10;
    reasons.push('أول شهر في الملف يطابق شهر بداية العقد.');
  }
  if (contract.status === 'active') {
    score += 5;
    reasons.push('العقد نشط حاليًا.');
  }

  return {
    score,
    reasons: reasons.length ? reasons : ['لا توجد مؤشرات كافية للمطابقة.'],
  };
};

const analyzeContractMatch = async (
  companyId: string,
  file: ParsedExcelFile,
  candidates?: MatchedContract[],
): Promise<ContractMatchAnalysis> => {
  const contracts = candidates || await fetchContractCandidates(companyId);

  const { data: approvedFingerprintContractId, error: approvedFingerprintError } = await (supabase as any)
    .rpc('resolve_excel_import_contract_by_hash_v1', {
      p_company_id: companyId,
      p_content_hash: file.id,
    });
  if (approvedFingerprintError) throw approvedFingerprintError;

  const fingerprintContract = approvedFingerprintContractId
    ? contracts.find((contract) => contract.id === approvedFingerprintContractId)
    : null;
  if (fingerprintContract) {
    return {
      contract: fingerprintContract,
      confidence: 100,
      reasons: ['تطابق بصمة الملف مع عقد سبق اعتماده أو تأكيده يدويًا.'],
      alternatives: [{
        contract: fingerprintContract,
        confidence: 100,
        reasons: ['تطابق بصمة الملف مع عقد سبق اعتماده أو تأكيده يدويًا.'],
      }],
    };
  }

  const scored = contracts.map((contract) => {
    const result = scoreContractMatch(contract, file);
    return { contract, score: result.score, reasons: result.reasons };
  }).sort((a, b) => b.score - a.score);

  const viableMatches = scored.filter((item) => isAutomaticContractMatch(item.score));
  const best = viableMatches[0] || null;
  const alternatives = scored.filter((item) => item.score > 0).slice(0, 3).map((item) => ({
    contract: item.contract,
    confidence: Math.min(100, Math.max(0, item.score)),
    reasons: item.reasons,
  }));

  return {
    contract: best?.contract || null,
    confidence: best ? Math.min(100, Math.max(0, best.score)) : 0,
    reasons: best?.reasons || ['لم يتم العثور على عقد يملك مؤشرات مطابقة كافية.'],
    alternatives,
  };
};

const findBestContractMatch = async (companyId: string, file: ParsedExcelFile) => {
  const analysis = await analyzeContractMatch(companyId, file);
  return analysis.contract;
};

const searchContractMatches = async (
  companyId: string,
  file: ParsedExcelFile,
  searchTerm: string,
  candidates?: MatchedContract[],
): Promise<ContractMatchAlternative[]> => {
  const contracts = candidates || await fetchContractCandidates(companyId);

  const queryText = compactText(searchTerm);
  const queryDigits = digitsOnly(searchTerm);

  return contracts
    .map((contract) => {
      const reasons: string[] = [];
      let score = 0;
      const contractNumber = compactText(contract.contract_number || '');
      const contractPlate = compactText(contract.vehicles?.plate_number || contract.license_plate || '');
      const customerName = buildContractCustomerName(contract);
      const customerPhone = digitsOnly(contract.customers?.phone || '');
      const customerId = digitsOnly(contract.customers?.national_id || '');
      const fileScore = scoreContractMatch(contract, file);

      if (queryText && contractNumber.includes(queryText)) {
        score += 120;
        reasons.push('رقم العقد يطابق البحث اليدوي.');
      }
      if (queryDigits && customerId && (customerId === queryDigits || customerId.includes(queryDigits))) {
        score += 110;
        reasons.push('الرقم الشخصي يطابق البحث اليدوي.');
      }
      if (queryDigits && customerPhone && (customerPhone === queryDigits || customerPhone.endsWith(queryDigits) || queryDigits.endsWith(customerPhone))) {
        score += 80;
        reasons.push('رقم الجوال يطابق البحث اليدوي.');
      }
      if (queryText && contractPlate && (contractPlate === queryText || contractPlate.includes(queryText) || queryText.includes(contractPlate))) {
        score += 75;
        reasons.push('رقم المركبة يطابق البحث اليدوي.');
      }
      if (queryText && customerName && (customerName.includes(queryText) || queryText.includes(customerName))) {
        score += 45;
        reasons.push('اسم العميل قريب من البحث اليدوي.');
      }

      if (fileScore.score > 0) {
        score += Math.min(45, Math.round(fileScore.score / 3));
        reasons.push(...fileScore.reasons.slice(0, 2));
      }

      return {
        contract,
        confidence: Math.min(100, Math.max(0, score)),
        reasons: Array.from(new Set(reasons)),
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ contract, confidence, reasons }) => ({
      contract,
      confidence,
      reasons: reasons.length ? reasons : ['تم العثور على العقد ضمن نتائج البحث اليدوي.'],
    }));
};

const findExistingMonthlyInvoice = async (companyId: string, contractId: string, invoiceDate: string) => {
  const selectFields = 'id, invoice_number, invoice_date, due_date, total_amount, paid_amount, balance_due, payment_status';
  const { data, error } = await supabase
    .from('invoices')
    .select(selectFields)
    .eq('company_id', companyId)
    .eq('contract_id', contractId)
    .order('invoice_date', { ascending: true })
    .limit(300);

  if (error) {
    logSupabaseError('findExistingMonthlyInvoice primary query failed', error);

    const fallback = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', companyId)
      .eq('contract_id', contractId)
      .limit(300);

    if (fallback.error) {
      logSupabaseError('findExistingMonthlyInvoice fallback query failed', fallback.error);
      throw fallback.error;
    }

    return findInvoiceForMonth((fallback.data || []) as ImportInvoice[], invoiceDate);
  }

  return findInvoiceForMonth((data || []) as ImportInvoice[], invoiceDate);
};

const createOrFindMonthlyInvoice = async ({
  companyId,
  contract,
  row,
  monthlyRent,
}: {
  companyId: string;
  contract: MatchedContract;
  row: ParsedPaymentRow;
  monthlyRent: number;
}) => {
  const invoiceDate = parseMonthToDate(row.month);
  if (!invoiceDate) throw new Error(`صيغة الشهر غير صحيحة: ${row.month}`);

  const contractStartDate = contract.start_date;
  const contractEndDate = contract.end_date;
  const invoiceMonth = invoiceDate.slice(0, 7);
  const startsAfterInvoiceMonth = contractStartDate && contractStartDate.slice(0, 7) > invoiceMonth;
  const endsBeforeInvoiceMonth = contractEndDate && contractEndDate.slice(0, 7) < invoiceMonth;

  if (startsAfterInvoiceMonth || endsBeforeInvoiceMonth) {
    return { invoice: null, created: false };
  }

  const existingInvoice = await findExistingMonthlyInvoice(companyId, contract.id, invoiceDate);
  if (existingInvoice) return { invoice: existingInvoice, created: false };

  const amount = monthlyRent || contract.monthly_amount || row.remainingAmount || row.paymentAmount || 0;
  if (amount <= 0) throw new Error(`لا يمكن إنشاء فاتورة للشهر ${row.month} بدون قيمة إيجار.`);

  const effectiveInvoiceDate =
    contractStartDate && contractStartDate.slice(0, 7) === invoiceMonth && contractStartDate > invoiceDate
      ? contractStartDate
      : invoiceDate;

  const invoiceNumber = `HIST-${contract.contract_number}-${invoiceDate.slice(0, 7).replace('-', '')}`;
  const insertPayload = {
    company_id: companyId,
    customer_id: contract.customer_id,
    contract_id: contract.id,
    invoice_number: invoiceNumber,
    invoice_date: effectiveInvoiceDate,
    due_date: effectiveInvoiceDate,
    invoice_type: 'sales',
    subtotal: amount,
    total_amount: amount,
    paid_amount: 0,
    balance_due: amount,
    status: 'draft',
    payment_status: 'unpaid',
    currency: 'QAR',
    notes: `فاتورة إيجار تاريخية مستخرجة من ملف Excel للشهر ${row.month}`,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('invoices')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError) {
    logSupabaseError('createOrFindMonthlyInvoice insert failed', insertError);
    const duplicateInvoice = await findExistingMonthlyInvoice(companyId, contract.id, invoiceDate);
    if (duplicateInvoice) return { invoice: duplicateInvoice, created: false };

    const message = errorMessage(insertError);
    if (insertError.code === '23505' || message.includes('مكررة') || message.toLowerCase().includes('duplicate')) {
      const { data: duplicate, error: duplicateError } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .eq('invoice_number', invoiceNumber)
        .order('invoice_date', { ascending: true })
        .limit(1);
      if (duplicateError) {
        logSupabaseError('createOrFindMonthlyInvoice duplicate lookup failed', duplicateError);
        throw duplicateError;
      }
      if (duplicate?.[0]) return { invoice: duplicate[0], created: false };
    }
    throw insertError;
  }

  return { invoice: inserted as ImportInvoice, created: true };
};

const buildApprovalSummary = (file: ParsedExcelFile | null) => {
  if (!file) {
    return {
      payableRows: 0,
      totalPayments: 0,
      totalRemaining: 0,
      totalLateFees: 0,
      totalTraffic: 0,
      totalMaintenance: 0,
      blockers: ['لم يتم اختيار ملف للمراجعة.'],
    };
  }

  const blockers: string[] = [];
  if (!file.customerName) blockers.push('اسم العميل غير واضح.');
  if (!file.plateNumber && !file.idNumber && !file.phone) blockers.push('لا توجد لوحة أو هوية أو هاتف للمطابقة.');
  if (!file.rows.length) blockers.push('لا توجد صفوف شهرية قابلة للاعتماد.');

  return {
    payableRows: file.rows.filter((row) => (row.paymentAmount || 0) > 0).length,
    totalPayments: file.rows.reduce((sum, row) => sum + (row.paymentAmount || 0), 0),
    totalRemaining: file.rows.reduce((sum, row) => sum + (row.remainingAmount || 0), 0),
    totalLateFees: file.rows.reduce((sum, row) => sum + (row.delayValue || 0), 0),
    totalTraffic: file.rows.reduce((sum, row) => sum + (row.trafficAmount || 0), 0),
    totalMaintenance: file.rows.reduce((sum, row) => sum + (row.maintenanceAmount || 0), 0),
    blockers,
  };
};

const IMPORT_SESSION_VERSION = 1;

const buildImportSessionId = () => {
  return `excel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getImportSessionStorageKey = (companyId: string) => {
  return `fleetify:finance:excel-payment-import:${companyId}`;
};

const summarizeFileAnalysis = (
  file: ParsedExcelFile,
  contract?: MatchedContract | null,
  result?: ImportResult | null,
) => {
  const summary: string[] = [];
  summary.push(`الأشهر المقروءة: ${file.rows.length}`);
  summary.push(`إجمالي المدفوعات في الملف: ${formatCurrency(file.totalPayments)}`);
  summary.push(`نسبة جودة القراءة: ${file.confidence}%`);

  if (contract) {
    summary.push(`العقد المطابق: ${contract.contract_number}`);
    summary.push(`لوحة العقد: ${contract.vehicles?.plate_number || contract.license_plate || '-'}`);
  } else {
    summary.push('لا يوجد عقد مطابق محفوظ لهذا الملف حتى الآن.');
  }

  if (file.warnings.length > 0) {
    summary.push(...file.warnings.slice(0, 4));
  }

  if (result) {
    summary.push(`نتيجة الاعتماد: ${result.payments} دفعة، ${result.invoicesCreated} فاتورة، ${result.skipped} متخطى.`);
  }

  return summary;
};

const buildImportAiInsights = ({
  files,
  fileOutcomes,
  importResults,
}: {
  files: ParsedExcelFile[];
  fileOutcomes: ImportFileOutcomesByFile;
  importResults: ImportResultsByFile;
}): ImportAiInsight[] => {
  if (files.length === 0) {
    return [{
      tone: 'info',
      title: 'ابدأ برفع ملفات Excel',
      description: 'بعد الرفع سيحلل المساعد جودة القراءة والمطابقة ويخبرك بالملفات الجاهزة والملفات التي تحتاج تدخل.',
    }];
  }

  const approvedCount = Object.keys(importResults).length;
  const failedOutcomes = Object.values(fileOutcomes).filter((outcome) => outcome.status === 'failed');
  const reviewOutcomes = Object.values(fileOutcomes).filter((outcome) => outcome.status === 'review_required');
  const pendingFiles = files.filter((file) => file.status === 'ready' && !importResults[file.id]);
  const lowConfidenceFiles = files.filter((file) => file.confidence < 80);
  const missingIdentityFiles = files.filter((file) => !file.idNumber && !file.phone && !file.plateNumber);

  const insights: ImportAiInsight[] = [];

  if (failedOutcomes.length > 0) {
    const duplicateFailures = failedOutcomes.filter((outcome) => {
      const message = localizeImportOutcomeMessage(outcome.message).toLowerCase();
      return message.includes('مكرر') || message.includes('فاتورة لنفس العقد') || message.includes('duplicate');
    }).length;
    const dateFailures = failedOutcomes.filter((outcome) => {
      const message = localizeImportOutcomeMessage(outcome.message);
      return message.includes('قبل تاريخ بداية العقد');
    }).length;
    const overpaymentFailures = failedOutcomes.filter((outcome) => {
      const message = localizeImportOutcomeMessage(outcome.message);
      return message.includes('تجاوز حد المدفوعات') || message.includes('سيتجاوز');
    }).length;

    const reasons = [
      duplicateFailures ? `${duplicateFailures} بسبب تكرار فاتورة أو دفعة` : null,
      dateFailures ? `${dateFailures} بسبب تاريخ قبل بداية العقد` : null,
      overpaymentFailures ? `${overpaymentFailures} بسبب تجاوز سقف العقد` : null,
    ].filter(Boolean);

    insights.push({
      tone: 'danger',
      title: `${failedOutcomes.length} ملف فشل أثناء الاعتماد`,
      description: reasons.length
        ? `الأسباب الأوضح: ${reasons.join('، ')}. عالج هذه الملفات ثم استخدم إعادة محاولة الفاشل فقط.`
        : 'راجع بطاقة كل ملف فاشل؛ المساعد يعرض السبب بالعربي والخطوة المناسبة قبل إعادة المحاولة.',
    });
  }

  if (reviewOutcomes.length > 0 || missingIdentityFiles.length > 0) {
    insights.push({
      tone: 'warning',
      title: `${Math.max(reviewOutcomes.length, missingIdentityFiles.length)} ملف يحتاج مطابقة`,
      description: 'الأولوية في المطابقة: الرقم الشخصي أولًا، ثم رقم الجوال، ثم رقم المركبة. إذا تطابق الرقم الشخصي مع اللوحة فالعقد غالبًا هو الصحيح.',
    });
  }

  if (lowConfidenceFiles.length > 0) {
    insights.push({
      tone: 'warning',
      title: `${lowConfidenceFiles.length} ملف جودة قراءته منخفضة`,
      description: 'راجع الاسم والهوية والجوال واللوحة قبل الاعتماد؛ انخفاض الجودة يعني أن أعمدة Excel قد تكون غير واضحة أو ناقصة.',
    });
  }

  if (pendingFiles.length > 0 && failedOutcomes.length === 0) {
    insights.push({
      tone: 'success',
      title: `${pendingFiles.length} ملف جاهز للاعتماد`,
      description: 'يمكنك استكمال الاعتماد الجماعي للملفات الجاهزة. الجلسة محفوظة، لذلك لو توقف التنفيذ يمكنك المتابعة بدون البدء من الصفر.',
    });
  }

  if (approvedCount > 0) {
    insights.push({
      tone: 'success',
      title: `تم اعتماد ${approvedCount} ملف`,
      description: 'الملفات المعتمدة مرتبطة بعقودها ويمكن فتح العقد مباشرة من القائمة الجانبية لمراجعة الدفعات والفواتير.',
    });
  }

  if (insights.length === 0) {
    insights.push({
      tone: 'info',
      title: 'الملفات قيد التحليل',
      description: 'انتظر اكتمال المطابقة، ثم سيعرض المساعد هل يمكن الاعتماد أو ما الذي يحتاج مراجعة.',
    });
  }

  return insights.slice(0, 4);
};

const buildExcelImportAiReviewSession = ({
  files,
  fileOutcomes,
  importResults,
  matchedContractsByFile,
  selectedFileId,
  contractMatchAnalysis,
}: {
  files: ParsedExcelFile[];
  fileOutcomes: ImportFileOutcomesByFile;
  importResults: ImportResultsByFile;
  matchedContractsByFile: MatchedContractsByFile;
  selectedFileId: string | null;
  contractMatchAnalysis: ContractMatchAnalysis | null;
}) => {
  const selectedFileReviewIds = new Set<string>();
  if (selectedFileId) selectedFileReviewIds.add(selectedFileId);
  Object.values(fileOutcomes)
    .filter((outcome) => outcome.status === 'failed' || outcome.status === 'review_required')
    .slice(0, 8)
    .forEach((outcome) => selectedFileReviewIds.add(outcome.fileId));
  files
    .filter((file) => !matchedContractsByFile[file.id] || file.status === 'review_required' || file.confidence < 80)
    .slice(0, 8)
    .forEach((file) => selectedFileReviewIds.add(file.id));

  const reviewFiles = files
    .filter((file) => selectedFileReviewIds.has(file.id))
    .slice(0, 12)
    .map((file) => {
      const outcome = fileOutcomes[file.id];
      const matchedContract = matchedContractsByFile[file.id];
      const localizedReason = localizeImportOutcomeMessage(outcome?.message || '');
      const isSelected = file.id === selectedFileId;

      return {
        fileId: file.id,
        fileName: file.fileName,
        customerName: file.customerName,
        idNumber: maskIdentifier(file.idNumber),
        phone: maskIdentifier(file.phone),
        plateNumber: file.plateNumber,
        readConfidence: file.confidence,
        status: outcome?.status || file.status,
        reason: localizedReason || file.warnings.join('، '),
        months: file.rows.length,
        totalPayments: file.totalPayments,
        hasMatchedContract: Boolean(matchedContract),
        matchedContract: matchedContract ? {
          contractNumber: matchedContract.contract_number,
          customerName: getContractCustomerDisplayName(matchedContract),
          plateNumber: matchedContract.vehicles?.plate_number || matchedContract.license_plate || null,
          monthlyAmount: matchedContract.monthly_amount,
          contractAmount: matchedContract.monthly_amount * Math.max(1, file.rows.length),
        } : null,
        matchConfidence: isSelected ? contractMatchAnalysis?.confidence : undefined,
        matchReason: isSelected ? contractMatchAnalysis?.reasons?.slice(0, 4).join('، ') : undefined,
        alternatives: isSelected ? contractMatchAnalysis?.alternatives?.slice(0, 3).map((alternative) => ({
          contractNumber: alternative.contract.contract_number,
          customerName: getContractCustomerDisplayName(alternative.contract),
          plateNumber: alternative.contract.vehicles?.plate_number || alternative.contract.license_plate || null,
          confidence: alternative.confidence,
          reasons: alternative.reasons.slice(0, 3),
        })) : [],
        approved: Boolean(importResults[file.id]),
      };
    });

  return {
    totals: {
      files: files.length,
      ready: files.filter((file) => file.status === 'ready').length,
      review: files.filter((file) => file.status === 'review_required').length,
      approved: Object.keys(importResults).length,
      failed: Object.values(fileOutcomes).filter((outcome) => outcome.status === 'failed').length,
    },
    rules: {
      matchingPriority: ['personal_id', 'phone', 'vehicle_plate'],
      strongSignal: 'personal_id_with_vehicle_plate',
      duplicateCheck: 'before_approval',
      overpaymentCheck: 'before_payment_creation',
    },
    files: reviewFiles,
  };
};

const maskIdentifier = (value: string) => {
  const digits = digitsOnly(value);
  if (!digits) return '';
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 2)}***${digits.slice(-2)}`;
};

const getInsightClassName = (tone: ImportAiInsight['tone']) => {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'danger':
      return 'border-red-200 bg-red-50 text-red-800';
    default:
      return 'border-sky-200 bg-sky-50 text-sky-800';
  }
};

const buildSelectedFileAiDecision = ({
  file,
  outcome,
  result,
  matchedContract,
  approvalBlockers,
}: {
  file: ParsedExcelFile | null;
  outcome: ImportFileOutcome | null;
  result: ImportResult | null;
  matchedContract: MatchedContract | null;
  approvalBlockers: string[];
}): ImportAiInsight => {
  if (!file) {
    return {
      tone: 'info',
      title: 'لا يوجد ملف محدد',
      description: 'اختر ملفًا من القائمة لعرض قرار المساعد لهذا العميل.',
    };
  }

  if (result) {
    return {
      tone: 'success',
      title: 'تم اعتماد هذا الملف',
      description: `تم إنشاء أو ربط ${result.payments} دفعة و${result.invoicesCreated} فاتورة. يمكنك فتح العقد لمراجعة الأثر المالي.`,
    };
  }

  if (outcome?.status === 'failed') {
    return {
      tone: 'danger',
      title: 'لا تعيد الاعتماد قبل معالجة السبب',
      description: localizeImportOutcomeMessage(outcome.message) || 'فشل الاعتماد. راجع السبب ثم استخدم إعادة محاولة الفاشل فقط.',
    };
  }

  if (!matchedContract) {
    return {
      tone: 'warning',
      title: 'المطابقة غير مكتملة',
      description: 'ابحث عن العقد حسب الرقم الشخصي أولًا، ثم الجوال، ثم رقم المركبة. عند تطابق الهوية مع اللوحة تكون المطابقة أقوى.',
    };
  }

  if (approvalBlockers.length > 0) {
    return {
      tone: 'warning',
      title: 'يوجد مانع قبل الاعتماد',
      description: approvalBlockers[0],
    };
  }

  if (file.confidence < 80) {
    return {
      tone: 'warning',
      title: 'راجع القراءة قبل الاعتماد',
      description: 'جودة قراءة الملف منخفضة. تحقق من الاسم والهوية والجوال واللوحة قبل إنشاء الدفعات.',
    };
  }

  return {
    tone: 'success',
    title: 'جاهز للاعتماد',
    description: `المساعد يوصي بالاعتماد على العقد ${matchedContract.contract_number} بعد مراجعة إجمالي المدفوعات ${formatCurrency(file.totalPayments)}.`,
  };
};

export default function ExcelPaymentImport() {
  const navigate = useNavigate();
  const { companyId, user } = useUnifiedCompanyAccess();
  const financeAccess = useFinanceAccessGuard();
  const contractCandidatesRef = useRef<{ companyId: string; contracts: MatchedContract[] } | null>(null);
  const closedAccountingPeriodsRef = useRef<{ companyId: string; periods: AccountingPeriodRow[] } | null>(null);
  const approvalCacheByContractRef = useRef<Map<string, ApprovalCache>>(new Map());
  const manualMatchedFileIdsRef = useRef<Set<string>>(new Set());
  const [files, setFiles] = useState<ParsedExcelFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [matchedContract, setMatchedContract] = useState<MatchedContract | null>(null);
  const [contractMatchAnalysis, setContractMatchAnalysis] = useState<ContractMatchAnalysis | null>(null);
  const [manualContractSearch, setManualContractSearch] = useState('');
  const [manualContractResults, setManualContractResults] = useState<ContractMatchAlternative[]>([]);
  const [rememberingContractFileId, setRememberingContractFileId] = useState<string | null>(null);
  const [isManualContractSearchLoading, setIsManualContractSearchLoading] = useState(false);
  const [matchedContractsByFile, setMatchedContractsByFile] = useState<MatchedContractsByFile>({});
  const [isMatchingContract, setIsMatchingContract] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [importResults, setImportResults] = useState<ImportResultsByFile>({});
  const [approvalProgress, setApprovalProgress] = useState<ApprovalProgress | null>(null);
  const [bulkApprovalProgress, setBulkApprovalProgress] = useState<BulkApprovalProgress | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editBaselineRows, setEditBaselineRows] = useState<ParsedPaymentRow[] | null>(null);
  const [editReviewDialogOpen, setEditReviewDialogOpen] = useState(false);
  const [activeTour, setActiveTour] = useState<FeatureTourContent | null>(null);
  const [sessionId, setSessionId] = useState<string>(() => buildImportSessionId());
  const [fileOutcomes, setFileOutcomes] = useState<ImportFileOutcomesByFile>({});
  const [hasLoadedStoredSession, setHasLoadedStoredSession] = useState(false);
  const [aiReview, setAiReview] = useState<ExcelImportAiReview | null>(null);
  const [isAiReviewLoading, setIsAiReviewLoading] = useState(false);
  const [agentPlan, setAgentPlan] = useState<ExcelImportAgentPlan | null>(null);
  const [isAgentPlanLoading, setIsAgentPlanLoading] = useState(false);
  const aiReviewRequestKeyRef = useRef<string>('');

  const selectedFile = files.find((file) => file.id === selectedId) || files[0] || null;
  const importResult = selectedFile ? importResults[selectedFile.id] || null : null;
  const selectedOutcome = selectedFile ? fileOutcomes[selectedFile.id] || null : null;
  const openContractDetails = (contract: MatchedContract) => {
    navigate(`/contracts/${encodeURIComponent(contract.contract_number)}`);
  };
  const getContractCandidatesForSession = async () => {
    if (!companyId) return [];
    const cached = contractCandidatesRef.current;
    if (cached?.companyId === companyId) return cached.contracts;

    const contracts = await fetchContractCandidates(companyId);
    contractCandidatesRef.current = { companyId, contracts };
    return contracts;
  };
  const getClosedAccountingPeriodsForSession = async () => {
    if (!companyId) return [];
    const cached = closedAccountingPeriodsRef.current;
    if (cached?.companyId === companyId) return cached.periods;

    const { data, error } = await supabase
      .from('accounting_periods')
      .select('id,period_name,start_date,end_date,status')
      .eq('company_id', companyId)
      .in('status', ['closed', 'locked']);

    if (error) throw error;

    const periods = (data || []) as AccountingPeriodRow[];
    closedAccountingPeriodsRef.current = { companyId, periods };
    return periods;
  };
  const clearImportResultForFile = (fileId: string) => {
    setImportResults((current) => {
      const next = { ...current };
      delete next[fileId];
      return next;
    });
  };
  const recordFileOutcome = (
    file: ParsedExcelFile,
    outcome: Omit<ImportFileOutcome, 'fileId' | 'fileName' | 'customerName' | 'updatedAt'>,
  ) => {
    setFileOutcomes((current) => ({
      ...current,
      [file.id]: {
        fileId: file.id,
        fileName: file.fileName,
        customerName: file.customerName,
        updatedAt: new Date().toISOString(),
        ...outcome,
      },
    }));
  };
  const runAiImportReview = async (mode: 'auto' | 'manual' = 'manual') => {
    if (!companyId || files.length === 0) return;

    const session = buildExcelImportAiReviewSession({
      files,
      fileOutcomes,
      importResults,
      matchedContractsByFile,
      selectedFileId: selectedFile?.id || null,
      contractMatchAnalysis,
    });
    const requestKey = JSON.stringify({
      sessionId,
      totals: session.totals,
      selectedFileId: selectedFile?.id || null,
      fileStatuses: session.files.map((file: any) => [file.fileId, file.status, file.hasMatchedContract, file.reason, file.matchConfidence]),
    });

    if (mode === 'auto' && aiReviewRequestKeyRef.current === requestKey) return;

    aiReviewRequestKeyRef.current = requestKey;
    setIsAiReviewLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('excel-import-ai-review', {
        body: { session },
      });

      if (error) throw new Error(error.message);
      if (data?.summary && Array.isArray(data?.insights)) {
        setAiReview(data as ExcelImportAiReview);
      }
    } catch (error) {
      console.warn('[ExcelPaymentImport] AI review unavailable:', error);
      if (mode === 'manual') {
        toast.warning('تعذر تشغيل LongCat الآن، وسيبقى التحليل المحلي ظاهرًا.');
      }
    } finally {
      setIsAiReviewLoading(false);
    }
  };
  const prepareAgentPlan = async () => {
    if (!companyId || !selectedFile || !matchedContract) return null;
    setIsAgentPlanLoading(true);
    try {
      const plan = await planExcelImportWithAgent({
        companyId,
        contractId: matchedContract.id,
        file: selectedFile,
      });
      setAgentPlan(plan);
      return plan;
    } catch (error) {
      console.error('[ExcelPaymentImport] execution agent planning failed:', error);
      toast.error('تعذر إنشاء خطة وكيل الاستيراد. لم يتم تنفيذ أي حركة مالية.');
      return null;
    } finally {
      setIsAgentPlanLoading(false);
    }
  };
  const applySuggestedContractMatch = async (alternative: ContractMatchAlternative) => {
    if (!selectedFile || !companyId) return;

    setRememberingContractFileId(selectedFile.id);
    try {
      const { error: rememberError } = await (supabase as any).rpc(
        'remember_excel_import_contract_match_v1',
        {
          p_company_id: companyId,
          p_content_hash: selectedFile.id,
          p_contract_id: alternative.contract.id,
          p_file_name: selectedFile.fileName,
          p_customer_name: selectedFile.customerName || null,
          p_plate: selectedFile.plateNumber || null,
        },
      );
      if (rememberError) throw rememberError;

      const cleanedSelectedFile: ParsedExcelFile = {
        ...selectedFile,
        warnings: selectedFile.warnings.filter((warning) => !isContractMatchWarning(warning)),
        status: selectedFile.status === 'empty' || selectedFile.status === 'error' ? selectedFile.status : 'ready',
      };
      const reasons = [
        'تم اختيار هذا العقد يدويًا وحفظ القرار لاستخدامه عند رفع الملف نفسه لاحقًا.',
        ...alternative.reasons,
      ];

      manualMatchedFileIdsRef.current.add(selectedFile.id);
      setMatchedContract(alternative.contract);
      setContractMatchAnalysis({
        contract: alternative.contract,
        confidence: alternative.confidence,
        reasons,
        alternatives: contractMatchAnalysis?.alternatives || [alternative],
      });
      setMatchedContractsByFile((current) => ({ ...current, [selectedFile.id]: alternative.contract }));
      setFileContractMatchState(selectedFile, true);
      recordFileOutcome(selectedFile, {
        status: 'pending',
        message: `تم اختيار العقد ${alternative.contract.contract_number} يدويًا وحفظ القرار للمستقبل.`,
        details: [
          ...summarizeFileAnalysis(cleanedSelectedFile, alternative.contract),
          ...reasons.map((reason) => `سبب المطابقة: ${reason}`),
        ],
        contractNumber: alternative.contract.contract_number,
      });
      toast.success(`تم ربط الملف بالعقد ${alternative.contract.contract_number} وحفظ الاختيار. لن يطلب النظام تحديد العقد لهذا الملف مرة أخرى.`);
    } catch (error) {
      console.error('[ExcelPaymentImport] failed to remember manual contract match:', error);
      toast.error(translateExcelImportError(error) || errorMessage(error) || 'تعذر حفظ اختيار العقد. لم يتم تغيير المطابقة.');
    } finally {
      setRememberingContractFileId(null);
    }
  };
  const clearImportSession = () => {
    if (companyId) {
      localStorage.removeItem(getImportSessionStorageKey(companyId));
    }
    setFiles([]);
    setSelectedId(null);
    setMatchedContract(null);
    setContractMatchAnalysis(null);
    setManualContractSearch('');
    setManualContractResults([]);
    setRememberingContractFileId(null);
    contractCandidatesRef.current = null;
    closedAccountingPeriodsRef.current = null;
    approvalCacheByContractRef.current.clear();
    manualMatchedFileIdsRef.current.clear();
    setMatchedContractsByFile({});
    setImportResults({});
    setFileOutcomes({});
    setAiReview(null);
    setAgentPlan(null);
    aiReviewRequestKeyRef.current = '';
    setApprovalProgress(null);
    setBulkApprovalProgress(null);
    setSessionId(buildImportSessionId());
    setIsEditMode(false);
    setEditBaselineRows(null);
    setEditReviewDialogOpen(false);
    toast.success('تم مسح جلسة الرفع الحالية.');
  };
  const setFileContractMatchState = (file: ParsedExcelFile, hasMatch: boolean) => {
    setFiles((currentFiles) => {
      let changed = false;
      const nextFiles = currentFiles.map((currentFile) => {
        if (currentFile.id !== file.id) return currentFile;

        const warning = contractMatchWarning(currentFile);
        const warnings = hasMatch
          ? currentFile.warnings.filter((item) => item !== warning && !isContractMatchWarning(item))
          : Array.from(new Set([...currentFile.warnings, warning]));

        const updated: ParsedExcelFile = {
          ...currentFile,
          warnings,
          status: currentFile.status === 'empty' || currentFile.status === 'error'
            ? currentFile.status
            : hasBlockingImportWarnings(warnings)
              ? 'review_required'
              : 'ready',
        };
        
        const warningsChanged =
          updated.warnings.length !== currentFile.warnings.length ||
          updated.warnings.some((item, index) => item !== currentFile.warnings[index]);
        const statusChanged = updated.status !== currentFile.status;

        if (!warningsChanged && !statusChanged) return currentFile;

        changed = true;
        return updated;
      });

      return changed ? nextFiles : currentFiles;
    });
  };
  const executeManualContractSearch = async () => {
    if (!companyId || !selectedFile) return;

    setIsManualContractSearchLoading(true);
    try {
      const contracts = await getContractCandidatesForSession();
      const results = await searchContractMatches(companyId, selectedFile, manualContractSearch, contracts);
      setManualContractResults(results);
      if (results.length === 0) {
        toast.warning('لم يتم العثور على عقود مطابقة للبحث الحالي.');
      }
    } catch (error) {
      console.error('Manual contract search failed:', error);
      toast.error('تعذر البحث عن العقود. حاول مرة أخرى.');
    } finally {
      setIsManualContractSearchLoading(false);
    }
  };
  const approvalSummary = useMemo(() => buildApprovalSummary(selectedFile), [selectedFile]);
  useEffect(() => {
    setAgentPlan(null);
  }, [selectedFile?.id, matchedContract?.id]);
  const editChanges = useMemo(
    () => buildRowEditChanges(editBaselineRows, selectedFile?.rows || null),
    [editBaselineRows, selectedFile?.rows],
  );
  const approvalBlockers = useMemo(() => {
    const blockers = [...approvalSummary.blockers];
    if (!companyId) blockers.push('لم يتم تحديد الشركة.');
    if (!matchedContract) blockers.push('لم تتم مطابقة الملف مع عقد في النظام.');
    if (financeAccess.isLoading) blockers.push('جاري التحقق من صلاحيات المالية.');
    return blockers;
  }, [approvalSummary.blockers, companyId, matchedContract, financeAccess.isLoading]);
  const selectedFileAiDecision = useMemo(
    () => {
      const aiFileReview = selectedFile ? aiReview?.fileReviews.find((review) => review.fileId === selectedFile.id) : null;
      if (aiFileReview) {
        return {
          tone: aiFileReview.riskLevel === 'high' ? 'danger' : aiFileReview.riskLevel === 'medium' ? 'warning' : 'success',
          title: `${aiFileReview.title} - ثقة ${aiFileReview.confidence}%`,
          description: `${aiFileReview.explanation} الإجراء المقترح: ${aiFileReview.recommendedAction}`,
        } satisfies ImportAiInsight;
      }

      return buildSelectedFileAiDecision({
        file: selectedFile,
        outcome: selectedOutcome,
        result: importResult,
        matchedContract,
        approvalBlockers,
      });
    },
    [aiReview, approvalBlockers, importResult, matchedContract, selectedFile, selectedOutcome],
  );
  const contractMatchReviewAlternatives = useMemo(() => {
    if (!contractMatchAnalysis) return [];
    return contractMatchAnalysis.alternatives.filter(
      (alternative) => alternative.contract.id !== contractMatchAnalysis.contract?.id,
    );
  }, [contractMatchAnalysis]);

  useEffect(() => {
    contractCandidatesRef.current = null;
    closedAccountingPeriodsRef.current = null;
    approvalCacheByContractRef.current.clear();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    try {
      const raw = localStorage.getItem(getImportSessionStorageKey(companyId));
      if (raw) {
        const snapshot = JSON.parse(raw) as ImportSessionSnapshot;
        if (
          snapshot.version === IMPORT_SESSION_VERSION &&
          snapshot.companyId === companyId &&
          Array.isArray(snapshot.files) &&
          snapshot.files.length > 0
        ) {
          setSessionId(snapshot.sessionId || buildImportSessionId());
          setFiles(snapshot.files);
          setSelectedId(snapshot.selectedId || snapshot.files[0]?.id || null);
          setImportResults(snapshot.importResults || {});
          setMatchedContractsByFile(snapshot.matchedContractsByFile || {});
          setFileOutcomes(snapshot.fileOutcomes || {});
          toast.info(`تم استرجاع جلسة رفع محفوظة تحتوي على ${snapshot.files.length} ملف.`);
        }
      }
    } catch (error) {
      console.warn('Could not restore Excel import session:', error);
    } finally {
      setHasLoadedStoredSession(true);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !hasLoadedStoredSession) return;

    const storageKey = getImportSessionStorageKey(companyId);
    if (files.length === 0) {
      localStorage.removeItem(storageKey);
      return;
    }

    const snapshot: ImportSessionSnapshot = {
      version: IMPORT_SESSION_VERSION,
      sessionId,
      companyId,
      savedAt: new Date().toISOString(),
      files,
      selectedId,
      importResults,
      matchedContractsByFile,
      fileOutcomes,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch (error) {
      console.warn('Could not persist Excel import session:', error);
    }
  }, [
    companyId,
    fileOutcomes,
    files,
    hasLoadedStoredSession,
    importResults,
    matchedContractsByFile,
    selectedId,
    sessionId,
  ]);

  useEffect(() => {
    let isMounted = true;

    const runMatch = async () => {
      setMatchedContract(null);
      setContractMatchAnalysis(null);
      setManualContractSearch('');
      setManualContractResults([]);
      if (!companyId || !selectedFile) return;

      const manuallySelectedContract = matchedContractsByFile[selectedFile.id];
      if (manualMatchedFileIdsRef.current.has(selectedFile.id) && manuallySelectedContract) {
        const manualAnalysis: ContractMatchAnalysis = {
          contract: manuallySelectedContract,
          confidence: 100,
          reasons: ['تم اختيار هذا العقد يدويًا، لذلك لن يتم استبداله بالمطابقة التلقائية.'],
          alternatives: [{
            contract: manuallySelectedContract,
            confidence: 100,
            reasons: ['تم اختيار هذا العقد يدويًا.'],
          }],
        };
        setMatchedContract(manuallySelectedContract);
        setContractMatchAnalysis(manualAnalysis);
        setFileContractMatchState(selectedFile, true);
        return;
      }

      setIsMatchingContract(true);
      try {
        const contracts = await getContractCandidatesForSession();
        const analysis = await analyzeContractMatch(companyId, selectedFile, contracts);
        const match = analysis.contract;
        if (isMounted) {
          setMatchedContract(match);
          setContractMatchAnalysis(analysis);
          setMatchedContractsByFile((current) => {
            if (match) return { ...current, [selectedFile.id]: match };
            const next = { ...current };
            delete next[selectedFile.id];
            return next;
          });
          setFileContractMatchState(selectedFile, Boolean(match));
          recordFileOutcome(selectedFile, {
            status: match ? 'pending' : 'review_required',
            message: match
              ? `تمت مطابقة الملف مع العقد ${match.contract_number} بنسبة ثقة ${analysis.confidence}%.`
              : contractMatchWarning(selectedFile),
            details: [
              ...summarizeFileAnalysis(selectedFile, match),
              ...analysis.reasons.map((reason) => `سبب المطابقة: ${reason}`),
            ],
            contractNumber: match?.contract_number,
          });

          if (!match && !selectedFile.warnings.includes(contractMatchWarning(selectedFile))) {
            toast.error(contractMatchWarning(selectedFile));
          }
        }
      } catch (error) {
        console.error('Excel import contract matching failed:', error);
        if (isMounted) {
          setMatchedContract(null);
          setContractMatchAnalysis(null);
          setMatchedContractsByFile((current) => {
            const next = { ...current };
            delete next[selectedFile.id];
            return next;
          });
          setFileContractMatchState(selectedFile, false);
          recordFileOutcome(selectedFile, {
            status: 'failed',
            message: translateExcelImportError(error) || errorMessage(error) || contractMatchWarning(selectedFile),
            details: summarizeFileAnalysis(selectedFile),
          });
          if (!selectedFile.warnings.includes(contractMatchWarning(selectedFile))) {
            toast.error(contractMatchWarning(selectedFile));
          }
        }
      } finally {
        if (isMounted) setIsMatchingContract(false);
      }
    };

    runMatch();
    return () => {
      isMounted = false;
    };
  }, [companyId, selectedFile]);

  useEffect(() => {
    if (!companyId || files.length === 0 || isParsing || isBulkApproving || isApproving) return;

    const timer = window.setTimeout(() => {
      runAiImportReview('auto');
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    companyId,
    files,
    fileOutcomes,
    importResults,
    matchedContractsByFile,
    selectedId,
    contractMatchAnalysis?.confidence,
    isParsing,
    isBulkApproving,
    isApproving,
  ]);

  const totals = useMemo(() => ({
    files: files.length,
    ready: files.filter((file) => file.status === 'ready').length,
    review: files.filter((file) => file.status === 'review_required').length,
    approved: files.filter((file) => Boolean(importResults[file.id])).length,
    failed: Object.values(fileOutcomes).filter((outcome) => outcome.status === 'failed').length,
    pendingApproval: files.filter((file) => file.status === 'ready' && !importResults[file.id]).length,
    payments: files.reduce((sum, file) => sum + file.totalPayments, 0),
  }), [files, fileOutcomes, importResults]);
  const importAiInsights = useMemo(
    () => aiReview?.insights?.length ? aiReview.insights : buildImportAiInsights({ files, fileOutcomes, importResults }),
    [aiReview, files, fileOutcomes, importResults],
  );

  const filteredFiles = useMemo(() => {
    const needle = normalizeArabic(searchTerm);
    if (!needle) return files;
    return files.filter((file) =>
      normalizeArabic(file.fileName).includes(needle) ||
      normalizeArabic(file.customerName).includes(needle) ||
      normalizeArabic(file.plateNumber).includes(needle) ||
      normalizeArabic(file.phone).includes(needle)
    );
  }, [files, searchTerm]);

  const handleFiles = async (fileList: FileList | null) => {
    const excelFiles = Array.from(fileList || []).filter((file) => /\.(xlsx|xls)$/i.test(file.name));
    if (excelFiles.length === 0) return;

    setIsParsing(true);
    try {
      const preparedFiles = await mapInBatches(
        excelFiles,
        EXCEL_PARSE_BATCH_SIZE,
        async (file) => {
          const buffer = await file.arrayBuffer();
          return {
            file,
            buffer,
            contentId: await buildWorkbookContentId(buffer),
          };
        },
      );
      const { unique: uniqueFiles, duplicates } = deduplicateWorkbookInputs(preparedFiles);
      const parsed = await mapInBatches(
        uniqueFiles,
        EXCEL_PARSE_BATCH_SIZE,
        async ({ file, buffer, contentId }) => {
          try {
            return await parseWorkbookFile(file, buffer, contentId);
          } catch (error) {
            return {
              id: contentId,
              fileName: file.name,
              customerName: '',
              idNumber: '',
              phone: '',
              plateNumber: '',
              contractDate: '',
              monthlyRent: 0,
              rows: [],
              totalPayments: 0,
              totalRemaining: 0,
              confidence: 0,
              warnings: [error instanceof Error ? error.message : 'تعذر قراءة الملف.'],
              status: 'error' as const,
            };
          }
        },
      );

      if (duplicates.length > 0) {
        toast.info(`تم تجاهل ${duplicates.length} ملف مكرر لأن محتواه موجود ضمن الدفعة الحالية.`);
      }

      setSessionId(buildImportSessionId());
      setAiReview(null);
      aiReviewRequestKeyRef.current = '';
      setFiles(parsed);
      setSelectedId(parsed[0]?.id || null);
      setIsEditMode(false);
      setEditBaselineRows(null);
      setEditReviewDialogOpen(false);
      setImportResults({});
      setFileOutcomes(
        parsed.reduce<ImportFileOutcomesByFile>((acc, file) => {
          acc[file.id] = {
            fileId: file.id,
            fileName: file.fileName,
            customerName: file.customerName,
            status: file.status === 'ready' ? 'pending' : file.status === 'review_required' ? 'review_required' : 'skipped',
            message: file.status === 'ready'
              ? 'جاهز للاعتماد بعد المطابقة.'
              : file.status === 'review_required'
                ? 'يحتاج مراجعة قبل الاعتماد.'
                : 'لا يمكن اعتماده قبل معالجة أخطاء القراءة.',
            details: summarizeFileAnalysis(file),
            updatedAt: new Date().toISOString(),
          };
          return acc;
        }, {})
      );
      setApprovalProgress(null);
      setBulkApprovalProgress(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleEditToggle = () => {
    if (!selectedFile) return;

    if (!isEditMode) {
      setEditBaselineRows(selectedFile.rows.map((row) => ({ ...row })));
      setEditReviewDialogOpen(false);
      setIsEditMode(true);
      return;
    }

    if (editChanges.length > 0) {
      setEditReviewDialogOpen(true);
      return;
    }

    setIsEditMode(false);
    setEditBaselineRows(null);
  };

  const confirmEditChanges = () => {
    setIsEditMode(false);
    setEditBaselineRows(null);
    setEditReviewDialogOpen(false);
    toast.success('تم اعتماد التعديلات في الجدول، يمكنك الآن اعتماد الدفعات.');
  };

  const updateRowValue = (
    rowNumber: number,
    field: 'paymentAmount' | 'remainingAmount' | 'maintenanceAmount' | 'delayDays' | 'delayValue' | 'trafficAmount',
    value: number,
  ) => {
    if (!selectedFile) return;

    clearImportResultForFile(selectedFile.id);
    setFiles((currentFiles) =>
      currentFiles.map((file) => {
        if (file.id !== selectedFile.id) return file;

        const rows = file.rows.map((row) => {
          if (row.rowNumber !== rowNumber) return row;

          const updatedRow = { ...row, [field]: value };

          if (field === 'paymentAmount') {
            updatedRow.remainingAmount = inferRemainingAmount(null, value, file.monthlyRent);
          }

          if ((field === 'paymentAmount' || field === 'remainingAmount') && (normalizeEditableValue(updatedRow.remainingAmount) === 0 || normalizeEditableValue(updatedRow.paymentAmount) > 0) && normalizeEditableValue(updatedRow.delayDays) > 0) {
            updatedRow.delayDays = 0;
            updatedRow.delayValue = 0;
          }

          if (field === 'delayDays') {
            updatedRow.delayValue = calculateLateFee(value);
          }

          if (field === 'trafficAmount') {
            updatedRow.trafficAmounts = value > 0 ? [value] : [];
          }

          return updatedRow;
        });

        return {
          ...file,
          rows,
          totalPayments: rows.reduce((sum, row) => sum + (row.paymentAmount || 0), 0),
          totalRemaining: rows.reduce((sum, row) => sum + (row.remainingAmount || 0), 0),
        };
      })
    );
  };

  const openClosedPeriodsForRows = async (file: ParsedExcelFile) => {
    if (!companyId) return [];
    const rpcClient = supabase as unknown as RpcClient;
    const paymentDates = file.rows
      .map((row) => parseMonthToDate(row.month))
      .filter((date): date is string => Boolean(date))
      .sort();
    const uniquePaymentDates = Array.from(new Set(paymentDates));

    if (uniquePaymentDates.length === 0) return [];
    const minDate = uniquePaymentDates[0];
    const maxDate = uniquePaymentDates[uniquePaymentDates.length - 1];

    const closedPeriods = (await getClosedAccountingPeriodsForSession()).filter((period) =>
      period.start_date <= maxDate &&
      period.end_date >= minDate &&
      uniquePaymentDates.some((date) => date >= period.start_date && date <= period.end_date)
    );

    if (closedPeriods.length === 0) return [];
    if (!financeAccess.can('finance.period.reopen')) {
      throw new Error('توجد فترات مالية مغلقة، ولا تملك صلاحية فتحها مؤقتًا لاعتماد الدفعات التاريخية.');
    }

    const reopened: Array<{ period: AccountingPeriodRow; requestId: string }> = [];
    for (const period of closedPeriods) {
      let { data: requestId, error: reopenError } = await rpcClient.rpc(
        'open_period_for_historical_cash_payments',
        {
          p_company_id: companyId,
          p_accounting_period_id: period.id,
          p_reason: `اعتماد دفعات كاش تاريخية من ملف Excel للفترة ${period.period_name}`,
          p_hours: 2,
        }
      );

      if (reopenError && isMissingRpcError(reopenError)) {
        const { data: fallbackRequestId, error: requestError } = await rpcClient.rpc(
          'request_financial_period_reopening',
          {
            p_company_id: companyId,
            p_accounting_period_id: period.id,
            p_reason: `اعتماد دفعات كاش تاريخية من ملف Excel للفترة ${period.period_name}`,
          }
        );
        if (requestError) throw requestError;

        const { error: approveError } = await rpcClient.rpc(
          'approve_financial_period_reopening',
          {
            p_request_id: fallbackRequestId,
            p_approved_by: null,
            p_hours: 2,
          }
        );
        if (approveError) throw approveError;
        requestId = fallbackRequestId;
        reopenError = null;
      }

      if (reopenError) throw reopenError;
      reopened.push({ period, requestId: String(requestId) });
    }

    return reopened;
  };

  const closeReopenedPeriods = async (reopenedPeriods: Array<{ period: AccountingPeriodRow; requestId: string }>) => {
    const rpcClient = supabase as unknown as RpcClient;
    for (const reopened of reopenedPeriods) {
      try {
        await rpcClient.rpc('close_reopened_financial_period', {
          p_request_id: reopened.requestId,
        });
      } catch (error) {
        console.warn('Could not close reopened period after Excel import:', error);
      }
    }
  };

  const createLateFeeIfNeeded = async (
    invoice: ImportInvoice,
    row: ParsedPaymentRow,
    contract: MatchedContract,
    file: ParsedExcelFile,
    approvalCache: ApprovalCache,
  ) => {
    if (!companyId || !row.delayValue || row.delayValue <= 0) return false;

    if (approvalCache.lateFeeInvoiceIds.has(invoice.id)) return false;

    const { error } = await supabase.from('late_fees').insert({
      company_id: companyId,
      invoice_id: invoice.id,
      contract_id: contract.id,
      original_amount: Number(invoice.total_amount) || contract.monthly_amount || file.monthlyRent || 0,
      fee_amount: row.delayValue,
      days_overdue: row.delayDays || 0,
      fee_type: 'historical_excel_import',
      status: 'applied',
      applied_by: user?.id || null,
      applied_at: new Date().toISOString(),
    });

    if (error) throw error;
    approvalCache.lateFeeInvoiceIds.add(invoice.id);
    return true;
  };

  const createTrafficViolationsIfNeeded = async (
    row: ParsedPaymentRow,
    contract: MatchedContract,
    file: ParsedExcelFile,
    approvalCache: ApprovalCache,
  ) => {
    const trafficAmounts = row.trafficAmounts?.length
      ? row.trafficAmounts
      : row.trafficAmount && row.trafficAmount > 0
        ? [row.trafficAmount]
        : [];

    if (!companyId || trafficAmounts.length === 0) return 0;

    const monthDate = parseMonthToDate(row.month);
    if (!monthDate) return 0;

    let createdCount = 0;

    for (let index = 0; index < trafficAmounts.length; index += 1) {
      const amount = trafficAmounts[index];
      const sequence = String(index + 1).padStart(2, '0');
      const penaltyNumber = `HIST-${contract.id.slice(0, 8)}-${row.month.replace('/', '-')}-${sequence}`;
      if (approvalCache.penaltyNumbers.has(penaltyNumber)) continue;

      const { error } = await supabase.from('penalties').insert({
        company_id: companyId,
        penalty_number: penaltyNumber,
        penalty_date: monthDate,
        amount,
        vehicle_id: contract.vehicle_id,
        vehicle_plate: contract.vehicles?.plate_number || contract.license_plate || file.plateNumber || null,
        customer_id: contract.customer_id,
        contract_id: contract.id,
        violation_type: 'مخالفة مرورية تاريخية من ملف Excel',
        reason: 'استيراد تاريخي من ملف Excel',
        status: 'pending',
        payment_status: 'unpaid',
        created_by: user?.id || null,
        notes: `تم إنشاؤها من ملف ${file.fileName} للشهر ${row.month} - مخالفة ${index + 1} من ${trafficAmounts.length}`,
      });

      if (error) throw error;
      approvalCache.penaltyNumbers.add(penaltyNumber);
      createdCount += 1;
    }

    return createdCount;
  };

  const createMaintenanceIfNeeded = async (
    row: ParsedPaymentRow,
    contract: MatchedContract,
    file: ParsedExcelFile,
    approvalCache: ApprovalCache,
  ) => {
    const amount = Number(row.maintenanceAmount || 0);
    const maintenanceDate = parseMonthToDate(row.month);
    if (!companyId || amount <= 0 || !maintenanceDate || !contract.vehicle_id) return false;

    const maintenanceNumber = `HIST-XLS-${contract.id.slice(0, 8)}-${row.month.replace('/', '-')}`;
    if (approvalCache.maintenanceNumbers.has(maintenanceNumber)) return false;

    const { error } = await supabase.from('vehicle_maintenance').insert({
      company_id: companyId,
      vehicle_id: contract.vehicle_id,
      maintenance_number: maintenanceNumber,
      maintenance_type: 'historical_excel_import',
      description: `صيانة تاريخية مستوردة من ملف Excel للعقد ${contract.contract_number}`,
      actual_cost: amount,
      estimated_cost: amount,
      scheduled_date: maintenanceDate,
      completed_date: maintenanceDate,
      status: 'completed',
      priority: 'medium',
      expense_recorded: false,
      created_by: user?.id || null,
      notes: `المصدر: ${file.fileName} - الفترة ${row.month}`,
    });
    if (error) throw error;
    approvalCache.maintenanceNumbers.add(maintenanceNumber);
    return true;
  };

  const loadApprovalCache = async (contract: MatchedContract): Promise<ApprovalCache> => {
    if (!companyId) {
      return {
        invoicesByMonth: new Map(),
        paymentsByInvoiceId: new Map(),
        paymentsByReference: new Map(),
        lateFeeInvoiceIds: new Set(),
        penaltyNumbers: new Set(),
        maintenanceNumbers: new Set(),
      };
    }

    const [invoicesResult, paymentsResult, lateFeesResult, penaltiesResult, maintenanceResult] = await Promise.all([
      supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, due_date, total_amount, paid_amount, balance_due, payment_status')
        .eq('company_id', companyId)
        .eq('contract_id', contract.id)
        .limit(500),
      supabase
        .from('payments')
        .select('id,payment_number,payment_date,reference_number,amount,invoice_id,contract_id,payment_status')
        .eq('company_id', companyId)
        .eq('contract_id', contract.id)
        .eq('payment_status', 'completed')
        .limit(2000),
      supabase
        .from('late_fees')
        .select('invoice_id')
        .eq('company_id', companyId)
        .eq('contract_id', contract.id)
        .eq('fee_type', 'historical_excel_import')
        .limit(1000),
      supabase
        .from('penalties')
        .select('penalty_number')
        .eq('company_id', companyId)
        .eq('contract_id', contract.id)
        .like('penalty_number', `HIST-${contract.id.slice(0, 8)}-%`)
        .limit(2000),
      supabase
        .from('vehicle_maintenance')
        .select('maintenance_number')
        .eq('company_id', companyId)
        .eq('vehicle_id', contract.vehicle_id || '')
        .like('maintenance_number', `HIST-XLS-${contract.id.slice(0, 8)}-%`)
        .limit(1000),
    ]);

    if (invoicesResult.error) throw invoicesResult.error;
    if (paymentsResult.error) throw paymentsResult.error;
    if (lateFeesResult.error) throw lateFeesResult.error;
    if (penaltiesResult.error) throw penaltiesResult.error;
    if (maintenanceResult.error) throw maintenanceResult.error;

    const cache: ApprovalCache = {
      invoicesByMonth: new Map(),
      paymentsByInvoiceId: new Map(),
      paymentsByReference: new Map(),
      lateFeeInvoiceIds: new Set(),
      penaltyNumbers: new Set(),
      maintenanceNumbers: new Set(),
    };

    ((invoicesResult.data || []) as ImportInvoice[]).forEach((invoice) => cacheInvoice(cache, invoice));
    ((paymentsResult.data || []) as ImportPayment[]).forEach((payment) => cachePayment(cache, payment));
    ((lateFeesResult.data || []) as Array<{ invoice_id: string | null }>).forEach((fee) => {
      if (fee.invoice_id) cache.lateFeeInvoiceIds.add(fee.invoice_id);
    });
    ((penaltiesResult.data || []) as Array<{ penalty_number: string | null }>).forEach((penalty) => {
      if (penalty.penalty_number) cache.penaltyNumbers.add(penalty.penalty_number);
    });
    ((maintenanceResult.data || []) as Array<{ maintenance_number: string | null }>).forEach((maintenance) => {
      if (maintenance.maintenance_number) cache.maintenanceNumbers.add(maintenance.maintenance_number);
    });

    return cache;
  };

  const getApprovalCacheForContract = async (contract: MatchedContract): Promise<ApprovalCache> => {
    const cached = approvalCacheByContractRef.current.get(contract.id);
    if (cached) return cached;

    const cache = await loadApprovalCache(contract);
    approvalCacheByContractRef.current.set(contract.id, cache);
    return cache;
  };

  const approveFile = async (
    file: ParsedExcelFile,
    contract: MatchedContract,
    onProgress?: (progress: ApprovalProgress) => void,
  ): Promise<ImportResult> => {
    if (!companyId) throw new Error('لم يتم تحديد الشركة.');

    const reopenedPeriods: Array<{ period: AccountingPeriodRow; requestId: string }> = [];

    try {
      reopenedPeriods.push(...await openClosedPeriodsForRows(file));

      let payments = 0;
      let invoicesCreated = 0;
      let lateFees = 0;
      let trafficViolations = 0;
      let maintenanceRecords = 0;
      let skipped = 0;
      let payableRows = 0;
      let missingInvoiceRows = 0;
      let unallocatedPaymentTotal = 0;
      const skippedReasons: string[] = [];
      const paymentReport: PaymentReportRow[] = [];
      const pendingPaymentRows: Array<{
        row: ParsedPaymentRow;
        invoice: ImportInvoice;
        amount: number;
        paymentDate: string;
        stableReference: string;
      }> = [];
      const plannedPaymentAmountsByInvoiceId = new Map<string, number>();
      const approvalCache = await getApprovalCacheForContract(contract);
      const preparedRows = prepareApprovalRows(file.rows);

      for (let index = 0; index < preparedRows.length; index += 1) {
        const { row, monthDate, monthKey } = preparedRows[index];
        const paymentAmount = row.paymentAmount || 0;
        if (paymentAmount > 0) payableRows += 1;

        onProgress?.({
          current: index + 1,
          total: preparedRows.length,
          label: `معالجة ${file.customerName || file.fileName} - شهر ${row.month}: مطابقة الفاتورة وتسجيل الدفعات...`,
        });

        if (await createMaintenanceIfNeeded(row, contract, file, approvalCache)) maintenanceRecords += 1;
        trafficViolations += await createTrafficViolationsIfNeeded(row, contract, file, approvalCache);

        if (paymentAmount <= 0 && Number(row.delayValue || 0) <= 0) {
          continue;
        }

        let invoice = monthKey ? approvalCache.invoicesByMonth.get(monthKey) || null : null;
        let created = false;

        if (!invoice) {
          const invoiceResult = await createOrFindMonthlyInvoice({
            companyId,
            contract,
            row,
            monthlyRent: file.monthlyRent || contract.monthly_amount,
          });
          invoice = invoiceResult.invoice;
          created = invoiceResult.created;
          if (invoice) cacheInvoice(approvalCache, invoice);
        }

        if (!invoice) {
          if (paymentAmount > 0) {
            missingInvoiceRows += 1;
            skippedReasons.push(`لم يتم العثور على فاتورة شهر ${row.month} للعقد ${contract.contract_number}، لذلك لم يتم تسجيل دفعة هذا الشهر.`);
          }
          skipped += 1;
          continue;
        }

        if (created) invoicesCreated += 1;

        const alignedInvoice = monthDate
          ? await alignInvoiceDueDateToExcelMonth({ companyId, invoice, monthDate })
          : invoice;
        cacheInvoice(approvalCache, alignedInvoice);

        const invoiceForPayment = calculateInvoiceBalanceFromCachedPayments(approvalCache, alignedInvoice);
        if (await createLateFeeIfNeeded(invoiceForPayment, row, contract, file, approvalCache)) lateFees += 1;

        if (paymentAmount <= 0) continue;

        const existingExcelPayment = findCachedHistoricalPayment(
          approvalCache,
          alignedInvoice,
          row,
          contract,
          file,
          paymentAmount,
          monthDate,
        );
        if (existingExcelPayment) {
          paymentReport.push({
            month: row.month,
            amount: Number(existingExcelPayment.amount || paymentAmount),
            customerName: getContractCustomerDisplayName(contract),
            contractNumber: contract.contract_number,
            contractPath: `/contracts/${encodeURIComponent(contract.contract_number)}`,
            invoiceId: alignedInvoice.id,
            invoiceNumber: alignedInvoice.invoice_number || '-',
            paymentId: String(existingExcelPayment.id || ''),
            paymentNumber: String(existingExcelPayment.payment_number || '-'),
            paymentDate: String(existingExcelPayment.payment_date || monthDate || alignedInvoice.invoice_date || alignedInvoice.due_date || ''),
            referenceNumber: String(existingExcelPayment.reference_number || '-'),
            destination: `payments.customer_id=${contract.customer_id} / payments.contract_id=${contract.id} / payments.invoice_id=${alignedInvoice.id}`,
          });
          payments += 1;
          continue;
        }

        if (!monthKey) {
          skippedReasons.push(`تعذر تحديد شهر الدفعة ${row.month} لتوزيعها على الفواتير.`);
          skipped += 1;
          continue;
        }

        const candidateInvoicesById = new Map<string, { monthKey: string; invoice: ImportInvoice }>();
        const refreshCandidateInvoices = () => {
          approvalCache.invoicesByMonth.forEach((candidateInvoice, cachedMonthKey) => {
            const candidateMonthKey = candidateInvoice.invoice_date?.slice(0, 7) || cachedMonthKey;
            if (candidateMonthKey < monthKey) return;
            const existingCandidate = candidateInvoicesById.get(candidateInvoice.id);
            if (!existingCandidate || candidateMonthKey < existingCandidate.monthKey) {
              candidateInvoicesById.set(candidateInvoice.id, { monthKey: candidateMonthKey, invoice: candidateInvoice });
            }
          });
          candidateInvoicesById.set(invoiceForPayment.id, { monthKey, invoice: invoiceForPayment });
        };
        const planAllocations = () => planHistoricalPaymentAllocations({
          sourceAmount: paymentAmount,
          sourceMonthKey: monthKey,
          invoices: [...candidateInvoicesById.values()].map(({ monthKey: candidateMonthKey, invoice: candidateInvoice }) => {
            const balancedInvoice = calculateInvoiceBalanceFromCachedPayments(approvalCache, candidateInvoice);
            return {
              invoiceId: candidateInvoice.id,
              monthKey: candidateMonthKey,
              totalAmount: Number(balancedInvoice.total_amount || 0),
              paidAmount: Number(balancedInvoice.paid_amount || 0) +
                Number(plannedPaymentAmountsByInvoiceId.get(candidateInvoice.id) || 0),
            };
          }),
        });

        refreshCandidateInvoices();
        let allocationPlan = planAllocations();
        let futureMonthKey = monthKey;
        const contractEndMonth = contract.end_date?.slice(0, 7) || monthKey;
        while (allocationPlan.unallocatedAmount > 0.01) {
          futureMonthKey = nextMonthKey(futureMonthKey);
          if (futureMonthKey > contractEndMonth) break;

          const hasFutureInvoice = [...candidateInvoicesById.values()]
            .some((candidate) => candidate.monthKey === futureMonthKey);
          if (!hasFutureInvoice) {
            const futureInvoiceResult = await createOrFindMonthlyInvoice({
              companyId,
              contract,
              row: { ...row, month: monthKeyToImportLabel(futureMonthKey), paymentAmount: 0 },
              monthlyRent: file.monthlyRent || contract.monthly_amount,
            });
            if (!futureInvoiceResult.invoice) break;
            if (futureInvoiceResult.created) invoicesCreated += 1;
            cacheInvoice(approvalCache, futureInvoiceResult.invoice);
          }

          refreshCandidateInvoices();
          allocationPlan = planAllocations();
        }

        for (const allocation of allocationPlan.allocations) {
          const target = candidateInvoicesById.get(allocation.invoiceId);
          if (!target) continue;
          const stableReference = buildHistoricalPaymentReference({
            fileIdentity: file.id,
            contractId: contract.id,
            invoiceId: target.invoice.id,
            month: row.month,
          });
          pendingPaymentRows.push({
            row,
            invoice: target.invoice,
            amount: allocation.amount,
            paymentDate: monthDate || invoiceForPayment.invoice_date || invoiceForPayment.due_date || new Date().toISOString().slice(0, 10),
            stableReference,
          });
          plannedPaymentAmountsByInvoiceId.set(
            target.invoice.id,
            Number(plannedPaymentAmountsByInvoiceId.get(target.invoice.id) || 0) + allocation.amount,
          );
        }

        if (allocationPlan.unallocatedAmount > 0.01) {
          unallocatedPaymentTotal += allocationPlan.unallocatedAmount;
          skippedReasons.push(
            `تعذر توزيع ${formatCurrency(allocationPlan.unallocatedAmount)} من دفعة شهر ${row.month} لعدم وجود أرصدة فواتير لاحقة كافية.`
          );
          skipped += 1;
        }
      }

      if (unallocatedPaymentTotal > 0.01) {
        throw new Error(
          `تعذر اعتماد الملف لأن ${formatCurrency(unallocatedPaymentTotal)} من الدفعات لا تملك أرصدة فواتير كافية للتوزيع. لم تُسجل دفعات الملف.`
        );
      }

      if (pendingPaymentRows.length > 0) {
        const { data: batchResult, error: batchError } = await supabase.rpc(
          'create_customer_payment_batch_v1',
          {
            p_company_id: companyId,
            p_customer_id: contract.customer_id,
            p_payment_method: 'cash',
            p_bank_id: null,
            p_account_id: null,
            p_currency: 'QAR',
            p_allocations: pendingPaymentRows.map((pending) => ({
              invoice_id: pending.invoice.id,
              contract_id: contract.id,
              payment_date: pending.paymentDate,
              amount: pending.amount,
              reference_number: pending.stableReference,
              notes: `دفعة كاش تاريخية مستوردة من Excel - ${file.fileName} - شهر ${pending.row.month}`,
            })),
            p_batch_idempotency_key: `excel:${file.id}:${contract.id}`,
            p_actor_id: user?.id || null,
          }
        );
        if (batchError) throw batchError;

        const batchPayments = ((batchResult as { payments?: Array<{ payment_id?: string }> } | null)?.payments || []);
        const paymentIds = batchPayments.map((item) => item.payment_id).filter((id): id is string => Boolean(id));
        if (paymentIds.length !== pendingPaymentRows.length) {
          throw new Error('لم تُرجع قاعدة البيانات جميع دفعات ملف Excel بعد الحفظ الذري.');
        }

        const { data: persistedPayments, error: persistedError } = await supabase
          .from('payments')
          .select('id,payment_number,payment_date,reference_number,amount,invoice_id,contract_id,payment_status')
          .eq('company_id', companyId)
          .in('id', paymentIds);
        if (persistedError) throw persistedError;
        const persistedById = new Map((persistedPayments || []).map((payment) => [payment.id, payment]));

        pendingPaymentRows.forEach((pending, index) => {
          const paymentId = paymentIds[index];
          const insertedPayment = persistedById.get(paymentId);
          if (!insertedPayment) {
            throw new Error(`تعذر تحميل الدفعة الذرية للفترة ${pending.row.month}.`);
          }
          cachePayment(approvalCache, insertedPayment as ImportPayment);
          paymentReport.push({
            month: pending.row.month,
            amount: pending.amount,
            customerName: getContractCustomerDisplayName(contract),
            contractNumber: contract.contract_number,
            contractPath: `/contracts/${encodeURIComponent(contract.contract_number)}`,
            invoiceId: pending.invoice.id,
            invoiceNumber: pending.invoice.invoice_number || '-',
            paymentId: insertedPayment.id,
            paymentNumber: insertedPayment.payment_number || '-',
            paymentDate: insertedPayment.payment_date || pending.paymentDate,
            referenceNumber: insertedPayment.reference_number || pending.stableReference,
            destination: `payments.customer_id=${contract.customer_id} / payments.contract_id=${contract.id} / payments.invoice_id=${pending.invoice.id}`,
          });
          payments += 1;
        });
      }

      if (payableRows > 0 && payments === 0 && missingInvoiceRows > 0) {
        const detail = Array.from(new Set(skippedReasons)).slice(0, 3).join(' ');
        throw new Error(
          `لم يتم تسجيل أي دفعة من الملف لأن الفواتير الشهرية المرتبطة بالعقد غير موجودة. ${detail}`
        );
      }

      await closeReopenedPeriods(reopenedPeriods);
      return { payments, invoicesCreated, lateFees, trafficViolations, maintenanceRecords, skipped, skippedReasons, paymentReport };
    } catch (error) {
      await closeReopenedPeriods(reopenedPeriods);
      throw error;
    }
  };

  const executeApproval = async () => {
    if (!selectedFile || !matchedContract || !companyId) return;
    if (approvalBlockers.length > 0) return;
    if (importResult) {
      toast.info('تم اعتماد هذا الملف بالفعل. ارفع الملف من جديد إذا كنت تريد معالجة نسخة أخرى.');
      return;
    }

    const executionPlan = agentPlan || await prepareAgentPlan();
    if (!executionPlan) return;

    const reviewReasons = agentPlanReviewReasons(executionPlan);
    if (reviewReasons.length > 0) {
      recordFileOutcome(selectedFile, {
        status: 'review_required',
        message: 'أوقف الوكيل التنفيذ لأن النسخة الجديدة تخفّض أو تحذف مبالغ سبق اعتمادها.',
        details: reviewReasons,
        contractNumber: matchedContract.contract_number,
      });
      toast.warning('توجد تخفيضات أو حركات محذوفة تحتاج موافقة على حركة عكسية. لم يتم تنفيذ أي تغيير.');
      return;
    }

    const noChangeResult: ImportResult = {
      payments: 0,
      invoicesCreated: 0,
      lateFees: 0,
      trafficViolations: 0,
      maintenanceRecords: 0,
      skipped: selectedFile.rows.length,
      skippedReasons: ['تحقق الوكيل من أن الملف أو جميع صفوفه سبق اعتمادها دون تغيير.'],
      paymentReport: [],
    };
    if (executionPlan.exactDuplicate || executionPlan.effectiveRows.length === 0) {
      setImportResults((current) => ({ ...current, [selectedFile.id]: noChangeResult }));
      recordFileOutcome(selectedFile, {
        status: 'skipped',
        message: 'تحقق الوكيل من أن الملف سبق اعتماده دون تغيير، لذلك لم يكرر أي حركة.',
        details: noChangeResult.skippedReasons,
        contractNumber: matchedContract.contract_number,
      });
      if (!executionPlan.exactDuplicate) {
        await completeExcelImportAgentPlan({
          companyId,
          versionId: executionPlan.versionId,
          success: true,
          result: { ...noChangeResult, agentDecision: 'verified_no_change' },
        });
      }
      toast.info('لا توجد تغييرات جديدة. لم يتم إنشاء أي دفعة أو مخالفة أو غرامة.');
      return;
    }

    const executableFile: ParsedExcelFile = {
      ...selectedFile,
      rows: applyAgentEffectiveRows(selectedFile.rows, executionPlan.effectiveRows),
    };

    setIsApproving(true);
    setApprovalProgress({ current: 0, total: selectedFile.rows.length, label: 'تهيئة الاعتماد وفتح الفترات المالية عند الحاجة...' });

    try {
      const result = await approveFile(executableFile, matchedContract, setApprovalProgress);
      await completeExcelImportAgentPlan({
        companyId,
        versionId: executionPlan.versionId,
        success: true,
        result: { ...result, agentActions: executionPlan.summary.actions },
      });
      setImportResults((current) => ({ ...current, [selectedFile.id]: result }));
      setMatchedContractsByFile((current) => ({ ...current, [selectedFile.id]: matchedContract }));
      recordFileOutcome(selectedFile, {
        status: 'approved',
        message: `تم اعتماد الملف وربطه بالعقد ${matchedContract.contract_number}.`,
        details: summarizeFileAnalysis(selectedFile, matchedContract, result),
        contractNumber: matchedContract.contract_number,
      });
      setApprovalProgress({
        current: selectedFile.rows.length,
        total: selectedFile.rows.length,
        label: 'اكتمل الاعتماد بنجاح.',
      });
      toast.success('تم اعتماد ملف Excel وربطه بالنظام المالي');
    } catch (error: unknown) {
      console.error('Excel approval failed:', error);
      try {
        await completeExcelImportAgentPlan({
          companyId,
          versionId: executionPlan.versionId,
          success: false,
          errorMessage: errorMessage(error),
        });
      } catch (completionError) {
        console.error('Could not record Excel agent failure:', completionError);
      }
      setApprovalProgress(null);
      recordFileOutcome(selectedFile, {
        status: 'failed',
        message: translateExcelImportError(error) || errorMessage(error) || 'فشل اعتماد ملف Excel',
        details: summarizeFileAnalysis(selectedFile, matchedContract),
        contractNumber: matchedContract.contract_number,
      });
      toast.error(translateExcelImportError(error) || 'فشل اعتماد ملف Excel');
    } finally {
      setIsApproving(false);
    }
  };

  const executeBulkApproval = async (mode: 'pending' | 'failed' = 'pending') => {
    if (!companyId || isBulkApproving) return;

    const pendingFiles = files.filter((file) => {
      if (file.status !== 'ready' || importResults[file.id]) return false;
      if (mode === 'failed') return fileOutcomes[file.id]?.status === 'failed';
      return true;
    });
    if (pendingFiles.length === 0) {
      toast.info(mode === 'failed' ? 'لا توجد ملفات فاشلة جاهزة لإعادة المحاولة.' : 'لا توجد ملفات جاهزة غير معتمدة.');
      return;
    }

    setIsBulkApproving(true);
    setBulkApprovalProgress({ current: 0, total: pendingFiles.length, fileName: pendingFiles[0]?.fileName || '' });

    let approvedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const failedReasons: string[] = [];

    try {
      for (let index = 0; index < pendingFiles.length; index += 1) {
        const file = pendingFiles[index];
        setBulkApprovalProgress({ current: index + 1, total: pendingFiles.length, fileName: file.customerName || file.fileName });

        const summary = buildApprovalSummary(file);
        if (summary.blockers.length > 0) {
          recordFileOutcome(file, {
            status: 'review_required',
            message: 'تم تخطي الملف لأنه يحتاج مراجعة قبل الاعتماد.',
            details: summary.blockers,
          });
          skippedCount += 1;
          continue;
        }

        const contracts = await getContractCandidatesForSession();
        const matchAnalysis = await analyzeContractMatch(companyId, file, contracts);
        const contract = matchAnalysis.contract;
        if (!contract) {
          setFileContractMatchState(file, false);
          recordFileOutcome(file, {
            status: 'review_required',
            message: contractMatchWarning(file),
            details: [
              ...summarizeFileAnalysis(file),
              ...matchAnalysis.reasons.map((reason) => `سبب عدم المطابقة: ${reason}`),
            ],
          });
          toast.error(contractMatchWarning(file));
          skippedCount += 1;
          continue;
        }

        setFileContractMatchState(file, true);
        setMatchedContractsByFile((current) => ({ ...current, [file.id]: contract }));
        recordFileOutcome(file, {
          status: 'processing',
          message: `جاري اعتماد الملف على العقد ${contract.contract_number} بنسبة ثقة ${matchAnalysis.confidence}%.`,
          details: [
            ...summarizeFileAnalysis(file, contract),
            ...matchAnalysis.reasons.map((reason) => `سبب المطابقة: ${reason}`),
          ],
          contractNumber: contract.contract_number,
        });

        let bulkPlan: ExcelImportAgentPlan | null = null;
        try {
          bulkPlan = await planExcelImportWithAgent({ companyId, contractId: contract.id, file });
          const reviewReasons = agentPlanReviewReasons(bulkPlan);
          if (reviewReasons.length > 0) {
            recordFileOutcome(file, {
              status: 'review_required',
              message: 'أوقف الوكيل التنفيذ لأن النسخة الجديدة تتضمن تخفيضًا أو حذفًا لحركة سابقة.',
              details: reviewReasons,
              contractNumber: contract.contract_number,
            });
            skippedCount += 1;
            continue;
          }

          if (bulkPlan.exactDuplicate || bulkPlan.effectiveRows.length === 0) {
            const noChangeResult: ImportResult = {
              payments: 0, invoicesCreated: 0, lateFees: 0, trafficViolations: 0, maintenanceRecords: 0,
              skipped: file.rows.length,
              skippedReasons: ['تحقق الوكيل من عدم وجود أي تغيير جديد.'],
              paymentReport: [],
            };
            setImportResults((current) => ({ ...current, [file.id]: noChangeResult }));
            recordFileOutcome(file, {
              status: 'skipped',
              message: 'ملف مطابق أو دون تغييرات جديدة؛ لم ينشئ الوكيل أي حركة.',
              details: noChangeResult.skippedReasons,
              contractNumber: contract.contract_number,
            });
            if (!bulkPlan.exactDuplicate) {
              await completeExcelImportAgentPlan({
                companyId,
                versionId: bulkPlan.versionId,
                success: true,
                result: { ...noChangeResult, agentDecision: 'verified_no_change' },
              });
            }
            skippedCount += 1;
            continue;
          }

          const executableFile: ParsedExcelFile = {
            ...file,
            rows: applyAgentEffectiveRows(file.rows, bulkPlan.effectiveRows),
          };
          const result = await approveFile(executableFile, contract, (progress) => {
            setBulkApprovalProgress({
              current: index + 1,
              total: pendingFiles.length,
              fileName: file.customerName || file.fileName,
              rowCurrent: progress.current,
              rowTotal: progress.total,
              rowLabel: progress.label,
            });
          });
          await completeExcelImportAgentPlan({
            companyId,
            versionId: bulkPlan.versionId,
            success: true,
            result: { ...result, agentActions: bulkPlan.summary.actions },
          });
          setImportResults((current) => ({ ...current, [file.id]: result }));
          recordFileOutcome(file, {
            status: 'approved',
            message: `تم اعتماد الملف وربطه بالعقد ${contract.contract_number}.`,
            details: summarizeFileAnalysis(file, contract, result),
            contractNumber: contract.contract_number,
          });
          approvedCount += 1;
        } catch (error: unknown) {
          if (bulkPlan && !bulkPlan.exactDuplicate) {
            try {
              await completeExcelImportAgentPlan({
                companyId,
                versionId: bulkPlan.versionId,
                success: false,
                errorMessage: errorMessage(error),
              });
            } catch (completionError) {
              console.error('Could not record bulk Excel agent failure:', completionError);
            }
          }
          const message = translateExcelImportError(error) || errorMessage(error) || 'فشل اعتماد الملف';
          console.error('Bulk Excel approval skipped failed file:', {
            fileName: file.fileName,
            customerName: file.customerName,
            error,
          });
          failedCount += 1;
          failedReasons.push(`${file.customerName || file.fileName}: ${message}`);
          recordFileOutcome(file, {
            status: 'failed',
            message,
            details: summarizeFileAnalysis(file, contract),
            contractNumber: contract.contract_number,
          });
          toast.error(`تعذر اعتماد ${file.customerName || file.fileName}: ${message}`);
        }
      }

      if (approvedCount > 0) {
        toast.success(
          `تم اعتماد ${approvedCount} ملف${skippedCount ? `، وتخطي ${skippedCount} ملف يحتاج مراجعة` : ''}${failedCount ? `، وفشل ${failedCount} ملف` : ''}.`
        );
      } else if (failedCount > 0 || skippedCount > 0) {
        toast.warning(
          `لم يتم اعتماد ملفات جديدة${skippedCount ? `، تخطي ${skippedCount} ملف يحتاج مراجعة` : ''}${failedCount ? `، وفشل ${failedCount} ملف` : ''}.`
        );
      }

      if (failedReasons.length > 0) {
        console.warn('[ExcelPaymentImport] Bulk approval failed files:', failedReasons);
      }
    } catch (error: unknown) {
      console.error('Bulk Excel approval failed:', error);
      toast.error(translateExcelImportError(error) || 'فشل الاعتماد الجماعي');
    } finally {
      setIsBulkApproving(false);
      setBulkApprovalProgress(null);
    }
  };

  return (
    <div dir="rtl" className={`min-h-screen bg-[#F6F8FB] py-6 text-[#020617] ${isEditMode ? 'px-0 md:px-0' : 'px-4 md:px-6'}`}>
      <div className={`mx-auto space-y-5 ${isEditMode ? 'max-w-none' : 'max-w-7xl'}`}>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#22C7A1]/10 text-[#22C7A1]">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">استيراد دفعات Excel التاريخية</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[#94A3B8]">
                  ارفع ملفات العملاء القديمة لمراجعتها قبل إدخالها للنظام. التحليل مرن مع اختلاف بسيط في الأعمدة، ولا يتم اعتماد أي دفعة من هذه الشاشة.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <FeatureTourButton
                tour={excelImportTour}
                onStart={setActiveTour}
                className="h-10 gap-2 rounded-xl border border-slate-200 bg-white text-[#020617] hover:bg-[#F6F8FB]"
              />
              <Button
                type="button"
                onClick={() => executeBulkApproval('pending')}
                disabled={isParsing || isApproving || isBulkApproving || totals.pendingApproval === 0}
                className="gap-2 rounded-xl bg-[#020617] text-white hover:bg-[#1E293B]"
              >
                <ClipboardCheck className="h-4 w-4" />
                {isBulkApproving ? 'جاري الاعتماد الجماعي...' : `استكمال اعتماد الجاهز (${totals.pendingApproval})`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => executeBulkApproval('failed')}
                disabled={isParsing || isApproving || isBulkApproving || Object.values(fileOutcomes).filter((outcome) => outcome.status === 'failed').length === 0}
                className="gap-2 rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
              >
                <RotateCcw className="h-4 w-4" />
                إعادة محاولة الفاشل ({Object.values(fileOutcomes).filter((outcome) => outcome.status === 'failed').length})
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={clearImportSession}
                disabled={isParsing || isApproving || isBulkApproving || files.length === 0}
                className="gap-2 rounded-xl border-slate-200 bg-white text-[#64748B] hover:bg-[#F6F8FB]"
              >
                <Trash2 className="h-4 w-4" />
                مسح الجلسة
              </Button>
              <Button asChild className="gap-2 rounded-xl bg-[#22C7A1] text-white hover:bg-[#1BAA8A]">
                <label>
                  <UploadCloud className="h-4 w-4" />
                  رفع ملفات
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(event) => handleFiles(event.target.files)}
                  />
                </label>
              </Button>
              <Button asChild variant="outline" className="gap-2 rounded-xl border-slate-200 bg-white">
                <label>
                  <FolderUp className="h-4 w-4" />
                  رفع مجلد
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls"
                    className="hidden"
                    // @ts-expect-error webkitdirectory is supported by Chromium for folder import.
                    webkitdirectory="true"
                    onChange={(event) => handleFiles(event.target.files)}
                  />
                </label>
              </Button>
            </div>
          </div>
        </section>

        {bulkApprovalProgress && (
          <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#020617]">اعتماد جماعي قيد التنفيذ</p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">
                  {bulkApprovalProgress.current} من {bulkApprovalProgress.total} - {bulkApprovalProgress.fileName}
                </p>
                {bulkApprovalProgress.rowLabel && (
                  <p className="mt-1 text-xs font-semibold text-[#0284C7]">
                    {bulkApprovalProgress.rowCurrent} من {bulkApprovalProgress.rowTotal} داخل الملف - {bulkApprovalProgress.rowLabel}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#0284C7]">
                {Math.round((bulkApprovalProgress.current / bulkApprovalProgress.total) * 100)}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-[#38BDF8] transition-all duration-300"
                style={{ width: `${Math.round((bulkApprovalProgress.current / bulkApprovalProgress.total) * 100)}%` }}
              />
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-[#020617]">مساعد الرفع الذكي</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[#64748B]">
                  تحليل سريع لحالة الجلسة، يوضح أين تتوقف العملية وما الإجراء الأفضل قبل إعادة المحاولة.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit border-sky-200 bg-sky-50 text-sky-700">
              <Sparkles className="ml-1 h-3.5 w-3.5" />
              {isAiReviewLoading
                ? 'AI يحلل الآن'
                : aiReview?.source === 'longcat'
                  ? 'AI عبر LongCat'
                  : 'AI احتياطي داخلي'}
            </Badge>
          </div>
          {aiReview?.summary && (
            <p className="mb-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-bold leading-5 text-sky-800">
              {aiReview.summary}
            </p>
          )}
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {importAiInsights.map((insight) => (
              <div
                key={`${insight.title}-${insight.description}`}
                className={`rounded-xl border p-3 ${getInsightClassName(insight.tone)}`}
              >
                <p className="text-sm font-black">{insight.title}</p>
                <p className="mt-1 text-xs font-semibold leading-5">{insight.description}</p>
              </div>
            ))}
          </div>
        </section>

        {Object.values(fileOutcomes).some((outcome) => outcome.status === 'failed' || outcome.status === 'review_required') && (
          <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-[#020617]">ملفات تحتاج انتباه</p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">
                  هذه القائمة محفوظة ضمن جلسة الرفع، ويمكن إعادة محاولة الملفات الفاشلة فقط بعد معالجة السبب.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => executeBulkApproval('failed')}
                disabled={isParsing || isApproving || isBulkApproving || totals.failed === 0}
                className="h-9 gap-2 rounded-xl border-amber-200 text-xs font-bold text-amber-700"
              >
                <RotateCcw className="h-4 w-4" />
                إعادة محاولة الفاشل
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {Object.values(fileOutcomes)
                .filter((outcome) => outcome.status === 'failed' || outcome.status === 'review_required')
                .slice(0, 9)
                .map((outcome) => (
                  <button
                    key={outcome.fileId}
                    type="button"
                    onClick={() => setSelectedId(outcome.fileId)}
                    className={`rounded-xl border p-3 text-right transition hover:bg-[#F6F8FB] ${
                      outcome.status === 'failed' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge variant="outline" className={outcome.status === 'failed' ? 'border-red-200 bg-white text-red-700' : 'border-amber-200 bg-white text-amber-700'}>
                        {outcome.status === 'failed' ? 'فشل' : 'مراجعة'}
                      </Badge>
                      <span className="text-[11px] font-bold text-[#94A3B8]">{new Date(outcome.updatedAt).toLocaleTimeString('ar-QA')}</span>
                    </div>
                    <p className="truncate text-sm font-black text-[#020617]">{outcome.customerName || outcome.fileName}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#475569]">{localizeImportOutcomeMessage(outcome.message)}</p>
                  </button>
                ))}
            </div>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-[#94A3B8]">الملفات المقروءة</p>
              <p className="mt-2 text-2xl font-bold">{totals.files}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-[#94A3B8]">جاهزة للمراجعة</p>
              <p className="mt-2 text-2xl font-bold">{totals.ready}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-[#94A3B8]">تحتاج مراجعة</p>
              <p className="mt-2 text-2xl font-bold">{totals.review}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-emerald-200 bg-emerald-50 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-emerald-700">تم اعتمادها</p>
              <p className="mt-2 text-2xl font-bold">{totals.approved}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-red-200 bg-red-50 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-red-700">فشلت</p>
              <p className="mt-2 text-2xl font-bold">{totals.failed}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-[#94A3B8]">إجمالي المدفوعات بالملفات</p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(totals.payments)}</p>
            </CardContent>
          </Card>
        </section>

        {files.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <FileSpreadsheet className="mx-auto h-14 w-14 text-[#38BDF8]" />
            <h2 className="mt-4 text-xl font-bold">ابدأ برفع ملف أو مجلد Excel</h2>
            <p className="mt-2 text-sm text-[#94A3B8]">
              سيتم استخراج بيانات العميل واللوحة والمدفوعات الشهرية، ثم تصنيف الملفات حسب جودة القراءة.
            </p>
            {isParsing && <p className="mt-4 text-sm font-semibold text-[#22C7A1]">جاري تحليل الملفات...</p>}
          </section>
        ) : (
          <section className={`grid gap-5 ${isEditMode ? 'grid-cols-1' : '2xl:grid-cols-[360px_minmax(0,1fr)]'}`}>
            <aside className={isEditMode ? 'hidden' : 'space-y-3'}>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="ابحث بالملف، العميل، اللوحة، الهاتف..."
                  className="h-11 rounded-xl border-slate-200 bg-white pr-10"
                />
              </div>

              <div className="max-h-[640px] space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                {filteredFiles.map((file) => {
                  const meta = statusMeta[file.status];
                  const Icon = meta.icon;
                  const fileResult = importResults[file.id];
                  const linkedContract = matchedContractsByFile[file.id];
                  const outcome = fileOutcomes[file.id];
                  return (
                    <button
                      key={file.id}
                      data-testid="excel-import-file-card"
                      data-file-id={file.id}
                      type="button"
                      onClick={() => {
                        if (fileResult && linkedContract) {
                          openContractDetails(linkedContract);
                          return;
                        }
                        setSelectedId(file.id);
                        setIsEditMode(false);
                        setEditBaselineRows(null);
                        setEditReviewDialogOpen(false);
                        setApprovalProgress(null);
                      }}
                      className={`w-full rounded-xl border p-3 text-right transition ${
                        fileResult
                          ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-50'
                          : selectedFile?.id === file.id
                            ? 'border-[#22C7A1] bg-[#ECFDF5]'
                            : 'border-slate-200 bg-white hover:bg-[#F6F8FB]'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        {fileResult ? (
                          <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-700">
                            <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
                            تم الاعتماد
                          </Badge>
                        ) : outcome?.status === 'failed' ? (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                            <XCircle className="ml-1 h-3.5 w-3.5" />
                            فشل
                          </Badge>
                        ) : outcome?.status === 'processing' ? (
                          <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                            <ClipboardCheck className="ml-1 h-3.5 w-3.5" />
                            قيد التنفيذ
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={meta.className}>
                            <Icon className="ml-1 h-3.5 w-3.5" />
                            {meta.label}
                          </Badge>
                        )}
                        <span className="text-xs font-bold text-[#94A3B8]">{file.confidence}%</span>
                      </div>
                      <p className="truncate text-sm font-bold">{file.customerName || file.fileName}</p>
                      <p className="mt-1 truncate text-xs text-[#94A3B8]">
                        {linkedContract?.contract_number ? `${linkedContract.contract_number} · ` : ''}
                        {file.plateNumber || 'بدون لوحة'} · {file.rows.length} شهر
                      </p>
                      {fileResult && (
                        <p className="mt-2 text-xs font-bold text-emerald-700">
                          {fileResult.payments} دفعة · {fileResult.trafficViolations} مخالفة
                          {linkedContract ? ' · عرض العقد' : ''}
                        </p>
                      )}
                      {!fileResult && outcome?.message && (
                        <p className={`mt-2 line-clamp-2 text-xs font-semibold ${
                          outcome.status === 'failed' ? 'text-red-700' : outcome.status === 'review_required' ? 'text-amber-700' : 'text-[#64748B]'
                        }`}>
                          {localizeImportOutcomeMessage(outcome.message)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              {selectedFile ? (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{selectedFile.customerName || 'عميل غير محدد'}</h2>
                      <p className="mt-1 text-sm text-[#94A3B8]">{selectedFile.fileName}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <FeatureTourButton
                        tour={excelImportTour}
                        onStart={setActiveTour}
                        className="h-10 gap-2 rounded-xl border border-slate-200 bg-white text-[#020617] hover:bg-[#F6F8FB]"
                      />
                      {importResult ? (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
                          تم الاعتماد
                        </Badge>
                      ) : (
                        <Badge variant="outline" className={statusMeta[selectedFile.status].className}>
                          {statusMeta[selectedFile.status].label}
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant={isEditMode ? 'default' : 'outline'}
                        onClick={handleEditToggle}
                        className={`gap-2 rounded-xl ${
                          isEditMode
                            ? 'bg-[#020617] text-white hover:bg-[#1E293B]'
                            : 'border-slate-200 bg-white text-[#020617] hover:bg-[#F6F8FB]'
                        }`}
                      >
                        <Pencil className="h-4 w-4" />
                        {isEditMode ? 'إنهاء التعديل' : 'تعديل'}
                      </Button>
                      <Button
                        type="button"
                        disabled={!isEditMode && (isMatchingContract || approvalBlockers.length > 0 || Boolean(importResult))}
                        onClick={() => {
                          if (isEditMode) {
                            handleEditToggle();
                            return;
                          }
                          if (isMatchingContract) {
                            toast.info('جاري مطابقة الملف مع العقود، يرجى الانتظار.');
                            return;
                          }
                          if (!matchedContract) {
                            setFileContractMatchState(selectedFile, false);
                            toast.error(contractMatchWarning(selectedFile));
                            return;
                          }
                          setApprovalDialogOpen(true);
                          void prepareAgentPlan();
                        }}
                        className="gap-2 rounded-xl bg-[#22C7A1] text-white hover:bg-[#1BAA8A]"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        اعتماد الدفعات
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-xl bg-[#F6F8FB] p-3">
                      <p className="text-xs font-semibold text-[#94A3B8]">الهوية</p>
                      <p className="mt-1 font-bold">{selectedFile.idNumber || '-'}</p>
                    </div>
                    <div className="rounded-xl bg-[#F6F8FB] p-3">
                      <p className="text-xs font-semibold text-[#94A3B8]">الهاتف</p>
                      <p className="mt-1 font-bold" dir="ltr">{selectedFile.phone || '-'}</p>
                    </div>
                    <div className="rounded-xl bg-[#F6F8FB] p-3">
                      <p className="text-xs font-semibold text-[#94A3B8]">اللوحة</p>
                      <p className="mt-1 font-bold">{selectedFile.plateNumber || '-'}</p>
                    </div>
                    <div className="rounded-xl bg-[#F6F8FB] p-3">
                      <p className="text-xs font-semibold text-[#94A3B8]">القسط</p>
                      <p className="mt-1 font-bold">{formatCurrency(selectedFile.monthlyRent)}</p>
                    </div>
                    <div className="rounded-xl bg-[#ECFDF5] p-3">
                      <p className="text-xs font-semibold text-[#0F766E]">المدفوعات</p>
                      <p className="mt-1 font-bold">{formatCurrency(selectedFile.totalPayments)}</p>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-4 ${
                    selectedOutcome?.status === 'failed'
                      ? 'border-red-200 bg-red-50'
                      : selectedOutcome?.status === 'approved'
                        ? 'border-emerald-200 bg-emerald-50'
                        : selectedOutcome?.status === 'review_required'
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-sky-200 bg-sky-50'
                  }`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black text-[#020617]">تحليل هذا العميل</p>
                        <p className="mt-1 text-sm font-semibold text-[#475569]">
                          {localizeImportOutcomeMessage(selectedOutcome?.message) || 'تم تحليل الملف، ويمكن استكمال المطابقة والاعتماد.'}
                        </p>
                      </div>
                      <Badge variant="outline" className="w-fit bg-white">
                        جلسة: {sessionId.slice(-8)}
                      </Badge>
                    </div>
                    <div className={`mt-3 rounded-xl border p-3 ${getInsightClassName(selectedFileAiDecision.tone)}`}>
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="text-sm font-black">{selectedFileAiDecision.title}</p>
                          <p className="mt-1 text-xs font-semibold leading-5">{selectedFileAiDecision.description}</p>
                        </div>
                      </div>
                    </div>
                    {contractMatchAnalysis && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white/80 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-[#020617]">
                              {contractMatchAnalysis.contract ? 'العقد المقترح للمطابقة' : 'لم يتم تأكيد عقد مطابق'}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[#64748B]">
                              {contractMatchAnalysis.contract
                                ? `${contractMatchAnalysis.contract.contract_number} - ${getContractCustomerDisplayName(contractMatchAnalysis.contract)}`
                                : 'لا توجد نتيجة بثقة كافية للاعتماد التلقائي.'}
                            </p>
                          </div>
                          <Badge variant="outline" className="w-fit border-slate-200 bg-[#F6F8FB] text-[#020617]">
                            ثقة {contractMatchAnalysis.confidence}%
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {contractMatchAnalysis.reasons.slice(0, 4).map((reason) => (
                            <p key={reason} className="rounded-lg bg-[#F6F8FB] px-3 py-2 text-xs font-semibold leading-5 text-[#475569]">
                              - {reason}
                            </p>
                          ))}
                        </div>
                        {contractMatchAnalysis.contract && contractMatchReviewAlternatives.length > 0 && (
                          <div className="mt-3 rounded-lg border border-slate-200 bg-[#F6F8FB] p-3">
                            <p className="text-xs font-black text-[#020617]">عقود أخرى محتملة</p>
                            <div className="mt-2 grid gap-2 md:grid-cols-3">
                              {contractMatchReviewAlternatives.map((alternative) => (
                                <div key={alternative.contract.id} className="rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold leading-5 text-[#475569]">
                                  <p className="font-black text-[#020617]">{alternative.contract.contract_number}</p>
                                  <p>{getContractCustomerDisplayName(alternative.contract)}</p>
                                  <p>الثقة {alternative.confidence}%</p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 h-8 w-full rounded-lg border-slate-200 bg-white text-xs font-bold"
                                    disabled={Boolean(importResult) || rememberingContractFileId === selectedFile.id}
                                    onClick={() => applySuggestedContractMatch(alternative)}
                                  >
                                    {rememberingContractFileId === selectedFile.id ? 'جاري حفظ الاختيار...' : 'استخدام هذا العقد'}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {!contractMatchAnalysis.contract && contractMatchAnalysis.alternatives.length > 0 && (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs font-black text-amber-800">أقرب عقود محتملة للمراجعة اليدوية</p>
                            <div className="mt-2 grid gap-2 md:grid-cols-3">
                              {contractMatchAnalysis.alternatives.map((alternative) => (
                                <div key={alternative.contract.id} className="rounded-lg bg-white/80 p-2 text-xs font-semibold leading-5 text-amber-800">
                                  <p className="font-black">{alternative.contract.contract_number}</p>
                                  <p>{getContractCustomerDisplayName(alternative.contract)}</p>
                                  <p>الثقة {alternative.confidence}%</p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 h-8 w-full rounded-lg border-amber-200 bg-white text-xs font-bold text-amber-800"
                                    disabled={Boolean(importResult) || rememberingContractFileId === selectedFile.id}
                                    onClick={() => applySuggestedContractMatch(alternative)}
                                  >
                                    {rememberingContractFileId === selectedFile.id ? 'جاري حفظ الاختيار...' : 'استخدام هذا العقد'}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white/80 p-3">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
                        <div className="flex-1">
                          <p className="text-sm font-black text-[#020617]">بحث يدوي عن عقد</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-[#64748B]">
                            ابحث برقم العقد أو الرقم الشخصي أو الجوال أو رقم المركبة ثم اختر العقد الصحيح.
                          </p>
                          <Input
                            value={manualContractSearch}
                            onChange={(event) => setManualContractSearch(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                executeManualContractSearch();
                              }
                            }}
                            placeholder="مثال: C-ALF-0039 أو رقم الهوية أو اللوحة"
                            className="mt-2 h-10 rounded-xl border-slate-200 bg-white"
                            disabled={Boolean(importResult) || isManualContractSearchLoading}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 gap-2 rounded-xl border-slate-200 bg-white font-bold"
                          disabled={Boolean(importResult) || isManualContractSearchLoading}
                          onClick={executeManualContractSearch}
                        >
                          <Search className="h-4 w-4" />
                          {isManualContractSearchLoading ? 'جاري البحث...' : 'بحث'}
                        </Button>
                      </div>

                      {manualContractResults.length > 0 && (
                        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {manualContractResults.map((alternative) => (
                            <div key={alternative.contract.id} className="rounded-lg border border-slate-200 bg-[#F6F8FB] p-3 text-xs font-semibold leading-5 text-[#475569]">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-black text-[#020617]">{alternative.contract.contract_number}</p>
                                  <p>{getContractCustomerDisplayName(alternative.contract)}</p>
                                </div>
                                <Badge variant="outline" className="border-slate-200 bg-white text-[#020617]">
                                  {alternative.confidence}%
                                </Badge>
                              </div>
                              <p className="mt-2">اللوحة: {alternative.contract.vehicles?.plate_number || alternative.contract.license_plate || '-'}</p>
                              <p>الجوال: {alternative.contract.customers?.phone || '-'}</p>
                              <p>الهوية: {alternative.contract.customers?.national_id || '-'}</p>
                              <div className="mt-2 space-y-1">
                                {alternative.reasons.slice(0, 2).map((reason) => (
                                  <p key={reason}>- {reason}</p>
                                ))}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                className="mt-3 h-8 w-full rounded-lg bg-[#020617] text-xs font-bold text-white hover:bg-[#1E293B]"
                                disabled={Boolean(importResult) || rememberingContractFileId === selectedFile.id}
                                onClick={() => applySuggestedContractMatch(alternative)}
                              >
                                {rememberingContractFileId === selectedFile.id ? 'جاري حفظ الاختيار...' : 'استخدام هذا العقد'}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-[#475569] md:grid-cols-2">
                      {(selectedOutcome?.details?.length ? selectedOutcome.details : summarizeFileAnalysis(selectedFile, matchedContract, importResult)).slice(0, 8).map((detail, index) => (
                        <p key={`${detail}-${index}`} className="rounded-lg bg-white/70 px-3 py-2">- {detail}</p>
                      ))}
                    </div>
                  </div>

                  {selectedFile.warnings.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="mb-2 font-bold text-amber-800">ملاحظات تحتاج مراجعة</p>
                      <ul className="space-y-1 text-sm text-amber-700">
                        {selectedFile.warnings.map((warning) => <li key={warning}>- {warning}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className={`${isEditMode ? 'overflow-visible' : 'overflow-x-auto'} rounded-xl border border-slate-200`}>
                    <Table className={isEditMode ? "w-full table-fixed" : "min-w-[720px]"}>
                      <TableHeader>
                        <TableRow className="bg-[#F6F8FB]">
                          <TableHead className="text-right">الشهر</TableHead>
                          <TableHead className="text-right">المدفوع</TableHead>
                          <TableHead className="text-right">الباقي</TableHead>
                          <TableHead className="text-right">الصيانة</TableHead>
                          <TableHead className="text-right">التأخير</TableHead>
                          <TableHead className="text-right">المخالفات المرورية</TableHead>
                          <TableHead className="text-right">صف Excel</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedFile.rows.map((row) => (
                          <TableRow key={`${row.month}-${row.rowNumber}`}>
                            <TableCell className="font-bold">{row.month}</TableCell>
                            <TableCell>
                              {isEditMode ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={row.paymentAmount ?? 0}
                                  onChange={(event) => updateRowValue(row.rowNumber, 'paymentAmount', parseEditableNumber(event.target.value))}
                                  className="h-9 w-24 rounded-lg border-slate-200 bg-white text-center font-semibold"
                                />
                              ) : (
                                <span className="font-semibold">{formatOptionalCurrency(row.paymentAmount)}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditMode ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={row.remainingAmount ?? 0}
                                  onChange={(event) => updateRowValue(row.rowNumber, 'remainingAmount', parseEditableNumber(event.target.value))}
                                  className="h-9 w-24 rounded-lg border-slate-200 bg-white text-center font-semibold"
                                />
                              ) : (
                                <span className="font-semibold">{formatOptionalCurrency(row.remainingAmount)}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditMode ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={row.maintenanceAmount ?? 0}
                                  onChange={(event) => updateRowValue(row.rowNumber, 'maintenanceAmount', parseEditableNumber(event.target.value))}
                                  className="h-9 w-24 rounded-lg border-slate-200 bg-white text-center font-semibold"
                                />
                              ) : (
                                <span className="font-semibold">{formatOptionalCurrency(row.maintenanceAmount)}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditMode ? (
                                <>
                                  <div className="flex flex-col gap-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={row.delayDays ?? 0}
                                      onChange={(event) => updateRowValue(row.rowNumber, 'delayDays', parseEditableNumber(event.target.value))}
                                      className="h-8 w-24 rounded-lg border-slate-200 bg-white text-center text-xs font-semibold"
                                    />
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.001"
                                      value={row.delayValue ?? 0}
                                      onChange={(event) => updateRowValue(row.rowNumber, 'delayValue', parseEditableNumber(event.target.value))}
                                      className="h-8 w-24 rounded-lg border-amber-200 bg-amber-50 text-center text-xs font-semibold"
                                    />
                                  </div>
                                  <div className="mt-1 text-[11px] text-[#94A3B8]">أيام / ر.ق</div>
                                </>
                              ) : (
                                <div>
                                  <div className="font-semibold">{formatOptionalCurrency(row.delayValue)}</div>
                                  {(row.delayDays || 0) > 0 && (
                                    <div className="mt-1 text-xs text-[#94A3B8]">{row.delayDays} يوم</div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditMode ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={row.trafficAmount ?? 0}
                                  onChange={(event) => updateRowValue(row.rowNumber, 'trafficAmount', parseEditableNumber(event.target.value))}
                                  className="h-9 w-24 rounded-lg border-slate-200 bg-white text-center font-semibold"
                                />
                              ) : (
                                <div>
                                  <div className="font-semibold">{formatOptionalCurrency(row.trafficAmount)}</div>
                                  {formatTrafficBreakdown(row) && (
                                    <div className="mt-1 text-xs text-[#94A3B8]">
                                      {row.trafficAmounts.length} مخالفات: {formatTrafficBreakdown(row)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-[#94A3B8]">{row.rowNumber}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-[#F6F8FB] p-4 text-sm leading-6 text-[#64748B]">
                    الخطوة التالية بعد اعتماد شكل القراءة: نضيف زر اعتماد ينشئ دفعات تاريخية مستقلة، يطابقها مع الفواتير، ويمنع التكرار عبر رقم ملف Excel + الشهر + العقد.
                  </div>
                </div>
              ) : null}
            </main>
          </section>
        )}
      </div>

      <Dialog open={editReviewDialogOpen} onOpenChange={setEditReviewDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl rounded-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-2xl font-bold text-[#020617]">مراجعة التعديلات قبل اعتمادها</DialogTitle>
            <DialogDescription className="leading-6 text-[#64748B]">
              راجع القيم التي تم تغييرها في الجدول. عند الاعتماد سيتم تثبيت هذه القيم في شاشة الاستيراد قبل اعتماد الدفعات.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-7 text-amber-800">
            تم رصد {editChanges.length} تعديل. تأكد من القيم قبل المتابعة، خصوصًا المدفوع والباقي والمخالفات.
          </div>

          <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F6F8FB]">
                  <TableHead className="text-right">الشهر</TableHead>
                  <TableHead className="text-right">الحقل</TableHead>
                  <TableHead className="text-right">قبل</TableHead>
                  <TableHead className="text-right">بعد</TableHead>
                  <TableHead className="text-right">صف Excel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editChanges.slice(0, 80).map((change) => (
                  <TableRow key={`${change.rowNumber}-${change.field}`}>
                    <TableCell className="font-bold">{change.month}</TableCell>
                    <TableCell>{change.label}</TableCell>
                    <TableCell className="text-[#94A3B8]">{formatEditChangeValue(change.field, change.before)}</TableCell>
                    <TableCell className="font-bold text-[#020617]">{formatEditChangeValue(change.field, change.after)}</TableCell>
                    <TableCell className="text-[#94A3B8]">{change.rowNumber}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {editChanges.length > 80 && (
            <p className="text-sm font-semibold text-[#94A3B8]">
              تم عرض أول 80 تعديل فقط. جميع التعديلات سيتم اعتمادها عند المتابعة.
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              type="button"
              onClick={confirmEditChanges}
              className="rounded-xl bg-[#22C7A1] text-white hover:bg-[#1BAA8A]"
            >
              اعتماد التعديلات
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditReviewDialogOpen(false)}
              className="rounded-xl border-slate-200 bg-white"
            >
              العودة للتعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent dir="rtl" className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-2xl">
          <DialogHeader className="text-right">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-2xl font-bold text-[#020617]">اعتماد دفعات الملف</DialogTitle>
                <DialogDescription className="leading-6 text-[#64748B]">
                  هذا الملخص يوضح ما سيُرحّل للنظام بعد ربط الملف بالعقد والفواتير. لا يتم إنشاء أي حركة مالية قبل اكتمال المطابقة.
                </DialogDescription>
              </div>
              <FeatureTourButton tour={excelApprovalTour} onStart={setActiveTour} />
            </div>
          </DialogHeader>

          <div className={importResult ? 'hidden' : 'grid gap-3 sm:grid-cols-2'}>
            <div className="rounded-xl border border-slate-200 bg-[#F6F8FB] p-4">
              <p className="text-xs font-semibold text-[#94A3B8]">دفعات سيتم إنشاؤها</p>
              <p className="mt-1 text-xl font-bold">{approvalSummary.payableRows}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-700">إجمالي المدفوع</p>
              <p className="mt-1 text-xl font-bold">{formatCurrency(approvalSummary.totalPayments)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-[#94A3B8]">إجمالي الباقي على الإيجار</p>
              <p className="mt-1 text-xl font-bold">{formatCurrency(approvalSummary.totalRemaining)}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-700">غرامات التأخير المحسوبة</p>
              <p className="mt-1 text-xl font-bold">{formatCurrency(approvalSummary.totalLateFees)}</p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 sm:col-span-2">
              <p className="text-xs font-semibold text-sky-700">المخالفات المرورية</p>
              <p className="mt-1 text-xl font-bold">{formatCurrency(approvalSummary.totalTraffic)}</p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 sm:col-span-2">
              <p className="text-xs font-semibold text-violet-700">سجلات الصيانة</p>
              <p className="mt-1 text-xl font-bold">{formatCurrency(approvalSummary.totalMaintenance)}</p>
            </div>
          </div>

          {!importResult && (
            <div className={`rounded-xl border p-4 text-sm ${
              agentPlan?.summary.review
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : agentPlan?.exactDuplicate || agentPlan?.summary.unchanged
                  ? 'border-slate-200 bg-slate-50 text-slate-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-black">خطة وكيل الاستيراد</p>
                <Badge variant="outline" className="bg-white">
                  {isAgentPlanLoading ? 'يحلل الآن' : agentPlan ? `${agentPlan.summary.actions} إجراء` : 'غير جاهزة'}
                </Badge>
              </div>
              {isAgentPlanLoading ? (
                <p className="mt-2">يقارن الوكيل هذا الملف بآخر نسخة معتمدة ويصنف النصوص عبر LongCat...</p>
              ) : agentPlan?.exactDuplicate ? (
                <p className="mt-2 font-semibold">هذا الملف معتمد سابقًا بنفس المحتوى. لن تُنشأ أي حركة جديدة.</p>
              ) : agentPlan ? (
                <div className="mt-2 space-y-1">
                  <p>إجراءات قابلة للتنفيذ: <strong>{agentPlan.summary.executable}</strong></p>
                  <p>صفوف دون تغيير: <strong>{agentPlan.actions.filter((action) => action.command === 'excel_import.no_change').length}</strong></p>
                  <p>إجراءات حساسة متوقفة للمراجعة: <strong>{agentPlan.summary.review}</strong></p>
                  {agentPlanReviewReasons(agentPlan).slice(0, 3).map((reason) => (
                    <p key={reason} className="font-semibold">- {reason}</p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-red-700">تعذر تجهيز الخطة. أعد فتح النافذة للمحاولة مرة أخرى.</p>
              )}
            </div>
          )}

          <div className={importResult ? 'hidden' : 'rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 text-[#475569]'}>
            <p className="font-bold text-[#020617]">عند التنفيذ النهائي سيقوم النظام بـ:</p>
            <p>- إنشاء دفعة كاش لكل شهر يحتوي على مبلغ مدفوع.</p>
            <p>- ربط كل دفعة بفاتورة الإيجار الخاصة بالشهر نفسه.</p>
            <p>- إبقاء الرصيد المتبقي على الفاتورة كذمة غير مدفوعة.</p>
            <p>- إنشاء غرامة التأخير كمستحق منفصل، وليس كجزء من دفعة الإيجار.</p>
            <p>- إنشاء المخالفات المرورية كمستحقات مستقلة عند وجودها.</p>
            <p>- إنشاء سجل صيانة تاريخي مستقل عند وجود مبلغ صيانة صريح.</p>
          </div>

          <div className={`${importResult ? 'hidden' : ''} rounded-xl border p-4 text-sm leading-6 ${
            matchedContract ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            <p className="font-bold">{isMatchingContract ? 'جاري مطابقة العقد...' : matchedContract ? 'العقد المطابق' : 'لم يتم العثور على عقد مطابق'}</p>
            {matchedContract ? (
              <>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <p>رقم العقد: <span className="font-bold">{matchedContract.contract_number}</span></p>
                  <p>اللوحة: <span className="font-bold">{matchedContract.vehicles?.plate_number || matchedContract.license_plate || '-'}</span></p>
                  <p>العميل: <span className="font-bold">{getContractCustomerDisplayName(matchedContract)}</span></p>
                  <p>القسط: <span className="font-bold">{formatCurrency(matchedContract.monthly_amount || selectedFile?.monthlyRent || 0)}</span></p>
                </div>
                {contractMatchAnalysis && (
                  <div className="mt-3 rounded-lg bg-white/70 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-black">سبب اختيار هذا العقد</p>
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        ثقة {contractMatchAnalysis.confidence}%
                      </Badge>
                    </div>
                    {contractMatchAnalysis.reasons.slice(0, 3).map((reason) => (
                      <p key={reason} className="text-xs font-semibold leading-5">- {reason}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2">تأكد أن اللوحة أو الهاتف أو الهوية في ملف Excel تطابق عقدًا موجودًا في النظام.</p>
            )}
          </div>

          {!importResult && approvalBlockers.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              <p className="mb-2 font-bold">لا يمكن تنفيذ الاعتماد النهائي قبل معالجة التالي:</p>
              {approvalBlockers.map((blocker) => (
                <p key={blocker}>- {blocker}</p>
              ))}
            </div>
          )}

          {(isApproving || (approvalProgress && !importResult)) && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#020617]">
                    {approvalProgress?.label || 'جاري تنفيذ الاعتماد...'}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#64748B]">
                    {approvalProgress
                      ? `${approvalProgress.current} من ${approvalProgress.total} شهر`
                      : 'بدأت العملية، الرجاء عدم إغلاق النافذة.'}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#0284C7]">
                  {approvalProgress?.total
                    ? `${Math.round((approvalProgress.current / approvalProgress.total) * 100)}%`
                    : '...'}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[#38BDF8] transition-all duration-300"
                  style={{
                    width: `${approvalProgress?.total
                      ? Math.min(100, Math.round((approvalProgress.current / approvalProgress.total) * 100))
                      : 8}%`,
                  }}
                />
              </div>
            </div>
          )}

          {importResult && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black">تم الاعتماد بنجاح</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">
                      تمت معالجة الملف وربط النتائج المتاحة بالنظام المالي.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700">مكتمل</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold text-[#94A3B8]">الدفعات المنشأة</p>
                  <p className="mt-1 text-2xl font-black text-[#020617]">{importResult.payments}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold text-[#94A3B8]">غرامات التأخير</p>
                  <p className="mt-1 text-2xl font-black text-[#020617]">{importResult.lateFees}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold text-[#94A3B8]">المخالفات المرورية</p>
                  <p className="mt-1 text-2xl font-black text-[#020617]">{importResult.trafficViolations}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold text-[#94A3B8]">سجلات الصيانة</p>
                  <p className="mt-1 text-2xl font-black text-[#020617]">{importResult.maintenanceRecords}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold text-amber-700">تم تخطيها</p>
                  <p className="mt-1 text-2xl font-black text-[#020617]">{importResult.skipped}</p>
                </div>
              </div>

              {importResult.paymentReport.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-base font-black text-[#020617]">تقرير تسجيل الدفعات</p>
                      <p className="mt-1 text-xs font-semibold text-[#64748B]">
                        يوضح التقرير الدفعات التي تم إنشاؤها فعليًا ومكان ربطها داخل النظام.
                      </p>
                    </div>
                    {importResult.paymentReport[0]?.contractPath && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl border-slate-200 text-xs font-bold"
                        onClick={() => navigate(importResult.paymentReport[0].contractPath)}
                      >
                        فتح تفاصيل العقد
                      </Button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-auto rounded-xl border border-slate-100">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-right">الشهر</TableHead>
                          <TableHead className="text-right">المبلغ</TableHead>
                          <TableHead className="text-right">العميل</TableHead>
                          <TableHead className="text-right">العقد</TableHead>
                          <TableHead className="text-right">الفاتورة</TableHead>
                          <TableHead className="text-right">رقم الدفعة</TableHead>
                          <TableHead className="text-right">تاريخ التسجيل</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.paymentReport.map((reportRow) => (
                          <TableRow key={`${reportRow.paymentId}-${reportRow.month}`}>
                            <TableCell className="font-bold">{reportRow.month}</TableCell>
                            <TableCell className="font-bold">{formatCurrency(reportRow.amount)}</TableCell>
                            <TableCell>{reportRow.customerName}</TableCell>
                            <TableCell>
                              <button
                                type="button"
                                className="font-bold text-[#0F766E] underline-offset-4 hover:underline"
                                onClick={() => navigate(reportRow.contractPath)}
                              >
                                {reportRow.contractNumber}
                              </button>
                            </TableCell>
                            <TableCell>{reportRow.invoiceNumber}</TableCell>
                            <TableCell className="font-mono text-xs">{reportRow.paymentNumber}</TableCell>
                            <TableCell className="font-mono text-xs">{reportRow.paymentDate || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs font-semibold leading-6 text-[#475569]">
                    {importResult.paymentReport.slice(0, 3).map((reportRow) => (
                      <p key={`${reportRow.referenceNumber}-${reportRow.month}`}>
                        شهر {reportRow.month}: تم تسجيل الدفعة في جدول payments وربطها بالعميل "{reportRow.customerName}"، العقد "{reportRow.contractNumber}"، والفاتورة "{reportRow.invoiceNumber}".
                      </p>
                    ))}
                    {importResult.paymentReport.length > 3 && (
                      <p className="mt-1 text-[#64748B]">تم عرض أول 3 أسطر في الملخص، والتفاصيل كاملة في الجدول أعلاه.</p>
                    )}
                  </div>
                </div>
              )}

              {importResult.skipped > 0 && (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
                  <p>
                    تم تخطي بعض الأشهر لأنها مكررة أو لأن إضافتها سترفع إجمالي مدفوعات العقد فوق الحد المسموح. راجع مدفوعات العقد والفواتير قبل إعادة الاستيراد.
                  </p>
                  {importResult.skippedReasons.length > 0 && (
                    <div className="rounded-lg bg-white/70 p-3">
                      <p className="mb-2 font-black text-amber-900">سبب التخطي:</p>
                      {importResult.skippedReasons.slice(0, 5).map((reason, index) => (
                        <p key={`${reason}-${index}`}>- {reason}</p>
                      ))}
                      {importResult.skippedReasons.length > 5 && (
                        <p className="mt-2 text-xs text-amber-700">تم عرض أول 5 أسباب فقط.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {importResult && (
            <div className="hidden">
              <p className="mb-2 font-bold">تم الاعتماد بنجاح</p>
              <p>- الدفعات المنشأة: {importResult.payments}</p>
              <p>- الفواتير التاريخية المنشأة: {importResult.invoicesCreated}</p>
              <p>- غرامات التأخير المنشأة: {importResult.lateFees}</p>
              <p>- المخالفات المرورية المنشأة: {importResult.trafficViolations}</p>
              <p>- عناصر تم تخطيها لأنها مكررة أو تتجاوز سقف العقد: {importResult.skipped}</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              type="button"
              className="rounded-xl bg-[#22C7A1] text-white hover:bg-[#1BAA8A]"
              disabled={isApproving || isAgentPlanLoading || !agentPlan || approvalBlockers.length > 0 || Boolean(importResult)}
              onClick={executeApproval}
            >
              {importResult ? 'تم الاعتماد' : isAgentPlanLoading ? 'الوكيل يحلل...' : isApproving ? 'جاري الاعتماد...' : 'تنفيذ خطة الوكيل'}
            </Button>
            <Button
              type="button"
              variant={importResult ? 'default' : 'outline'}
              className={`rounded-xl ${importResult ? 'bg-[#020617] text-white hover:bg-[#1E293B]' : ''}`}
              onClick={() => setApprovalDialogOpen(false)}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FeatureTourDialog tour={activeTour} onOpenChange={(open) => !open && setActiveTour(null)} />
    </div>
  );
}
