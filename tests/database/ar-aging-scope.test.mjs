// Local synthetic PostgreSQL only. Does not accept a database URL or mutate live data.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const name='20261001034000_scope_ar_aging_without_payment_fanout';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const fixtureText=await read('./fixtures/ar-aging-live-before-scope.json');
assert.equal(createHash('sha256').update(fixtureText.replace(/\r\n/g,'\n')).digest('hex'),'d2e4d6f9619fcad6f92bd3b6eaf257656d9cb0beb3c48edb4235b2d434984c5a','Captured live aging definitions and column metadata must not drift');
const captured=JSON.parse(fixtureText);
const views=captured.views.map(row=>row.name).sort();
const tenant='11111111-1111-4111-8111-111111111111',foreign='22222222-2222-4222-8222-222222222222';
const user='33333333-3333-4333-8333-333333333333',foreignUser='44444444-4444-4444-8444-444444444444';
const customer='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',foreignCustomer='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
let db;
const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
const admin=()=>db.exec('RESET ROLE');
async function login(uid=user,company=tenant){await admin();await db.query("SELECT set_config('test.uid',$1,false),set_config('test.company',$2,false)",[uid,company]);await db.exec('SET ROLE authenticated');}
async function metadata(){return query(`SELECT c.oid,c.relname,pg_get_userbyid(c.relowner) owner,c.reloptions,pg_get_viewdef(c.oid,true) definition,
 (SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod)) ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) columns,
 (SELECT jsonb_agg(jsonb_build_object('grantee',x.grantee,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY x.grantee,x.privilege_type) FROM aclexplode(c.relacl) x) acl
 FROM pg_class c WHERE c.relname=ANY($1) ORDER BY c.relname`,[views]);}
