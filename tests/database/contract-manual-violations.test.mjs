import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const company='11111111-1111-4111-8111-111111111111', actor='22222222-2222-4222-8222-222222222222';
const contract='33333333-3333-4333-8333-333333333333', vehicle='44444444-4444-4444-8444-444444444444';
const key='55555555-5555-4555-8555-555555555555', other='66666666-6666-4666-8666-666666666666';
let db;
const admin=()=>db.exec('SET SESSION AUTHORIZATION postgres');
const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
const create=async(o={})=>(await rows('select create_manual_contract_traffic_violation_v1($1,$2,$3,$4,$5,$6,$7,$8) result',
  [o.company??company,contract,o.vehicle??vehicle,'speeding',o.date??'2025-06-01',o.amount??120,o.key??key,o.number??'DAILY-QA']))[0].result;
const cancel=async(id,reason='QA reversal')=>(await rows('select cancel_traffic_violation_atomic_v1($1,$2) result',[id,reason]))[0].result;

describe('manual contract violation commands on PostgreSQL', {concurrency:false},()=>{
  before(async()=>{
    db=new PGlite();
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('role',current_setting('request.jwt.claim.role',true)) $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,anon,service_role;
      CREATE TABLE profiles(user_id uuid,company_id uuid,is_active boolean);
      CREATE TABLE user_roles(user_id uuid,role text);
      CREATE FUNCTION get_user_company_id() RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT company_id FROM public.profiles WHERE user_id=auth.uid() AND is_active LIMIT 1 $$;
      CREATE TABLE contracts(id uuid PRIMARY KEY,company_id uuid,customer_id uuid,vehicle_id uuid,contract_number text,start_date date,end_date date);
      CREATE TABLE traffic_violations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,vehicle_id uuid,
        violation_number text,violation_type text,violation_date date,fine_amount numeric,total_amount numeric,location text,
        violation_description text,import_source text,match_confidence text,status text,responsibility_party text,
        responsibility_reason text,responsibility_decided_at timestamptz,responsibility_decided_by uuid,
        responsible_customer_id uuid,original_contract_number text,notes text,updated_at timestamptz DEFAULT now(),
        liability_journal_entry_id uuid,liability_amount numeric DEFAULT 0);
      CREATE TABLE traffic_violation_payments(company_id uuid,traffic_violation_id uuid,status text);
      CREATE TABLE audit_logs(company_id uuid,user_id uuid,action text,resource_type text,resource_id uuid,entity_name text,
        changes_summary text,new_values jsonb,severity text,status text,metadata jsonb);
      CREATE TABLE contract_operations_log(contract_id uuid,company_id uuid,operation_type text,operation_details jsonb,
        old_values jsonb,new_values jsonb,notes text,performed_by uuid);`);
    for (const filename of ['20260903180758_atomic_idempotent_manual_contract_violation.sql','20260903173744_atomic_traffic_violation_cancellation.sql']) {
      await db.exec(await readFile(new URL(`../../supabase/migrations/${filename}`,import.meta.url),'utf8'));
    }
  });
  after(async()=>{await db?.close();});
  beforeEach(async()=>{
    await admin();
    await db.exec(`TRUNCATE profiles,user_roles,contracts,traffic_violations,traffic_violation_payments,audit_logs,contract_operations_log;
      INSERT INTO profiles VALUES('${actor}','${company}',true);
      INSERT INTO contracts VALUES('${contract}','${company}','${actor}','${vehicle}','QA-CONTRACT','2025-01-01','2025-12-31');
      SELECT set_config('request.jwt.claim.sub','${actor}',false),set_config('request.jwt.claim.role','authenticated',false);
      SET SESSION AUTHORIZATION authenticated;`);
  });
  it('creates once, replays without another audit and cancels once',async()=>{
    const added=await create();
    assert.equal(added.created,true);
    assert.deepEqual(await create(),{success:true,created:false,duplicate_reason:'idempotency_key',violation_id:added.violation_id,violation_number:'DAILY-QA'});
    assert.equal((await cancel(added.violation_id)).idempotent_replay,false);
    assert.equal((await cancel(added.violation_id)).idempotent_replay,true);
    await admin();
    assert.equal((await rows('select count(*)::int n from audit_logs'))[0].n,1);
    assert.equal((await rows('select count(*)::int n from contract_operations_log'))[0].n,1);
    assert.equal((await rows('select status from traffic_violations'))[0].status,'cancelled');
  });
  it('rejects a changed amount on retry',async()=>{
    await create();
    await assert.rejects(create({amount:121}),/different traffic violation/);
  });
  it('rejects different details on a repeated violation number even with a new request key',async()=>{
    await create();
    await assert.rejects(create({amount:121,key:other}),/different details/);
  });
  it('blocks cancellation with recognized liability even without a payment',async()=>{
    const added=await create();
    await admin(); await db.exec('update traffic_violations set liability_amount=120');
    await db.exec('SET SESSION AUTHORIZATION authenticated');
    await assert.rejects(cancel(added.violation_id),/HAS_RECOGNIZED_LIABILITY/);
  });
  it('rejects an inactive member during cancellation',async()=>{
    const added=await create();
    await admin(); await db.exec('update profiles set is_active=false');
    await db.exec('SET SESSION AUTHORIZATION authenticated');
    await assert.rejects(cancel(added.violation_id),/COMPANY_ACCESS_DENIED/);
  });
  for(const [name,input,error] of [
    ['another company',{company:other},/active member/],['another vehicle',{vehicle:other},/vehicle/],
    ['outside contract',{date:'2024-01-01'},/outside the contract/],['future date',{date:'2099-01-01'},/future/],
    ['zero amount',{amount:0},/greater than zero/],['negative amount',{amount:-5},/greater than zero/],
  ]) it(`rejects ${name}`,async()=>{await assert.rejects(create(input),error);});
  it('rejects anonymous execution',async()=>{
    await admin(); await db.exec('SET SESSION AUTHORIZATION anon');
    await assert.rejects(create(),/permission denied/);
  });
  it('requires a cancellation reason and blocks active payment evidence',async()=>{
    const added=await create();
    await assert.rejects(cancel(added.violation_id,''),/REASON_REQUIRED/);
    await admin();
    await db.query('insert into traffic_violation_payments values($1,$2,$3)',[company,added.violation_id,'completed']);
    await db.exec('SET SESSION AUTHORIZATION authenticated');
    await assert.rejects(cancel(added.violation_id),/HAS_ACTIVE_PAYMENTS/);
  });
  it('denies another company during cancellation without changing the record',async()=>{
    const added=await create();
    await admin(); await db.query('update profiles set company_id=$1',[other]);
    await db.exec('SET SESSION AUTHORIZATION authenticated');
    await assert.rejects(cancel(added.violation_id),/COMPANY_ACCESS_DENIED/);
    await admin(); assert.equal((await rows('select status from traffic_violations'))[0].status,'pending');
  });
});
