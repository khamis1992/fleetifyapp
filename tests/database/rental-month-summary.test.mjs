// Isolated PostgreSQL tests for the actual read-only RPC. Not a full production schema.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const company='22222222-2222-4222-8222-222222222222';
const actor='33333333-3333-4333-8333-333333333333';
const contract='55555555-5555-4555-8555-555555555555';
const invoice='11111111-1111-4111-8111-111111111111';
const other='77777777-7777-4777-8777-777777777777';
const migration='20260903222544_canonical_rental_month_summary';
let db;
const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const report=async(month='2026-08-01',tenant=company,role='authenticated')=>{
  assert.ok(['authenticated','anon','service_role'].includes(role));
  await db.exec('SAVEPOINT invocation');
  try {
    await db.exec(`SET LOCAL ROLE ${role}`);
    return (await rows('SELECT public.get_canonical_rental_month_summary_v1($1,$2) result',[tenant,month]))[0].result;
  } catch(error) {
    await db.exec('ROLLBACK TO SAVEPOINT invocation');
    throw error;
  } finally { await db.exec('RESET ROLE; RELEASE SAVEPOINT invocation'); }
};
const payment=async(amount=500,status='completed')=>(await rows(`INSERT INTO payments
  (company_id,customer_id,contract_id,invoice_id,amount,payment_status,transaction_type,payment_date)
  VALUES($1,$2,$3,$4,$5,$6,'receipt','2026-09-02') RETURNING id`,[company,actor,contract,invoice,amount,status]))[0].id;
const allocation=async(id,amount,type='invoice',target=invoice)=>rows(`INSERT INTO payment_allocations
  (company_id,payment_id,target_id,allocation_type,amount,is_active) VALUES($1,$2,$3,$4,$5,true)`,[company,id,target,type,amount]);

