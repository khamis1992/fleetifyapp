import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

// Actual pending return and orchestration SQL. Cancellation financial effects
// and vehicle status resolution are explicit doubles, not full-schema coverage.
const company='11111111-1111-4111-8111-111111111111',actor='22222222-2222-4222-8222-222222222222';
const contract='33333333-3333-4333-8333-333333333333',vehicle='44444444-4444-4444-8444-444444444444';
let db;
const rows=async(sql,args=[])=>(await db.query(sql,args)).rows;
const payload={inspection_date:'2026-01-31T12:00:00Z',odometer_reading:12000,fuel_level:50,vehicle_condition:'excellent'};
const cancel=async(returnPayload=payload)=>(await rows('select cancel_contract_with_return_and_penalties_v2($1,$2,$3,false,$4) result',
  [company,contract,'QA cancellation',returnPayload]))[0].result;

describe('atomic cancellation and vehicle return orchestration',()=>{
  before(async()=>{
    db=new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${actor}'::uuid$$;
      CREATE FUNCTION get_user_company_id() RETURNS uuid LANGUAGE sql AS $$SELECT '${company}'::uuid$$;
      CREATE TABLE user_roles(user_id uuid,role text);
      CREATE TABLE contracts(id uuid PRIMARY KEY,company_id uuid,vehicle_id uuid,status text,vehicle_returned boolean DEFAULT false,vehicle_status text,updated_at timestamptz);
      CREATE TABLE vehicles(id uuid PRIMARY KEY,company_id uuid,status text,current_mileage numeric,odometer_reading numeric,updated_at timestamptz);
      CREATE TABLE vehicle_condition_reports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,vehicle_id uuid,inspector_id uuid,
        inspection_type text CONSTRAINT vehicle_condition_reports_inspection_type_check CHECK (inspection_type IN ('pre_dispatch','post_dispatch','contract_inspection')),inspection_date timestamptz,mileage_reading integer,fuel_level numeric,overall_condition text,
        condition_items jsonb,damage_points jsonb,damage_items jsonb,photos jsonb,notes text,status text,created_at timestamptz DEFAULT now(),updated_at timestamptz);
      CREATE TABLE contract_operations_log(contract_id uuid,company_id uuid,operation_type text,operation_details jsonb,old_values jsonb,new_values jsonb,notes text,performed_by uuid);
      CREATE FUNCTION refresh_vehicle_operational_status_v1(uuid,uuid) RETURNS jsonb LANGUAGE sql AS $$SELECT '{"applied_status":"maintenance"}'::jsonb$$;
      CREATE FUNCTION cancel_contract_with_company_traffic_penalties_v1(uuid,uuid,text,boolean,uuid) RETURNS jsonb LANGUAGE plpgsql AS $$
      BEGIN UPDATE public.contracts SET status='cancelled' WHERE id=$2 AND company_id=$1;
      RETURN jsonb_build_object('success',true,'contract_id',$2); END;$$;`);
    for(const name of ['20260903170924_atomic_contract_vehicle_return','20260903172440_unify_cancellation_vehicle_return','20260906203000_allow_contract_condition_inspection_types']) {
      await db.exec(await readFile(new URL(`../../supabase/migrations/${name}.sql`,import.meta.url),'utf8'));
    }
  });
  after(async()=>{await db?.close();});
  beforeEach(async()=>{
    await db.exec(`BEGIN; INSERT INTO contracts VALUES('${contract}','${company}','${vehicle}','active',false,'rented',now());
      INSERT INTO vehicles VALUES('${vehicle}','${company}','maintenance',10000,11000,now());`);
  });
  afterEach(async()=>{await db.exec('ROLLBACK');});
  it('commits cancellation, report and mileage together, preserving maintenance status',async()=>{
    const result=await cancel();
    assert.equal(result.success,true);
    assert.equal(result.vehicle_return.vehicle_status,'maintenance');
    assert.equal(result.vehicle_return_recorded,true);
    assert.deepEqual((await rows('select status,vehicle_returned,vehicle_status from contracts'))[0],{status:'cancelled',vehicle_returned:true,vehicle_status:'maintenance'});
    assert.equal((await rows('select overall_condition from vehicle_condition_reports'))[0].overall_condition,'good');
    assert.equal((await rows('select inspection_type from vehicle_condition_reports'))[0].inspection_type,'check_out');
    assert.equal(Number((await rows('select current_mileage from vehicles'))[0].current_mileage),12000);
  });
  for(const [name,patch,error] of [
    ['lower mileage',{odometer_reading:10999},/MILEAGE_BELOW_CURRENT/],
    ['invalid fuel',{fuel_level:101},/INVALID_FUEL_LEVEL/],
    ['future date',{inspection_date:'2099-01-01'},/INVALID_RETURN_DATE/],
    ['invalid condition',{vehicle_condition:'unknown'},/INVALID_OVERALL_CONDITION/],
  ]) it(`rolls back the cancellation when return has ${name}`,async()=>{
    await db.exec('SAVEPOINT invalid_return');
    await assert.rejects(cancel({...payload,...patch}),error);
    await db.exec('ROLLBACK TO SAVEPOINT invalid_return');
    assert.equal((await rows('select status from contracts'))[0].status,'active');
    assert.equal(Number((await rows('select current_mileage from vehicles'))[0].current_mileage),10000);
    assert.equal((await rows('select count(*)::int n from vehicle_condition_reports'))[0].n,0);
  });
  it('retries a committed return without overwriting photos, mileage or audit',async()=>{
    const first=await cancel();
    await db.exec(`UPDATE vehicle_condition_reports SET photos='["original-evidence"]'::jsonb`);
    const second=await cancel({...payload,odometer_reading:13000});
    assert.equal(second.vehicle_return.report_id,first.vehicle_return.report_id);
    assert.equal(second.vehicle_return.idempotent_replay,true);
    assert.deepEqual((await rows('select photos from vehicle_condition_reports'))[0].photos,['original-evidence']);
    assert.equal(Number((await rows('select current_mileage from vehicles'))[0].current_mileage),12000);
    assert.equal((await rows('select count(*)::int n from contract_operations_log'))[0].n,1);
  });
  it('supports cancellation without falsely recording a vehicle return',async()=>{
    const result=await cancel(null);
    assert.equal(result.vehicle_return_recorded,false);
    assert.equal((await rows('select vehicle_returned from contracts'))[0].vehicle_returned,false);
    assert.equal((await rows('select count(*)::int n from vehicle_condition_reports'))[0].n,0);
  });
  it('does not expose either command to anonymous callers',async()=>{
    const privileges=await rows(`SELECT has_function_privilege('anon','public.cancel_contract_with_return_and_penalties_v2(uuid,uuid,text,boolean,jsonb,uuid)','EXECUTE') cancel,
      has_function_privilege('anon','public.record_contract_vehicle_return_v1(uuid,timestamptz,integer,numeric,text,jsonb,jsonb,jsonb,jsonb,text,uuid)','EXECUTE') return`);
    assert.deepEqual(privileges[0],{cancel:false,return:false});
  });
});
