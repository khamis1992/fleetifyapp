import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const company='22222222-2222-4222-8222-222222222222', customer='33333333-3333-4333-8333-333333333333';
const contract='55555555-5555-4555-8555-555555555555', invoice='11111111-1111-4111-8111-111111111111';
const other='77777777-7777-4777-8777-777777777777';
const migration='20260908210347_legal_memo_receipt_settlement';
const read=async path=>(await readFile(new URL(path,import.meta.url),'utf8')).replace(/\r\n/g,'\n');
let db;
const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
const claim=async(excluded=[]) => (await rows('SELECT public.calculate_legal_claim_statement_v4($1,$2,$3,$4,$5::uuid[]) value',
  [company,contract,'2026-09-08','full_outstanding',excluded]))[0].value;
const pay=async(amount,status='completed')=>(await rows(`INSERT INTO payments(company_id,customer_id,contract_id,invoice_id,amount,payment_date,payment_status,transaction_type)
  VALUES($1,$2,$3,$4,$5,'2026-09-01',$6,'receipt') RETURNING id`,[company,customer,contract,invoice,amount,status]))[0].id;
describe('memo receipt settlement against reviewed deployed claim bodies',()=>{
  before(async()=>{
    db=new PGlite();
    const fixture=await read('./legal-claim-source-audit.test.mjs');
    const start=fixture.indexOf('CREATE ROLE authenticated;');
    await db.exec(fixture.slice(start,fixture.indexOf('`);',start)));
    await db.exec(`CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('fixture.uid',true),'')::uuid$$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT jsonb_build_object('role',current_setting('fixture.role',true))$$;
      CREATE OR REPLACE FUNCTION public.get_user_company_id() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('fixture.company',true),'')::uuid$$;
      CREATE TABLE profiles(user_id uuid,company_id uuid,is_active boolean);`);
    await db.exec(await read('./fixtures/legal-claim-classification-baseline-20260907.sql'));
    await db.exec(await read('../../supabase/migrations/20260906223503_align_legal_claim_service_rent_classification.sql'));
    await db.exec(await read(`../../supabase/migrations/${migration}.sql`));
  });
  after(async()=>db?.close());
  beforeEach(async()=>{
    await db.exec('BEGIN');
    await rows("SELECT set_config('fixture.role','service_role',true)");
    await rows("INSERT INTO contracts VALUES($1,$2,$3,'TEST','2024-01-01','2028-12-31','under_legal_procedure',1700,true,0)",[contract,company,customer]);
    await rows(`INSERT INTO invoices VALUES($1,$2,$3,$4,'2026-08-01','2026-08-01','2026-08-01','RENT','service',null,1700,0,1700,'unpaid','sent')`,[invoice,company,contract,customer]);
    await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,paid_amount,status,invoice_id) VALUES($1,$2,'2026-08-01',1700,0,'pending',$3)",[company,contract,invoice]);
  });
  afterEach(async()=>db.exec('ROLLBACK'));
  it('uses completed direct receipts despite stale invoice caches and discloses gross/paid/net',async()=>{
    await pay(500);
    const result=await claim();
    assert.equal(result.total,1200);
    assert.equal(result.included_invoices[0].total_amount,1700);
    assert.equal(result.included_invoices[0].paid_amount,500);
    assert.equal(result.included_invoices[0].amount,1200);
    assert.equal(result.settlement_source,'completed_receipt_allocations_v1');
    assert.equal((await rows('SELECT paid_amount FROM invoices WHERE id=$1',[invoice]))[0].paid_amount,0);
  });
  it('uses an active allocation once and ignores pending and voided allocations',async()=>{
    const payment=await pay(700);
    await rows("INSERT INTO payment_allocations(company_id,payment_id,target_id,allocation_type,amount,is_active) VALUES($1,$2,$3,'invoice',400,true),($1,$2,$3,'invoice',300,false)",[company,payment,invoice]);
    await pay(500,'pending');
    assert.equal((await claim()).total,1300);
  });
  it('does not trust a fully paid cache without completed receipts',async()=>{
    await db.exec("UPDATE invoices SET paid_amount=1700,balance_due=0,payment_status='paid'");
    assert.equal((await claim()).total,1700);
  });
  it('preserves explicit invoice exclusions and service-rent classification',async()=>{
    await pay(500);
    const result=await claim([invoice]);
    assert.equal(result.total,0);
    assert.equal(result.excluded_amounts.manual_invoice_exclusions,1200);
    assert.equal(result.excluded_invoices[0].paid_amount,500);
  });
  it('rejects overallocated and wrong-customer receipts',async()=>{
    await pay(1800);
    await assert.rejects(claim(),/reconciliation/);
  });
  it('rejects a receipt belonging to a different customer',async()=>{
    const payment=await pay(500);
    await rows('UPDATE payments SET customer_id=$1 WHERE id=$2',[other,payment]);
    await assert.rejects(claim(),/reconciliation/);
  });
  it('denies other tenants and leaves raw settlement helpers private',async()=>{
    await rows("SELECT set_config('fixture.role','authenticated',true),set_config('fixture.uid',$1,true),set_config('fixture.company',$2,true)",[customer,other]);
    await assert.rejects(claim(),/Not authorized/);
    assert.equal((await rows("SELECT has_function_privilege('authenticated','legal_memo_calc_private.invoice_paid(uuid,uuid)','EXECUTE') allowed"))[0].allowed,false);
  });
  it('restores the exact original engine bodies on rollback',async()=>{
    const rollback=await read(`../../supabase/rollbacks/${migration}.rollback.sql`);
    await db.exec(rollback.replace(/^BEGIN;/m,'').replace(/^COMMIT;/m,''));
    const hashes=await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE oid='public.calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[])'::regprocedure");
    assert.equal(hashes[0].hash,'5ca5b12767113a97b0e841198b878357');
  });
});
