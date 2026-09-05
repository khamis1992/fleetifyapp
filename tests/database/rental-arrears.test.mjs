// Real pending SQL with minimal schema and explicit auth fixture, not production/RLS certification.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {before,after,beforeEach,afterEach,describe,it} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
const company='22222222-2222-4222-8222-222222222222',customer='33333333-3333-4333-8333-333333333333';
const contract='55555555-5555-4555-8555-555555555555',invoice='11111111-1111-4111-8111-111111111111',other='77777777-7777-4777-8777-777777777777';
let db;
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
async function report(tenant=company,role='authenticated',date='2026-09-04') {
  assert.ok(['authenticated','anon','service_role'].includes(role));
  await db.exec('SAVEPOINT report');
  try {await db.exec(`SET LOCAL ROLE ${role}`);return (await rows('SELECT public.get_canonical_rental_arrears_v1($1,$2) result',[tenant,date]))[0].result;}
  catch(e){await db.exec('ROLLBACK TO SAVEPOINT report');throw e;}
  finally{await db.exec('RESET ROLE; RELEASE SAVEPOINT report');}
}
const pay=async(amount,status='completed')=>rows(`INSERT INTO payments(company_id,customer_id,contract_id,invoice_id,amount,payment_status,payment_date,transaction_type)
 VALUES($1,$2,$3,$4,$5,$6,'2026-09-02','receipt') RETURNING id`,[company,customer,contract,invoice,amount,status]);
