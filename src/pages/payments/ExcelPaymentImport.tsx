import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  FolderUp,
  Pencil,
  Search,
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
import { usePaymentOperations } from '@/hooks/business/usePaymentOperations';
import { useFinanceAccessGuard } from '@/hooks/finance/useFinanceAccessGuard';

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
  skipped: number;
  skippedReasons: string[];
  paymentReport: PaymentReportRow[];
};

type ImportResultsByFile = Record<string, ImportResult>;
type MatchedContractsByFile = Record<string, MatchedContract>;

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

const cellText = (value: CellValue) => String(value ?? '').trim();

const parseOptionalNumber = (value: CellValue): number | null => {
  const text = cellText(value);
  if (value === null || value === undefined || text === '' || !/\d/.test(text)) return null;
  return parseNumber(value);
};

const looksLikeMonth = (value: CellValue) => {
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
    const value = parseOptionalNumber(row[column]);
    if (value !== null) return value;
  }
  return null;
};

const readNumberPartsFromColumns = (row: CellValue[], columns: number[]) => {
  for (const column of columns) {
    const value = row[column];
    if (value === null || value === undefined || !/\d/.test(cellText(value))) continue;
    const parts = parseNumberParts(value);
    if (parts.length) return parts;
  }
  return [];
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
  fileName,
  contractId,
  invoiceId,
  month,
}: {
  fileName: string;
  contractId: string;
  invoiceId: string;
  month: string;
}) => {
  const source = `${fileName}|${contractId}|${invoiceId}|${month}`;
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

const calculateAutomaticDelayDays = (month: string, paymentAmount: number | null, remainingAmount: number | null) => {
  if (paymentAmount && paymentAmount > 0) return 0;
  if (!remainingAmount || remainingAmount <= 0) return 0;

  const dueDateValue = parseMonthToDate(month);
  if (!dueDateValue) return 0;

  const dueDate = new Date(`${dueDateValue}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / 86_400_000);
  return Math.max(diffDays, 0);
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

const parseWorkbookFile = async (file: File): Promise<ParsedExcelFile> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<CellValue[]>(worksheet, { header: 1, raw: false, defval: null });

  const warnings: string[] = [];
  const headerRowIndex = findHeaderRow(rows);

  if (headerRowIndex < 0) {
    return {
      id: `${file.name}-${file.size}`,
      fileName: file.name,
      customerName: findCustomerName(rows),
      idNumber: findAdjacentValue(rows, /\bid\b|هويه|بطاقه/),
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
    const maintenanceAmount = readNumberFromColumns(row, maintenanceCols) ?? 0;
    const delayDaysFromFile = paymentAmount > 0 ? 0 : readNumberFromColumns(row, delayCols);
    const delayDays = delayDaysFromFile && delayDaysFromFile > 0
      ? delayDaysFromFile
      : calculateAutomaticDelayDays(cellText(row[monthCol]), paymentAmount, remainingAmount);
    const delayValue = calculateLateFee(delayDays);
    const trafficAmounts = readNumberPartsFromColumns(row, trafficCols);
    const trafficAmount = trafficAmounts.reduce((sum, amount) => sum + amount, 0);

    parsedRows.push({
      month: cellText(row[monthCol]),
      paymentAmount,
      remainingAmount,
      maintenanceAmount,
      delayDays,
      delayValue,
      trafficAmount,
      trafficAmounts,
      rowNumber: r + 1,
    });
  }

  const customerName = findCustomerName(rows);
  const idNumber = findAdjacentValue(rows, /\bid\b|هويه|بطاقه/);
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
    id: `${file.name}-${file.size}`,
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
    status: parsedRows.length === 0 ? 'empty' : warnings.length ? 'review_required' : 'ready',
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

const contractMatchWarning = (file: ParsedExcelFile) =>
  `لا يوجد عقد مطابق للملف "${file.customerName || file.fileName}". تأكد من تسجيل العميل والعقد أو صحح الاسم/اللوحة/الهاتف قبل الاعتماد.`;

const parseMonthToDate = (month: string) => {
  const [first, second] = month.split(/[-/]/).map((part) => Number(part));
  const year = first > 1000 ? first : second;
  const monthNumber = first > 1000 ? second : first;
  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) return null;
  return `${year}-${String(monthNumber).padStart(2, '0')}-01`;
};

const sameInvoiceMonth = (invoiceDate: string | null | undefined, monthDate: string) => invoiceDate?.slice(0, 7) === monthDate.slice(0, 7);

const findInvoiceForMonth = (invoices: ImportInvoice[], monthDate: string) =>
  invoices.find((invoice) => sameInvoiceMonth(invoice.invoice_date, monthDate)) ||
  invoices.find((invoice) => sameInvoiceMonth(invoice.due_date, monthDate)) ||
  null;

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
  const overpayment = parseContractOverpaymentMessage(message);

  if (overpayment) {
    return `لا يمكن تسجيل الدفعة لأن العقد تجاوز حد المدفوعات. قيمة العقد ${formatQar(overpayment.contractAmount)}، والمدفوع الحالي ${formatQar(overpayment.currentTotal)}، والحد المسموح ${formatQar(overpayment.allowedTotal)}. راجع مدفوعات العقد قبل إعادة الاعتماد.`;
  }

  return message;
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

const findBestContractMatch = async (companyId: string, file: ParsedExcelFile) => {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
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
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw error;

  const filePlate = compactText(file.plateNumber);
  const filePhone = digitsOnly(file.phone);
  const fileId = digitsOnly(file.idNumber);
  const fileName = compactText(file.customerName);

  const scored = ((data || []) as MatchedContract[]).map((contract) => {
    let score = 0;
    const contractPlate = compactText(contract.vehicles?.plate_number || contract.license_plate || '');
    const phone = digitsOnly(contract.customers?.phone || '');
    const nationalId = digitsOnly(contract.customers?.national_id || '');
    const name = buildContractCustomerName(contract);
    const hasNameInFile = Boolean(fileName);
    const nameMatches = isCompatibleTextMatch(fileName, name);

    if (hasNameInFile && !nameMatches) {
      return { contract, score: -1 };
    }

    if (filePlate && contractPlate && (filePlate === contractPlate || contractPlate.includes(filePlate) || filePlate.includes(contractPlate))) score += 60;
    if (filePhone && phone && (filePhone === phone || phone.endsWith(filePhone) || filePhone.endsWith(phone))) score += 25;
    if (fileId && nationalId && fileId === nationalId) score += 35;
    if (nameMatches) score += 35;

    return { contract, score };
  }).sort((a, b) => b.score - a.score);

  return scored[0]?.score >= 35 ? scored[0].contract : null;
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

  const existingInvoice = await findExistingMonthlyInvoice(companyId, contract.id, invoiceDate);
  if (existingInvoice) return { invoice: existingInvoice, created: false };

  const amount = monthlyRent || contract.monthly_amount || row.remainingAmount || row.paymentAmount || 0;
  if (amount <= 0) throw new Error(`لا يمكن إنشاء فاتورة للشهر ${row.month} بدون قيمة إيجار.`);

  const invoiceNumber = `HIST-${contract.contract_number}-${invoiceDate.slice(0, 7).replace('-', '')}`;
  const insertPayload = {
    company_id: companyId,
    customer_id: contract.customer_id,
    contract_id: contract.id,
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    due_date: invoiceDate,
    invoice_type: 'rental',
    subtotal: amount,
    total_amount: amount,
    paid_amount: 0,
    balance_due: amount,
    status: 'pending',
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
    blockers,
  };
};

export default function ExcelPaymentImport() {
  const navigate = useNavigate();
  const { companyId, user } = useUnifiedCompanyAccess();
  const financeAccess = useFinanceAccessGuard();
  const { createPayment, isCreating } = usePaymentOperations({
    autoCreateJournalEntry: true,
    autoUpdateBankBalance: true,
    enableNotifications: false,
  });
  const [files, setFiles] = useState<ParsedExcelFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [matchedContract, setMatchedContract] = useState<MatchedContract | null>(null);
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

  const selectedFile = files.find((file) => file.id === selectedId) || files[0] || null;
  const importResult = selectedFile ? importResults[selectedFile.id] || null : null;
  const openContractDetails = (contract: MatchedContract) => {
    navigate(`/contracts/${encodeURIComponent(contract.contract_number)}`);
  };
  const clearImportResultForFile = (fileId: string) => {
    setImportResults((current) => {
      const next = { ...current };
      delete next[fileId];
      return next;
    });
  };
  const setFileContractMatchState = (file: ParsedExcelFile, hasMatch: boolean) => {
    setFiles((currentFiles) => {
      let changed = false;
      const nextFiles = currentFiles.map((currentFile) => {
        if (currentFile.id !== file.id) return currentFile;

        const warning = contractMatchWarning(currentFile);
        const warnings = hasMatch
          ? currentFile.warnings.filter((item) => item !== warning)
          : Array.from(new Set([...currentFile.warnings, warning]));

        const updated = {
          ...currentFile,
          warnings,
          status: currentFile.status === 'empty' || currentFile.status === 'error'
            ? currentFile.status
            : warnings.length > 0
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
  const approvalSummary = useMemo(() => buildApprovalSummary(selectedFile), [selectedFile]);
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

  useEffect(() => {
    let isMounted = true;

    const runMatch = async () => {
      setMatchedContract(null);
      if (!companyId || !selectedFile) return;

      setIsMatchingContract(true);
      try {
        const match = await findBestContractMatch(companyId, selectedFile);
        if (isMounted) {
          setMatchedContract(match);
          setMatchedContractsByFile((current) => {
            if (match) return { ...current, [selectedFile.id]: match };
            const next = { ...current };
            delete next[selectedFile.id];
            return next;
          });
          setFileContractMatchState(selectedFile, Boolean(match));

          if (!match && !selectedFile.warnings.includes(contractMatchWarning(selectedFile))) {
            toast.error(contractMatchWarning(selectedFile));
          }
        }
      } catch (error) {
        console.error('Excel import contract matching failed:', error);
        if (isMounted) {
          setMatchedContract(null);
          setMatchedContractsByFile((current) => {
            const next = { ...current };
            delete next[selectedFile.id];
            return next;
          });
          setFileContractMatchState(selectedFile, false);
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

  const totals = useMemo(() => ({
    files: files.length,
    ready: files.filter((file) => file.status === 'ready').length,
    review: files.filter((file) => file.status === 'review_required').length,
    approved: files.filter((file) => Boolean(importResults[file.id])).length,
    pendingApproval: files.filter((file) => file.status === 'ready' && !importResults[file.id]).length,
    payments: files.reduce((sum, file) => sum + file.totalPayments, 0),
  }), [files, importResults]);

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
      const parsed = await Promise.all(
        excelFiles.map(async (file) => {
          try {
            return await parseWorkbookFile(file);
          } catch (error) {
            return {
              id: `${file.name}-${file.size}`,
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
        })
      );

      setFiles(parsed);
      setSelectedId(parsed[0]?.id || null);
      setIsEditMode(false);
      setEditBaselineRows(null);
      setEditReviewDialogOpen(false);
      setImportResults({});
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

          if ((field === 'paymentAmount' || field === 'remainingAmount') && normalizeEditableValue(updatedRow.remainingAmount) > 0 && normalizeEditableValue(updatedRow.delayDays) === 0) {
            updatedRow.delayDays = calculateAutomaticDelayDays(updatedRow.month, updatedRow.paymentAmount, updatedRow.remainingAmount);
            updatedRow.delayValue = calculateLateFee(updatedRow.delayDays);
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
      .filter((date): date is string => Boolean(date));

    if (paymentDates.length === 0) return [];
    const minDate = paymentDates[0];
    const maxDate = paymentDates[paymentDates.length - 1];

    const { data: periods, error } = await supabase
      .from('accounting_periods')
      .select('id,period_name,start_date,end_date,status')
      .eq('company_id', companyId)
      .lte('start_date', maxDate)
      .gte('end_date', minDate)
      .in('status', ['closed', 'locked']);

    if (error) throw error;

    const closedPeriods = ((periods || []) as AccountingPeriodRow[]).filter((period) =>
      paymentDates.some((date) => date >= period.start_date && date <= period.end_date)
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

  const createLateFeeIfNeeded = async (invoice: ImportInvoice, row: ParsedPaymentRow, contract: MatchedContract, file: ParsedExcelFile) => {
    if (!companyId || !row.delayValue || row.delayValue <= 0) return false;

    const { data: existing, error: existingError } = await supabase
      .from('late_fees')
      .select('id')
      .eq('company_id', companyId)
      .eq('invoice_id', invoice.id)
      .eq('fee_type', 'historical_excel_import')
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return false;

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
    return true;
  };

  const hasHistoricalExcelPayment = async (invoice: ImportInvoice, row: ParsedPaymentRow, contract: MatchedContract, file: ParsedExcelFile) => {
    if (!companyId) return false;
    const stableReference = buildHistoricalPaymentReference({
      fileName: file.fileName,
      contractId: contract.id,
      invoiceId: invoice.id,
      month: row.month,
    });

    const { data, error } = await supabase
      .from('payments')
      .select('id')
      .eq('company_id', companyId)
      .eq('invoice_id', invoice.id)
      .eq('contract_id', contract.id)
      .eq('payment_status', 'completed')
      .eq('reference_number', stableReference)
      .limit(1);

    if (error) throw error;
    return Boolean(data?.length);
  };

  const createTrafficViolationsIfNeeded = async (row: ParsedPaymentRow, contract: MatchedContract, file: ParsedExcelFile) => {
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
      const { data: existing, error: existingError } = await supabase
        .from('penalties')
        .select('id')
        .eq('company_id', companyId)
        .eq('penalty_number', penaltyNumber)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) continue;

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
      createdCount += 1;
    }

    return createdCount;
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
      let skipped = 0;
      let payableRows = 0;
      let missingInvoiceRows = 0;
      const skippedReasons: string[] = [];
      const paymentReport: PaymentReportRow[] = [];

      for (let index = 0; index < file.rows.length; index += 1) {
        const row = file.rows[index];
        const paymentAmount = row.paymentAmount || 0;
        if (paymentAmount > 0) payableRows += 1;

        onProgress?.({
          current: index + 1,
          total: file.rows.length,
          label: `معالجة ${file.customerName || file.fileName} - شهر ${row.month}: مطابقة الفاتورة وتسجيل الدفعات...`,
        });

        const { invoice, created } = await createOrFindMonthlyInvoice({
          companyId,
          contract,
          row,
          monthlyRent: file.monthlyRent || contract.monthly_amount,
        });

        if (!invoice) {
          if (paymentAmount > 0) {
            missingInvoiceRows += 1;
            skippedReasons.push(`لم يتم العثور على فاتورة شهر ${row.month} للعقد ${contract.contract_number}، لذلك لم يتم تسجيل دفعة هذا الشهر.`);
          }
          skipped += 1;
          continue;
        }

        if (created) invoicesCreated += 1;

        const monthDate = parseMonthToDate(row.month);
        const invoiceForPayment = monthDate
          ? await alignInvoiceDueDateToExcelMonth({ companyId, invoice, monthDate })
          : invoice;

        const invoiceBalance = Number(invoiceForPayment.balance_due ?? invoiceForPayment.total_amount ?? 0);
        const amountToApply = Math.min(paymentAmount, Math.max(invoiceBalance, 0));

        if (amountToApply > 0) {
          if (await hasHistoricalExcelPayment(invoiceForPayment, row, contract, file)) {
            skipped += 1;
            continue;
          }

          const stableReference = buildHistoricalPaymentReference({
            fileName: file.fileName,
            contractId: contract.id,
            invoiceId: invoiceForPayment.id,
            month: row.month,
          });

          try {
            const insertedPayment = await createPayment.mutateAsync({
              customer_id: contract.customer_id,
              contract_id: contract.id,
              invoice_id: invoiceForPayment.id,
              amount: amountToApply,
              payment_date: parseMonthToDate(row.month) || invoiceForPayment.invoice_date || invoiceForPayment.due_date || new Date().toISOString().slice(0, 10),
              payment_method: 'cash',
              type: 'receipt',
              currency: 'QAR',
              notes: `دفعة كاش تاريخية مستوردة من Excel - ${file.fileName} - شهر ${row.month}`,
              idempotencyKey: stableReference,
            });
            paymentReport.push({
              month: row.month,
              amount: amountToApply,
              customerName: getContractCustomerDisplayName(contract),
              contractNumber: contract.contract_number,
              contractPath: `/contracts/${encodeURIComponent(contract.contract_number)}`,
              invoiceId: invoiceForPayment.id,
              invoiceNumber: invoiceForPayment.invoice_number || '-',
              paymentId: String(insertedPayment?.id || ''),
              paymentNumber: String(insertedPayment?.payment_number || '-'),
              paymentDate: String(insertedPayment?.payment_date || parseMonthToDate(row.month) || invoiceForPayment.invoice_date || invoiceForPayment.due_date || ''),
              referenceNumber: String(insertedPayment?.reference_number || stableReference),
              destination: `payments.customer_id=${contract.customer_id} / payments.contract_id=${contract.id} / payments.invoice_id=${invoiceForPayment.id}`,
            });
            payments += 1;
          } catch (error: unknown) {
            const message = errorMessage(error);
            if (isDuplicateOrContractOverpaymentError(message)) {
              const reason = explainPaymentSkip(message, {
                customerName: file.customerName,
                month: row.month,
                amount: amountToApply,
              });
              console.warn('[ExcelPaymentImport] Skipped historical payment row:', {
                fileName: file.fileName,
                customerName: file.customerName,
                month: row.month,
                amount: amountToApply,
                reason: message,
              });
              skippedReasons.push(reason);
              skipped += 1;
            } else {
              throw error;
            }
          }
        } else if (paymentAmount > 0) {
          const reason = `فاتورة شهر ${row.month} لا يوجد عليها رصيد مستحق، لذلك لم يتم تسجيل دفعة جديدة.`;
          skippedReasons.push(reason);
          skipped += 1;
        }

        if (await createLateFeeIfNeeded(invoiceForPayment, row, contract, file)) lateFees += 1;
        trafficViolations += await createTrafficViolationsIfNeeded(row, contract, file);
      }

      if (payableRows > 0 && payments === 0 && missingInvoiceRows > 0) {
        const detail = Array.from(new Set(skippedReasons)).slice(0, 3).join(' ');
        throw new Error(
          `لم يتم تسجيل أي دفعة من الملف لأن الفواتير الشهرية المرتبطة بالعقد غير موجودة. ${detail}`
        );
      }

      await closeReopenedPeriods(reopenedPeriods);
      return { payments, invoicesCreated, lateFees, trafficViolations, skipped, skippedReasons, paymentReport };
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

    setIsApproving(true);
    setApprovalProgress({ current: 0, total: selectedFile.rows.length, label: 'تهيئة الاعتماد وفتح الفترات المالية عند الحاجة...' });

    try {
      const result = await approveFile(selectedFile, matchedContract, setApprovalProgress);
      setImportResults((current) => ({ ...current, [selectedFile.id]: result }));
      setMatchedContractsByFile((current) => ({ ...current, [selectedFile.id]: matchedContract }));
      setApprovalProgress({
        current: selectedFile.rows.length,
        total: selectedFile.rows.length,
        label: 'اكتمل الاعتماد بنجاح.',
      });
      toast.success('تم اعتماد ملف Excel وربطه بالنظام المالي');
    } catch (error: unknown) {
      console.error('Excel approval failed:', error);
      setApprovalProgress(null);
      toast.error(translateExcelImportError(error) || 'فشل اعتماد ملف Excel');
    } finally {
      setIsApproving(false);
    }
  };

  const executeBulkApproval = async () => {
    if (!companyId || isBulkApproving) return;

    const pendingFiles = files.filter((file) => file.status === 'ready' && !importResults[file.id]);
    if (pendingFiles.length === 0) {
      toast.info('لا توجد ملفات جاهزة غير معتمدة.');
      return;
    }

    setIsBulkApproving(true);
    setBulkApprovalProgress({ current: 0, total: pendingFiles.length, fileName: pendingFiles[0]?.fileName || '' });

    let approvedCount = 0;
    let skippedCount = 0;

    try {
      for (let index = 0; index < pendingFiles.length; index += 1) {
        const file = pendingFiles[index];
        setBulkApprovalProgress({ current: index + 1, total: pendingFiles.length, fileName: file.customerName || file.fileName });

        const summary = buildApprovalSummary(file);
        if (summary.blockers.length > 0) {
          skippedCount += 1;
          continue;
        }

        const contract = await findBestContractMatch(companyId, file);
        if (!contract) {
          setFileContractMatchState(file, false);
          toast.error(contractMatchWarning(file));
          skippedCount += 1;
          continue;
        }

        setFileContractMatchState(file, true);
        setMatchedContractsByFile((current) => ({ ...current, [file.id]: contract }));

        const result = await approveFile(file, contract);
        setImportResults((current) => ({ ...current, [file.id]: result }));
        approvedCount += 1;
      }

      toast.success(`تم اعتماد ${approvedCount} ملف${skippedCount ? `، وتخطي ${skippedCount} ملف يحتاج مراجعة` : ''}.`);
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
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                onClick={executeBulkApproval}
                disabled={isParsing || isApproving || isBulkApproving || isCreating || totals.pendingApproval === 0}
                className="gap-2 rounded-xl bg-[#020617] text-white hover:bg-[#1E293B]"
              >
                <ClipboardCheck className="h-4 w-4" />
                {isBulkApproving ? 'جاري الاعتماد الجماعي...' : `اعتماد كل الجاهز (${totals.pendingApproval})`}
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

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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

              <div className="max-h-[640px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                {filteredFiles.map((file) => {
                  const meta = statusMeta[file.status];
                  const Icon = meta.icon;
                  const fileResult = importResults[file.id];
                  const linkedContract = matchedContractsByFile[file.id];
                  return (
                    <button
                      key={file.id}
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
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
          </div>

          <div className={importResult ? 'hidden' : 'rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 text-[#475569]'}>
            <p className="font-bold text-[#020617]">عند التنفيذ النهائي سيقوم النظام بـ:</p>
            <p>- إنشاء دفعة كاش لكل شهر يحتوي على مبلغ مدفوع.</p>
            <p>- ربط كل دفعة بفاتورة الإيجار الخاصة بالشهر نفسه.</p>
            <p>- إبقاء الرصيد المتبقي على الفاتورة كذمة غير مدفوعة.</p>
            <p>- إنشاء غرامة التأخير كمستحق منفصل، وليس كجزء من دفعة الإيجار.</p>
            <p>- إنشاء المخالفات المرورية كمستحقات مستقلة عند وجودها.</p>
          </div>

          <div className={`${importResult ? 'hidden' : ''} rounded-xl border p-4 text-sm leading-6 ${
            matchedContract ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            <p className="font-bold">{isMatchingContract ? 'جاري مطابقة العقد...' : matchedContract ? 'العقد المطابق' : 'لم يتم العثور على عقد مطابق'}</p>
            {matchedContract ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <p>رقم العقد: <span className="font-bold">{matchedContract.contract_number}</span></p>
                <p>اللوحة: <span className="font-bold">{matchedContract.vehicles?.plate_number || matchedContract.license_plate || '-'}</span></p>
                <p>العميل: <span className="font-bold">{`${matchedContract.customers?.first_name || ''} ${matchedContract.customers?.last_name || ''}`.trim() || '-'}</span></p>
                <p>القسط: <span className="font-bold">{formatCurrency(matchedContract.monthly_amount || selectedFile?.monthlyRent || 0)}</span></p>
              </div>
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
              disabled={isApproving || isCreating || approvalBlockers.length > 0 || Boolean(importResult)}
              onClick={executeApproval}
            >
              {importResult ? 'تم الاعتماد' : isApproving || isCreating ? 'جاري الاعتماد...' : 'تنفيذ الاعتماد'}
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
