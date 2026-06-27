import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

dotenv.config({ quiet: true });

type PenaltyRow = {
  id: string;
  company_id: string;
  penalty_number: string | null;
  penalty_date: string | null;
  vehicle_id: string | null;
  customer_id: string | null;
  contract_id: string | null;
  amount: number | null;
};

type ContractRow = {
  id: string;
  company_id: string;
  contract_number: string | null;
  vehicle_id: string | null;
  customer_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
};

type LinkCandidate = {
  penalty: PenaltyRow;
  contract: ContractRow;
  confidence: 'high' | 'medium';
  reason: string;
};

type SkippedPenalty = {
  penalty: PenaltyRow;
  reason: string;
  matches?: Array<Pick<ContractRow, 'id' | 'contract_number' | 'status' | 'start_date' | 'end_date'>>;
};

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const companyArgIndex = process.argv.findIndex((arg) => arg === '--company-id');
const companyId = companyArgIndex >= 0 ? process.argv[companyArgIndex + 1] : undefined;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function fetchAll<T>(table: string, select: string, build?: (query: any) => any): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    let query = supabase.from(table).select(select).range(from, from + 999);
    if (build) query = build(query);

    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);

    rows.push(...((data || []) as T[]));
    if (!data || data.length < 1000) break;
    from += 1000;
  }

  return rows;
}

function dateInRange(date: string | null, start: string | null, end: string | null): boolean {
  if (!date) return false;

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return false;

  return (!start || value >= new Date(start)) && (!end || value <= new Date(end));
}

function rankContract(contract: ContractRow): number {
  if (contract.status === 'active') return 3;
  if (contract.status === 'completed' || contract.status === 'expired') return 2;
  if (contract.status === 'pending') return 1;
  return 0;
}

function pickContract(penalty: PenaltyRow, contracts: ContractRow[]): LinkCandidate | SkippedPenalty {
  const inRange = contracts.filter((contract) =>
    contract.vehicle_id === penalty.vehicle_id &&
    contract.company_id === penalty.company_id &&
    dateInRange(penalty.penalty_date, contract.start_date, contract.end_date),
  );

  if (inRange.length === 0) {
    return { penalty, reason: 'no_contract_in_date_range' };
  }

  const ranked = [...inRange].sort((a, b) => {
    const rankDiff = rankContract(b) - rankContract(a);
    if (rankDiff !== 0) return rankDiff;
    return String(b.start_date || '').localeCompare(String(a.start_date || ''));
  });

  const [best, second] = ranked;
  if (
    second &&
    rankContract(best) === rankContract(second) &&
    String(best.start_date || '') === String(second.start_date || '')
  ) {
    return {
      penalty,
      reason: 'ambiguous_contract_match',
      matches: ranked.map(({ id, contract_number, status, start_date, end_date }) => ({
        id,
        contract_number,
        status,
        start_date,
        end_date,
      })),
    };
  }

  if (penalty.customer_id && best.customer_id && penalty.customer_id !== best.customer_id) {
    return {
      penalty,
      reason: 'customer_conflict',
      matches: [{
        id: best.id,
        contract_number: best.contract_number,
        status: best.status,
        start_date: best.start_date,
        end_date: best.end_date,
      }],
    };
  }

  return {
    penalty,
    contract: best,
    confidence: best.status === 'active' ? 'high' : 'medium',
    reason: best.status === 'active' ? 'active_contract_date_match' : 'contract_date_match',
  };
}

function isCandidate(result: LinkCandidate | SkippedPenalty): result is LinkCandidate {
  return 'contract' in result;
}

async function main() {
  const penalties = await fetchAll<PenaltyRow>(
    'penalties',
    'id, company_id, penalty_number, penalty_date, vehicle_id, customer_id, contract_id, amount',
    (query) => {
      let next = query.not('vehicle_id', 'is', null).is('contract_id', null);
      if (companyId) next = next.eq('company_id', companyId);
      return next;
    },
  );

  const vehicleIds = [...new Set(penalties.map((penalty) => penalty.vehicle_id).filter(Boolean))];
  const contracts = vehicleIds.length === 0
    ? []
    : await fetchAll<ContractRow>(
      'contracts',
      'id, company_id, contract_number, vehicle_id, customer_id, start_date, end_date, status',
      (query) => {
        let next = query.in('vehicle_id', vehicleIds);
        if (companyId) next = next.eq('company_id', companyId);
        return next;
      },
    );

  const contractsByVehicle = new Map<string, ContractRow[]>();
  for (const contract of contracts) {
    if (!contract.vehicle_id) continue;
    const existing = contractsByVehicle.get(contract.vehicle_id) || [];
    existing.push(contract);
    contractsByVehicle.set(contract.vehicle_id, existing);
  }

  const results = penalties.map((penalty) => pickContract(
    penalty,
    penalty.vehicle_id ? contractsByVehicle.get(penalty.vehicle_id) || [] : [],
  ));

  const candidates = results.filter(isCandidate);
  const skipped = results.filter((result): result is SkippedPenalty => !isCandidate(result));
  const updated: LinkCandidate[] = [];
  const failed: Array<{ candidate: LinkCandidate; error: string }> = [];

  if (apply) {
    for (const candidate of candidates) {
      const { error } = await supabase
        .from('penalties')
        .update({
          contract_id: candidate.contract.id,
          customer_id: candidate.penalty.customer_id || candidate.contract.customer_id,
        })
        .eq('id', candidate.penalty.id)
        .is('contract_id', null);

      if (error) {
        failed.push({ candidate, error: error.message });
      } else {
        updated.push(candidate);
      }
    }
  }

  const report = {
    mode: apply ? 'apply' : 'dry-run',
    companyId: companyId || null,
    scannedPenalties: penalties.length,
    candidateCount: candidates.length,
    updatedCount: updated.length,
    failedCount: failed.length,
    skippedCount: skipped.length,
    skippedByReason: skipped.reduce<Record<string, number>>((acc, item) => {
      acc[item.reason] = (acc[item.reason] || 0) + 1;
      return acc;
    }, {}),
    candidates: candidates.map(({ penalty, contract, confidence, reason }) => ({
      penalty_id: penalty.id,
      penalty_number: penalty.penalty_number,
      penalty_date: penalty.penalty_date,
      amount: penalty.amount,
      contract_id: contract.id,
      contract_number: contract.contract_number,
      contract_status: contract.status,
      customer_id: contract.customer_id,
      confidence,
      reason,
    })),
    skipped: skipped.slice(0, 100),
    failed,
  };

  mkdirSync('reports', { recursive: true });
  const reportPath = join('reports', `penalty-contract-linking-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    mode: report.mode,
    scannedPenalties: report.scannedPenalties,
    candidateCount: report.candidateCount,
    updatedCount: report.updatedCount,
    failedCount: report.failedCount,
    skippedCount: report.skippedCount,
    skippedByReason: report.skippedByReason,
    reportPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
