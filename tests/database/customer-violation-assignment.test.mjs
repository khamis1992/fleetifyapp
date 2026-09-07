import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
let db;
const company='11111111-1111-4111-8111-111111111111', actor='22222222-2222-4222-8222-222222222222';
const contract='33333333-3333-4333-8333-333333333333', vehicle='44444444-4444-4444-8444-444444444444';
const penalty='55555555-5555-4555-8555-555555555555', other='66666666-6666-4666-8666-666666666666';
const preview=async()=> (await db.query('select preview_customer_violation_assignments_v1($1) result',[company])).rows[0].result;
const assign=async(items)=> (await db.query('select assign_customer_violations_v1($1,$2::jsonb) result',[company,JSON.stringify(items)])).rows[0].result;
before(async()=>{
  db=new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE profiles(user_id uuid,company_id uuid,is_active boolean);
    CREATE TABLE vehicles(id uuid PRIMARY KEY,company_id uuid,plate_number text);
    CREATE TABLE customers(id uuid PRIMARY KEY,company_id uuid,company_name text,first_name_ar text,last_name_ar text,first_name text,last_name text);
    CREATE TABLE contracts(id uuid PRIMARY KEY,company_id uuid,vehicle_id uuid REFERENCES vehicles,customer_id uuid REFERENCES customers,
      start_date date,end_date date,status text,contract_number text);
    CREATE TABLE penalties(id uuid PRIMARY KEY,company_id uuid,customer_id uuid,contract_id uuid,vehicle_id uuid,vehicle_plate text,
      penalty_date date,penalty_number text,amount numeric,status text,payment_status text,paid_by_company boolean,customer_payment_status text,
      responsibility_party text,responsible_customer_id uuid,responsibility_reason text,responsibility_decided_at timestamptz,responsibility_decided_by uuid);
    CREATE TABLE contract_amendments(company_id uuid,contract_id uuid,status text,original_values jsonb,new_values jsonb);
    CREATE TABLE contract_vehicle_returns(company_id uuid,contract_id uuid,vehicle_id uuid,status text,return_date date);
    CREATE TABLE invoices(company_id uuid,penalty_id uuid,status text);
    CREATE TABLE traffic_violation_payments(company_id uuid,traffic_violation_id uuid,status text);
    CREATE TABLE audit_logs(company_id uuid,user_id uuid,action text,resource_type text,resource_id uuid,old_values jsonb,new_values jsonb);
  `);
  await db.exec(await readFile('supabase/migrations/20260906200000_customer_violation_assignment.sql','utf8'));
});
after(async()=>{await db?.close();});
beforeEach(async()=>{
  await db.exec(`TRUNCATE profiles,vehicles,customers,contracts,penalties,contract_amendments,contract_vehicle_returns,invoices,traffic_violation_payments,audit_logs CASCADE;
    INSERT INTO profiles VALUES('${actor}','${company}',true);
    INSERT INTO vehicles VALUES('${vehicle}','${company}','QA 123');
    INSERT INTO customers(id,company_id,first_name) VALUES('${actor}','${company}','Customer');
    INSERT INTO contracts VALUES('${contract}','${company}','${vehicle}','${actor}','2026-01-01','2026-12-31','active','C-1');
    INSERT INTO penalties(id,company_id,vehicle_plate,penalty_date,penalty_number,amount,status,payment_status)
      VALUES('${penalty}','${company}','QA123','2026-06-01','P-1',200,'pending','unpaid');
    SELECT set_config('request.jwt.claim.sub','${actor}',false);`);
});
it('previews without writing, assigns the actual customer and records the old values',async()=>{
  const rows=await preview(); assert.equal(rows[0].ready,true);
  assert.equal((await db.query('select customer_id from penalties')).rows[0].customer_id,null);
  assert.deepEqual(await assign(rows),{assigned:1});
  const p=(await db.query('select * from penalties')).rows[0];
  assert.equal(p.customer_id,actor);assert.equal(p.contract_id,contract);assert.equal(p.vehicle_id,vehicle);
  assert.equal(p.responsibility_party,'customer');assert.equal(p.responsible_customer_id,actor);
  assert.equal((await db.query('select old_values from audit_logs')).rows[0].old_values.customer_id,null);
  await assert.rejects(assign(rows),/تغيرت/);
});
it('never falls back to the latest or nearest contract outside the dates',async()=>{
  await db.exec("update penalties set penalty_date='2027-01-01'");
  assert.equal((await preview())[0].ready,false);
});
it('does not prefer active contracts when two contracts overlap',async()=>{
  await db.exec(`INSERT INTO contracts SELECT '${other}',company_id,vehicle_id,customer_id,start_date,end_date,'expired','C-2' FROM contracts`);
  assert.match((await preview())[0].reason,/متداخلة/);
});
it('requires review for duplicate normalized plates',async()=>{
  await db.exec(`insert into vehicles values('${other}','${company}','QA 123')`);
  assert.match((await preview())[0].reason,/أكثر من مركبة/);
});
it('excludes cancelled contracts and missing dates',async()=>{
  await db.exec("update contracts set status='cancelled'");assert.equal((await preview())[0].ready,false);
  await db.exec("update penalties set penalty_date=null");assert.equal((await preview())[0].ready,false);
});
it('reviews return day and dates after return',async()=>{
  await db.exec(`insert into contract_vehicle_returns values('${company}','${contract}','${vehicle}','approved','2026-06-01')`);
  assert.match((await preview())[0].reason,/الإرجاع/);
});
it('reviews historical vehicle changes even if the old vehicle is no longer on the contract',async()=>{
  await db.exec(`insert into contract_amendments values('${company}','${contract}','approved','{"vehicle_id":"${vehicle}"}','{"vehicle_id":"${other}"}')`);
  assert.match((await preview())[0].reason,/تبديل/);
});
it('blocks company responsibility, partial payments and existing invoices',async()=>{
  await db.exec("update penalties set responsibility_party='company'");assert.equal((await preview())[0].ready,false);
  await db.exec("update penalties set responsibility_party=null,payment_status='partially_paid'");assert.equal((await preview())[0].ready,false);
  await db.exec(`update penalties set payment_status='unpaid';insert into invoices values('${company}','${penalty}','pending')`);
  assert.match((await preview())[0].reason,/مستند مالي/);
});
it('rejects stale preview tokens after contract or penalty changes',async()=>{
  const rows=await preview(); await db.exec("update contracts set end_date='2026-12-30'");
  await assert.rejects(assign(rows),/تغيرت/);
  const latest=await preview();await db.exec('update penalties set amount=250');await assert.rejects(assign(latest),/تغيرت/);
});
it('rolls back every assignment if a later item is stale',async()=>{
  await db.exec(`insert into penalties select '${other}',company_id,customer_id,contract_id,vehicle_id,vehicle_plate,penalty_date,'P-2',amount,status,payment_status,paid_by_company,customer_payment_status,responsibility_party,responsible_customer_id,responsibility_reason,responsibility_decided_at,responsibility_decided_by from penalties`);
  const rows=await preview();rows[1].token='stale';await assert.rejects(assign(rows),/تغيرت/);
  assert.equal((await db.query('select count(*)::int n from penalties where customer_id is not null')).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from audit_logs')).rows[0].n,0);
});
it('rejects inactive members and cross-company access',async()=>{
  await db.exec('update profiles set is_active=false');await assert.rejects(preview(),/غير مصرح/);
  await db.exec(`update profiles set is_active=true,company_id='${other}'`);await assert.rejects(preview(),/غير مصرح/);
});
it('rejects empty, duplicate and oversized batches',async()=>{
  const rows=await preview();await assert.rejects(assign([]),/50/);
  await assert.rejects(assign([rows[0],rows[0]]),/مكررة/);
  await assert.rejects(assign(Array(51).fill(rows[0])),/50/);
});
