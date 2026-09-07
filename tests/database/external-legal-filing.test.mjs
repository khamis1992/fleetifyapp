import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
before(async () => {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.actor',true),'')::uuid $$;
 CREATE FUNCTION get_user_company_id() RETURNS uuid LANGUAGE sql AS $$ SELECT '${id(1)}'::uuid $$;
 CREATE FUNCTION legal_workflow_actor_profile_v1(uuid,uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT auth.uid() $$;
 CREATE TABLE legal_cases(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,workflow_stage text,case_status text,
 case_reference text,filing_date date,stage_updated_at timestamptz,updated_at timestamptz);
 CREATE TABLE legal_case_activities(case_id uuid,company_id uuid,activity_type text,activity_title text,
 activity_description text,old_values jsonb,new_values jsonb,created_by uuid);
 CREATE TABLE taqadi_filing_jobs(id uuid,legal_case_id uuid,company_id uuid,status text);
 CREATE TABLE lawsuit_preparations(legal_case_id uuid,company_id uuid,status text,taqadi_reference_number text,submitted_at timestamptz,updated_at timestamptz);
 CREATE FUNCTION legal_workflow_sync_contract_v1(uuid,uuid,text) RETURNS void LANGUAGE plpgsql AS $$
 BEGIN IF current_setting('test.fail',true)='on' THEN RAISE EXCEPTION 'sync failed'; END IF; END $$;`);
 await db.exec(await readFile(new URL('../../supabase/migrations/20260905151958_record_external_legal_filing.sql',import.meta.url),'utf8'));
});
beforeEach(async () => {
 await db.exec(`TRUNCATE legal_cases,legal_case_activities,taqadi_filing_jobs,lawsuit_preparations;
 SELECT set_config('test.actor','${id(3)}',false),set_config('test.fail','off',false);
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
 await db.exec(`insert into taqadi_filing_jobs values ('${id(5)}','${id(2)}','${id(1)}','submitting')`);
 await assert.rejects(record(),/الجارية/);
 await db.exec("update taqadi_filing_jobs set status='failed'"); await record();
 assert.equal((await db.query('select status from taqadi_filing_jobs')).rows[0].status,'failed');
});
it('rolls back evidence and status if dependent synchronization fails',async()=>{
 await db.exec("select set_config('test.fail','on',false)"); await assert.rejects(record(),/sync failed/);
 assert.equal((await db.query('select workflow_stage from legal_cases')).rows[0].workflow_stage,'preparation');
 assert.equal((await db.query('select * from legal_case_activities')).rows.length,0);
});
