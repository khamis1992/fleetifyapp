// Execute the real PostgreSQL command bodies and evidence trigger.
// The separate full-payload validator is stubbed; this suite tests link repair.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const migration = '../../supabase/migrations/20260905135731_repair_taqadi_legacy_preparation_links.sql';
const rollback = '../../supabase/rollbacks/20260905135731_repair_taqadi_legacy_preparation_links.rollback.sql';
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const company=uid(1), contract=uid(2), legalCase=uid(3), doc=uid(4), job=uid(6);
const payload = () => ({ case: {amount:1500,title:'Test case'}, defendant:{fullName:'Test Customer'}, documents:[{key:'contract',sourceDocumentId:doc,url:'https://example.invalid/contract.pdf'}] });
let db;
const command = name => db.query(`SELECT public.${name}($1,$2,$3::jsonb) result`,[company,job,payload()]);
const count = async table => (await db.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n;
before(async()=>{
  db=new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${uid(99)}'::uuid $$;
    CREATE FUNCTION get_user_company_id() RETURNS uuid LANGUAGE sql AS $$ SELECT '${company}'::uuid $$;
    CREATE TABLE contracts(id uuid PRIMARY KEY,company_id uuid,customer_id uuid);
    CREATE TABLE legal_cases(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,case_reference text,case_number text);
    CREATE TABLE contract_documents(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,document_type text,legal_identity_match_status text,legal_evidence_state text,file_path text);
    CREATE TABLE lawsuit_preparations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,legal_case_id uuid,customer_id uuid,source_document_id uuid,
      defendant_name text NOT NULL,defendant_id_number text,defendant_type text,overdue_rent numeric,late_fees numeric,other_fees numeric,total_amount numeric NOT NULL,
      amount_in_words text,case_title text,facts_text text,claims_text text,explanatory_memo_url text,claims_statement_url text,contract_copy_url text,status text,
      prepared_at timestamptz,prepared_by uuid,updated_at timestamptz,created_at timestamptz DEFAULT now());
    CREATE TABLE taqadi_filing_jobs(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,legal_case_id uuid,lawsuit_preparation_id uuid REFERENCES lawsuit_preparations(id),
      source_document_id uuid,payload jsonb,status text,current_step text,progress int,attempt_count int DEFAULT 1,max_attempts int DEFAULT 3,error_code text,error_message text,
      locked_by text,locked_at timestamptz,heartbeat_at timestamptz,completed_at timestamptz,updated_at timestamptz,created_at timestamptz DEFAULT now());
    CREATE TABLE taqadi_filing_job_events(company_id uuid,job_id uuid,event_type text,step text,status text,message text,details jsonb);
    CREATE FUNCTION validate_taqadi_filing_payload_v1(uuid,uuid,jsonb) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"ready":true}'::jsonb $$;`);
  for(const [file,name,tag] of [
    ['20260828141115_close_agent_safety_production_gaps.sql','hydrate_and_guard_taqadi_filing_links_v1','function'],
    ['20260729170000_taqadi_human_assisted_resume.sql','resume_taqadi_filing_job_v1',''],
  ]) {
    const sql=(await read('../../supabase/migrations/'+file)).match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\$${tag}\\$;`))[0];
    await db.exec(sql);
  }
  await db.exec(await read(rollback));
  await db.exec(`CREATE TRIGGER guard_links BEFORE INSERT OR UPDATE OF lawsuit_preparation_id,source_document_id,payload ON taqadi_filing_jobs FOR EACH ROW EXECUTE FUNCTION hydrate_and_guard_taqadi_filing_links_v1();`);
  await db.exec(await read('../../supabase/migrations/20260903193636_revalidate_taqadi_evidence_on_requeue.sql'));
  await db.exec(await read(migration));
});
after(async()=>db?.close());
beforeEach(async()=>{
  await db.exec('BEGIN');
  await db.query('INSERT INTO contracts VALUES($1,$2,$3)',[contract,company,uid(8)]);
  await db.query('INSERT INTO legal_cases VALUES($1,$2,$3,NULL,$4)',[legalCase,company,contract,'TEST']);
  await db.query("INSERT INTO contract_documents VALUES($1,$2,$3,'signed_contract','matched','active','contract.pdf')",[doc,company,contract]);
  await db.exec('ALTER TABLE taqadi_filing_jobs DISABLE TRIGGER USER');
  await db.query("INSERT INTO taqadi_filing_jobs(id,company_id,contract_id,legal_case_id,status,payload,error_code) VALUES($1,$2,$3,$4,'cancelled','{}','OLD_ERROR')",[job,company,contract,legalCase]);
  await db.exec('ALTER TABLE taqadi_filing_jobs ENABLE TRIGGER USER');
});
afterEach(async()=>db.exec('ROLLBACK'));
describe('historical preparation repair',()=>{
  it('reproduces the deployed error, then repairs the same job after applying the fix',async()=>{
    // Function rollback itself contains transaction boundaries, so exercise in a savepoint-free body.
    const old=(await read(rollback)).replace(/^BEGIN;$/gm,'').replace(/^COMMIT;$/gm,'');
    await db.exec(old); await db.exec('SAVEPOINT attempt');
    await assert.rejects(command('restart_taqadi_filing_job_v2'),/TAQADI_LAWSUIT_PREPARATION_LINK_REQUIRED/);
    await db.exec('ROLLBACK TO SAVEPOINT attempt');
    await db.exec((await read(migration)).replace(/^BEGIN;$/gm,'').replace(/^COMMIT;$/gm,''));
    const result=(await command('restart_taqadi_filing_job_v2')).rows[0].result;
    assert.equal(result.id,job); assert.equal(result.status,'queued'); assert.equal(result.source_document_id,doc);
    assert.ok(result.lawsuit_preparation_id); assert.equal(await count('lawsuit_preparations'),1); assert.equal(await count('taqadi_filing_jobs'),1);
  });
  it('refreshes a stopped job without queueing and reuses its preparation',async()=>{
    const first=(await command('refresh_taqadi_filing_job_payload_v1')).rows[0].result;
    const second=(await command('refresh_taqadi_filing_job_payload_v1')).rows[0].result;
    assert.equal(first.status,'cancelled'); assert.equal(first.lawsuit_preparation_id,second.lawsuit_preparation_id); assert.equal(await count('lawsuit_preparations'),1);
  });
  it('repairs links on the atomic resume path',async()=>{
    await db.query("UPDATE taqadi_filing_jobs SET status='needs_human' WHERE id=$1",[job]);
    const result=(await command('resume_taqadi_filing_job_v2')).rows[0].result;
    assert.equal(result.status,'queued'); assert.ok(result.lawsuit_preparation_id);
  });
  for(const change of ["legal_identity_match_status='mismatch'","legal_evidence_state='quarantined'","file_path=''"]){
    it('rolls back preparation creation when evidence fails: '+change,async()=>{
      await db.exec('UPDATE contract_documents SET '+change); await db.exec('SAVEPOINT attempt');
      await assert.rejects(command('restart_taqadi_filing_job_v2'),/TAQADI_DIRECT_ACTIVE_MATCHED_SOURCE_REQUIRED/);
      await db.exec('ROLLBACK TO SAVEPOINT attempt'); assert.equal(await count('lawsuit_preparations'),0); assert.equal(await count('taqadi_filing_job_events'),0);
    });
  }
  for(const [sql,pattern] of [
    ["UPDATE taqadi_filing_jobs SET error_code='SUBMISSION_UNCERTAIN'",/Submission result must be verified/],
    ["UPDATE legal_cases SET case_reference='EXTERNAL'",/already has a Taqadi reference/],
    ["UPDATE taqadi_filing_jobs SET status='running'",/Only stopped/],
  ]) it('retains existing protection: '+sql,async()=>{ await db.exec(sql); await assert.rejects(command('restart_taqadi_filing_job_v2'),pattern); });
  it('rejects cross-company access',async()=>{
    await assert.rejects(db.query('SELECT restart_taqadi_filing_job_v2($1,$2,$3)',[uid(777),job,payload()]),e=>e.code==='42501');
  });
});
