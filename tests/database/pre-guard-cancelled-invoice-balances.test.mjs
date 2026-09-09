import assert from 'node:assert/strict';
import { beforeEach, afterEach, it } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const name='20260909012530_repair_pre_guard_cancelled_invoice_balances';
const company='24bc0b21-4e2d-4413-9842-31719a3669f4';
const read=async path=>(await readFile(new URL(path,import.meta.url),'utf8')).replace(/\r\n/g,'\n');
let db, migration;
beforeEach(async()=>{
  db=new PGlite();
  await db.exec(`CREATE TABLE invoices(id uuid PRIMARY KEY,company_id uuid,status text,payment_status text,
    total_amount numeric,paid_amount numeric,balance_due numeric,updated_at timestamptz,notes text,journal_entry_id uuid);
    CREATE TABLE journal_entries(id uuid PRIMARY KEY,company_id uuid,reference_type text,reference_id uuid,status text,reversal_entry_id uuid);
    CREATE TABLE payment_allocations(company_id uuid,target_id uuid,allocation_type text,is_active boolean);
    CREATE TABLE audit_logs(company_id uuid,action text,resource_type text,resource_id uuid,old_values jsonb,new_values jsonb,
      changes_summary text,status text,severity text,user_name text,metadata jsonb);
    INSERT INTO invoices SELECT md5(n::text)::uuid,'${company}','cancelled','unpaid',
      CASE WHEN n=23 THEN 2760 ELSE 1500 END,0,CASE WHEN n=23 THEN 2760 ELSE 1500 END,
      '2026-08-30T22:53:56.014306Z','Cancelled through approved reversal: fixture',md5(('j'||n)::text)::uuid
      FROM generate_series(1,23)n;
    INSERT INTO journal_entries SELECT journal_entry_id,company_id,'invoice',id,
      CASE WHEN total_amount=2760 THEN 'cancelled' ELSE 'reversed' END,NULL FROM invoices;
    INSERT INTO invoices VALUES(md5('other')::uuid,'77777777-7777-4777-8777-777777777777','cancelled','unpaid',10,0,10,
      '2026-08-30T22:53:56.014306Z','Cancelled through approved reversal: fixture',NULL);`);
  const guard=await read('../../supabase/migrations/20260901194000_preserve_zero_balance_on_cancelled_invoices.sql');
  await db.exec(guard.slice(guard.indexOf('CREATE OR REPLACE FUNCTION'),guard.indexOf('DO $repair$')));
  await db.exec('CREATE TRIGGER trg_ensure_invoice_balance_due BEFORE INSERT OR UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION ensure_invoice_balance_due()');
  migration=await read('../../supabase/migrations/'+name+'.sql');
});
afterEach(async()=>db?.close());
const scalar=async sql=>(await db.query(sql)).rows[0].value;
it('repairs only the audited cache, preserves all other fields and records before/after rows',async()=>{
  await db.exec(migration);
  assert.equal(await scalar(`SELECT count(*)::int value FROM invoices WHERE company_id='${company}' AND balance_due=0`),23);
  assert.equal(await scalar('SELECT count(*)::int value FROM audit_logs'),23);
  assert.equal(await scalar("SELECT bool_and((old_values-'balance_due'-'updated_at')=(new_values-'balance_due'-'updated_at')) value FROM audit_logs"),true);
  assert.equal(Number(await scalar("SELECT balance_due value FROM invoices WHERE id=md5('other')::uuid")),10);
  assert.equal(await scalar("SELECT count(*)::int value FROM journal_entries WHERE status IN ('reversed','cancelled')"),23);
});
it('the existing guard keeps later cancelled writes at zero',async()=>{
  await db.exec(migration);
  await db.exec(`UPDATE invoices SET balance_due=999 WHERE company_id='${company}'`);
  assert.equal(Number(await scalar(`SELECT sum(balance_due) value FROM invoices WHERE company_id='${company}'`)),0);
});
for(const [label,change,reason] of [
  ['new active allocation',`INSERT INTO payment_allocations VALUES('${company}',md5('1')::uuid,'invoice',true)`,/active allocations/],
  ['unreversed posted journal',"UPDATE journal_entries SET status='posted' WHERE reference_id=md5('1')::uuid",/provenance changed/],
  ['missing invoice',"DELETE FROM invoices WHERE id=md5('1')::uuid",/scope changed/],
  ['disabled guard','ALTER TABLE invoices DISABLE TRIGGER trg_ensure_invoice_balance_due',/not enabled/],
])it('refuses repair after '+label,async()=>{
  await db.exec(change);
  await assert.rejects(db.exec(migration),reason);
  await db.exec('ROLLBACK');
  assert.equal(await scalar('SELECT count(*)::int value FROM audit_logs'),0);
});
it('explicit rollback restores cached balances and re-enables the guard',async()=>{
  await db.exec(migration);
  await db.exec(await read('../../supabase/rollbacks/'+name+'.rollback.sql'));
  assert.equal(Number(await scalar(`SELECT sum(balance_due) value FROM invoices WHERE company_id='${company}'`)),35760);
  assert.equal(await scalar("SELECT tgenabled value FROM pg_trigger WHERE tgname='trg_ensure_invoice_balance_due'"),'O');
});
it('rollback refuses to overwrite an invoice changed after repair',async()=>{
  await db.exec(migration);
  await db.exec("UPDATE invoices SET notes='later change' WHERE id=md5('1')::uuid");
  await assert.rejects(db.exec(await read('../../supabase/rollbacks/'+name+'.rollback.sql')),/changed after repair/);
  await db.exec('ROLLBACK');
  assert.equal(await scalar("SELECT tgenabled value FROM pg_trigger WHERE tgname='trg_ensure_invoice_balance_due'"),'O');
});
