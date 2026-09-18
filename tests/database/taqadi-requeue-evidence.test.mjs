// Actual deployed retry/resume/refresh + evidence-link functions on PG17.
// Minimal synthetic schema; payload-content validator is explicitly stubbed.
// This suite proves link checks/transaction rollback, not complete filing readiness.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const migration = '../../supabase/migrations/20260903193636_revalidate_taqadi_evidence_on_requeue.sql';
const rollback = '../../supabase/rollbacks/20260903193636_revalidate_taqadi_evidence_on_requeue.rollback.sql';
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const company = uid(1), contract = uid(2), legalCase = uid(3), doc = uid(4), prep = uid(5), job = uid(6);
const payload = (source = doc) => ({ documents: [{ key: 'contract', sourceDocumentId: source, url: 'https://example.invalid/new.pdf' }] });

async function fixture(apply = true) {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${uid(99)}'::uuid$$;
    CREATE FUNCTION public.get_user_company_id() RETURNS uuid LANGUAGE sql AS $$SELECT '${company}'::uuid$$;
    CREATE TABLE legal_cases(id uuid PRIMARY KEY, company_id uuid,contract_id uuid,case_reference text,case_number text);
    CREATE TABLE contract_documents(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,
      document_type text,legal_identity_match_status text,legal_evidence_state text,file_path text,
      UNIQUE(company_id,contract_id,id));
    CREATE TABLE lawsuit_preparations(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,legal_case_id uuid,
      updated_at timestamptz,created_at timestamptz);
    CREATE TABLE taqadi_filing_jobs(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,legal_case_id uuid,
      lawsuit_preparation_id uuid,source_document_id uuid,payload jsonb,status text,current_step text,
      progress int DEFAULT 0,attempt_count int DEFAULT 1,max_attempts int DEFAULT 3,
      error_code text,error_message text,locked_by text,locked_at timestamptz,
      heartbeat_at timestamptz,completed_at timestamptz,updated_at timestamptz,created_at timestamptz DEFAULT now(),
      FOREIGN KEY(company_id,contract_id,source_document_id) REFERENCES contract_documents(company_id,contract_id,id) ON DELETE RESTRICT);
    CREATE TABLE taqadi_filing_job_events(id uuid DEFAULT gen_random_uuid(), company_id uuid,job_id uuid,
      event_type text,step text,status text,message text,details jsonb);
    -- Stub only the separate full-payload validator; source validation below is real.
    CREATE FUNCTION validate_taqadi_filing_payload_v1(uuid,uuid,jsonb) RETURNS jsonb
      LANGUAGE sql AS $$SELECT '{"ready":true}'::jsonb$$;
  `);
  for (const [file, name, tag] of [
    ['20260828141115_close_agent_safety_production_gaps.sql', 'hydrate_and_guard_taqadi_filing_links_v1', 'function'],
    ['20260729190000_restart_cancelled_taqadi_job.sql', 'retry_taqadi_filing_job_v1', ''],
    ['20260729170000_taqadi_human_assisted_resume.sql', 'resume_taqadi_filing_job_v1', ''],
    ['20260806224112_refresh_taqadi_filing_job_payload.sql', 'refresh_taqadi_filing_job_payload_v1', ''],
  ]) {
    const source = await read(`../../supabase/migrations/${file}`);
    const sql = source.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\$${tag}\\$;`))?.[0];
    assert.ok(sql, `Missing actual function ${name}`);
    await db.exec(sql);
  }
  await db.exec(`CREATE TRIGGER trg_hydrate_and_guard_taqadi_filing_links
    BEFORE INSERT OR UPDATE OF company_id,contract_id,legal_case_id,lawsuit_preparation_id,source_document_id,payload
    ON taqadi_filing_jobs FOR EACH ROW EXECUTE FUNCTION hydrate_and_guard_taqadi_filing_links_v1()`);
  if (apply) await db.exec(await read(migration));
  return db;
}
async function seed(db) {
  await db.query('INSERT INTO legal_cases VALUES($1,$2,$3,NULL,$4)', [legalCase, company, contract, 'TEST-ONLY']);
  await db.query("INSERT INTO contract_documents VALUES($1,$2,$3,'signed_contract','matched','active','original.pdf')", [doc, company, contract]);
  await db.query('INSERT INTO lawsuit_preparations VALUES($1,$2,$3,$4,now(),now())', [prep, company, contract, legalCase]);
  // Historical rows predate link enforcement, exactly the state being audited.
  await db.exec('ALTER TABLE taqadi_filing_jobs DISABLE TRIGGER USER');
  await db.query(`INSERT INTO taqadi_filing_jobs(id,company_id,contract_id,legal_case_id,status,payload,error_code)
    VALUES($1,$2,$3,$4,'needs_human',$5,'OLD_ERROR')`, [job, company, contract, legalCase, payload(null)]);
  await db.exec('ALTER TABLE taqadi_filing_jobs ENABLE TRIGGER USER');
}
const call = (db, name, fresh) => db.query(`SELECT public.${name}($1,$2${fresh === undefined ? '' : ',$3::jsonb'}) result`, fresh === undefined ? [company, job] : [company, job, fresh]);
const state = async (db) => (await db.query('SELECT * FROM taqadi_filing_jobs WHERE id=$1', [job])).rows[0];

