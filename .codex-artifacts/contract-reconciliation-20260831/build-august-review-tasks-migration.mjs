import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve('../..');
const contractAudit = JSON.parse(await fs.readFile(
  path.join(repoRoot, 'tmp', 'august-contract-reconciliation.json'),
  'utf8',
));
const legalAudit = JSON.parse(await fs.readFile(
  path.join(repoRoot, 'tmp', 'legal-claim-components-audit.json'),
  'utf8',
));
const migrationPath = path.join(
  repoRoot,
  'supabase',
  'migrations',
  '20260831120000_create_august_contract_reconciliation_review_tasks.sql',
);
const rollbackPath = path.join(
  repoRoot,
  'supabase',
  'rollbacks',
  '20260831120000_create_august_contract_reconciliation_review_tasks.rollback.sql',
);

const companyId = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const sourceSha = '4E0F968805E9953CD3E10B90B9CEA6E418EE87CC8C477490235092A102224A67';
const sourceKey = 'august_contract_reconciliation_20260831';
const liveStatuses = new Set(['active', 'under_legal_procedure']);
const newerDecisionPlates = new Set(['722134', '2773', '848014', '846485', '847932']);

const classified = contractAudit.auditRows
  .filter((row) => !newerDecisionPlates.has(row.source.plate))
  .map((row) => {
    const matchingIds = new Set(row.matchingCustomers.map((customer) => customer.id));
    const live = row.contracts.filter((contract) => liveStatuses.has(contract.status));
    const same = live.filter((contract) => matchingIds.has(contract.customer_id));
    const different = live.filter((contract) => !matchingIds.has(contract.customer_id));
    const other = row.expectedCustomerContracts.filter((contract) => (
      liveStatuses.has(contract.status) && contract.vehicle_id !== row.vehicle?.id
    ));

    let classification;
    if (same.length && !different.length && !other.length) classification = 'matched_contract';
    else if (same.length) classification = 'matched_with_parallel_conflict';
    else if (different.length) classification = 'different_customer_live_contract';
    else if (other.length) classification = 'expected_customer_contract_on_other_vehicle';
    else classification = 'no_live_contract';

    const requiredAction = {
      matched_with_parallel_conflict: 'أبقِ العقد المطابق، وحدد نهاية عهدة العقد الموازي عند انتقال المركبة ثم راجع فوترة القديم ومخالفاته.',
      different_customer_live_contract: 'اعتمد هوية المستأجر الحالي، وأنهِ عهدة العقد السابق عند بداية العقد الجديد، وحوّل المتأخر القديم للشؤون القانونية بعد ضبط القطع.',
      expected_customer_contract_on_other_vehicle: 'طابق الملف الموقّع واللوحتين، ثم صحح ربط العقد أو أنشئ العقد الصحيح دون نقل مديونية بين العملاء.',
      no_live_contract: 'استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده.',
    }[classification] || '';

    return {
      classification,
      case: {
        plate: row.source.plate,
        august_customer: row.source.canonicalCustomer || row.source.expectedCustomer,
        august_phone: row.source.sourcePhone || null,
        source_contract_number: row.source.sourceContractNumber,
        source_start_date: row.source.sourceStartDate,
        source_end_date: row.source.sourceEndDate,
        source_monthly_amount: row.source.sourceMonthlyAmount,
        source_note: row.source.sourceNote,
        matching_customer_count: row.matchingCustomers.length,
        live_contracts_on_plate: live.map((contract) => ({
          contract_number: contract.contract_number,
          customer_name: contract.customerName,
          status: contract.status,
          start_date: contract.start_date,
          end_date: contract.end_date,
          vehicle_returned: contract.vehicle_returned,
          matched_signed_document_count: contract.matchedSignedDocumentCount,
          due_rent_as_of_august: contract.dueOpenRentBalanceAsOfAugust,
          rent_before_new_start: contract.openRentBalanceBeforeSourceStart,
          unpaid_penalties: contract.unpaidPenaltyAmount,
          penalties_before_new_start: contract.unpaidPenaltyBeforeSourceStart,
        })),
        expected_customer_contracts_on_other_vehicle: other.map((contract) => ({
          contract_number: contract.contract_number,
          plate: contract.plate,
          status: contract.status,
        })),
        required_action: requiredAction,
      },
    };
  });

const group = (classification) => classified
  .filter((item) => item.classification === classification)
  .map((item) => item.case);

