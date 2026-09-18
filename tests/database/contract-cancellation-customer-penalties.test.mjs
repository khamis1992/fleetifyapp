import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const company='11111111-1111-4111-8111-111111111111',actor='22222222-2222-4222-8222-222222222222';
const contract='33333333-3333-4333-8333-333333333333',customer='44444444-4444-4444-8444-444444444444';
let db;
const rows=async(sql,args=[])=>(await db.query(sql,args)).rows;
const cancel=async(transfer=false,tenant=company)=>(await rows(
  'select cancel_contract_with_company_traffic_penalties_v1($1,$2,$3,$4) result',
  [tenant,contract,'Customer requested cancellation',transfer]))[0].result;
describe('actual cancellation SQL preserves customer traffic liability',()=>{
  before(async()=>{
    db=new PGlite();
    await db.exec(`CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${actor}'::uuid$$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT 'authenticated'::text$$;
      CREATE TABLE profiles(user_id uuid,company_id uuid,is_active boolean);
      CREATE TABLE contracts(id uuid PRIMARY KEY,company_id uuid,customer_id uuid,contract_number text,status text,suspension_reason text,updated_at timestamptz);
      CREATE TABLE penalties(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,customer_id uuid,responsibility_party text,amount numeric,payment_status text,status text);
      CREATE TABLE invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,paid_amount numeric,status text);
      CREATE TABLE payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,amount numeric,payment_status text);
      CREATE TABLE contract_operations_log(contract_id uuid,company_id uuid,operation_type text,operation_details jsonb,old_values jsonb,new_values jsonb,notes text,performed_by uuid);
    `);
    await db.exec(await readFile(new URL('../../supabase/migrations/20260906155723_preserve_customer_penalties_on_contract_cancellation.sql',import.meta.url),'utf8'));
    // Include the actual legacy trigger that was missing from the earlier fixture.
    const legacy=await readFile(new URL('../../supabase/migrations/20260813072633_traffic_penalty_rental_invoice_legal_guards.sql',import.meta.url),'utf8');
    await db.exec(legacy.slice(
      legacy.indexOf('CREATE OR REPLACE FUNCTION public.trg_block_contract_close_with_unpaid_penalties()'),
      legacy.indexOf('CREATE OR REPLACE FUNCTION public.trg_enforce_rental_eligibility()'),
    ));
    await db.exec(await readFile(new URL('../../supabase/migrations/20260906171751_allow_contract_close_with_customer_penalties.sql',import.meta.url),'utf8'));
    await db.exec((await readFile(new URL('../../supabase/migrations/20260903172440_unify_cancellation_vehicle_return.sql',import.meta.url),'utf8'))
      .replace('BEGIN;', '').replace('COMMIT;', '')
      .replace(/REVOKE ALL[\s\S]*?TO authenticated, service_role;/, ''));
  });
  after(async()=>db?.close());
  beforeEach(async()=>db.exec(`BEGIN;
    INSERT INTO profiles VALUES('${actor}','${company}',true);
    INSERT INTO contracts VALUES('${contract}','${company}','${customer}','QA','active',null,now());
    INSERT INTO penalties(company_id,contract_id,customer_id,responsibility_party,amount,payment_status,status)
      VALUES('${company}','${contract}','${customer}','customer',5700,'unpaid','pending');
    INSERT INTO invoices(company_id,contract_id,paid_amount,status) VALUES('${company}','${contract}',100,'partial');
    INSERT INTO payments(company_id,contract_id,amount,payment_status) VALUES('${company}','${contract}',100,'completed');
  `));
  afterEach(async()=>db.exec('ROLLBACK'));
  it('cancels with open penalties and preserves every penalty, invoice and payment field',async()=>{
    const before={};
    for(const table of ['penalties','invoices','payments']) before[table]=await rows('select * from '+table);
    const result=await cancel();
    assert.equal(result.status,'cancelled');
    assert.equal(result.transferred_penalty_count,0);
    assert.equal(result.transferred_penalty_amount,0);
    assert.equal(result.retained_penalty_amount,5700);
    for(const table of Object.keys(before)) assert.deepEqual(await rows('select * from '+table),before[table]);
    assert.equal((await rows('select operation_details from contract_operations_log'))[0].operation_details.penalty_resolution,'customer_retained');
  });
  it('replay does not duplicate the audit or transfer liability',async()=>{
    await cancel(); assert.equal((await cancel()).status,'already_cancelled');
    assert.equal((await rows('select count(*)::int n from contract_operations_log'))[0].n,1);
    assert.equal((await rows('select responsibility_party from penalties'))[0].responsibility_party,'customer');
  });
  it('rejects stale company transfer requests before changing the contract',async()=>{
    await db.exec('SAVEPOINT reject');
    await assert.rejects(cancel(true),/تبقى المخالفات على العميل/);
    await db.exec('ROLLBACK TO SAVEPOINT reject');
    assert.equal((await rows('select status from contracts'))[0].status,'active');
  });
  it('rejects another company',async()=>{await assert.rejects(cancel(false,customer),/صلاحية/);});
  it('rejects inactive users',async()=>{
    await db.exec('UPDATE profiles SET is_active=false');
    await assert.rejects(cancel(),/صلاحية/);
  });
  it('cancels without open penalties',async()=>{
    await db.exec('DELETE FROM penalties');
    assert.equal((await cancel()).retained_penalty_count,0);
  });
  it('reproduces the old trigger failure, then permits the same API call after migration',async()=>{
    await db.exec((await readFile(new URL('../../supabase/rollbacks/20260906171751_allow_contract_close_with_customer_penalties.rollback.sql',import.meta.url),'utf8'))
      .replace('BEGIN;', '').replace('COMMIT;', ''));
    await db.exec('SAVEPOINT legacy_gate');
    await assert.rejects(cancel(),/لا يمكن إغلاق العقد/);
    await db.exec('ROLLBACK TO SAVEPOINT legacy_gate');
    await db.exec((await readFile(new URL('../../supabase/migrations/20260906171751_allow_contract_close_with_customer_penalties.sql',import.meta.url),'utf8'))
      .replace('BEGIN;', '').replace('COMMIT;', ''));
    const result=(await rows('select cancel_contract_with_return_and_penalties_v2($1,$2,$3,false,null) result',
      [company,contract,'Customer cancellation']))[0].result;
    assert.equal(result.status,'cancelled');
    assert.equal(result.transferred_penalty_count,0);
    assert.equal((await rows('select responsibility_party from penalties'))[0].responsibility_party,'customer');
  });
  for(const status of ['completed','closed','terminated','expired']) {
    it(`preserves penalty ownership when changing status to ${status}`,async()=>{
      const before=await rows('select * from penalties');
      await rows('update contracts set status=$1 where id=$2',[status,contract]);
      assert.deepEqual(await rows('select * from penalties'),before);
    });
  }
});