describe('requeue source validation and atomic fresh resume', { concurrency: false }, () => {
  let db;
  before(async () => {
    db = await fixture();
    assert.equal(Math.floor(Number((await db.query('show server_version_num')).rows[0].server_version_num) / 10000), 17);
  });
  after(async () => { await db?.close(); });
  beforeEach(async () => { await db.exec('BEGIN'); await seed(db); });
  afterEach(async () => { await db.exec('ROLLBACK'); });

  for (const name of ['retry_taqadi_filing_job_v1', 'resume_taqadi_filing_job_v1']) {
    it(`rejects URL-only legacy evidence through ${name} without clearing the error or adding an event`, async () => {
      await db.exec('SAVEPOINT attempt');
      await assert.rejects(call(db, name), /TAQADI_DIRECT_ACTIVE_MATCHED_SOURCE_REQUIRED/);
      await db.exec('ROLLBACK TO SAVEPOINT attempt');
      assert.equal((await state(db)).status, 'needs_human');
      assert.equal((await state(db)).error_code, 'OLD_ERROR');
      assert.equal((await db.query('SELECT count(*)::int n FROM taqadi_filing_job_events')).rows[0].n, 0);
    });
    it(`permits currently valid linked evidence through ${name}`, async () => {
      await db.query('UPDATE taqadi_filing_jobs SET payload=$1 WHERE id=$2', [payload(), job]);
      const result = (await call(db, name)).rows[0].result;
      assert.equal(result.status, 'queued');
      assert.equal(result.source_document_id, doc);
      assert.equal(result.lawsuit_preparation_id, prep);
    });
  }
  for (const changes of ["legal_identity_match_status='mismatch'", "legal_evidence_state='quarantined'", "file_path=''", "document_type='other'"]) {
    it(`rechecks source changes before resume: ${changes}`, async () => {
      await db.query('UPDATE taqadi_filing_jobs SET payload=$1 WHERE id=$2', [payload(), job]);
      await db.exec(`UPDATE contract_documents SET ${changes}`);
      await assert.rejects(call(db, 'resume_taqadi_filing_job_v1'), /TAQADI_DIRECT_ACTIVE_MATCHED_SOURCE_REQUIRED/);
    });
  }
  it('allows stopping and recording errors on incomplete historical jobs', async () => {
    await db.query("UPDATE taqadi_filing_jobs SET status='cancelled',error_message='Stopped safely' WHERE id=$1", [job]);
    assert.equal((await state(db)).status, 'cancelled');
    assert.equal((await state(db)).source_document_id, null);
  });
  it('also checks a direct status-only update', async () => {
    await assert.rejects(db.query("UPDATE taqadi_filing_jobs SET status='queued' WHERE id=$1", [job]), /TAQADI_DIRECT_ACTIVE_MATCHED_SOURCE_REQUIRED/);
  });
  it('requires a preparation in the same case and company', async () => {
    await db.exec('DELETE FROM lawsuit_preparations');
    await assert.rejects(call(db, 'resume_taqadi_filing_job_v2', payload()), /TAQADI_LAWSUIT_PREPARATION_LINK_REQUIRED/);
  });
  it('rejects payload and relational source disagreement', async () => {
    await db.query('UPDATE taqadi_filing_jobs SET payload=$1 WHERE id=$2', [payload(), job]);
    await assert.rejects(call(db, 'resume_taqadi_filing_job_v2', payload(uid(999))), /TAQADI_PAYLOAD_SOURCE_DOCUMENT_MISMATCH/);
  });
  it('refreshes and safely hydrates a proven explicit source before resuming a legacy job', async () => {
    const result = (await call(db, 'resume_taqadi_filing_job_v2', payload())).rows[0].result;
    assert.equal(result.status, 'queued');
    assert.equal(result.current_step, 'resume_requested');
    assert.equal(result.attempt_count, 1);
    assert.equal(result.source_document_id, doc);
    assert.equal(result.payload.documents[0].sourceDocumentId, doc);
    const events = (await db.query('SELECT event_type FROM taqadi_filing_job_events')).rows;
    assert.deepEqual(events.map((row) => row.event_type).sort(), ['payload_refreshed', 'resume_requested']);
  });
  it('rolls back the refresh and its event if the following resume is rejected', async () => {
    // Current deployed refresh allows cancelled jobs, whereas resume v1 does not.
    await db.query("UPDATE taqadi_filing_jobs SET status='cancelled' WHERE id=$1", [job]);
    await db.exec('SAVEPOINT attempt');
    await assert.rejects(call(db, 'resume_taqadi_filing_job_v2', payload()), /Only stopped filing jobs can be resumed/);
    await db.exec('ROLLBACK TO SAVEPOINT attempt');
    assert.equal((await state(db)).source_document_id, null);
    assert.equal((await state(db)).payload.documents[0].sourceDocumentId, null);
    assert.equal((await db.query('SELECT count(*)::int n FROM taqadi_filing_job_events')).rows[0].n, 0);
  });
  it('retains uncertain-submission protection', async () => {
    await db.query("UPDATE taqadi_filing_jobs SET error_code='SUBMISSION_UNCERTAIN' WHERE id=$1", [job]);
    await assert.rejects(call(db, 'resume_taqadi_filing_job_v2', payload()), /Submission result must be verified/);
  });
  it('retains the existing external-reference protection', async () => {
    await db.exec("UPDATE legal_cases SET case_reference='external-reference'");
    await assert.rejects(call(db, 'resume_taqadi_filing_job_v2', payload()), /already has a Taqadi reference/);
  });
  it('retains company authorization in the composed command', async () => {
    await assert.rejects(db.query('SELECT resume_taqadi_filing_job_v2($1,$2,$3)', [uid(888), job, payload()]), (error) => error.code === '42501');
  });
  it('does not grant the new invoker command to anonymous clients', async () => {
    const row = (await db.query("SELECT prosecdef, has_function_privilege('anon',oid,'EXECUTE') anonymous FROM pg_proc WHERE oid='resume_taqadi_filing_job_v2(uuid,uuid,jsonb)'::regprocedure")).rows[0];
    assert.equal(row.prosecdef, false);
    assert.equal(row.anonymous, false);
  });
});

it('reproduces the old status-only bypass and verifies rollback/reapply', async () => {
  const db = await fixture(false);
  try {
    await seed(db);
    const oldResult = (await call(db, 'resume_taqadi_filing_job_v1')).rows[0].result;
    assert.equal(oldResult.status, 'queued');
    assert.equal(oldResult.source_document_id, null);
    await db.query("UPDATE taqadi_filing_jobs SET status='needs_human' WHERE id=$1", [job]);
    await db.exec(await read(migration));
    await assert.rejects(call(db, 'resume_taqadi_filing_job_v1'), /TAQADI_DIRECT_ACTIVE_MATCHED_SOURCE_REQUIRED/);
    await db.exec(await read(rollback));
    assert.equal((await call(db, 'resume_taqadi_filing_job_v1')).rows[0].result.status, 'queued');
    await db.query("UPDATE taqadi_filing_jobs SET status='needs_human' WHERE id=$1", [job]);
    await db.exec(await read(migration));
    assert.equal((await call(db, 'resume_taqadi_filing_job_v2', payload())).rows[0].result.source_document_id, doc);
  } finally { await db.close(); }
});
