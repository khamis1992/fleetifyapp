// Run with npm run test:legal-db; separate from Vitest's jsdom suite.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const COMPANY = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';
const CONTRACT = '44444444-4444-4444-8444-444444444444';
const VEHICLE = '55555555-5555-4555-8555-555555555555';
const CASE = '66666666-6666-4666-8666-666666666666';
const JOB = '77777777-7777-4777-8777-777777777777';
const KEY = '88888888-8888-4888-8888-888888888888';
const NEXT_KEY = '99999999-9999-4999-8999-999999999999';
const REASON = 'تمت مراجعة الإجراء القانوني وطلب إلغائه';
let db;

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
// PGlite retains the last explicit session identity as RESET's default.
// Restore the original bootstrap identity explicitly for fixture inspection.
const admin = () => db.exec('SET SESSION AUTHORIZATION postgres');
async function asActor(role = 'authenticated', user = USER) {
  await admin();
  await db.query("select set_config('request.jwt.claim.role', $1, false), set_config('request.jwt.claim.sub', $2, false)", [role, user]);
  // SET ROLE alone would leave session_user=postgres and bypass the guard.
  assert.ok(['authenticated', 'anon', 'service_role'].includes(role));
  await db.exec(`SET SESSION AUTHORIZATION ${role}`);
}
const reverse = async (overrides = {}) => {
  const args = { company: COMPANY, contract: CONTRACT, reason: REASON, key: KEY, actor: null, ...overrides };
  const result = await db.query('select public.revert_contract_from_legal_v2($1,$2,$3,$4,$5) as result',
    [args.company, args.contract, args.reason, args.key, args.actor]);
  return result.rows[0].result;
};

async function state() {
  await admin();
  const result = await db.query(`select
    (select status from public.contracts where id=$1) contract_status,
    (select legal_status from public.contracts where id=$1) legal_status,
    (select status from public.vehicles where id=$2) vehicle_status,
    (select workflow_stage from public.legal_cases where id=$3) case_stage,
    (select status from public.taqadi_filing_jobs where id=$4) job_status,
    (select status from public.lawsuit_preparations where contract_id=$1) preparation_status,
    (select is_active from public.delinquent_customers where contract_id=$1) delinquent,
    (select count(*)::integer from public.contract_operations_log) audit_count,
    (select count(*)::integer from public.taqadi_filing_job_events) event_count`,
  [CONTRACT, VEHICLE, CASE, JOB]);
  return result.rows[0];
}