const legalDuplicateCases = legalAudit.breakdowns
  .filter((item) => (
    Number(item.breakdown?.violations_amount || 0) > 0
    && Number(item.penaltyInvoiceDue || 0) > 0
  ))
  .map((item) => ({
    contract_number: item.contractNumber,
    plate: item.plate,
    customer_name: item.customerName,
    claim_total_before_fix: Number(item.breakdown.total || 0),
    rent_invoice_due: Number(item.rentInvoiceDue || 0),
    duplicated_penalty_invoice_due: Number(item.penaltyInvoiceDue || 0),
    evidenced_violations_amount: Number(item.breakdown.violations_amount || 0),
    claim_total_after_deduplication: Math.max(
      0,
      Number(item.breakdown.total || 0) - Number(item.penaltyInvoiceDue || 0),
    ),
  }));

const tasks = [
  {
    taskKey: 'different_customer_live_contract',
    title: 'عاجل: تسوية 10 عقود باسم عميل آخر على مركبات أغسطس',
    priority: 'urgent',
    dueDays: 1,
    description: 'راجع الهوية والملف الموقّع لكل مركبة. العقد السابق يُنهى عند بداية العقد الجديد، وتُحفظ مطالبته حتى تاريخ القطع فقط مع مخالفات فترة العهدة.',
    tags: ['contracts', 'legal', 'custody-conflict', 'august-2026'],
    cases: group('different_customer_live_contract'),
  },
  {
    taskKey: 'matched_with_parallel_conflict',
    title: 'مراجعة 6 مركبات بها عقد مطابق وتعارض موازٍ',
    priority: 'high',
    dueDays: 2,
    description: 'أبقِ العقد المطابق للمستأجر الحالي، وافصل عهدة العقد الموازي وفوترته ومخالفاته وفق تاريخ انتقال المركبة المثبت.',
    tags: ['contracts', 'parallel-contract', 'august-2026'],
    cases: group('matched_with_parallel_conflict'),
  },
  {
    taskKey: 'expected_customer_contract_on_other_vehicle',
    title: 'مراجعة 4 عملاء عقودهم الحية على مركبة أخرى',
    priority: 'high',
    dueDays: 2,
    description: 'طابق العقد الموقّع واللوحتين والهوية قبل تصحيح الربط. يمنع نقل رصيد أو مخالفة بين مركبتين أو عميلين دون دليل.',
    tags: ['contracts', 'vehicle-link', 'identity-review', 'august-2026'],
    cases: group('expected_customer_contract_on_other_vehicle'),
  },
  {
    taskKey: 'no_live_contract',
    title: 'استكمال 20 مستأجرًا في أغسطس بلا عقد حي',
    priority: 'high',
    dueDays: 3,
    description: 'استكمل الهوية والعقد الموقّع وتاريخ التسليم. ملف أغسطس يثبت الحيازة التشغيلية فقط ولا يثبت السداد أو المطالبة القانونية وحده.',
    tags: ['contracts', 'missing-contract', 'identity-review', 'august-2026'],
    cases: group('no_live_contract'),
  },
  {
    taskKey: 'legal_claim_penalty_invoice_double_count',
    title: 'عاجل: مراجعة 16 مطالبة قانونية بعد منع تكرار المخالفات',
    priority: 'urgent',
    dueDays: 1,
    description: 'اعتمد النسخة الثالثة من احتساب المطالبة، وحدّث قيمة القضية أو المستندات إن كانت قد حُفظت بالقيمة القديمة. فاتورة المخالفة لا تدخل كإيجار ثم تضاف المخالفة مرة ثانية.',
    tags: ['legal', 'claim-review', 'penalty-deduplication', 'august-2026'],
    cases: legalDuplicateCases,
  },
];

const expectedCounts = new Map([
  ['different_customer_live_contract', 10],
  ['matched_with_parallel_conflict', 6],
  ['expected_customer_contract_on_other_vehicle', 4],
  ['no_live_contract', 20],
  ['legal_claim_penalty_invoice_double_count', 16],
]);
for (const task of tasks) {
  if (task.cases.length !== expectedCounts.get(task.taskKey)) {
    throw new Error(`${task.taskKey}: expected ${expectedCounts.get(task.taskKey)}, found ${task.cases.length}`);
  }
}

