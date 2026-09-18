import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ quiet: true });

const companyId = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const sourceSha = '4E0F968805E9953CD3E10B90B9CEA6E418EE87CC8C477490235092A102224A67';
const taskSource = 'august_contract_reconciliation_20260831';
const asOfDate = '2026-08-31';
const preservedNewerDecisionPlates = ['722134', '2773', '848014', '846485', '847932'];
const outputPath = path.resolve('tmp', 'august-contract-remediation-verification.json');
const expectApplied = process.argv.includes('--expect-applied');

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase URL/service role key is required for read-only verification');
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const legalAudit = JSON.parse(await fs.readFile(
  path.resolve('tmp', 'legal-claim-components-audit.json'),
  'utf8',
));
const expectedLegalCases = legalAudit.breakdowns
  .filter((item) => (
    Number(item.breakdown?.violations_amount || 0) > 0
    && Number(item.penaltyInvoiceDue || 0) > 0
  ))
  .map((item) => ({
    contractNumber: item.contractNumber,
    previousTotal: Number(item.breakdown.total || 0),
    duplicatedPenaltyInvoiceDue: Number(item.penaltyInvoiceDue || 0),
    expectedCorrectedTotal: Math.max(
      0,
      Number(item.breakdown.total || 0) - Number(item.penaltyInvoiceDue || 0),
    ),
  }));

const failures = [];
const checks = [];
const addCheck = (name, ok, details) => {
  checks.push({ name, ok, details });
  if (!ok) failures.push({ name, details });
};

const batchResult = await supabase
  .from('fleet_reconciliation_batches')
  .select('id, status, source_row_count, status_change_count, customer_snapshot_count, metadata')
  .eq('company_id', companyId)
  .eq('source_sha256', sourceSha)
  .maybeSingle();
if (batchResult.error) throw batchResult.error;

const batch = batchResult.data;
addCheck(
  'latest_august_batch_applied',
  batch?.status === 'applied',
  batch || null,
);

let batchAssignments = [];
if (batch?.id) {
  const assignmentResult = await supabase
    .from('fleet_reconciliation_assignments')
    .select('id, is_active, target_status, before_state, after_state, source_evidence')
    .eq('company_id', companyId)
    .eq('batch_id', batch.id);
  if (assignmentResult.error) throw assignmentResult.error;
  batchAssignments = assignmentResult.data || [];
}

const unchangedAssignmentCount = batchAssignments.filter((assignment) => (
  assignment.before_state?.status === assignment.after_state?.status
  && assignment.before_state?.location === assignment.after_state?.location
)).length;
addCheck(
  'latest_august_has_84_active_unchanged_assignments',
  batchAssignments.length === 84
    && batchAssignments.every((assignment) => assignment.is_active)
    && batchAssignments.every((assignment) => assignment.target_status === 'rented')
    && unchangedAssignmentCount === 84,
  {
    assignmentCount: batchAssignments.length,
    activeCount: batchAssignments.filter((assignment) => assignment.is_active).length,
    rentedCount: batchAssignments.filter((assignment) => assignment.target_status === 'rented').length,
    unchangedAssignmentCount,
  },
);

const preservedAssignmentsResult = await supabase
  .from('fleet_reconciliation_assignments')
  .select('id, source_plate, target_status')
  .eq('company_id', companyId)
  .eq('is_active', true)
  .in('source_plate', preservedNewerDecisionPlates);
if (preservedAssignmentsResult.error) throw preservedAssignmentsResult.error;
const preservedAssignments = preservedAssignmentsResult.data || [];
const preservedPlateSet = new Set(preservedAssignments.map((assignment) => assignment.source_plate));
addCheck(
  'all_89_august_operational_decisions_are_active',
  batchAssignments.length === 84
    && preservedAssignments.length === 5
    && preservedNewerDecisionPlates.every((plate) => preservedPlateSet.has(plate)),
  {
    importedAugustAssignmentCount: batchAssignments.length,
    preservedNewerDecisionCount: preservedAssignments.length,
    operationalDecisionCount: batchAssignments.length + preservedAssignments.length,
    preservedAssignments,
  },
);

const tasksResult = await supabase
  .from('tasks')
  .select('id, status, title, metadata')
  .eq('company_id', companyId)
  .eq('category', 'august_contract_reconciliation');
