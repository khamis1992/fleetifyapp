import type { AuditLog } from '@/types/auditLog';

type JsonRecord = Record<string, unknown>;

const resourceAliases: Record<string, string> = {
  payments: 'payment',
  invoices: 'invoice',
  contracts: 'contract',
  customers: 'customer',
  vehicles: 'vehicle',
  employees: 'employee',
  journal_entries: 'journal_entry',
  chart_of_accounts: 'account',
};

const arabicResourceNames: Record<string, string> = {
  payment: 'دفعة',
  invoice: 'فاتورة',
  contract: 'عقد',
  customer: 'عميل',
  vehicle: 'مركبة',
  employee: 'موظف',
  journal_entry: 'قيد يومية',
  account: 'حساب',
  system: 'النظام',
  user: 'مستخدم',
  other: 'سجل',
};

const arabicFieldNames: Record<string, string> = {
  amount: 'المبلغ',
  amount_paid: 'المبلغ المدفوع',
  balance_due: 'المتبقي',
  contract_number: 'رقم العقد',
  description: 'الوصف',
  entry_date: 'تاريخ القيد',
  entry_number: 'رقم القيد',
  invoice_number: 'رقم الفاتورة',
  paid_amount: 'المبلغ المدفوع',
  payment_date: 'تاريخ الدفع',
  payment_method: 'طريقة الدفع',
  payment_number: 'رقم الدفعة',
  payment_status: 'حالة الدفع',
  payment_type: 'نوع الدفع',
  reference_number: 'الرقم المرجعي',
  status: 'الحالة',
  total_amount: 'الإجمالي',
};

const identifierKeysByResource: Record<string, string[]> = {
  payment: ['payment_number', 'reference_number', 'agreement_number'],
  invoice: ['invoice_number'],
  contract: ['contract_number', 'agreement_number'],
  journal_entry: ['entry_number', 'description'],
  customer: ['customer_name', 'company_name_ar', 'full_name', 'name'],
  vehicle: ['plate_number', 'vehicle_number'],
  employee: ['employee_number', 'full_name', 'name'],
  account: ['account_code', 'account_name'],
};

const genericIdentifierKeys = [
  'entity_name',
  'payment_number',
  'invoice_number',
  'contract_number',
  'entry_number',
  'reference_number',
  'customer_name',
  'company_name_ar',
  'plate_number',
  'account_name',
  'employee_number',
  'name',
  'description',
];

const asRecord = (value: unknown): JsonRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonRecord;
};

const asText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

const getValue = (record: JsonRecord | null, key: string) =>
  record?.[key] === undefined ? null : record[key];

const getFirstValue = (records: Array<JsonRecord | null>, keys: string[]) => {
  for (const record of records) {
    for (const key of keys) {
      const value = asText(getValue(record, key));
      if (value) return value;
    }
  }

  return null;
};

const getNestedRecords = (log: AuditLog) => {
  const metadata = asRecord(log.metadata);

  return [
    asRecord(log.new_values),
    asRecord(log.old_values),
    metadata,
    asRecord(metadata?.financial_data),
  ];
};

export const normalizeAuditResourceType = (resourceType?: string | null) => {
  const normalized = (resourceType || '').trim().toLowerCase();
  return resourceAliases[normalized] || normalized || 'other';
};

export const getAuditResourceAliases = (resourceType?: string | null) => {
  const normalized = normalizeAuditResourceType(resourceType);
  const aliases = Object.entries(resourceAliases)
    .filter(([, singular]) => singular === normalized)
    .map(([plural]) => plural);

  return Array.from(new Set([normalized, ...aliases]));
};

export const getAuditResourceDisplayName = (resourceType?: string | null) =>
  arabicResourceNames[normalizeAuditResourceType(resourceType)] || 'سجل';

export const deriveAuditEntityName = (log: AuditLog) => {
  const explicitName = asText(log.entity_name);
  if (explicitName) return explicitName;

  const records = getNestedRecords(log);
  const resourceType = normalizeAuditResourceType(log.resource_type);
  const resourceSpecific = getFirstValue(records, identifierKeysByResource[resourceType] || []);
  const generic = getFirstValue(records, genericIdentifierKeys);

  return resourceSpecific || generic || null;
};

const formatAuditValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'فارغ';
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (typeof value === 'number') return new Intl.NumberFormat('ar-QA').format(value);

  const text = String(value);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
};

const getChangedFields = (log: AuditLog) => {
  const metadata = asRecord(log.metadata);
  const changedFields = asRecord(metadata?.changed_fields);
  if (changedFields) return Object.keys(changedFields);

  const oldValues = asRecord(log.old_values);
  const newValues = asRecord(log.new_values);
  if (!oldValues || !newValues) return [];

  return Object.keys(newValues).filter((key) => oldValues[key] !== newValues[key]);
};

export const deriveAuditChangesSummary = (log: AuditLog) => {
  const explicitSummary = asText(log.changes_summary);
  if (explicitSummary) return explicitSummary;

  const resourceName = getAuditResourceDisplayName(log.resource_type);
  const entityName = deriveAuditEntityName(log);
  const entityText = entityName ? ` ${entityName}` : '';
  const action = (log.action || '').toLowerCase();
  const changedFields = getChangedFields(log)
    .filter((key) => !['updated_at', 'updated_by', 'company_id'].includes(key));

  if (action.includes('delete')) {
    return `تم حذف ${resourceName}${entityText}`;
  }

  if (action.includes('create')) {
    return `تم إنشاء ${resourceName}${entityText}`;
  }

  if (changedFields.length > 0) {
    const oldValues = asRecord(log.old_values);
    const newValues = asRecord(log.new_values);
    const details = changedFields.slice(0, 3).map((field) => {
      const label = arabicFieldNames[field] || field;
      return `${label}: ${formatAuditValue(oldValues?.[field])} ← ${formatAuditValue(newValues?.[field])}`;
    });
    const remaining = changedFields.length > 3 ? ` و${changedFields.length - 3} حقول أخرى` : '';

    return `تم تحديث ${resourceName}${entityText} — ${details.join('، ')}${remaining}`;
  }

  return `تم تحديث ${resourceName}${entityText}`.trim();
};
