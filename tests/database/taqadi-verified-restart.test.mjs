import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const read = p => readFile(new URL(p, import.meta.url), 'utf8');
const migration = '../../supabase/migrations/20260907162136_verified_taqadi_restart_after_submission_check.sql';
const rollback = '../../supabase/rollbacks/20260907162136_verified_taqadi_restart_after_submission_check.rollback.sql';
const isolation = '../../supabase/migrations/20260907164148_isolate_verified_taqadi_restart_implementation.sql';
const isolationRollback = '../../supabase/rollbacks/20260907164148_isolate_verified_taqadi_restart_implementation.rollback.sql';
const version = '2026-09-07T15:44:28.709199Z';
const payload = { case: { amount: 34000, title: 'Current claim' }, defendant: { fullName: 'Test' },
  documents: [{ key: 'contract', sourceDocumentId: id(5), url: 'https://example.invalid/signed.pdf' }] };
const restart = (patch = {}) => {
  const args = { company: id(1), job: id(2), payload, version, confirmed: true, note: 'راجعت الطلب ولم يتم إيداعه', request: id(10), ...patch };
  return db.query('SELECT public.restart_verified_unsubmitted_taqadi_job_v1($1,$2,$3,$4,$5,$6,$7) AS job',
    [args.company, args.job, args.payload, args.version, args.confirmed, args.note, args.request]);
};
const job = async () => (await db.query('SELECT * FROM taqadi_filing_jobs WHERE id=$1', [id(2)])).rows[0];
before(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.actor', true),'')::uuid$$;
    CREATE FUNCTION get_user_company_id() RETURNS uuid LANGUAGE sql AS $$SELECT '${id(1)}'::uuid$$;
    CREATE FUNCTION can_prepare_contract_for_legal_v1(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('test.allowed',true)='true'$$;
    CREATE TABLE taqadi_filing_jobs(id uuid PRIMARY KEY, company_id uuid, legal_case_id uuid, contract_id uuid,
      status text, current_step text, progress int, error_code text, error_message text, payload jsonb, result jsonb,
      attempt_count int, max_attempts int, lawsuit_preparation_id uuid, source_document_id uuid,
      locked_by text, locked_at timestamptz, heartbeat_at timestamptz, completed_at timestamptz, updated_at timestamptz);
    CREATE TABLE legal_cases(id uuid PRIMARY KEY, company_id uuid, contract_id uuid, case_number text, case_reference text,
      workflow_stage text, case_status text, filing_date date);
    CREATE TABLE contracts(id uuid, company_id uuid, customer_id uuid);
    CREATE TABLE taqadi_automation_workers(current_job_id uuid, status text, heartbeat_at timestamptz);
    CREATE TABLE taqadi_filing_artifacts(job_id uuid, company_id uuid, artifact_type text);
    CREATE TABLE taqadi_filing_job_events(company_id uuid, job_id uuid, event_type text, step text, status text, message text, details jsonb);
    CREATE TABLE lawsuit_preparations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, contract_id uuid, customer_id uuid,
      legal_case_id uuid, source_document_id uuid, defendant_name text, defendant_id_number text, defendant_type text,
      overdue_rent numeric, late_fees numeric, other_fees numeric, total_amount numeric, amount_in_words text, case_title text,
      facts_text text, claims_text text, explanatory_memo_url text, claims_statement_url text, contract_copy_url text,
      status text, prepared_at timestamptz, prepared_by uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz,
      taqadi_case_number text, taqadi_reference_number text, submitted_at timestamptz, registered_at timestamptz);
    -- External validation boundary; production restart below must call it and
    -- roll back its preceding uncertainty reset if it reports a package error.
    CREATE FUNCTION validate_taqadi_filing_payload_v1(uuid,uuid,jsonb) RETURNS jsonb LANGUAGE sql AS $$
      SELECT jsonb_build_object('ready',coalesce(($3 ->> 'testReady')::boolean,true),'missing',jsonb_build_array('documents.contract'))$$;`);
  const source = await read('../../supabase/migrations/20260905135731_repair_taqadi_legacy_preparation_links.sql');
  const original = source.match(/CREATE OR REPLACE FUNCTION public\.restart_taqadi_filing_job_v2[\s\S]*?\$function\$;/)?.[0];
  assert.ok(original, 'production restart implementation found');
  await db.exec(original);
  await db.exec(await read(migration));
  await db.exec(await read(isolation));
});
beforeEach(async () => {
  await db.exec(`TRUNCATE taqadi_filing_jobs,legal_cases,contracts,taqadi_automation_workers,taqadi_filing_artifacts,taqadi_filing_job_events,lawsuit_preparations;
    SELECT set_config('test.actor','${id(9)}',false),set_config('test.allowed','true',false);
    INSERT INTO contracts VALUES ('${id(4)}','${id(1)}','${id(6)}');
    INSERT INTO legal_cases(id,company_id,contract_id,case_number,workflow_stage,case_status)
      VALUES('${id(3)}','${id(1)}','${id(4)}','CASE-TEST','preparation','pending');
    INSERT INTO taqadi_filing_jobs(id,company_id,legal_case_id,contract_id,status,current_step,progress,error_code,error_message,payload,
      attempt_count,max_attempts,updated_at,locked_by)
      VALUES('${id(2)}','${id(1)}','${id(3)}','${id(4)}','needs_human','submission_uncertain',95,'SUBMISSION_UNCERTAIN','prior failure','{}',3,3,'${version}','worker-old');
    INSERT INTO taqadi_filing_job_events(company_id,job_id,event_type) VALUES('${id(1)}','${id(2)}','previous_error');
    INSERT INTO taqadi_filing_artifacts VALUES('${id(2)}','${id(1)}','error_snapshot');`);
});
after(() => db.close());

it('queues from step zero with a current preparation, retains evidence and audits the explicit restart beyond the old attempt limit', async () => {
  const result = (await restart()).rows[0].job;
  assert.equal(result.status, 'queued'); assert.equal(result.current_step, 'queued'); assert.equal(result.progress, 0);
  assert.equal(result.attempt_count, 0); assert.equal(result.locked_by, null); assert.equal(result.error_code, null);
  assert.equal(result.payload.case.amount, 34000);
  assert.equal((await db.query('SELECT total_amount FROM lawsuit_preparations')).rows[0].total_amount, '34000');
  const events = (await db.query('SELECT * FROM taqadi_filing_job_events')).rows;
  assert.equal(events.length, 3); assert.equal(events[0].event_type, 'previous_error');
  const verification = events.find(e => e.event_type === 'submission_verified_unsubmitted').details;
  assert.equal(verification.verifiedBy, id(9)); assert.equal(verification.previousAttemptCount, 3);
  assert.equal(verification.previousErrorCode, 'SUBMISSION_UNCERTAIN'); assert.equal(verification.requestId, id(10));
  assert.equal((await db.query('SELECT count(*) AS count FROM taqadi_filing_artifacts')).rows[0].count, 1);
});
it('rejects missing human verification, note or idempotency key without mutation', async () => {
  for (const patch of [{ confirmed: false }, { confirmed: null }, { note: 'short' }, { note: 'x'.repeat(2001) }, { request: null }]) {
    await assert.rejects(restart(patch), /أكد مراجعة/);
    assert.equal((await job()).error_code, 'SUBMISSION_UNCERTAIN');
  }
});
it('enforces authentication, company isolation and contract permission before replaying commands', async () => {
  await assert.rejects(restart({ company: id(99) }), /صلاحية الوصول/);
  await db.exec("SELECT set_config('test.actor','',false)");
  await assert.rejects(restart(), /صلاحية الوصول/);
  await db.exec(`SELECT set_config('test.actor','${id(9)}',false),set_config('test.allowed','false',false)`);
  await assert.rejects(restart(), /صلاحية تجهيز/);
});
it('rejects stale and missing job versions', async () => {
  for (const version of [null, '2026-09-07T15:44:28.709198Z']) await assert.rejects(restart({ version }), /تغيرت حالة/);
});
it('prevents duplicates when the response is lost or the worker already claimed the accepted command', async () => {
  await restart(); await db.exec("UPDATE taqadi_filing_jobs SET status='validating',current_step='preflight',attempt_count=1");
  const repeated = (await restart()).rows[0].job;
  assert.equal(repeated.status, 'validating'); assert.equal(repeated.attempt_count, 1);
  assert.equal((await db.query("SELECT count(*) AS count FROM taqadi_filing_job_events WHERE event_type='retry_requested'")).rows[0].count, 1);
  await assert.rejects(restart({ request: id(11) }), /تغيرت حالة/);
});
it('keeps every submission-uncertain code blocked in the ordinary restart command', async () => {
  for (const code of ['SUBMISSION_UNCERTAIN', 'SUBMISSION_UNCERTAIN_AFTER_RESTART']) {
    await db.query('UPDATE taqadi_filing_jobs SET error_code=$1', [code]);
    await assert.rejects(db.query('SELECT restart_taqadi_filing_job_v2($1,$2,$3)', [id(1), id(2), payload]), /must be verified/);
  }
  assert.equal((await restart()).rows[0].job.status, 'queued');
});
it('blocks a stored result, pending receipt, ongoing operation or wrong state', async () => {
  for (const patch of ["result='{}'", "current_step='receipt_sync_pending'", "status='submitting'", "error_code='NETWORK_ERROR'"]) {
    await db.exec("UPDATE taqadi_filing_jobs SET result=NULL,current_step='submission_uncertain',status='needs_human',error_code='SUBMISSION_UNCERTAIN'");
    await db.exec('UPDATE taqadi_filing_jobs SET ' + patch); await assert.rejects(restart());
  }
});
it('blocks a worker still handling the target, while allowing an unrelated active job', async () => {
  await db.query("INSERT INTO taqadi_automation_workers VALUES($1,'busy',now())", [id(2)]);
  await assert.rejects(restart(), /الوكيل ما زال/);
  await db.query('UPDATE taqadi_automation_workers SET current_job_id=$1', [id(99)]);
  assert.equal((await restart()).rows[0].job.status, 'queued');
});
it('blocks court reference, filing date and post-preparation or closed cases', async () => {
  for (const patch of ["case_reference='REF-1'", "filing_date=current_date", "workflow_stage='awaiting_acceptance'", "workflow_stage=NULL", "case_status='closed'"]) {
    await db.exec("UPDATE legal_cases SET case_reference=NULL,filing_date=NULL,workflow_stage='preparation',case_status='pending'");
    await db.exec('UPDATE legal_cases SET ' + patch); await assert.rejects(restart(), /تجاوزت التجهيز/);
  }
});
it('blocks receipt artifacts or references in preparation records', async () => {
  for (const type of ['receipt', 'submission_summary']) {
    await db.query('INSERT INTO taqadi_filing_artifacts VALUES($1,$2,$3)', [id(2), id(1), type]);
    await assert.rejects(restart(), /إيصال أو مرجع محفوظ/);
    await db.query('DELETE FROM taqadi_filing_artifacts WHERE artifact_type=$1', [type]);
  }
  await db.query('INSERT INTO lawsuit_preparations(company_id,legal_case_id,taqadi_reference_number) VALUES($1,$2,$3)', [id(1), id(3), 'REF-1']);
  await assert.rejects(restart(), /إيصال أو مرجع محفوظ/);
});
it('blocks another active, filed or uncertain job for the same case', async () => {
  for (const [status, code] of [['queued', null], ['filed', null], ['failed', 'SUBMISSION_UNCERTAIN']]) {
    await db.query('INSERT INTO taqadi_filing_jobs(id,company_id,legal_case_id,status,error_code) VALUES($1,$2,$3,$4,$5)', [id(20), id(1), id(3), status, code]);
    await assert.rejects(restart(), /عملية أخرى/);
    await db.query('DELETE FROM taqadi_filing_jobs WHERE id=$1', [id(20)]);
  }
});
it('rolls back uncertainty and audit changes on package or source-link validation failure', async () => {
  for (const invalid of [{ ...payload, testReady: false }, { ...payload, documents: [] }]) {
    await assert.rejects(restart({ payload: invalid }));
    const unchanged = await job(); assert.equal(unchanged.error_code, 'SUBMISSION_UNCERTAIN'); assert.equal(unchanged.attempt_count, 3);
    assert.equal((await db.query('SELECT count(*) AS count FROM taqadi_filing_job_events')).rows[0].count, 1);
  }
});
it('exposes verified restart only to authenticated clients and preserves audit events on rollback', async () => {
  const signature = 'public.restart_verified_unsubmitted_taqadi_job_v1(uuid,uuid,jsonb,timestamptz,boolean,text,uuid)';
  const privileges = (await db.query(`SELECT has_function_privilege('anon',$1,'EXECUTE') AS anon,
    has_function_privilege('authenticated',$1,'EXECUTE') AS authenticated,
    has_function_privilege('service_role',$1,'EXECUTE') AS worker`, [signature])).rows[0];
  assert.deepEqual(privileges, { anon: false, authenticated: true, worker: false });
  const definitions = (await db.query("SELECT n.nspname,p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname='restart_verified_unsubmitted_taqadi_job_v1' ORDER BY n.nspname")).rows;
  assert.deepEqual(definitions, [{ nspname: 'public', prosecdef: false }, { nspname: 'taqadi_private', prosecdef: true }]);
  // Exercise the public wrapper as a real least-privilege caller; no table
  // permissions have been granted to authenticated in this fixture.
  await db.exec('SET ROLE authenticated');
  await restart();
  await db.exec('RESET ROLE');
  await db.exec(await read(isolationRollback));
  await db.exec(await read(rollback));
  assert.equal((await db.query('SELECT to_regprocedure($1) AS function', [signature])).rows[0].function, null);
  assert.equal((await job()).status, 'queued');
  assert.equal((await db.query("SELECT count(*) AS count FROM taqadi_filing_job_events WHERE event_type='submission_verified_unsubmitted'")).rows[0].count, 1);
});