const manifest = JSON.stringify(tasks, null, 2).replaceAll("'", "''");
const migration = `-- Create a small, actionable review queue for the August reconciliation.
-- This migration creates tasks only; it does not mutate contracts, vehicles,
-- invoices, payments, penalties, customers, or legal cases.

BEGIN;

DO $tasks$
DECLARE
  v_company_id constant uuid := '${companyId}'::uuid;
  v_source_sha constant text := '${sourceSha}';
  v_source constant text := '${sourceKey}';
  v_owner_profile_id uuid;
  v_manifest jsonb := '${manifest}'::jsonb;
  v_created integer := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':august-contract-review-tasks', 0)
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.fleet_reconciliation_batches batch
    WHERE batch.company_id = v_company_id
      AND batch.source_sha256 = v_source_sha
      AND batch.status = 'applied'
  ) THEN
    RAISE EXCEPTION 'Latest August operational snapshot must be applied first';
  END IF;

  IF to_regprocedure(
    'public.calculate_legal_claim_breakdown_v3(uuid,uuid,date)'
  ) IS NULL THEN
    RAISE EXCEPTION 'Legal claim component de-duplication must be applied first';
  END IF;

  SELECT profile.id INTO v_owner_profile_id
  FROM public.profiles profile
  JOIN public.user_roles role
    ON role.user_id = profile.user_id
   AND (role.company_id = v_company_id OR role.role = 'super_admin'::public.user_role)
  WHERE profile.company_id = v_company_id
    AND profile.is_active = true
    AND role.role IN (
      'company_admin'::public.user_role,
      'manager'::public.user_role,
      'super_admin'::public.user_role
    )
  ORDER BY CASE role.role
    WHEN 'company_admin'::public.user_role THEN 1
    WHEN 'manager'::public.user_role THEN 2
    ELSE 3 END,
    profile.created_at,
    profile.id
  LIMIT 1;

  IF v_owner_profile_id IS NULL THEN
    RAISE EXCEPTION 'No active company review owner was found';
  END IF;

  CREATE TEMP TABLE august_review_task_source ON COMMIT DROP AS
  SELECT source.*
  FROM jsonb_to_recordset(v_manifest) AS source(
    "taskKey" text,
    "title" text,
    "priority" text,
    "dueDays" integer,
    "description" text,
    "tags" text[],
    "cases" jsonb
  );

  IF (SELECT count(*) FROM august_review_task_source) <> 5
     OR EXISTS (
       SELECT 1 FROM august_review_task_source
       WHERE jsonb_array_length("cases") = 0
     ) THEN
    RAISE EXCEPTION 'August review task manifest is incomplete';
  END IF;

  INSERT INTO public.tasks (
    company_id, created_by, assigned_to, title, description, status,
    priority, due_date, category, tags, metadata
  )
  SELECT
    v_company_id,
    v_owner_profile_id,
    v_owner_profile_id,
    left(source."title", 255),
    concat_ws(E'\\n',
      source."description",
      '',
      'عدد الحالات: ' || jsonb_array_length(source."cases")::text,
      'المصدر: دفعات-شهر-8-أغسطس-2026.xlsx',
      'الإجراء: راجع الحالات داخل بيانات المهمة وسجّل قرار كل حالة قبل إغلاق المهمة.'
    ),
    'pending',
    source."priority",
    now() + make_interval(days => source."dueDays"),
    'august_contract_reconciliation',
    source."tags",
    jsonb_build_object(
      'source', v_source,
      'sourceFile', 'دفعات-شهر-8-أغسطس-2026.xlsx',
      'sourceSha256', v_source_sha,
      'augustReconciliationTaskKey', source."taskKey",
      'caseCount', jsonb_array_length(source."cases"),
      'cases', source."cases",
      'createdByMigration', '20260831120000_create_august_contract_reconciliation_review_tasks'
    )
  FROM august_review_task_source source
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.tasks existing
    WHERE existing.company_id = v_company_id
      AND existing.metadata ->> 'source' = v_source
      AND existing.metadata ->> 'augustReconciliationTaskKey' = source."taskKey"
  );

  GET DIAGNOSTICS v_created = ROW_COUNT;

  IF v_created NOT IN (0, 5) THEN
    RAISE EXCEPTION 'Partial August review task creation detected: %', v_created;
  END IF;
END;
$tasks$;

COMMIT;
`;

const rollback = `-- Cancel only untouched pending tasks created by the August review migration.
-- In-progress or completed human work is preserved.

BEGIN;

UPDATE public.tasks task
SET status = 'cancelled',
    completed_at = now(),
    updated_at = now(),
    metadata = COALESCE(task.metadata, '{}'::jsonb) || jsonb_build_object(
      'cancelledByRollback', true,
      'cancelledByMigration', '20260831120000_create_august_contract_reconciliation_review_tasks.rollback'
    )
WHERE task.company_id = '${companyId}'::uuid
  AND task.status = 'pending'
  AND task.metadata ->> 'source' = '${sourceKey}'
  AND task.metadata ->> 'createdByMigration'
    = '20260831120000_create_august_contract_reconciliation_review_tasks';

COMMIT;
`;

await fs.writeFile(migrationPath, migration, 'utf8');
await fs.writeFile(rollbackPath, rollback, 'utf8');
console.log(JSON.stringify({
  migrationPath,
  rollbackPath,
  taskCounts: Object.fromEntries(tasks.map((task) => [task.taskKey, task.cases.length])),
}, null, 2));
