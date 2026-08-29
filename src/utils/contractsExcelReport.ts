import type { Tables } from '@/integrations/supabase/types';

type ContractRow = Tables<'contracts'>;
type InvoiceRow = Tables<'invoices'>;
type PaymentRow = Tables<'payments'>;
type ContractDocumentRow = Tables<'contract_documents'>;

export type ContractReportCustomer = Pick<
  Tables<'customers'>,
  | 'id'
  | 'first_name'
  | 'last_name'
  | 'first_name_ar'
  | 'last_name_ar'
  | 'company_name'
  | 'company_name_ar'
  | 'customer_type'
  | 'phone'
  | 'email'
  | 'national_id'
>;

export type ContractReportVehicle = Pick<
  Tables<'vehicles'>,
  'id' | 'plate_number' | 'make' | 'model' | 'year' | 'status'
>;

export type ContractReportCostCenter = Pick<
  Tables<'cost_centers'>,
  'id' | 'center_code' | 'center_name' | 'center_name_ar'
>;

export type ContractReportEmployee = Pick<
  Tables<'profiles'>,
  'id' | 'first_name' | 'last_name' | 'first_name_ar' | 'last_name_ar' | 'email'
>;

export type ContractReportContract = ContractRow & {
  customer: ContractReportCustomer | null;
  vehicle: ContractReportVehicle | null;
  cost_center: ContractReportCostCenter | null;
  assigned_employee: ContractReportEmployee | null;
};

export type ContractReportInvoice = Pick<
  InvoiceRow,
  | 'id'
  | 'contract_id'
  | 'invoice_number'
  | 'invoice_month'
  | 'invoice_date'
  | 'due_date'
  | 'invoice_type'
  | 'status'
  | 'payment_status'
  | 'subtotal'
  | 'discount_amount'
  | 'tax_amount'
  | 'total_amount'
  | 'paid_amount'
  | 'balance_due'
  | 'currency'
  | 'notes'
>;

export type ContractReportPayment = Pick<
  PaymentRow,
  | 'id'
  | 'contract_id'
  | 'invoice_id'
  | 'payment_number'
  | 'payment_date'
  | 'payment_month'
  | 'due_date'
  | 'payment_method'
  | 'payment_type'
  | 'payment_status'
  | 'transaction_type'
  | 'amount'
  | 'amount_paid'
  | 'remaining_amount'
  | 'days_overdue'
  | 'late_fine_amount'
  | 'reference_number'
  | 'reconciliation_status'
  | 'allocation_status'
  | 'currency'
  | 'notes'
>;

export type ContractReportDocument = Pick<
  ContractDocumentRow,
  | 'id'
  | 'contract_id'
  | 'document_type'
  | 'document_name'
  | 'file_path'
  | 'processing_status'
  | 'legal_evidence_state'
  | 'legal_identity_match_status'
  | 'uploaded_at'
>;

export interface ContractsExcelReportInput {
  contracts: ContractReportContract[];
  invoices: ContractReportInvoice[];
  payments: ContractReportPayment[];
  documents: ContractReportDocument[];
  companyName: string;
  currency: string;
  generatedAt?: Date;
  includeCustomer?: boolean;
  includeFinancial?: boolean;
  includeVehicle?: boolean;
  includeInvoices?: boolean;
  includePayments?: boolean;
  includeAlerts?: boolean;
}

export interface ContractReportAlert {
  contractNumber: string;
  customerName: string;
  status: string;
  severity: 'مرتفعة' | 'متوسطة' | 'منخفضة';
  category: string;
  details: string;
  suggestedAction: string;
}

export interface ContractsExcelReportModel {
  generatedAt: Date;
  companyName: string;
  currency: string;
  summary: {
    totalContracts: number;
    activeContracts: number;
    cancelledContracts: number;
    legalContracts: number;
    expiredContracts: number;
    incompleteContracts: number;
    totalContractValue: number;
    activeMonthlyRevenue: number;
    totalPaid: number;
    totalBalance: number;
    totalLateFines: number;
    overdueContracts: number;
    expiringSoonContracts: number;
    alertCount: number;
  };
  statusBreakdown: Array<{ status: string; label: string; count: number }>;
  contractRows: Array<Record<string, string | number | boolean | Date | null>>;
  invoiceRows: Array<Record<string, string | number | Date | null>>;
  paymentRows: Array<Record<string, string | number | Date | null>>;
  alerts: ContractReportAlert[];
}

