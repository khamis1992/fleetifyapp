import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
before(async () => {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.actor',true),'')::uuid $$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('test.role',true) $$;
 CREATE FUNCTION get_user_company_id() RETURNS uuid LANGUAGE sql AS $$ SELECT '${id(1)}'::uuid $$;
 CREATE FUNCTION legal_workflow_actor_profile_v1(uuid,uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT auth.uid() $$;
 CREATE TABLE legal_cases(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,workflow_stage text,case_status text,
 case_reference text,filing_date date,stage_updated_at timestamptz,updated_at timestamptz);
 CREATE TABLE legal_case_activities(case_id uuid,company_id uuid,activity_type text,activity_title text,
 activity_description text,old_values jsonb,new_values jsonb,created_by uuid);
 CREATE TABLE taqadi_filing_jobs(id uuid,legal_case_id uuid,company_id uuid,status text,current_step text,progress int,
 error_code text,error_message text,locked_by text,locked_at timestamptz,heartbeat_at timestamptz,completed_at timestamptz,updated_at timestamptz,result jsonb);
 CREATE TABLE taqadi_filing_job_events(company_id uuid,job_id uuid,event_type text,step text,status text,message text,details jsonb);
 CREATE TABLE taqadi_automation_workers(worker_id text,status text,current_job_id uuid,heartbeat_at timestamptz,last_error text);
 CREATE TABLE lawsuit_preparations(legal_case_id uuid,company_id uuid,status text,taqadi_reference_number text,submitted_at timestamptz,updated_at timestamptz);
 CREATE FUNCTION legal_workflow_sync_contract_v1(uuid,uuid,text) RETURNS void LANGUAGE plpgsql AS $$
 BEGIN IF current_setting('test.fail',true)='on' THEN RAISE EXCEPTION 'sync failed'; END IF; END $$;`);
 await db.exec(await readFile(new URL('../../supabase/migrations/20260905151958_record_external_legal_filing.sql',import.meta.url),'utf8'));
 const original=await readFile(new URL('../../supabase/migrations/20260728120000_taqadi_filing_automation.sql',import.meta.url),'utf8');
 await db.exec(original.match(/CREATE OR REPLACE FUNCTION public\.update_taqadi_filing_job_v1[\s\S]*?\$\$;/)[0]);
 await db.exec(await readFile(new URL('../../supabase/migrations/20260907141007_cooperative_taqadi_manual_stop.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../../supabase/migrations/20260907183505_allow_external_filing_after_confirmed_manual_stop.sql',import.meta.url),'utf8'));
 await db.exec('CREATE SCHEMA taqadi_private; GRANT USAGE ON SCHEMA taqadi_private TO authenticated;');
 await db.exec(await readFile(new URL('../../supabase/migrations/20260908063143_automatic_external_filing_handoff.sql',import.meta.url),'utf8'));
});
beforeEach(async () => {
 await db.exec(`TRUNCATE legal_cases,legal_case_activities,taqadi_filing_jobs,lawsuit_preparations,taqadi_filing_job_events;
 SELECT set_config('test.actor','${id(3)}',false),set_config('test.fail','off',false),set_config('test.role','service_role',false);
 INSERT INTO legal_cases(id,company_id,contract_id,workflow_stage) VALUES ('${id(2)}','${id(1)}','${id(4)}','preparation');
 INSERT INTO lawsuit_preparations(legal_case_id,company_id) VALUES ('${id(2)}','${id(1)}');`);
});
after(() => db.close());
const record = (ref='REF-123',date='2026-09-04',company=id(1)) => db.query('select * from record_external_legal_filing_v1($1,$2,$3,$4)',[company,id(2),ref,date]);
it('records external evidence atomically and idempotently', async () => {
 const {rows:[row]} = await record(); assert.equal(row.workflow_stage,'awaiting_acceptance'); assert.equal(row.case_reference,'REF-123');
 await record();
 assert.equal((await db.query('select * from legal_case_activities')).rows.length,1);
 assert.equal((await db.query('select status from lawsuit_preparations')).rows[0].status,'submitted');
});
it('rejects missing reference and future dates',async()=> {
 await assert.rejects(record(' '),/رقم طلب/); await assert.rejects(record('REF','2999-01-01'),/تاريخ/);
});
it('rejects wrong tenant and anonymous callers',async()=> {
 await assert.rejects(record('REF','2026-09-04',id(8)),/غير مصرح/);
 await db.exec("select set_config('test.actor','',false)"); await assert.rejects(record(),/غير مصرح/);
});
it('does not overwrite advanced or closed stages',async()=> {
 for(const stage of ['hearings','closed','cancelled','collection']){
 await db.query('update legal_cases set workflow_stage=$1',[stage]); await assert.rejects(record(),/المرحلة/);
 }
});
it('rejects a conflicting reference',async()=>{
 await db.exec("update legal_cases set case_reference='OTHER'"); await assert.rejects(record(),/مختلف/);
});
it('blocks active automation but permits failed jobs without rewriting their result',async()=>{
 await db.exec(`insert into taqadi_filing_jobs(id,legal_case_id,company_id,status) values ('${id(5)}','${id(2)}','${id(1)}','submitting')`);
 await assert.rejects(record(),/الجارية/);
 await db.exec("update taqadi_filing_jobs set status='failed'"); await record();
 assert.equal((await db.query('select status from taqadi_filing_jobs')).rows[0].status,'failed');
});
it('rolls back evidence and status if dependent synchronization fails',async()=>{
 await db.exec("select set_config('test.fail','on',false)"); await assert.rejects(record(),/sync failed/);
 assert.equal((await db.query('select workflow_stage from legal_cases')).rows[0].workflow_stage,'preparation');
 assert.equal((await db.query('select * from legal_case_activities')).rows.length,0);
});

it('allows external filing only after worker acknowledgement revokes ownership',async()=>{
 await db.exec(`insert into taqadi_filing_jobs(id,legal_case_id,company_id,status,locked_by,locked_at,error_code)
 values ('${id(5)}','${id(2)}','${id(1)}','reviewing','worker-a',now(),'MANUAL_STOP_REQUESTED')`);
 await assert.rejects(record(),/الجارية/);
 await db.query("select check_taqadi_filing_control_v1($1,'worker-a',true)",[id(5)]);
 const job=(await db.query('select * from taqadi_filing_jobs')).rows[0];
 assert.equal(job.error_code,'MANUALLY_STOPPED'); assert.equal(job.locked_by,null); assert.equal(job.locked_at,null);
 await assert.rejects(db.query("select update_taqadi_filing_job_v1($1,'worker-a','submitting','late',95)",[id(5)]),/lock was lost/);
 await record(); await record();
 assert.equal((await db.query('select * from legal_case_activities')).rows.length,1);
});

const handoff = (ref='REF-123', date='2026-09-04', company=id(1)) =>
 db.query('select record_external_legal_filing_v2($1,$2,$3,$4) as result',[company,id(2),ref,date]).then(r=>r.rows[0].result);
const jobFixture = (status='needs_human',code='SUBMISSION_UNCERTAIN') => db.query(`insert into taqadi_filing_jobs
 (id,legal_case_id,company_id,status,current_step,error_code,locked_by,locked_at)
 values ($1,$2,$3,$4,'submission_uncertain',$5,'worker-a',now())`,[id(5),id(2),id(1),status,code]);

it('one approval retires a paused uncertain task and records the attested filing without manufacturing a receipt',async()=>{
 await jobFixture();
 const result=await handoff(); assert.equal(result.state,'recorded'); assert.equal(result.legalCase.case_reference,'REF-123');
 const job=(await db.query('select * from taqadi_filing_jobs')).rows[0];
 assert.equal(job.status,'cancelled'); assert.equal(job.error_code,'EXTERNAL_FILING_RECORDED');
 assert.equal(job.locked_by,null); assert.equal(job.result,null);
 const event=(await db.query("select details from taqadi_filing_job_events where event_type='external_filing_handoff'")).rows[0].details;
 assert.equal(event.previousErrorCode,'SUBMISSION_UNCERTAIN'); assert.equal(event.reference,'REF-123');
 await assert.rejects(db.query("select update_taqadi_filing_job_v1($1,'worker-a','submitting','late',95)",[id(5)]),/lock was lost/);
 await handoff();
 assert.equal((await db.query('select * from legal_case_activities')).rows.length,1);
 assert.equal((await db.query('select * from taqadi_filing_job_events')).rows.length,1);
});
it('commits a stop request, waits for the trusted worker, then records on automatic continuation',async()=>{
 await jobFixture('submitting',null);
 assert.equal((await handoff()).state,'waiting_for_stop');
 assert.equal((await handoff()).state,'waiting_for_stop');
 assert.equal((await db.query('select * from legal_case_activities')).rows.length,0);
 const job=(await db.query('select * from taqadi_filing_jobs')).rows[0];
 assert.equal(job.status,'submitting'); assert.equal(job.locked_by,'worker-a'); assert.equal(job.error_code,'MANUAL_STOP_REQUESTED');
 assert.equal((await db.query("select * from taqadi_filing_job_events where event_type='stop_requested'")).rows.length,1);
 await db.query("select check_taqadi_filing_control_v1($1,'worker-a',true)",[id(5)]);
 assert.equal((await handoff()).state,'recorded');
});
it('never treats an expired lock on active browser work as an acknowledgement',async()=>{
 await jobFixture('reviewing',null); await db.exec("update taqadi_filing_jobs set locked_at=now()-interval '1 day',heartbeat_at=now()-interval '1 day'");
 assert.equal((await handoff()).state,'waiting_for_stop');
 assert.equal((await handoff()).state,'waiting_for_stop');
 assert.equal((await db.query('select workflow_stage from legal_cases')).rows[0].workflow_stage,'preparation');
});
it('cancels queued work before the worker can claim it and isolates other cases/companies',async()=>{
 await jobFixture('queued',null);
 await db.exec(`insert into taqadi_filing_jobs(id,legal_case_id,company_id,status) values
 ('${id(6)}','${id(8)}','${id(1)}','reviewing'),('${id(7)}','${id(2)}','${id(9)}','reviewing')`);
 assert.equal((await handoff()).state,'recorded');
 assert.deepEqual((await db.query('select status from taqadi_filing_jobs where id<>$1 order by id',[id(5)])).rows.map(r=>r.status),['reviewing','reviewing']);
});
it('rejects invalid evidence and unauthorized calls before stopping any worker',async()=>{
 await jobFixture('submitting',null);
 await assert.rejects(handoff(' '),/رقم طلب/);
 await assert.rejects(handoff('REF','2999-01-01'),/تاريخ/);
 await assert.rejects(handoff('REF','2026-09-04',id(9)),/غير مصرح/);
 await db.exec("select set_config('test.actor','',false)"); await assert.rejects(handoff(),/غير مصرح/);
 assert.equal((await db.query('select error_code from taqadi_filing_jobs')).rows[0].error_code,null);
});
it('protects an existing mismatched receipt and waits for matching receipt synchronization',async()=>{
 await jobFixture('submitting',null);
 await db.exec(`update taqadi_filing_jobs set current_step='receipt_sync_pending',result='{"referenceNumber":"OTHER"}'`);
 await assert.rejects(handoff(),/لا يطابق/);
 await db.exec(`update taqadi_filing_jobs set result='{"referenceNumber":"REF-123"}'`);
 assert.equal((await handoff()).state,'waiting_for_receipt');
 assert.equal((await db.query('select error_code from taqadi_filing_jobs')).rows[0].error_code,null);
 await db.exec("update taqadi_filing_jobs set status='filed',current_step='completed'; update legal_cases set workflow_stage='filed',case_reference='REF-123'");
 assert.equal((await handoff()).state,'recorded');
 assert.equal((await db.query('select status from taqadi_filing_jobs')).rows[0].status,'filed');
});
it('rolls back task retirement and audit together if recording fails',async()=>{
 await jobFixture(); await db.exec("select set_config('test.fail','on',false)");
 await assert.rejects(handoff(),/sync failed/);
 assert.equal((await db.query('select status from taqadi_filing_jobs')).rows[0].status,'needs_human');
 assert.equal((await db.query('select * from taqadi_filing_job_events')).rows.length,0);
});
it('exposes only the authenticated invoker facade and preserves evidence on rollback',async()=>{
 const permissions=(await db.query(`select
 has_function_privilege('anon','public.record_external_legal_filing_v2(uuid,uuid,text,date)','EXECUTE') as anon,
 has_function_privilege('authenticated','public.record_external_legal_filing_v2(uuid,uuid,text,date)','EXECUTE') as allowed,
 (select prosecdef from pg_proc where oid='public.record_external_legal_filing_v2(uuid,uuid,text,date)'::regprocedure) as definer`)).rows[0];
 assert.deepEqual(permissions,{anon:false,allowed:true,definer:false});
 await jobFixture(); await handoff();
 await db.exec(await readFile(new URL('../../supabase/rollbacks/20260908063143_automatic_external_filing_handoff.rollback.sql',import.meta.url),'utf8'));
 assert.equal((await db.query('select workflow_stage from legal_cases')).rows[0].workflow_stage,'awaiting_acceptance');
 assert.equal((await db.query('select * from legal_case_activities')).rows.length,1);
});
it('still blocks every other human pause, uncertain submission, or unreleased owner',async()=>{
 await db.exec(`insert into taqadi_filing_jobs(id,legal_case_id,company_id,status,current_step,error_code)
 values ('${id(5)}','${id(2)}','${id(1)}','needs_human','manual_stop','MANUALLY_STOPPED')`);
 for(const code of ['SUBMISSION_UNCERTAIN','SUBMISSION_UNCERTAIN_AFTER_RESTART','MANUAL_STOP_REQUESTED','LOGIN_REQUIRED',null]){
   await db.query('update taqadi_filing_jobs set error_code=$1',[code]); await assert.rejects(record(),/الجارية/);
 }
 await db.exec("update taqadi_filing_jobs set error_code='MANUALLY_STOPPED',locked_by='worker-a'");
 await assert.rejects(record(),/الجارية/);
 await db.exec("update taqadi_filing_jobs set locked_by=NULL,locked_at=now()");
 await assert.rejects(record(),/الجارية/);
});
it('repairs only previously acknowledged stopped ownership and can roll back without losing filing evidence',async()=>{
 const rollback=await readFile(new URL('../../supabase/rollbacks/20260907183505_allow_external_filing_after_confirmed_manual_stop.rollback.sql',import.meta.url),'utf8');
 const migration=await readFile(new URL('../../supabase/migrations/20260907183505_allow_external_filing_after_confirmed_manual_stop.sql',import.meta.url),'utf8');
 await db.exec(rollback);
 await db.exec(`insert into taqadi_filing_jobs(id,legal_case_id,company_id,status,current_step,error_code,locked_by,locked_at)
 values ('${id(5)}','${id(2)}','${id(1)}','needs_human','manual_stop','MANUALLY_STOPPED','worker-a',now()),
 ('${id(6)}',NULL,'${id(1)}','needs_human','manual_stop','MANUALLY_STOPPED','worker-b',now());
 insert into taqadi_filing_job_events(company_id,job_id,event_type,step,status)
 values ('${id(1)}','${id(5)}','stopped','manual_stop','needs_human');`);
 await db.exec(migration);
 assert.equal((await db.query('select locked_by from taqadi_filing_jobs where id=$1',[id(5)])).rows[0].locked_by,null);
 assert.equal((await db.query('select locked_by from taqadi_filing_jobs where id=$1',[id(6)])).rows[0].locked_by,'worker-b');
 assert.equal((await db.query("select * from taqadi_filing_job_events where event_type='manual_stop_lock_released'")).rows.length,1);
 await record(); await db.exec(rollback);
 assert.equal((await db.query('select workflow_stage from legal_cases')).rows[0].workflow_stage,'awaiting_acceptance');
 assert.equal((await db.query('select * from legal_case_activities')).rows.length,1);
});
