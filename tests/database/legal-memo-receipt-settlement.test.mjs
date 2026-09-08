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
    await db.exec(`ALTER TABLE penalties ADD COLUMN id uuid DEFAULT gen_random_uuid(), ADD COLUMN customer_id uuid,
        ADD COLUMN responsible_customer_id uuid, ADD COLUMN vehicle_id uuid, ADD COLUMN penalty_number text,
        ADD COLUMN penalty_date date, ADD COLUMN responsibility_party text, ADD COLUMN customer_payment_status text, ADD COLUMN violation_type text, ADD COLUMN location text;
      CREATE TABLE traffic_violations(id uuid DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,vehicle_id uuid,
        responsible_customer_id uuid,violation_number text,violation_date date,fine_amount numeric,status text,responsibility_party text,violation_type text,location text);
      ALTER TABLE contract_payment_schedules ADD COLUMN installment_number integer DEFAULT 1;
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('fixture.uid',true),'')::uuid$$;
      CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT jsonb_build_object('role',current_setting('fixture.role',true))$$;
      CREATE OR REPLACE FUNCTION public.get_user_company_id() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('fixture.company',true),'')::uuid$$;
      CREATE TABLE IF NOT EXISTS profiles(user_id uuid,company_id uuid,is_active boolean);`);
    await db.exec(await read('./fixtures/legal-claim-classification-baseline-20260907.sql'));
    const amountMigration=await read('../../supabase/migrations/20260831173107_add_traffic_violations_only_legal_claim_scope.sql');
    const amountStart=amountMigration.indexOf('CREATE OR REPLACE FUNCTION public.calculate_legal_claim_amount_v1(');
    await db.exec(amountMigration.slice(amountStart,amountMigration.indexOf('$;',amountStart)+3));
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
    assert.equal(Number((await rows('SELECT paid_amount FROM invoices WHERE id=$1',[invoice]))[0].paid_amount),0);
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
    await db.exec('SAVEPOINT authorization_check');
    await assert.rejects(claim(),/Not authorized/);
    await db.exec('ROLLBACK TO SAVEPOINT authorization_check');
    assert.equal((await rows("SELECT has_function_privilege('authenticated','legal_memo_calc_private.invoice_paid(uuid,uuid)','EXECUTE') allowed"))[0].allowed,false);
  });
  it('allows the active company user through the facade but denies direct helper access',async()=>{
    await pay(500);
    await rows('INSERT INTO profiles VALUES($1,$2,true)',[customer,company]);
    await rows("SELECT set_config('fixture.role','authenticated',true),set_config('fixture.uid',$1,true),set_config('fixture.company',$2,true)",[customer,company]);
    await db.exec('SET LOCAL ROLE authenticated');
    assert.equal((await claim()).total,1200);
    await db.exec('SAVEPOINT private_access');
    await assert.rejects(rows('SELECT legal_memo_calc_private.invoice_paid($1,$2)',[company,invoice]),/permission denied/);
    await db.exec('ROLLBACK TO SAVEPOINT private_access');
    await db.exec('RESET ROLE');
  });
  for (const active of [false, null]) it('denies an inactive or unverified company profile: '+active,async()=>{
    await rows('INSERT INTO profiles VALUES($1,$2,$3)',[customer,company,active]);
    await rows("SELECT set_config('fixture.role','authenticated',true),set_config('fixture.uid',$1,true),set_config('fixture.company',$2,true)",[customer,company]);
    await db.exec('SET LOCAL ROLE authenticated');
    await assert.rejects(claim(),/Not authorized/);
  });
  it('requires reconciliation for unbilled schedules without blocking traffic-only scope',async()=>{
    await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,paid_amount,status) VALUES($1,$2,'2026-07-01',300,0,'pending')",[company,contract]);
    await db.exec('SAVEPOINT unlinked_review');
    await assert.rejects(claim(),/أقساط غير مرتبطة/);
    await db.exec('ROLLBACK TO SAVEPOINT unlinked_review');
    const scoped=(await rows('SELECT public.calculate_legal_claim_statement_v4($1,$2,$3,$4) value',[company,contract,'2026-09-08','traffic_violations_only']))[0].value;
    assert.deepEqual(scoped.included_schedules,[]);
    assert.deepEqual(scoped.included_invoices,[]);
    assert.equal(scoped.components.rent_due,0);
  });
  const penalty=async()=>{
    const result=(await rows("INSERT INTO penalties(company_id,contract_id,amount,payment_status,status,customer_id,responsible_customer_id,penalty_number,penalty_date,responsibility_party,customer_payment_status) VALUES($1,$2,500,'paid','active',$3,$3,'TV-REF','2026-08-15','customer','unpaid') RETURNING id",[company,contract,customer]))[0].id;
    await rows("INSERT INTO contract_documents VALUES($1,$2,'violations_proof','proof.pdf')",[company,contract]);
    return result;
  };
  it('keeps a customer traffic debt after government payment',async()=>{
    const id=await penalty();
    await rows("UPDATE penalties SET violation_type='سرعة',location='موقع تجريبي' WHERE id=$1",[id]);
    const result=await claim();
    assert.equal(result.traffic_settlement.rows[0].violation_type,'سرعة');
    assert.equal(result.traffic_settlement.rows[0].location,'موقع تجريبي');
    assert.equal(result.components.traffic_violations,500);
    assert.equal(result.total,2200);
    const amount=(await rows('SELECT public.calculate_legal_claim_amount_v1($1,$2,$3) value',[company,contract,'2026-09-08']))[0].value;
    assert.equal(Number(amount),result.total);
  });
  it('subtracts completed customer traffic receipts only once',async()=>{
    const id=await penalty();
    const trafficInvoice=(await rows("INSERT INTO invoices(company_id,contract_id,customer_id,invoice_number,invoice_type,penalty_id,invoice_month,due_date,total_amount,paid_amount,balance_due,payment_status,status) VALUES($1,$2,$3,'TV-TEST','service',$4,'2026-08-01','2026-08-01',500,0,500,'unpaid','sent') RETURNING id",[company,contract,customer,id]))[0].id;
    await rows("INSERT INTO payments(company_id,customer_id,contract_id,invoice_id,amount,payment_status,transaction_type) VALUES($1,$2,$3,$4,200,'completed','receipt')",[company,customer,contract,trafficInvoice]);
    const result=await claim();
    assert.equal(result.components.traffic_violations,300);
    assert.equal(result.components.rent_due,1700);
    assert.equal(result.total,2000);
  });
  it('does not demand company-responsibility traffic penalties',async()=>{
    const id=await penalty();
    await rows("UPDATE penalties SET responsibility_party='company' WHERE id=$1",[id]);
    assert.equal((await claim()).components.traffic_violations,0);
  });
  it('refuses a customer-paid cache with no receipt evidence',async()=>{
    const id=await penalty();
    await rows("UPDATE penalties SET customer_payment_status='partial' WHERE id=$1",[id]);
    await assert.rejects(claim(),/مطابقة/);
  });
  it('counts an identical imported traffic mirror once',async()=>{
    await penalty();
    await rows("INSERT INTO traffic_violations(company_id,contract_id,responsible_customer_id,violation_number,violation_date,fine_amount,status,responsibility_party) VALUES($1,$2,$3,'TV-REF','2026-08-15',500,'active','customer')",[company,contract,customer]);
    assert.equal((await claim()).components.traffic_violations,500);
  });
  it('rejects conflicting traffic mirrors instead of summing both',async()=>{
    await penalty();
    await rows("INSERT INTO traffic_violations(company_id,contract_id,responsible_customer_id,violation_number,violation_date,fine_amount,status,responsibility_party) VALUES($1,$2,$3,'TV-REF','2026-08-15',600,'active','customer')",[company,contract,customer]);
    await assert.rejects(claim(),/مطابقة/);
  });
  it('discloses the retention period and compensation units used in the amount',async()=>{
    await db.exec('UPDATE contracts SET vehicle_returned=false');
    await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_custody,termination_date,termination_date_status,retention_daily_rate,retention_rate_source,retention_rate_source_ref,retention_rate_source_document_id,contractual_compensation_enabled,contractual_compensation_clause_number,contractual_compensation_clause_text,contractual_compensation_method,contractual_compensation_rate,contractual_compensation_document_id) VALUES($1,$2,'with_defendant','2026-09-01','confirmed',20,'document','TEST',$3,true,'1','Test documented clause','monthly',50,$3)",[company,contract,other]);
    const result=await claim();
    assert.equal(result.components.retention,140);
    assert.equal(result.components.contractual_compensation,50);
    assert.deepEqual(result.calculation_details,{ retention_start_date:'2026-09-02',retention_end_date:'2026-09-08',retention_daily_rate:20,contractual_compensation_units:1 });
    assert.equal(result.total,1890);
  });
  it('restores the exact original engine bodies on rollback',async()=>{
    const rollback=await read(`../../supabase/rollbacks/${migration}.rollback.sql`);
    await db.exec(rollback.replace(/^BEGIN;/m,'').replace(/^COMMIT;/m,''));
    const hashes=await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE oid='public.calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[])'::regprocedure");
    assert.equal(hashes[0].hash,'5ca5b12767113a97b0e841198b878357');
    const amountHash=(await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE oid='public.calculate_legal_claim_amount_v1(uuid,uuid,date)'::regprocedure"))[0].hash;
    assert.equal(amountHash,'a47895ed19eebe02f19fec8b0a8d1ecd');
  });
});
