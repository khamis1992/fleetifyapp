import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const company='22222222-2222-4222-8222-222222222222', customer='33333333-3333-4333-8333-333333333333';
const contract='55555555-5555-4555-8555-555555555555', invoice='11111111-1111-4111-8111-111111111111';
const other='77777777-7777-4777-8777-777777777777';
let db;
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
const result=async(excluded=[],asOf='2026-09-04')=>(await rows(
  'SELECT public.canonical_legal_recorded_obligations_v1($1,$2,$3,$4::uuid[]) value',
  [company,contract,asOf,excluded]))[0].value;
const pay=async(amount,status='completed')=>(await rows(`INSERT INTO payments(company_id,customer_id,contract_id,invoice_id,amount,payment_status,payment_date,transaction_type)
 VALUES($1,$2,$3,$4,$5,$6,'2026-09-02','receipt') RETURNING id`,[company,customer,contract,invoice,amount,status]))[0].id;
const profile=async(date='2026-07-15')=>rows(`INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_returned_at)
 VALUES($1,$2,$3)`,[company,contract,date]);

describe('private legal recorded obligation source — actual pending SQL',()=>{
  before(async()=>{
    db=new PGlite();
    // Reuse precisely the reduced schema used by the frozen v3/v4 audit, not
    // its calculator or tests. A changed delimiter fails setup rather than
    // silently loading production DML. Full production RLS/triggers remain a gate.
    const audit=await read('./legal-claim-source-audit.test.mjs');
    const schemas=[...audit.matchAll(/await db\.exec\(`(CREATE ROLE[\s\S]*?)`\);/g)];
    assert.equal(schemas.length,1);
    await db.exec(schemas[0][1]);
    await db.exec(await read('../../supabase/migrations/20260903222544_canonical_rental_month_summary.sql'));
    await db.exec(await read('../../supabase/migrations/20260904023524_canonical_legal_recorded_obligations.sql'));
  });
  after(async()=>db?.close());
  beforeEach(async()=>{
    await db.exec('BEGIN');
    await rows("INSERT INTO contracts VALUES($1,$2,$3,'TEST','2026-01-01','2026-12-31','under_legal_procedure',1500,true,0)",[contract,company,customer]);
    await rows(`INSERT INTO invoices VALUES($1,$2,$3,$4,'2026-08-01','2026-08-01','2026-08-01','RENT','sales',null,1500,0,1500,'unpaid','sent')`,[invoice,company,contract,customer]);
    await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,paid_amount,status,invoice_id) VALUES($1,$2,'2026-08-01',1500,0,'pending',$3)",[company,contract,invoice]);
  });
  afterEach(async()=>db.exec('ROLLBACK'));
  it('reads the actual unpaid invoice once, not again as its installment',async()=>{
    const r=await result();assert.equal(r.recorded_rent_total,1500);assert.equal(r.requires_review,false);
    assert.equal(r.rows.length,1);assert.equal(r.rows[0].invoice_id,invoice);
  });
  it('uses a partial receipt despite stale unpaid cache',async()=>{
    await pay(500);const r=await result();assert.equal(r.recorded_rent_total,1000);
    assert.equal(r.rows[0].paid_amount,500);
  });
  it('restores debt after cancelled payment despite stale paid cache',async()=>{
    await pay(1500,'cancelled');await db.exec("UPDATE invoices SET paid_amount=1500,balance_due=0,payment_status='paid'");
    assert.equal((await result()).recorded_rent_total,1500);
  });
  it('reads matched service rent from the same source',async()=>{
    await db.exec("UPDATE invoices SET invoice_type='service'");assert.equal((await result()).recorded_rent_total,1500);
  });
  it('excludes fee allocation from rental principal',async()=>{
    const id=await pay(620);await rows(`INSERT INTO payment_allocations(company_id,payment_id,target_id,allocation_type,amount,is_active)
      VALUES($1,$2,$3,'invoice',500,true),($1,$2,$4,'late_fee',120,true)`,[company,id,invoice,other]);
    assert.equal((await result()).recorded_rent_total,1000);
  });
  it('does not certify a schedule linked to a TV-only invoice as rent',async()=>{
    await db.exec("UPDATE invoices SET invoice_number=' tv-123 '");const r=await result();
    assert.equal(r.recorded_rent_total,null);assert.equal(r.requires_review,true);
    assert.ok(r.rows[0].review_reasons.includes('schedule_linked_to_traffic'));
  });
  it('applies return cutoff to actual recorded rows',async()=>{
    await profile();const r=await result();assert.equal(r.rent_cutoff_date,'2026-07-15');
    assert.equal(r.rows[0].disposition,'after_cutoff');assert.equal(r.recorded_rent_total,0);
  });
  it('intersects manual exclusion with included debt, not post-cutoff amounts',async()=>{
    await profile();await rows(`INSERT INTO invoices(id,company_id,contract_id,customer_id,invoice_month,invoice_date,due_date,invoice_number,invoice_type,total_amount,status,payment_status)
      VALUES($1,$2,$3,$4,'2026-07-01','2026-07-01','2026-07-01','EARLIER','sales',500,'sent','unpaid')`,[other,company,contract,customer]);
    const r=await result([invoice]);assert.equal(r.recorded_rent_total,500);assert.equal(r.manual_excluded_total,0);
  });
  it('does not rewind the requested component clock at confirmed termination',async()=>{
    await rows(`INSERT INTO legal_case_litigation_profile(company_id,contract_id,termination_date,termination_date_status)
      VALUES($1,$2,'2026-08-15','confirmed')`,[company,contract]);
    const r=await result();assert.equal(r.rent_cutoff_date,'2026-08-15');assert.equal(r.as_of_date,'2026-09-04');
  });
  it('ignores an unconfirmed termination date',async()=>{
    await rows(`INSERT INTO legal_case_litigation_profile(company_id,contract_id,termination_date,termination_date_status)
      VALUES($1,$2,'2026-07-15','draft')`,[company,contract]);
    assert.equal((await result()).recorded_rent_total,1500);
  });
  it('uses Qatar date at a UTC judgment boundary independently of session timezone',async()=>{
    await db.exec("SET LOCAL timezone='America/Los_Angeles'");
    await rows(`INSERT INTO legal_cases(company_id,contract_id,judgment_final_at,case_status)
      VALUES($1,$2,'2026-07-31T21:30:00Z','active')`,[company,contract]);
    const r=await result();assert.equal(r.rent_cutoff_date,'2026-08-01');assert.equal(r.recorded_rent_total,1500);
  });
  it('does not apply cancelled case cutoffs',async()=>{
    await rows(`INSERT INTO legal_cases(company_id,contract_id,judgment_final_at,case_status)
      VALUES($1,$2,'2026-07-01T00:00:00Z',' Cancelled ')`,[company,contract]);
    assert.equal((await result()).rent_cutoff_date,'2026-09-04');
  });
  for (const stage of ['appeal','enforcement','collection']) it(`honors judgment outcome in ${stage}`,async()=>{
    await rows(`INSERT INTO legal_cases(company_id,contract_id,outcome_date,workflow_stage,case_status)
      VALUES($1,$2,'2026-07-15',$3,'active')`,[company,contract,stage]);
    assert.equal((await result()).recorded_rent_total,0);
  });
  it('excludes only the remaining amount of a manually selected invoice',async()=>{
    await pay(500);const r=await result([invoice,invoice,other]);assert.equal(r.recorded_rent_total,0);
    assert.equal(r.manual_excluded_total,1000);assert.equal(r.rows[0].disposition,'excluded');
  });
  it('does not hide invalid receipt evidence behind a manual exclusion',async()=>{
    await pay(500);await rows('UPDATE payments SET customer_id=$1',[other]);const r=await result([invoice]);
    assert.equal(r.recorded_rent_total,null);assert.equal(r.rows[0].outstanding_amount,null);
    assert.equal(r.manual_excluded_total,0);
  });
  it('does not claim a cached unpaid standalone installment without an invoice',async()=>{
    await db.exec('DELETE FROM invoices; UPDATE contract_payment_schedules SET invoice_id=NULL,paid_amount=500');
    const r=await result();assert.equal(r.recorded_rent_total,null);assert.equal(r.rows[0].source_type,'schedule');
  });
  it('uses one same-month invoice when an otherwise matching schedule link is missing',async()=>{
    await db.exec('UPDATE contract_payment_schedules SET invoice_id=NULL');assert.equal((await result()).rows.length,1);
    assert.equal((await result()).recorded_rent_total,1500);
  });
  it('flags mismatch instead of deriving rent from a smaller invoice',async()=>{
    await db.exec('UPDATE invoices SET total_amount=500');const r=await result();assert.equal(r.recorded_rent_total,null);
    assert.ok(r.rows[0].review_reasons.includes('schedule_invoice_mismatch'));
  });
  it('requires duplicate month reconciliation instead of summing both invoices',async()=>{
    await rows(`INSERT INTO invoices SELECT $1,company_id,contract_id,customer_id,invoice_month,invoice_date,due_date,'DUP',invoice_type,
      penalty_id,total_amount,paid_amount,balance_due,payment_status,status FROM invoices`,[other]);
    assert.equal((await result()).recorded_rent_total,null);
  });
  it('flags active schedule outside contract end rather than extending the end date',async()=>{
    await db.exec("UPDATE contract_payment_schedules SET invoice_id=NULL,due_date='2027-01-01'");
    const r=await result();assert.equal(r.recorded_rent_total,null);
    assert.ok(r.rows.find(r=>r.source_type==='schedule').review_reasons.includes('outside_contract_period'));
  });
  it('does not trust undated invoice due date as its billing month',async()=>{
    await db.exec('UPDATE invoices SET invoice_month=NULL,invoice_date=NULL');const r=await result();
    assert.equal(r.recorded_rent_total,null);assert.ok(r.rows[0].review_reasons.includes('unknown_invoice_month'));
  });
  it('does not certify an empty source as a debt-free contract',async()=>{
    await db.exec('DELETE FROM invoices; DELETE FROM contract_payment_schedules');
    const r=await result();assert.equal(r.recorded_rent_total,null);assert.equal(r.requires_review,true);
    assert.deepEqual(r.review_reasons,['missing_recorded_obligation_evidence']);
  });
  for (const amount of ['NaN','Infinity','1500.001']) it(`rejects malformed rental amount ${amount}`,async()=>{
    await db.exec('DELETE FROM contract_payment_schedules');
    await rows('UPDATE invoices SET total_amount=$1',[amount]);
    const r=await result();assert.equal(r.recorded_rent_total,null);assert.equal(r.requires_review,true);
    assert.ok(r.rows[0].review_reasons.includes('invalid_currency_amount'));
  });
  it('treats a paid receipt as settled even when balance cache is stale',async()=>{
    await pay(1500);const r=await result([invoice]);assert.equal(r.recorded_rent_total,0);
    assert.equal(r.rows[0].disposition,'settled');assert.equal(r.manual_excluded_total,0);
  });
  it('does not include a future invoice just because an exclusion ID is supplied',async()=>{
    const r=await result([invoice],'2026-07-31');assert.equal(r.recorded_rent_total,0);
    assert.equal(r.rows[0].disposition,'after_cutoff');assert.equal(r.manual_excluded_total,0);
  });
  it('preserves all requested dates when the contract has ended',async()=>{
    await db.exec("UPDATE contracts SET end_date='2026-08-31'");const r=await result();
    assert.equal(r.recorded_rent_cutoff_date,'2026-08-31');assert.equal(r.rent_cutoff_date,'2026-09-04');
    assert.equal(r.as_of_date,'2026-09-04');
  });
  it('does not certify a duplicate schedule even when it references the same invoice',async()=>{
    await db.exec(`INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,paid_amount,status,invoice_id)
      SELECT company_id,contract_id,due_date,amount,paid_amount,status,invoice_id FROM contract_payment_schedules`);
    const r=await result();assert.equal(r.recorded_rent_total,null);
    assert.ok(r.rows[0].review_reasons.includes('duplicate_schedule_month'));
  });
  it('does not ignore an unmatched non-null schedule link just because the month matches',async()=>{
    await rows('UPDATE contract_payment_schedules SET invoice_id=$1',[other]);
    const r=await result();assert.equal(r.recorded_rent_total,null);assert.equal(r.rows.length,2);
  });
  for(const role of ['anon','authenticated','service_role']) it(`denies raw helper to ${role}`,async()=>{
    await db.exec(`SET LOCAL ROLE ${role}`);await assert.rejects(result(),/permission denied/);
  });
  it('rejects wrong company without disclosing a contract',async()=>{
    await assert.rejects(rows('SELECT public.canonical_legal_recorded_obligations_v1($1,$2,$3)',[other,contract,'2026-09-04']),/not found/);
  });
  for(const date of [null,'infinity','-infinity']) it(`rejects invalid date ${date}`,async()=>{
    await assert.rejects(result([],date),/Finite calculation date/);
  });
  it('rejects null exclusion elements rather than losing included rows',async()=>{
    await assert.rejects(result([null]),/non-null exclusion IDs/);
  });
  it('ignores other-company profile and cutoff evidence',async()=>{
    await rows(`INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_returned_at) VALUES($1,$2,'2026-07-15')`,[other,contract]);
    assert.equal((await result()).recorded_rent_total,1500);
  });
  it('is read-only and rollback removes only this reader',async()=>{
    await pay(500);const before=await rows('SELECT to_jsonb(i) value FROM invoices i');await result();
    assert.deepEqual(await rows('SELECT to_jsonb(i) value FROM invoices i'),before);
    // Strip transaction boundaries: enclosing per-test transaction must roll back the DDL.
    const rollback=(await read('../../supabase/rollbacks/20260904023524_canonical_legal_recorded_obligations.rollback.sql'))
      .replace(/^BEGIN;|^COMMIT;/gm,'');
    await db.exec(rollback);
    assert.equal((await rows("SELECT to_regprocedure('public.canonical_legal_recorded_obligations_v1(uuid,uuid,date,uuid[])') f"))[0].f,null);
    assert.ok((await rows("SELECT to_regprocedure('public.canonical_contract_invoice_settlement_v1(uuid)') f"))[0].f);
  });
});
