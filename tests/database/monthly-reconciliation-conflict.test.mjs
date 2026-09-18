import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
test('monthly job upsert resolves the output-column collision through the verified constraint',async()=>{
 const db=new PGlite();
 try {
  const original=await readFile(new URL('./fixtures/monthly-reconciliation-live-20260906.sql',import.meta.url),'utf8');
  const migration=await readFile(new URL('../../supabase/migrations/20260906165304_fix_monthly_reconciliation_job_conflict.sql',import.meta.url),'utf8');
  assert.ok(migration.replace(/\s+/g,'').includes(original.trim().replace('ON CONFLICT (run_id, company_id, domain) DO UPDATE','ON CONFLICT ON CONSTRAINT system_agent_jobs_run_id_company_id_domain_key DO UPDATE').replace(/\s+/g,'')));
  await db.exec(`CREATE TABLE public.system_agent_jobs(run_id uuid,company_id uuid,domain text,updated_at timestamptz,
   CONSTRAINT system_agent_jobs_run_id_company_id_domain_key UNIQUE(run_id,company_id,domain));
   CREATE FUNCTION fixture_upsert() RETURNS TABLE(company_id uuid) LANGUAGE plpgsql AS $$BEGIN
    INSERT INTO public.system_agent_jobs(run_id,company_id,domain) VALUES('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','contracts')
    ON CONFLICT (run_id,company_id,domain) DO UPDATE SET updated_at=now();RETURN;END;$$;`);
  await assert.rejects(()=>db.query('SELECT fixture_upsert()'),/ambiguous/);
  await db.exec(`CREATE OR REPLACE FUNCTION fixture_upsert() RETURNS TABLE(company_id uuid) LANGUAGE plpgsql AS $$BEGIN
    INSERT INTO public.system_agent_jobs(run_id,company_id,domain) VALUES('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','contracts')
    ON CONFLICT ON CONSTRAINT system_agent_jobs_run_id_company_id_domain_key DO UPDATE SET updated_at=now();RETURN;END;$$;`);
  await db.query('SELECT fixture_upsert()');await db.query('SELECT fixture_upsert()');
  assert.equal((await db.query('SELECT count(*)::int n FROM public.system_agent_jobs')).rows[0].n,1);
 } finally {await db.close();}
});
