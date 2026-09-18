import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { installIntegrityFixture } from './helpers/financial-integrity-fixture.mjs';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
const migration=()=>read('../../supabase/migrations/20260906172916_resolve_reviewed_contract_schedule_projections.sql');
const rollback=()=>read('../../supabase/rollbacks/20260906172916_resolve_reviewed_contract_schedule_projections.rollback.sql');
const company='24bc0b21-4e2d-4413-9842-31719a3669f4';
async function exec(db,sql){try{return await db.exec(sql);}catch(e){throw new Error(e.message+(e.detail?' / '+e.detail:''));}}
async function setup(){
 const db=new PGlite();
 await installIntegrityFixture(db);
 await db.exec(`ALTER TABLE public.contracts ADD COLUMN contract_number text,ADD COLUMN end_date date;
 ALTER TABLE public.invoices ADD COLUMN notes text;
 ALTER TABLE public.contract_payment_schedules ADD COLUMN notes text;
 ALTER TABLE public.financial_data_repair_snapshots ADD COLUMN rolled_back_at timestamptz;
 INSERT INTO public.companies VALUES('${company}');
 SET session_replication_role=replica;`);
 const data=JSON.parse(await read('./fixtures/reviewed-schedule-projections-20260906.json'));
 async function insert(table,row){
  const cols=Object.keys(row);
  await db.query('INSERT INTO public.'+table+'('+cols.join(',')+') VALUES('+cols.map((_,i)=>'$'+(i+1)).join(',')+')',Object.values(row));
 }
 for(const c of data){
  await insert('contracts',c.contract);
  for(const i of c.invoices){
   await insert('invoices',i);
   // Synthetic receipt facts equal the captured allocation totals, not production receipt records.
   if(i.paid_amount>0)await db.query(`INSERT INTO public.payments(id,company_id,contract_id,invoice_id,amount,payment_status,transaction_type,payment_date)
     VALUES(gen_random_uuid(),$1,$2,$3,$4,'completed','receipt','2026-09-01')`,[company,c.contract.id,i.id,i.paid_amount]);
  }
  for(const s of c.schedules)await insert('contract_payment_schedules',s);
  await db.query('SELECT public.recalculate_contract_financial_state($1)',[c.contract.id]);
 }
 await db.exec(`SET session_replication_role=origin;
 INSERT INTO public.contract_financial_reconciliation_controls(company_id,enabled,auto_repair) VALUES('${company}',true,true);
 INSERT INTO public.contract_financial_reconciliation_queue(company_id,contract_id,status) SELECT company_id,id,'review' FROM public.contracts;`);
 return db;
}
const rows=async(db,table)=>(await db.query('SELECT to_jsonb(x) row FROM public.'+table+' x ORDER BY id')).rows.map(r=>r.row);
test('all 18 projections reconcile while invoice and receipt facts remain unchanged; guards persist through a sweep',async()=>{
 const db=await setup();
 try {
  const invoices=await rows(db,'invoices'),payments=await rows(db,'payments'),contracts=await rows(db,'contracts');
  const scheduleBefore=await rows(db,'contract_payment_schedules');
  await exec(db,await migration());
  assert.deepEqual(await rows(db,'invoices'),invoices);assert.deepEqual(await rows(db,'payments'),payments);assert.deepEqual(await rows(db,'contracts'),contracts);
  assert.equal((await db.query("SELECT count(*)::int n FROM public.contract_financial_reconciliation_queue WHERE status='matched'")).rows[0].n,18);
  assert.equal((await db.query("SELECT count(*)::int n FROM public.financial_data_repair_snapshots")).rows[0].n,39);
  const moved=(await db.query(`SELECT s.due_date::text,i.invoice_month::text,s.paid_amount::float8 paid FROM public.contract_payment_schedules s JOIN public.invoices i ON i.id=s.invoice_id
    JOIN public.contracts c ON c.id=s.contract_id WHERE c.contract_number='C-ALF-0076' AND s.installment_number=30`)).rows[0];
  assert.equal(moved.due_date,'2027-01-01');assert.equal(moved.invoice_month,'2027-01-01');
  const may=(await db.query(`SELECT i.invoice_number,s.paid_amount::float8 paid FROM public.contract_payment_schedules s JOIN public.invoices i ON i.id=s.invoice_id
    JOIN public.contracts c ON c.id=s.contract_id WHERE c.contract_number='C-ALF-0072' AND s.due_date='2026-05-01' AND s.status<>'cancelled'`)).rows[0];
  assert.equal(may.invoice_number,'INV-C-ALF-0072-2026-05');assert.equal(may.paid,0);
  await assert.rejects(db.exec(`UPDATE public.contract_payment_schedules SET status='overdue' WHERE contract_id=(SELECT id FROM public.contracts WHERE contract_number='C-ALF-0048') AND due_date='2026-01-01'`),/مراجعة موثقة/);
  await assert.rejects(db.exec(`INSERT INTO public.contract_payment_schedules(company_id,contract_id,due_date,amount) SELECT company_id,id,'2026-01-01',2100 FROM public.contracts WHERE contract_number='C-ALF-0048'`),/مراجعة موثقة/);
  await assert.rejects(db.exec(`UPDATE public.invoices SET status='sent' WHERE invoice_number='INV-2026-000088'`),/حسم الالتزام/);
  for(const c of contracts)await db.query('SELECT public.reconcile_contract_rental_schedule_invoice_state($1,$2,NULL)',[company,c.id]);
  assert.equal((await db.query("SELECT count(*)::int n FROM public.financial_data_repair_snapshots r JOIN public.contract_payment_schedules s ON s.id=r.entity_id WHERE r.metadata->>'schedule_resolution'='closed' AND s.status<>'cancelled'")).rows[0].n,0);
  // Rollback refuses to overwrite a later edit and is atomic.
  const saved=(await db.query("SELECT entity_id FROM public.financial_data_repair_snapshots WHERE repair_key='retire_traffic_projection'")).rows[0].entity_id;
  await db.query("UPDATE public.contract_payment_schedules SET notes=notes||' later change' WHERE id=$1",[saved]);
  await assert.rejects(exec(db,await rollback()),/later changes/);await db.exec('ROLLBACK');
  await db.query("UPDATE public.contract_payment_schedules s SET notes=r.after_value->>'notes' FROM public.financial_data_repair_snapshots r WHERE s.id=r.entity_id AND s.id=$1",[saved]);
  // The sweep changes paid dates on unrelated rows, which this rollback must preserve.
  const beforeRollback=await rows(db,'contract_payment_schedules');
  await exec(db,await rollback());
  const after=await rows(db,'contract_payment_schedules');
  const repaired=new Set((await db.query('SELECT entity_id FROM public.financial_data_repair_snapshots')).rows.map(r=>r.entity_id));
  for(const s of after){
   const expected=(repaired.has(s.id)?scheduleBefore:beforeRollback).find(x=>x.id===s.id);
   const withoutUpdated=x=>{const {updated_at,...rest}=x;return rest;};
   assert.deepEqual(withoutUpdated(s),withoutUpdated(expected));
  }
  assert.deepEqual(await rows(db,'invoices'),invoices);assert.deepEqual(await rows(db,'payments'),payments);
 }finally{await db.close();}
});
test('traffic-derived rental invoices stay on review until their real monthly rent is established',async()=>{
 const db=await setup();
 try{
  await exec(db,await migration());
  const invoices=await rows(db,'invoices'),payments=await rows(db,'payments');
  const flag=await read('../../supabase/migrations/20260906173630_flag_legacy_traffic_derived_rental_invoices.sql');
  await exec(db,flag);
  const mr=(await db.query("SELECT id FROM public.contracts WHERE contract_number='MR202467'")).rows[0].id;
  await db.query('SELECT public.reconcile_contract_financial_integrity_internal_v1($1,$2,true)',[company,mr]);
  const snapshot=(await db.query('SELECT public.contract_financial_integrity_snapshot_internal_v1($1,$2) s',[company,mr])).rows[0].s;
  assert.equal(snapshot.review_amount,6300);
  assert.equal(snapshot.issues.filter(i=>i.code==='schedule_obligation_review').length,2);
  assert.deepEqual(await rows(db,'payments'),payments);
  // Canonical repair may update derived timestamps/status, but never these invoice face amounts.
  const latest=await rows(db,'invoices');
  assert.deepEqual(latest.map(i=>[i.id,i.total_amount]),invoices.map(i=>[i.id,i.total_amount]));
  const undo=await read('../../supabase/rollbacks/20260906173630_flag_legacy_traffic_derived_rental_invoices.rollback.sql');
  await exec(db,undo);
  assert.equal((await db.query("SELECT count(*)::int n FROM public.contract_payment_schedules WHERE financial_hold_reason='rental_invoice_origin_review'")).rows[0].n,0);
 }finally{await db.close();}
});

test('changed financial evidence aborts the entire batch before partial repairs persist',async()=>{
 const db=await setup();
 try{
  await db.exec("UPDATE public.contracts SET end_date='2027-12-31' WHERE contract_number='C-ALF-0076'");
  const before=await rows(db,'contract_payment_schedules');
  await assert.rejects(exec(db,await migration()),/Contract changed since review/);await db.exec('ROLLBACK');
  assert.deepEqual(await rows(db,'contract_payment_schedules'),before);
  assert.equal((await db.query('SELECT count(*)::int n FROM public.financial_data_repair_snapshots')).rows[0].n,0);
 }finally{await db.close();}
});
