import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { financeToday } from '@/services/financialReporting';
import { summarizeFinancialReportError } from '@/utils/financialReportDiagnostics';
import type { FinancialStatementConfiguration, FinancialStatementReview } from '@/types/financialStatementPackage';
import { parseFinancialStatementPackage, parseSavedFinancialStatementPackage, validateFinancialStatementConfiguration } from '@/utils/financialStatementPackageValidation';

type Command = 'get_financial_statement_package_v1' | 'list_financial_statement_packages_v1' | 'save_financial_statement_package_v1' | 'approve_financial_statement_package_v1' | 'void_financial_statement_package_v1'
  | 'list_financial_reporting_period_locks_v1' | 'lock_financial_reporting_period_v1' | 'unlock_financial_reporting_period_v1';
const rpc = (name: Command, args: Record<string, unknown>) => (supabase.rpc as unknown as (name: Command, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>)(name, args);
const uuid = z.string().uuid();
export async function readFinancialStatementPackage(companyId: string, configuration: FinancialStatementConfiguration) {
  uuid.parse(companyId);
  const config = validateFinancialStatementConfiguration(configuration, financeToday());
  const { data, error } = await rpc('get_financial_statement_package_v1', { p_company_id: companyId, p_configuration: config });
  if (error) {
    console.error('Financial statement request failed', JSON.stringify(summarizeFinancialReportError(error)));
    throw error;
  }
  try {
    return parseFinancialStatementPackage(data, companyId, config);
  } catch (validationError) {
    console.error('Financial statement response validation failed', JSON.stringify(summarizeFinancialReportError(validationError)));
    throw validationError;
  }
}
export async function listFinancialStatementPackages(companyId: string) {
  uuid.parse(companyId);
  const { data, error } = await rpc('list_financial_statement_packages_v1', { p_company_id: companyId });
  if (error) throw error;
  return z.array(z.unknown()).parse(data).map(item => parseSavedFinancialStatementPackage(item, companyId));
}
export async function saveFinancialStatementPackage(companyId: string, configuration: FinancialStatementConfiguration) {
  uuid.parse(companyId);
  const config = validateFinancialStatementConfiguration(configuration, financeToday());
  const { data, error } = await rpc('save_financial_statement_package_v1', { p_company_id: companyId, p_configuration: config });
  if (error) throw error;
  const saved = parseSavedFinancialStatementPackage(data, companyId);
  parseFinancialStatementPackage(saved.payload, companyId, config);
  if (saved.status !== 'draft') throw new Error('FINANCIAL_STATEMENT_SCOPE_MISMATCH');
  return saved;
}
export async function approveFinancialStatementPackage(companyId: string, id: string, notes: string, confirmations: FinancialStatementReview, selfReviewAcknowledged = false) {
  uuid.parse(companyId); uuid.parse(id);
  if (notes.trim().length < 20 || !['classifications', 'policies', 'reconciliations', 'disclosures', 'periodCutoff'].every(key => confirmations[key as keyof FinancialStatementReview] === true)) throw new Error('Complete review confirmations and notes');
  const { data, error } = await rpc('approve_financial_statement_package_v1', { p_report_id: id, p_review_notes: notes.trim(), p_confirmations: confirmations, p_self_review_acknowledged: selfReviewAcknowledged });
  if (error) throw error;
  const saved = parseSavedFinancialStatementPackage(data, companyId);
  if (saved.id !== id || saved.status !== 'approved') throw new Error('FINANCIAL_STATEMENT_SCOPE_MISMATCH');
  return saved;
}
export async function voidFinancialStatementPackage(companyId: string, id: string, reason: string) {
  uuid.parse(companyId); uuid.parse(id);
  if (reason.trim().length < 10) throw new Error('A reason is required');
  const { data, error } = await rpc('void_financial_statement_package_v1', { p_report_id: id, p_reason: reason.trim() });
  if (error) throw error;
  const saved = parseSavedFinancialStatementPackage(data, companyId);
  if (saved.id !== id || saved.status !== 'voided') throw new Error('FINANCIAL_STATEMENT_SCOPE_MISMATCH');
  return saved;
}

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const lockSchema = z.object({ id: uuid, company_id: uuid, accounting_period_id: uuid, locked_through: date,
  status: z.enum(['locked', 'unlocked']), changed_by: uuid, changed_by_name: z.string(), changed_at: z.string(), reason: z.string() });
const periodLocksSchema = z.object({ company_id: uuid, managed_lock: lockSchema.nullable(), can_manage: z.boolean(),
  other_closed_periods: z.array(z.object({ id: uuid, period_name: z.string(), start_date: date, end_date: date, status: z.string() })),
  history: z.array(z.object({ id: uuid, action: z.enum(['locked', 'unlocked']), locked_through: date, actor_id: uuid, actor_name: z.string(), reason: z.string(), created_at: z.string() })),
});
export type FinancialReportingPeriodLocks = z.infer<typeof periodLocksSchema>;
export async function listFinancialReportingPeriodLocks(companyId: string): Promise<FinancialReportingPeriodLocks> {
  uuid.parse(companyId);
  const { data, error } = await rpc('list_financial_reporting_period_locks_v1', { p_company: companyId });
  if (error) throw error;
  const state = periodLocksSchema.parse(data);
  if (state.company_id !== companyId || (state.managed_lock && state.managed_lock.company_id !== companyId)) throw new Error('FINANCIAL_STATEMENT_SCOPE_MISMATCH');
  return state;
}
export async function changeFinancialReportingPeriodLock(companyId: string, lockedThrough: string | null, reason: string) {
  uuid.parse(companyId);
  if (reason.trim().length < 20) throw new Error('A period lock reason of at least 20 characters is required');
  if (lockedThrough && (!date.safeParse(lockedThrough).success || lockedThrough > financeToday())) throw new Error('Invalid period lock date');
  const { data, error } = await rpc(lockedThrough ? 'lock_financial_reporting_period_v1' : 'unlock_financial_reporting_period_v1',
    { p_company: companyId, ...(lockedThrough ? { p_locked_through: lockedThrough } : {}), p_reason: reason.trim() });
  if (error) throw error;
  const state = lockSchema.parse(data);
  if (state.company_id !== companyId || state.status !== (lockedThrough ? 'locked' : 'unlocked') || (lockedThrough && state.locked_through !== lockedThrough)) throw new Error('FINANCIAL_STATEMENT_SCOPE_MISMATCH');
  return state;
}

export function financialStatementPackageError(error: unknown, locale: 'ar' | 'en') {
  if (['REPORT_REQUEST_TIMEOUT', '57014'].includes(summarizeFinancialReportError(error).code)) return locale === 'ar' ? 'استغرق الطلب وقتًا أطول من المتوقع. حدّث الشاشة للتحقق من حالته قبل إعادة المحاولة.' : 'The request exceeded its time limit. Refresh to check its status before retrying.';
  if (error instanceof z.ZodError) return locale === 'ar' ? 'تعذر التحقق من الحزمة. أعد تحميلها؛ لن تُصدر بيانات غير متحقق منها.' : 'The package could not be verified. Reload; unverified data will not be issued.';
  const text = typeof error === 'object' && error && 'message' in error ? String(error.message).toLowerCase() : '';
  const ar = locale === 'ar';
  if (/permission|access|authoriz|active profile|authentication/.test(text)) return ar ? 'لا تملك صلاحية هذه العملية في الشركة المحددة.' : 'You do not have permission for this action in the selected company.';
  if (/pgrst202|schema cache|does not exist|could not find the function/.test(text)) return ar ? 'خدمة القوائم المالية غير مثبتة بعد. يلزم تثبيت تحديث قاعدة البيانات.' : 'The financial statement service is not installed. Apply its database migration.';
  if (/stale|fingerprint|source.*changed/.test(text)) return ar ? 'تغير المصدر؛ حدّث الحزمة واحفظ نسخة جديدة للمراجعة.' : 'Source data changed; refresh and save a new version for review.';
  if (/different|independent|self.approv|preparer/.test(text)) return ar ? 'يلزم اعتماد النسخة بواسطة مراجع مخول غير مُعدّها.' : 'A different authorized reviewer must approve this version.';
  if (/date|period|comparison/.test(text)) return ar ? 'راجع تواريخ الفترات والمقارنة وحالة قفل الفترة.' : 'Check the reporting dates, comparison and period lock status.';
  if (/confirm|review|readiness|blocking|note|mapping|reason/.test(text)) return ar ? 'استكمل التصنيفات والإيضاحات والمراجعة أو سبب العملية قبل المتابعة.' : 'Complete classifications, disclosures and review, or provide the action reason.';
  return ar ? 'تعذر التحقق من الحزمة. أعد تحميلها؛ لن تُصدر بيانات غير متحقق منها.' : 'The package could not be verified. Reload; unverified data will not be issued.';
}
