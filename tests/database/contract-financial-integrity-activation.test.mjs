import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { installIntegrityFixture,seedIntegrityFixture,snapshot } from './helpers/financial-integrity-fixture.mjs';
import { ids } from './helpers/collected-fee-fixture.mjs';
test('activation keeps cancellation evidence, corrects only derived totals and schedules the independent worker',async()=>{
 const db=new PGlite();const previousCompany=ids.company;
 try {
  ids.company='24bc0b21-4e2d-4413-9842-31719a3669f4';
  await installIntegrityFixture(db);await seedIntegrityFixture(db);
  await db.exec(`ALTER TABLE public.contracts ADD COLUMN contract_number text DEFAULT 'LTO202410';
   ALTER TABLE public.invoices ADD COLUMN notes text;
   CREATE SCHEMA cron;CREATE TABLE cron.job(jobid bigint GENERATED ALWAYS AS IDENTITY,jobname text,schedule text,command text);
   CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$INSERT INTO cron.job(jobname,schedule,command) VALUES($1,$2,$3) RETURNING jobid$$;`);
  await db.query("UPDATE public.contracts SET status='cancelled',total_paid=100,balance_due=1400 WHERE id=$1",[ids.contract]);
  await db.query("UPDATE public.invoices SET status='cancelled',payment_status='cancelled',notes='Cancelled through approved reversal: test' WHERE id=$1",[ids.invoice]);
  // Reproduce the historical detached state left by the old cancellation trigger.
  await db.exec("UPDATE public.contract_payment_schedules SET financial_hold_reason=NULL,cancelled_invoice_id=NULL; DELETE FROM public.contract_financial_reconciliation_controls;");
  const activation=await readFile(new URL('../../supabase/migrations/20260906165254_activate_contract_financial_reconciliation.sql',import.meta.url),'utf8');
  await db.exec(activation);
  const result=await snapshot(db);
  assert.equal(result.stored_paid,0);assert.equal(result.outstanding,0);assert.equal(result.review_amount,1500);
  const schedule=(await db.query('SELECT cancelled_invoice_id,financial_hold_reason FROM public.contract_payment_schedules')).rows[0];
  assert.equal(schedule.cancelled_invoice_id,ids.invoice);assert.equal(schedule.financial_hold_reason,'cancelled_invoice_obligation_review');
  assert.equal((await db.query('SELECT count(*)::int n FROM public.financial_data_repair_snapshots')).rows[0].n,1);
  assert.match((await db.query('SELECT command FROM cron.job')).rows[0].command,/process_contract_financial_reconciliation_v1/);
 } finally {ids.company=previousCompany;await db.close();}
});
