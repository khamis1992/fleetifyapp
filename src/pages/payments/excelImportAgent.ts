import { supabase } from '@/integrations/supabase/client';

export type ExcelImportAgentRow = {
  rowNumber: number;
  month: string;
  monthKey: string | null;
  paymentAmount: number;
  remainingAmount: number;
  maintenanceAmount: number;
  delayDays: number;
  delayValue: number;
  trafficAmount: number;
  unclassifiedAmount: number;
  sourceText: string;
};

export type ExcelImportAgentAction = {
  id: string;
  rowKey: string;
  command: string;
  field: 'paymentAmount' | 'maintenanceAmount' | 'delayValue' | 'trafficAmount' | 'none';
  delta: number;
  riskLevel: 'low' | 'medium' | 'high';
  approvalRequired: boolean;
  confidence: number;
  status: 'planned' | 'review' | 'skipped';
};

export type ExcelImportAgentPlan = {
  ok: boolean;
  exactDuplicate: boolean;
  versionId: string;
  runId?: string;
  previousApprovedAt?: string | null;
  summary: {
    unchanged: boolean;
    executable: number;
    review: number;
    actions: number;
    previousVersionId?: string | null;
    previousApprovedAt?: string | null;
  };
  actions: ExcelImportAgentAction[];
  effectiveRows: ExcelImportAgentRow[];
};

type PlanFile = {
  id: string;
  fileName: string;
  rows: Array<{
    rowNumber: number;
    month: string;
    paymentAmount: number | null;
    remainingAmount: number | null;
    maintenanceAmount: number | null;
    delayDays: number | null;
    delayValue: number | null;
    trafficAmount: number | null;
    unclassifiedAmount?: number | null;
    sourceText?: string;
  }>;
};

const monthKey = (month: string) => {
  const text = String(month).trim();
  const yearFirst = text.match(/^(20\d{2})\D{1,3}(0?[1-9]|1[0-2])$/);
  const monthFirst = text.match(/^(0?[1-9]|1[0-2])\D{1,3}(20\d{2})$/);
  const year = yearFirst?.[1] || monthFirst?.[2];
  const monthNumber = yearFirst?.[2] || monthFirst?.[1];
  return year && monthNumber ? `${year}-${monthNumber.padStart(2, '0')}` : null;
};

export const buildExcelImportAgentRows = (file: PlanFile): ExcelImportAgentRow[] =>
  file.rows.map((row) => ({
    rowNumber: row.rowNumber,
    month: row.month,
    monthKey: monthKey(row.month),
    paymentAmount: Number(row.paymentAmount || 0),
    remainingAmount: Number(row.remainingAmount || 0),
    maintenanceAmount: Number(row.maintenanceAmount || 0),
    delayDays: Number(row.delayDays || 0),
    delayValue: Number(row.delayValue || 0),
    trafficAmount: Number(row.trafficAmount || 0),
    unclassifiedAmount: Number(row.unclassifiedAmount || 0),
    sourceText: String(row.sourceText || ''),
  }));

export const planExcelImportWithAgent = async ({
  companyId,
  contractId,
  file,
}: {
  companyId: string;
  contractId: string;
  file: PlanFile;
}): Promise<ExcelImportAgentPlan> => {
  const { data, error } = await supabase.functions.invoke('excel-import-ai-review', {
    body: {
      action: 'plan',
      companyId,
      contractId,
      file: {
        contentHash: file.id,
        fileName: file.fileName,
        rows: buildExcelImportAgentRows(file),
      },
    },
  });
  if (error) throw new Error(await getFunctionErrorMessage(error));
  if (!data?.ok || !data?.versionId) throw new Error(data?.error || 'تعذر إنشاء خطة وكيل الاستيراد.');
  return data as ExcelImportAgentPlan;
};

export const completeExcelImportAgentPlan = async ({
  companyId,
  versionId,
  success,
  result,
  errorMessage,
}: {
  companyId: string;
  versionId: string;
  success: boolean;
  result?: Record<string, unknown>;
  errorMessage?: string;
}) => {
  const { data, error } = await supabase.functions.invoke('excel-import-ai-review', {
    body: {
      action: 'complete',
      companyId,
      versionId,
      success,
      result: result || {},
      error: errorMessage || null,
    },
  });
  if (error) throw new Error(await getFunctionErrorMessage(error));
  return data;
};

const getFunctionErrorMessage = async (error: unknown): Promise<string> => {
  const fallback = error instanceof Error ? error.message : String(error || 'Edge Function request failed');
  if (!error || typeof error !== 'object' || !('context' in error)) return fallback;

  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return fallback;
  try {
    const payload = await context.clone().json() as { error?: unknown; message?: unknown };
    const detail = payload?.error || payload?.message;
    return typeof detail === 'string' && detail.trim() ? detail : fallback;
  } catch {
    return fallback;
  }
};

export const agentPlanReviewReasons = (plan: ExcelImportAgentPlan): string[] =>
  plan.actions
    .filter((action) => action.status === 'review')
    .map((action) => {
      const amount = Math.abs(Number(action.delta || 0)).toLocaleString('en-US');
      if (action.command === 'excel_import.reverse_payment') {
        return `انخفضت أو حُذفت دفعة في الفترة ${action.rowKey} بقيمة ${amount} ر.ق؛ يلزم إنشاء حركة عكسية معتمدة.`;
      }
      if (action.command.includes('maintenance')) return `يوجد تخفيض في الصيانة للفترة ${action.rowKey} ويحتاج مراجعة.`;
      if (action.command.includes('late_fee')) return `يوجد تخفيض في غرامة التأخير للفترة ${action.rowKey} ويحتاج مراجعة.`;
      if (action.command.includes('traffic')) return `يوجد تخفيض في مخالفة مرورية للفترة ${action.rowKey} ويحتاج مراجعة.`;
      return `الإجراء ${action.command} للفترة ${action.rowKey} يحتاج موافقة يدوية.`;
    });

export const applyAgentEffectiveRows = <T extends {
  rowNumber: number;
  paymentAmount: number | null;
  maintenanceAmount: number | null;
  delayDays: number | null;
  delayValue: number | null;
  trafficAmount: number | null;
  trafficAmounts: number[];
}>(originalRows: T[], effectiveRows: ExcelImportAgentRow[]): T[] => {
  const originalByRow = new Map(originalRows.map((row) => [row.rowNumber, row]));
  return effectiveRows.flatMap((effective) => {
    const original = originalByRow.get(effective.rowNumber);
    if (!original) return [];
    return [{
      ...original,
      paymentAmount: effective.paymentAmount,
      maintenanceAmount: effective.maintenanceAmount,
      delayDays: effective.delayDays,
      delayValue: effective.delayValue,
      trafficAmount: effective.trafficAmount,
      trafficAmounts: effective.trafficAmount > 0 ? [effective.trafficAmount] : [],
    }];
  });
};