const MS_PER_DAY = 86_400_000;
const SIGNED_CONTRACT_TYPES = new Set(['signed_contract', 'signed_contract_image']);

const statusLabels: Record<string, string> = {
  active: 'نشط',
  cancelled: 'ملغي',
  expired: 'منتهي',
  draft: 'مسودة',
  under_review: 'قيد المراجعة',
  suspended: 'معلق',
  under_legal_procedure: 'إجراء قانوني',
  pending_completion: 'بانتظار الإكمال',
  expiring_soon: 'قارب الانتهاء',
};

const paymentStatusLabels: Record<string, string> = {
  paid: 'مدفوع',
  completed: 'مكتمل',
  pending: 'معلق',
  overdue: 'متأخر',
  partially_paid: 'مدفوع جزئياً',
  partial: 'جزئي',
  cancelled: 'ملغي',
  failed: 'فشل',
  unpaid: 'غير مدفوع',
};

const toLabel = (value: string | null | undefined, labels: Record<string, string>) => {
  if (!value) return '';
  return labels[value] || value;
};

const toDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (value: Date) =>
  Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());

const daysBetween = (from: Date, to: Date) =>
  Math.ceil((startOfDay(to) - startOfDay(from)) / MS_PER_DAY);

const getCustomerName = (customer: ContractReportCustomer | null | undefined) => {
  if (!customer) return '';
  const customerType = String(customer.customer_type || '');
  if (customerType === 'corporate' || customerType === 'company') {
    return customer.company_name_ar || customer.company_name || '';
  }
  return [
    customer.first_name_ar || customer.first_name,
    customer.last_name_ar || customer.last_name,
  ].filter(Boolean).join(' ').trim();
};

const getEmployeeName = (employee: ContractReportEmployee | null | undefined) => {
  if (!employee) return '';
  return [
    employee.first_name_ar || employee.first_name,
    employee.last_name_ar || employee.last_name,
  ].filter(Boolean).join(' ').trim() || employee.email || '';
};

const getSignedDocumentState = (documents: ContractReportDocument[]) => {
  const signedDocuments = documents.filter((document) =>
    SIGNED_CONTRACT_TYPES.has((document.document_type || '').toLowerCase()),
  );
  if (!signedDocuments.length) return 'غير متوفر';

  const activeDocuments = signedDocuments.filter((document) =>
    (document.legal_evidence_state || 'active') === 'active',
  );
  if (!activeDocuments.length) return 'غير نشط/محجور';
  if (activeDocuments.some((document) => document.legal_identity_match_status === 'matched')) {
    return 'موثق ومطابق';
  }
  if (activeDocuments.some((document) => document.legal_identity_match_status === 'mismatch')) {
    return 'غير مطابق';
  }
  if (activeDocuments.some((document) => document.legal_identity_match_status === 'pending')) {
    return 'بانتظار التحقق';
  }
  return 'متوفر وغير موثق';
};

const isIncompleteContract = (contract: ContractReportContract, generatedAt: Date) => {
  const endDate = toDate(contract.end_date);
  return !contract.customer_id
    || !contract.vehicle_id
    || (Number(contract.contract_amount || 0) === 0 && Number(contract.monthly_amount || 0) === 0)
    || (contract.status === 'active' && Boolean(endDate && endDate < generatedAt));
};

