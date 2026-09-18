import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const company='11111111-1111-4111-8111-111111111111', actor='22222222-2222-4222-8222-222222222222';
const previous='33333333-3333-4333-8333-333333333333', vehicle='44444444-4444-4444-8444-444444444444';
const customer='55555555-5555-4555-8555-555555555555', created='66666666-6666-4666-8666-666666666666';
let db;
const rows=async(sql,args=[])=>(await db.query(sql,args)).rows;
const args={p_company_id:company,p_vehicle_id:vehicle,p_customer_id:customer,p_start_date:'2026-09-06',p_end_date:'2026-10-06',p_idempotency_key:'handoff-test-1'};
const handoff=async(changes={},timestamp='2026-09-06T00:00:00Z')=>(await rows(
  'select create_contract_with_vehicle_handoff_v1($1,$2,$3,$4) result',
  [{...args,...changes},previous,timestamp,'Customer requested a replacement contract']))[0].result;

describe('atomic vehicle handoff SQL',()=>{
  before(async()=>{
    db=new PGlite();
    await db.exec(`CREATE SCHEMA auth;
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${actor}'::uuid$$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT 'authenticated'::text$$;
      CREATE TABLE profiles(user_id uuid,company_id uuid,is_active boolean);
      CREATE TABLE vehicles(id uuid PRIMARY KEY,company_id uuid);
      CREATE TABLE contracts(id uuid PRIMARY KEY,company_id uuid,vehicle_id uuid,customer_id uuid,status text,
        start_date date,end_date date,updated_at timestamptz,legal_status text,vehicle_returned boolean,
        creation_idempotency_key text,suspension_reason text);
      CREATE TABLE penalties(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,
        responsibility_party text,amount numeric,payment_status text,status text);
      CREATE TABLE invoices(id uuid,company_id uuid,contract_id uuid,status text);
      CREATE TABLE contract_operations_log(company_id uuid,contract_id uuid,operation_type text,
        operation_details jsonb,old_values jsonb,new_values jsonb,notes text,performed_by uuid);
      CREATE FUNCTION create_contract_with_violation_override_atomic(p_company_id uuid,p_vehicle_id uuid,
        p_customer_id uuid,p_start_date date,p_end_date date,p_idempotency_key text,p_description text DEFAULT NULL)
      RETURNS jsonb LANGUAGE plpgsql AS $$BEGIN
        IF p_description='fail' THEN RETURN jsonb_build_object('success',false,'error','Billing failed'); END IF;
        INSERT INTO public.contracts(id,company_id,vehicle_id,customer_id,status,start_date,end_date,creation_idempotency_key)
          VALUES('${created}',p_company_id,p_vehicle_id,p_customer_id,'active',p_start_date,p_end_date,p_idempotency_key)
          ON CONFLICT(id) DO NOTHING;
        RETURN jsonb_build_object('success',true,'billing_graph_created',true,'contract_id','${created}');
      END$$;
    `);
    await db.exec(await readFile(new URL('../../supabase/migrations/20260906155723_preserve_customer_penalties_on_contract_cancellation.sql',import.meta.url),'utf8'));
    const cancellation=await readFile(new URL('../../supabase/migrations/20260903172440_unify_cancellation_vehicle_return.sql',import.meta.url),'utf8');
    await db.exec(cancellation.slice(cancellation.indexOf('CREATE OR REPLACE FUNCTION'),cancellation.indexOf('REVOKE')));
    const migration=await readFile(new URL('../../supabase/migrations/20260906184734_fix_expired_legal_reversal_and_vehicle_handoff.sql',import.meta.url),'utf8');
    await db.exec(migration.slice(migration.indexOf('CREATE OR REPLACE FUNCTION'),migration.indexOf('DO $guard$')));
  });
  after(async()=>db?.close());
  beforeEach(async()=>db.exec(`BEGIN;
    INSERT INTO profiles VALUES('${actor}','${company}',true);
    INSERT INTO vehicles VALUES('${vehicle}','${company}');
    INSERT INTO contracts(id,company_id,vehicle_id,customer_id,status,start_date,end_date,updated_at)
      VALUES('${previous}','${company}','${vehicle}','${customer}','active','2026-01-01','2026-12-31','2026-09-06Z');
    INSERT INTO penalties(company_id,contract_id,responsibility_party,amount,payment_status,status)
      VALUES('${company}','${previous}','customer',750,'unpaid','pending');
  `));
  afterEach(async()=>db.exec('ROLLBACK'));
  it('cancels the predecessor, creates one successor, preserves penalties, and replays without new writes',async()=>{
    const penalties=await rows('select * from penalties');
    assert.equal((await handoff()).vehicle_handoff_completed,true);
    assert.equal((await rows('select status from contracts where id=$1',[previous]))[0].status,'cancelled');
    const audit=await rows('select * from contract_operations_log');
    await handoff();
    assert.deepEqual(await rows('select * from penalties'),penalties);
    assert.deepEqual(await rows('select * from contract_operations_log'),audit);
    assert.equal((await rows('select count(*)::int n from contracts'))[0].n,2);
  });
  it('rolls cancellation and audit back when billing returns failure',async()=>{
    await db.exec('SAVEPOINT attempt');
    await assert.rejects(handoff({p_description:'fail'}),/Billing failed/);
    await db.exec('ROLLBACK TO attempt');
    assert.equal((await rows('select status from contracts'))[0].status,'active');
    assert.deepEqual(await rows('select * from contract_operations_log'),[]);
  });
  it('rejects changed versions before cancelling',async()=>{
    await assert.rejects(handoff({},'2026-09-05Z'),/تغير العقد السابق/);
  });
  it('rejects a different company',async()=>{
    await assert.rejects(handoff({p_company_id:actor}),/الشركة الحالية/);
  });
  it('does not cancel legal contracts during a handoff',async()=>{
    await db.exec("update contracts set status='under_legal_procedure'");
    await assert.rejects(handoff(),/ملفه القانوني/);
  });
  it('rejects multiple occupying contracts',async()=>{
    await db.exec(`INSERT INTO contracts(id,company_id,vehicle_id,status,start_date,end_date)
      VALUES('${actor}','${company}','${vehicle}','active','2026-09-01','2026-12-31')`);
    await assert.rejects(handoff(),/عدة عقود متداخلة/);
  });
  it('rejects a changed payload on retry',async()=>{
    await handoff();
    await assert.rejects(handoff({p_end_date:'2026-11-06'}),/معرف العملية مستخدم/);
  });
  it('does not discard an unsupported security deposit',async()=>{
    await db.exec('SAVEPOINT attempt');
    await assert.rejects(handoff({p_deposit_amount:1000}),/تحديث إنشاء العقد غير متاح/);
    await db.exec('ROLLBACK TO attempt');
    assert.equal((await rows('select status from contracts'))[0].status,'active');
  });
  it('applies the complete migration and rolls back both existing functions exactly',async()=>{
    const original=await readFile(new URL('./fixtures/vehicle-handoff-original-functions.sql',import.meta.url),'utf8');
    await db.exec(original);
    const definitions=async()=>rows("select proname,pg_get_functiondef(oid) definition from pg_proc where pronamespace='public'::regnamespace and proname in ('revert_contract_from_legal_v2','resolve_and_guard_contract_vehicle_identity') order by proname");
    const before=await definitions();
    const migration=await readFile(new URL('../../supabase/migrations/20260906184734_fix_expired_legal_reversal_and_vehicle_handoff.sql',import.meta.url),'utf8');
    await db.exec(migration.replace('BEGIN;','').replace('COMMIT;',''));
    const after=await definitions();
    assert.match(after.find(f=>f.proname==='revert_contract_from_legal_v2').definition,/THEN 'expired' ELSE 'active'/);
    assert.match(after.find(f=>f.proname==='resolve_and_guard_contract_vehicle_identity').definition,/FOR UPDATE/);
    const rollback=await readFile(new URL('../../supabase/rollbacks/20260906184734_fix_expired_legal_reversal_and_vehicle_handoff.rollback.sql',import.meta.url),'utf8');
    await db.exec(rollback.replace('BEGIN;','').replace('COMMIT;',''));
    assert.deepEqual(await definitions(),before);
  });
});
