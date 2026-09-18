// Real frozen v3/v4 bodies, then the actual pending replacement migration.
// Minimal schema / authentication fixtures: not a full production RLS certificate.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before,after,beforeEach,afterEach,describe,it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const company='22222222-2222-4222-8222-222222222222',customer='33333333-3333-4333-8333-333333333333';
const contract='55555555-5555-4555-8555-555555555555',invoice='11111111-1111-4111-8111-111111111111';
const other='77777777-7777-4777-8777-777777777777';
const legacy='88888888-8888-4888-8888-888888888888';
const integration='20260904024349_integrate_canonical_legal_claim_rows';
const readinessIntegration='20260904032401_align_legal_readiness_financial_sources';
const completionIntegration='20260904034603_persist_canonical_legal_readiness';
const systemReviewIntegration='20260904040649_revalidate_canonical_legal_system_review';
const conversionIntegration='20260904041840_guard_legal_conversion_and_snapshot';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
let db;
const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
const claim=async(excluded=[],scope='full_outstanding') => (await rows(
  'SELECT public.calculate_legal_claim_statement_v4($1,$2,$3,$4,$5::uuid[]) value',
  [company,contract,'2026-09-04',scope,excluded]))[0].value;
const breakdown=async()=> (await rows('SELECT public.calculate_legal_claim_breakdown_v3($1,$2,$3) value',
  [company,contract,'2026-09-04']))[0].value;
const pay=async(amount,status='completed')=>(await rows(`INSERT INTO payments(company_id,customer_id,contract_id,invoice_id,amount,payment_status,payment_date,transaction_type)
 VALUES($1,$2,$3,$4,$5,$6,'2026-09-02','receipt') RETURNING id`,[company,customer,contract,invoice,amount,status]))[0].id;
async function loadFunction(path,name) {
  const sql=(await read(path)).replace(/\r\n/g,'\n');const start=sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  const end=sql.indexOf('\n$$;',start);assert.ok(start>=0&&end>start);await db.exec(sql.slice(start,end+4));
}
async function compensate(method='per_invoice') {
  await rows(`INSERT INTO legal_case_litigation_profile(company_id,contract_id,contractual_compensation_enabled,
    contractual_compensation_clause_number,contractual_compensation_clause_text,contractual_compensation_method,
    contractual_compensation_rate,contractual_compensation_document_id)
    VALUES($1,$2,true,'1','Test evidenced clause',$3,10,$4)`,[company,contract,method,other]);
}
async function auth({tenant=company,user=customer,active=true,profile=true}={}) {
  if(profile) await rows('INSERT INTO profiles(user_id,company_id,is_active) VALUES($1,$2,$3)',[user,tenant,active]);
  await rows("SELECT set_config('fixture.uid',$1,true),set_config('fixture.company',$2,true),set_config('fixture.role','authenticated',true)",[user??'',tenant]);
  await db.exec('SET LOCAL ROLE authenticated');
}
async function traffic({party='customer',withInvoice=true,proof='proof.pdf',customerState='unpaid'}={}) {
  await rows(`INSERT INTO penalties(id,company_id,contract_id,customer_id,amount,status,payment_status,responsibility_party,customer_payment_status)
    VALUES($1,$2,$3,$4,500,'confirmed','unpaid',$5,$6)`,[other,company,contract,customer,party,customerState]);
  if(withInvoice) await rows(`INSERT INTO invoices(id,company_id,contract_id,customer_id,invoice_month,invoice_date,due_date,invoice_number,
    invoice_type,penalty_id,total_amount,status,payment_status)
    VALUES($1,$2,$3,$4,'2026-08-01','2026-08-01','2026-08-01','TV-TEST','service',$1,500,'sent','unpaid')`,[other,company,contract,customer]);
  if(proof!==null) await rows("INSERT INTO contract_documents(company_id,contract_id,document_type,file_path) VALUES($1,$2,'violations_proof',$3)",[company,contract,proof]);
}
const trafficReceipt=async(amount=200,status='completed')=>(await rows(`INSERT INTO payments(company_id,customer_id,contract_id,invoice_id,amount,payment_status,payment_date,transaction_type)
  VALUES($1,$2,$3,$4,$5,$6,'2026-09-02','receipt') RETURNING id`,[company,customer,contract,other,amount,status]))[0].id;
