import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {installIntegrityFixture} from './helpers/financial-integrity-fixture.mjs';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
test('explicit no-current-claim decision closes only cancelled obligations and preserves receipts',async()=>{
 const db=new PGlite();
 try{
  await installIntegrityFixture(db);
  await db.exec(`ALTER TABLE public.contracts ADD COLUMN contract_number text,ADD COLUMN end_date date;
   ALTER TABLE public.invoices ADD COLUMN notes text;ALTER TABLE public.contract_payment_schedules ADD COLUMN notes text;
   ALTER TABLE public.financial_data_repair_snapshots ADD COLUMN rolled_back_at timestamptz;
   CREATE TABLE public.delinquent_customers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,is_active boolean,
     overdue_amount numeric,late_penalty numeric,violations_amount numeric,total_debt numeric,months_unpaid integer,days_overdue integer,last_updated_at timestamptz);`);
  const guard=(await read('../../supabase/migrations/20260906172916_resolve_reviewed_contract_schedule_projections.sql')).split('CREATE TEMP TABLE reviewed_schedule_plan')[0]+'COMMIT;';
  await db.exec(guard);
  const f=JSON.parse(await read('./fixtures/lto-no-current-claim-20260906.json'));
  const insert=async(table,row)=>{const cols=Object.keys(row);await db.query('INSERT INTO '+table+'('+cols.join(',')+') VALUES('+cols.map((_,i)=>'$'+(i+1)).join(',')+')',Object.values(row));};
  await db.query('INSERT INTO public.companies VALUES($1)',[f.contract.company_id]);
  await db.exec('SET session_replication_role=replica');
  await insert('contracts',f.contract);
  for(const i of f.invoices){await insert('invoices',i);if(i.paid_amount>0)await db.query(`INSERT INTO payments(company_id,contract_id,invoice_id,amount,payment_status,transaction_type,payment_date)
   VALUES($1,$2,$3,$4,'completed','receipt','2026-09-01')`,[i.company_id,i.contract_id,i.id,i.paid_amount]);}
  for(const s of f.schedules)await insert('contract_payment_schedules',s);
  await db.query('SELECT public.recalculate_contract_financial_state($1)',[f.contract.id]);
  await db.exec('SET session_replication_role=origin');
  await db.query("INSERT INTO contract_financial_reconciliation_queue(company_id,contract_id,status) VALUES($1,$2,'review')",[f.contract.company_id,f.contract.id]);
  await db.query(`INSERT INTO delinquent_customers(company_id,contract_id,is_active,overdue_amount,total_debt,months_unpaid,days_overdue) VALUES($1,$2,false,5700,5700,11,1031)`,[f.contract.company_id,f.contract.id]);
  const before=(await db.query('SELECT to_jsonb(i) row FROM invoices i ORDER BY id')).rows;
  await db.exec(await read('../../supabase/migrations/20260906175942_resolve_lto202410_no_current_claim.sql'));
  const state=(await db.query('SELECT public.contract_financial_integrity_snapshot_internal_v1($1,$2) s',[f.contract.company_id,f.contract.id])).rows[0].s;
  assert.equal(state.canonical_paid,9000);assert.equal(state.original_remaining,45000);
  assert.equal(state.outstanding,0);assert.equal(state.review_amount,0);assert.deepEqual(state.issues,[]);
  assert.equal((await db.query("SELECT count(*)::int n FROM contract_payment_schedules WHERE financial_hold_reason='resolved_no_current_claim' AND status='cancelled'")).rows[0].n,30);
  assert.deepEqual((await db.query('SELECT to_jsonb(i) row FROM invoices i ORDER BY id')).rows,before);
  assert.equal((await db.query('SELECT total_debt::float8 amount FROM delinquent_customers')).rows[0].amount,0);
  await assert.rejects(db.exec("UPDATE contract_payment_schedules SET status='overdue' WHERE financial_hold_reason='resolved_no_current_claim'"),/مراجعة موثقة/);
  await db.exec(await read('../../supabase/rollbacks/20260906175942_resolve_lto202410_no_current_claim.rollback.sql'));
  assert.equal((await db.query("SELECT count(*)::int n FROM contract_payment_schedules WHERE financial_hold_reason='cancelled_invoice_obligation_review' AND status<>'cancelled'")).rows[0].n,30);
 }catch(e){throw new Error(e.message+(e.detail?' / '+e.detail:''));}finally{await db.close();}
});
