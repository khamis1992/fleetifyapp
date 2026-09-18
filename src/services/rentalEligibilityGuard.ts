import { supabase } from '@/integrations/supabase/client';

export const TRAFFIC_VIOLATIONS_PATH = '/fleet/traffic-violations';

export type RentalGuardLevel = 'allow' | 'warn' | 'block';

export interface PenaltySummary {
  count: number;
  total: number;
}

export interface RentalGuardInput {
  vehicle?: { id: string; status: string | null } | null;
  vehiclePenalties?: Array<{ amount: number | null; payment_status: string | null }>;
  customerPenalties?: Array<{ amount: number | null; payment_status: string | null }>;
}

export interface RentalGuardResult {
  level: RentalGuardLevel;
  message: string;
  messages: string[];
  hardBlockMessages: string[];
  violationMessages: string[];
  canOverrideUnpaidViolations: boolean;
  vehiclePenalties: PenaltySummary;
  customerPenalties: PenaltySummary;
  trafficViolationsPath?: string;
}

const PAID_STATUSES = new Set(['paid', 'completed']);
const HARD_BLOCKED_STATUSES: Record<string, string> = {
  street_52: 'محجوزة (شارع 52)',
  police_station: 'محجوزة في مركز الشرطة',
  stolen: 'مسروقة',
};

const summarizeUnpaid = (
  penalties: Array<{ amount: number | null; payment_status: string | null }> = [],
): PenaltySummary => penalties.reduce<PenaltySummary>((summary, penalty) => {
  const status = penalty.payment_status?.trim().toLowerCase();
  if (status && PAID_STATUSES.has(status)) return summary;
  return {
    count: summary.count + 1,
    total: summary.total + (Number(penalty.amount) || 0),
  };
}, { count: 0, total: 0 });

const formatQar = (amount: number) => new Intl.NumberFormat('ar-QA', {
  maximumFractionDigits: 2,
}).format(amount);

export function evaluateRentalEligibility(input: RentalGuardInput): RentalGuardResult {
  const vehiclePenalties = summarizeUnpaid(input.vehiclePenalties);
  const customerPenalties = summarizeUnpaid(input.customerPenalties);
  const hardBlocks: string[] = [];
  const violationBlocks: string[] = [];
  const violationMessages: string[] = [];
  const warnings: string[] = [];

  if (!input.vehicle) {
    hardBlocks.push('لا يمكن بدء الإيجار: المركبة غير موجودة أو لا تنتمي إلى الشركة');
  } else {
    const blockedStatus = input.vehicle.status && HARD_BLOCKED_STATUSES[input.vehicle.status];
    if (blockedStatus) {
      hardBlocks.push(`لا يمكن تأجير هذه المركبة لأنها ${blockedStatus}`);
    } else if (input.vehicle.status === 'municipality') {
      warnings.push('تنبيه: المركبة محجوزة لدى البلدية. راجع حالتها قبل بدء الإيجار');
    }
  }

  if (vehiclePenalties.count > 0) {
    const message = `على المركبة ${vehiclePenalties.count} مخالفة غير مسددة بإجمالي ${formatQar(vehiclePenalties.total)} ر.ق`;
    violationMessages.push(message);
    warnings.push(`تنبيه: ${message}`);
  }

  if (customerPenalties.count > 0) {
    const message = `العميل عليه ${customerPenalties.count} مخالفة غير مسددة بإجمالي ${formatQar(customerPenalties.total)} ر.ق`;
    violationMessages.push(message);
    violationBlocks.push(`لا يمكن بدء الإيجار: ${message}`);
  }

  const blocks = [...hardBlocks, ...violationBlocks];
  const messages = blocks.length > 0 ? blocks : warnings;
  const level: RentalGuardLevel = blocks.length > 0 ? 'block' : warnings.length > 0 ? 'warn' : 'allow';
  return {
    level,
    message: messages.join(' — '),
    messages,
    hardBlockMessages: hardBlocks,
    violationMessages,
    canOverrideUnpaidViolations: hardBlocks.length === 0 && violationMessages.length > 0,
    vehiclePenalties,
    customerPenalties,
    trafficViolationsPath: vehiclePenalties.count || customerPenalties.count
      ? TRAFFIC_VIOLATIONS_PATH
      : undefined,
  };
}

export async function checkRentalEligibility(params: {
  companyId: string;
  vehicleId: string | null | undefined;
  customerId?: string | null;
}): Promise<RentalGuardResult> {
  if (!params.vehicleId) return evaluateRentalEligibility({ vehicle: null });

  const vehicleQuery = supabase
    .from('vehicles')
    .select('id, status')
    .eq('id', params.vehicleId)
    .eq('company_id', params.companyId)
    .maybeSingle();
  const vehiclePenaltiesQuery = supabase
    .from('penalties')
    .select('amount, payment_status')
    .eq('company_id', params.companyId)
    .eq('vehicle_id', params.vehicleId);
  const customerPenaltiesQuery = params.customerId
    ? supabase
        .from('penalties')
        .select('amount, payment_status')
        .eq('company_id', params.companyId)
        .eq('customer_id', params.customerId)
    : Promise.resolve({ data: [], error: null });

  const [vehicleResult, vehiclePenaltiesResult, customerPenaltiesResult] = await Promise.all([
    vehicleQuery,
    vehiclePenaltiesQuery,
    customerPenaltiesQuery,
  ]);

  const queryError = vehicleResult.error || vehiclePenaltiesResult.error || customerPenaltiesResult.error;
  if (queryError) {
    throw new Error('تعذر التحقق من حالة المركبة والمخالفات. لا يمكن بدء الإيجار بأمان');
  }

  return evaluateRentalEligibility({
    vehicle: vehicleResult.data,
    vehiclePenalties: vehiclePenaltiesResult.data || [],
    customerPenalties: customerPenaltiesResult.data || [],
  });
}

export async function assertRentalEligible(params: {
  companyId: string;
  vehicleId: string | null | undefined;
  customerId?: string | null;
  allowUnpaidViolationOverride?: boolean;
}): Promise<RentalGuardResult> {
  const result = await checkRentalEligibility(params);
  const acceptedViolationOnlyBlock = result.level === 'block'
    && result.canOverrideUnpaidViolations
    && params.allowUnpaidViolationOverride === true;
  if (result.level === 'block' && !acceptedViolationOnlyBlock) throw new Error(result.message);
  return result;
}
