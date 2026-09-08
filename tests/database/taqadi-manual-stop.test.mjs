import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const db=new PGlite();
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
before(async()=>{
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${id(9)}'::uuid$$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT current_setting('test.role',true)$$;
    CREATE FUNCTION get_user_company_id() RETURNS uuid LANGUAGE sql AS $$SELECT '${id(1)}'::uuid$$;
    CREATE TABLE taqadi_filing_jobs(id uuid PRIMARY KEY,company_id uuid,status text,current_step text,progress int,
      error_code text,error_message text,locked_by text,completed_at timestamptz,updated_at timestamptz,heartbeat_at timestamptz,result jsonb);
    CREATE TABLE taqadi_filing_job_events(company_id uuid,job_id uuid,event_type text,step text,status text,message text,details jsonb);
    CREATE TABLE taqadi_automation_workers(worker_id text,status text,current_job_id uuid,heartbeat_at timestamptz,last_error text);`);
  const original=await read('../../supabase/migrations/20260728120000_taqadi_filing_automation.sql');
  await db.exec(original.match(/CREATE OR REPLACE FUNCTION public\.update_taqadi_filing_job_v1[\s\S]*?\$\$;/)[0]);
  await db.exec(await read('../../supabase/migrations/20260907141007_cooperative_taqadi_manual_stop.sql'));
});
beforeEach(async()=>{
  await db.exec(`TRUNCATE taqadi_filing_jobs,taqadi_filing_job_events;
    SELECT set_config('test.role','service_role',false);
    INSERT INTO taqadi_filing_jobs(id,company_id,status,current_step,progress,locked_by)
    VALUES('${id(2)}','${id(1)}','submitting','final_approval',95,'worker-a');`);
});
after(()=>db.close());
const stop=(company=id(1))=>db.query("SELECT cancel_taqadi_filing_job_v1($1,$2,'stop') AS job",[company,id(2)]);
const check=(ack=false,worker='worker-a')=>db.query('SELECT check_taqadi_filing_control_v1($1,$2,$3) AS control',[id(2),worker,ack]);
it('requests a stop during submission, blocks late progress, then acknowledges as uncertain',async()=>{
  const requested=(await stop()).rows[0].job;
  assert.equal(requested.status,'submitting');assert.equal(requested.error_code,'MANUAL_STOP_REQUESTED');
  await assert.rejects(db.query("SELECT update_taqadi_filing_job_v1($1,'worker-a','reviewing','late',90)",[id(2)]),/lock was lost/);
  assert.equal((await check()).rows[0].control.stopRequested,true);
  await check(true);
  const job=(await db.query('SELECT * FROM taqadi_filing_jobs')).rows[0];
  assert.equal(job.status,'needs_human');assert.equal(job.error_code,'SUBMISSION_UNCERTAIN');
  await assert.rejects(stop(),/لا يمكن/);
});
it('stops active draft work without cancelling the portal draft or allowing late writes',async()=>{
  await db.exec("UPDATE taqadi_filing_jobs SET status='uploading_documents'");
  await stop();await stop();await check(true);
  const job=(await db.query('SELECT * FROM taqadi_filing_jobs')).rows[0];
  assert.equal(job.error_code,'MANUALLY_STOPPED');assert.equal(job.progress,95);
  assert.equal((await db.query("SELECT * FROM taqadi_filing_job_events WHERE event_type='stop_requested'")).rows.length,1);
});
it('immediately cancels an unclaimed queue entry',async()=>{
  await db.exec("UPDATE taqadi_filing_jobs SET status='queued',locked_by=NULL");
  assert.equal((await stop()).rows[0].job.status,'cancelled');
});
it('never cancels a known receipt or a submission requiring verification',async()=>{
  for(const patch of ["status='filed'","current_step='receipt_sync_pending'","error_code='SUBMISSION_UNCERTAIN_AFTER_RESTART'","result='{}'"]){
    await db.exec("UPDATE taqadi_filing_jobs SET status='submitting',current_step='final_approval',error_code=NULL,result=NULL");
    await db.exec('UPDATE taqadi_filing_jobs SET '+patch);await assert.rejects(stop(),/لا يمكن/);
  }
});
it('enforces company isolation and trusts only the owning worker for acknowledgement',async()=>{
  await assert.rejects(stop(id(99)),/Company access denied/);
  await stop();await assert.rejects(check(true,'worker-b'),/lock was lost/);
  await db.exec("SELECT set_config('test.role','authenticated',false)");
  await assert.rejects(check(true),/trusted worker/);
});
it('blocks rollback while a worker still has an outstanding stop request',async()=>{
  await stop();
  await assert.rejects(db.exec(await read('../../supabase/rollbacks/20260907141007_cooperative_taqadi_manual_stop.rollback.sql')),/pending stop requests/);
  await db.exec('ROLLBACK');
  await check(true);
  await db.exec(await read('../../supabase/rollbacks/20260907141007_cooperative_taqadi_manual_stop.rollback.sql'));
});
