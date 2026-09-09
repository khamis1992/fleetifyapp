import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const company='22222222-2222-4222-8222-222222222222', customer='33333333-3333-4333-8333-333333333333';
const contract='55555555-5555-4555-8555-555555555555', invoice='11111111-1111-4111-8111-111111111111';
const other='77777777-7777-4777-8777-777777777777';
const migration='20260908221229_legal_memo_receipt_settlement';
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
      ALTER TABLE invoices ADD COLUMN notes text, ADD COLUMN journal_entry_id uuid;
      CREATE TABLE journal_entries(id uuid PRIMARY KEY,company_id uuid,reference_type text,reference_id uuid,status text,reversal_entry_id uuid,description text);
      CREATE TABLE IF NOT EXISTS profiles(user_id uuid,company_id uuid,is_active boolean);`);
    await db.exec(await read('./fixtures/legal-claim-classification-baseline-20260907.sql'));
    const amountMigration=await read('../../supabase/migrations/20260831173107_add_traffic_violations_only_legal_claim_scope.sql');
    const amountStart=amountMigration.indexOf('CREATE OR REPLACE FUNCTION public.calculate_legal_claim_amount_v1(');
    await db.exec(amountMigration.slice(amountStart,amountMigration.indexOf('$;',amountStart)+3));
    await db.exec(await read('../../supabase/migrations/20260906223503_align_legal_claim_service_rent_classification.sql'));
    await db.exec(await read(`../../supabase/migrations/${migration}.sql`));
    await db.exec(await read("../../supabase/migrations/20260908221719_align_legal_recorded_rent_cutoff.sql"));
    await db.exec(await read("../../supabase/migrations/20260908223651_disclose_legal_invoice_service_periods.sql"));
    await db.exec(await read("../../supabase/migrations/20260908225924_recognize_reviewed_traffic_invoice_retirement.sql"));
    await db.exec(await read("../../supabase/migrations/20260908230412_bound_legal_traffic_retirement_lookup.sql"));
    await db.exec(`CREATE TABLE invoice_items(invoice_id uuid);
      CREATE FUNCTION public.can_prepare_contract_for_legal_v1(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
      CREATE FUNCTION public.get_legal_transfer_readiness_v1(uuid,uuid) RETURNS jsonb LANGUAGE sql AS $$SELECT '{"signed_contract_ready":true,"payments":[],"preserved_metadata":"yes"}'::jsonb$$;`);
    const readinessSource=await read('../../supabase/migrations/20260901090230_unify_legal_claim_engine_and_cancelled_collection.sql');
    const readinessStart=readinessSource.indexOf('CREATE OR REPLACE FUNCTION public.get_legal_transfer_readiness_v2(');
    await db.exec(readinessSource.slice(readinessStart,readinessSource.indexOf('$;',readinessStart)+3));
    await db.exec(await read('../../supabase/migrations/20260908232819_align_transfer_readiness_with_memo_statement.sql'));
    // Load the three exact deployed command bodies; the new migration verifies their hashes.
    const loadCommand=async(file,name,rename=name)=>{
      const source=await read('../../supabase/migrations/'+file);
      const start=source.indexOf('CREATE OR REPLACE FUNCTION public.'+name+'(');
      const end=source.indexOf('$;',start)+3;
      assert.ok(start>=0 && end>start);
      await db.exec(source.slice(start,end).replace('public.'+name+'(', 'public.'+rename+'('));
    };
    await loadCommand('20260727013000_require_legal_transfer_readiness_wizard.sql','complete_legal_transfer_readiness_v1','complete_legal_transfer_readiness_v1_pre_pdf_request_agent');
    await loadCommand('20260831180500_harden_scoped_legal_readiness_authorization.sql','complete_legal_transfer_readiness_with_scope_v1');
    await loadCommand('20260901090230_unify_legal_claim_engine_and_cancelled_collection.sql','complete_legal_transfer_readiness_v2');
    await db.exec(`CREATE TABLE contract_operations_log(company_id uuid,contract_id uuid,operation_type text,operation_details jsonb,notes text,performed_by uuid,performed_at timestamptz);
      -- Evidence/request wrappers are isolated here: no messages or live completion calls.
      CREATE FUNCTION public.check_contract_has_verified_signed_lease_v1(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('fixture.evidence',true)='ready'$$;
      CREATE FUNCTION public.check_contract_identity_verified_v1(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('fixture.evidence',true)='ready'$$;
      CREATE FUNCTION public.complete_legal_transfer_readiness_v1(p_company_id uuid,p_contract_id uuid,p_payload jsonb,p_actor_id uuid DEFAULT NULL)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
        IF current_setting('fixture.evidence',true) IS DISTINCT FROM 'ready' THEN RETURN '{"blocked":true,"message_ar":"مستند مطلوب"}'::jsonb; END IF;
        RETURN public.complete_legal_transfer_readiness_v1_pre_pdf_request_agent(p_company_id,p_contract_id,p_payload,p_actor_id);
      END $$;`);
    await db.exec(await read('../../supabase/migrations/20260908234503_persist_memo_aligned_readiness.sql'));
    await db.exec(`CREATE TABLE legal_case_memo_snapshots(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,case_id uuid,version integer,payload jsonb);
      ALTER TABLE contract_documents ADD COLUMN id uuid DEFAULT gen_random_uuid();`);
    await db.exec(await read('../../supabase/migrations/20260907151151_align_taqadi_violation_document_requirements.sql'));
    await db.exec(await read('../../supabase/migrations/20260909002436_validate_filing_memo_statement_details.sql'));
    await db.exec(`ALTER TABLE contracts ADD COLUMN vehicle_id uuid, ADD COLUMN license_plate text;
      ALTER TABLE customers ADD COLUMN customer_type text,ADD COLUMN national_id text,ADD COLUMN nationality text,ADD COLUMN phone text,ADD COLUMN address text,ADD COLUMN email text;
      CREATE TABLE vehicles(id uuid,company_id uuid,plate_number text,make text,model text,year integer,vin text,color text);
      ALTER TABLE contract_documents ADD COLUMN legal_evidence_state text DEFAULT 'active',ADD COLUMN superseded_by_document_id uuid;
      ALTER TABLE legal_case_damage_costs ADD COLUMN cost_type text,ADD COLUMN description text;
      ALTER TABLE legal_case_litigation_profile ADD COLUMN delivery_handover_date date,ADD COLUMN delivery_handover_document_id uuid,ADD COLUMN vehicle_return_document_id uuid,
        ADD COLUMN rescission_strategy text,ADD COLUMN termination_type text,ADD COLUMN termination_supporting_document_id uuid,ADD COLUMN renewal_applies boolean,
        ADD COLUMN renewed_end_date date,ADD COLUMN termination_clause_number text,ADD COLUMN termination_clause_text text,
        ADD COLUMN notice_exception_type text,ADD COLUMN notice_exception_clause_or_reason text,ADD COLUMN notice_exception_document_id uuid;
      CREATE TABLE legal_case_formal_notices(company_id uuid,contract_id uuid,notice_type text,sent_on date,delivered_on date,delivery_confirmed boolean,proof_document_id uuid,grace_period_days integer,delivery_method text);`);
    await db.exec(await read('../../supabase/migrations/20260909004625_validate_filing_memo_facts_and_evidence.sql'));

  });
  after(async()=>db?.close());
  beforeEach(async()=>{
    await db.exec('BEGIN');
    await rows("SELECT set_config('fixture.role','service_role',true)");
    await rows("INSERT INTO contracts(id,company_id,customer_id,contract_number,start_date,end_date,status,monthly_amount,vehicle_returned,late_fine_amount,vehicle_id) VALUES($1,$2,$3,'TEST','2024-01-01','2028-12-31','under_legal_procedure',1700,true,0,$4)",[contract,company,customer,other]);
    await rows("INSERT INTO customers(id,company_id,first_name_ar,last_name_ar,national_id,nationality,phone) VALUES($1,$2,'عميل','اختبار','test-id','قطري','test-phone')",[customer,company]);
    await rows("INSERT INTO vehicles VALUES($1,$2,'TEST','Test','Car',2026,'test-vin','أبيض')",[other,company]);
    await rows(`INSERT INTO invoices(id,company_id,contract_id,customer_id,invoice_month,invoice_date,due_date,invoice_number,invoice_type,penalty_id,total_amount,paid_amount,balance_due,payment_status,status) VALUES($1,$2,$3,$4,'2026-08-01','2026-08-01','2026-08-01','RENT','service',null,1700,0,1700,'unpaid','sent')`,[invoice,company,contract,customer]);
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
    await rows("INSERT INTO contract_documents(company_id,contract_id,document_type,file_path) VALUES($1,$2,'violations_proof','proof.pdf')",[company,contract]);
    return result;
  };
  const retiredTrafficInvoice=async()=>{
    const id=await penalty();
    const note='إلغاء فاتورة مخالفة مرورية بقرار معتمد 2026-08-30: المخالفات تُدار من قسمها الخاص ولا تُنشأ لها فواتير في نظام الفواتير.';
    const saved=(await rows("INSERT INTO invoices(company_id,contract_id,customer_id,invoice_number,invoice_type,penalty_id,invoice_month,due_date,total_amount,paid_amount,balance_due,payment_status,status,notes,journal_entry_id) VALUES($1,$2,$3,'TV-RETIRED','service',$4,'2026-08-01','2026-08-01',500,0,0,'cancelled','cancelled',$5,gen_random_uuid()) RETURNING id,journal_entry_id",[company,contract,customer,id,note]))[0];
    const reversal=(await rows('SELECT gen_random_uuid() id'))[0].id;
    await rows("INSERT INTO journal_entries(id,company_id,reference_type,reference_id,status,reversal_entry_id,description) VALUES($1,$2,'invoice',$3,'posted',$4,'invoice'),($4,$2,'journal_reversal',$1,'posted',null,$5)",[saved.journal_entry_id,company,saved.id,reversal,note]);
    return {...saved,penaltyId:id,reversal};
  };

  const currentClaim=async(scope='full_outstanding',excluded=[]) => (await rows(
    "SELECT public.calculate_legal_claim_statement_v4($1,$2,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date,$3,$4::uuid[]) value",
    [company,contract,scope,excluded]))[0].value;
  const reviewedPayload=async(scope='full_outstanding',excluded=[])=>{
    const statement=await currentClaim(scope,excluded);
    return {financial_reviewed:true,violations_reviewed:true,vehicle_returned:true,claim_scope:scope,
      claim_amount:statement.total,reviewed_claim_statement:statement,excluded_invoice_ids:excluded,
      excluded_invoices:excluded.map(id=>({invoice_id:id,reason:'استبعاد بموجب المراجعة'}))};
  };
  const complete=async(payload,scope='full_outstanding',actor=customer) => (await rows(
    'SELECT public.complete_legal_transfer_readiness_v2($1,$2,$3::jsonb,$4,$5) value',
    [company,contract,JSON.stringify(payload),scope,actor]))[0].value;
  const readyEvidence=()=>rows("SELECT set_config('fixture.evidence','ready',true)");
  const savedLogs=()=>rows('SELECT operation_details FROM contract_operations_log');
  it('persists the reviewed receipt-backed claim and every component once',async()=>{
    await readyEvidence();await pay(500);const payload=await reviewedPayload();
    payload.completed_payments=99999; payload.included_invoice_balance=99999;
    const result=await complete(payload);
    assert.equal(result.ready,true);assert.equal(result.claim_amount,1200);
    const logs=await savedLogs(); assert.equal(logs.length,1);
    const saved=logs[0].operation_details;
    assert.deepEqual(saved.claim_statement,payload.reviewed_claim_statement);
    assert.deepEqual(saved.claim_components,payload.reviewed_claim_statement.components);
    assert.equal(saved.included_invoice_balance,1200);
    assert.equal(saved.completed_payments,undefined);
    assert.equal(saved.claim_statement.included_invoices[0].paid_amount,500);
  });
  it('traffic-only approval counts government-paid customer liability minus actual receipts',async()=>{
    await readyEvidence();const id=await penalty();
    const trafficInvoice=(await rows("INSERT INTO invoices(company_id,contract_id,customer_id,invoice_number,invoice_type,penalty_id,invoice_month,due_date,total_amount,paid_amount,balance_due,payment_status,status) VALUES($1,$2,$3,'TV-TEST','service',$4,'2026-08-01','2026-08-01',500,0,500,'unpaid','sent') RETURNING id",[company,contract,customer,id]))[0].id;
    await rows("INSERT INTO payments(company_id,customer_id,contract_id,invoice_id,amount,payment_status,transaction_type) VALUES($1,$2,$3,$4,200,'completed','receipt')",[company,customer,contract,trafficInvoice]);
    const payload=await reviewedPayload('traffic_violations_only');
    const result=await complete(payload,'traffic_violations_only');
    assert.equal(result.claim_amount,300);assert.equal(result.violation_count,1);
    const saved=(await savedLogs())[0].operation_details;
    assert.equal(saved.claim_components.traffic_violations,300);
    assert.equal(saved.included_invoice_balance,0);
  });
  it('rejects a receipt posted after review before writing any completion',async()=>{
    await readyEvidence();const payload=await reviewedPayload();await pay(500);
    await db.exec('SAVEPOINT stale_claim');
    await assert.rejects(complete(payload),e=>e.code==='40001');
    await db.exec('ROLLBACK TO SAVEPOINT stale_claim');
    assert.equal((await savedLogs()).length,0);
  });
  it('rejects changed components even when the grand total is unchanged',async()=>{
    await readyEvidence();const payload=await reviewedPayload();
    payload.reviewed_claim_statement.components.rent_due-=100;
    payload.reviewed_claim_statement.components.damages+=100;
    await db.exec('SAVEPOINT stale_components');
    await assert.rejects(complete(payload),e=>e.code==='40001');
    await db.exec('ROLLBACK TO SAVEPOINT stale_components');
    assert.equal((await savedLogs()).length,0);
  });
  it('rejects changed service coverage even when the grand total is unchanged',async()=>{
    await readyEvidence();const payload=await reviewedPayload();
    payload.reviewed_claim_statement.included_invoices[0].service_period_end='2026-07-31';
    await assert.rejects(complete(payload),e=>e.code==='40001');
  });
  it('requires the reviewed snapshot on the legacy direct completion entry too',async()=>{
    await readyEvidence();const payload=await reviewedPayload();delete payload.reviewed_claim_statement;
    await assert.rejects(rows('SELECT public.complete_legal_transfer_readiness_v1_pre_pdf_request_agent($1,$2,$3::jsonb,$4)',
      [company,contract,JSON.stringify(payload),customer]),e=>e.code==='40001');
  });
  it('preserves excluded invoice reasons and uses their canonical balances',async()=>{
    await readyEvidence();await pay(500);const payload=await reviewedPayload('full_outstanding',[invoice]);
    const result=await complete(payload);assert.equal(result.claim_amount,0);
    const saved=(await savedLogs())[0].operation_details;
    assert.equal(saved.excluded_invoice_balance,1200);
    assert.equal(saved.reported_exclusion_notes[0].reason,'استبعاد بموجب المراجعة');
  });
  it('preserves the existing missing-document blocked response without a completion write',async()=>{
    const payload=await reviewedPayload();const result=await complete(payload);
    assert.equal(result.blocked,true);assert.equal((await savedLogs()).length,0);
  });
  it('denies mismatched actors before calling document-request wrappers',async()=>{
    await rows('INSERT INTO profiles VALUES($1,$2,true)',[customer,company]);
    await rows("SELECT set_config('fixture.role','authenticated',true),set_config('fixture.uid',$1,true),set_config('fixture.company',$2,true)",[customer,company]);
    await assert.rejects(complete({},'full_outstanding',other),e=>e.code==='42501');
  });
  it('denies cross-company completion even when the contract permission stub allows it',async()=>{
    await rows("SELECT set_config('fixture.role','authenticated',true),set_config('fixture.uid',$1,true),set_config('fixture.company',$2,true)",[customer,other]);
    await assert.rejects(complete({}),e=>e.code==='42501');
  });
  it('requires proof for current customer traffic liabilities before saving',async()=>{
    await readyEvidence();await penalty();await db.exec("DELETE FROM contract_documents WHERE document_type='violations_proof'");
    const payload=await reviewedPayload();
    await assert.rejects(complete(payload),/أرفق الإثبات/);
  });
  it('does not require proof for company-responsibility traffic on approval',async()=>{
    await readyEvidence();const id=await penalty();
    await rows("UPDATE penalties SET responsibility_party='company' WHERE id=$1",[id]);
    await db.exec("DELETE FROM contract_documents WHERE document_type='violations_proof'");
    const result=await complete(await reviewedPayload());assert.equal(result.claim_amount,1700);assert.equal(result.violation_count,0);
  });
  it('allows authorized API approval but keeps validation and backup helpers private',async()=>{
    await readyEvidence();await rows('INSERT INTO profiles VALUES($1,$2,true)',[customer,company]);
    await rows("SELECT set_config('fixture.role','authenticated',true),set_config('fixture.uid',$1,true),set_config('fixture.company',$2,true)",[customer,company]);
    await db.exec('SET LOCAL ROLE authenticated');
    const result=await complete(await reviewedPayload());assert.equal(result.ready,true);
    for(const signature of ['prepare_memo_readiness(uuid,uuid,jsonb,uuid)','authorize_memo_completion(uuid,uuid,uuid)','before_memo_completion_v2(uuid,uuid,jsonb,text,uuid)']) {
      assert.equal((await rows("SELECT has_function_privilege('authenticated',$1,'EXECUTE') allowed",['legal_memo_calc_private.'+signature]))[0].allowed,false);
    }
    await db.exec('RESET ROLE');
  });
  it('restores the three original readiness command bodies exactly',async()=>{
    const rollback=(await read('../../supabase/rollbacks/20260908234503_persist_memo_aligned_readiness.rollback.sql')).replace(/^BEGIN;|^COMMIT;/gm,'');
    await db.exec(rollback);
    const expected={complete_legal_transfer_readiness_v1_pre_pdf_request_agent:'bce8a7542ebc1b3a5cd5585c3dae5cd1',complete_legal_transfer_readiness_with_scope_v1:'d1c3dc92014e40cc0e292daf87b2eb78',complete_legal_transfer_readiness_v2:'5284fa39784cfe5d3bb512d784bdacdd'};
    const result=await rows("SELECT proname,md5(prosrc) hash FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=ANY($1::text[])",[Object.keys(expected)]);
    assert.equal(result.length,3);for(const row of result)assert.equal(row.hash,expected[row.proname]);
  });

  it('recognizes evidenced retirement without recreating the cancelled traffic invoice',async()=>{
    const saved=await retiredTrafficInvoice(); const result=await claim();
    assert.equal(result.components.traffic_violations,500); assert.equal(result.total,2200);
    assert.equal((await rows('SELECT status FROM invoices WHERE id=$1',[saved.id]))[0].status,'cancelled');
    assert.equal((await rows("SELECT has_function_privilege('authenticated','legal_memo_calc_private.is_reviewed_traffic_invoice_retirement(uuid,uuid,uuid,numeric)','EXECUTE') allowed"))[0].allowed,false);
  });
  for(const change of ['manual_cancellation','unposted_reversal','reversal_undone','wrong_contract','wrong_customer','wrong_amount','receipt','allocation']) it('requires review for retirement with '+change,async()=>{
    const saved=await retiredTrafficInvoice();
    if(change==='manual_cancellation') await rows("UPDATE invoices SET notes='إلغاء يدوي' WHERE id=$1",[saved.id]);
    if(change==='unposted_reversal') await rows("UPDATE journal_entries SET status='draft' WHERE id=$1",[saved.reversal]);
    if(change==='reversal_undone') await rows('UPDATE journal_entries SET reversal_entry_id=$2 WHERE id=$1',[saved.reversal,other]);
    if(change==='wrong_contract') await rows('UPDATE invoices SET contract_id=$2 WHERE id=$1',[saved.id,other]);
    if(change==='wrong_customer') await rows('UPDATE invoices SET customer_id=$2 WHERE id=$1',[saved.id,other]);
    if(change==='wrong_amount') await rows('UPDATE invoices SET total_amount=400 WHERE id=$1',[saved.id]);
    if(change==='receipt'||change==='allocation') {
      const paid=(await rows("INSERT INTO payments(company_id,customer_id,contract_id,invoice_id,amount,payment_status,transaction_type) VALUES($1,$2,$3,$4,200,'completed','receipt') RETURNING id",[company,customer,contract,saved.id]))[0].id;
      if(change==='allocation') await rows("INSERT INTO payment_allocations(company_id,payment_id,target_id,allocation_type,amount,is_active) VALUES($1,$2,$3,'invoice',200,true)",[company,paid,saved.id]);
    }
    await assert.rejects(claim(),/مطابقة/);
  });
  it('does not revive a cancelled penalty when its former invoice was retired',async()=>{
    const saved=await retiredTrafficInvoice();
    await rows("UPDATE penalties SET status='cancelled' WHERE id=$1",[saved.penaltyId]);
    assert.equal((await claim()).components.traffic_violations,0);
  });
  it('restores the pre-optimization traffic body exactly',async()=>{
    const old=(await rows("SELECT prosrc FROM pg_proc WHERE oid='legal_memo_calc_private.before_bounded_retirement_read_traffic(uuid,uuid,date)'::regprocedure"))[0].prosrc;
    await db.exec((await read('../../supabase/rollbacks/20260908230412_bound_legal_traffic_retirement_lookup.rollback.sql')).replace(/^BEGIN;/m,'').replace(/^COMMIT;/m,''));
    assert.equal((await rows("SELECT prosrc FROM pg_proc WHERE oid='legal_memo_calc_private.read_traffic(uuid,uuid,date)'::regprocedure"))[0].prosrc,old);
    await retiredTrafficInvoice(); assert.equal((await claim()).total,2200);
  });
  it('restores the original retirement guard exactly on rollback',async()=>{
    const old=(await rows("SELECT prosrc FROM pg_proc WHERE oid='legal_memo_calc_private.before_retirement_read_traffic(uuid,uuid,date)'::regprocedure"))[0].prosrc;
    await db.exec((await read('../../supabase/rollbacks/20260908225924_recognize_reviewed_traffic_invoice_retirement.rollback.sql')).replace(/^BEGIN;/m,'').replace(/^COMMIT;/m,''));
    const current=(await rows("SELECT prosrc FROM pg_proc WHERE oid='legal_memo_calc_private.read_traffic(uuid,uuid,date)'::regprocedure"))[0].prosrc;
    assert.equal(current,old);
    await retiredTrafficInvoice(); await assert.rejects(claim(),/مطابقة/);
  });
  const financialReadiness=async()=> (await rows('SELECT legal_memo_calc_private.readiness_financials($1,$2,$3) value',[company,contract,'2026-09-08']))[0].value;
  it('readiness shows receipt-backed service rent instead of paid invoice caches',async()=>{
    await pay(500);await rows("UPDATE invoices SET paid_amount=1700,balance_due=0,payment_status='paid' WHERE id=$1",[invoice]);
    const result=await financialReadiness();
    assert.equal(result.financial_context.rent_total,1200);assert.equal(result.financial_context.rent_requires_review,false);
    assert.equal(result.invoices[0].total_amount,1700);assert.equal(result.invoices[0].paid_amount,500);
    assert.equal(result.invoices[0].balance_due,1200);assert.equal(result.invoices[0].can_edit_amount,false);
    assert.equal(result.invoices[0].service_period_end,'2026-08-31');
  });
  it('keeps traffic-only readiness usable when rent schedules require review',async()=>{
    await penalty();
    await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,paid_amount,status) VALUES($1,$2,'2026-07-01',1700,0,'pending')",[company,contract]);
    const result=await financialReadiness();
    assert.equal(result.financial_context.rent_requires_review,true);assert.equal(result.financial_context.rent_total,null);
    assert.equal(result.financial_context.traffic_requires_review,false);assert.equal(result.financial_context.traffic_total,500);
    assert.equal(result.financial_context.traffic_claim_total,500);assert.equal(result.violations[0].liability_amount,500);
  });
  it('does not treat company or future penalties as current customer liabilities in readiness',async()=>{
    const id=await penalty();await rows("UPDATE penalties SET responsibility_party='company' WHERE id=$1",[id]);
    const result=await financialReadiness();assert.equal(result.financial_context.traffic_total,0);assert.equal(result.violations[0].liability_amount,0);
    await rows("UPDATE penalties SET responsibility_party='customer',penalty_date='2026-10-01' WHERE id=$1",[id]);
    assert.equal((await financialReadiness()).financial_context.traffic_total,0);
  });
  it('readiness preserves contract evidence metadata and never exposes private readers',async()=>{
    const result=(await rows('SELECT public.get_legal_transfer_readiness_v2($1,$2) value',[company,contract]))[0].value;
    assert.equal(result.signed_contract_ready,true);assert.equal(result.preserved_metadata,'yes');assert.deepEqual(result.payments,[]);
    assert.equal((await rows("SELECT has_function_privilege('authenticated','legal_memo_calc_private.readiness_financials(uuid,uuid,date)','EXECUTE') allowed"))[0].allowed,false);
    await rows("SELECT set_config('fixture.role','authenticated',true),set_config('fixture.uid',$1,true),set_config('fixture.company',$2,true)",[customer,other]);
    await assert.rejects(rows('SELECT public.get_legal_transfer_readiness_v2($1,$2)',[company,contract]),/Not authorized/);
  });
  it('restores the exact original readiness gateway on rollback',async()=>{
    const old=(await rows("SELECT prosrc FROM pg_proc WHERE oid='legal_memo_calc_private.before_statement_readiness(uuid,uuid)'::regprocedure"))[0].prosrc;
    await db.exec((await read('../../supabase/rollbacks/20260908232819_align_transfer_readiness_with_memo_statement.rollback.sql')).replace(/^BEGIN;/m,'').replace(/^COMMIT;/m,''));
    assert.equal((await rows("SELECT prosrc FROM pg_proc WHERE oid='public.get_legal_transfer_readiness_v2(uuid,uuid)'::regprocedure"))[0].prosrc,old);
  });
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
  it('excludes rent after return while preserving receipt settlement before return',async()=>{
    await pay(500);
    await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_returned_at) VALUES($1,$2,'2026-08-31')",[company,contract]);
    await rows("INSERT INTO invoices(id,company_id,contract_id,customer_id,invoice_month,invoice_date,due_date,invoice_number,invoice_type,penalty_id,total_amount,paid_amount,balance_due,payment_status,status) VALUES(gen_random_uuid(),$1,$2,$3,'2026-09-01','2026-09-01','2026-09-01','RENT-SEP','sales',null,1700,0,1700,'unpaid','sent')",[company,contract,customer]);
    const value=await claim();
    assert.equal(value.total,1200);
    assert.equal(value.included_invoices.length,1);
    assert.equal(value.excluded_amounts.future_rent,1700);
    assert.equal(value.cutoff_date,'2026-08-31');
    assert.equal(Number((await rows('SELECT calculate_legal_claim_amount_v1($1,$2,$3) amount',[company,contract,'2026-09-08']))[0].amount),1200);
  });
  it('discloses prepaid month coverage beyond the review day without prorating the recorded amount',async()=>{
    await db.exec("UPDATE invoices SET invoice_month='2026-09-01',due_date='2026-09-01'; UPDATE contract_payment_schedules SET due_date='2026-09-01'");
    const value=await claim();
    assert.equal(value.included_invoices[0].service_period_end,'2026-09-30');
    assert.equal(value.service_end_event_date,null);
    assert.equal(value.total,1700);
  });
  it('uses the earliest actual ending event and the partial initial service month',async()=>{
    await db.exec("UPDATE contracts SET start_date='2026-08-10'");
    await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_returned_at,termination_date,termination_date_status) VALUES($1,$2,'2026-08-25','2026-08-20','confirmed')",[company,contract]);
    const value=await claim();
    assert.equal(value.cutoff_source,'confirmed_termination');
    assert.equal(value.included_invoices[0].service_period_start,'2026-08-10');
    assert.equal(value.included_invoices[0].service_period_end,'2026-08-20');
  });
  it('discloses a multi-month invoice only when its linked monthly obligations reconcile',async()=>{
    await db.exec("UPDATE invoices SET invoice_type='sales',invoice_month='2026-06-01',due_date='2026-06-01',total_amount=5100");
    await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,paid_amount,status,invoice_id) VALUES($1,$2,'2026-06-01',1700,0,'pending',$3),($1,$2,'2026-07-01',1700,0,'pending',$3)",[company,contract,invoice]);
    const value=await claim();
    assert.equal(value.included_invoices[0].service_period_start,'2026-06-01');
    assert.equal(value.included_invoices[0].service_period_end,'2026-08-31');
    assert.equal(value.included_invoices[0].service_period_basis,'linked_schedule_months');
    assert.equal(value.total,5100);
  });
  it('rejects duplicated schedule months instead of inventing an invoice service period',async()=>{
    await db.exec("UPDATE invoices SET invoice_type='sales'");
    await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,paid_amount,status,invoice_id) VALUES($1,$2,'2026-08-01',1700,0,'pending',$3)",[company,contract,invoice]);
    await assert.rejects(claim(),/أقساط متعددة/);
  });
  it('restores the exact gateway on service-period rollback',async()=>{
    await db.exec((await read('../../supabase/rollbacks/20260908223651_disclose_legal_invoice_service_periods.rollback.sql')).replace(/^BEGIN;/m,'').replace(/^COMMIT;/m,''));
    assert.equal((await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE oid='legal_memo_calc_private.read_statement(uuid,uuid,date,text,uuid[])'::regprocedure"))[0].hash,'cd04eee7737a3e0cf52695d0350e2594');
  });
  it('restores the exact receipt-settlement bodies when rolling back cutoff alignment',async()=>{
    await db.exec((await read('../../supabase/rollbacks/20260908221719_align_legal_recorded_rent_cutoff.rollback.sql')).replace(/^BEGIN;/m,'').replace(/^COMMIT;/m,''));
    const hashes=await rows("SELECT proname,md5(prosrc) hash FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='legal_memo_calc_private' AND proname IN ('calculate_legal_claim_breakdown_v3','calculate_legal_claim_statement_v4') ORDER BY proname");
    assert.deepEqual(hashes.map(row=>row.hash),['e7624daa5cf7c757e8f053f9714003fe','da1c4e9c91285bd1521697634666b487']);
  });
  const snapshotFixture=async(statement=undefined,extra={})=>{
    const value=statement??await claim();
    const invoices=value.included_invoices.filter(row=>row.amount>0);
    const dates=key=>invoices.map(row=>row[key]).filter(Boolean).sort();
    const format=value=>value?.split('-').reverse().join('/');
    const currentContract=(await rows('SELECT to_jsonb(c) value FROM contracts c WHERE id=$1',[contract]))[0].value;
    const memo={claimScope:value.claim_scope,customer:{customer_name:'عميل اختبار',customer_code:customer,id_number:'test-id',nationality:'قطري',phone:'test-phone',address:'الدوحة قطر',email:'',overdue_amount:value.components.rent_due+value.components.legal_extension_rent,
      late_penalty:value.components.contractual_compensation,violations_amount:value.components.traffic_violations,total_debt:value.total},
      contractInfo:{contract_number:'TEST',start_date:format(currentContract.start_date),end_date:format(currentContract.end_date),monthly_rent:1700},
      vehicleInfo:{plate:'TEST',make:'Test',model:'Car',year:2026,vin:'test-vin',color:'أبيض'},
      vehicleCustody:'unknown',vehicleReturnedAt:null,returnDocumented:false,terminationPath:'judicial',formalNotices:[],
      grossInvoicesTotal:invoices.reduce((sum,row)=>sum+row.total_amount,0)+value.components.legal_extension_rent,
      paidTotal:invoices.reduce((sum,row)=>sum+row.paid_amount,0),
      unpaidPeriodFrom:format(dates('service_period_start')[0]),unpaidPeriodTo:format(dates('service_period_end').at(-1)),...extra};
    await rows('INSERT INTO legal_case_memo_snapshots(id,company_id,contract_id,version,payload) VALUES($1,$2,$3,1,$4)',[other,company,contract,memo]);
    return memo;
  };
  const snapshotGate=async(value=undefined,packageExtra={})=>{
    const statement=value??await claim();
    return (await rows('SELECT legal_memo_calc_private.validate_snapshot_statement($1,$2,$3,$4) missing',
      [company,contract,{memoSnapshotId:other,case:{amount:statement.total},...packageExtra},statement]))[0].missing;
  };
  it('accepts current snapshot receipt amounts and runs the same gate through the filing validator',async()=>{
    await pay(500); await snapshotFixture();
    assert.deepEqual(await snapshotGate(),[]);
    const documents=['memo','claims','docsList','contract','commercialRegister','ibanCertificate','representativeId'].map(key=>({key,ready:true,htmlContent:'fixture'}));
    const packet={memoSnapshotId:other,case:{amount:1200,title:'fixture',facts:'fixture',claims:'fixture'},defendant:{fullName:'Fixture',idNumber:'test',nationality:'test'},documents};
    const validate=async()=>(await rows('SELECT public.validate_taqadi_filing_payload_v1_pre_failure_containment($1,$2,$3) result',[company,contract,packet]))[0].result;
    assert.equal((await validate()).ready,true);
    await db.exec("UPDATE legal_case_memo_snapshots SET payload=jsonb_set(payload,'{grossInvoicesTotal}','1800')");
    assert.ok((await validate()).missing.includes('memoSnapshot.rent_settlement_changed'));
  });
  it('rejects same-net rent when gross and counted receipts both change',async()=>{
    await pay(500); await snapshotFixture();
    await db.exec('UPDATE invoices SET total_amount=1800; UPDATE contract_payment_schedules SET amount=1800');
    await pay(100);
    assert.equal((await claim()).total,1200);
    assert.ok((await snapshotGate()).includes('memoSnapshot.rent_settlement_changed'));
  });
  it('allows an authenticated company user through the validator and denies another company',async()=>{
    await snapshotFixture();
    await rows('INSERT INTO profiles VALUES($1,$2,true)',[customer,company]);
    await rows("SELECT set_config('fixture.role','authenticated',true),set_config('fixture.uid',$1,true),set_config('fixture.company',$2,true)",[customer,company]);
    await db.exec('SET LOCAL ROLE authenticated');
    const result=(await rows('SELECT public.validate_taqadi_filing_payload_v1_pre_failure_containment($1,$2,$3) result',
      [company,contract,{memoSnapshotId:other,case:{amount:1700}}]))[0].result;
    assert.ok(!result.missing.some(key=>key.startsWith('memoSnapshot.')));
    await db.exec('RESET ROLE');
    await rows("SELECT set_config('fixture.company',$1,true)",[other]);
    await assert.rejects(rows('SELECT public.validate_taqadi_filing_payload_v1_pre_failure_containment($1,$2,$3)',
      [company,contract,{memoSnapshotId:other,case:{amount:1700}}]),/Not authorized/);
  });
  it('rejects same-total component redistribution between rent and documented damage',async()=>{
    await snapshotFixture(); await pay(50);
    await rows('INSERT INTO legal_case_damage_costs(company_id,contract_id,amount,verified,evidence_document_id) VALUES($1,$2,50,true,$3)',[company,contract,other]);
    assert.equal((await claim()).total,1700);
    assert.ok((await snapshotGate()).includes('memoSnapshot.financial_components_changed'));
  });
  it('rejects service coverage changes even when amounts stay identical',async()=>{
    await snapshotFixture();
    await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_returned_at) VALUES($1,$2,'2026-08-20')",[company,contract]);
    assert.equal((await claim()).total,1700);
    assert.ok((await snapshotGate()).includes('memoSnapshot.service_period_changed'));
  });
  it('rejects a changed compensation rate even if its cap keeps the amount unchanged',async()=>{
    await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,contractual_compensation_enabled,contractual_compensation_clause_number,contractual_compensation_clause_text,contractual_compensation_method,contractual_compensation_rate,contractual_compensation_cap,contractual_compensation_document_id) VALUES($1,$2,true,'7','Clause','fixed',200,100,$3)",[company,contract,other]);
    await snapshotFixture(undefined,{contractualCompensation:{amount:100,units:1,rate:200,cap:100,method:'fixed',clauseNumber:'7',clauseText:'Clause'}});
    assert.deepEqual(await snapshotGate(),[]);
    await db.exec('UPDATE legal_case_litigation_profile SET contractual_compensation_rate=300');
    assert.equal((await claim()).total,1800);
    assert.ok((await snapshotGate()).includes('memoSnapshot.compensation_details_changed'));
  });
  it('rejects missing, cross-contract, superseded and malformed snapshot references',async()=>{
    assert.deepEqual(await snapshotGate(),['memoSnapshot.missing']);
    await snapshotFixture();
    assert.deepEqual(await snapshotGate(undefined,{memoSnapshotId:'invalid'}),['memoSnapshot.invalid_details']);
    await rows('UPDATE legal_case_memo_snapshots SET contract_id=$1',[other]);
    assert.deepEqual(await snapshotGate(),['memoSnapshot.missing']);
    await rows('UPDATE legal_case_memo_snapshots SET contract_id=$1',[contract]);
    await rows('INSERT INTO legal_case_memo_snapshots(id,company_id,contract_id,version,payload) SELECT $1,company_id,contract_id,2,payload FROM legal_case_memo_snapshots',[invoice]);
    assert.ok((await snapshotGate()).includes('memoSnapshot.superseded'));
  });
  it('validates traffic-only snapshots with no rent period and rejects a different scope',async()=>{
    await penalty();
    const statement=(await rows('SELECT public.calculate_legal_claim_statement_v4($1,$2,$3,$4) value',[company,contract,'2026-09-08','traffic_violations_only']))[0].value;
    await snapshotFixture(statement);
    assert.deepEqual(await snapshotGate(statement),[]);
    await db.exec("UPDATE legal_case_memo_snapshots SET payload=jsonb_set(payload,'{claimScope}','\"full_outstanding\"')");
    assert.ok((await snapshotGate(statement)).includes('memoSnapshot.scope_changed'));
  });
  it('includes legal extension rent and its actual coverage in the frozen gross',async()=>{
    await db.exec("UPDATE contracts SET end_date='2026-08-31',vehicle_returned=false");
    await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_custody) VALUES($1,$2,'with_defendant')",[company,contract]);
    const statement=await claim();
    assert.ok(statement.components.legal_extension_rent>0);
    await snapshotFixture(statement,{unpaidPeriodTo:statement.cutoff_date.split('-').reverse().join('/')});
    assert.deepEqual(await snapshotGate(statement),[]);
  });
  it('validates evidenced retention dates and rejects a shifted equal-length period',async()=>{
    await db.exec('UPDATE contracts SET vehicle_returned=false');
    await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_custody,termination_date,termination_date_status,retention_daily_rate,retention_rate_source,retention_rate_source_ref,retention_rate_source_document_id) VALUES($1,$2,'with_defendant','2026-09-01','confirmed',20,'document','TEST',$3)",[company,contract,other]);
    await snapshotFixture(undefined,{retentionRate:{daily:20,sourceRef:'TEST'},retentionClaim:{amount:140,days:7,from:'2026-09-02',to:'2026-09-08'}});
    assert.deepEqual(await snapshotGate(),[]);
    await db.exec("UPDATE legal_case_memo_snapshots SET payload=jsonb_set(jsonb_set(payload,'{retentionClaim,from}','\"2026-09-03\"'),'{retentionClaim,to}','\"2026-09-09\"')");
    assert.ok((await snapshotGate()).includes('memoSnapshot.retention_details_changed'));
  });
  it('keeps snapshot helpers private and restores exact original validator on rollback',async()=>{
    const permissions=await rows("SELECT has_function_privilege('authenticated','legal_memo_calc_private.validate_snapshot_statement(uuid,uuid,jsonb,jsonb)','EXECUTE') allowed");
    assert.equal(permissions[0].allowed,false);
    const rollback=await read('../../supabase/rollbacks/20260909002436_validate_filing_memo_statement_details.rollback.sql');
    await db.exec(rollback.replace(/^BEGIN;/m,'').replace(/^COMMIT;/m,''));
    const hash=(await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE oid='public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid,uuid,jsonb)'::regprocedure"))[0].hash;
    assert.equal(hash,'314ebbe34fec9c763825253b51eceb99');
  });
  const factsGate=async()=>(await rows('SELECT legal_memo_calc_private.validate_snapshot_facts($1,$2,$3) missing',[company,contract,{memoSnapshotId:other}]))[0].missing;
  for(const [label,sql,key] of [
    ['nationality',"UPDATE customers SET nationality='محدثة'",'parties_changed'],
    ['phone',"UPDATE customers SET phone='updated-phone'",'parties_changed'],
    ['name',"UPDATE customers SET first_name_ar='محدث'",'parties_changed'],
    ['contract rent','UPDATE contracts SET monthly_amount=1800','contract_changed'],
    ['contract date',"UPDATE contracts SET end_date='2028-11-30'",'contract_changed'],
    ['vehicle VIN',"UPDATE vehicles SET vin='updated-vin'",'vehicle_changed'],
    ['vehicle model',"UPDATE vehicles SET model='Updated'",'vehicle_changed'],
  ]) it('requires a new memo after changing '+label,async()=>{
    await snapshotFixture(); assert.deepEqual(await factsGate(),[]);
    await db.exec(sql);
    assert.ok((await factsGate()).includes('memoSnapshot.'+key));
  });
  for(const [label,sql] of [
    ['quarantined',"UPDATE contract_documents SET legal_evidence_state='quarantined'"],
    ['superseded',"UPDATE contract_documents SET superseded_by_document_id='77777777-7777-4777-8777-777777777777'"],
    ['missing file',"UPDATE contract_documents SET file_path=' '"],
    ['different contract',"UPDATE contract_documents SET contract_id='77777777-7777-4777-8777-777777777777'"],
    ['deleted','DELETE FROM contract_documents'],
  ]) it('does not cite a delivery document that became '+label,async()=>{
    await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,delivery_handover_date,delivery_handover_document_id) VALUES($1,$2,'2024-01-01',$3)",[company,contract,invoice]);
    await rows("INSERT INTO contract_documents(id,company_id,contract_id,document_type,file_path) VALUES($1,$2,$3,'handover','fixture.pdf')",[invoice,company,contract]);
    await snapshotFixture(undefined,{handoverInfo:{date:'01/01/2024',documented:true}});
    assert.deepEqual(await factsGate(),[]);
    await db.exec(sql); assert.ok((await factsGate()).includes('memoSnapshot.evidence_unavailable'));
  });
  it('detects changed notice wording and proof while respecting traffic-only scope',async()=>{
    await rows("INSERT INTO contract_documents(id,company_id,contract_id,document_type,file_path) VALUES($1,$2,$3,'notice','fixture.pdf')",[invoice,company,contract]);
    await rows("INSERT INTO legal_case_formal_notices VALUES($1,$2,'payment_demand','2026-08-01','2026-08-02',true,$3,7,'email')",[company,contract,invoice]);
    await snapshotFixture(undefined,{formalNotices:[{noticeType:'payment_demand',sentOn:'2026-08-01',deliveredOn:'2026-08-02',confirmed:true,proofDocumentId:invoice,graceDays:7,methodLabel:'البريد الإلكتروني'}]});
    assert.deepEqual(await factsGate(),[]);
    await db.exec("UPDATE legal_case_formal_notices SET delivered_on='2026-08-03'");
    assert.ok((await factsGate()).includes('memoSnapshot.notices_changed'));
    await db.exec("UPDATE legal_case_memo_snapshots SET payload=jsonb_set(payload,'{claimScope}','\"traffic_violations_only\"'); UPDATE contract_documents SET legal_evidence_state='quarantined'");
    assert.deepEqual(await factsGate(),[]);
  });
  it('compares each verified damage description even when net damages do not change',async()=>{
    await rows("INSERT INTO contract_documents(id,company_id,contract_id,document_type,file_path) VALUES($1,$2,$3,'damage','fixture.pdf')",[invoice,company,contract]);
    await rows("INSERT INTO legal_case_damage_costs(company_id,contract_id,amount,verified,evidence_document_id,cost_type,description) VALUES($1,$2,50,true,$3,'repair','Original')",[company,contract,invoice]);
    await snapshotFixture(undefined,{damages:50,damageCostItems:[{type:'repair',description:'Original',amount:50}]});
    assert.deepEqual(await factsGate(),[]);
    await db.exec("UPDATE legal_case_damage_costs SET description='Different repair'");
    assert.ok((await factsGate()).includes('memoSnapshot.damage_details_changed'));
  });
  it('keeps factual helpers private and restores the financial validator exactly',async()=>{
    assert.equal((await rows("SELECT has_function_privilege('authenticated','legal_memo_calc_private.validate_snapshot_facts(uuid,uuid,jsonb)','EXECUTE') allowed"))[0].allowed,false);
    const rollback=await read('../../supabase/rollbacks/20260909004625_validate_filing_memo_facts_and_evidence.rollback.sql');
    await db.exec(rollback.replace(/^BEGIN;/m,'').replace(/^COMMIT;/m,''));
    assert.equal((await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE oid='public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid,uuid,jsonb)'::regprocedure"))[0].hash,'b42cb6186fc3a23dfea9b95c08d446ea');
    assert.equal((await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE oid='legal_memo_calc_private.read_traffic(uuid,uuid,date)'::regprocedure"))[0].hash,'89991407ca0cd6292e5481c535a6b2e1');
  });
  it('distinguishes a newly assigned official court number from internal preparation references',async()=>{
    await rows("INSERT INTO legal_cases(id,company_id,contract_id,case_number,created_at) VALUES($1,$2,$3,'CASE-TEST',now())",[invoice,company,contract]);
    await snapshotFixture(); assert.deepEqual(await factsGate(),[]);
    await db.exec("UPDATE legal_cases SET case_number='2026/1234'");
    assert.ok((await factsGate()).includes('memoSnapshot.case_number_changed'));
  });
  it('checks the documented expiry date and detects a later renewal',async()=>{
    await rows("INSERT INTO contract_documents(id,company_id,contract_id,document_type,file_path) VALUES($1,$2,$3,'signed_contract','fixture.pdf')",[invoice,company,contract]);
    await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,rescission_strategy,termination_type,termination_date,termination_date_status,termination_supporting_document_id) VALUES($1,$2,'natural_expiry','contract_expired','2026-08-31','confirmed',$3)",[company,contract,invoice]);
    await snapshotFixture(undefined,{terminationPath:'natural_expiry',terminationInfo:{type:'contract_expired',date:'31/08/2026',status:'confirmed'}});
    assert.deepEqual(await factsGate(),[]);
    await db.exec("UPDATE legal_case_litigation_profile SET renewal_applies=true,renewed_end_date='2027-08-31'");
    assert.ok((await factsGate()).includes('memoSnapshot.termination_changed'));
  });
  for(const state of ['quarantined','superseded']) it('does not treat '+state+' traffic proof as evidence in the canonical claim',async()=>{
    await penalty(); assert.equal((await claim()).components.traffic_violations,500);
    await rows('UPDATE contract_documents SET legal_evidence_state=$1',[state]);
    const statement=await claim();
    assert.equal(statement.traffic_settlement.proof_ready,false);
    assert.equal(statement.components.traffic_violations,0);
    assert.equal(statement.total,1700);
    assert.equal(Number((await rows('SELECT amount FROM penalties'))[0].amount),500);
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