describe('legal reversal on isolated PostgreSQL 17', { concurrency: false }, () => {
  before(async () => {
    db = new PGlite();
    const version = (await db.query('show server_version_num')).rows[0].server_version_num;
    assert.equal(Math.floor(Number(version) / 10000), 17);
    await db.exec(await read('./fixtures/legal-reversal-schema.sql'));
    await db.exec(await read('../../supabase/migrations/20260903181343_atomic_retry_safe_legal_procedure_reversal.sql'));
    await db.exec(await read('../../supabase/migrations/20260804210826_preserve_taqadi_human_resume_attempt.sql'));
  });
  after(async () => { await db?.close(); });
  beforeEach(async () => {
    await admin();
    await db.exec(`BEGIN;
      INSERT INTO public.profiles(user_id,company_id,role) VALUES ('${USER}','${COMPANY}','admin');
      INSERT INTO public.vehicles(id,company_id,status) VALUES ('${VEHICLE}','${COMPANY}','rented');
      INSERT INTO public.contracts(id,company_id,status,vehicle_id,legal_status)
        VALUES ('${CONTRACT}','${COMPANY}','under_legal_procedure','${VEHICLE}','preparation');
      INSERT INTO public.legal_cases(id,company_id,contract_id,case_status,workflow_stage)
        VALUES ('${CASE}','${COMPANY}','${CONTRACT}','active','preparation');
      INSERT INTO public.taqadi_filing_jobs(id,company_id,contract_id,legal_case_id)
        VALUES ('${JOB}','${COMPANY}','${CONTRACT}','${CASE}');
      INSERT INTO public.lawsuit_preparations(company_id,contract_id,status)
        VALUES ('${COMPANY}','${CONTRACT}','prepared');
      INSERT INTO public.delinquent_customers(company_id,contract_id,is_active)
        VALUES ('${COMPANY}','${CONTRACT}',true);
      COMMIT;`);
  });
  afterEach(async () => {
    await db.exec('ROLLBACK');
    await admin();
    await db.exec(`TRUNCATE public.profiles, public.user_roles, public.vehicles,
      public.contracts, public.legal_cases, public.taqadi_filing_jobs,
      public.taqadi_automation_workers, public.taqadi_filing_job_events,
      public.lawsuit_preparations, public.delinquent_customers, public.contract_operations_log;`);
  });

  it('atomically clears every dependent state and writes one audit and one job event', async () => {
    await asActor();
    const result = await reverse();
    assert.deepEqual([result.success, result.changed, result.closed_cases, result.cancelled_jobs,
      result.cancelled_preparations, result.deactivated_delinquent_records], [true, true, 1, 1, 1, 1]);
    assert.deepEqual(await state(), {
      contract_status: 'active', legal_status: null, vehicle_status: 'available',
      case_stage: 'closed', job_status: 'cancelled', preparation_status: 'cancelled',
      delinquent: false, audit_count: 1, event_count: 1,
    });
  });

  it('replays the same request without duplicating mutations or dropping preparation counts', async () => {
    await asActor();
    await reverse();
    const replay = await reverse();
    assert.equal(replay.changed, false);
    assert.equal(replay.cancelled_preparations, 1);
    assert.equal((await state()).audit_count, 1);
  });

  it('rejects reuse of a request key with a different reason', async () => {
    await asActor();
    await reverse();
    await assert.rejects(reverse({ reason: 'سبب مختلف لإلغاء الإجراء القانوني' }), { code: '22023' });
    assert.equal((await state()).audit_count, 1);
  });

  it('does not reactivate a legal episode twice when a new retry key is supplied', async () => {
    await asActor();
    await reverse();
    assert.equal((await reverse({ key: NEXT_KEY })).changed, false);
    assert.equal((await state()).audit_count, 1);
  });

  it('denies anonymous callers at the function ACL', async () => {
    await asActor('anon', '');
    await assert.rejects(reverse(), { code: '42501' });
  });

  it('cleans an orphaned preparation rather than reporting a false no-op', async () => {
    await asActor();
    await reverse();
    await admin();
    await db.exec("UPDATE public.lawsuit_preparations SET status='prepared'");
    await asActor();
    const result = await reverse({ key: NEXT_KEY });
    assert.equal(result.changed, true);
    assert.equal(result.cancelled_preparations, 1);
    assert.equal((await state()).preparation_status, 'cancelled');
  });

  it('does not accept a supplied actor id instead of an authenticated identity', async () => {
    await asActor('authenticated', '');
    await assert.rejects(reverse({ actor: USER }), { code: '42501' });
  });

  it('rejects inactive profiles even when a manager grant exists', async () => {
    await db.exec(`UPDATE public.profiles SET is_active=false;
      INSERT INTO public.user_roles(user_id,company_id,role) VALUES ('${USER}','${COMPANY}','manager');`);
    await asActor();
    await assert.rejects(reverse(), { code: '42501' });
  });

  it('accepts company-scoped manager grants when the legacy profile role is employee', async () => {
    await db.exec(`UPDATE public.profiles SET role='employee';
      INSERT INTO public.user_roles(user_id,company_id,role) VALUES ('${USER}','${COMPANY}','manager');`);
    await asActor();
    assert.equal((await reverse()).success, true);
  });

  it('does not borrow manager privileges from another company', async () => {
    await db.exec(`UPDATE public.profiles SET role='employee';
      INSERT INTO public.user_roles(user_id,company_id,role) VALUES ('${USER}','${OTHER}','manager');`);
    await asActor();
    await assert.rejects(reverse(), { code: '42501' });
  });

  it('rejects a contract/company mismatch without touching the source contract', async () => {
    await db.exec(`INSERT INTO public.profiles(user_id,company_id,role) VALUES ('${USER}','${OTHER}','admin');`);
    await asActor();
    await assert.rejects(reverse({ company: OTHER }), /not found/);
    assert.equal((await state()).contract_status, 'under_legal_procedure');
  });

  for (const status of ['validating','filling_case','validating_parties','uploading_documents','reviewing','submitting','filed']) {
    it(`preserves the contract when the worker is ${status}`, async () => {
      await db.query('UPDATE public.taqadi_filing_jobs SET status=$1', [status]);
      await asActor();
      await assert.rejects(reverse(), { code: 'P0001' });
      const unchanged = await state();
      assert.equal(unchanged.contract_status, 'under_legal_procedure');
      assert.equal(unchanged.job_status, status);
      assert.equal(unchanged.audit_count, 0);
    });
  }

  it('does not discard an uncertain portal submission while the job waits for a person', async () => {
    await db.exec("UPDATE public.taqadi_filing_jobs SET status='needs_human', error_code='SUBMISSION_UNCERTAIN'");
    await asActor();
    await assert.rejects(reverse(), /uncertain/);
    assert.equal((await state()).job_status, 'needs_human');
  });

  for (const evidence of [
    "UPDATE public.legal_cases SET case_reference='PORTAL-123'",
    'UPDATE public.lawsuit_preparations SET submitted_at=now()',
    'UPDATE public.lawsuit_preparations SET registered_at=now()',
  ]) {
    it(`blocks reversal from independent filing evidence: ${evidence}`, async () => {
      await db.exec(evidence);
      await asActor();
      await assert.rejects(reverse(), /filed legal case/);
      assert.equal((await state()).audit_count, 0);
    });
  }

  it('cannot restart or enqueue a job for a case closed by reversal', async () => {
    await asActor();
    await reverse();
    await admin();
    await assert.rejects(db.exec("UPDATE public.taqadi_filing_jobs SET status='queued', error_code=null"), { code: '23514' });
    await assert.rejects(db.query(`INSERT INTO public.taqadi_filing_jobs(company_id,contract_id,legal_case_id)
      VALUES ($1,$2,$3)`, [COMPANY, CONTRACT, CASE]), { code: '23514' });
    assert.equal((await state()).job_status, 'cancelled');
  });

  it('the real worker claim RPC cannot pick a reversed job', async () => {
    await asActor();
    await reverse();
    await asActor('service_role', '');
    const result = await db.query("select public.claim_next_taqadi_filing_job_v1('test-worker','test') result");
    assert.equal(result.rows[0].result, null);
  });

  it('rolls back every state update if audit persistence fails', async () => {
    await db.exec(`ALTER TABLE public.contract_operations_log
      ADD CONSTRAINT test_reject_audit CHECK (operation_type <> 'revert_from_legal');`);
    const original = await state();
    try {
      await asActor();
      await assert.rejects(reverse(), { code: '23514' });
      assert.deepEqual(await state(), original);
    } finally {
      await admin();
      await db.exec('ALTER TABLE public.contract_operations_log DROP CONSTRAINT test_reject_audit');
    }
  });

  it('supports the rollback migration without deleting business records', async () => {
    await db.exec(await read('../../supabase/rollbacks/20260903181343_atomic_retry_safe_legal_procedure_reversal.rollback.sql'));
    assert.equal((await db.query("select to_regprocedure('public.revert_contract_from_legal_v2(uuid,uuid,text,uuid,uuid)') fn")).rows[0].fn, null);
    assert.equal((await state()).contract_status, 'under_legal_procedure');
    await db.exec(await read('../../supabase/migrations/20260903181343_atomic_retry_safe_legal_procedure_reversal.sql'));
  });
});