describe('canonical rental month summary — actual SQL',()=>{
  before(async()=>{
    db=new PGlite();
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('fixture.uid',true),'')::uuid $$;
      CREATE TABLE profiles(user_id uuid,company_id uuid,is_active boolean);
      CREATE TABLE customers(id uuid PRIMARY KEY,company_id uuid,first_name_ar text,last_name_ar text,
        first_name text,last_name text,company_name_ar text,company_name text);
      CREATE TABLE contracts(id uuid PRIMARY KEY,company_id uuid,customer_id uuid,contract_number text,
        start_date date,end_date date,status text);
      CREATE TABLE invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,customer_id uuid,
        invoice_month date,invoice_date date,due_date date,invoice_number text,invoice_type text,penalty_id uuid,
        total_amount numeric,paid_amount numeric,payment_status text,status text);
      CREATE TABLE payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,customer_id uuid,
        contract_id uuid,invoice_id uuid,amount numeric,payment_date date,payment_status text,transaction_type text);
      CREATE TABLE payment_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,payment_id uuid,
        target_id uuid,allocation_type text,amount numeric,is_active boolean);
      CREATE TABLE contract_payment_schedules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,
        contract_id uuid,due_date date,amount numeric,status text,invoice_id uuid);
      GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;`);
    for(const table of ['profiles','customers','contracts','invoices','payments','payment_allocations','contract_payment_schedules']) {
      await db.exec(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
    await db.exec(await read(`../../supabase/migrations/${migration}.sql`));
  });
  after(async()=>db?.close());
  beforeEach(async()=>{
    await db.exec('BEGIN');
    await rows("SELECT set_config('fixture.uid',$1,true)",[actor]);
    await rows('INSERT INTO profiles VALUES($1,$2,true)',[actor,company]);
    await rows("INSERT INTO customers(id,company_id,first_name_ar,last_name_ar) VALUES($1,$2,'عميل','اختبار')",[actor,company]);
    await rows("INSERT INTO contracts VALUES($1,$2,$3,'TEST-1','2026-01-01','2026-12-31','active')",[contract,company,actor]);
    await rows(`INSERT INTO invoices VALUES($1,$2,$3,$4,'2026-08-01','2026-08-15','2026-09-01','TEST-INV','sales',null,1500,9999,'paid','sent')`,[invoice,company,contract,actor]);
  });
  afterEach(async()=>db.exec('ROLLBACK; RESET ROLE'));

  it('uses service month and real partial payments, not cache or payment month',async()=>{
    await payment(); await payment();
    const result=await report();
    assert.equal(result.company_id,company); assert.equal(result.month,'2026-08');
    assert.deepEqual(result.rows[0],{contract_id:contract,customer_id:actor,contract_number:'TEST-1',customer_name:'عميل اختبار',
      invoice_count:1,invoiced_amount:1500,paid_amount:1000,outstanding_amount:500,receipt_count:2,
      latest_payment_date:'2026-09-02',review_reasons:[]});
  });
  it('excludes fee allocation and suppresses gross fallback even with no invoice allocation',async()=>{
    const id=await payment(620); await allocation(id,500); await allocation(id,120,'late_fee',other);
    assert.equal((await report()).rows[0].paid_amount,500);
    await rows("DELETE FROM payment_allocations WHERE allocation_type='invoice'");
    assert.equal((await report()).rows[0].paid_amount,0);
  });
  it('immediately reflects cancellation, without changing the stale invoice cache',async()=>{
    const id=await payment(1500); assert.equal((await report()).rows[0].outstanding_amount,0);
    await rows("UPDATE payments SET payment_status='cancelled' WHERE id=$1",[id]);
    assert.equal((await report()).rows[0].outstanding_amount,1500);
    assert.equal(Number((await rows('SELECT paid_amount FROM invoices'))[0].paid_amount),9999);
  });
  it('settles rent and traffic separately from one mixed receipt without duplicate gross fallback',async()=>{
    await rows(`INSERT INTO invoices(id,company_id,contract_id,customer_id,invoice_month,invoice_date,due_date,invoice_number,invoice_type,penalty_id,total_amount,status,payment_status)
      VALUES($1,$2,$3,$4,'2026-08-01','2026-08-01','2026-08-01','TV-TEST','service',$1,500,'sent','unpaid')`,[other,company,contract,actor]);
    const id=await payment(820);await allocation(id,500);await allocation(id,200,'invoice',other);await allocation(id,120,'late_fee',other);
    const all=await rows('SELECT * FROM public.canonical_contract_invoice_settlement_v1($1) ORDER BY invoice_id',[company]);
    assert.equal(all.length,2);
    assert.equal(Number(all[0].paid_amount),500);assert.equal(Number(all[0].outstanding_amount),1000);assert.equal(all[0].is_traffic,false);
    assert.equal(Number(all[1].paid_amount),200);assert.equal(Number(all[1].outstanding_amount),300);assert.equal(all[1].is_traffic,true);
    assert.equal(all[1].penalty_id,other);assert.equal(all[1].invoice_type,'service');
    assert.equal((await report()).rows[0].outstanding_amount,1000);
  });
  it('retains TV-only invoices in common settlement but excludes them from rental settlement',async()=>{
    await db.exec("UPDATE invoices SET invoice_number=' tv-only '");const id=await payment(500);await allocation(id,500);
    const [value]=await rows('SELECT * FROM public.canonical_contract_invoice_settlement_v1($1)',[company]);
    assert.equal(value.is_traffic,true);assert.equal(value.penalty_id,null);assert.equal(Number(value.outstanding_amount),1000);
    assert.deepEqual(await rows('SELECT * FROM public.canonical_rental_invoice_settlement_v1($1)',[company]),[]);
  });
  it('restores partially paid traffic debt on cancellation without trusting invoice caches',async()=>{
    await rows('UPDATE invoices SET penalty_id=$1',[other]);const id=await payment(500);await allocation(id,500);
    const common=async()=> (await rows('SELECT * FROM public.canonical_contract_invoice_settlement_v1($1)',[company]))[0];
    assert.equal(Number((await common()).outstanding_amount),1000);
    await rows("UPDATE payments SET payment_status='cancelled' WHERE id=$1",[id]);
    assert.equal(Number((await common()).outstanding_amount),1500);
  });
  it('rejects an unallocated direct receipt assigned to a different contract',async()=>{
    const id=await payment();await rows('UPDATE payments SET contract_id=$1 WHERE id=$2',[other,id]);
    const [value]=await rows('SELECT * FROM public.canonical_contract_invoice_settlement_v1($1)',[company]);
    assert.equal(value.invalid,true);assert.equal(Number(value.paid_amount),0);
    assert.ok((await report()).rows[0].review_reasons.includes('invalid_invoice_or_payment'));
  });
  it('allows explicit invoice allocation on a multi-contract customer receipt instead of using its primary contract',async()=>{
    const id=await payment();await rows('UPDATE payments SET contract_id=$1 WHERE id=$2',[other,id]);await allocation(id,500);
    const [value]=await rows('SELECT * FROM public.canonical_contract_invoice_settlement_v1($1)',[company]);
    assert.equal(value.invalid,false);assert.equal(Number(value.paid_amount),500);
  });
  for(const allocated of [false,true]) it(`does not infer receipt direction from null transaction type (allocated=${allocated})`,async()=>{
    const id=await payment();if(allocated) await allocation(id,500);
    await rows('UPDATE payments SET transaction_type=null WHERE id=$1',[id]);
    const [value]=await rows('SELECT * FROM public.canonical_contract_invoice_settlement_v1($1)',[company]);
    assert.equal(value.invalid,true);assert.equal(Number(value.paid_amount),0);
  });
  it('requires exact cent agreement to classify service rent',async()=>{
    await db.exec("UPDATE invoices SET invoice_type='service'");
    await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,status,invoice_id) VALUES($1,$2,'2026-08-01',1499.99,'pending',$3)",[company,contract,invoice]);
    const [value]=await rows('SELECT * FROM public.canonical_contract_invoice_settlement_v1($1)',[company]);
    assert.equal(value.unclassified_service,true);
    assert.ok((await report()).rows[0].review_reasons.includes('unclassified_service_invoice'));
  });
  for(const field of ['status','payment_status']) it(`excludes a reversed invoice through ${field}`,async()=>{
    await db.exec(`UPDATE invoices SET ${field}='reversed'`);
    assert.deepEqual(await rows('SELECT * FROM public.canonical_contract_invoice_settlement_v1($1)',[company]),[]);
  });
  it('does not revive a reversed schedule to classify service rent',async()=>{
    await db.exec("UPDATE invoices SET invoice_type='service'");
    await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,status,invoice_id) VALUES($1,$2,'2026-08-01',1500,'reversed',$3)",[company,contract,invoice]);
    const [value]=await rows('SELECT * FROM public.canonical_contract_invoice_settlement_v1($1)',[company]);
    assert.equal(value.unclassified_service,true);
  });
  for(const role of ['authenticated','anon','service_role']) it(`denies direct ${role} access to the common all-component source`,async()=>{
    await db.exec(`SAVEPOINT permission_check; SET LOCAL ROLE ${role}`);
    try {await assert.rejects(rows('SELECT * FROM public.canonical_contract_invoice_settlement_v1($1)',[company]),e=>e.code==='42501');}
    finally {await db.exec('ROLLBACK TO SAVEPOINT permission_check; RESET ROLE; RELEASE SAVEPOINT permission_check');}
  });
  it('excludes cancelled invoices and flags missing obligations instead of declaring paid',async()=>{
    await rows("UPDATE invoices SET status='cancelled'");
    const row=(await report()).rows[0]; assert.equal(row.invoice_count,0);
    assert.deepEqual(row.review_reasons,['missing_monthly_invoice']);
  });
  it('does not offset another unpaid invoice using an overpayment',async()=>{
    await payment(2000);
    await rows(`INSERT INTO invoices(company_id,contract_id,customer_id,invoice_month,invoice_type,total_amount,status)
      VALUES($1,$2,$3,'2026-08-01','sales',500,'sent')`,[company,contract,actor]);
    const row=(await report()).rows[0]; assert.equal(row.outstanding_amount,500);
    assert.ok(row.review_reasons.includes('invalid_invoice_or_payment'));
  });
  it('rejects cross-company and different-customer contribution identities',async()=>{
    const id=await payment(); await allocation(id,500);
    await rows('UPDATE payments SET company_id=$1',[other]);
    let row=(await report()).rows[0]; assert.equal(row.paid_amount,0); assert.ok(row.review_reasons.includes('invalid_invoice_or_payment'));
    await rows('UPDATE payments SET company_id=$1,customer_id=$2',[company,other]);
    row=(await report()).rows[0]; assert.equal(row.paid_amount,0); assert.ok(row.review_reasons.includes('invalid_invoice_or_payment'));
  });
  it('flags total allocations exceeding their payment',async()=>{
    const id=await payment(); await allocation(id,500); await allocation(id,100,'late_fee',other);
    const row=(await report()).rows[0]; assert.equal(row.paid_amount,0); assert.ok(row.review_reasons.includes('invalid_invoice_or_payment'));
  });
  for(const [label,amount,tenant] of [
    ['negative',-500,company],['null',null,company],['wrong company',100,other],
  ]) it(`does not trust a receipt containing a ${label} active allocation to another target`,async()=>{
    const id=await payment(1000); await allocation(id,500);
    await rows(`INSERT INTO payment_allocations(company_id,payment_id,target_id,allocation_type,amount,is_active)
      VALUES($1,$2,$3,'late_fee',$4,true)`,[tenant,id,other,amount]);
    const row=(await report()).rows[0];
    assert.equal(row.paid_amount,0);
    assert.ok(row.review_reasons.includes('invalid_invoice_or_payment'));
    await rows('UPDATE payment_allocations SET is_active=false WHERE target_id=$1',[other]);
    assert.equal((await report()).rows[0].paid_amount,500,'Inactive invalid history must not invalidate a current allocation');
  });
  it('allocates one receipt across invoice months without leaking its gross amount',async()=>{
    await rows(`INSERT INTO invoices(id,company_id,contract_id,customer_id,invoice_month,invoice_type,total_amount,status)
      VALUES($1,$2,$3,$4,'2026-09-01','sales',1500,'sent')`,[other,company,contract,actor]);
    const id=await payment(1000); await allocation(id,400); await allocation(id,600,'invoice',other);
    assert.equal((await report()).rows[0].paid_amount,400);
    assert.equal((await report('2026-09-01')).rows[0].paid_amount,600);
    await rows('UPDATE payment_allocations SET is_active=false WHERE target_id=$1',[invoice]);
    assert.equal((await report()).rows[0].paid_amount,0,'Active allocation to another month suppresses legacy fallback');
  });
  it('counts one receipt once when it settles two invoices in the same month',async()=>{
    await rows(`INSERT INTO invoices(id,company_id,contract_id,customer_id,invoice_month,invoice_type,total_amount,status)
      VALUES($1,$2,$3,$4,'2026-08-01','sales',1500,'sent')`,[other,company,contract,actor]);
    const id=await payment(1000); await allocation(id,400); await allocation(id,600,'invoice',other);
    const row=(await report()).rows[0];
    assert.equal(row.invoice_count,2); assert.equal(row.paid_amount,1000);
    assert.equal(row.outstanding_amount,2000); assert.equal(row.receipt_count,1);
    assert.equal(row.latest_payment_date,'2026-09-02');
  });
  it('flags orphan active allocations and missing gross payment amounts',async()=>{
    await allocation(other,500);
    assert.ok((await report()).rows[0].review_reasons.includes('invalid_invoice_or_payment'));
    await rows('DELETE FROM payment_allocations');
    const id=await payment(); await allocation(id,500); await rows('UPDATE payments SET amount=null');
    const result=(await report()).rows[0];
    assert.equal(result.paid_amount,0); assert.ok(result.review_reasons.includes('invalid_invoice_or_payment'));
  });
  it('never includes a different company contract and ignores pending or outgoing payments',async()=>{
    await rows("INSERT INTO contracts VALUES($1,$2,$3,'OTHER-COMPANY','2026-01-01','2026-12-31','active')",[other,other,actor]);
    await payment(500,'pending'); const id=await payment();
    await rows("UPDATE payments SET transaction_type='payment' WHERE id=$1",[id]);
    const result=await report(); assert.equal(result.rows.length,1); assert.equal(result.rows[0].paid_amount,0);
  });
  it('uses invoice_date only as fallback, never due_date',async()=>{
    await rows('UPDATE invoices SET invoice_month=null'); assert.equal((await report()).rows[0].invoice_count,1);
    await rows('UPDATE invoices SET invoice_date=null');
    assert.ok((await report()).rows[0].review_reasons.includes('unknown_invoice_month'));
  });
  it('excludes explicit traffic invoices regardless of their type or padded reference',async()=>{
    await rows("UPDATE invoices SET invoice_type='service',invoice_number=' tv-1 '");
    assert.equal((await report()).rows[0].invoice_count,0);
    await rows("UPDATE invoices SET invoice_number='FINE',penalty_id=$1",[other]);
    assert.equal((await report()).rows[0].invoice_count,0);
  });
  it('retains an unclassified service invoice as a review row rather than silently dropping it',async()=>{
    await rows("UPDATE invoices SET invoice_type='service'");
    const row=(await report()).rows[0];
    assert.equal(row.invoice_count,1);
    assert.ok(row.review_reasons.includes('unclassified_service_invoice'));
    assert.ok(!row.review_reasons.includes('missing_monthly_invoice'));
  });
  it('counts service-typed rent backed by its exact installment link and real payment',async()=>{
    await rows("UPDATE invoices SET invoice_type='service'");
    await rows(`INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,status,invoice_id)
      VALUES($1,$2,'2026-08-01',1500,'pending',$3)`,[company,contract,invoice]);
    const id=await payment(500); await allocation(id,500);
    let row=(await report()).rows[0];
    assert.equal(row.invoice_count,1); assert.equal(row.paid_amount,500); assert.equal(row.outstanding_amount,1000);
    assert.deepEqual(row.review_reasons,[]);
    await rows("UPDATE payments SET payment_status='cancelled' WHERE id=$1",[id]);
    row=(await report()).rows[0]; assert.equal(row.paid_amount,0); assert.equal(row.outstanding_amount,1500);
  });
  for (const [label,change,args] of [
    ['wrong company','company_id=$1',[other]], ['wrong contract','contract_id=$1',[other]],
    ['wrong invoice','invoice_id=$1',[other]], ['amount mismatch','amount=500',[]],
    ['month mismatch',"due_date='2026-09-01'",[]], ['inactive',"status='cancelled'",[]],
  ]) it(`does not use a ${label} schedule to classify service rent`,async()=>{
    await rows("UPDATE invoices SET invoice_type='service'");
    await rows(`INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,status,invoice_id)
      VALUES($1,$2,'2026-08-01',1500,'pending',$3)`,[company,contract,invoice]);
    await rows(`UPDATE contract_payment_schedules SET ${change}`,args);
    assert.ok((await report()).rows[0].review_reasons.includes('unclassified_service_invoice'));
  });
  it('flags duplicate installment links even if one is in another month',async()=>{
    await rows("UPDATE invoices SET invoice_type='service'");
    await rows(`INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,status,invoice_id)
      VALUES($1,$2,'2026-08-01',1500,'pending',$3),($1,$2,'2026-09-01',1500,'pending',$3)`,[company,contract,invoice]);
    assert.ok((await report()).rows[0].review_reasons.includes('unclassified_service_invoice'));
  });
  it('flags out-of-period schedules and invoice/schedule mismatch',async()=>{
    await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,status) VALUES($1,$2,'2027-01-01',1500,'pending')",[company,contract]);
    const row=(await report('2027-01-01')).rows[0];
    assert.ok(row.review_reasons.includes('outside_contract_period'));
    assert.ok(row.review_reasons.includes('schedule_amount_mismatch'));
  });
  it('keeps an undated active invoice visible for review even after the contract ended',async()=>{
    await rows("UPDATE contracts SET end_date='2026-07-31',status='completed'");
    await rows('UPDATE invoices SET invoice_month=null,invoice_date=null');
    const [row]=(await report()).rows;
    assert.ok(row,'An unknown invoice month must not make the whole obligation disappear');
    assert.ok(row.review_reasons.includes('unknown_invoice_month'));
    assert.equal(row.invoiced_amount,0,'Do not assign an undated amount to the requested month');
    assert.equal(row.outstanding_amount,0);
    await rows("UPDATE invoices SET status='cancelled'");
    assert.deepEqual((await report()).rows,[],'Cancelled unknown evidence must not resurrect a completed contract');
  });
  it('blocks anonymous, service, wrong-company, inactive and absent identities',async()=>{
    for(const role of ['anon','service_role']) await assert.rejects(report('2026-08-01',company,role),e=>e.code==='42501');
    await assert.rejects(report('2026-08-01',other),e=>e.code==='42501');
    await rows('UPDATE profiles SET is_active=false'); await assert.rejects(report(),e=>e.code==='42501');
    await rows("SELECT set_config('fixture.uid','',true)"); await assert.rejects(report(),e=>e.code==='42501');
  });
  for(const role of ['authenticated','anon','service_role']) it(`denies direct ${role} access to the internal settlement function`,async()=>{
    await db.exec('SAVEPOINT internal_access');
    try {
      await db.exec(`SET LOCAL ROLE ${role}`);
      await assert.rejects(rows('SELECT * FROM public.canonical_rental_invoice_settlement_v1($1)',[company]),
        error=>error.code==='42501' && /permission denied for function canonical_rental_invoice_settlement_v1/.test(error.message));
    } finally {
      await db.exec('ROLLBACK TO SAVEPOINT internal_access; RESET ROLE; RELEASE SAVEPOINT internal_access');
    }
    assert.equal((await report()).rows.length,1,'Authorized wrapper remains callable without direct helper access');
  });
  it('rejects invalid month boundaries and null input',async()=>{
    await assert.rejects(report('2026-08-15'),e=>e.code==='22023');
    await assert.rejects(report(null),e=>e.code==='22023');
    await assert.rejects(report('2026-08-01',null),e=>e.code==='22023');
  });
  it('returns all contract rows in one JSON value, including more than 1000',async()=>{
    await rows(`INSERT INTO contracts SELECT gen_random_uuid(),$1,$2,'TEST-'||n,'2026-01-01'::date,'2026-12-31'::date,'active'
      FROM generate_series(1,1001) n`,[company,actor]);
    assert.equal((await report()).rows.length,1002);
  });
  it('is stable and read-only and rollback preserves every financial record',async()=>{
    const before=await rows('SELECT to_jsonb(i) data FROM invoices i'); await payment();
    assert.deepEqual(await report(),await report());
    assert.deepEqual(await rows('SELECT to_jsonb(i) data FROM invoices i'),before);
    assert.equal((await rows("SELECT provolatile FROM pg_proc WHERE oid='get_canonical_rental_month_summary_v1(uuid,date)'::regprocedure"))[0].provolatile,'s');
    await db.exec(await read(`../../supabase/rollbacks/${migration}.rollback.sql`));
    assert.equal((await rows("SELECT to_regprocedure('public.canonical_rental_invoice_settlement_v1(uuid)') helper"))[0].helper,null);
    assert.equal((await rows("SELECT to_regprocedure('public.canonical_contract_invoice_settlement_v1(uuid)') helper"))[0].helper,null);
    assert.equal((await rows('SELECT count(*)::int n FROM payments'))[0].n,1);
    assert.deepEqual(await rows('SELECT to_jsonb(i) data FROM invoices i'),before);
  });
});
