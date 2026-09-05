// Diagnostic regressions against the actual deployed function bodies, not a new
// calculator or an authorization/trigger certificate. TODO tests intentionally
// express correct financial behavior that the current engine does not satisfy.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const company='22222222-2222-4222-8222-222222222222', customer='33333333-3333-4333-8333-333333333333';
const contract='55555555-5555-4555-8555-555555555555', invoice='11111111-1111-4111-8111-111111111111';
const other='77777777-7777-4777-8777-777777777777';
let db;
const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
async function loadFunction(path,name,expectedBodyHash) {
  const sql=(await read(path)).replace(/\r\n/g,'\n');
  const start=sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  assert.ok(start>=0,`Missing function ${name}`);
  const end=sql.indexOf('\n$$;',start);
  assert.ok(end>start);
  const statement=sql.slice(start,end+4);
  const body=statement.slice(statement.indexOf('AS $$')+5,-3);
  assert.equal(createHash('md5').update(body).digest('hex'),expectedBodyHash,
    'Migration body must match read-only production prosrc hash captured 2026-09-04');
  await db.exec(statement);
}
const claim=async(scope='full_outstanding',excluded=[]) => (await rows(
  'SELECT public.calculate_legal_claim_statement_v4($1,$2,$3,$4,$5::uuid[]) value',
  [company,contract,'2026-09-04',scope,excluded]))[0].value;
const canonical=async()=>Number((await rows(
  'SELECT outstanding_amount FROM public.canonical_rental_invoice_settlement_v1($1) WHERE invoice_id=$2',
  [company,invoice]))[0]?.outstanding_amount);
const pay=async(amount,status='completed')=>rows(`INSERT INTO payments(company_id,customer_id,contract_id,invoice_id,amount,payment_status,payment_date,transaction_type)
 VALUES($1,$2,$3,$4,$5,$6,'2026-09-02','receipt') RETURNING id`,[company,customer,contract,invoice,amount,status]);
async function loadPendingCutoffWrapper() {
  const pending=(await read('./fixtures/rejected-legal-cutoff-wrapper-20260903.sql')).replace(/\r\n/g,'\n');
  // Function/privilege statements ONLY; no case-specific DML or transaction commands.
  const start=pending.indexOf('ALTER FUNCTION');const end=pending.indexOf('\nDO $$');
  assert.ok(start>0&&end>start);await db.exec(pending.slice(start,end));
}