async function legacyTraffic({id=legacy,reference='SHARED-REF',date='2026-08-01',amount=500,party='customer',
  assignedContract=contract,responsibleCustomer=customer,vehicle=null,state='pending',tenant=company}={}) {
  await rows(`INSERT INTO traffic_violations(id,company_id,contract_id,responsible_customer_id,violation_number,violation_date,fine_amount,responsibility_party,vehicle_id,status)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[id,tenant,assignedContract,responsibleCustomer,reference,date,amount,party,vehicle,state]);
}
async function matchingSources(options={}) {
  await traffic({withInvoice:false});await db.exec("UPDATE penalties SET penalty_number='SHARED-REF'");
  await legacyTraffic(options);
}
async function installReadinessAdapter() {
  // Keep this additive migration inside the per-test transaction. Document
  // automation is an explicit stub: these tests do not certify the v1 agent.
  await db.exec(`ALTER TABLE invoices ADD COLUMN journal_entry_id uuid;
    CREATE TABLE invoice_items(invoice_id uuid);
    CREATE FUNCTION public.can_prepare_contract_for_legal_v1(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
    CREATE FUNCTION public.get_legal_transfer_readiness_v1(uuid,uuid) RETURNS jsonb LANGUAGE sql AS $$
      SELECT '{"signed_contract_ready":true,"payments":[],"violation_proof_ready":true,"invoices":[{"balance_due":9999}],"violations":[]}'::jsonb $$;`);
  await loadFunction('../../supabase/migrations/20260901090230_unify_legal_claim_engine_and_cancelled_collection.sql','get_legal_transfer_readiness_v2');
  await db.exec((await read(`../../supabase/migrations/${readinessIntegration}.sql`)).replace(/^BEGIN;|^COMMIT;/gm,''));
}
const financialReadiness=async()=>(await rows("SELECT legal_claim_internal.read_readiness_finances_v1($1,$2,'2026-09-04') value",[company,contract]))[0].value;
async function installCompletionCommand() {
  await installReadinessAdapter();
  await db.exec(`CREATE TABLE contract_operations_log(id uuid DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,
    operation_type text,operation_details jsonb,notes text,performed_by uuid,performed_at timestamptz DEFAULT now());
    ALTER TABLE contract_documents ADD COLUMN legal_identity_match_status text DEFAULT 'matched', ADD COLUMN legal_evidence_state text DEFAULT 'active';
    CREATE FUNCTION public.check_contract_has_verified_signed_lease_v1(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$
      SELECT exists(SELECT 1 FROM public.contract_documents WHERE company_id=$1 AND contract_id=$2
        AND document_type='signed_contract' AND nullif(btrim(file_path),'') IS NOT NULL
        AND legal_identity_match_status='matched' AND legal_evidence_state='active') $$;
    CREATE FUNCTION public.check_contract_identity_verified_v1(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;`);
  const baseline=(await read('../../supabase/migrations/20260727013000_require_legal_transfer_readiness_wizard.sql')).replace(/\r\n/g,'\n');
  const start=baseline.indexOf('CREATE OR REPLACE FUNCTION public.complete_legal_transfer_readiness_v1(');
  const end=baseline.indexOf('\n$$;',start);assert.ok(start>=0&&end>start);
  await db.exec(baseline.slice(start,end+4).replace('public.complete_legal_transfer_readiness_v1(',
    'public.complete_legal_transfer_readiness_v1_pre_pdf_request_agent('));
  // Explicit forwarding fixture, not a test of the document-request wrappers.
  await db.exec(`CREATE FUNCTION public.complete_legal_transfer_readiness_v1(uuid,uuid,jsonb,uuid) RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER AS $$ SELECT public.complete_legal_transfer_readiness_v1_pre_pdf_request_agent($1,$2,$3,$4) $$;`);
  await loadFunction('../../supabase/migrations/20260831180500_harden_scoped_legal_readiness_authorization.sql','complete_legal_transfer_readiness_with_scope_v1');
  await loadFunction('../../supabase/migrations/20260901090230_unify_legal_claim_engine_and_cancelled_collection.sql','complete_legal_transfer_readiness_v2');
  await db.exec((await read(`../../supabase/migrations/${completionIntegration}.sql`)).replace(/^BEGIN;|^COMMIT;/gm,''));
  await rows("INSERT INTO contract_documents(company_id,contract_id,document_type,file_path) VALUES($1,$2,'signed_contract','signed.pdf')",[company,contract]);
}
const completeReadiness=async(scope='full_outstanding',payload={})=>(await rows(
  'SELECT public.complete_legal_transfer_readiness_v2($1,$2,$3::jsonb,$4,$5) value',
  [company,contract,JSON.stringify({financial_reviewed:true,violations_reviewed:true,vehicle_returned:true,...payload}),scope,customer]))[0].value;
async function installSystemReview() {
  await installCompletionCommand();
  await db.exec(`ALTER TABLE contracts ADD COLUMN vehicle_id uuid, ADD COLUMN updated_at timestamptz DEFAULT now();
    ALTER TABLE customers ADD COLUMN phone text, ADD COLUMN updated_at timestamptz DEFAULT now();
    ALTER TABLE invoices ADD COLUMN updated_at timestamptz DEFAULT now();
    CREATE TABLE legal_transfer_employee_reviews(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,contract_id uuid NOT NULL,customer_id uuid NOT NULL,
      assigned_to_profile_id uuid,requested_by uuid NOT NULL,reviewed_by uuid,overridden_by uuid,status text NOT NULL DEFAULT 'pending',
      request_reason text,employee_decision text,employee_notes text,override_reason text,checklist jsonb NOT NULL DEFAULT '{}',
      corrected_fields jsonb NOT NULL DEFAULT '{}',request_snapshot jsonb NOT NULL DEFAULT '{}',approval_snapshot jsonb NOT NULL DEFAULT '{}',
      requested_at timestamptz NOT NULL DEFAULT now(),due_at timestamptz NOT NULL DEFAULT now(),responded_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());`);
  await rows('UPDATE contracts SET vehicle_id=$1 WHERE id=$2',[other,contract]);
  await rows("INSERT INTO customers(id,company_id,phone) VALUES($1,$2,'70000000')",[customer,company]);
  const source=(await read('../../supabase/migrations/20260902155000_automate_legal_transfer_system_verification.sql')).replace(/\r\n/g,'\n');
  const start=source.indexOf('CREATE OR REPLACE FUNCTION public.auto_verify_legal_transfer_review_v1(');
  const end=source.indexOf('\n$function$;',start);assert.ok(start>0&&end>start);
  await db.exec(source.slice(start,end+12));
  // The same service-only ACL deployed by 20260902162000. A test-only forwarding
  // definer simulates its guarded conversion caller, NOT the real conversion graph.
  await db.exec(`REVOKE ALL ON FUNCTION public.auto_verify_legal_transfer_review_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
    GRANT EXECUTE ON FUNCTION public.auto_verify_legal_transfer_review_v1(uuid,uuid,uuid) TO service_role;
    CREATE FUNCTION public.fixture_conversion_review(uuid,uuid,uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
      SELECT to_jsonb(public.auto_verify_legal_transfer_review_v1($1,$2,$3)) $$;
    REVOKE ALL ON FUNCTION public.fixture_conversion_review(uuid,uuid,uuid) FROM PUBLIC,anon;
    GRANT EXECUTE ON FUNCTION public.fixture_conversion_review(uuid,uuid,uuid) TO authenticated,service_role;`);
  await db.exec((await read(`../../supabase/migrations/${systemReviewIntegration}.sql`)).replace(/^BEGIN;|^COMMIT;/gm,''));
}
const systemReview=async()=>(await rows('SELECT public.fixture_conversion_review($1,$2,$3) value',[company,contract,customer]))[0].value;
async function installConversionGraph() {
  await installSystemReview();
  await db.exec(`ALTER TABLE customers ADD COLUMN email text;
    CREATE TABLE vehicles(id uuid,company_id uuid,plate_number text);
    ALTER TABLE contract_operations_log ADD COLUMN old_values jsonb,ADD COLUMN new_values jsonb;
    ALTER TABLE legal_cases ALTER COLUMN id SET DEFAULT gen_random_uuid(),ALTER COLUMN created_at SET DEFAULT now(),
      ALTER COLUMN workflow_stage SET DEFAULT 'preparation',
      ADD COLUMN case_title text,ADD COLUMN case_title_ar text,ADD COLUMN case_type text,ADD COLUMN priority text,
      ADD COLUMN client_id uuid,ADD COLUMN client_name text,ADD COLUMN client_phone text,ADD COLUMN client_email text,
      ADD COLUMN case_value numeric,ADD COLUMN description text,ADD COLUMN notes text,ADD COLUMN legal_fees numeric,
      ADD COLUMN court_fees numeric,ADD COLUMN other_expenses numeric,ADD COLUMN total_costs numeric,
      ADD COLUMN billing_status text,ADD COLUMN is_confidential boolean,ADD COLUMN legal_team jsonb,ADD COLUMN tags jsonb,
      ADD COLUMN filing_date date,ADD COLUMN created_by uuid,ADD COLUMN claim_calculation_version text,
      ADD COLUMN claim_calculated_at timestamptz,ADD COLUMN updated_at timestamptz DEFAULT now();
    ALTER TABLE legal_case_litigation_profile ADD COLUMN case_id uuid,ADD COLUMN created_by uuid,
      ADD COLUMN notes text,ADD COLUMN updated_at timestamptz DEFAULT now(),ADD UNIQUE(company_id,contract_id);
    CREATE TABLE legal_claim_snapshots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,contract_id uuid NOT NULL,
      case_id uuid,snapshot_type text NOT NULL,version integer NOT NULL,claim_scope text NOT NULL,as_of_date date NOT NULL,
      cutoff_date date NOT NULL,vehicle_custody text NOT NULL,contract_status text NOT NULL,total_amount numeric NOT NULL,
      breakdown jsonb NOT NULL,created_by uuid,created_at timestamptz NOT NULL DEFAULT now());
    CREATE FUNCTION public.generate_legal_case_number(uuid) RETURNS text LANGUAGE sql AS $$SELECT 'FIXTURE-'||gen_random_uuid()::text$$;
    CREATE FUNCTION public.convert_contract_to_legal_with_scope_v1(uuid,uuid,text,text,text,boolean,text,uuid) RETURNS jsonb
      LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Active conversion side effects are not implemented in this fixture'; END$$;`);
  await rows("INSERT INTO vehicles VALUES($1,$2,'TEST')",[other,company]);
  await loadFunction('../../supabase/migrations/20260901100500_harden_unified_legal_claim_engine.sql','freeze_legal_claim_snapshot_v1');
  await loadFunction('../../supabase/migrations/20260901090230_unify_legal_claim_engine_and_cancelled_collection.sql','convert_contract_to_legal_collection_v2');
  // Optional diagnostic mode exercises the current deployed baseline; it is
  // expected to fail defect regressions, not a passing CI certificate.
  if(process.env.LEGAL_CONVERSION_BASELINE!=='1') {
    await db.exec((await read(`../../supabase/migrations/${conversionIntegration}.sql`)).replace(/^BEGIN;|^COMMIT;/gm,''));
  }
}
const convert=async(scope='full_outstanding')=>(await rows(
  'SELECT public.convert_contract_to_legal_collection_v2($1,$2,$3,$4,$5,$6,$7,$8) value',
  [company,contract,'Fixture only','high','payment_collection',true,scope,customer]))[0].value;
const freeze=async(actor=customer,type='manual_review',caseId=null)=>(await rows(
  "SELECT to_jsonb(public.freeze_legal_claim_snapshot_v1($1,$2,$3,$4,'2026-09-04','full_outstanding',ARRAY[]::uuid[],$5)) value",
  [company,contract,caseId,type,actor]))[0].value;

describe('canonical recorded-rent integration through public v3/v4',()=>{
  before(async()=>{
    db=new PGlite();const audit=await read('./legal-claim-source-audit.test.mjs');
    const schemas=[...audit.matchAll(/await db\.exec\(`(CREATE ROLE[\s\S]*?)`\);/g)];assert.equal(schemas.length,1);
    await db.exec(schemas[0][1]);
    await db.exec(`ALTER TABLE penalties ADD COLUMN id uuid, ADD COLUMN customer_id uuid, ADD COLUMN responsibility_party text,
      ADD COLUMN responsible_customer_id uuid, ADD COLUMN customer_payment_status text DEFAULT 'unpaid',
      ADD COLUMN penalty_number text, ADD COLUMN penalty_date date DEFAULT '2026-08-01', ADD COLUMN vehicle_id uuid;
      CREATE TABLE traffic_violations(id uuid DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,
        vehicle_id uuid,responsible_customer_id uuid,violation_number text,violation_date date,fine_amount numeric,
        responsibility_party text,status text);
      CREATE TABLE traffic_violation_payments(id uuid DEFAULT gen_random_uuid(),company_id uuid,traffic_violation_id uuid,amount numeric,status text);`);
    await db.exec(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('fixture.uid',true),'')::uuid $$;
      CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('role',current_setting('fixture.role',true)) $$;
      CREATE OR REPLACE FUNCTION public.get_user_company_id() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('fixture.company',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;`);
    await loadFunction('../../supabase/migrations/20260831113000_fix_legal_claim_invoice_component_double_count.sql','calculate_legal_claim_breakdown_v3');
    await loadFunction('../../supabase/migrations/20260901090230_unify_legal_claim_engine_and_cancelled_collection.sql','calculate_legal_claim_statement_v4');
    await db.exec(await read('../../supabase/migrations/20260903222544_canonical_rental_month_summary.sql'));
    await db.exec(await read('../../supabase/migrations/20260904023524_canonical_legal_recorded_obligations.sql'));
    await db.exec(await read(`../../supabase/migrations/${integration}.sql`));
  });
  after(async()=>db?.close());
  beforeEach(async()=>{
    await db.exec("BEGIN; SET LOCAL fixture.role='service_role'");
    await rows("INSERT INTO contracts VALUES($1,$2,$3,'TEST','2026-01-01','2026-12-31','under_legal_procedure',1500,true,0)",[contract,company,customer]);
    await rows(`INSERT INTO invoices VALUES($1,$2,$3,$4,'2026-08-01','2026-08-01','2026-08-01','RENT','sales',null,1500,0,1500,'unpaid','sent')`,[invoice,company,contract,customer]);
    await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,paid_amount,status,invoice_id) VALUES($1,$2,'2026-08-01',1500,0,'pending',$3)",[company,contract,invoice]);
  });
  afterEach(async()=>db.exec('ROLLBACK; RESET ROLE'));
  it('routes both public calculators through the shared recorded source',async()=>{
    const r=await claim();assert.equal(r.components.rent_due,1500);assert.equal(r.total,1500);
    assert.equal(r.calculation_source,'canonical_recorded_rows_v5');assert.equal('_breakdown' in r,false);
    assert.equal((await breakdown()).recorded_due_amount,1500);
  });
  it('counts a real partial payment instead of stale invoice cache in both APIs',async()=>{
    await pay(500);assert.equal((await claim()).components.rent_due,1000);
    assert.equal((await breakdown()).recorded_due_amount,1000);
  });
  it('restores rental debt for cancelled receipt with stale zero balance',async()=>{
    await pay(1500,'cancelled');await db.exec("UPDATE invoices SET paid_amount=1500,balance_due=0,payment_status='paid'");
    assert.equal((await claim()).total,1500);
  });
  it('recognizes service-typed rent in both the calculation and invoice audit',async()=>{
    await db.exec("UPDATE invoices SET invoice_type='service'");const r=await claim();
    assert.equal(r.total,1500);assert.equal(r.included_invoices[0].id,invoice);
  });
  it('does not add receipt fee to rental principal',async()=>{
    const id=await pay(620);await rows(`INSERT INTO payment_allocations(company_id,payment_id,target_id,allocation_type,amount,is_active)
      VALUES($1,$2,$3,'invoice',500,true),($1,$2,$4,'late_fee',120,true)`,[company,id,invoice,other]);
    assert.equal((await claim()).total,1000);
  });
  it('blocks a rental schedule incorrectly linked to a TV invoice instead of making a rent claim',async()=>{
    await db.exec("UPDATE invoices SET invoice_number=' tv-123 '");
    await assert.rejects(claim(),e=>e.hint==='LEGAL_CLAIM_RECONCILIATION_REQUIRED'&&e.detail.includes('schedule_linked_to_traffic'));
  });
  it('applies the same return cutoff to total and included invoices',async()=>{
    await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_returned_at,vehicle_custody) VALUES($1,$2,'2026-07-15','returned')",[company,contract]);
    const r=await claim();assert.equal(r.cutoff_date,'2026-07-15');assert.equal(r.total,0);
    assert.deepEqual(r.included_invoices,[]);assert.equal((await breakdown()).recorded_due_amount,0);
  });
  it('does not let a post-cutoff invoice exclusion erase earlier unpaid rent',async()=>{
    await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_returned_at) VALUES($1,$2,'2026-07-15')",[company,contract]);
    await rows(`INSERT INTO invoices(id,company_id,contract_id,customer_id,invoice_month,invoice_date,due_date,invoice_number,invoice_type,total_amount,status,payment_status)
      VALUES($1,$2,$3,$4,'2026-07-01','2026-07-01','2026-07-01','EARLIER','sales',500,'sent','unpaid')`,[other,company,contract,customer]);
    const r=await claim([invoice]);assert.equal(r.total,500);assert.equal(r.excluded_amounts.manual_invoice_exclusions,0);
    assert.deepEqual(r.excluded_invoices,[]);assert.equal(r.included_invoices[0].id,other);
  });
  it('preserves evidenced post-termination retention without rewinding all clocks',async()=>{
    // Unlike the empty-evidence baseline, settle a real invoice so zero recorded
    // rent is provable rather than bypassing the missing-evidence safeguard.
    await db.exec("UPDATE invoices SET invoice_month='2026-07-01',invoice_date='2026-07-01'; UPDATE contract_payment_schedules SET due_date='2026-07-01'; UPDATE contracts SET end_date='2026-07-31',vehicle_returned=false");
    await pay(1500);
    await rows(`INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_custody,termination_date,termination_date_status,
      retention_daily_rate,retention_rate_source,retention_rate_source_ref,retention_rate_source_document_id)
      VALUES($1,$2,'with_defendant','2026-08-15','confirmed',10,'signed_contract','TEST-CLAUSE',$3)`,[company,contract,other]);
    assert.equal((await claim()).components.retention,200);assert.equal((await breakdown()).retention_amount,200);
  });
  it('computes per-invoice compensation from included outstanding rows after exclusion',async()=>{
    await compensate();const before=await claim();assert.equal(before.components.contractual_compensation,10);
    const after=await claim([invoice]);assert.equal(after.components.rent_due,0);
    assert.equal(after.components.contractual_compensation,0);assert.equal(after.total,0);
    assert.equal(after.excluded_amounts.manual_invoice_exclusions,1500);
  });
  for(const method of ['daily','monthly','per_invoice']) it(`does not charge ${method} compensation on settled rent`,async()=>{
    await compensate(method);await pay(1500);const r=await claim();assert.equal(r.components.contractual_compensation,0);
  });
  it('manual exclusion deducts remaining rent only once',async()=>{
    await pay(500);const r=await claim([invoice,invoice]);assert.equal(r.total,0);
    assert.equal(r.excluded_amounts.manual_invoice_exclusions,1000);assert.equal(r.excluded_invoices.length,1);
  });
  it('refuses unlinked cached schedule debt before callers can coalesce it to zero',async()=>{
    await db.exec('DELETE FROM invoices; UPDATE contract_payment_schedules SET invoice_id=NULL');
    await assert.rejects(breakdown(),e=>e.hint==='LEGAL_CLAIM_RECONCILIATION_REQUIRED');
  });
  it('allows an active authenticated company member through the public facade without raw helper grants',async()=>{
    await auth();assert.equal((await claim()).total,1500);
    await assert.rejects(rows('SELECT public.canonical_legal_recorded_obligations_v1($1,$2,$3)',[company,contract,'2026-09-04']),/permission denied/);
  });
  for(const options of [{tenant:other},{active:false},{profile:false},{user:null,profile:false}]) it(`rejects unauthorized scope ${JSON.stringify(options)}`,async()=>{
    await auth(options);await assert.rejects(claim(),e=>e.code==='42501');
  });
  it('does not trust user_metadata company/role claims',async()=>{
    await db.exec(`CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"role":"authenticated","user_metadata":{"role":"service_role"}}'::jsonb $$`);
    await auth({profile:false});await assert.rejects(claim(),e=>e.code==='42501');
  });
  it('denies anonymous public and private gateway calls',async()=>{
    await db.exec('SET LOCAL ROLE anon');await assert.rejects(claim(),/permission denied/);
  });
  it('does not expose the private raw calculator to authenticated callers',async()=>{
    await auth();await assert.rejects(rows("SELECT legal_claim_internal.calculate_breakdown_rows_v5($1,$2,'2026-09-04','{}','{}')",[company,contract]),/permission denied/);
  });
  it('keeps public entry points SECURITY INVOKER',async()=>{
    const functions=await rows("SELECT proname,prosecdef FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('calculate_legal_claim_breakdown_v3','calculate_legal_claim_statement_v4')");
    assert.equal(functions.length,2);assert.ok(functions.every(f=>f.prosecdef===false));
  });
  it('rejects applying the migration to a changed baseline instead of patching unknown financial SQL',async()=>{
    const rollback=(await read(`../../supabase/rollbacks/${integration}.rollback.sql`)).replace(/^BEGIN;|^COMMIT;/gm,'');
    await db.exec(rollback);
    await db.exec(`CREATE OR REPLACE FUNCTION public.calculate_legal_claim_breakdown_v3(
      p_company_id uuid,p_contract_id uuid,p_as_of_date date DEFAULT CURRENT_DATE)
      RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER AS $$SELECT '{}'::jsonb$$`);
    const migration=(await read(`../../supabase/migrations/${integration}.sql`)).replace(/^BEGIN;|^COMMIT;/gm,'');
    await assert.rejects(db.exec(migration),/changed since source audit/);
  });
  it('schema rollback restores exact baseline bodies and preserves financial rows',async()=>{
    await pay(500);const before=await rows('SELECT to_jsonb(i) value FROM invoices i');
    const rollback=(await read(`../../supabase/rollbacks/${integration}.rollback.sql`)).replace(/^BEGIN;|^COMMIT;/gm,'');
    await db.exec(rollback);
    assert.equal((await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE oid='public.calculate_legal_claim_breakdown_v3(uuid,uuid,date)'::regprocedure"))[0].hash,'4a27cf9dcd1bfd202ffb80834de3f1a9');
    assert.equal((await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE oid='public.calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[])'::regprocedure"))[0].hash,'36b78342a4ecc47adcdc6f9c5825f641');
    assert.deepEqual(await rows('SELECT to_jsonb(i) value FROM invoices i'),before);
  });
  it('uses partial invoice settlement, not the full penalty amount',async()=>{
      await rows(`INSERT INTO penalties(id,company_id,contract_id,customer_id,amount,status,payment_status,responsibility_party)
        VALUES($1,$2,$3,$4,500,'active','unpaid','customer')`,[other,company,contract,customer]);
      await rows(`INSERT INTO invoices(id,company_id,contract_id,customer_id,invoice_month,invoice_date,due_date,invoice_number,
        invoice_type,penalty_id,total_amount,status,payment_status)
        VALUES($1,$2,$3,$4,'2026-08-01','2026-08-01','2026-08-01','TV-TEST','service',$1,500,'sent','unpaid')`,[other,company,contract,customer]);
      await rows(`INSERT INTO payments(company_id,customer_id,contract_id,invoice_id,amount,payment_status,payment_date,transaction_type)
        VALUES($1,$2,$3,$4,200,'completed','2026-09-02','receipt')`,[company,customer,contract,other]);
      await rows("INSERT INTO contract_documents(company_id,contract_id,document_type,file_path) VALUES($1,$2,'violations_proof','proof.pdf')",[company,contract]);
      const r=await claim([],'traffic_violations_only');assert.equal(r.components.traffic_violations,300);
      assert.equal((await breakdown()).violations_amount,300);
    });
  it('excludes a company-responsibility penalty from customer claim',async()=>{
      await rows(`INSERT INTO penalties(id,company_id,contract_id,customer_id,amount,status,payment_status,responsibility_party)
        VALUES($1,$2,$3,$4,500,'active','unpaid','company')`,[other,company,contract,customer]);
      await rows("INSERT INTO contract_documents(company_id,contract_id,document_type,file_path) VALUES($1,$2,'violations_proof','proof.pdf')",[company,contract]);
      assert.equal((await claim([],'traffic_violations_only')).total,0);
      assert.equal((await breakdown()).violations_amount,0);
    });
  it('restores traffic debt after cancelling receipt despite both paid caches',async()=>{
    await traffic({customerState:'paid'});await trafficReceipt(500,'cancelled');
    await db.exec("UPDATE invoices SET paid_amount=500,balance_due=0,payment_status='paid' WHERE penalty_id IS NOT NULL; UPDATE penalties SET payment_status='paid'");
    assert.equal((await claim([],'traffic_violations_only')).total,500);
    assert.equal((await breakdown()).violations_amount,500);
  });
  it('does not count a fully settled traffic invoice again as an unpaid penalty',async()=>{
    await traffic();await trafficReceipt(500);const r=await claim([],'traffic_violations_only');
    assert.equal(r.total,0);assert.equal(r.violation_count,0);
  });
  it('supports explicitly unpaid standalone customer penalties after invoice generation retirement',async()=>{
    await traffic({withInvoice:false});assert.equal((await claim([],'traffic_violations_only')).total,500);
    assert.equal((await breakdown()).violations_amount,500);
  });
  it('does not subtract company government disbursement from customer receivable',async()=>{
    await traffic({withInvoice:false});await rows("INSERT INTO traffic_violation_payments(company_id,traffic_violation_id,amount,status) VALUES($1,$2,500,'completed')",[company,other]);
    await db.exec("UPDATE penalties SET payment_status='paid'");
    assert.equal((await claim([],'traffic_violations_only')).total,500);
  });
  for(const state of ['paid','partially_paid',null]) it(`requires receipt evidence for standalone customer state ${state}`,async()=>{
    await traffic({withInvoice:false,customerState:state});
    await assert.rejects(claim(),e=>e.hint==='LEGAL_TRAFFIC_RECONCILIATION_REQUIRED'&&e.detail.includes('missing_customer_receipt_evidence'));
  });
  it('matches TV-only references by exact penalty UUID without duplicating the penalty',async()=>{
    await traffic();await rows("UPDATE invoices SET penalty_id=NULL,invoice_number=' TV-'||$1||' ' WHERE id=$1::uuid",[other]);
    await trafficReceipt(200);assert.equal((await claim([],'traffic_violations_only')).total,300);
  });
  it('flags a TV-only invoice with no matching penalty instead of guessing its responsibility',async()=>{
    await traffic();await db.exec('DELETE FROM penalties');
    await assert.rejects(claim(),e=>e.hint==='LEGAL_TRAFFIC_RECONCILIATION_REQUIRED'&&e.detail.includes('unmatched_traffic_invoice'));
  });
  for(const party of ['company','cancelled']) it(`excludes ${party} traffic responsibility even with a linked unpaid invoice`,async()=>{
    await traffic({party});assert.equal((await claim([],'traffic_violations_only')).total,0);
    assert.equal((await claim()).total,1500);
  });
  it('does not collect cancelled penalties with stale active invoices',async()=>{
    await traffic();await db.exec("UPDATE penalties SET status='cancelled'");
    assert.equal((await claim([],'traffic_violations_only')).total,0);
  });
  it('requires explicit customer responsibility before adding a penalty to a claim',async()=>{
    await traffic({party:'under_review'});
    await assert.rejects(claim(),e=>e.hint==='LEGAL_TRAFFIC_RECONCILIATION_REQUIRED'&&e.detail.includes('unknown_penalty_responsibility'));
  });
  it('rejects a penalty assigned to a different responsible customer',async()=>{
    await traffic();await rows('UPDATE penalties SET responsible_customer_id=$1',[other]);
    await assert.rejects(claim(),e=>e.detail.includes('penalty_customer_mismatch'));
  });
  it('rejects duplicate traffic invoices instead of summing them twice',async()=>{
    await traffic();await db.exec(`INSERT INTO invoices(company_id,contract_id,customer_id,invoice_month,invoice_date,due_date,invoice_number,invoice_type,penalty_id,total_amount,status,payment_status)
      SELECT company_id,contract_id,customer_id,invoice_month,invoice_date,due_date,'DUP-TV',invoice_type,penalty_id,total_amount,status,payment_status FROM invoices WHERE penalty_id IS NOT NULL`);
    await assert.rejects(claim(),e=>e.detail.includes('duplicate_penalty_invoices'));
  });
  it('rejects an invoice/penalty principal mismatch',async()=>{
    await traffic();await db.exec('UPDATE invoices SET total_amount=600 WHERE penalty_id IS NOT NULL');
    await assert.rejects(claim(),e=>e.detail.includes('penalty_invoice_amount_mismatch'));
  });
  it('does not reconstruct full debt from a cancelled invoice and an unpaid penalty cache',async()=>{
    await traffic();await db.exec("UPDATE invoices SET status='cancelled' WHERE penalty_id IS NOT NULL");
    await assert.rejects(claim(),e=>e.detail.includes('missing_or_mislinked_active_traffic_invoice'));
  });
  it('uses only allocated traffic principal from a receipt spanning rent, traffic and fees',async()=>{
    await traffic();const id=await trafficReceipt(820);
    await rows(`INSERT INTO payment_allocations(company_id,payment_id,target_id,allocation_type,amount,is_active)
      VALUES($1,$2,$3,'invoice',500,true),($1,$2,$4,'invoice',200,true),($1,$2,$4,'late_fee',120,true)`,[company,id,invoice,other]);
    const r=await claim();assert.equal(r.components.rent_due,1000);assert.equal(r.components.traffic_violations,300);
    assert.equal(r.total,1300);assert.equal((await breakdown()).total,1300);
  });
  for(const proof of [null,'   ']) it(`does not add traffic amounts without usable proof (${proof})`,async()=>{
    await traffic({proof});const r=await claim();assert.equal(r.components.traffic_violations,0);
    assert.equal(r.violations_proof_ready,false);assert.equal((await breakdown()).violations_amount,0);
  });
  it('does not include a future traffic event in current claim',async()=>{
    await traffic();await db.exec("UPDATE penalties SET penalty_date='2026-10-01'");
    assert.equal((await claim([],'traffic_violations_only')).total,0);
  });
  it('rejects raw traffic-source access by authenticated callers',async()=>{
    await auth();await assert.rejects(rows("SELECT legal_claim_internal.read_traffic_obligations_v5($1,$2,'2026-09-04')",[company,contract]),/permission denied/);
  });
  it('does not use proof belonging to a different company',async()=>{
    await traffic({proof:null});await rows("INSERT INTO contract_documents(company_id,contract_id,document_type,file_path) VALUES($1,$2,'violations_proof','other-proof.pdf')",[other,contract]);
    assert.equal((await claim([],'traffic_violations_only')).total,0);
  });
  it('does not accept a linked invoice from another company as standalone unpaid evidence',async()=>{
    await traffic();await rows('UPDATE invoices SET company_id=$1 WHERE penalty_id IS NOT NULL',[other]);
    await assert.rejects(claim(),e=>e.detail.includes('missing_or_mislinked_active_traffic_invoice'));
  });
  it('ignores an unrelated company penalty with the same contract ID',async()=>{
    await traffic({withInvoice:false});await rows('UPDATE penalties SET company_id=$1',[other]);
    assert.equal((await claim()).total,1500);
  });
  it('does not silently collect a duplicated standalone penalty reference',async()=>{
    await traffic({withInvoice:false});await db.exec("UPDATE penalties SET penalty_number='TEST-REFERENCE'");
    await rows(`INSERT INTO penalties(id,company_id,contract_id,customer_id,amount,status,payment_status,responsibility_party,customer_payment_status,penalty_number)
      VALUES($1,$2,$3,$4,500,'confirmed','unpaid','customer','unpaid','TEST-REFERENCE')`,[invoice,company,contract,customer]);
    await assert.rejects(claim(),e=>e.detail.includes('duplicate_penalty_reference'));
  });
  it('rejects invalid customer receipt identity on traffic allocation',async()=>{
    await traffic();const id=await trafficReceipt(200);await rows('UPDATE payments SET customer_id=$1 WHERE id=$2',[other,id]);
    await assert.rejects(claim(),e=>e.detail.includes('invalid_traffic_invoice_or_payment'));
  });
  it('keeps the traffic component when rental invoices are manually excluded',async()=>{
    await traffic();await trafficReceipt(200);const r=await claim([invoice]);
    assert.equal(r.components.rent_due,0);assert.equal(r.components.traffic_violations,300);assert.equal(r.total,300);
  });
  it('includes an independent traffic_violations obligation rather than dropping the second source',async()=>{
    await traffic({withInvoice:false});await db.exec('DELETE FROM penalties');await legacyTraffic();
    const r=await claim([],'traffic_violations_only');assert.equal(r.total,500);assert.equal(r.violation_count,1);
    assert.equal((await breakdown()).violations_amount,500);
  });
  it('collapses exactly matching source copies to one obligation',async()=>{
    await matchingSources();const r=await claim([],'traffic_violations_only');
    assert.equal(r.total,500);assert.equal(r.violation_count,1);
  });
  it('matches source identity after trim/case normalization',async()=>{
    await matchingSources({reference:' shared-ref '});assert.equal((await claim([],'traffic_violations_only')).total,500);
  });
  it('does not merge independent references merely because date, vehicle and amount match',async()=>{
    await matchingSources({reference:'DIFFERENT-REF'});const r=await claim([],'traffic_violations_only');
    assert.equal(r.total,1000);assert.equal(r.violation_count,2);
  });
  for(const options of [{amount:600},{date:'2026-08-02'},{party:'company'},
    {responsibleCustomer:other},{assignedContract:other},{vehicle:other},{state:'cancelled'}]) {
    it(`blocks conflicting copies instead of choosing a source: ${JSON.stringify(options)}`,async()=>{
      await matchingSources(options);
      await assert.rejects(claim(),e=>e.hint==='LEGAL_TRAFFIC_RECONCILIATION_REQUIRED'&&e.detail.includes('cross_source_violation_conflict'));
    });
  }
  it('does not hide responsibility conflict behind a company-responsibility canonical row',async()=>{
    await matchingSources();await db.exec("UPDATE penalties SET responsibility_party='company'");
    await assert.rejects(claim(),e=>e.detail.includes('cross_source_violation_conflict'));
  });
  it('does not hide a cancelled canonical row when its mirror is still active',async()=>{
    await matchingSources();await db.exec("UPDATE penalties SET status='cancelled'");
    await assert.rejects(claim(),e=>e.detail.includes('cross_source_violation_conflict'));
  });
  it('counts no claim when both copies agree that the company is responsible',async()=>{
    await matchingSources({party:'company'});await db.exec("UPDATE penalties SET responsibility_party='company'");
    assert.equal((await claim([],'traffic_violations_only')).total,0);
  });
  it('does not merge a same-UUID collision with conflicting external reference',async()=>{
    await matchingSources({id:other,reference:'COLLIDING-ID'});
    await assert.rejects(claim(),e=>e.detail.includes('cross_source_violation_conflict'));
  });
  it('retains customer settlement from the legacy UUID invoice alias after merging',async()=>{
    await matchingSources();await rows(`INSERT INTO invoices(id,company_id,contract_id,customer_id,invoice_month,invoice_date,due_date,invoice_number,
      invoice_type,total_amount,status,payment_status)
      VALUES($1,$2,$3,$4,'2026-08-01','2026-08-01','2026-08-01','TV-'||$5,'service',500,'sent','unpaid')`,[other,company,contract,customer,legacy]);
    await trafficReceipt(200);const r=await claim([],'traffic_violations_only');assert.equal(r.total,300);assert.equal(r.violation_count,1);
  });
  it('does not count two mirrored invoices as two obligations after merging',async()=>{
    await matchingSources();await rows(`INSERT INTO invoices(company_id,contract_id,customer_id,invoice_month,invoice_date,due_date,invoice_number,invoice_type,total_amount,status,payment_status)
      VALUES($1,$2,$3,'2026-08-01','2026-08-01','2026-08-01','TV-'||$4,'service',500,'sent','unpaid'),
      ($1,$2,$3,'2026-08-01','2026-08-01','2026-08-01','TV-'||$5,'service',500,'sent','unpaid')`,[company,contract,customer,other,legacy]);
    await assert.rejects(claim(),e=>e.detail.includes('duplicate_penalty_invoices'));
  });
  it('requires review when cross-source identity is one-to-many rather than uniquely matched',async()=>{
    await matchingSources();await legacyTraffic({id:invoice});
    await assert.rejects(claim(),e=>e.detail.includes('cross_source_violation_conflict'));
  });
  it('does not drop paid-by-authority legacy obligations from customer debt',async()=>{
    await traffic({withInvoice:false});await db.exec('DELETE FROM penalties');await legacyTraffic({state:'paid'});
    await rows("INSERT INTO traffic_violation_payments(company_id,traffic_violation_id,amount,status) VALUES($1,$2,500,'completed')",[company,legacy]);
    assert.equal((await claim([],'traffic_violations_only')).total,500);
  });
  it('does not merge another company mirror into the current obligation',async()=>{
    await matchingSources({tenant:other,amount:600});assert.equal((await claim([],'traffic_violations_only')).total,500);
  });
  it('deduplicates an identity edge matching both UUID and reference',async()=>{
    await matchingSources({id:other});const r=await claim([],'traffic_violations_only');
    assert.equal(r.total,500);assert.equal(r.violation_count,1);
  });
  for(const source of ['penalties','traffic_violations']) {
    for(const scenario of [
      {name:'company copy',party:'company',state:'pending',assignedContract:contract},
      {name:'cancelled copy',party:'customer',state:'cancelled',assignedContract:contract},
      {name:'other-contract copy',party:'customer',state:'pending',assignedContract:other},
      {name:'company row with other-contract customer copy',party:'customer',state:'pending',assignedContract:other,originalParty:'company'},
    ]) it(`blocks ${source} duplicate reference with ${scenario.name}`,async()=>{
      await traffic({withInvoice:false,party:scenario.originalParty??'customer'});
      if(source==='penalties') {
        await db.exec("UPDATE penalties SET penalty_number='SAME-SOURCE'");
        await rows(`INSERT INTO penalties(id,company_id,contract_id,customer_id,amount,status,responsibility_party,customer_payment_status,penalty_number)
          VALUES($1,$2,$3,$4,500,$5,$6,'unpaid',' same-source ')`,
        [legacy,company,scenario.assignedContract,customer,scenario.state,scenario.party]);
      } else {
        await db.exec('DELETE FROM penalties');
        await legacyTraffic({party:scenario.originalParty??'customer'});
        await legacyTraffic({id:other,party:scenario.party,state:scenario.state,assignedContract:scenario.assignedContract});
      }
      await assert.rejects(claim(),e=>e.hint==='LEGAL_TRAFFIC_RECONCILIATION_REQUIRED'&&e.detail.includes('duplicate_penalty_reference'));
    });
    it(`does not create customer debt from ${source} copies both assigned to the company`,async()=>{
      await traffic({withInvoice:false,party:'company'});
      if(source==='penalties') {
        await db.exec("UPDATE penalties SET penalty_number='SAME-SOURCE'");
        await rows(`INSERT INTO penalties(id,company_id,contract_id,amount,status,responsibility_party,penalty_number)
          VALUES($1,$2,$3,500,'pending','company','SAME-SOURCE')`,[legacy,company,contract]);
      } else {
        await db.exec('DELETE FROM penalties');
        await legacyTraffic({party:'company'});await legacyTraffic({id:other,party:'company'});
      }
      assert.equal((await claim([],'traffic_violations_only')).total,0);
    });
  }
  it('keeps source identity/aliases in the private audit without rewriting either source',async()=>{
    await matchingSources();const before=await rows('SELECT to_jsonb(t) value FROM traffic_violations t');
    const r=(await rows("SELECT legal_claim_internal.read_traffic_obligations_v5($1,$2,'2026-09-04') value",[company,contract]))[0].value;
    assert.equal(r.rows[0].source_type,'penalties');assert.deepEqual(r.rows[0].source_ids,[other,legacy]);
    assert.deepEqual(await rows('SELECT to_jsonb(t) value FROM traffic_violations t'),before);
    assert.equal((await rows('SELECT count(*)::int n FROM penalties'))[0].n,1);
  });
  it('readiness displays the same partial service rent as the claim, not cached sales-only totals',async()=>{
    await installReadinessAdapter();await db.exec("UPDATE invoices SET invoice_type='service'");await pay(500);
    const r=await financialReadiness();assert.equal(r.financial_context.rent_total,1000);
    assert.equal(r.invoices.length,1);assert.equal(r.invoices[0].balance_due,1000);
    assert.equal(r.invoices[0].paid_amount,500);assert.equal(r.invoices[0].can_edit_amount,false);
    assert.equal((await claim()).components.rent_due,r.financial_context.rent_total);
  });
  it('readiness restores cancelled receipt debt despite stale invoice caches',async()=>{
    await installReadinessAdapter();await pay(1500,'cancelled');
    await db.exec("UPDATE invoices SET paid_amount=1500,balance_due=0,payment_status='paid'");
    const r=await financialReadiness();assert.equal(r.invoices[0].balance_due,1500);
    assert.equal(r.invoices[0].can_edit_amount,false);
  });
  it('readiness respects the same return cutoff and excludes future selectable invoices',async()=>{
    await installReadinessAdapter();await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_returned_at) VALUES($1,$2,'2026-07-15')",[company,contract]);
    const r=await financialReadiness();assert.deepEqual(r.invoices,[]);assert.equal(r.financial_context.rent_total,0);
  });
  it('readiness exposes rental review as null, not a fake zero with an empty invoice list',async()=>{
    await installReadinessAdapter();await db.exec('DELETE FROM invoices; UPDATE contract_payment_schedules SET invoice_id=NULL');
    const r=await financialReadiness();assert.equal(r.financial_context.rent_requires_review,true);
    assert.equal(r.financial_context.rent_total,null);assert.ok(r.financial_context.rent_review_reasons.includes('missing_or_unmatched_rental_invoice'));
  });
  it('readiness merges traffic aliases and displays actual customer settlement',async()=>{
    await installReadinessAdapter();await traffic();await db.exec("UPDATE penalties SET penalty_number='SHARED-REF'");await legacyTraffic();await trafficReceipt(200);
    const r=await financialReadiness();assert.equal(r.violations.length,1);assert.equal(r.violations[0].liability_amount,300);
    assert.deepEqual(r.violations[0].source_ids,[other,legacy]);assert.equal(r.financial_context.traffic_total,300);
    assert.equal(r.financial_context.traffic_claim_total,(await claim()).components.traffic_violations);
  });
  for(const state of ['company','settled','cancelled']) it(`readiness preserves zero ${state} liability without requiring proof`,async()=>{
    await installReadinessAdapter();await traffic({party:state==='company'?'company':'customer',proof:null});
    if(state==='settled') await trafficReceipt(500);
    if(state==='cancelled') await db.exec("UPDATE penalties SET status='cancelled'");
    const r=await financialReadiness();assert.equal(r.violations[0].liability_amount,0);
    assert.equal(r.financial_context.traffic_total,0);assert.equal(r.financial_context.traffic_proof_required,false);
    if(state==='company') assert.equal(r.violations[0].responsibility_party,'company');
  });
  it('readiness distinguishes recorded traffic liability from claim amount pending proof',async()=>{
    await installReadinessAdapter();await traffic({proof:null});
    const r=await financialReadiness();assert.equal(r.financial_context.traffic_total,500);
    assert.equal(r.financial_context.traffic_claim_total,0);assert.equal(r.financial_context.traffic_proof_required,true);
    assert.equal(r.violation_proof_ready,false);
  });
  it('readiness exposes conflicting source liabilities as null with review reasons',async()=>{
    await installReadinessAdapter();await matchingSources({party:'company'});
    const r=await financialReadiness();assert.equal(r.financial_context.traffic_requires_review,true);
    assert.equal(r.financial_context.traffic_total,null);assert.equal(r.financial_context.traffic_claim_total,null);
    assert.ok(r.financial_context.traffic_review_reasons.includes('cross_source_violation_conflict'));
    assert.ok(r.violations.every(v=>v.liability_amount===null));
  });
  it('readiness public facade overrides stale v1 finance while preserving document readiness',async()=>{
    await installReadinessAdapter();await auth();
    const r=(await rows('SELECT public.get_legal_transfer_readiness_v2($1,$2) value',[company,contract]))[0].value;
    assert.equal(r.signed_contract_ready,true);assert.deepEqual(r.payments,[]);
    assert.equal(r.financial_context.version,'canonical_legal_readiness_v1');assert.equal(r.violation_proof_ready,false);
    assert.equal((await rows("SELECT prosecdef FROM pg_proc WHERE oid='public.get_legal_transfer_readiness_v2(uuid,uuid)'::regprocedure"))[0].prosecdef,false);
  });
  it('readiness blocks inactive membership before document automation',async()=>{
    await installReadinessAdapter();await auth({active:false});
    await assert.rejects(rows('SELECT public.get_legal_transfer_readiness_v2($1,$2)',[company,contract]),e=>e.code==='42501');
  });
  it('readiness rejects a null permission decision',async()=>{
    await installReadinessAdapter();await db.exec('CREATE OR REPLACE FUNCTION public.can_prepare_contract_for_legal_v1(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$SELECT NULL::boolean$$');
    await assert.rejects(rows('SELECT public.get_legal_transfer_readiness_v2($1,$2)',[company,contract]),e=>e.code==='42501');
  });
  it('readiness denies raw financial adapter access to authenticated users',async()=>{
    await installReadinessAdapter();await auth();await assert.rejects(financialReadiness(),/permission denied/);
  });
  it('readiness rollback restores the exact audited v2 body without changing invoice records',async()=>{
    await installReadinessAdapter();const before=await rows('SELECT to_jsonb(i) value FROM invoices i');
    await db.exec((await read(`../../supabase/rollbacks/${readinessIntegration}.rollback.sql`)).replace(/^BEGIN;|^COMMIT;/gm,''));
    assert.equal((await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE oid='public.get_legal_transfer_readiness_v2(uuid,uuid)'::regprocedure"))[0].hash,'96f660a8b730ac550f12eb184dd297ff');
    assert.deepEqual(await rows('SELECT to_jsonb(i) value FROM invoices i'),before);
  });
  it('completion persists canonical partial traffic principal, not the legacy raw penalty sum',async()=>{
    await installCompletionCommand();await traffic();await trafficReceipt(200);
    const r=await completeReadiness('traffic_violations_only');assert.equal(r.claim_amount,300);
    const saved=(await rows('SELECT operation_details value FROM contract_operations_log'))[0].value;
    assert.equal(saved.claim_amount,300);assert.equal(saved.claim_components.traffic_violations,300);
    assert.equal(saved.claim_amount,saved.claim_statement.total);
  });
  it('completion does not require proof for company-responsibility mirrored rows',async()=>{
    await installCompletionCommand();await matchingSources({party:'company'});
    await db.exec("UPDATE penalties SET responsibility_party='company'; DELETE FROM contract_documents WHERE document_type='violations_proof'");
    const r=await completeReadiness();assert.equal(r.ready,true);assert.equal(r.violation_count,0);assert.equal(r.claim_amount,1500);
  });
  it('completion refuses to silently omit standalone customer traffic without proof',async()=>{
    await installCompletionCommand();await traffic({withInvoice:false,proof:null});
    await assert.rejects(completeReadiness(),e=>e.hint==='LEGAL_TRAFFIC_PROOF_REQUIRED');
  });
  it('completion keeps customer liability after company payment to the authority',async()=>{
    await installCompletionCommand();await traffic({withInvoice:false});await db.exec("UPDATE penalties SET payment_status='paid'");
    const r=await completeReadiness('traffic_violations_only');assert.equal(r.claim_amount,500);
  });
  it('completion recomputes forged amounts even through the directly callable old bottom endpoint',async()=>{
    await installCompletionCommand();await pay(500);
    const r=(await rows('SELECT public.complete_legal_transfer_readiness_v1_pre_pdf_request_agent($1,$2,$3,$4) value',
      [company,contract,{financial_reviewed:true,violations_reviewed:true,vehicle_returned:false,
        claim_amount:99999,claim_statement:{total:99999},violation_count:80,included_invoice_balance:99999,
        accounting_invoice_balance:99999,completed_payments:99999},customer]))[0].value;
    const saved=(await rows('SELECT operation_details value FROM contract_operations_log'))[0].value;
    assert.equal(r.claim_amount,1000);assert.deepEqual(r.claim_statement,saved.claim_statement);
    assert.equal(saved.included_invoice_balance,1000);assert.equal(saved.accounting_invoice_balance,1000);
    assert.equal(saved.vehicle_custody_at_transfer,'with_defendant');assert.equal('completed_payments' in saved,false);
    assert.equal(saved.violation_count,0);
  });
  it('completion restores traffic liability on a cancelled customer receipt',async()=>{
    await installCompletionCommand();await traffic();await trafficReceipt(500,'cancelled');
    await db.exec("UPDATE invoices SET balance_due=0,paid_amount=500,payment_status='paid' WHERE penalty_id IS NOT NULL");
    assert.equal((await completeReadiness('traffic_violations_only')).claim_amount,500);
  });
  it('completion deduplicates invoice exclusions and uses remaining principal once',async()=>{
    await installCompletionCommand();await pay(500);
    const r=await completeReadiness('full_outstanding',{excluded_invoice_ids:[invoice,invoice],
      excluded_invoices:[{invoice_id:invoice,reason:'Reviewed exclusion',balance_due:9000}]});
    const saved=(await rows('SELECT operation_details value FROM contract_operations_log'))[0].value;
    assert.equal(r.claim_amount,0);assert.equal(saved.excluded_invoice_balance,1000);
    assert.deepEqual(saved.excluded_invoice_ids,[invoice]);assert.equal(saved.excluded_invoices[0].amount,1000);
    assert.equal(saved.reported_exclusion_notes[0].reason,'Reviewed exclusion');
  });
  for(const change of ["legal_identity_match_status='mismatched'","legal_evidence_state='superseded'","file_path=' '"]) {
    it(`completion rejects non-current signed evidence: ${change}`,async()=>{
      await installCompletionCommand();await db.exec(`UPDATE contract_documents SET ${change}`);
      await db.exec('SAVEPOINT rejected_completion');
      await assert.rejects(completeReadiness(),e=>e.hint==='LEGAL_VERIFIED_EVIDENCE_REQUIRED');
      await db.exec('ROLLBACK TO SAVEPOINT rejected_completion');
      assert.equal((await rows('SELECT count(*)::int n FROM contract_operations_log'))[0].n,0);
    });
  }
  it('completion rejects an unverified identity returned by the authoritative helper',async()=>{
    await installCompletionCommand();await db.exec('CREATE OR REPLACE FUNCTION public.check_contract_identity_verified_v1(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$SELECT NULL::boolean$$');
    await assert.rejects(completeReadiness(),e=>e.hint==='LEGAL_VERIFIED_EVIDENCE_REQUIRED');
  });
  for(const payload of [{financial_reviewed:'true'},{violations_reviewed:1},{vehicle_returned:'false'},
    {financial_reviewed:null},{excluded_invoice_ids:null},{excluded_invoice_ids:[null]}]) {
    it(`completion rejects malformed confirmations ${JSON.stringify(payload)}`,async()=>{
      await installCompletionCommand();await assert.rejects(completeReadiness('full_outstanding',payload),e=>e.code==='22023');
    });
  }
  it('completion keeps unresolved cross-source traffic out of a ready audit',async()=>{
    await installCompletionCommand();await matchingSources({amount:400});
    await db.exec('SAVEPOINT rejected_completion');
    await assert.rejects(completeReadiness(),e=>e.hint==='LEGAL_TRAFFIC_RECONCILIATION_REQUIRED');
    await db.exec('ROLLBACK TO SAVEPOINT rejected_completion');
    assert.equal((await rows('SELECT count(*)::int n FROM contract_operations_log'))[0].n,0);
  });
  it('completion permits active membership with no direct financial-table grants',async()=>{
    await installCompletionCommand();await auth();assert.equal((await completeReadiness()).claim_amount,1500);
  });
  for(const options of [{tenant:other},{active:false},{active:null},{profile:false},{user:null,profile:false}]) {
    it(`completion rejects unauthorized caller ${JSON.stringify(options)}`,async()=>{
      await installCompletionCommand();await auth(options);await assert.rejects(completeReadiness(),e=>e.code==='42501');
    });
  }
  it('completion rejects null permission decisions before document dispatch',async()=>{
    await installCompletionCommand();await db.exec(`CREATE OR REPLACE FUNCTION public.can_prepare_contract_for_legal_v1(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$SELECT NULL::boolean$$;
      CREATE OR REPLACE FUNCTION public.complete_legal_transfer_readiness_v1(uuid,uuid,jsonb,uuid) RETURNS jsonb LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Document dispatch must not run'; END$$;`);
    await assert.rejects(completeReadiness(),e=>e.code==='42501');
  });
  it('completion rejects a caller-supplied different actor',async()=>{
    await installCompletionCommand();await auth();
    await assert.rejects(rows('SELECT public.complete_legal_transfer_readiness_v2($1,$2,$3,$4,$5)',
      [company,contract,{},'full_outstanding',other]),e=>e.code==='42501');
  });
  it('completion rejects anonymous callers and keeps facades invoker',async()=>{
    await installCompletionCommand();
    const functions=await rows("SELECT prosecdef FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('complete_legal_transfer_readiness_v2','complete_legal_transfer_readiness_with_scope_v1','complete_legal_transfer_readiness_v1_pre_pdf_request_agent')");
    assert.equal(functions.length,3);assert.ok(functions.every(f=>!f.prosecdef));
    await db.exec('SET LOCAL ROLE anon');await assert.rejects(completeReadiness(),/permission denied/);
  });
  it('completion prevents authenticated callers executing unsafe legacy backups',async()=>{
    await installCompletionCommand();await auth();
    await assert.rejects(rows('SELECT legal_claim_internal.legacy_completion_bottom_v1($1,$2,$3,$4)',[company,contract,{},customer]),/permission denied/);
  });
  it('completion preserves the existing document-blocked response without reporting a successful claim',async()=>{
    await installCompletionCommand();await db.exec(`CREATE OR REPLACE FUNCTION public.complete_legal_transfer_readiness_v1(uuid,uuid,jsonb,uuid) RETURNS jsonb
      LANGUAGE sql AS $$ SELECT '{"blocked":true,"message_ar":"Document required"}'::jsonb $$;`);
    const r=await completeReadiness();assert.equal(r.blocked,true);assert.equal('claim_statement' in r,false);
    assert.equal((await rows('SELECT count(*)::int n FROM contract_operations_log'))[0].n,0);
  });
  it('completion rollback restores all three exact audited bodies and preserves audit and financial rows',async()=>{
    await installCompletionCommand();await completeReadiness();
    const invoices=await rows('SELECT to_jsonb(i) value FROM invoices i');
    const log=await rows('SELECT to_jsonb(l) value FROM contract_operations_log l');
    await db.exec((await read(`../../supabase/rollbacks/${completionIntegration}.rollback.sql`)).replace(/^BEGIN;|^COMMIT;/gm,''));
    for(const [name,hash] of [['complete_legal_transfer_readiness_v1_pre_pdf_request_agent','bce8a7542ebc1b3a5cd5585c3dae5cd1'],
      ['complete_legal_transfer_readiness_with_scope_v1','d1c3dc92014e40cc0e292daf87b2eb78'],['complete_legal_transfer_readiness_v2','5284fa39784cfe5d3bb512d784bdacdd']]) {
      assert.equal((await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=$1",[name]))[0].hash,hash);
    }
    assert.deepEqual(await rows('SELECT to_jsonb(i) value FROM invoices i'),invoices);
    assert.deepEqual(await rows('SELECT to_jsonb(l) value FROM contract_operations_log l'),log);
  });
  for(const data of [undefined,[],[{invoice_id:invoice,reason:' '}],[{invoice_id:invoice,reason:123}]]) {
    it(`completion requires a documented exclusion reason ${JSON.stringify(data)}`,async()=>{
      await installCompletionCommand();await assert.rejects(completeReadiness('full_outstanding',{
        excluded_invoice_ids:[invoice],excluded_invoices:data,
      }),e=>e.code==='22023');
    });
  }
  it('completion rejects an excluded invoice outside the eligible company-contract claim',async()=>{
    await installCompletionCommand();await assert.rejects(completeReadiness('full_outstanding',{
      excluded_invoice_ids:[other],excluded_invoices:[{invoice_id:other,reason:'Wrong invoice'}],
    }),e=>e.code==='22023');
  });
  it('completion refuses to certify a fallback or legacy calculator',async()=>{
    await installCompletionCommand();await db.exec(`CREATE OR REPLACE FUNCTION public.calculate_legal_claim_statement_v4(
      p_company_id uuid,p_contract_id uuid,p_as_of_date date DEFAULT CURRENT_DATE,p_claim_scope text DEFAULT 'full_outstanding',p_excluded_invoice_ids uuid[] DEFAULT ARRAY[]::uuid[])
      RETURNS jsonb LANGUAGE sql AS $$SELECT '{"total":1500,"violation_count":0,"violations_proof_ready":true}'::jsonb$$;`);
    await assert.rejects(completeReadiness(),/Canonical claim reader must be installed/);
  });
  it('system review refreshes claim snapshot after a cancelled receipt rather than certifying stale readiness',async()=>{
    await installSystemReview();const receipt=await pay(500);await completeReadiness();
    await rows("UPDATE payments SET payment_status='cancelled' WHERE id=$1",[receipt]);
    const review=await systemReview();assert.equal(review.request_snapshot.claim_amount,1500);
    assert.equal(review.request_snapshot.claim_statement.total,1500);
    assert.equal(Number((await rows("SELECT operation_details->>'claim_amount' amount FROM contract_operations_log WHERE operation_type='legal_transfer_readiness_completed'"))[0].amount),1000);
  });
  it('system review rejects removed traffic proof despite the saved ready flag',async()=>{
    await installSystemReview();await traffic();await completeReadiness();
    await db.exec("DELETE FROM contract_documents WHERE document_type='violations_proof'");
    await assert.rejects(systemReview(),e=>e.hint==='LEGAL_TRAFFIC_PROOF_REQUIRED');
  });
  it('system review rejects a changed contract customer instead of reusing the previous customer review',async()=>{
    await installSystemReview();await completeReadiness();
    await rows("INSERT INTO customers(id,company_id,phone) VALUES($1,$2,'71111111')",[other,company]);
    await rows('UPDATE contracts SET customer_id=$1',[other]);
    await assert.rejects(systemReview(),e=>e.hint==='LEGAL_READINESS_CONTEXT_CHANGED');
  });
  it('system review refreshes both review and audit claim after a new customer receipt',async()=>{
    await installSystemReview();await completeReadiness();await pay(500);
    const review=await systemReview();assert.equal(review.status,'system_verified');
    assert.equal(review.request_snapshot.claim_amount,1000);assert.equal(review.approval_snapshot.claim_statement.total,1000);
    assert.equal(review.approval_snapshot.claim_changed_since_readiness,true);
    const audit=(await rows("SELECT operation_details value FROM contract_operations_log WHERE operation_type='legal_system_review_verified'"))[0].value;
    assert.equal(audit.claim_amount,1000);assert.deepEqual(audit.claim_statement,review.request_snapshot.claim_statement);
  });
  it('system review uses traffic-only scope and original documented invoice exclusions',async()=>{
    await installSystemReview();await traffic();await completeReadiness('traffic_violations_only');await trafficReceipt(200);
    const review=await systemReview();assert.equal(review.request_snapshot.claim_amount,300);
    assert.equal(review.request_snapshot.claim_statement.components.rent_due,0);
    assert.equal(review.request_snapshot.claim_scope,'traffic_violations_only');
  });
  it('system review preserves manual exclusions and their reasons on recalculation',async()=>{
    await installSystemReview();await completeReadiness('full_outstanding',{
      excluded_invoice_ids:[invoice],excluded_invoices:[{invoice_id:invoice,reason:'Approved exclusion'}],
    });
    await pay(500);const review=await systemReview();assert.equal(review.request_snapshot.claim_amount,0);
    assert.equal(review.request_snapshot.excluded_invoice_balance,1000);
    assert.equal(review.request_snapshot.reported_exclusion_notes[0].reason,'Approved exclusion');
  });
  it('system review does not require traffic proof for company responsibility',async()=>{
    await installSystemReview();await traffic({party:'company',proof:null});await completeReadiness();
    const review=await systemReview();assert.equal(review.request_snapshot.violation_count,0);
    assert.equal(review.request_snapshot.claim_amount,1500);
  });
  it('system review checks new standalone customer traffic missing proof',async()=>{
    await installSystemReview();await completeReadiness();await traffic({withInvoice:false,proof:null});
    await assert.rejects(systemReview(),e=>e.hint==='LEGAL_TRAFFIC_PROOF_REQUIRED');
  });
  it('system review rejects newly conflicting traffic sources',async()=>{
    await installSystemReview();await completeReadiness();await matchingSources({amount:400});
    await assert.rejects(systemReview(),e=>e.hint==='LEGAL_TRAFFIC_RECONCILIATION_REQUIRED');
  });
  it('system review does not generate a zero traffic-only review after full settlement',async()=>{
    await installSystemReview();await traffic();await completeReadiness('traffic_violations_only');await trafficReceipt(500);
    await assert.rejects(systemReview(),/No evidenced unpaid customer traffic liability remains/);
  });
  for(const change of ["legal_identity_match_status='mismatched'","file_path=' '","legal_evidence_state='superseded'"]) {
    it(`system review rechecks signed evidence after completion: ${change}`,async()=>{
      await installSystemReview();await completeReadiness();await db.exec(`UPDATE contract_documents SET ${change}`);
      await assert.rejects(systemReview(),e=>e.hint==='LEGAL_VERIFIED_EVIDENCE_REQUIRED');
    });
  }
  it('system review rejects changed vehicle identity',async()=>{
    await installSystemReview();await completeReadiness();await rows('UPDATE contracts SET vehicle_id=$1',[legacy]);
    await assert.rejects(systemReview(),e=>e.hint==='LEGAL_READINESS_CONTEXT_CHANGED');
  });
  it('system review rejects removed contact information',async()=>{
    await installSystemReview();await completeReadiness();await db.exec("UPDATE customers SET phone=' '");
    await assert.rejects(systemReview(),/customer phone/);
  });
  it('system review does not revive an older success when latest completion is invalid',async()=>{
    await installSystemReview();await completeReadiness();
    await rows(`INSERT INTO contract_operations_log(company_id,contract_id,operation_type,operation_details,performed_at)
      VALUES($1,$2,'legal_transfer_readiness_completed','{"ready":false}',clock_timestamp()+interval '1 second')`,[company,contract]);
    await assert.rejects(systemReview(),e=>e.hint==='LEGAL_CURRENT_READINESS_REQUIRED');
  });
  it('system review requires canonical readiness instead of certifying legacy cached JSON',async()=>{
    await installSystemReview();await completeReadiness();
    await db.exec("UPDATE contract_operations_log SET operation_details=operation_details-'readiness_source'");
    await assert.rejects(systemReview(),e=>e.hint==='LEGAL_CURRENT_READINESS_REQUIRED');
  });
  it('system review reuses its current review but preserves distinct verification audit events',async()=>{
    await installSystemReview();await completeReadiness();const first=await systemReview();await pay(500);const second=await systemReview();
    assert.equal(second.id,first.id);assert.equal(second.request_snapshot.claim_amount,1000);
    assert.equal((await rows("SELECT count(*)::int n FROM legal_transfer_employee_reviews WHERE status='system_verified'"))[0].n,1);
    assert.equal((await rows("SELECT count(*)::int n FROM contract_operations_log WHERE operation_type='legal_system_review_verified'"))[0].n,2);
    assert.equal((await rows("SELECT count(*)::int n FROM contract_operations_log WHERE operation_type='legal_transfer_readiness_completed'"))[0].n,1);
  });
  it('system review failure leaves pending manual review and financial records untouched',async()=>{
    await installSystemReview();await traffic();await completeReadiness();
    await rows("INSERT INTO legal_transfer_employee_reviews(company_id,contract_id,customer_id,requested_by,status) VALUES($1,$2,$3,$3,'pending')",[company,contract,customer]);
    await db.exec("DELETE FROM contract_documents WHERE document_type='violations_proof'");
    const before=await rows('SELECT to_jsonb(i) value FROM invoices i');await db.exec('SAVEPOINT failed_review');
    await assert.rejects(systemReview(),e=>e.hint==='LEGAL_TRAFFIC_PROOF_REQUIRED');await db.exec('ROLLBACK TO SAVEPOINT failed_review');
    assert.equal((await rows('SELECT status FROM legal_transfer_employee_reviews'))[0].status,'pending');
    assert.equal((await rows("SELECT count(*)::int n FROM contract_operations_log WHERE operation_type='legal_system_review_verified'"))[0].n,0);
    assert.deepEqual(await rows('SELECT to_jsonb(i) value FROM invoices i'),before);
  });
  it('system review cancels pending manual review only after passing the current gates',async()=>{
    await installSystemReview();await completeReadiness();
    await rows("INSERT INTO legal_transfer_employee_reviews(company_id,contract_id,customer_id,requested_by,status) VALUES($1,$2,$3,$3,'pending')",[company,contract,customer]);
    await systemReview();assert.deepEqual((await rows('SELECT status FROM legal_transfer_employee_reviews ORDER BY status')).map(r=>r.status),['cancelled','system_verified']);
  });
  it('system review accepts an active member only through its conversion boundary fixture',async()=>{
    await installSystemReview();await completeReadiness();await auth();assert.equal((await systemReview()).status,'system_verified');
    await assert.rejects(rows('SELECT public.auto_verify_legal_transfer_review_v1($1,$2,$3)',[company,contract,customer]),/permission denied/);
  });
  for(const options of [{active:false},{active:null},{tenant:other},{profile:false},{user:null,profile:false}]) {
    it(`system review rejects unauthorized conversion context ${JSON.stringify(options)}`,async()=>{
      await installSystemReview();await completeReadiness();await auth(options);await assert.rejects(systemReview(),e=>e.code==='42501');
    });
  }
  it('system review keeps the public facade invoker and the shared snapshot builder private',async()=>{
    await installSystemReview();
    assert.equal((await rows("SELECT prosecdef FROM pg_proc WHERE oid='public.auto_verify_legal_transfer_review_v1(uuid,uuid,uuid)'::regprocedure"))[0].prosecdef,false);
    await auth();await assert.rejects(rows('SELECT legal_claim_internal.prepare_readiness_snapshot_v3($1,$2,$3,$4)',[company,contract,{},customer]),/permission denied/);
  });
  it('system review rollback restores exact deployed code and service-only ACL without deleting evidence',async()=>{
    await installSystemReview();await completeReadiness();await systemReview();
    const review=await rows('SELECT to_jsonb(r) value FROM legal_transfer_employee_reviews r');
    const audit=await rows('SELECT to_jsonb(r) value FROM contract_operations_log r');
    await db.exec((await read(`../../supabase/rollbacks/${systemReviewIntegration}.rollback.sql`)).replace(/^BEGIN;|^COMMIT;/gm,''));
    assert.equal((await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE oid='public.auto_verify_legal_transfer_review_v1(uuid,uuid,uuid)'::regprocedure"))[0].hash,'107bd62565b43a6a7151a9f45ade1c86');
    assert.deepEqual(await rows('SELECT to_jsonb(r) value FROM legal_transfer_employee_reviews r'),review);
    assert.deepEqual(await rows('SELECT to_jsonb(r) value FROM contract_operations_log r'),audit);
    await auth();await assert.rejects(rows('SELECT public.auto_verify_legal_transfer_review_v1($1,$2,$3)',[company,contract,customer]),/permission denied/);
  });
  it('system review cancels a superseded different-customer system review instead of returning its customer ID',async()=>{
    await installSystemReview();await completeReadiness();
    const old=(await rows("INSERT INTO legal_transfer_employee_reviews(company_id,contract_id,customer_id,requested_by,status) VALUES($1,$2,$3,$4,'system_verified') RETURNING id",
      [company,contract,other,customer]))[0].id;
    const review=await systemReview();assert.notEqual(review.id,old);assert.equal(review.customer_id,customer);
    assert.equal((await rows('SELECT status FROM legal_transfer_employee_reviews WHERE id=$1',[old]))[0].status,'cancelled');
  });
  for(const scope of [null,'','garbage']) it(`system review rejects invalid persisted scope ${String(scope)}`,async()=>{
    await installSystemReview();await completeReadiness();
    await rows("UPDATE contract_operations_log SET operation_details=jsonb_set(operation_details,'{claim_scope}',$1::jsonb)",[JSON.stringify(scope)]);
    await assert.rejects(systemReview(),e=>e.code==='22023');
  });
  it('system review refuses an unknown deployed baseline before replacing it',async()=>{
    await installSystemReview();
    await db.exec((await read(`../../supabase/rollbacks/${systemReviewIntegration}.rollback.sql`)).replace(/^BEGIN;|^COMMIT;/gm,''));
    await db.exec(`CREATE OR REPLACE FUNCTION public.auto_verify_legal_transfer_review_v1(p_company_id uuid,p_contract_id uuid,p_actor_id uuid DEFAULT NULL)
      RETURNS public.legal_transfer_employee_reviews LANGUAGE sql AS $$SELECT NULL::public.legal_transfer_employee_reviews$$;`);
    await assert.rejects(db.exec((await read(`../../supabase/migrations/${systemReviewIntegration}.sql`)).replace(/^BEGIN;|^COMMIT;/gm,'')),/changed since audit/);
  });
  it('system review prevents rolling back its shared completion dependency first',async()=>{
    await installSystemReview();
    await assert.rejects(db.exec((await read(`../../supabase/rollbacks/${completionIntegration}.rollback.sql`)).replace(/^BEGIN;|^COMMIT;/gm,'')),/Roll back canonical system review/);
  });
  it('system review and completion roll back in reverse dependency order while preserving their records',async()=>{
    await installSystemReview();await completeReadiness();await systemReview();
    const audit=await rows('SELECT to_jsonb(r) value FROM contract_operations_log r');
    for(const migration of [systemReviewIntegration,completionIntegration]) {
      await db.exec((await read(`../../supabase/rollbacks/${migration}.rollback.sql`)).replace(/^BEGIN;|^COMMIT;/gm,''));
    }
    assert.deepEqual(await rows('SELECT to_jsonb(r) value FROM contract_operations_log r'),audit);
    assert.equal((await rows("SELECT to_regprocedure('legal_claim_internal.prepare_readiness_snapshot_v3(uuid,uuid,jsonb,uuid)') missing"))[0].missing,null);
  });
  it('conversion refuses removed traffic proof in the expired-contract branch',async()=>{
    await installConversionGraph();await db.exec("UPDATE contracts SET status='expired'");await traffic();await completeReadiness();
    await db.exec("DELETE FROM contract_documents WHERE document_type='violations_proof'");
    await assert.rejects(convert(),e=>e.hint==='LEGAL_TRAFFIC_PROOF_REQUIRED');
  });
  it('conversion creates an unfiled preparation case and preserves a cancelled contract',async()=>{
    await installConversionGraph();await db.exec("UPDATE contracts SET status='cancelled'");await completeReadiness();
    const r=await convert();assert.equal(r.legal_case.filing_date,null);
    assert.equal((await rows('SELECT status FROM contracts'))[0].status,'cancelled');
    assert.equal(r.total_case_value,1500);
  });
  it('conversion refuses a newly settled full-scope claim rather than creating a zero-value case',async()=>{
    await installConversionGraph();await db.exec("UPDATE contracts SET status='expired'");await completeReadiness();await pay(1500);
    await assert.rejects(convert(),e=>e.hint==='LEGAL_NO_OUTSTANDING_CLAIM');
  });
  it('snapshot refuses actor spoofing by an authenticated member',async()=>{
    await installConversionGraph();await auth();await assert.rejects(freeze(other),e=>e.code==='42501');
  });
  it('snapshot refuses to omit positive traffic liability without proof',async()=>{
    await installConversionGraph();await traffic({proof:null});
    await assert.rejects(freeze(),e=>e.hint==='LEGAL_TRAFFIC_PROOF_REQUIRED');
  });
  it('snapshot refuses missing signed-contract evidence',async()=>{
    await installConversionGraph();await db.exec("DELETE FROM contract_documents WHERE document_type='signed_contract'");
    await assert.rejects(freeze(),e=>e.hint==='LEGAL_VERIFIED_EVIDENCE_REQUIRED');
  });
  it('conversion refuses an existing case attached to a different customer',async()=>{
    await installConversionGraph();await rows("INSERT INTO legal_cases(company_id,contract_id,client_id,claim_scope,case_status,case_value) VALUES($1,$2,$3,'full_outstanding','pending',1500)",[company,contract,other]);
    await assert.rejects(convert(),e=>e.hint==='LEGAL_EXISTING_CASE_CONTEXT_MISMATCH');
  });
  it('conversion refuses a conflicting requested scope when reusing an existing case',async()=>{
    await installConversionGraph();await rows("INSERT INTO legal_cases(company_id,contract_id,client_id,claim_scope,case_status,case_value) VALUES($1,$2,$3,'traffic_violations_only','pending',500)",[company,contract,customer]);
    await assert.rejects(convert(),e=>e.hint==='LEGAL_EXISTING_CASE_CONTEXT_MISMATCH');
  });
});