if (tasksResult.error) throw tasksResult.error;
const remediationTasks = (tasksResult.data || []).filter((task) => (
  task.metadata?.source === taskSource
));
const expectedTaskCounts = {
  different_customer_live_contract: 10,
  matched_with_parallel_conflict: 6,
  expected_customer_contract_on_other_vehicle: 4,
  no_live_contract: 20,
  legal_claim_penalty_invoice_double_count: 16,
};
const actualTaskCounts = Object.fromEntries(remediationTasks.map((task) => [
  task.metadata?.augustReconciliationTaskKey,
  Number(task.metadata?.caseCount || 0),
]));
addCheck(
  'five_grouped_review_tasks_exist',
  remediationTasks.length === 5
    && Object.entries(expectedTaskCounts).every(([key, count]) => actualTaskCounts[key] === count),
  { taskCount: remediationTasks.length, actualTaskCounts },
);

const contractNumbers = expectedLegalCases.map((item) => item.contractNumber);
const contractsResult = await supabase
  .from('contracts')
  .select('id, contract_number')
  .eq('company_id', companyId)
  .in('contract_number', contractNumbers);
if (contractsResult.error) throw contractsResult.error;
const contractIdByNumber = new Map((contractsResult.data || []).map((contract) => [
  contract.contract_number,
  contract.id,
]));

const legalResults = [];
for (const expected of expectedLegalCases) {
  const contractId = contractIdByNumber.get(expected.contractNumber);
  if (!contractId) {
    legalResults.push({ ...expected, ok: false, error: 'contract_not_found' });
    continue;
  }

  const [breakdownResult, amountResult] = await Promise.all([
    supabase.rpc('calculate_legal_claim_breakdown_v3', {
      p_company_id: companyId,
      p_contract_id: contractId,
      p_as_of_date: asOfDate,
    }),
    supabase.rpc('calculate_legal_claim_amount_v1', {
      p_company_id: companyId,
      p_contract_id: contractId,
      p_as_of_date: asOfDate,
    }),
  ]);

  if (breakdownResult.error || amountResult.error) {
    legalResults.push({
      ...expected,
      ok: false,
      error: breakdownResult.error?.message || amountResult.error?.message,
    });
    continue;
  }

  const correctedTotal = Number(breakdownResult.data?.total || 0);
  const canonicalAmount = Number(amountResult.data || 0);
  const excludedPenaltyInvoiceDue = Number(
    breakdownResult.data?.excluded_penalty_invoice_due_amount || 0,
  );
  const excludedNonRentInvoiceDue = Number(
    breakdownResult.data?.excluded_non_rent_invoice_due_amount || 0,
  );
  const expectedCorrectedTotal = Math.max(
    0,
    expected.previousTotal - excludedPenaltyInvoiceDue - excludedNonRentInvoiceDue,
  );
  legalResults.push({
    ...expected,
    expectedCorrectedTotal,
    correctedTotal,
    canonicalAmount,
    excludedPenaltyInvoiceDue,
    excludedNonRentInvoiceDue,
    ok: Math.abs(excludedPenaltyInvoiceDue - expected.duplicatedPenaltyInvoiceDue) <= 0.01
      && Math.abs(correctedTotal - expectedCorrectedTotal) <= 0.01
      && Math.abs(canonicalAmount - correctedTotal) <= 0.01,
  });
}

addCheck(
  'all_16_legal_claims_use_v3_without_duplicate_penalty_invoices',
  legalResults.length === 16 && legalResults.every((item) => item.ok),
  {
    caseCount: legalResults.length,
    passedCount: legalResults.filter((item) => item.ok).length,
    duplicatedAmountRemoved: expectedLegalCases.reduce(
      (sum, item) => sum + item.duplicatedPenaltyInvoiceDue,
      0,
    ),
    correctedAggregate: legalResults.reduce(
      (sum, item) => sum + Number(item.correctedTotal || 0),
      0,
    ),
    cases: legalResults,
  },
);

const result = {
  generatedAt: new Date().toISOString(),
  companyId,
  sourceSha256: sourceSha,
  asOfDate,
  appliedAndVerified: failures.length === 0,
  checks,
  failures,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result, null, 2));

if (expectApplied && failures.length > 0) process.exitCode = 1;