describe('legal claim engine source audit — known defects remain TODO, not fixed',()=>{
  before(async()=>{
    db=new PGlite();
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT NULL::uuid$$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT '{"role":"service_role"}'::jsonb$$;
      CREATE FUNCTION public.get_user_company_id() RETURNS uuid LANGUAGE sql AS $$SELECT NULL::uuid$$;
      CREATE TABLE profiles(user_id uuid,company_id uuid,is_active boolean);
      CREATE TABLE customers(id uuid,company_id uuid,first_name_ar text,last_name_ar text,first_name text,last_name text,company_name text,company_name_ar text);
      CREATE TABLE contracts(id uuid PRIMARY KEY,company_id uuid,customer_id uuid,contract_number text,start_date date,end_date date,status text,monthly_amount numeric,vehicle_returned boolean,late_fine_amount numeric);
      CREATE TABLE invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,customer_id uuid,invoice_month date,invoice_date date,due_date date,
        invoice_number text,invoice_type text,penalty_id uuid,total_amount numeric,paid_amount numeric,balance_due numeric,payment_status text,status text);
      CREATE TABLE payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,customer_id uuid,contract_id uuid,invoice_id uuid,amount numeric,payment_date date,payment_status text,transaction_type text);
      CREATE TABLE payment_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,payment_id uuid,target_id uuid,allocation_type text,amount numeric,is_active boolean);
      CREATE TABLE contract_payment_schedules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,due_date date,amount numeric,paid_amount numeric,status text,invoice_id uuid);
      CREATE TABLE legal_cases(id uuid,company_id uuid,contract_id uuid,claim_scope text,created_at timestamptz,outcome_date date,workflow_stage text,case_status text,
        judgment_final_at timestamptz,case_number varchar,source_contract_status text,vehicle_custody_at_transfer text,vehicle_returned_at_transfer date);
      CREATE TABLE legal_case_litigation_profile(company_id uuid,contract_id uuid,vehicle_returned_at date,vehicle_custody text,termination_date date,termination_date_status text,
        retention_daily_rate numeric,retention_rate_source text,retention_rate_source_ref text,retention_rate_source_document_id uuid,
        contractual_compensation_enabled boolean,contractual_compensation_clause_number text,contractual_compensation_clause_text text,
        contractual_compensation_method text,contractual_compensation_rate numeric,contractual_compensation_cap numeric,contractual_compensation_document_id uuid,
        apply_security_deposit boolean,security_deposit_amount numeric);
      CREATE TABLE legal_case_damage_costs(company_id uuid,contract_id uuid,amount numeric,depreciation_deduction numeric,insurance_recovery numeric,verified boolean,evidence_document_id uuid);
      CREATE TABLE contract_documents(company_id uuid,contract_id uuid,document_type text,file_path text);
      CREATE TABLE penalties(company_id uuid,contract_id uuid,amount numeric,payment_status text,status text);`);
    await loadFunction('../../supabase/migrations/20260831113000_fix_legal_claim_invoice_component_double_count.sql',
      'calculate_legal_claim_breakdown_v3','4a27cf9dcd1bfd202ffb80834de3f1a9');
    await loadFunction('../../supabase/migrations/20260901090230_unify_legal_claim_engine_and_cancelled_collection.sql',
      'calculate_legal_claim_statement_v4','36b78342a4ecc47adcdc6f9c5825f641');
    await db.exec(await read('../../supabase/migrations/20260903222544_canonical_rental_month_summary.sql'));
  });
  after(async()=>db?.close());
  beforeEach(async()=>{
    await db.exec('BEGIN');
    await rows("INSERT INTO contracts VALUES($1,$2,$3,'TEST','2026-01-01','2026-12-31','under_legal_procedure',1500,true,0)",[contract,company,customer]);
    await rows(`INSERT INTO invoices VALUES($1,$2,$3,$4,'2026-08-01','2026-08-01','2026-08-01','RENT','sales',null,1500,0,1500,'unpaid','sent')`,[invoice,company,contract,customer]);
    await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,paid_amount,status,invoice_id) VALUES($1,$2,'2026-08-01',1500,0,'pending',$3)",[company,contract,invoice]);
  });
  afterEach(async()=>db.exec('ROLLBACK'));
  it('matches the live bodies and an ordinary unpaid sales invoice control',async()=>{
    assert.equal((await claim()).components.rent_due,1500);assert.equal(await canonical(),1500);
  });
  it('keeps a manual exclusion of the actual due invoice scoped to that invoice',async()=>{
    const result=await claim('full_outstanding',[invoice]);assert.equal(result.total,0);
    assert.equal(result.excluded_invoices[0].id,invoice);
  });
  it('uses partial payments even when the invoice balance cache was not refreshed', {todo:'Current engine uses invoice cache, not active receipt allocations'},async()=>{
    await pay(500);assert.equal(await canonical(),1000);
    assert.equal((await claim()).components.rent_due,1000);
  });
  it('restores debt when a payment was cancelled despite a paid invoice cache', {todo:'Cancelled receipt is hidden by stale zero invoice balance'},async()=>{
    await pay(1500,'cancelled');await db.exec("UPDATE invoices SET paid_amount=1500,balance_due=0,payment_status='paid'");
    assert.equal(await canonical(),1500);assert.equal((await claim()).components.rent_due,1500);
  });
  it('recognizes service-typed rent linked to its matching monthly installment', {todo:'Current sales-only predicate drops generated service rent'},async()=>{
    await db.exec("UPDATE invoices SET invoice_type='service'");assert.equal(await canonical(),1500);
    assert.equal((await claim()).components.rent_due,1500);
  });
  it('does not apply the gross receipt including a fee to rental principal', {todo:'Current engine ignores principal allocation'},async()=>{
    const [{id}]=await pay(620);
    await rows(`INSERT INTO payment_allocations(company_id,payment_id,target_id,allocation_type,amount,is_active)
      VALUES($1,$2,$3,'invoice',500,true),($1,$2,$4,'late_fee',120,true)`,[company,id,invoice,other]);
    assert.equal(await canonical(),1000);assert.equal((await claim()).components.rent_due,1000);
  });
  it('excludes TV-only traffic invoice from rent even without penalty_id', {todo:'TV reference classification differs from rental source'},async()=>{
    await db.exec("UPDATE invoices SET invoice_number=' tv-123 '");
    // The installment still points to non-rent evidence: never certify 1500 rent.
    assert.equal((await claim()).components.rent_due,0);
  });
  it('does not include rent after the returned-at cutoff it reports', {todo:'Published cutoff is not applied to due invoice rows'},async()=>{
    await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_returned_at,vehicle_custody) VALUES($1,$2,'2026-07-15','returned')",[company,contract]);
    const result=await claim();assert.equal(result.cutoff_date,'2026-07-15');assert.equal(result.components.rent_due,0);
  });
  it('does not use an excluded post-cutoff invoice to erase a valid earlier debt after the pending cutoff wrapper', {todo:'v4 invoice exclusions use a different cutoff from its v3 base'},async()=>{
    await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_returned_at,vehicle_custody) VALUES($1,$2,'2026-07-15','returned')",[company,contract]);
    await rows(`INSERT INTO invoices(id,company_id,contract_id,customer_id,invoice_month,invoice_date,due_date,invoice_number,invoice_type,total_amount,paid_amount,balance_due,status,payment_status)
      VALUES($1,$2,$3,$4,'2026-07-01','2026-07-01','2026-07-01','BEFORE','sales',500,0,500,'sent','unpaid')`,[other,company,contract,customer]);
    await loadPendingCutoffWrapper();
    const result=await claim('full_outstanding',[invoice]);
    assert.equal(result.components.rent_due,500);
    assert.equal(result.excluded_amounts.manual_invoice_exclusions,0);
  });
  it('preserves separately evidenced post-termination retention when limiting rental due rows', {todo:'Pending wrapper rewinds all component clocks, not only rent'},async()=>{
    await db.exec("DELETE FROM invoices; DELETE FROM contract_payment_schedules; UPDATE contracts SET end_date='2026-07-31',vehicle_returned=false");
    await rows(`INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_custody,termination_date,termination_date_status,
      retention_daily_rate,retention_rate_source,retention_rate_source_ref,retention_rate_source_document_id)
      VALUES($1,$2,'with_defendant','2026-08-15','confirmed',10,'signed_contract','TEST-CLAUSE',$3)`,[company,contract,other]);
    // Preserve existing evidenced retention behavior (20 days × 10), not a new legal rule.
    assert.equal((await claim()).components.retention,200);
    await loadPendingCutoffWrapper();
    assert.equal((await claim()).components.retention,200);
  });
  it('leaves invoice and receipt data unchanged on calculation',async()=>{
    await pay(500);const before=await rows('SELECT to_jsonb(i) value FROM invoices i');
    await claim();assert.deepEqual(await rows('SELECT to_jsonb(i) value FROM invoices i'),before);
    assert.equal((await rows('SELECT count(*)::int n FROM payments'))[0].n,1);
  });
});
