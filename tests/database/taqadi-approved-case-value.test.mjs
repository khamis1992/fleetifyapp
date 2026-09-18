// Execute the production completion/approval functions against synthetic PG17
// records. Payload validation is stubbed; amount/identity checks in approval
// and the case-value guard below remain active.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const read = p => readFile(new URL(p, import.meta.url),'utf8');
before(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT current_setting('test.role',true)$$;
    CREATE TABLE legal_cases(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,workflow_stage text,case_value numeric,
      case_reference text,court_fees numeric,filing_date date,updated_at timestamptz);
    CREATE TABLE contracts(id uuid,company_id uuid,customer_id uuid,vehicle_id uuid,license_plate text);
    CREATE TABLE customers(id uuid,company_id uuid,national_id text,address text,email text);
    CREATE TABLE vehicles(id uuid,company_id uuid,plate_number text);
    CREATE TABLE legal_case_litigation_profile(id uuid,company_id uuid,contract_id uuid,defendant_service_address text,
      defendant_email text,legal_review_status text,approved_by uuid,approved_at timestamptz,approval_source text,
      approval_job_id uuid,approval_worker_id text);
    CREATE TABLE legal_case_memo_snapshots(id uuid,company_id uuid,contract_id uuid,case_id uuid,version int,payload jsonb,
      readiness_status text,approved_by uuid,approved_at timestamptz,approval_source text,approval_job_id uuid,approval_worker_id text);
    CREATE TABLE taqadi_filing_jobs(id uuid PRIMARY KEY,company_id uuid,legal_case_id uuid,contract_id uuid,
      lawsuit_preparation_id uuid,locked_by text,status text,current_step text,progress int,payload jsonb,final_approval boolean,
      result jsonb,requested_by uuid,error_code text,error_message text,heartbeat_at timestamptz,completed_at timestamptz,updated_at timestamptz);
    CREATE TABLE lawsuit_preparations(id uuid,company_id uuid,contract_id uuid,legal_case_id uuid,status text,
      taqadi_case_number text,taqadi_reference_number text,submitted_at timestamptz,registered_at timestamptz,updated_at timestamptz);
    CREATE TABLE taqadi_filing_job_events(company_id uuid,job_id uuid,event_type text,step text,status text,message text,details jsonb);
    CREATE TABLE taqadi_automation_workers(worker_id text,status text,current_job_id uuid,heartbeat_at timestamptz,last_error text);
    CREATE TABLE legal_case_activities(case_id uuid,company_id uuid,activity_type text,activity_title text,
      activity_description text,old_values jsonb,new_values jsonb,created_by uuid);
    CREATE FUNCTION calculate_legal_claim_amount_v1(uuid,uuid,date) RETURNS numeric LANGUAGE sql AS $$SELECT 40000::numeric$$;
    CREATE FUNCTION validate_taqadi_filing_payload_v1(uuid,uuid,jsonb) RETURNS jsonb LANGUAGE sql AS $$SELECT '{"ready":true}'::jsonb$$;
    CREATE FUNCTION legal_case_filing_block_reason_v1(uuid,uuid,numeric) RETURNS text LANGUAGE sql AS $$
      SELECT CASE WHEN $3 <> 40000 OR current_setting('test.block',true)='on' THEN 'claim or evidence changed' END$$;
    CREATE FUNCTION transition_legal_case_workflow_v1(uuid,uuid,text,text,uuid) RETURNS void LANGUAGE plpgsql AS $$
    BEGIN
      IF $3='filed' AND public.legal_case_filing_block_reason_v1($1,$2,(SELECT case_value FROM public.legal_cases WHERE id=$2)) IS NOT NULL
      THEN RAISE EXCEPTION 'claim or evidence changed'; END IF;
      UPDATE public.legal_cases SET workflow_stage=$3 WHERE company_id=$1 AND id=$2;
    END $$;`);
  const approval = await read('../../supabase/migrations/20260827155145_agent_owned_legal_filing_approval.sql');
  await db.exec(approval.match(/CREATE OR REPLACE FUNCTION public\.approve_taqadi_reviewed_legal_file_v1[\s\S]*?\$function\$;/)[0]);
  await db.exec(await read('../../supabase/migrations/20260906064817_reliable_taqadi_receipt_completion.sql'));
  await db.exec(await read('../../supabase/migrations/20260907135928_synchronize_taqadi_approved_case_value.sql'));
});
beforeEach(async () => {
  await db.exec(`TRUNCATE legal_cases,contracts,customers,vehicles,legal_case_litigation_profile,legal_case_memo_snapshots,
    taqadi_filing_jobs,lawsuit_preparations,taqadi_filing_job_events,taqadi_automation_workers,legal_case_activities;
    SELECT set_config('test.role','service_role',false),set_config('test.block','off',false);
    INSERT INTO legal_cases(id,company_id,contract_id,workflow_stage,case_value) VALUES ('${id(2)}','${id(1)}','${id(3)}','preparation',56500);
    INSERT INTO contracts VALUES ('${id(3)}','${id(1)}','${id(7)}','${id(8)}','721440');
    INSERT INTO customers VALUES ('${id(7)}','${id(1)}','12345678901','address','test@example.invalid');
    INSERT INTO vehicles VALUES ('${id(8)}','${id(1)}','721440');
    INSERT INTO legal_case_litigation_profile(id,company_id,contract_id) VALUES ('${id(9)}','${id(1)}','${id(3)}');
    INSERT INTO taqadi_filing_jobs(id,company_id,legal_case_id,contract_id,lawsuit_preparation_id,locked_by,status,current_step,payload,final_approval)
    VALUES ('${id(4)}','${id(1)}','${id(2)}','${id(3)}','${id(5)}','worker-a','reviewing','final_review',
      '{"memoSnapshotId":"${id(6)}","case":{"amount":40000},"finalApproval":true,"defendant":{"idNumber":"12345678901","address":"address","email":"test@example.invalid"}}',true);
    INSERT INTO legal_case_memo_snapshots(id,company_id,contract_id,case_id,version,payload,readiness_status)
    VALUES ('${id(6)}','${id(1)}','${id(3)}','${id(2)}',1,'{"customer":{"total_debt":40000,"id_number":"12345678901","address":"address","email":"test@example.invalid"},"vehicleInfo":{"plate":"721440"}}','ready');
    INSERT INTO lawsuit_preparations(id,company_id,contract_id,legal_case_id,status) VALUES ('${id(5)}','${id(1)}','${id(3)}','${id(2)}','ready');`);
});
after(() => db.close());
const approve = () => db.query('SELECT approve_taqadi_reviewed_legal_file_v1($1,\'worker-a\',\'{"matched":true,"claimAmountMatches":true}\')',[id(4)]);
const complete = () => db.query("SELECT complete_taqadi_filing_job_v1($1,'worker-a',NULL,'REF-12345',3000,'{}')",[id(4)]);
const value = async () => (await db.query('SELECT case_value,workflow_stage FROM legal_cases')).rows[0];
it('synchronizes the stale case register before final approval and audits the exact old value', async () => {
  await approve();
  assert.deepEqual(await value(),{case_value:'40000',workflow_stage:'preparation'});
  const audit = (await db.query('SELECT old_values,new_values FROM legal_case_activities')).rows[0];
  assert.equal(audit.old_values.case_value,56500); assert.equal(audit.new_values.case_value,40000);
});
it('recovers an already approved receipt with a stale register atomically and idempotently', async () => {
  await approve();
  await db.exec("UPDATE legal_cases SET case_value=56500; TRUNCATE legal_case_activities; UPDATE taqadi_filing_jobs SET status='submitting'");
  await complete(); await complete();
  assert.deepEqual(await value(),{case_value:'40000',workflow_stage:'awaiting_acceptance'});
  assert.equal((await db.query('SELECT * FROM legal_case_activities')).rows.length,1);
  assert.equal((await db.query("SELECT * FROM taqadi_filing_job_events WHERE event_type='filed'")).rows.length,1);
});
it('still rejects financial or evidence changes and rolls the register back', async () => {
  await db.exec("SELECT set_config('test.block','on',false)");
  await assert.rejects(approve(),/readiness check/);
  assert.equal((await value()).case_value,'56500');
  assert.equal((await db.query('SELECT * FROM legal_case_activities')).rows.length,0);
});
it('does not accept a mismatched snapshot, tenant or a different worker on receipt recovery', async () => {
  await approve();
  await db.exec("UPDATE legal_cases SET case_value=56500; UPDATE taqadi_filing_jobs SET status='submitting'; UPDATE legal_case_memo_snapshots SET approval_worker_id='other'");
  await assert.rejects(complete(),/exact filing memo/);
  await db.exec("UPDATE legal_case_memo_snapshots SET approval_worker_id='worker-a', payload=jsonb_set(payload,'{customer,total_debt}','39000')");
  await assert.rejects(complete(),/amounts do not match/);
  await db.query('UPDATE legal_case_memo_snapshots SET company_id=$1',[id(90)]);
  await assert.rejects(complete(),/exact filing memo/);
});
it('rejects an untrusted caller and preserves case history after it left preparation', async () => {
  await approve();
  await db.exec("SELECT set_config('test.role','authenticated',false)");
  await assert.rejects(db.query("SELECT sync_taqadi_approved_case_value_v1($1,'worker-a')",[id(4)]),/trusted worker/);
  await db.exec("SELECT set_config('test.role','service_role',false); UPDATE legal_cases SET workflow_stage='hearings',case_value=41000");
  await db.query("SELECT sync_taqadi_approved_case_value_v1($1,'worker-a')",[id(4)]);
  assert.equal((await value()).case_value,'41000');
});
it('rolls back the function change without removing audited values', async () => {
  await approve();
  await db.exec(await read('../../supabase/rollbacks/20260907135928_synchronize_taqadi_approved_case_value.rollback.sql'));
  assert.equal((await value()).case_value,'40000');
  assert.equal((await db.query("SELECT to_regprocedure('sync_taqadi_approved_case_value_v1(uuid,text)') AS fn")).rows[0].fn,null);
});