const install=async()=>{await admin();await db.exec(await read('../../supabase/migrations/'+name+'.sql'));await login();};
describe('AR aging view fanout and company scope repair',()=>{
 beforeEach(async()=>{
  db=new PGlite();
  await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;CREATE SCHEMA auth;
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
   GRANT USAGE ON SCHEMA auth TO authenticated,anon,service_role;
   CREATE TABLE profiles(user_id uuid,company_id uuid,is_active boolean);
   CREATE TABLE customers(id uuid PRIMARY KEY,company_id uuid,first_name_ar text,last_name_ar text,first_name text,last_name text,company_name_ar text,company_name text,phone text,email text);
   CREATE TABLE invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,customer_id uuid,invoice_date date,due_date date,total_amount numeric,paid_amount numeric,balance_due numeric,status text,payment_status text,invoice_type text);
   CREATE TABLE payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,customer_id uuid,payment_date date,payment_status text);
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;ALTER TABLE customers ENABLE ROW LEVEL SECURITY;ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
   CREATE POLICY own_profile ON profiles FOR SELECT USING(user_id=auth.uid());
   CREATE POLICY own_invoice ON invoices FOR SELECT USING(company_id=nullif(current_setting('test.company',true),'')::uuid AND auth.uid() IS NOT NULL);
   CREATE POLICY own_customer ON customers FOR SELECT USING(company_id=nullif(current_setting('test.company',true),'')::uuid AND auth.uid() IS NOT NULL);
   CREATE POLICY own_payment ON payments FOR SELECT USING(company_id=nullif(current_setting('test.company',true),'')::uuid AND auth.uid() IS NOT NULL);
   GRANT SELECT ON profiles,invoices,customers,payments TO authenticated,anon,service_role;`);
  await db.query('INSERT INTO profiles VALUES($1,$3,true),($2,$4,true)',[user,foreignUser,tenant,foreign]);
  await db.query("INSERT INTO customers(id,company_id,first_name,phone) VALUES($1,$3,'Alice','1'),($2,$4,'Foreign','2')",[customer,foreignCustomer,tenant,foreign]);
  await db.query(`INSERT INTO invoices(company_id,customer_id,invoice_date,due_date,total_amount,paid_amount,balance_due,status,payment_status,invoice_type)
   VALUES($1,$3,CURRENT_DATE-31,CURRENT_DATE-31,100,0,100,'approved','unpaid','sales'),($2,$4,CURRENT_DATE-31,CURRENT_DATE-31,900,0,900,'approved','unpaid','sales')`,[tenant,foreign,customer,foreignCustomer]);
  await db.query(`INSERT INTO payments(company_id,customer_id,payment_date,payment_status) VALUES($1,$2,CURRENT_DATE-3,'completed'),($1,$2,CURRENT_DATE-2,'paid'),($1,$2,CURRENT_DATE,'cancelled')`,[tenant,customer]);
  for(const view of captured.views){await db.exec(`CREATE VIEW public.${view.name} AS ${view.definition.trim()}`);await db.exec(`GRANT ALL ON public.${view.name} TO anon,authenticated,service_role`);}
  await login();
 });
 afterEach(async()=>db?.close());
 it('reproduces legacy multiplication then reconciles all three views to one amount per invoice',async()=>{
  const before=(await query('SELECT * FROM customer_ar_aging_summary WHERE customer_id=$1',[customer]))[0];
  assert.equal(Number(before.total_outstanding),300);assert.equal(Number(before.total_invoices),3);
  await install();
  const row=(await query('SELECT * FROM customer_ar_aging_summary'))[0];
  assert.equal(Number(row.total_outstanding),100);assert.equal(Number(row.total_invoices),1);assert.equal(Number(row.days_31_60),100);
  assert.equal((await query("SELECT last_payment_date=(CURRENT_DATE-2)::text AS matched FROM customer_ar_aging_summary"))[0].matched,true);
  assert.equal(Number((await query('SELECT total_ar_amount FROM company_ar_aging_summary'))[0].total_ar_amount),100);
  assert.equal(Number((await query('SELECT total_outstanding FROM collections_priority_list'))[0].total_outstanding),100);
 });
 it('restricts memberships and underlying RLS for each company and denies anonymous view access',async()=>{
  await install();await login(foreignUser,foreign);
  for(const view of ['customer_ar_aging_summary','collections_priority_list']){const rows=await query('SELECT * FROM '+view);assert.equal(rows.length,1);assert.equal(rows[0].customer_id,foreignCustomer);assert.equal(Number(rows[0].total_outstanding),900);}
  await login(user,foreign);assert.equal((await query('SELECT * FROM customer_ar_aging_summary')).length,0);
  await admin();await db.exec('UPDATE profiles SET is_active=false');await login();assert.equal((await query('SELECT * FROM company_ar_aging_summary')).length,0);
  await admin();await db.exec('SET ROLE anon');await assert.rejects(query('SELECT * FROM customer_ar_aging_summary'),/permission denied/);
 });
 it('honors recorded zero, current credit/unknown separation, statuses and invoice date boundaries',async()=>{
  await admin();await db.query(`INSERT INTO invoices(company_id,customer_id,invoice_date,due_date,total_amount,paid_amount,balance_due,status,payment_status,invoice_type)
   VALUES($1,$2,CURRENT_DATE,CURRENT_DATE,100,0,0,'approved','unpaid','sales'),($1,$2,CURRENT_DATE,CURRENT_DATE,100,0,-20,'approved','unpaid','sales'),
   ($1,$2,CURRENT_DATE,CURRENT_DATE,100,NULL,NULL,'approved','unpaid','sales'),($1,$2,CURRENT_DATE,CURRENT_DATE,50,0,50,'approved','paid','service'),
   ($1,$2,CURRENT_DATE,CURRENT_DATE,100,0,100,'cancelled','unpaid','sales'),($1,$2,CURRENT_DATE+1,CURRENT_DATE+1,100,0,100,'approved','unpaid','sales'),
   ($1,$2,CURRENT_DATE,CURRENT_DATE,100,0,100,'approved','unpaid','purchase')`,[tenant,customer]);
  await install();const row=(await query('SELECT * FROM company_ar_aging_summary'))[0];assert.equal(Number(row.total_ar_amount),150);assert.equal(Number(row.total_outstanding_invoices),2);
  assert.equal(Number(row.current_total),50);assert.equal(Number(row.days_31_60_total),100);
 });
 it('preserves column types, owner, object IDs and authenticated ACL; rollback restores captured definitions and ACL',async()=>{
  await admin();const before=await metadata();await install();await admin();const after=await metadata();
  const anonOid=String((await query("SELECT oid FROM pg_roles WHERE rolname='anon'"))[0].oid);
  for(let i=0;i<before.length;i++){assert.deepEqual(before[i].columns,captured.columns.filter(row=>row.table===before[i].relname).map(row=>({name:row.column,type:row.type})));assert.equal(after[i].oid,before[i].oid);assert.equal(after[i].owner,before[i].owner);assert.deepEqual(after[i].columns,before[i].columns);assert.deepEqual(after[i].reloptions,['security_invoker=true']);
   assert.deepEqual(after[i].acl.filter(x=>x.grantee!==anonOid),before[i].acl.filter(x=>x.grantee!==anonOid));}
  await db.exec(await read('../../supabase/rollbacks/'+name+'.rollback.sql'));assert.deepEqual(await metadata(),before);
 });
});
