import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const context = { companyId: id(1), legalCaseId: id(2), contractId: id(3), memoSnapshotId: id(6) };
before(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('test.role',true) $$;
    CREATE TABLE legal_cases(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,workflow_stage text,
      case_reference text,court_fees numeric,filing_date date,updated_at timestamptz);
    CREATE TABLE taqadi_filing_jobs(id uuid PRIMARY KEY,company_id uuid,legal_case_id uuid,contract_id uuid,
      lawsuit_preparation_id uuid,locked_by text,status text,current_step text,progress int,payload jsonb,
      result jsonb,requested_by uuid,error_code text,error_message text,heartbeat_at timestamptz,
      completed_at timestamptz,updated_at timestamptz);
    CREATE TABLE lawsuit_preparations(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,legal_case_id uuid,
      status text,taqadi_case_number text,taqadi_reference_number text,submitted_at timestamptz,
      registered_at timestamptz,updated_at timestamptz);
    CREATE TABLE taqadi_filing_job_events(company_id uuid,job_id uuid,event_type text,step text,
      status text,message text,details jsonb);
    CREATE TABLE taqadi_automation_workers(worker_id text,status text,current_job_id uuid,heartbeat_at timestamptz,last_error text);
    CREATE TABLE transitions(case_id uuid,stage text);
    CREATE FUNCTION transition_legal_case_workflow_v1(uuid,uuid,text,text,uuid) RETURNS void LANGUAGE plpgsql AS $$
    BEGIN
      IF $3='awaiting_acceptance' AND current_setting('test.fail',true)='on' THEN RAISE EXCEPTION 'transition failed'; END IF;
      UPDATE public.legal_cases SET workflow_stage=$3 WHERE company_id=$1 AND id=$2;
      INSERT INTO public.transitions VALUES ($2,$3);
    END $$;`);
  await db.exec(await readFile(new URL('../../supabase/migrations/20260906064817_reliable_taqadi_receipt_completion.sql', import.meta.url), 'utf8'));
});
beforeEach(async () => {
  await db.exec(`TRUNCATE legal_cases,taqadi_filing_jobs,lawsuit_preparations,taqadi_filing_job_events,taqadi_automation_workers,transitions;
    SELECT set_config('test.role','service_role',false),set_config('test.fail','off',false);
    INSERT INTO legal_cases(id,company_id,contract_id,workflow_stage) VALUES ('${id(2)}','${id(1)}','${id(3)}','preparation');
    INSERT INTO taqadi_filing_jobs(id,company_id,legal_case_id,contract_id,lawsuit_preparation_id,locked_by,status,payload)
      VALUES ('${id(4)}','${id(1)}','${id(2)}','${id(3)}','${id(5)}','worker-a','submitting','{"memoSnapshotId":"${id(6)}"}');
    INSERT INTO lawsuit_preparations(id,company_id,contract_id,legal_case_id,status)
      VALUES ('${id(5)}','${id(1)}','${id(3)}','${id(2)}','ready'),
             ('${id(7)}','${id(1)}','${id(3)}','${id(8)}','draft'),
             ('${id(9)}','${id(10)}','${id(3)}','${id(2)}','draft');
    INSERT INTO taqadi_automation_workers(worker_id,status,current_job_id) VALUES ('worker-a','busy','${id(4)}');`);
});
after(() => db.close());
const complete = (reference = 'REF-12345', sourceContext = context, worker = 'worker-a') => db.query(
  'SELECT complete_taqadi_filing_job_v1($1,$2,NULL,$3,3000,$4::jsonb) AS job',
  [id(4), worker, reference, JSON.stringify({ sourceContext, receiptCapturedAt: '2026-09-06T06:00:00Z' })],
);
const row = async table => (await db.query(`SELECT * FROM ${table}`)).rows[0];
it('commits receipt, case, preparation and job together with awaiting acceptance', async () => {
  const result = await complete();
  assert.equal(result.rows[0].job.status, 'filed');
  assert.equal((await row('legal_cases')).workflow_stage, 'awaiting_acceptance');
  assert.equal((await row('legal_cases')).case_reference, 'REF-12345');
  const preparations = (await db.query('SELECT id,status FROM lawsuit_preparations ORDER BY id')).rows;
  assert.deepEqual(preparations.map(p => p.status), ['registered','draft','draft']);
  assert.equal((await row('taqadi_automation_workers')).status, 'idle');
});
it('replays a lost response without duplicate events or workflow transitions', async () => {
  const initial = (await complete()).rows[0].job;
  const replay = (await complete()).rows[0].job;
  assert.equal(replay.completed_at, initial.completed_at);
  assert.equal(replay.result.filedAt, initial.result.filedAt);
  assert.equal((await db.query('SELECT * FROM transitions')).rows.length, 2);
  assert.equal((await db.query('SELECT * FROM taqadi_filing_job_events')).rows.length, 1);
});
it('repairs the legacy filed stage on receipt replay without regression of later stages', async () => {
  await complete();
  await db.exec("UPDATE legal_cases SET workflow_stage='filed'");
  await complete();
  assert.equal((await row('legal_cases')).workflow_stage, 'awaiting_acceptance');
  await db.exec("UPDATE legal_cases SET workflow_stage='hearings'");
  await complete();
  assert.equal((await row('legal_cases')).workflow_stage, 'hearings');
});
it('rolls back every change when the second transition fails', async () => {
  await db.exec("SELECT set_config('test.fail','on',false)");
  await assert.rejects(complete(), /transition failed/);
  assert.equal((await row('legal_cases')).workflow_stage, 'preparation');
  assert.equal((await row('legal_cases')).case_reference, null);
  assert.equal((await row('taqadi_filing_jobs')).status, 'submitting');
  assert.equal((await db.query('SELECT * FROM transitions')).rows.length, 0);
});
it('rejects another worker and mismatching tenant, case, contract or snapshot', async () => {
  await assert.rejects(complete('REF-12345', context, 'worker-b'), /lock was lost/);
  for (const key of Object.keys(context)) {
    await assert.rejects(complete('REF-12345', { ...context, [key]: id(99) }), /does not match/);
  }
});
it('rejects conflicting receipts and existing case references', async () => {
  await db.exec("UPDATE legal_cases SET case_reference='OTHER-999'");
  await assert.rejects(complete(), /Conflicting legal case/);
  await db.exec('UPDATE legal_cases SET case_reference=NULL');
  await complete();
  await assert.rejects(complete('REF-99999'), /Conflicting completed/);
});
it('refuses to complete another contract or a missing preparation and rolls back the case', async () => {
  await db.query('UPDATE legal_cases SET contract_id=$1', [id(99)]);
  await assert.rejects(complete(), /Legal case was not found/);
  await db.query('UPDATE legal_cases SET contract_id=$1', [id(3)]);
  await db.query('DELETE FROM lawsuit_preparations WHERE id=$1', [id(5)]);
  await assert.rejects(complete(), /preparation was not found/);
  assert.equal((await row('legal_cases')).workflow_stage, 'preparation');
  assert.equal((await row('taqadi_filing_jobs')).status, 'submitting');
});
it('rejects canary, non-submitting, empty reference and untrusted callers', async () => {
  await assert.rejects(complete(' '), /reference number is required/);
  await db.exec("UPDATE taqadi_filing_jobs SET payload=payload || '{\"canary\":true}'::jsonb");
  await assert.rejects(complete(), /Canary jobs/);
  await db.exec("UPDATE taqadi_filing_jobs SET payload=payload - 'canary',status='needs_human'");
  await assert.rejects(complete(), /submission step/);
  await db.exec("SELECT set_config('test.role','authenticated',false)");
  await assert.rejects(complete(), /trusted automation worker/);
});