describe('canonical rental arrears from invoice settlement',()=>{
  before(async()=>{
    db=new PGlite();await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;
      CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('fixture.uid',true),'')::uuid$$;
      CREATE TABLE profiles(user_id uuid,company_id uuid,is_active boolean);
      CREATE TABLE contracts(id uuid PRIMARY KEY,company_id uuid,customer_id uuid,contract_number text,start_date date,end_date date,status text,contract_amount numeric DEFAULT 1500,monthly_amount numeric DEFAULT 1500,vehicle_id uuid);
      CREATE TABLE customers(id uuid PRIMARY KEY,company_id uuid,first_name_ar text,last_name_ar text,first_name text,last_name text,company_name_ar text,company_name text,phone text,email text);
      CREATE TABLE vehicles(id uuid PRIMARY KEY,company_id uuid,plate_number text);
      CREATE TABLE invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,customer_id uuid,invoice_month date,invoice_date date,
        due_date date,invoice_number text,invoice_type text,penalty_id uuid,total_amount numeric,paid_amount numeric,payment_status text,status text);
      CREATE TABLE payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,customer_id uuid,contract_id uuid,invoice_id uuid,amount numeric,
        payment_date date,payment_status text,transaction_type text);
      CREATE TABLE payment_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,payment_id uuid,target_id uuid,allocation_type text,amount numeric,is_active boolean);
      CREATE TABLE contract_payment_schedules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,due_date date,amount numeric,status text,invoice_id uuid);
      CREATE TABLE legal_case_litigation_profile(company_id uuid,contract_id uuid,vehicle_returned_at date,termination_date date,termination_date_status text);
      CREATE TABLE legal_cases(company_id uuid,contract_id uuid,judgment_final_at timestamptz,outcome_date date,workflow_stage text,case_status text);
      GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;`);
    for(const table of ['profiles','contracts','customers','invoices','payments','payment_allocations','contract_payment_schedules','legal_cases','legal_case_litigation_profile']) {
      await db.exec(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
    await db.exec(await read('../../supabase/migrations/20260903222544_canonical_rental_month_summary.sql'));
    await db.exec(await read('../../supabase/migrations/20260904002414_canonical_rental_arrears_reader.sql'));
  });
  after(async()=>db?.close());
  beforeEach(async()=>{
    await db.exec('BEGIN');await rows("SELECT set_config('fixture.uid',$1,true)",[customer]);
    await rows('INSERT INTO profiles VALUES($1,$2,true)',[customer,company]);
    await rows("INSERT INTO contracts(id,company_id,customer_id,contract_number,start_date,end_date,status) VALUES($1,$2,$3,'TEST','2026-01-01','2026-12-31','active')",[contract,company,customer]);
    await rows("INSERT INTO customers(id,company_id,first_name_ar) VALUES($1,$2,'عميل اختبار')",[customer,company]);
    await rows(`INSERT INTO invoices VALUES($1,$2,$3,$4,'2026-08-01','2026-08-01','2026-09-01','INV','service',null,1500,1500,'paid','sent')`,[invoice,company,contract,customer]);
    await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,status,invoice_id) VALUES($1,$2,'2026-08-01',1500,'paid',$3)",[company,contract,invoice]);
  });
  afterEach(async()=>db.exec('ROLLBACK;RESET ROLE'));
  it('two partial receipts leave one unpaid month, not two paid months',async()=>{
    await pay(500);await pay(500);const value=await report();const [r]=value.rows;
    assert.equal(value.settlement_basis,'current_payment_allocations');assert.equal(value.fees_scope,'excluded');
    assert.equal(r.outstanding_amount,500);assert.equal(r.paid_amount,1000);assert.equal(r.unpaid_months,1);
    assert.equal(r.oldest_unpaid_date,'2026-08-01');assert.equal(r.days_overdue,34);assert.deepEqual(r.review_reasons,[]);
  });
  it('cancellation restores outstanding without trusting paid caches or schedule status',async()=>{
    await pay(1500);assert.deepEqual((await report()).rows,[]);
    await db.exec("UPDATE payments SET payment_status='cancelled'");assert.equal((await report()).rows[0].outstanding_amount,1500);
    assert.equal(Number((await rows('SELECT paid_amount FROM invoices'))[0].paid_amount),1500);
  });
  it('does not allocate fee money to rent',async()=>{
    const [{id}]=await pay(620);await rows(`INSERT INTO payment_allocations(company_id,payment_id,target_id,allocation_type,amount,is_active)
      VALUES($1,$2,$3,'invoice',500,true),($1,$2,$4,'late_fee',120,true)`,[company,id,invoice,other]);
    assert.equal((await report()).rows[0].outstanding_amount,1000);
  });
  it('does not call a prepaid invoice overdue on its due day or before it',async()=>{
    assert.deepEqual((await report(company,'authenticated','2026-08-01')).rows,[]);
    assert.deepEqual((await report(company,'authenticated','2026-07-31')).rows,[]);
    assert.equal((await report(company,'authenticated','2026-08-02')).rows[0].days_overdue,1);
  });
  it('includes real overdue debt on expired contracts',async()=>{
    await db.exec("UPDATE contracts SET status='expired',end_date='2026-08-31'");
    assert.equal((await report()).rows[0].outstanding_amount,1500);
  });
  for(const change of ["vehicle_returned_at='2026-07-15'","termination_date='2026-07-15',termination_date_status='confirmed'"]) {
    it(`quarantines rent after documented cutoff ${change}`,async()=>{
      await rows('INSERT INTO legal_case_litigation_profile(company_id,contract_id) VALUES($1,$2)',[company,contract]);
      await db.exec(`UPDATE legal_case_litigation_profile SET ${change}`);
      const [r]=(await report()).rows;assert.equal(r.cutoff_date,'2026-07-15');
      assert.equal(r.outstanding_amount,null);assert.equal(r.days_overdue,null);assert.ok(r.review_reasons.includes('outside_rent_cutoff'));
    });
  }
  it('does not use an unconfirmed termination date as a cutoff',async()=>{
    await rows("INSERT INTO legal_case_litigation_profile VALUES($1,$2,null,'2026-07-15','pending')",[company,contract]);
    assert.equal((await report()).rows[0].outstanding_amount,1500);
  });
  it('uses Qatar date for a judgment timestamp and ignores cancelled cases',async()=>{
    await rows("INSERT INTO legal_cases VALUES($1,$2,'2026-07-31T22:00:00Z',null,'judgment_issued','active')",[company,contract]);
    assert.equal((await report()).rows[0].cutoff_date,'2026-08-01');
    await db.exec("UPDATE legal_cases SET judgment_final_at='2026-07-01T00:00Z',case_status='cancelled'");
    assert.equal((await report()).rows[0].outstanding_amount,1500);
  });
  for(const [label,sql] of [
    ['missing invoice','DELETE FROM invoices'],['unknown invoice month','UPDATE invoices SET invoice_month=null,invoice_date=null'],
    ['purchase invoice',"UPDATE invoices SET invoice_type='purchase'"],['out of contract',"UPDATE contracts SET end_date='2026-07-31'"],
    ['wrong customer',`UPDATE invoices SET customer_id='${other}'`],['invalid allocation',`INSERT INTO payment_allocations(company_id,payment_id,target_id,allocation_type,amount,is_active) VALUES('${company}','${other}','${invoice}','invoice',100,true)`],
  ]) it(`quarantines ${label} instead of claiming zero or verified debt`,async()=>{
    await db.exec(sql);const [r]=(await report()).rows;assert.ok(r.review_reasons.length>0);
    assert.equal(r.outstanding_amount,null);assert.equal(r.oldest_unpaid_date,null);assert.equal(r.unpaid_months,null);
  });
  it('does not count traffic invoices or relink a schedule to them',async()=>{
    await db.exec("UPDATE invoices SET invoice_number=' tv-1 '");const [r]=(await report()).rows;
    assert.equal(r.invoice_count,0);assert.ok(r.review_reasons.includes('missing_or_mismatched_invoice'));
  });
  it('keeps contracts with no billing evidence visible for review',async()=>{
    await db.exec('DELETE FROM invoices;DELETE FROM contract_payment_schedules');
    const [r]=(await report()).rows;assert.ok(r.review_reasons.includes('missing_billing_evidence'));assert.equal(r.outstanding_amount,null);
  });
  it('does not flag a future contract with a valid future schedule as bad debt',async()=>{
    await db.exec("UPDATE contracts SET start_date='2026-10-01';UPDATE invoices SET invoice_month='2026-10-01',invoice_date='2026-10-01';UPDATE contract_payment_schedules SET due_date='2026-10-01'");
    assert.deepEqual((await report()).rows,[]);
  });
  it('rejects anonymous, service, cross-company and inactive membership',async()=>{
    for(const role of ['anon','service_role']) await assert.rejects(report(company,role),e=>e.code==='42501');
    await assert.rejects(report(other),e=>e.code==='42501');
    await db.exec('UPDATE profiles SET is_active=false');await assert.rejects(report(),e=>e.code==='42501');
  });
  it('is read-only and can be removed without financial-row changes',async()=>{
    const before=await rows('SELECT to_jsonb(i) data FROM invoices i');await report();
    await db.exec(await read('../../supabase/rollbacks/20260904002414_canonical_rental_arrears_reader.rollback.sql'));
    assert.deepEqual(await rows('SELECT to_jsonb(i) data FROM invoices i'),before);
  });
  it('does not announce a settled contract when its established schedule is incomplete',async()=>{
    await pay(1500);await db.exec('UPDATE contracts SET contract_amount=18000');
    const [r]=(await report()).rows;assert.ok(r.review_reasons.includes('incomplete_schedule'));assert.equal(r.outstanding_amount,null);
  });
  it('detects an internal schedule gap even when the amounts add up',async()=>{
    await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,status) VALUES($1,$2,'2026-06-01',1500,'pending')",[company,contract]);
    await db.exec('UPDATE contracts SET contract_amount=3000');
    assert.ok((await report()).rows[0].review_reasons.includes('incomplete_schedule'));
  });
  it('does not overcount duplicate same-month invoice obligations',async()=>{
    await rows("INSERT INTO invoices(company_id,contract_id,customer_id,invoice_month,invoice_type,total_amount,status) VALUES($1,$2,$3,'2026-08-01','sales',1500,'sent')",[company,contract,customer]);
    const [r]=(await report()).rows;assert.ok(r.review_reasons.includes('duplicate_invoice_month'));assert.equal(r.outstanding_amount,null);
  });
  it('returns more than 1000 unresolved contracts without truncation',async()=>{
    await rows("INSERT INTO contracts(id,company_id,customer_id,contract_number,start_date,end_date,status) SELECT gen_random_uuid(),$1,$2,'TEST-'||n,'2026-01-01','2026-12-31','active' FROM generate_series(1,1001) n",[company,customer]);
    assert.equal((await report()).rows.length,1002);
  });
  it('ignores another company legal cutoff and invoice rows',async()=>{
    await rows("INSERT INTO legal_case_litigation_profile VALUES($1,$2,'2026-07-01',null,null)",[other,contract]);
    await rows("INSERT INTO invoices(company_id,contract_id,invoice_month,invoice_type,total_amount,status) VALUES($1,$2,'2026-08-01','sales',999999,'sent')",[other,contract]);
    assert.equal((await report()).rows[0].outstanding_amount,1500);
  });
  it('rejects null and infinite due-date scopes',async()=>{
    for(const date of [null,'infinity','-infinity']) await assert.rejects(report(company,'authenticated',date),e=>e.code==='22023');
  });
});