const buildAlerts = (
  contracts: ContractReportContract[],
  documentsByContract: Map<string, ContractReportDocument[]>,
  generatedAt: Date,
) => {
  const alerts: ContractReportAlert[] = [];

  const addAlert = (
    contract: ContractReportContract,
    severity: ContractReportAlert['severity'],
    category: string,
    details: string,
    suggestedAction: string,
  ) => {
    alerts.push({
      contractNumber: contract.contract_number || '',
      customerName: getCustomerName(contract.customer),
      status: toLabel(contract.status, statusLabels),
      severity,
      category,
      details,
      suggestedAction,
    });
  };

  contracts.forEach((contract) => {
    const endDate = toDate(contract.end_date);
    const daysLeft = endDate ? daysBetween(generatedAt, endDate) : null;
    const signedState = getSignedDocumentState(documentsByContract.get(contract.id) || []);

    if (contract.status === 'active' && daysLeft !== null && daysLeft < 0) {
      addAlert(
        contract,
        'مرتفعة',
        'تعارض حالة العقد',
        `العقد نشط رغم انتهاء تاريخه منذ ${Math.abs(daysLeft)} يوم`,
        'مراجعة حالة العقد والتجديد أو الإغلاق',
      );
    } else if (contract.status === 'active' && daysLeft !== null && daysLeft <= 30) {
      addAlert(
        contract,
        'متوسطة',
        'قرب انتهاء العقد',
        `متبقي ${Math.max(0, daysLeft)} يوم على نهاية العقد`,
        'بدء متابعة التجديد أو استلام المركبة',
      );
    }

    if (!contract.customer_id || !contract.customer) {
      addAlert(contract, 'مرتفعة', 'بيانات ناقصة', 'لا يوجد عميل مرتبط بالعقد', 'ربط العقد بسجل العميل الصحيح');
    }
    if (!contract.vehicle_id || !contract.vehicle) {
      addAlert(contract, 'مرتفعة', 'بيانات ناقصة', 'لا توجد مركبة مرتبطة بالعقد', 'ربط العقد بالمركبة الصحيحة');
    }
    if (Number(contract.contract_amount || 0) === 0 && Number(contract.monthly_amount || 0) === 0) {
      addAlert(contract, 'متوسطة', 'بيانات مالية ناقصة', 'قيمة العقد والإيجار الشهري يساويان صفراً', 'مراجعة القيم المالية للعقد');
    }
    if (Number(contract.balance_due || 0) > 0 && Number(contract.days_overdue || 0) > 0) {
      addAlert(
        contract,
        'مرتفعة',
        'تحصيل متأخر',
        `رصيد مستحق ${Number(contract.balance_due || 0)} ومتأخر ${Number(contract.days_overdue || 0)} يوم`,
        'بدء إجراء التحصيل ومراجعة الفواتير والمدفوعات',
      );
    }
    if (contract.legal_status || contract.status === 'under_legal_procedure') {
      addAlert(contract, 'مرتفعة', 'متابعة قانونية', `الحالة القانونية: ${contract.legal_status || 'إجراء قانوني'}`, 'مراجعة ملف العقد القانوني');
    }
    if (
      ['active', 'under_legal_procedure', 'pending_completion'].includes(contract.status)
      && signedState === 'غير متوفر'
    ) {
      addAlert(contract, 'متوسطة', 'مستند مفقود', 'لا توجد نسخة عقد موقع نشطة', 'رفع نسخة العقد الموقعة وربطها بالعقد');
    } else if (['غير مطابق', 'غير نشط/محجور'].includes(signedState)) {
      addAlert(contract, 'مرتفعة', 'سلامة المستند', `حالة العقد الموقع: ${signedState}`, 'مراجعة مطابقة هوية العقد الموقع');
    }
  });

  const severityOrder = { مرتفعة: 0, متوسطة: 1, منخفضة: 2 } as const;
  return alerts.sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity]
    || a.contractNumber.localeCompare(b.contractNumber, 'ar'),
  );
};

