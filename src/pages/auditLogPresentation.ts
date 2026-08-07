import {
  CheckCircle,
  Clock,
  Download,
  FileText,
  Shield,
  User,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import type { AuditAction, AuditLog, AuditSeverity, AuditStatus } from '@/types/auditLog';

const actionIcons: Partial<Record<AuditAction, LucideIcon>> = {
  CREATE: CheckCircle,
  UPDATE: FileText,
  DELETE: XCircle,
  APPROVE: CheckCircle,
  REJECT: XCircle,
  CANCEL: XCircle,
  ARCHIVE: FileText,
  RESTORE: CheckCircle,
  EXPORT: Download,
  IMPORT: Download,
  LOGIN: User,
  LOGOUT: User,
  PERMISSION_CHANGE: Shield,
  ROLE_CHANGE: Shield,
};

const actionColors: Partial<Record<AuditAction, string>> = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  APPROVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  REJECT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  CANCEL: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  ARCHIVE: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  RESTORE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  EXPORT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  IMPORT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  LOGIN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  LOGOUT: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  PERMISSION_CHANGE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  ROLE_CHANGE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

const fallbackActionColor = 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300';

export const getAuditActionPresentation = (action: string) => {
  const normalizedAction = action.trim().toUpperCase() as AuditAction;

  return {
    ActionIcon: actionIcons[normalizedAction] ?? FileText,
    actionColor: actionColors[normalizedAction] ?? fallbackActionColor,
  };
};

export const getAuditStatusPresentation = (status?: string | null) => {
  const normalizedStatus = (status || 'pending').toLowerCase() as AuditStatus;

  if (normalizedStatus === 'success') {
    return {
      StatusIcon: CheckCircle,
      statusColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    };
  }

  if (normalizedStatus === 'failed') {
    return {
      StatusIcon: XCircle,
      statusColor: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    };
  }

  return {
    StatusIcon: Clock,
    statusColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  };
};

export const getAuditSeverityColor = (severity?: string | null) => {
  const normalizedSeverity = (severity || 'medium').toLowerCase() as AuditSeverity;

  switch (normalizedSeverity) {
    case 'low':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300';
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300';
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
  }
};

export const getAuditUserInitials = (name?: string | null, email?: string | null) => {
  const source = (name || email || '').trim();
  if (!source) return '؟';

  const parts = source.includes('@')
    ? source.split('@')[0].split(/[._-]/)
    : source.split(/\s+/);

  return parts
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '؟';
};

export const getAuditLogStats = (logs: AuditLog[]) => ({
  total: logs.length,
  successful: logs.filter((log) => log.status === 'success').length,
  failed: logs.filter((log) => log.status === 'failed').length,
  employees: new Set(
    logs
      .map((log) => log.user_email || log.user_name || log.user_id)
      .filter(Boolean)
  ).size,
});

const arabicActionLabels: Record<string, string> = {
  create: 'إنشاء',
  update: 'تحديث',
  delete: 'حذف',
  approve: 'اعتماد',
  reject: 'رفض',
  cancel: 'إلغاء',
  archive: 'أرشفة',
  restore: 'استعادة',
  export: 'تصدير',
  import: 'استيراد',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  failed_login: 'محاولة دخول فاشلة',
  data_export: 'تصدير بيانات',
  daily_audit_agent_run: 'تشغيل وكيل التدقيق اليومي',
  payment_created: 'إنشاء دفعة',
  payment_updated: 'تحديث دفعة',
  payment_deleted: 'حذف دفعة',
  contract_created: 'إنشاء عقد',
  contract_updated: 'تحديث عقد',
  contract_deleted: 'حذف عقد',
  customer_created: 'إنشاء عميل',
  customer_updated: 'تحديث عميل',
  customer_deleted: 'حذف عميل',
};

export const getAuditActionLabel = (action: string) => {
  const normalizedAction = action
    .trim()
    .toLowerCase()
    .replace(/^payments_/, 'payment_')
    .replace(/^invoices_/, 'invoice_')
    .replace(/^journal_entries_/, 'journal_entry_')
    .replace(/^contracts_/, 'contract_')
    .replace(/^customers_/, 'customer_')
    .replace(/^employees_/, 'employee_')
    .replace(/^vehicles_/, 'vehicle_');
  if (!normalizedAction) return 'إجراء غير معروف';
  if (arabicActionLabels[normalizedAction]) return arabicActionLabels[normalizedAction];

  if (normalizedAction.endsWith('_created')) return 'إنشاء سجل';
  if (normalizedAction.endsWith('_updated')) return 'تحديث سجل';
  if (normalizedAction.endsWith('_deleted')) return 'حذف سجل';

  return action;
};

const arabicResourceLabels: Record<string, string> = {
  payments: 'دفعة',
  invoices: 'فاتورة',
  contracts: 'عقد',
  customers: 'عميل',
  vehicles: 'مركبة',
  employees: 'موظف',
  journal_entries: 'قيد يومية',
  contract: 'عقد',
  customer: 'عميل',
  vehicle: 'مركبة',
  invoice: 'فاتورة',
  payment: 'دفعة',
  employee: 'موظف',
  user: 'مستخدم',
  company: 'شركة',
  maintenance: 'صيانة',
  penalty: 'مخالفة',
  journal_entry: 'قيد يومية',
  account: 'حساب',
  role: 'دور',
  permission: 'صلاحية',
  system: 'النظام',
  other: 'أخرى',
};

export const getAuditResourceLabel = (resourceType?: string | null) => {
  const normalized = (resourceType || '').trim().toLowerCase();
  return arabicResourceLabels[normalized] || resourceType || 'غير محدد';
};

export const getAuditStatusLabel = (status?: string | null) => {
  const normalized = (status || 'pending').trim().toLowerCase();
  if (normalized === 'success') return 'ناجح';
  if (normalized === 'failed') return 'فشل';
  return 'قيد الانتظار';
};

export const getAuditSeverityLabel = (severity?: string | null) => {
  const normalized = (severity || 'medium').trim().toLowerCase();
  if (normalized === 'low') return 'منخفضة';
  if (normalized === 'high') return 'عالية';
  if (normalized === 'critical') return 'حرجة';
  return 'متوسطة';
};