export const buildContractsExcelReportModel = (
  input: ContractsExcelReportInput,
): ContractsExcelReportModel => {
  const generatedAt = input.generatedAt ? new Date(input.generatedAt) : new Date();
  const documentsByContract = new Map<string, ContractReportDocument[]>();
  input.documents.forEach((document) => {
    if (!document.contract_id) return;
    const current = documentsByContract.get(document.contract_id) || [];
    current.push(document);
    documentsByContract.set(document.contract_id, current);
  });

  const contractById = new Map(input.contracts.map((contract) => [contract.id, contract]));
  const alerts = buildAlerts(input.contracts, documentsByContract, generatedAt);
  const statusCounts = input.contracts.reduce<Record<string, number>>((counts, contract) => {
    const status = contract.status || 'unknown';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  const contractRows = input.contracts.map((contract) => {
    const startDate = toDate(contract.start_date);
    const endDate = toDate(contract.end_date);
    const daysLeft = endDate ? daysBetween(generatedAt, endDate) : null;
    const duration = startDate && endDate ? Math.max(0, daysBetween(startDate, endDate)) : null;
    const amount = Number(contract.contract_amount || 0);
    const paid = Number(contract.total_paid || 0);
    const signedState = getSignedDocumentState(documentsByContract.get(contract.id) || []);

    return {
      'رقم العقد': contract.contract_number || '',
      'نوع العقد': contract.contract_type || '',
      'حالة العقد': toLabel(contract.status, statusLabels),
      'الحالة الفرعية': contract.sub_status || '',
      'الحالة القانونية': contract.legal_status || '',
      'تاريخ العقد': toDate(contract.contract_date),
      'تاريخ البداية': startDate,
      'تاريخ النهاية': endDate,
      'المدة بالأيام': duration,
      'الأيام المتبقية/المتأخرة': daysLeft,
      'اسم العميل': getCustomerName(contract.customer),
      'نوع العميل': ['corporate', 'company'].includes(String(contract.customer?.customer_type || ''))
        ? 'شركة'
        : contract.customer?.customer_type === 'individual' ? 'فرد' : '',
      'رقم الهوية': contract.customer?.national_id || '',
      'الهاتف': contract.customer?.phone || '',
      'البريد الإلكتروني': contract.customer?.email || '',
      'رقم اللوحة': contract.vehicle?.plate_number || contract.license_plate || '',
      'الماركة': contract.vehicle?.make || contract.make || '',
      'الموديل': contract.vehicle?.model || contract.model || '',
      'سنة الصنع': contract.vehicle?.year || contract.year || null,
      'حالة المركبة': contract.vehicle?.status || contract.vehicle_status || '',
      'تم إرجاع المركبة': contract.vehicle_returned ? 'نعم' : 'لا',
      [`الإيجار الشهري (${input.currency})`]: Number(contract.monthly_amount || 0),
      [`قيمة العقد (${input.currency})`]: amount,
      [`إجمالي المدفوع (${input.currency})`]: paid,
      [`الرصيد المستحق (${input.currency})`]: Number(contract.balance_due || 0),
      [`الغرامات (${input.currency})`]: Number(contract.late_fine_amount || 0),
      'نسبة التحصيل': amount > 0 ? Math.min(1, Math.max(0, paid / amount)) : 0,
      'حالة الدفع': toLabel(contract.payment_status, paymentStatusLabels),
      'أيام التأخير': Number(contract.days_overdue || 0),
      'آخر تاريخ دفع': toDate(contract.last_payment_date),
      'مركز التكلفة': contract.cost_center?.center_name_ar || contract.cost_center?.center_name || '',
      'كود مركز التكلفة': contract.cost_center?.center_code || '',
      'الموظف المسؤول': getEmployeeName(contract.assigned_employee),
      'تاريخ الإسناد': toDate(contract.assigned_at),
      'ملاحظات الإسناد': contract.assignment_notes || '',
      'التجديد التلقائي': contract.auto_renew_enabled ? 'نعم' : 'لا',
      'حالة العقد الموقع': signedState,
      'سبب التعليق': contract.suspension_reason || '',
      'الوصف': contract.description || '',
      'مصدر الإنشاء': contract.created_via || '',
      'تاريخ الإنشاء': toDate(contract.created_at),
      'آخر تحديث': toDate(contract.updated_at),
    };
  });

  const invoiceRows = input.invoices.map((invoice) => {
    const contract = invoice.contract_id ? contractById.get(invoice.contract_id) : undefined;
    return {
      'رقم العقد': contract?.contract_number || '',
      'اسم العميل': getCustomerName(contract?.customer),
      'رقم الفاتورة': invoice.invoice_number,
      'شهر الفاتورة': toDate(invoice.invoice_month),
      'تاريخ الفاتورة': toDate(invoice.invoice_date),
      'تاريخ الاستحقاق': toDate(invoice.due_date),
      'نوع الفاتورة': invoice.invoice_type,
      'حالة الفاتورة': invoice.status,
      'حالة السداد': toLabel(invoice.payment_status, paymentStatusLabels),
      [`الإجمالي (${input.currency})`]: Number(invoice.total_amount || 0),
      [`المدفوع (${input.currency})`]: Number(invoice.paid_amount || 0),
      [`الرصيد (${input.currency})`]: Number(invoice.balance_due || 0),
      'العملة الأصلية': invoice.currency || input.currency,
      'ملاحظات': invoice.notes || '',
    };
  });

  const paymentRows = input.payments.map((payment) => {
    const contract = payment.contract_id ? contractById.get(payment.contract_id) : undefined;
    return {
      'رقم العقد': contract?.contract_number || '',
      'اسم العميل': getCustomerName(contract?.customer),
      'رقم الدفعة': payment.payment_number,
      'تاريخ الدفع': toDate(payment.payment_date),
      'شهر الدفع': toDate(payment.payment_month),
      'تاريخ الاستحقاق': toDate(payment.due_date),
      'طريقة الدفع': payment.payment_method,
      'نوع الدفع': payment.payment_type,
      'نوع الحركة': payment.transaction_type,
      'حالة الدفع': toLabel(payment.payment_status, paymentStatusLabels),
      [`المبلغ (${input.currency})`]: Number(payment.amount || 0),
      [`المدفوع (${input.currency})`]: Number(payment.amount_paid ?? payment.amount ?? 0),
      [`المتبقي (${input.currency})`]: Number(payment.remaining_amount || 0),
      'أيام التأخير': Number(payment.days_overdue || 0),
      [`غرامة التأخير (${input.currency})`]: Number(payment.late_fine_amount || 0),
      'العملة الأصلية': payment.currency || input.currency,
      'المرجع': payment.reference_number || '',
      'حالة التسوية': payment.reconciliation_status || '',
      'حالة التخصيص': payment.allocation_status || '',
      'ملاحظات': payment.notes || '',
    };
  });

  const activeContracts = input.contracts.filter((contract) => contract.status === 'active');
  const expiringSoonContracts = activeContracts.filter((contract) => {
    const endDate = toDate(contract.end_date);
    if (!endDate) return false;
    const daysLeft = daysBetween(generatedAt, endDate);
    return daysLeft >= 0 && daysLeft <= 30;
  }).length;

  return {
    generatedAt,
    companyName: input.companyName,
    currency: input.currency,
    summary: {
      totalContracts: input.contracts.length,
      activeContracts: activeContracts.length,
      cancelledContracts: statusCounts.cancelled || 0,
      legalContracts: input.contracts.filter((contract) => contract.status === 'under_legal_procedure' || Boolean(contract.legal_status)).length,
      expiredContracts: statusCounts.expired || 0,
      incompleteContracts: input.contracts.filter((contract) => isIncompleteContract(contract, generatedAt)).length,
      totalContractValue: input.contracts.reduce((sum, contract) => sum + Number(contract.contract_amount || 0), 0),
      activeMonthlyRevenue: activeContracts.reduce((sum, contract) => sum + Number(contract.monthly_amount || 0), 0),
      totalPaid: input.contracts.reduce((sum, contract) => sum + Number(contract.total_paid || 0), 0),
      totalBalance: input.contracts.reduce((sum, contract) => sum + Number(contract.balance_due || 0), 0),
      totalLateFines: input.contracts.reduce((sum, contract) => sum + Number(contract.late_fine_amount || 0), 0),
      overdueContracts: input.contracts.filter((contract) => Number(contract.balance_due || 0) > 0 && Number(contract.days_overdue || 0) > 0).length,
      expiringSoonContracts,
      alertCount: alerts.length,
    },
    statusBreakdown: Object.entries(statusCounts)
      .map(([status, count]) => ({ status, label: toLabel(status, statusLabels), count }))
      .sort((a, b) => b.count - a.count),
    contractRows,
    invoiceRows,
    paymentRows,
    alerts,
  };
};

const getColumnLetter = (columnNumber: number) => {
  let result = '';
  let number = columnNumber;
  while (number > 0) {
    const remainder = (number - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    number = Math.floor((number - 1) / 26);
  }
  return result;
};

const addDataSheet = (
  workbook: import('exceljs').Workbook,
  name: string,
  rows: Array<Record<string, unknown>>,
  emptyHeaders: string[],
  currency: string,
) => {
  const sheet = workbook.addWorksheet(name, {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });
  const headers = rows.length ? Object.keys(rows[0]) : emptyHeaders;
  sheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(34, Math.max(13, header.length + 4)),
  }));

  rows.forEach((row) => sheet.addRow(row));
  const headerRow = sheet.getRow(1);
  headerRow.height = 30;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF102B4E' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  if (headers.length) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, rows.length + 1), column: headers.length },
    };
  }

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.height = 22;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: false };
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFDDE5EF' } },
      };
      if (cell.value instanceof Date) cell.numFmt = 'yyyy-mm-dd';
    });
    if (rowNumber % 2 === 0) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
  });

  headers.forEach((header, index) => {
    const column = sheet.getColumn(index + 1);
    if (header.includes(`(${currency})`) || /الإجمالي|المدفوع|الرصيد|المبلغ|الغرامات|الإيجار|قيمة العقد/.test(header)) {
      column.numFmt = '#,##0.00';
    }
    if (header === 'نسبة التحصيل') column.numFmt = '0.0%';
    if (/ملاحظات|الوصف|التفاصيل|الإجراء/.test(header)) column.width = 34;
    if (/رقم العقد|رقم الفاتورة|رقم الدفعة|رقم اللوحة|رقم الهوية|الهاتف/.test(header)) {
      column.numFmt = '@';
    }
  });

  sheet.pageSetup = {
    orientation: headers.length > 10 ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  };
  sheet.headerFooter.oddHeader = `&C&"Arial,Bold"${name}`;
  sheet.headerFooter.oddFooter = '&Rصفحة &P من &N';
  return sheet;
};

export const createContractsExcelWorkbook = async (input: ContractsExcelReportInput) => {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const model = buildContractsExcelReportModel(input);
  workbook.creator = 'Fleetify';
  workbook.company = input.companyName;
  workbook.created = model.generatedAt;
  workbook.modified = model.generatedAt;
  workbook.calcProperties.fullCalcOnLoad = true;
  const summarySheet = workbook.addWorksheet('الملخص التنفيذي', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 5 }],
  });

  const contractHeaders = model.contractRows.length ? Object.keys(model.contractRows[0]) : ['رقم العقد'];
  const filteredContractRows = model.contractRows.map((row) => {
    const filtered = { ...row };
    if (input.includeCustomer === false) {
      ['اسم العميل', 'نوع العميل', 'رقم الهوية', 'الهاتف', 'البريد الإلكتروني'].forEach((key) => delete filtered[key]);
    }
    if (input.includeVehicle === false) {
      ['رقم اللوحة', 'الماركة', 'الموديل', 'سنة الصنع', 'حالة المركبة', 'تم إرجاع المركبة'].forEach((key) => delete filtered[key]);
    }
    if (input.includeFinancial === false) {
      Object.keys(filtered).filter((key) =>
        /الإيجار الشهري|قيمة العقد|إجمالي المدفوع|الرصيد المستحق|الغرامات|نسبة التحصيل|حالة الدفع|أيام التأخير|آخر تاريخ دفع/.test(key),
      ).forEach((key) => delete filtered[key]);
    }
    return filtered;
  });

  addDataSheet(
    workbook,
    'جميع العقود',
    filteredContractRows,
    contractHeaders,
    input.currency,
  );

  if (input.includeInvoices !== false) {
    addDataSheet(
      workbook,
      'الفواتير',
      model.invoiceRows,
      ['رقم العقد', 'اسم العميل', 'رقم الفاتورة', 'شهر الفاتورة', 'تاريخ الفاتورة', 'تاريخ الاستحقاق', 'حالة السداد'],
      input.currency,
    );
  }
  if (input.includePayments !== false) {
    addDataSheet(
      workbook,
      'المدفوعات',
      model.paymentRows,
      ['رقم العقد', 'اسم العميل', 'رقم الدفعة', 'تاريخ الدفع', 'طريقة الدفع', 'حالة الدفع'],
      input.currency,
    );
  }
  if (input.includeAlerts !== false) {
    const alertRows = model.alerts.map((alert) => ({
      'رقم العقد': alert.contractNumber,
      'اسم العميل': alert.customerName,
      'حالة العقد': alert.status,
      'الأولوية': alert.severity,
      'نوع التنبيه': alert.category,
      'التفاصيل': alert.details,
      'الإجراء المقترح': alert.suggestedAction,
    }));
    const alertSheet = addDataSheet(
      workbook,
      'التنبيهات',
      alertRows,
      ['رقم العقد', 'اسم العميل', 'حالة العقد', 'الأولوية', 'نوع التنبيه', 'التفاصيل', 'الإجراء المقترح'],
      input.currency,
    );
    alertSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const severity = String(row.getCell(4).value || '');
      const color = severity === 'مرتفعة' ? 'FFFEE2E2' : severity === 'متوسطة' ? 'FFFEF3C7' : 'FFEAF8FE';
      row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      row.getCell(4).font = { bold: true };
    });
  }

  summarySheet.columns = [
    { width: 30 },
    { width: 22 },
    { width: 24 },
    { width: 28 },
  ];
  summarySheet.mergeCells('A1:D1');
  summarySheet.getCell('A1').value = 'التقرير الشامل للعقود';
  summarySheet.getCell('A1').font = { bold: true, size: 20, color: { argb: 'FFFFFFFF' } };
  summarySheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF102B4E' } };
  summarySheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 38;
  summarySheet.getCell('A2').value = 'الشركة';
  summarySheet.getCell('B2').value = model.companyName;
  summarySheet.getCell('A3').value = 'تاريخ إنشاء التقرير';
  summarySheet.getCell('B3').value = model.generatedAt;
  summarySheet.getCell('B3').numFmt = 'yyyy-mm-dd hh:mm';
  summarySheet.getCell('C2').value = 'العملة';
  summarySheet.getCell('D2').value = model.currency;
  summarySheet.getCell('C3').value = 'عدد أوراق البيانات';
  summarySheet.getCell('D3').value = workbook.worksheets.length;

  const contractRowEnd = Math.max(2, filteredContractRows.length + 1);
  const headerIndex = new Map(Object.keys(filteredContractRows[0] || {}).map((header, index) => [header, index + 1]));
  const statusColumn = getColumnLetter(headerIndex.get('حالة العقد') || 3);
  const contractValueHeader = Object.keys(filteredContractRows[0] || {}).find((key) => key.startsWith('قيمة العقد'));
  const paidHeader = Object.keys(filteredContractRows[0] || {}).find((key) => key.startsWith('إجمالي المدفوع'));
  const balanceHeader = Object.keys(filteredContractRows[0] || {}).find((key) => key.startsWith('الرصيد المستحق'));
  const lateFineHeader = Object.keys(filteredContractRows[0] || {}).find((key) => key.startsWith('الغرامات'));
  const formulaRange = (header: string | undefined) => {
    const column = getColumnLetter(headerIndex.get(header || '') || 1);
    return `'جميع العقود'!${column}2:${column}${contractRowEnd}`;
  };

  const metrics: Array<[string, number, string | null, string]> = [
    ['إجمالي العقود', model.summary.totalContracts, `COUNTA('جميع العقود'!A2:A${contractRowEnd})`, '#,##0'],
    ['العقود النشطة', model.summary.activeContracts, `COUNTIF('جميع العقود'!${statusColumn}2:${statusColumn}${contractRowEnd},"نشط")`, '#,##0'],
    ['العقود الملغاة', model.summary.cancelledContracts, `COUNTIF('جميع العقود'!${statusColumn}2:${statusColumn}${contractRowEnd},"ملغي")`, '#,##0'],
    ['العقود القانونية', model.summary.legalContracts, null, '#,##0'],
    ['العقود غير المكتملة', model.summary.incompleteContracts, null, '#,##0'],
    [`إجمالي قيمة العقود (${model.currency})`, model.summary.totalContractValue, contractValueHeader ? `SUM(${formulaRange(contractValueHeader)})` : null, '#,##0.00'],
    [`الإيراد الشهري النشط (${model.currency})`, model.summary.activeMonthlyRevenue, null, '#,##0.00'],
    [`إجمالي المدفوع (${model.currency})`, model.summary.totalPaid, paidHeader ? `SUM(${formulaRange(paidHeader)})` : null, '#,##0.00'],
    [`إجمالي الرصيد (${model.currency})`, model.summary.totalBalance, balanceHeader ? `SUM(${formulaRange(balanceHeader)})` : null, '#,##0.00'],
    [`إجمالي الغرامات (${model.currency})`, model.summary.totalLateFines, lateFineHeader ? `SUM(${formulaRange(lateFineHeader)})` : null, '#,##0.00'],
    ['عقود متأخرة في السداد', model.summary.overdueContracts, null, '#,##0'],
    ['عقود تنتهي خلال 30 يوماً', model.summary.expiringSoonContracts, null, '#,##0'],
    ['إجمالي التنبيهات', model.summary.alertCount, null, '#,##0'],
  ];

  summarySheet.addRow([]);
  const metricsHeader = summarySheet.addRow(['المؤشر', 'القيمة']);
  metricsHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  metricsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C7A1' } };
  metricsHeader.alignment = { horizontal: 'center' };
  metrics.forEach(([label, result, formula, numFmt]) => {
    const row = summarySheet.addRow([label, formula ? { formula, result } : result]);
    row.getCell(2).numFmt = numFmt;
    row.getCell(2).font = { bold: true, color: { argb: 'FF102B4E' } };
  });

  const distributionStart = metricsHeader.number + metrics.length + 2;
  summarySheet.getCell(`A${distributionStart}`).value = 'توزيع حالات العقود';
  summarySheet.getCell(`A${distributionStart}`).font = { bold: true, size: 14, color: { argb: 'FF102B4E' } };
  const distributionHeader = summarySheet.getRow(distributionStart + 1);
  distributionHeader.values = ['الحالة', 'العدد', 'مؤشر مرئي'];
  distributionHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  distributionHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF38BDF8' } };
  model.statusBreakdown.forEach((status, index) => {
    const rowNumber = distributionStart + 2 + index;
    const row = summarySheet.getRow(rowNumber);
    row.getCell(1).value = status.label;
    row.getCell(2).value = {
      formula: `COUNTIF('جميع العقود'!${statusColumn}2:${statusColumn}${contractRowEnd},A${rowNumber})`,
      result: status.count,
    };
    row.getCell(3).value = {
      formula: `REPT("█",ROUND(B${rowNumber}/MAX($B$${distributionStart + 2}:$B$${distributionStart + 1 + model.statusBreakdown.length})*20,0))`,
      result: '█'.repeat(model.summary.totalContracts ? Math.round((status.count / Math.max(...model.statusBreakdown.map((item) => item.count), 1)) * 20) : 0),
    };
    row.getCell(3).font = { color: { argb: 'FF22C7A1' } };
  });

  ['A2', 'A3', 'C2', 'C3'].forEach((address) => {
    summarySheet.getCell(address).font = { bold: true, color: { argb: 'FF64748B' } };
  });
  summarySheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 1) return;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFDDE5EF' } } };
    });
  });
  summarySheet.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, paperSize: 9 };
  summarySheet.headerFooter.oddFooter = '&Rصفحة &P من &N';

  return { workbook, model };
};

export const exportContractsExcelReport = async (input: ContractsExcelReportInput) => {
  const { workbook, model } = await createContractsExcelWorkbook(input);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `contracts_comprehensive_report_${model.generatedAt.toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
